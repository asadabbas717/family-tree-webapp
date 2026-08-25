import { describe, expect, it } from 'vitest';
import { calculateAgeYears, displayAge, displayLifeSpan, displayLifeSummary } from '../date';

describe('family date display', () => {
  it('calculates an exact living age from a full birth date', () => {
    expect(calculateAgeYears('2000-09-10', undefined, new Date('2026-08-25T12:00:00Z'))).toBe(25);
  });

  it('calculates age at death from full dates', () => {
    expect(calculateAgeYears('1927-04-10', '2016-03-01')).toBe(88);
  });

  it('calculates age from year-only family data', () => {
    expect(calculateAgeYears('1927', '2016')).toBe(89);
  });

  it('extracts years automatically for the lifespan display', () => {
    expect(displayLifeSpan('1927-04-10', '2016-03-01')).toBe('1927 – 2016');
  });

  it('combines age and lifespan for details', () => {
    expect(displayAge('1927', '2016')).toBe('89 years');
    expect(displayLifeSummary('1927', '2016')).toBe('89 years · 1927 – 2016');
  });
});
