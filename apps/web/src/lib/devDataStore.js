import {
  PILOT_IDEAS,
  PILOT_PROTOTYPES,
  PILOT_STATUS_HISTORY,
} from '../../demo/pilotSeedData.js';

export const DEV_DATA_STORAGE_KEY = 'innovation_hub_dev_data';

export function isDevDataBypassEnabled() {
  return import.meta.env.VITE_DEV_DATA_BYPASS === 'true';
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stripSeedFields(record) {
  const { seedKey, relatedIdeaSeedKey, ideaSeedKey, ...rest } = record;
  return rest;
}

function buildInitialState() {
  const now = new Date().toISOString();
  const ideaIdBySeedKey = {};

  const ideas = PILOT_IDEAS.map((idea, index) => {
    const id = `idea-${idea.seedKey}`;
    ideaIdBySeedKey[idea.seedKey] = id;
    const created = new Date(
      Date.now() - (PILOT_IDEAS.length - index) * 86_400_000,
    ).toISOString();
    return {
      ...stripSeedFields(idea),
      id,
      created_date: created,
      updated_date: now,
    };
  });

  const prototypes = PILOT_PROTOTYPES.map((proto, index) => {
    const id = `proto-${proto.seedKey}`;
    const created = new Date(
      Date.now() - (PILOT_PROTOTYPES.length - index) * 43_200_000,
    ).toISOString();
    return {
      ...stripSeedFields(proto),
      id,
      related_idea_id: ideaIdBySeedKey[proto.relatedIdeaSeedKey] || '',
      tags: proto.tags || [],
      created_date: created,
      updated_date: now,
    };
  });

  const history = PILOT_STATUS_HISTORY.map((entry, index) => ({
    id: `history-seed-${index}`,
    idea_id: ideaIdBySeedKey[entry.ideaSeedKey],
    previous_status: entry.previous_status,
    new_status: entry.new_status,
    changed_by: entry.changed_by,
    changed_at: new Date(Date.now() - index * 3_600_000).toISOString(),
    reason: entry.reason,
    metadata: JSON.stringify(entry.metadata),
  })).filter((entry) => entry.idea_id);

  const users = [
    {
      id: 'dev-user',
      email: 'memo@local.dev',
      full_name: 'Memo Developer',
      role: 'admin',
      department: 'Innovation',
    },
    {
      id: 'user-lead',
      email: 'lead@example.com',
      full_name: 'Alex Rivera',
      role: 'innovation_lead',
      department: 'Innovation',
    },
    {
      id: 'user-dev',
      email: 'dev@example.com',
      full_name: 'Dev Owner',
      role: 'developer',
      department: 'Engineering',
    },
    {
      id: 'user-exec',
      email: 'exec@example.com',
      full_name: 'Taylor Brooks',
      role: 'executive_reviewer',
      department: 'Executive',
    },
    {
      id: 'user-viewer',
      email: 'viewer@example.com',
      full_name: 'Sam Patel',
      role: 'viewer',
      department: 'Operations',
    },
  ];

  return { ideas, prototypes, users, history, reviews: [] };
}

function readState() {
  if (typeof window === 'undefined') {
    return buildInitialState();
  }
  try {
    const raw = window.localStorage.getItem(DEV_DATA_STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (!Array.isArray(state.reviews)) {
        state.reviews = [];
      }
      return state;
    }
  } catch {
    // fall through to initial seed
  }
  const initial = buildInitialState();
  writeState(initial);
  return initial;
}

function writeState(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_DATA_STORAGE_KEY, JSON.stringify(state));
}

export function resetDevData() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEV_DATA_STORAGE_KEY);
}

function applySort(items, sort, limit) {
  let sorted = [...items];
  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    sorted.sort((a, b) => {
      const av = a[field] ?? '';
      const bv = b[field] ?? '';
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  }
  if (typeof limit === 'number' && limit > 0) {
    sorted = sorted.slice(0, limit);
  }
  return sorted;
}

function touch(record) {
  return { ...record, updated_date: new Date().toISOString() };
}

export const devDataStore = {
  listIdeas({ sort = '-created_date', limit = 500 } = {}) {
    const { ideas } = readState();
    return applySort(ideas, sort, limit);
  },

  getIdea(id) {
    const idea = readState().ideas.find((item) => item.id === id);
    if (!idea) {
      throw new Error(`Idea not found: ${id}`);
    }
    return { ...idea };
  },

  createIdea(payload) {
    const state = readState();
    const now = new Date().toISOString();
    const idea = touch({
      ...payload,
      id: generateId('idea'),
      created_date: now,
    });
    state.ideas.push(idea);
    writeState(state);
    return { ...idea };
  },

  updateIdea(id, payload) {
    const state = readState();
    const index = state.ideas.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Idea not found: ${id}`);
    }
    const updated = touch({ ...state.ideas[index], ...payload, id });
    state.ideas[index] = updated;
    writeState(state);
    return { ...updated };
  },

  deleteIdea(id) {
    const state = readState();
    state.ideas = state.ideas.filter((item) => item.id !== id);
    state.history = state.history.filter((entry) => entry.idea_id !== id);
    writeState(state);
  },

  listPrototypes({ sort = '-created_date', limit = 500 } = {}) {
    const { prototypes } = readState();
    return applySort(prototypes, sort, limit);
  },

  getPrototype(id) {
    const prototype = readState().prototypes.find((item) => item.id === id);
    if (!prototype) {
      throw new Error(`Prototype not found: ${id}`);
    }
    return { ...prototype };
  },

  createPrototype(payload) {
    const state = readState();
    const now = new Date().toISOString();
    const prototype = touch({
      tags: [],
      ...payload,
      id: generateId('proto'),
      created_date: now,
    });
    state.prototypes.push(prototype);
    writeState(state);
    return { ...prototype };
  },

  updatePrototype(id, payload) {
    const state = readState();
    const index = state.prototypes.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Prototype not found: ${id}`);
    }
    const updated = touch({ ...state.prototypes[index], ...payload, id });
    state.prototypes[index] = updated;
    writeState(state);
    return { ...updated };
  },

  listUsers() {
    return readState().users.map((user) => ({ ...user }));
  },

  updateUserRole(id, role) {
    const state = readState();
    const index = state.users.findIndex((user) => user.id === id);
    if (index === -1) {
      throw new Error(`User not found: ${id}`);
    }
    state.users[index] = { ...state.users[index], role };
    writeState(state);
    return { ...state.users[index] };
  },

  listHistory({ sort = '-changed_at', limit = 1000 } = {}) {
    const { history } = readState();
    return applySort(history, sort, limit);
  },

  listHistoryByIdea(ideaId, options = {}) {
    return devDataStore.listHistory(options).filter((entry) => entry.idea_id === ideaId);
  },

  createHistoryEntry(entry) {
    const state = readState();
    const record = {
      id: generateId('history'),
      ...entry,
    };
    state.history.push(record);
    writeState(state);
    return { ...record };
  },

  listReviews({ ideaId } = {}) {
    const reviews = readState().reviews ?? [];
    if (!ideaId) {
      return reviews.map((review) => ({ ...review }));
    }
    return reviews
      .filter((review) => review.idea_id === ideaId)
      .map((review) => ({ ...review }));
  },

  createReview(payload) {
    const state = readState();
    if (!state.reviews) {
      state.reviews = [];
    }
    const now = new Date().toISOString();
    const record = {
      id: generateId('review'),
      created_at: now,
      created_date: now,
      ...payload,
    };
    state.reviews.push(record);
    writeState(state);
    return { ...record };
  },
};
