import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/constants';

export interface ToolResultRecord {
  id: string;
  toolName: string;
  arguments?: unknown;
  result?: unknown;
  error?: unknown;
  createdAt: number;
}

/**
 * Tool results can be large payloads (full agent objects, campaign lists,
 * analytics dumps). Persisting them without a bound would let AsyncStorage
 * grow unboundedly across a long-lived session, so the store keeps only the
 * most recently touched N and evicts the oldest first.
 */
export const TOOL_RESULTS_MAX_ENTRIES = 100;

interface PersistedShape {
  byId: Record<string, ToolResultRecord>;
  order: string[];
}

interface ToolResultsState {
  byId: Record<string, ToolResultRecord>;
  /**
   * Ids ordered oldest → newest. `add`ing an id (new or re-added) moves it to
   * the end, so this doubles as an LRU chain — eviction always drops from
   * the front.
   */
  order: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (record: Omit<ToolResultRecord, 'createdAt'>) => void;
  get: (id: string) => ToolResultRecord | undefined;
  clear: () => void;
}

/**
 * Fire-and-forget write-behind. A lost write costs one uncached result on the
 * next cold start; blocking the SSE handler that calls `add()` on a disk
 * write is a worse trade, so this is intentionally not awaited by callers.
 */
function persistToDisk(byId: Record<string, ToolResultRecord>, order: string[]) {
  AsyncStorage.setItem(STORAGE_KEYS.toolResults, JSON.stringify({ byId, order })).catch(() => {
    // Best-effort only — a failed write just means this result won't survive
    // a restart, which is the pre-existing (in-memory-only) behaviour.
  });
}

export const useToolResults = create<ToolResultsState>((set, get) => ({
  byId: {},
  order: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.toolResults);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedShape>;
        const byId =
          parsed.byId && typeof parsed.byId === 'object' ? parsed.byId : {};
        const order = Array.isArray(parsed.order) ? parsed.order : [];
        set({ byId, order, hydrated: true });
        return;
      }
    } catch {
      // Missing key or malformed JSON — start empty rather than throwing.
    }
    set({ byId: {}, order: [], hydrated: true });
  },

  add: (record) =>
    set((state) => {
      const createdAt = Date.now();
      const byId = { ...state.byId, [record.id]: { ...record, createdAt } };
      // Drop any prior occurrence, then push to the end — most recent last.
      const order = [...state.order.filter((id) => id !== record.id), record.id];

      while (order.length > TOOL_RESULTS_MAX_ENTRIES) {
        const oldestId = order.shift();
        if (oldestId !== undefined) delete byId[oldestId];
      }

      persistToDisk(byId, order);
      return { byId, order };
    }),

  get: (id) => get().byId[id],

  clear: () => {
    persistToDisk({}, []);
    set({ byId: {}, order: [] });
  },
}));
