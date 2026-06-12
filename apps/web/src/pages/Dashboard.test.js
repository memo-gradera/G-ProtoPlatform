import { describe, expect, it } from 'vitest';
import { resolveDashboardViewState } from '@/pages/dashboardViewState';

describe('resolveDashboardViewState', () => {
  it('returns loading while queries are in flight', () => {
    expect(
      resolveDashboardViewState({
        kpisLoading: true,
        ideasLoading: false,
        kpisError: false,
        ideasError: false,
        kpis: undefined,
      }),
    ).toBe('loading');
  });

  it('returns error when KPI query fails', () => {
    expect(
      resolveDashboardViewState({
        kpisLoading: false,
        ideasLoading: false,
        kpisError: true,
        ideasError: false,
        kpis: undefined,
      }),
    ).toBe('error');
  });

  it('returns error when ideas query fails', () => {
    expect(
      resolveDashboardViewState({
        kpisLoading: false,
        ideasLoading: false,
        kpisError: false,
        ideasError: true,
        kpis: { totalIdeas: 1 },
      }),
    ).toBe('error');
  });

  it('returns ready when data loaded successfully', () => {
    expect(
      resolveDashboardViewState({
        kpisLoading: false,
        ideasLoading: false,
        kpisError: false,
        ideasError: false,
        kpis: { totalIdeas: 3 },
      }),
    ).toBe('ready');
  });
});
