/** DEMO ONLY — DO NOT MERGE. Specs for the Prime presentation belt. */
import {
  sanitizeDemoMarkdown,
  sanitizeDemoText,
  sanitizePrimeStructured,
} from './demoPresentation';
import type { PrimeStructuredResponse } from '@/lib/primeStructuredSchema';

describe('sanitizeDemoText', () => {
  it('replaces vendor names with "the platform", case-insensitively', () => {
    expect(sanitizeDemoText('Analytics source: Retell (live provider data)')).toBe(
      'Analytics source: the platform (live platform data)',
    );
    expect(sanitizeDemoText('powered by ElevenLabs and VAPI')).toBe(
      'powered by the platform and the platform',
    );
    expect(sanitizeDemoText('read live from the voice provider')).toBe(
      'read live from the platform',
    );
  });

  it('collapses parenthetical agent variants without touching the sentence', () => {
    expect(
      sanitizeDemoText('Most activity driven by Ava (Cold Call) and Ava (Nurture Text) today.'),
    ).toBe('Most activity driven by Ava and Ava today.');
  });

  it('collapses fixed suffix variants and STOPS at the suffix (no sentence eating)', () => {
    expect(sanitizeDemoText('Alex Retell Flow 2.0 handled the batch overnight.')).toBe(
      'Alex handled the batch overnight.',
    );
    expect(sanitizeDemoText('Ava Cold Call Email booked two meetings.')).toBe(
      'Ava booked two meetings.',
    );
    // A capitalized word after the name that is NOT a known suffix survives.
    expect(sanitizeDemoText('Sophie Draft renewal is ready.')).toBe(
      'Sophie Draft renewal is ready.',
    );
  });

  it('handles vendor names assembled from split stream chunks (sanitize the aggregate)', () => {
    const chunk1 = 'Data source: Ret';
    const chunk2 = 'ell analytics';
    // Per-chunk sanitation would miss it; the aggregate catches it.
    expect(sanitizeDemoText(chunk1)).toContain('Ret');
    expect(sanitizeDemoText(chunk1 + chunk2)).toBe('Data source: the platform analytics');
  });

  it('leaves ordinary text alone', () => {
    const s = 'Approve the outreach wave — 78 devices across 24 accounts are overdue.';
    expect(sanitizeDemoText(s)).toBe(s);
  });

  it('collapses environment-suffixed variants in any casing', () => {
    expect(sanitizeDemoText('Alex - Staging handled 31 calls.')).toBe(
      'Alex handled 31 calls.',
    );
    expect(sanitizeDemoText('ALEX - STAGING')).toBe('ALEX');
    expect(sanitizeDemoText('Ava – Prod booked a meeting.')).toBe('Ava booked a meeting.');
    // A dash that is not an environment suffix survives.
    expect(sanitizeDemoText('Sophie - renewal queue is clear.')).toBe(
      'Sophie - renewal queue is clear.',
    );
  });

  it('rewrites raw ISO timestamps as plain dates (with and without millis)', () => {
    expect(
      sanitizeDemoText('Window: 2026-07-17T00:00:00.000Z → 2026-08-17T00:00:00.000Z.'),
    ).toBe('Window: Jul 17, 2026 → Aug 17, 2026.');
    expect(sanitizeDemoText('since 2026-08-01T00:00:00Z')).toBe('since Aug 1, 2026');
    // A plain date without the time part is left alone.
    expect(sanitizeDemoText('due 2026-08-17')).toBe('due 2026-08-17');
  });
});

describe('sanitizeDemoMarkdown', () => {
  it('drops metering cost lines but keeps the rest', () => {
    const md = [
      'Alex handled 31 calls this window.',
      'Total cost: $17 across 138 conversations',
      'Average duration was 75.5 seconds.',
    ].join('\n');
    expect(sanitizeDemoMarkdown(md)).toBe(
      'Alex handled 31 calls this window.\nAverage duration was 75.5 seconds.',
    );
  });

  it('keeps contract-scale dollar lines even when they say cost or spend', () => {
    const line = 'Plan spend is a flat $6,300 per month for Alex.';
    expect(sanitizeDemoMarkdown(line)).toBe(line);
  });
});

describe('sanitizePrimeStructured', () => {
  it('sanitizes every string field of a UCOF response', () => {
    const resp: PrimeStructuredResponse = {
      version: 'ucof-1',
      responseType: 'analytics',
      densityMode: 'medium',
      title: 'Overnight call activity',
      summary: ['Most activity driven by Alex Voice and Ava agents'],
      sections: [
        {
          name: 'Coverage',
          kind: 'metrics',
          items: [
            { label: 'Active agents (sample)', value: 'Ava (Cold Call), Ava (Nurture)', text: null },
            { label: 'Analytics source', value: 'Retell (live provider data)', text: null },
          ],
        },
      ],
      insights: ['Retell reported 5 failed calls'],
      actions: ['Ask Ava (Nurture) for details'],
      fallbackMarkdown: null,
    };

    const out = sanitizePrimeStructured(resp)!;
    expect(out).not.toBeNull();
    expect(out.summary?.[0]).toBe('Most activity driven by Alex and Ava agents');
    expect(out.sections[0].items[0].value).toBe('Ava, Ava');
    expect(out.sections[0].items[1].value).toBe('the platform (live platform data)');
    expect(out.insights?.[0]).toBe('the platform reported 5 failed calls');
    expect(out.actions?.[0]).toBe('Ask Ava for details');
  });

  const base = {
    version: 'ucof-1',
    responseType: 'analytics',
    densityMode: 'medium',
    fallbackMarkdown: null,
  } as const;

  it('drops metering sections and cost/spend lines from a mixed card', () => {
    const resp: PrimeStructuredResponse = {
      ...base,
      title: 'Weekly activity review',
      summary: ['Total cost: $17 across 138 conversations', 'Alex led the week'],
      sections: [
        {
          name: 'Cost drivers',
          kind: 'metrics',
          items: [
            { label: 'Alex - Staging', value: '$0.57', text: null },
            { label: 'Ava', value: '$0.21', text: null },
          ],
        },
        {
          name: 'Volume',
          kind: 'metrics',
          items: [{ label: 'Calls', value: '31', text: null }],
        },
      ],
      insights: [
        'Spend is concentrated in the active voice agents.',
        'Short calls do not affect resolution.',
      ],
      actions: ["Review the testing agent's cost attribution.", 'Open the call list'],
    };

    const out = sanitizePrimeStructured(resp)!;
    expect(out).not.toBeNull();
    expect(out.sections.map((s) => s.name)).toEqual(['Volume']);
    expect(out.summary).toEqual(['Alex led the week']);
    expect(out.insights).toEqual(['Short calls do not affect resolution.']);
    expect(out.actions).toEqual(['Open the call list']);
  });

  it('returns null for an all-metering card so the caller falls back', () => {
    const resp: PrimeStructuredResponse = {
      ...base,
      title: 'Biggest cost drivers',
      summary: ['Total cost: $17 across 138 conversations'],
      sections: [
        {
          name: 'Cost drivers',
          kind: 'metrics',
          items: [{ label: 'Alex', value: '$0.57', text: null }],
        },
      ],
      insights: null,
      actions: null,
    };
    expect(sanitizePrimeStructured(resp)).toBeNull();
  });

  it('never touches legitimate contract- and deal-scale dollars', () => {
    const resp: PrimeStructuredResponse = {
      ...base,
      title: 'Leasing pipeline',
      summary: ['Plan costs are flat: Alex $6,300/mo'],
      sections: [
        {
          name: 'Payments',
          kind: 'metrics',
          items: [{ label: 'CT Accounting', value: '$217.73 → $114.23', text: null }],
        },
        {
          name: 'Costs',
          kind: 'metrics',
          items: [{ label: 'Alex plan', value: '$6,300/mo', text: null }],
        },
      ],
      insights: ['The Acme quote is worth $5,085.'],
      actions: null,
    };

    const out = sanitizePrimeStructured(resp)!;
    expect(out).not.toBeNull();
    // Payment dollars live in a non-cost section; plan dollars are comma-scale.
    expect(out.sections.map((s) => s.name)).toEqual(['Payments', 'Costs']);
    expect(out.summary).toEqual(['Plan costs are flat: Alex $6,300/mo']);
    expect(out.insights).toEqual(['The Acme quote is worth $5,085.']);
  });
});
