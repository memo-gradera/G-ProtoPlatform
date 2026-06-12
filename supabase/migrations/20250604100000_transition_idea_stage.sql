-- RPC: transition_idea_stage
-- Validates workflow, maintains stage history, updates idea timestamps, writes audit log.

-- ---------------------------------------------------------------------------
-- Transition validator (mirrors packages/domain stage-transition.policy.ts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_valid_idea_stage_transition(
  p_from idea_status,
  p_to idea_status
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE p_from
    WHEN 'ideas' THEN p_to IN ('in_progress', 'blocked', 'rejected')
    WHEN 'in_progress' THEN p_to IN ('ready_for_demo', 'blocked', 'rejected')
    WHEN 'ready_for_demo' THEN p_to IN ('approved', 'blocked', 'rejected')
    WHEN 'blocked' THEN p_to IN ('in_progress')
    WHEN 'approved' THEN FALSE
    WHEN 'rejected' THEN FALSE
    ELSE FALSE
  END;
$$;

COMMENT ON FUNCTION public.is_valid_idea_stage_transition(idea_status, idea_status) IS
  'Returns true when p_from → p_to is an allowed Kanban transition.';

-- ---------------------------------------------------------------------------
-- transition_idea_stage
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transition_idea_stage(
  p_idea_id UUID,
  p_target_status idea_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_idea public.ideas;
  v_from_status idea_status;
  v_before JSONB;
  v_after JSONB;
  v_reason TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_actor_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Active profile required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_idea
  FROM public.ideas
  WHERE id = p_idea_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Idea not found: %', p_idea_id
      USING ERRCODE = 'P0002';
  END IF;

  v_from_status := v_idea.status;

  IF v_from_status = p_target_status THEN
    RAISE EXCEPTION 'Idea is already in status %', p_target_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_from_status IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status %', v_from_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT public.is_valid_idea_stage_transition(v_from_status, p_target_status) THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_from_status, p_target_status
      USING ERRCODE = 'check_violation';
  END IF;

  v_reason := NULLIF(btrim(p_reason), '');

  IF p_target_status IN ('blocked', 'rejected') AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Reason is required when moving to %', p_target_status
      USING ERRCODE = 'check_violation';
  END IF;

  v_before := jsonb_build_object(
    'id', v_idea.id,
    'status', v_idea.status,
    'blocked_at', v_idea.blocked_at,
    'blocked_reason', v_idea.blocked_reason,
    'rejected_at', v_idea.rejected_at,
    'rejection_reason', v_idea.rejection_reason,
    'approved_at', v_idea.approved_at
  );

  -- Close open history segment(s)
  UPDATE public.idea_stage_history
  SET exited_at = now()
  WHERE idea_id = p_idea_id
    AND exited_at IS NULL;

  INSERT INTO public.idea_stage_history (
    idea_id,
    from_status,
    to_status,
    changed_by,
    metadata
  )
  VALUES (
    p_idea_id,
    v_from_status,
    p_target_status,
    v_actor_id,
    CASE
      WHEN v_reason IS NOT NULL THEN jsonb_build_object('reason', v_reason)
      ELSE '{}'::jsonb
    END
  );

  UPDATE public.ideas
  SET
    status = p_target_status,
    blocked_at = CASE
      WHEN p_target_status = 'blocked' THEN now()
      WHEN v_from_status = 'blocked' AND p_target_status = 'in_progress' THEN NULL
      ELSE blocked_at
    END,
    blocked_reason = CASE
      WHEN p_target_status = 'blocked' THEN v_reason
      WHEN v_from_status = 'blocked' AND p_target_status = 'in_progress' THEN NULL
      ELSE blocked_reason
    END,
    rejected_at = CASE
      WHEN p_target_status = 'rejected' THEN now()
      ELSE rejected_at
    END,
    rejection_reason = CASE
      WHEN p_target_status = 'rejected' THEN v_reason
      ELSE rejection_reason
    END,
    approved_at = CASE
      WHEN p_target_status = 'approved' THEN now()
      ELSE approved_at
    END
  WHERE id = p_idea_id
  RETURNING * INTO v_idea;

  v_after := jsonb_build_object(
    'id', v_idea.id,
    'status', v_idea.status,
    'blocked_at', v_idea.blocked_at,
    'blocked_reason', v_idea.blocked_reason,
    'rejected_at', v_idea.rejected_at,
    'rejection_reason', v_idea.rejection_reason,
    'approved_at', v_idea.approved_at
  );

  INSERT INTO public.audit_events (
    actor_id,
    entity_type,
    entity_id,
    action,
    before_state,
    after_state
  )
  VALUES (
    v_actor_id,
    'idea',
    p_idea_id,
    'stage_changed',
    v_before,
    v_after
  );

  RETURN v_idea;
END;
$$;

COMMENT ON FUNCTION public.transition_idea_stage(UUID, idea_status, TEXT) IS
  'Moves an idea to p_target_status with validation, history, audit trail, and timestamp updates.';

REVOKE ALL ON FUNCTION public.transition_idea_stage(UUID, idea_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_idea_stage(UUID, idea_status, TEXT) TO authenticated;
