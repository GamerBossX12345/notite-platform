import { describe, it, expect } from 'vitest';
import {
  generateShingles,
  compareTexts,
  exactJaccardSimilarity,
  fingerprintText,
  fingerprintFromString,
  compareFingerprints,
} from '../services/shingling.service.js';

describe('shingling — detectarea duplicatelor', () => {
  it('generateShingles produce substrings de lungime k', () => {
    const sh = [...generateShingles('hello world', 4)];
    expect(sh).toContain('hell');
    expect(sh).toContain('ello');
    expect(sh).toContain('orld');
  });

  it('normalizează lowercase + scoate punctuație', () => {
    const sh = [...generateShingles('Salut, Lume!', 4)];
    // după normalizare: "salut lume"
    expect(sh).toContain('salu');
    // semnele de punctuație nu apar.
    expect(sh.every(s => !/[!,]/.test(s))).toBe(true);
  });

  it('texte identice au similarity ≈ 1', () => {
    const t = 'Triunghiurile asemenea au laturile proporționale';
    expect(compareTexts(t, t)).toBeCloseTo(1, 1);
  });

  it('texte complet diferite au similarity scăzută', () => {
    const a = 'integrale primitive analiză matematică';
    const b = 'mitocondrie celulă ribozom biologie';
    expect(exactJaccardSimilarity(a, b)).toBeLessThan(0.2);
  });

  it('texte cu suprapunere parțială au similarity intermediară', () => {
    const a = 'algoritm sortare bubble sort complexitate';
    const b = 'algoritm sortare quick sort complexitate';
    const sim = exactJaccardSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.3);
    expect(sim).toBeLessThan(1);
  });

  it('fingerprint roundtrip (serialize → parse → compare)', () => {
    const fp1 = fingerprintFromString(fingerprintText('ecuații de gradul al doilea'));
    const fp2 = fingerprintFromString(fingerprintText('ecuații de gradul al doilea'));
    expect(compareFingerprints(fp1, fp2)).toBeCloseTo(1, 1);
  });

  it('compareFingerprints tratează input invalid fără să arunce', () => {
    expect(compareFingerprints(null, [1, 2, 3])).toBe(0);
    expect(compareFingerprints('text', { foo: 1 })).toBe(0);
    expect(compareFingerprints([], [])).toBe(0);
  });
});
