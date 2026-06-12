-- ProtoPlatform Innovation Hub — MVP schema
-- Tables: profiles, ideas, idea_stage_history, prototypes, prototype_reviews,
--         rejection_reasons, audit_events
-- RLS policies and RPC functions: follow-up migrations

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE app_role AS ENUM (
  'admin',
  'innovation_lead',
  'developer',
  'executive_reviewer',
  'viewer'
);

CREATE TYPE idea_status AS ENUM (
  'ideas',
  'in_progress',
  'ready_for_demo',
  'approved',
  'blocked',
  'rejected'
);

CREATE TYPE prototype_status AS ENUM (
  'draft',
  'attached',
  'published',
  'archived'
);

CREATE TYPE review_decision AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_is_active ON public.profiles (is_active) WHERE is_active = TRUE;

CREATE TRIGGER profiles_handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- ideas
-- ---------------------------------------------------------------------------

CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description TEXT,
  status idea_status NOT NULL DEFAULT 'ideas',
  priority SMALLINT NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES public.profiles (id),
  assignee_id UUID REFERENCES public.profiles (id),
  innovation_theme TEXT,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ideas_status ON public.ideas (status);
CREATE INDEX idx_ideas_owner_id ON public.ideas (owner_id);
CREATE INDEX idx_ideas_assignee_id ON public.ideas (assignee_id);
CREATE INDEX idx_ideas_created_at ON public.ideas (created_at DESC);

CREATE TRIGGER ideas_handle_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- idea_stage_history
-- ---------------------------------------------------------------------------

CREATE TABLE public.idea_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas (id) ON DELETE CASCADE,
  from_status idea_status,
  to_status idea_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles (id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_idea_stage_history_idea_id ON public.idea_stage_history (idea_id);
CREATE INDEX idx_idea_stage_history_entered_at ON public.idea_stage_history (idea_id, entered_at DESC);
CREATE INDEX idx_idea_stage_history_open ON public.idea_stage_history (idea_id)
  WHERE exited_at IS NULL;

-- ---------------------------------------------------------------------------
-- prototypes
-- ---------------------------------------------------------------------------

CREATE TABLE public.prototypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  summary TEXT,
  demo_url TEXT,
  repo_url TEXT,
  status prototype_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prototypes_idea_id ON public.prototypes (idea_id);
CREATE INDEX idx_prototypes_status ON public.prototypes (status);
CREATE INDEX idx_prototypes_published_at ON public.prototypes (published_at DESC)
  WHERE published_at IS NOT NULL;

CREATE TRIGGER prototypes_handle_updated_at
  BEFORE UPDATE ON public.prototypes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- rejection_reasons
-- ---------------------------------------------------------------------------

CREATE TABLE public.rejection_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rejection_reasons_active ON public.rejection_reasons (sort_order)
  WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- prototype_reviews
-- ---------------------------------------------------------------------------

CREATE TABLE public.prototype_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prototype_id UUID NOT NULL REFERENCES public.prototypes (id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles (id),
  decision review_decision NOT NULL DEFAULT 'pending',
  rejection_reason_id UUID REFERENCES public.rejection_reasons (id),
  rejection_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prototype_reviews_rejection_requires_reason CHECK (
    decision <> 'rejected' OR rejection_reason_id IS NOT NULL
  )
);

CREATE INDEX idx_prototype_reviews_prototype_id ON public.prototype_reviews (prototype_id);
CREATE INDEX idx_prototype_reviews_reviewer_id ON public.prototype_reviews (reviewer_id);
CREATE INDEX idx_prototype_reviews_decision ON public.prototype_reviews (decision);
CREATE INDEX idx_prototype_reviews_pending ON public.prototype_reviews (created_at DESC)
  WHERE decision = 'pending';

-- ---------------------------------------------------------------------------
-- audit_events (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_entity ON public.audit_events (entity_type, entity_id);
CREATE INDEX idx_audit_events_actor_id ON public.audit_events (actor_id);
CREATE INDEX idx_audit_events_occurred_at ON public.audit_events (occurred_at DESC);

-- ---------------------------------------------------------------------------
-- Seed: rejection_reasons
-- ---------------------------------------------------------------------------

INSERT INTO public.rejection_reasons (code, label, sort_order) VALUES
  ('scope_misaligned', 'Scope misaligned with strategy', 10),
  ('insufficient_value', 'Insufficient business value', 20),
  ('duplicate_effort', 'Duplicates existing initiative', 30),
  ('resource_constraints', 'Resource / capacity constraints', 40),
  ('security_compliance', 'Security or compliance concerns', 50),
  ('needs_more_discovery', 'Needs more discovery / evidence', 60),
  ('other', 'Other (see notes)', 99);
