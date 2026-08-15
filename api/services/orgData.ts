import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';
// DEMO ONLY — DO NOT MERGE: verified-real fixture fallback for the demo.
import { DEMO_APPROVALS } from '@/api/demo/flags';

/**
 * Org-data — read-only aggregates over the organization's own PostgreSQL
 * databases (meter fleet + leasing). Mirrors
 * `oberon-nextgenai-api/src/modules/org-data/org-data.types.ts`.
 */
export interface MeterFleetSection {
  summary: {
    customersActive: number;
    customersTotal: number;
    devicesActive: number;
    devicesTotal: number;
    readings: number;
    /** Sum of each device's latest cumulative counter. */
    fleetLifetimePages: number;
  };
  readingsBySource: { source: string; count: number }[];
  pagesByMonth: { month: string; pages: number }[];
  topCustomers: { name: string; pages: number }[];
  devicesByModel: { model: string; count: number }[];
}

export interface LeasingSection {
  pipeline: { opportunities: number; monthlyTotal: number; avgTermMonths: number };
  renewalsDue: {
    accountName: string;
    model: string | null;
    monthlyPayment: number;
    paymentsRemaining: number;
    leaseEnd: string | null;
  }[];
  orders: {
    count: number;
    revenue: number;
    byStatus: { status: string; count: number }[];
    recent: { orderNumber: string; customerName: string; status: string; total: number }[];
  };
  quotes: { count: number; totalValue: number; byStatus: { status: string; count: number }[] };
  fleetLeaseStates: { state: string; count: number }[];
}

export interface OrgDataResult {
  organizationId: string;
  meterFleet: MeterFleetSection | null;
  leasing: LeasingSection | null;
}

const DEMO_TIMEOUT_MS = 2_500;

export async function fetchOrgData(organizationId: string): Promise<OrgDataResult> {
  if (DEMO_APPROVALS) {
    // DEMO ONLY — DO NOT MERGE: short fuse + verified-real fixture fallback,
    // used only when the live endpoint errors/times out (real data wins).
    try {
      const { data } = await http.get<OrgDataResult>(PATHS.orgData.summary(organizationId), {
        timeout: DEMO_TIMEOUT_MS,
        suppressErrorToast: true,
      });
      if (data && (data.meterFleet || data.leasing)) return data;
    } catch {
      // fall through to fixtures
    }
    const { demoOrgData } = await import('@/api/demo/orgDataDemo');
    return demoOrgData(organizationId);
  }

  const { data } = await http.get<OrgDataResult>(PATHS.orgData.summary(organizationId));
  return data;
}
