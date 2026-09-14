import {
  containsMoney,
  sanitizeMoneyText,
  sanitizeMoneyStructured,
} from '@/lib/prime/sanitizeMoney';
import type { PrimeStructuredResponse } from '@/lib/primeStructuredSchema';

describe('containsMoney', () => {
  it.each([
    '$0.57',
    '$ 50',
    '$1,234.56',
    'US$5',
    '€50',
    '£20',
    'USD 1,200',
    '1,200 USD',
    '0.57 dollars per run',
    '45 cents',
  ])('detects %s', (input) => {
    expect(containsMoney(input)).toBe(true);
  });

  it.each(['412 calls', '18.4 min', '92.5%', 'Alex resolved 40 of 44'])(
    'leaves %s alone',
    (input) => {
      expect(containsMoney(input)).toBe(false);
    },
  );

  it('catches contract-scale figures the demo belt deliberately exempted', () => {
    // The Toshiba belt preserved comma-grouped plan dollars; this one must not.
    expect(containsMoney('$6,300/mo across the plan')).toBe(true);
    expect(containsMoney('a $5,085 quote')).toBe(true);
  });
});

describe('sanitizeMoneyText', () => {
  it('drops the money line and keeps the rest', () => {
    const input = ['Alex handled 412 calls.', 'That cost $234.10.', 'Resolution held at 92%.'].join(
      '\n',
    );
    expect(sanitizeMoneyText(input)).toBe(
      ['Alex handled 412 calls.', 'Resolution held at 92%.'].join('\n'),
    );
  });

  it('never leaves a mangled sentence behind', () => {
    // Whole-line drop, not in-place redaction — no "worth ." fragments.
    expect(sanitizeMoneyText('The contract is worth $5,085.')).toBe('');
  });

  it('passes empty input through', () => {
    expect(sanitizeMoneyText('')).toBe('');
  });
});

function resp(over: Partial<PrimeStructuredResponse>): PrimeStructuredResponse {
  return {
    version: 'ucof-1',
    responseType: 'analysis',
    densityMode: 'standard',
    title: 'Workforce',
    summary: null,
    sections: [],
    insights: null,
    actions: null,
    fallbackMarkdown: null,
    ...over,
  } as PrimeStructuredResponse;
}

describe('sanitizeMoneyStructured', () => {
  it('drops a cost-named section by name alone, even with no $ in its values', () => {
    const out = sanitizeMoneyStructured(
      resp({
        sections: [
          { name: 'Cost drivers', kind: 'list', items: [{ label: 'Alex', value: '0.57' }] },
          { name: 'Volume', kind: 'list', items: [{ label: 'Alex', value: '412 calls' }] },
        ],
      }),
    );
    expect(out?.sections.map((s) => s.name)).toEqual(['Volume']);
  });

  it('drops an individual money item but keeps its section', () => {
    const out = sanitizeMoneyStructured(
      resp({
        sections: [
          {
            name: 'Workforce',
            kind: 'list',
            items: [{ label: 'Calls', value: '412' }, { label: 'Spend', value: '$234.10' }],
          },
        ],
      }),
    );
    expect(out?.sections[0].items).toEqual([{ label: 'Calls', value: '412' }]);
  });

  it('returns null when every section was money, so the caller can fall back', () => {
    const out = sanitizeMoneyStructured(
      resp({
        sections: [{ name: 'Spend', kind: 'list', items: [{ label: 'Total', value: '$1,204' }] }],
      }),
    );
    expect(out).toBeNull();
  });

  it('scrubs summary, insights, actions and the fallback markdown', () => {
    const out = sanitizeMoneyStructured(
      resp({
        summary: ['412 calls handled', 'at a cost of $234.10'],
        insights: ['Spend rose to $300'],
        actions: ['Review Alex', 'Cut the $50 overage'],
        sections: [{ name: 'Volume', kind: 'list', items: [{ label: 'Calls', value: '412' }] }],
        fallbackMarkdown: 'Handled 412 calls.\nTotal was $234.10.',
      }),
    );
    expect(out?.summary).toEqual(['412 calls handled']);
    expect(out?.insights).toBeNull();
    expect(out?.actions).toEqual(['Review Alex']);
    expect(out?.fallbackMarkdown).toBe('Handled 412 calls.');
  });
});
