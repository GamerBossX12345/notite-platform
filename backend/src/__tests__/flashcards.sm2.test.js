import { describe, it, expect } from 'vitest';
import { applySM2 } from '../services/flashcards.service.js';

// SM-2 (SuperMemo 2) — algoritm clasic de spaced repetition.
// Quality scale: 0-5 (0-2 = greșit, 3-5 = corect).

describe('applySM2', () => {
  const newCard = { easeFactor: 2.5, repetitions: 0, interval: 0 };

  it('quality < 3 resetează repetițiile și pune interval = 1 zi', () => {
    const out = applySM2(newCard, 2);
    expect(out.repetitions).toBe(0);
    expect(out.interval).toBe(1);
  });

  it('prima reușită (quality >= 3) pune interval = 1', () => {
    const out = applySM2(newCard, 4);
    expect(out.repetitions).toBe(1);
    expect(out.interval).toBe(1);
  });

  it('a doua reușită consecutivă pune interval = 6', () => {
    const after1 = applySM2(newCard, 4);
    const after2 = applySM2(after1, 4);
    expect(after2.repetitions).toBe(2);
    expect(after2.interval).toBe(6);
  });

  it('a treia reușită+ folosește interval anterior × easeFactor', () => {
    let card = newCard;
    card = applySM2(card, 4); // r=1, i=1
    card = applySM2(card, 4); // r=2, i=6
    card = applySM2(card, 4); // r=3, i = round(6 * ef)
    expect(card.repetitions).toBe(3);
    // ef-ul a crescut puțin la quality=4, dar i ≈ 6 * (cca 2.5) ≈ 15
    expect(card.interval).toBeGreaterThanOrEqual(13);
    expect(card.interval).toBeLessThanOrEqual(17);
  });

  it('easeFactor crește la quality=5 și scade la quality=3', () => {
    const up = applySM2(newCard, 5);
    const down = applySM2(newCard, 3);
    expect(up.easeFactor).toBeGreaterThan(newCard.easeFactor);
    expect(down.easeFactor).toBeLessThan(newCard.easeFactor);
  });

  it('easeFactor nu coboară sub 1.3', () => {
    let card = { ...newCard, easeFactor: 1.3 };
    // Aplicăm greșit de mai multe ori pentru a forța tendința de scădere.
    for (let i = 0; i < 5; i++) card = applySM2(card, 0);
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('setează dueDate în viitor pe baza intervalului', () => {
    const before = Date.now();
    const out = applySM2(newCard, 4);
    const due = new Date(out.dueDate).getTime();
    // 1 zi = 86_400_000 ms; tolerăm o secundă pentru execuție.
    expect(due - before).toBeGreaterThan(86_399_000);
    expect(due - before).toBeLessThan(86_401_000);
  });

  it('setează lastReviewedAt la „acum"', () => {
    const before = Date.now();
    const out = applySM2(newCard, 4);
    const at = new Date(out.lastReviewedAt).getTime();
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
  });
});
