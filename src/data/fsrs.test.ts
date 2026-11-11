import { describe, expect, it } from 'vitest';
import { DAY, fmtInterval, intervalFor, newSrs, preview, retrievability, review } from './fsrs';

const t0 = Date.UTC(2026, 10, 11, 10);

describe('FSRS', () => {
  it('a los S días la retención es 90 %', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(intervalFor(10, 0.9)).toBeCloseTo(10, 5);
    expect(intervalFor(10, 0.95)).toBeLessThan(10);
  });

  it('una tarjeta nueva: Otra vez a 10 min y los demás en días crecientes', () => {
    const p = preview(newSrs(t0), t0);
    expect(fmtInterval(p[0].due - t0)).toBe('10 min');
    const d = p.slice(1).map((x) => (x.due - t0) / DAY);
    expect(d[0]).toBeLessThanOrEqual(d[1]);
    expect(d[1]).toBeLessThan(d[2]);
  });

  it('acertar seguido alarga el intervalo y fallar lo acorta', () => {
    let c = review(newSrs(t0), 3, t0);
    const i1 = (c.due - t0) / DAY;
    const t1 = c.due;
    c = review(c, 3, t1);
    expect((c.due - t1) / DAY).toBeGreaterThan(i1);
    const lapsed = review(c, 1, c.due);
    expect(lapsed.state).toBe('relearning');
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.s).toBeLessThan(c.s);
    expect(lapsed.fails).toBe(1);
  });

  it('más retención buscada, más repasos', () => {
    const c = review(newSrs(t0), 3, t0);
    const a = review(c, 3, c.due, 0.8);
    const b = review(c, 3, c.due, 0.95);
    expect(b.due).toBeLessThan(a.due);
  });
});
