/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * "New chat" signal for the Prime tab. Pressing the PRIME tab always starts
 * a fresh conversation (a clean stage for every demo beat); the Prime screen
 * subscribes to `resetCounter` and clears its thread + composer when it
 * changes. Past conversations remain in Prime history (server-persisted).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { create } from 'zustand';

interface PrimeSessionState {
  resetCounter: number;
  requestNewChat: () => void;
}

export const usePrimeSession = create<PrimeSessionState>((set) => ({
  resetCounter: 0,
  requestNewChat: () => set((s) => ({ resetCounter: s.resetCounter + 1 })),
}));
