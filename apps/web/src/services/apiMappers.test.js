import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatHistoryChangedBy,
  formatIdeaOwnerDisplay,
  getIdeaOwnerLabel,
  getPrototypeOwnerLabel,
  getPrototypeRelatedIdeaLabel,
  mapIdeaFormToApiCreatePayload,
  mapIdeaFormToApiUpdatePayload,
  mapPriorityForApi,
  mergePrototypeForm,
  normalizeHistoryEntry,
  normalizeIdea,
  normalizePrototype,
  normalizeReview,
} from '@/services/apiMappers';
import { mergeIdeaForm } from '@/components/shared/ideaFormConfig';

describe('idea API payload mapping', () => {
  it('maps short_description to description on create', () => {
    const payload = mapIdeaFormToApiCreatePayload({
      solution_name: 'New Idea',
      short_description: 'Summary text',
      owner: 'user@gradera.ai',
      status: 'ideas',
      category: 'other',
    });

    expect(payload).toEqual({
      solution_name: 'New Idea',
      description: 'Summary text',
    });
    expect(payload.status).toBeUndefined();
    expect(payload.category).toBeUndefined();
    expect(payload.owner).toBeUndefined();
  });

  it('maps critical priority to urgent', () => {
    expect(mapPriorityForApi('critical')).toBe('urgent');
    expect(
      mapIdeaFormToApiCreatePayload({
        solution_name: 'Priority Idea',
        priority: 'critical',
      }).priority,
    ).toBe('urgent');
  });

  it('strips unsupported fields and status from PATCH payload', () => {
    const payload = mapIdeaFormToApiUpdatePayload({
      solution_name: 'Updated Idea',
      short_description: 'Updated summary',
      status: 'in_progress',
      executive_decision: 'pending',
      category: 'ai_ml',
      prototype_name: 'Ignored blueprint field',
      decision_notes: 'Approved after review',
    });

    expect(payload).toEqual({
      solution_name: 'Updated Idea',
      description: 'Updated summary',
      decision_notes: 'Approved after review',
    });
    expect(payload.status).toBeUndefined();
    expect(payload.executive_decision).toBeUndefined();
    expect(payload.prototype_name).toBeUndefined();
  });

  it('strips owner_id and owner from PATCH payload', () => {
    const payload = mapIdeaFormToApiUpdatePayload({
      solution_name: 'Updated',
      owner_id: '550e8400-e29b-41d4-a716-446655440000',
      owner: 'Owner Name',
    });

    expect(payload.owner_id).toBeUndefined();
    expect(payload.owner).toBeUndefined();
    expect(payload.solution_name).toBe('Updated');
  });

  it('maps blueprint aliases into supported API fields', () => {
    const payload = mapIdeaFormToApiCreatePayload({
      solution_name: 'Blueprint Idea',
      minimum_viability: 'Basic workflow',
      what_makes_it_unique: 'Unique value',
      acceptance_criteria: 'Must pass review',
    });

    expect(payload.minimum_viable_functionality).toBe('Basic workflow');
    expect(payload.value_hypothesis).toBe('Unique value');
    expect(payload.acceptance_criteria).toBe('Must pass review');
  });
});

describe('status history normalization', () => {
  it('formats changed_by object as display string', () => {
    expect(
      formatHistoryChangedBy({
        id: 'user-1',
        email: 'reviewer@gradera.ai',
        full_name: 'Reviewer Name',
      }),
    ).toBe('Reviewer Name');

    expect(
      normalizeHistoryEntry({
        changed_by: {
          email: 'reviewer@gradera.ai',
          full_name: 'Reviewer Name',
        },
        previous_status: 'ideas',
        new_status: 'in_progress',
      }).changed_by,
    ).toBe('Reviewer Name');
  });
});

describe('normalizeIdea owner mapping', () => {
  it('maps API owner object to display string and structured fields', () => {
    const normalized = normalizeIdea({
      id: 'idea-1',
      solution_name: 'Test Idea',
      status: 'ideas',
      owner_id: 'user-1',
      owner: {
        id: 'user-1',
        email: 'owner@gradera.ai',
        full_name: 'Owner Name',
      },
      created_at: '2026-01-01T00:00:00.000Z',
    });

    expect(normalized.owner).toBe('Owner Name');
    expect(normalized.owner_email).toBe('owner@gradera.ai');
    expect(normalized.owner_name).toBe('Owner Name');
    expect(normalized.owner_id).toBe('user-1');
  });

  it('falls back to email when full_name is missing', () => {
    const normalized = normalizeIdea({
      owner: { id: 'user-2', email: 'dev@gradera.ai' },
    });

    expect(normalized.owner).toBe('dev@gradera.ai');
    expect(normalized.owner_email).toBe('dev@gradera.ai');
    expect(normalized.owner_name).toBeNull();
  });

  it('preserves existing string owner from local/base44 mode', () => {
    const normalized = normalizeIdea({
      id: 'idea-2',
      owner: 'Jane Developer',
      owner_id: null,
    });

    expect(normalized.owner).toBe('Jane Developer');
  });

  it('maps description and eta_date aliases for API payloads', () => {
    const normalized = normalizeIdea({
      description: 'Short summary',
      eta_date: '2026-06-15',
    });

    expect(normalized.short_description).toBe('Short summary');
    expect(normalized.eta).toBe('2026-06-15');
  });
});

describe('idea owner display helpers', () => {
  it('returns a string for object owners (Kanban-safe)', () => {
    const label = getIdeaOwnerLabel({
      owner: { id: '1', email: 'user@gradera.ai', full_name: 'Entra User' },
    });

    expect(typeof label).toBe('string');
    expect(label).toBe('Entra User');
  });

  it('uses getIdeaOwnerLabel for string owners', () => {
    expect(getIdeaOwnerLabel({ owner: 'Legacy Owner' })).toBe('Legacy Owner');
  });

  it('mergeIdeaForm converts object owner to string for form inputs', () => {
    const form = mergeIdeaForm({
      solution_name: 'Idea',
      owner: { id: '1', email: 'user@gradera.ai', full_name: 'Form Owner' },
    });

    expect(form.owner).toBe('Form Owner');
    expect(typeof form.owner).toBe('string');
  });

  it('formatIdeaOwnerDisplay returns Unassigned for null owner', () => {
    expect(formatIdeaOwnerDisplay(null)).toBe('Unassigned');
  });
});

describe('ideasService create normalization in API mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns normalized owner after create', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');

    vi.resetModules();

    vi.doMock('@/api/base44Client.js', () => ({
      base44: {
        entities: {
          Idea: {
            create: vi.fn(),
          },
        },
      },
    }));

    vi.doMock('@/lib/permissionGuard.js', () => ({
      assertCanPerformAction: vi.fn().mockResolvedValue(undefined),
    }));

    vi.doMock('@/services/apiClient.js', () => ({
      apiClient: {
        post: vi.fn().mockResolvedValue({
          id: 'idea-new',
          solution_name: 'New Idea',
          status: 'ideas',
          owner: {
            id: 'user-1',
            email: 'creator@gradera.ai',
            full_name: 'Creator User',
          },
        }),
      },
    }));

    const { ideasService } = await import('@/services/ideasService.js');
    const created = await ideasService.create({
      solution_name: 'New Idea',
      owner: 'creator@gradera.ai',
    });

    expect(created.owner).toBe('Creator User');
    expect(created.owner_email).toBe('creator@gradera.ai');
    expect(typeof created.owner).toBe('string');
  });
});

describe('normalizePrototype mapping', () => {
  it('maps API owner object to display string and structured fields', () => {
    const normalized = normalizePrototype({
      id: 'proto-1',
      name: 'Demo Prototype',
      status: 'published',
      owner: {
        id: 'user-1',
        email: 'owner@gradera.ai',
        full_name: 'Prototype Owner',
      },
    });

    expect(normalized.owner).toBe('Prototype Owner');
    expect(normalized.owner_email).toBe('owner@gradera.ai');
    expect(normalized.owner_name).toBe('Prototype Owner');
    expect(normalized.owner_id).toBe('user-1');
    expect(normalized.status).toBe('demo_ready');
  });

  it('maps related_idea object to display fields', () => {
    const normalized = normalizePrototype({
      related_idea_id: 'idea-1',
      related_idea: {
        id: 'idea-1',
        solution_name: 'Linked Idea',
      },
    });

    expect(normalized.related_idea_id).toBe('idea-1');
    expect(normalized.related_idea_name).toBe('Linked Idea');
    expect(normalized.related_idea_solution_name).toBe('Linked Idea');
    expect(normalized.related_idea).toBe('Linked Idea');
  });

  it('preserves existing string owner from local/base44 mode', () => {
    const normalized = normalizePrototype({
      owner: 'Legacy Prototype Owner',
    });

    expect(normalized.owner).toBe('Legacy Prototype Owner');
  });

  it('returns string labels for object owners (PrototypeCard-safe)', () => {
    const ownerLabel = getPrototypeOwnerLabel({
      owner: { id: '1', email: 'dev@gradera.ai', full_name: 'Card Owner' },
    });

    expect(typeof ownerLabel).toBe('string');
    expect(ownerLabel).toBe('Card Owner');
  });

  it('mergePrototypeForm converts object owner for form inputs', () => {
    const form = mergePrototypeForm(
      {
        name: 'Proto',
        owner: { id: '1', email: 'dev@gradera.ai', full_name: 'Form Owner' },
        related_idea: { id: 'idea-1', solution_name: 'Related' },
      },
      { name: '', owner: '', related_idea_id: '' },
    );

    expect(form.owner).toBe('Form Owner');
    expect(form.related_idea_id).toBe('idea-1');
    expect(typeof form.owner).toBe('string');
  });
});

describe('normalizeReview nested relations', () => {
  it('maps nested reviewer, idea, and prototype objects to display strings', () => {
    const normalized = normalizeReview({
      id: 'review-1',
      prototype_id: 'proto-1',
      idea_id: 'idea-1',
      reviewer_id: 'user-1',
      decision: 'approved',
      reviewer: {
        id: 'user-1',
        email: 'reviewer@gradera.ai',
        full_name: 'Reviewer Name',
      },
      idea: {
        id: 'idea-1',
        solution_name: 'Reviewed Idea',
      },
      prototype: {
        id: 'proto-1',
        name: 'Reviewed Prototype',
      },
    });

    expect(normalized.reviewer).toBe('Reviewer Name');
    expect(normalized.idea).toBe('Reviewed Idea');
    expect(normalized.prototype).toBe('Reviewed Prototype');
    expect(typeof normalized.reviewer).toBe('string');
    expect(typeof normalized.idea).toBe('string');
    expect(typeof normalized.prototype).toBe('string');
  });
});

describe('prototypesService create normalization in API mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns normalized owner after create', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');

    vi.resetModules();

    vi.doMock('@/api/base44Client.js', () => ({
      base44: {
        entities: {
          Prototype: {
            create: vi.fn(),
          },
        },
      },
    }));

    vi.doMock('@/lib/permissionGuard.js', () => ({
      assertCanPerformAction: vi.fn().mockResolvedValue(undefined),
    }));

    vi.doMock('@/services/apiClient.js', () => ({
      apiClient: {
        post: vi.fn().mockResolvedValue({
          id: 'proto-new',
          name: 'New Prototype',
          status: 'draft',
          owner: {
            id: 'user-1',
            email: 'creator@gradera.ai',
            full_name: 'Creator User',
          },
          related_idea: {
            id: 'idea-1',
            solution_name: 'Parent Idea',
          },
        }),
      },
    }));

    const { prototypesService } = await import('@/services/prototypesService.js');
    const created = await prototypesService.create({
      name: 'New Prototype',
      owner: 'creator@gradera.ai',
    });

    expect(created.owner).toBe('Creator User');
    expect(created.related_idea_name).toBe('Parent Idea');
    expect(getPrototypeRelatedIdeaLabel(created)).toBe('Parent Idea');
    expect(typeof created.owner).toBe('string');
  });
});
