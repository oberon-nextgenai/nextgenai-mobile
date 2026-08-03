import { isEnvelopeFailure } from './mcpEnvelope';

/**
 * The screenshotted bug: a tool refusal or miss comes back as a payload —
 * `{ success: false, errorCode: 'VALIDATION_ERROR', ... }` — with no
 * transport-level `error` anywhere, and every surface that only checked
 * `Boolean(record.error)` rendered it as a green success. This predicate is
 * the one place that decision now happens.
 */
describe('isEnvelopeFailure', () => {
  it('success:false envelope is a failure', () => {
    expect(
      isEnvelopeFailure({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'That name is already taken.',
        retryable: false,
      }),
    ).toBe(true);
  });

  it('errorCode-bearing envelope is a failure', () => {
    // No `success` key at all — some tool payloads only ever carry errorCode.
    expect(isEnvelopeFailure({ errorCode: 'NOT_FOUND', message: 'Agent not found.' })).toBe(true);
  });

  it('success envelope / primitives / null are not', () => {
    expect(isEnvelopeFailure({ success: true, data: { id: 'agent_1' } })).toBe(false);
    expect(isEnvelopeFailure({ data: [1, 2, 3] })).toBe(false); // no success/errorCode at all
    expect(isEnvelopeFailure(null)).toBe(false);
    expect(isEnvelopeFailure(undefined)).toBe(false);
    expect(isEnvelopeFailure('just a plain string result')).toBe(false);
    expect(isEnvelopeFailure(42)).toBe(false);
    expect(isEnvelopeFailure(true)).toBe(false);
    expect(isEnvelopeFailure([1, 2, 3])).toBe(false);
  });

  it('parses a JSON-string payload the same as an already-parsed object', () => {
    expect(
      isEnvelopeFailure(JSON.stringify({ success: false, errorCode: 'VALIDATION_ERROR' })),
    ).toBe(true);
    expect(isEnvelopeFailure(JSON.stringify({ success: true, data: { id: 1 } }))).toBe(false);
  });

  it('treats a malformed JSON string as not-a-failure rather than throwing', () => {
    expect(() => isEnvelopeFailure('{not valid json')).not.toThrow();
    expect(isEnvelopeFailure('{not valid json')).toBe(false);
  });

  it('ignores an empty-string errorCode', () => {
    expect(isEnvelopeFailure({ errorCode: '' })).toBe(false);
    expect(isEnvelopeFailure({ errorCode: '   ' })).toBe(false);
  });

  it('success:false wins even alongside a non-empty errorCode (both signal failure)', () => {
    expect(isEnvelopeFailure({ success: false, errorCode: 'NOT_FOUND' })).toBe(true);
  });
});
