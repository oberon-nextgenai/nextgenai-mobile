import { redactSensitiveDeep } from './redactSensitive';

describe('redactSensitiveDeep', () => {
  it('redacts sensitive keys at every depth, arrays included', () => {
    const input = {
      to: 'cfo@example.com',
      apiKey: 'sk-live-abc',
      smtp: { password: 'hunter2', host: 'mail.example.com' },
      attachments: [{ name: 'quote.pdf', authorization: 'Bearer xyz' }],
    };

    expect(redactSensitiveDeep(input)).toEqual({
      to: 'cfo@example.com',
      apiKey: '[REDACTED]',
      smtp: { password: '[REDACTED]', host: 'mail.example.com' },
      attachments: [{ name: 'quote.pdf', authorization: '[REDACTED]' }],
    });
  });

  it('leaves ordinary values and primitives untouched', () => {
    expect(redactSensitiveDeep({ subject: 'Renewal', amount: 5085, urgent: true })).toEqual({
      subject: 'Renewal',
      amount: 5085,
      urgent: true,
    });
    expect(redactSensitiveDeep('plain string')).toBe('plain string');
    expect(redactSensitiveDeep(null)).toBeNull();
  });

  it('does not mutate the input', () => {
    const input = { token: 'secret', nested: { cookie: 'yum' } };

    redactSensitiveDeep(input);

    expect(input.token).toBe('secret');
    expect(input.nested.cookie).toBe('yum');
  });

  it('cuts off unboundedly deep payloads instead of recursing forever', () => {
    type Deep = { child?: Deep; sessionKey?: string };
    const root: Deep = {};
    let cursor = root;
    for (let i = 0; i < 20; i += 1) {
      cursor.child = {};
      cursor = cursor.child;
    }
    cursor.sessionKey = 'leak';

    const out = JSON.stringify(redactSensitiveDeep(root));

    expect(out).not.toContain('leak');
    expect(out).toContain('[REDACTED]');
  });
});
