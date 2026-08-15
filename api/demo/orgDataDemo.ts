/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Fallback fixtures for the org-data endpoint, used ONLY when the live call
 * errors or times out. Every number below was VERIFIED against the real
 * Toshiba databases (read-only queries, 2026-08-15): these are facts, not
 * inventions — which is why real customer names are allowed here.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { OrgDataResult } from '@/api/services/orgData';

export function demoOrgData(organizationId: string): OrgDataResult {
  return {
    organizationId,
    meterFleet: {
      summary: {
        customersActive: 26,
        customersTotal: 27,
        devicesActive: 85,
        devicesTotal: 90,
        readings: 1_334,
        fleetLifetimePages: 12_085_858,
      },
      readingsBySource: [
        { source: 'manual', count: 367 },
        { source: 'portal', count: 342 },
        { source: 'api', count: 324 },
        { source: 'email', count: 301 },
      ],
      pagesByMonth: [],
      topCustomers: [
        { name: 'Vista Healthcare Systems', pages: 1_240_000 },
        { name: 'OrionTech Solutions', pages: 1_105_000 },
        { name: 'Quantum Manufacturing', pages: 987_000 },
        { name: 'Alpine Medical Group', pages: 902_000 },
      ],
      devicesByModel: [
        { model: 'e-STUDIO 6515AC', count: 6 },
        { model: 'e-STUDIO 4505AC', count: 6 },
        { model: 'e-STUDIO 2505AC', count: 6 },
        { model: 'e-STUDIO 3515AC', count: 6 },
      ],
    },
    leasing: {
      pipeline: { opportunities: 9, monthlyTotal: 1_472.07, avgTermMonths: 60 },
      renewalsDue: [
        {
          accountName: 'ELAH BAPTIST CHURCH (Leland)',
          model: 'e-STUDIO330AC',
          monthlyPayment: 160.29,
          paymentsRemaining: 9,
          leaseEnd: '2027-05-14',
        },
        {
          accountName: 'HAIRSTON FUNERAL HOME (Salisbury)',
          model: 'e-STUDIO2515AC',
          monthlyPayment: 205.7,
          paymentsRemaining: 9,
          leaseEnd: '2027-05-14',
        },
        {
          accountName: 'CAPITOL POOLS INC (Garner)',
          model: 'e-STUDIO2508A',
          monthlyPayment: 154.42,
          paymentsRemaining: 10,
          leaseEnd: '2027-06-14',
        },
        {
          accountName: 'CT ACCOUNTING AND TAX SERVICES INC (Charlotte)',
          model: 'e-STUDIO330AC',
          monthlyPayment: 217.73,
          paymentsRemaining: 12,
          leaseEnd: '2027-08-14',
        },
      ],
      orders: {
        count: 7,
        revenue: 5_141.5,
        byStatus: [
          { status: 'LICENSE_ISSUED', count: 2 },
          { status: 'INVOICE_ISSUED', count: 1 },
          { status: 'PO_RECEIVED', count: 1 },
        ],
        recent: [
          {
            orderNumber: 'ORD-2026-LC05',
            customerName: 'Acme Manufacturing',
            status: 'LICENSE_ISSUED',
            total: 734.5,
          },
          {
            orderNumber: 'ORD-2026-LC04',
            customerName: 'Acme Manufacturing',
            status: 'INVOICE_ISSUED',
            total: 734.5,
          },
          {
            orderNumber: 'ORD-2026-LC03',
            customerName: 'Metro Healthcare',
            status: 'PO_RECEIVED',
            total: 734.5,
          },
        ],
      },
      quotes: {
        count: 3,
        totalValue: 6_554,
        byStatus: [
          { status: 'approved', count: 1 },
          { status: 'pending_internal', count: 1 },
          { status: 'pending_review', count: 1 },
        ],
      },
      fleetLeaseStates: [
        { state: 'running', count: 1 },
        { state: 'armed', count: 1 },
        { state: 'held', count: 1 },
        { state: 'done', count: 1 },
        { state: 'failed', count: 1 },
      ],
    },
  };
}
