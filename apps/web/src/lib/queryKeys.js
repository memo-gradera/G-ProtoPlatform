/** Default list options — keep in sync with ideasService / prototypesService */
export const IDEAS_LIST_DEFAULTS = Object.freeze({
  sort: '-created_date',
  limit: 500,
});

export const PROTOTYPES_LIST_DEFAULTS = Object.freeze({
  sort: '-created_date',
  limit: 500,
});

export const queryKeys = {
  ideas: {
    all: ['ideas'],
    list: (options = {}) => {
      const { sort = IDEAS_LIST_DEFAULTS.sort, limit = IDEAS_LIST_DEFAULTS.limit } =
        options;
      return ['ideas', 'list', { sort, limit }];
    },
    kpis: ['ideas', 'kpis'],
  },
  prototypes: {
    all: ['prototypes'],
    list: (options = {}) => {
      const {
        sort = PROTOTYPES_LIST_DEFAULTS.sort,
        limit = PROTOTYPES_LIST_DEFAULTS.limit,
      } = options;
      return ['prototypes', 'list', { sort, limit }];
    },
  },
  users: {
    all: ['users'],
    list: ['users', 'list'],
  },
  ideaStatusHistory: {
    all: ['ideaStatusHistory'],
    byIdea: (ideaId) => ['ideaStatusHistory', ideaId],
  },
};

export function invalidateIdeas(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas.kpis }),
    queryClient.invalidateQueries({ queryKey: queryKeys.ideaStatusHistory.all }),
  ]);
}

export function invalidatePrototypes(queryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.prototypes.all });
}
