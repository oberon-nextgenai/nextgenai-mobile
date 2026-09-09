import { renderHook } from '@testing-library/react-native';
import { useActiveOrg, useOrgStore } from './org';
import type { Organization } from '@/api/services/types';

describe('useOrgStore — asOrgArray guard', () => {
  beforeEach(() => {
    // Reset the store before each test
    useOrgStore.setState({ organizations: [], activeOrgId: null });
  });

  describe('setOrganizations', () => {
    it('stores an array of organizations unchanged', () => {
      const orgs: Organization[] = [
        { _id: 'org_1', name: 'Org One' },
        { _id: 'org_2', name: 'Org Two' },
      ];

      useOrgStore.getState().setOrganizations(orgs);

      expect(useOrgStore.getState().organizations).toEqual(orgs);
    });

    it('does not poison the store when passed a non-array value (e.g., HTML from gateway)', () => {
      const html = '<html><body>Starting up...</body></html>';

      useOrgStore.getState().setOrganizations(html as unknown as Organization[]);

      // Must be an array, never a string or object that would crash .map() calls
      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });

    it('does not poison the store when passed an object', () => {
      const notAnArray = { error: 'Internal server error' };

      useOrgStore.getState().setOrganizations(notAnArray as unknown as Organization[]);

      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });

    it('does not poison the store when passed null', () => {
      useOrgStore.getState().setOrganizations(null as unknown as Organization[]);

      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });

    it('does not poison the store when passed undefined', () => {
      useOrgStore.getState().setOrganizations(undefined as unknown as Organization[]);

      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });
  });

  describe('reconcile', () => {
    it('updates organizations when passed an array', async () => {
      const orgs: Organization[] = [{ _id: 'org_1', name: 'Org One' }];

      await useOrgStore.getState().reconcile({ organizations: orgs });

      expect(useOrgStore.getState().organizations).toEqual(orgs);
    });

    it('does not poison the store when passed a non-array organizations value', async () => {
      const badData = '<html><body>Starting up...</body></html>';

      await useOrgStore.getState().reconcile({ organizations: badData as unknown as Organization[] });

      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });

    it('does not poison the store when reconcile receives an object', async () => {
      const notAnArray = { error: 'Internal server error' };

      await useOrgStore.getState().reconcile({ organizations: notAnArray as unknown as Organization[] });

      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });

    it('does not poison the store when reconcile receives null', async () => {
      await useOrgStore.getState().reconcile({ organizations: null as unknown as Organization[] });

      expect(useOrgStore.getState().organizations).toEqual([]);
      expect(Array.isArray(useOrgStore.getState().organizations)).toBe(true);
    });
  });

  describe('useActiveOrg', () => {
    it('never throws and normalizes to [] even when the store was poisoned directly, bypassing setOrganizations/reconcile', () => {
      // Neither writer guard runs here — this simulates a bad value already
      // sitting in the store (e.g. from a rehydrated snapshot), which is
      // exactly the case the hook's own `asOrgArray` call exists to catch.
      useOrgStore.setState({
        organizations: '<html><body>Starting up...</body></html>' as unknown as Organization[],
      });

      const { result } = renderHook(() => useActiveOrg());

      expect(result.current.organizations).toEqual([]);
      expect(Array.isArray(result.current.organizations)).toBe(true);
      expect(result.current.active).toBeNull();
    });
  });
});
