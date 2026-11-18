import { describe, expect, it } from 'vitest';
import { FACTOR_MAX, FACTOR_MIN, calibrar, escenarios, horasPorBloque, proyectar, sugerencia } from './calibracion';
import { calendarioVivo } from './plan';
import { emptyPlan } from './plan-state';
import type { DayLog } from './types';

const cal = calendarioVivo();
/** Un día con `min` minutos de foco en un bloque de programación. */
const dia = (date: string, min: number): DayLog => ({ date, wake: '04:00', routine: 'completo', notes: [], focus: [{ key: 'prog', plan: 'p', focusMin: min, at: '07:00' }], blocks: [{ key: 'prog', n: 1, title: 'Prog', short: 'prog', area: 'ing', kind: 'pomodoro', start: '06:30', min: 120, fixed: false, rama: 'programacion', tasks: [] }] } as DayLog);
/** Foco de programación todos los días entre dos fechas, `h` horas por semana. */
function dias(desde: string, hasta: string, h: number) {
  const out: Record<string, DayLog> = {};
  for (let d = new Date(`${desde}T12:00`); d <= new Date(`${hasta}T12:00`); d.setDate(d.getDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    out[k] = dia(k, (h * 60) / 7);
  }
  return out;
}

describe('ola 27 · calibración (v3: factor al cerrar P2 y P3, con la unidad de 24,5 h)', () => {
  it('antes de cerrar P2 no hay factor; dice cuándo se calcula (29 dic 2026)', () => {
    const c = calibrar(cal, {}, emptyPlan(), '2026-12-05');
    expect(c).toMatchObject({ listo: false, hito: null, factor: null, cuando: '2026-12-29', regla: null });
    // P1 cerrado por fechas (122 h) y P2 en curso con las horas de programación de los días que pasaron.
    const h = horasPorBloque(cal, {}, emptyPlan(), '2026-12-12');
    expect(h.map((x) => [x.id, x.cerrado])).toEqual([['P0', true], ['P1', true], ['P2', false]]);
    expect(h.find((x) => x.id === 'P1')!.estimadas).toBe(122);
    expect(h.find((x) => x.id === 'P2')!.estimadas).toBeCloseTo(23, 0);
  });

  it('con P2 cerrado el factor sale de los cerrados; al cerrar P3 se recalcula', () => {
    const lento = calibrar(cal, dias('2026-11-16', '2026-12-29', 80), emptyPlan(), '2026-12-30');
    expect(lento).toMatchObject({ listo: true, hito: 'P2', cuando: '2027-03-02' });
    expect(lento.factor).toBeGreaterThan(FACTOR_MAX);
    expect(lento.regla).toBe('lento');
    const s = sugerencia(lento, cal, '2026-12-30')!;
    expect(s.recortar).toEqual(['A3', 'A6', 'Q2', 'Q6']);
    expect(s.claves).toContain('P4:plataforma');
    expect(s.claves.every((k) => k.endsWith(':plataforma'))).toBe(true);
    const rapido = calibrar(cal, dias('2026-11-16', '2026-12-29', 30), emptyPlan(), '2026-12-30');
    expect(rapido.regla).toBe('rapido');
    expect(rapido.factor!).toBeLessThan(FACTOR_MIN);
    const r = sugerencia(rapido, cal, '2026-12-30')!;
    expect(r.claves).toEqual(expect.arrayContaining(['P5', 'P5:plataforma', 'P10:arquitectura', 'A7']));
    expect(r.claves.some((k) => k.startsWith('P4'))).toBe(false);
    // En plan: tantas horas como las estimadas (los días de pausa no suman).
    const enPlan = calibrar(cal, dias('2026-11-16', '2026-12-29', 39), emptyPlan(), '2026-12-30');
    expect(enPlan.regla).toBe('en-plan');
    expect(sugerencia(enPlan, cal, '2026-12-30')).toBeNull();
    // Al cerrar P3 se recalcula con P1, P2 y P3.
    const p3 = calibrar(cal, dias('2026-11-16', '2027-03-02', 53), emptyPlan(), '2027-03-03');
    expect(p3.hito).toBe('P3');
    expect(p3.filas.filter((f) => f.cerrado).map((f) => f.id)).toEqual(['P0', 'P1', 'P2', 'P3']);
  });

  it('proyectar y escenarios: salen del calendario por horas con el factor, no están escritos a mano', () => {
    const base = proyectar(1);
    expect(base.deltaDias).toBe(0);
    const lento = proyectar(1.15);
    expect(lento.horas).toBeGreaterThan(base.horas);
    expect(lento.fin > base.fin).toBe(true);
    expect(lento.deltaDias).toBeGreaterThan(60);
    const e = escenarios();
    expect(e.map((x) => [x.id, x.factor])).toEqual([['rapido', 0.85], ['en-plan', 1], ['lento', 1.15]]);
    expect(e[0].fin < e[1].fin && e[1].fin < e[2].fin).toBe(true);
    // Lo ya cerrado no se estira: con P1 y P2 cerrados el escenario lento cambia menos.
    expect(proyectar(1.15, undefined, ['P1', 'P2']).deltaDias).toBeLessThan(lento.deltaDias);
  });
});
