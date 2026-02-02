import { describe, expect, it } from 'vitest';
import { extractNames, normalizePolishName } from '@/app/stats/StatsClient';

describe('normalizePolishName', () => {
  it('normalizes Polish diacritics and casing', () => {
    expect(normalizePolishName('  Łukasz ')).toBe('lukasz');
    expect(normalizePolishName('ŻÓŁĆ')).toBe('zolc');
  });
});

describe('extractNames', () => {
  it('extracts unique canonical names from comma-separated list', () => {
    expect(extractNames('Dawid, Julia, Maksymilian, Łukasz')).toEqual([
      'Dawid',
      'Julia',
      'Maksymilian',
      'Łukasz',
    ]);
  });

  it('handles variations / aliases and dedupes', () => {
    // note: this intentionally contains typos + mixed separators
    expect(extractNames('david +  dawyt oraz julja; Maks')).toEqual([
      'Dawid',
      'Julia',
      'Maksymilian',
    ]);
  });

  it('handles empty input', () => {
    expect(extractNames('')).toEqual([]);
  });
});
