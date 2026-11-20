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

describe('ola 27 · calibración (factor al cerrar P2 y P3, sobre las horas del roadmap v7)', () => {
  it('antes de cerrar P2 no hay factor; dice cuándo se calcula (8 feb 2027 con el roadmap v7)', () => {
    const c = calibrar(cal, {}, emptyPlan(), '2026-12-05');
    expect(c).toMatchObject({ listo: false, hito: null, factor: null, cuando: '2027-02-08', regla: null });
    // P0 (días fijos, sin horas) cerrado por fechas y P1 en curso con las horas de los días que pasaron (8 por día).
    const h = horasPorBloque(cal, {}, emptyPlan(), '2026-12-12');
    expect(h.map((x) => [x.id, x.cerrado])).toEqual([['P0', true], ['P1', false]]);
    expect(h.find((x) => x.id === 'P0')!.estimadas).toBe(0);
    expect(h.find((x) => x.id === 'P1')!.estimadas).toBe(24 * 8);
    // Cerrado, P1 vale sus 304 h.
    expect(horasPorBloque(cal, {}, emptyPlan(), '2027-01-02').find((x) => x.id === 'P1')).toMatchObject({ estimadas: 304, cerrado: true });
  });

  it('con P2 cerrado el factor sale de los cerrados; al cerrar P3 se recalcula', () => {
    const lento = calibrar(cal, dias('2026-11-16', '2027-02-08', 80), emptyPlan(), '2027-02-09');
    expect(lento).toMatchObject({ listo: true, hito: 'P2', cuando: '2027-04-24' });
    expect(lento.factor).toBeGreaterThan(FACTOR_MAX);
    expect(lento.regla).toBe('lento');
    const s = sugerencia(lento, cal, '2027-02-09')!;
    expect(s.recortar).toEqual(['A3', 'A6', 'Q2', 'Q6']);
    // La v7 no tiene semanas extra de plataforma: no hay nada que apagar, solo alcance.
    expect(s.claves).toEqual([]);
    const rapido = calibrar(cal, dias('2026-11-16', '2027-02-08', 30), emptyPlan(), '2027-02-09');
    expect(rapido.regla).toBe('rapido');
    expect(rapido.factor!).toBeLessThan(FACTOR_MIN);
    expect(sugerencia(rapido, cal, '2027-02-09')!.claves).toEqual([]);
    // En plan: tantas horas como las estimadas (459 h en los 78 días de P0, P1 y P2).
    const enPlan = calibrar(cal, dias('2026-11-16', '2027-02-08', 41), emptyPlan(), '2027-02-09');
    expect(enPlan.regla).toBe('en-plan');
    expect(sugerencia(enPlan, cal, '2027-02-09')).toBeNull();
    // Al cerrar P3 se recalcula con P0 a P3.
    const p3 = calibrar(cal, dias('2026-11-16', '2027-04-24', 40), emptyPlan(), '2027-04-25');
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
