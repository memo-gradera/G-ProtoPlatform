export function resolveDashboardViewState({
  kpisLoading,
  ideasLoading,
  kpisError,
  ideasError,
  kpis,
}) {
  if (kpisLoading || ideasLoading) {
    return 'loading';
  }
  if (kpisError || ideasError || !kpis) {
    return 'error';
  }
  return 'ready';
}
