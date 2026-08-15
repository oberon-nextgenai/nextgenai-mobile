/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Local pause/resume state for the Toshiba board demo. The web-build demo
 * must never hit the real agent lifecycle endpoints (network, permission, and
 * live-traffic risk mid-presentation), so pausing an agent flips this
 * in-memory override instead. A page reload clears it.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { create } from 'zustand';

export type DemoAgentLifecycle = 'active' | 'paused';

interface DemoOverridesState {
  /** Keyed by the roster's agent id (`agent._id ?? agent.id ?? agent.name`). */
  status: Record<string, DemoAgentLifecycle>;
  setStatus: (agentId: string, status: DemoAgentLifecycle) => void;
}

export const useDemoOverrides = create<DemoOverridesState>((set) => ({
  status: {},
  setStatus: (agentId, status) =>
    set((s) => ({ status: { ...s.status, [agentId]: status } })),
}));
