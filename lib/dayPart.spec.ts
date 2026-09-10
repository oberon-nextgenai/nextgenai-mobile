import { dayPart } from './dayPart';

const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m);

describe('dayPart', () => {
  it('reads the small hours as evening, not morning', () => {
    expect(dayPart(at(0, 15))).toBe('evening');
    expect(dayPart(at(4, 59))).toBe('evening');
  });

  it('starts the morning at 05:00 and hands over at noon', () => {
    expect(dayPart(at(5))).toBe('morning');
    expect(dayPart(at(11, 59))).toBe('morning');
    expect(dayPart(at(12))).toBe('afternoon');
  });

  it('turns to evening at 18:00', () => {
    expect(dayPart(at(17, 59))).toBe('afternoon');
    expect(dayPart(at(18))).toBe('evening');
    expect(dayPart(at(23))).toBe('evening');
  });
});
