import { routeForNotification } from './pushTokens';

/**
 * `routeForNotification` turns a push payload into an in-app route. It is the
 * one place where remote input becomes navigation, so the tests that matter most
 * are the ones proving it refuses input it does not recognise.
 */
describe('routeForNotification', () => {
  it('maps our own scheme onto a router path', () => {
    expect(routeForNotification({ deepLink: 'primeai://approvals/652f' })).toBe('/approvals/652f');
    expect(routeForNotification({ deepLink: 'primeai://brief' })).toBe('/brief');
    expect(routeForNotification({ deepLink: 'primeai://workforce/abc123' })).toBe(
      '/workforce/abc123',
    );
  });

  describe('refuses anything it does not recognise', () => {
    it.each([
      ['a foreign app scheme', 'othertapp://approvals/1'],
      ['an http URL', 'https://evil.example/approvals/1'],
      ['a javascript URL', 'javascript:alert(1)'],
      ['a bare path with no scheme', '/approvals/1'],
      ['our scheme with nothing after it', 'primeai://'],
      ['a scheme that merely starts similarly', 'primeaix://approvals/1'],
    ])('%s', (_label, deepLink) => {
      expect(routeForNotification({ deepLink })).toBeNull();
    });

    it.each([
      ['no payload', undefined],
      ['null', null],
      ['a string payload', 'primeai://approvals/1'],
      ['a number', 42],
      ['an object with no deepLink', { class: 'critical' }],
      ['a non-string deepLink', { deepLink: 12345 }],
      ['a null deepLink', { deepLink: null }],
    ])('%s', (_label, payload) => {
      expect(routeForNotification(payload)).toBeNull();
    });
  });

  it('does not throw on a hostile payload', () => {
    // Whatever arrives here came off the network; it must never crash the app
    // during a cold start, which is when this runs.
    expect(() => routeForNotification({ deepLink: { toString: () => 'primeai://x' } })).not.toThrow();
    expect(routeForNotification({ deepLink: { toString: () => 'primeai://x' } })).toBeNull();
  });

  it('preserves the rest of the payload being irrelevant to routing', () => {
    expect(
      routeForNotification({
        deepLink: 'primeai://approvals/652f',
        class: 'critical',
        escalationId: '652f',
      }),
    ).toBe('/approvals/652f');
  });
});
