import { drainSseBuffer } from './escalationsStream';

/**
 * The wire format this parser exists for (escalations-stream.service.ts):
 * named `escalation_update` events whose JSON carries its own `type`, plus
 * `ping` heartbeats. The unnamed-event parser in sseClient.ts would drop the
 * event names — this one must not.
 */
describe('drainSseBuffer', () => {
  it('parses a complete named event', () => {
    const wire = 'id: 1\nevent: escalation_update\ndata: {"type":"escalation_created"}\n\n';

    const { events, rest } = drainSseBuffer(wire);

    expect(events).toEqual([
      { event: 'escalation_update', data: '{"type":"escalation_created"}' },
    ]);
    expect(rest).toBe('');
  });

  it('holds an incomplete block until the rest of it streams in', () => {
    const first = drainSseBuffer('event: escalation_update\ndata: {"type":"escal');
    expect(first.events).toEqual([]);
    expect(first.rest).toBe('event: escalation_update\ndata: {"type":"escal');

    const second = drainSseBuffer(`${first.rest}ation_created"}\n\n`);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].data).toBe('{"type":"escalation_created"}');
  });

  it('splits several blocks arriving in one chunk, pings included', () => {
    const wire =
      'event: escalation_update\ndata: {"type":"hitl_approval_created"}\n\n' +
      'event: ping\ndata: {"type":"ping"}\n\n' +
      'event: escalation_update\ndata: {"type":"hitl_approval_decided"}\n\n';

    const { events, rest } = drainSseBuffer(wire);

    expect(events.map(e => e.event)).toEqual(['escalation_update', 'ping', 'escalation_update']);
    expect(rest).toBe('');
  });

  it('defaults to the standard message event when no name is sent', () => {
    const { events } = drainSseBuffer('data: {"x":1}\n\n');

    expect(events).toEqual([{ event: 'message', data: '{"x":1}' }]);
  });

  it('discards blocks with no data lines (comments, bare ids)', () => {
    const { events, rest } = drainSseBuffer(': keep-alive\n\nid: 7\n\n');

    expect(events).toEqual([]);
    expect(rest).toBe('');
  });
});
