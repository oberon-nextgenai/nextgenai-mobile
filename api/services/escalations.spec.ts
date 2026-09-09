import {
  ESCALATION_KINDS,
  ESCALATION_STATUSES,
  GRANT_STATUSES,
  type Approval,
} from './escalations';

/**
 * `grantToken`/`grantTokenHash` must never be declared on the client-facing
 * `Approval` type — the backend strips both from every human-facing
 * response (see the comment on `Approval` in `./escalations`), so a client
 * type that carries them would document a field that can never actually
 * arrive. This was previously enforced only by a one-time grep at authoring
 * time, which does nothing to stop a future contributor from "completing"
 * the interface by adding the field back.
 *
 * `@ts-expect-error` makes the absence load-bearing: TypeScript errors on
 * `.grantToken` today because the property doesn't exist, which is exactly
 * the error this directive expects and suppresses. If either field is ever
 * added to `Approval`, the property access stops erroring, and an
 * unfulfilled `@ts-expect-error` is itself a type error — so `npm run
 * typecheck` fails the moment someone adds it back, without needing anyone
 * to remember to grep for it.
 */
describe('Approval must never carry a grant token', () => {
  it('has no grantToken field (enforced at typecheck time, see below)', () => {
    // @ts-expect-error - `grantToken` must not exist on the client `Approval` type
    void ({} as Approval).grantToken;
    // @ts-expect-error - `grantTokenHash` must not exist on the client `Approval` type
    void ({} as Approval).grantTokenHash;
    expect(true).toBe(true);
  });
});

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
