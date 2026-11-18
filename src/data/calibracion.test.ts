import { describe, expect, it } from 'vitest';
import { ESCENARIOS_V2, calibrar, horasPorBloque, proyectar, sugerencia } from './calibracion';
import { PLAN_EXT, calendario } from './plan-extendido';
import { emptyPlan } from './plan-state';
import type { DayLog } from './types';

const cal = calendario(PLAN_EXT);
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

describe('ola 24 · calibración (§3.9)', () => {
  it('antes de cerrar P3 no hay factor; dice cuándo se calcula (18 abr 2027)', () => {
    const c = calibrar(cal, {}, emptyPlan(), '2027-01-20');
    expect(c).toMatchObject({ listo: false, factor: null, cuando: '2027-04-18', regla: null });
    // P1 en curso: semanas de trabajo hechas sin contar la pausa (30 nov a 20 ene: 7 semanas de calendario, 6 de trabajo… va por la 6).
    expect(horasPorBloque(cal, {}, emptyPlan(), '2027-01-20').map((x) => [x.id, x.estimadas, x.cerrado])).toEqual([['P0', 51, true], ['P1', 153, true], ['P2', 25.5, false]]);
  });

  it('con P3 cerrado, el factor sale de los proyectos cerrados y la regla propone', () => {
    const lento = calibrar(cal, dias('2026-11-16', '2027-04-18', 33), emptyPlan(), '2027-04-20');
    expect(lento.listo).toBe(true);
    expect(lento.factor).toBeGreaterThan(1.15);
    expect(lento.regla).toBe('lento');
    const s = sugerencia(lento, cal, '2027-04-20')!;
    expect(s.recortar).toEqual(['A3', 'A6', 'Q2', 'Q6']);
    expect(s.claves).toContain('P4:plataforma');
    expect(s.claves.every((k) => k.endsWith(':plataforma'))).toBe(true);
    const rapido = calibrar(cal, dias('2026-11-16', '2027-04-18', 18), emptyPlan(), '2027-04-20');
    expect(rapido.regla).toBe('rapido');
    const r = sugerencia(rapido, cal, '2027-04-20')!;
    expect(r.claves).toEqual(expect.arrayContaining(['P5', 'P5:plataforma', 'P10:arquitectura', 'A7']));
    expect(r.claves.some((k) => k.startsWith('P4'))).toBe(false);
    const enPlan = calibrar(cal, dias('2026-11-16', '2027-04-18', 25.5), emptyPlan(), '2027-04-20');
    expect(enPlan.regla).toBe('en-plan');
    expect(sugerencia(enPlan, cal, '2027-04-20')).toBeNull();
  });

  it('proyectar: las semanas de proyecto que faltan se estiran por el factor; los escenarios de la v2', () => {
    const p = proyectar(cal, 1, '2027-04-20');
    expect(p).toMatchObject({ semanas: 217, fin: '2031-01-12', delta: 0 });
    expect(proyectar(cal, 1.2, '2027-04-20').semanas).toBeGreaterThan(217);
    expect(ESCENARIOS_V2.map((e) => [e.semanas, e.fin])).toEqual([[203, '2030-10-08'], [236, '2031-05-25'], [273, '2032-02-05']]);
  });
});
