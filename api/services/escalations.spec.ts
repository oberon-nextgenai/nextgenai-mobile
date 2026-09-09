import {
  ESCALATION_KINDS,
  ESCALATION_STATUSES,
  GRANT_STATUSES,
} from './escalations';

/**
 * These three lists are copied from the backend's own source of truth —
 * `src/modules/escalations/escalations.types.ts` and `hitl-grant.util.ts`
 * in oberon-nextgenai-api. A mismatch here is a real contract break, not a
 * test that needs relaxing: the client silently dropped 'tool_approval' and
 * 'rejected' once already, which is what this file exists to prevent.
 */
describe('escalation enums match the backend', () => {
  it('covers every escalation kind', () => {
    expect([...ESCALATION_KINDS].sort()).toEqual(
      [
        'compliance',
        'cost_anomaly',
        'customer',
        'policy_exception',
        'sla_risk',
        'tool_approval',
        'workflow_failure',
      ].sort(),
    );
  });

  it('covers every escalation status, keeping rejected distinct from resolved', () => {
    expect([...ESCALATION_STATUSES].sort()).toEqual(
      ['assigned', 'expired', 'open', 'rejected', 'resolved'].sort(),
    );
    // The backend keeps these separate so the queue and the audit trail never
    // conflate an approval with a rejection.
    expect(ESCALATION_STATUSES).toContain('resolved');
    expect(ESCALATION_STATUSES).toContain('rejected');
  });

  it('covers every grant status', () => {
    expect([...GRANT_STATUSES].sort()).toEqual(
      ['consumed', 'expired', 'issued', 'none', 'revoked'].sort(),
    );
  });
});
