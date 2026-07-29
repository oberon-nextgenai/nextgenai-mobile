import { useToolResults, TOOL_RESULTS_MAX_ENTRIES } from './toolResults';

/**
 * The one part of this store that is easy to get subtly wrong: staying
 * bounded under a long session without losing recency information. A tool
 * result is large enough (full agent objects, campaign lists) that an
 * unbounded store is a real memory/AsyncStorage-size problem, not a
 * theoretical one — so eviction correctness matters more than the rest of
 * the store put together.
 */
describe('useToolResults', () => {
  beforeEach(() => {
    useToolResults.setState({ byId: {}, order: [] });
  });

  it('stores an added result, keyed by id', () => {
    useToolResults.getState().add({ id: 'a', toolName: 'get_analytics_dashboard', result: { ok: true } });

    const record = useToolResults.getState().get('a');
    expect(record).toBeDefined();
    expect(record?.toolName).toBe('get_analytics_dashboard');
    expect(record?.result).toEqual({ ok: true });
    expect(typeof record?.createdAt).toBe('number');
  });

  it('does not evict while under the bound', () => {
    for (let i = 0; i < TOOL_RESULTS_MAX_ENTRIES; i++) {
      useToolResults.getState().add({ id: `tool-${i}`, toolName: 'list_agents' });
    }

    expect(Object.keys(useToolResults.getState().byId)).toHaveLength(TOOL_RESULTS_MAX_ENTRIES);
    expect(useToolResults.getState().get('tool-0')).toBeDefined();
  });

  it('evicts the oldest entry once the bound is exceeded, keeping exactly the cap', () => {
    for (let i = 0; i < TOOL_RESULTS_MAX_ENTRIES + 1; i++) {
      useToolResults.getState().add({ id: `tool-${i}`, toolName: 'list_agents' });
    }

    const state = useToolResults.getState();
    expect(Object.keys(state.byId)).toHaveLength(TOOL_RESULTS_MAX_ENTRIES);
    // The very first insert is the oldest and should be gone.
    expect(state.get('tool-0')).toBeUndefined();
    // Everything from the second insert onward should have survived.
    expect(state.get('tool-1')).toBeDefined();
    expect(state.get(`tool-${TOOL_RESULTS_MAX_ENTRIES}`)).toBeDefined();
  });

  it('evicts oldest-first across many overflows, not just by one', () => {
    const overflow = 37;
    for (let i = 0; i < TOOL_RESULTS_MAX_ENTRIES + overflow; i++) {
      useToolResults.getState().add({ id: `tool-${i}`, toolName: 'list_agents' });
    }

    const state = useToolResults.getState();
    expect(Object.keys(state.byId)).toHaveLength(TOOL_RESULTS_MAX_ENTRIES);
    // The oldest `overflow` entries are gone...
    for (let i = 0; i < overflow; i++) {
      expect(state.get(`tool-${i}`)).toBeUndefined();
    }
    // ...and the newest TOOL_RESULTS_MAX_ENTRIES survive.
    for (let i = overflow; i < TOOL_RESULTS_MAX_ENTRIES + overflow; i++) {
      expect(state.get(`tool-${i}`)).toBeDefined();
    }
  });

  it('re-adding an existing id refreshes its recency instead of duplicating it', () => {
    useToolResults.getState().add({ id: 'old', toolName: 'list_agents' });
    for (let i = 0; i < TOOL_RESULTS_MAX_ENTRIES - 1; i++) {
      useToolResults.getState().add({ id: `filler-${i}`, toolName: 'list_agents' });
    }
    // Store is now exactly at the cap, with 'old' as the least-recently-used.
    expect(Object.keys(useToolResults.getState().byId)).toHaveLength(TOOL_RESULTS_MAX_ENTRIES);

    // Touch 'old' again — it should now be the most-recently-used, not evicted.
    useToolResults.getState().add({ id: 'old', toolName: 'list_agents', result: { refreshed: true } });
    // One more new insert should evict the *next* oldest ('filler-0'), not 'old'.
    useToolResults.getState().add({ id: 'newcomer', toolName: 'list_agents' });

    const state = useToolResults.getState();
    expect(Object.keys(state.byId)).toHaveLength(TOOL_RESULTS_MAX_ENTRIES);
    expect(state.get('old')?.result).toEqual({ refreshed: true });
    expect(state.get('filler-0')).toBeUndefined();
    expect(state.get('newcomer')).toBeDefined();
  });

  it('clear() empties both the record map and the recency order', () => {
    useToolResults.getState().add({ id: 'a', toolName: 'list_agents' });
    useToolResults.getState().clear();

    const state = useToolResults.getState();
    expect(state.byId).toEqual({});
    expect(state.order).toEqual([]);
  });
});
