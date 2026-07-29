import { findAuditFallback, AUDIT_FALLBACK_WINDOW_MS } from './auditFallback';
import type { AuditLogEntry } from '@/api/services/audit';

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    _id: 'row',
    userId: 'user-1',
    createdAt: new Date(1_700_000_000_000).toISOString(),
    ...overrides,
  };
}

describe('findAuditFallback', () => {
  it('matches on action === "prime.<toolName>"', () => {
    const at = 1_700_000_000_000;
    const entries = [
      entry({ _id: 'wrong-tool', action: 'prime.other_tool', createdAt: new Date(at).toISOString() }),
      entry({ _id: 'right-tool', action: 'prime.assign_phone_number', createdAt: new Date(at).toISOString() }),
    ];

    const match = findAuditFallback(entries, 'assign_phone_number', at);
    expect(match?._id).toBe('right-tool');
  });

  it('returns null when nothing has that action', () => {
    const entries = [entry({ action: 'prime.other_tool' })];
    expect(findAuditFallback(entries, 'assign_phone_number', Date.now())).toBeNull();
  });

  it('returns null for rows with no `action` at all (ordinary model-mutation audit rows)', () => {
    const entries = [entry({ collectionName: 'Agent', operation: 'update' })];
    expect(findAuditFallback(entries, 'update_agent', Date.now())).toBeNull();
  });

  it('picks the closest-in-time candidate when the same tool ran more than once', () => {
    const at = 1_700_000_000_000;
    const near = entry({
      _id: 'near',
      action: 'prime.create_new_campaign',
      createdAt: new Date(at + 5_000).toISOString(),
    });
    const far = entry({
      _id: 'far',
      action: 'prime.create_new_campaign',
      createdAt: new Date(at + 120_000).toISOString(),
    });

    expect(findAuditFallback([far, near], 'create_new_campaign', at)?._id).toBe('near');
  });

  it('ignores a same-action row outside the matching window', () => {
    const at = 1_700_000_000_000;
    const tooFar = entry({
      action: 'prime.create_new_campaign',
      createdAt: new Date(at + AUDIT_FALLBACK_WINDOW_MS + 60_000).toISOString(),
    });

    expect(findAuditFallback([tooFar], 'create_new_campaign', at)).toBeNull();
  });

  it('accepts a same-action row right at the edge of the window', () => {
    const at = 1_700_000_000_000;
    const edge = entry({
      action: 'prime.create_new_campaign',
      createdAt: new Date(at + AUDIT_FALLBACK_WINDOW_MS - 1).toISOString(),
    });

    expect(findAuditFallback([edge], 'create_new_campaign', at)).not.toBeNull();
  });
});
