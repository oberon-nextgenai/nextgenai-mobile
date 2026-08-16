/** DEMO ONLY — DO NOT MERGE. Specs for the Prime presentation belt. */
import { sanitizeDemoText, sanitizePrimeStructured } from './demoPresentation';
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

    const out = sanitizePrimeStructured(resp);
    expect(out.summary?.[0]).toBe('Most activity driven by Alex and Ava agents');
    expect(out.sections[0].items[0].value).toBe('Ava, Ava');
    expect(out.sections[0].items[1].value).toBe('the platform (live platform data)');
    expect(out.insights?.[0]).toBe('the platform reported 5 failed calls');
    expect(out.actions?.[0]).toBe('Ask Ava for details');
  });
});
