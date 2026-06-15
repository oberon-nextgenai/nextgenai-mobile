import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Organization } from '@/api/services/types';
import { STORAGE_KEYS } from '@/lib/constants';

interface OrgState {
  activeOrgId: string | null;
  organizations: Organization[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setOrganizations: (orgs: Organization[]) => void;
  switchOrg: (orgId: string) => Promise<void>;
  reconcile: (
    args: {
      organizations: Organization[];
      preferredOrgId?: string | null;
    },
  ) => Promise<void>;
  clear: () => Promise<void>;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  activeOrgId: null,
  organizations: [],
  hydrated: false,

  hydrate: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.activeOrgId);
    set({ activeOrgId: stored, hydrated: true });
  },

  setOrganizations: (orgs) => set({ organizations: orgs }),

  switchOrg: async (orgId) => {
    await AsyncStorage.setItem(STORAGE_KEYS.activeOrgId, orgId);
    set({ activeOrgId: orgId });
  },

  reconcile: async ({ organizations, preferredOrgId }) => {
    set({ organizations });
    const current = get().activeOrgId;
    const allowedIds = organizations.map((o) => o._id);
    let nextId: string | null = current && allowedIds.includes(current) ? current : null;
    if (!nextId && preferredOrgId && allowedIds.includes(preferredOrgId)) {
      nextId = preferredOrgId;
    }
    if (!nextId && allowedIds.length > 0) {
      nextId = allowedIds[0];
    }
    if (nextId && nextId !== current) {
      await AsyncStorage.setItem(STORAGE_KEYS.activeOrgId, nextId);
    } else if (!nextId && current) {
      await AsyncStorage.removeItem(STORAGE_KEYS.activeOrgId);
    }
    set({ activeOrgId: nextId });
  },

  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.activeOrgId);
    set({ activeOrgId: null, organizations: [] });
  },
}));

export function useActiveOrg() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const organizations = useOrgStore((s) => s.organizations);
  const active = organizations.find((o) => o._id === activeOrgId) ?? null;
  return { activeOrgId, active, organizations };
}
