import { create } from 'zustand';

export interface ToolResultRecord {
  id: string;
  toolName: string;
  arguments?: unknown;
  result?: unknown;
  error?: unknown;
  createdAt: number;
}

interface ToolResultsState {
  byId: Record<string, ToolResultRecord>;
  add: (record: Omit<ToolResultRecord, 'createdAt'>) => void;
  get: (id: string) => ToolResultRecord | undefined;
  clear: () => void;
}

export const useToolResults = create<ToolResultsState>((set, get) => ({
  byId: {},

  add: (record) =>
    set((state) => ({
      byId: { ...state.byId, [record.id]: { ...record, createdAt: Date.now() } },
    })),

  get: (id) => get().byId[id],

  clear: () => set({ byId: {} }),
}));
