import { describe, expect, it } from 'vitest';
import { FACTOR_MAX, FACTOR_MIN, calibrar, diasPorDiezPorCiento, escenarios, horasPorBloque, proyectar, sugerencia } from './calibracion';
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

describe('ola 33 · calibración con PetrIA 1.0 y 1.1 (las horas de los demás llevan un 1,5 provisional)', () => {
  it('antes de publicar la 1.0 no hay factor; dice cuándo la da el calendario', () => {
    const c = calibrar(cal, {}, emptyPlan(), '2026-11-21');
    expect(c).toMatchObject({ listo: false, hito: null, factor: null, cuando: '2026-11-25', regla: null });
    expect(c.versiones.map((v) => [v.version, v.estimadas, v.reales, v.finTrazo])).toEqual([['1.0', 47, null, '2026-11-25'], ['1.1', 48.5, null, '2026-11-30']]);
    // Las horas por proyecto siguen: P0 y PetrIA v0 (archivada, 19–20 nov) cerrados, P1 en curso a 11 h el finde y 10 h entre semana.
    const h = horasPorBloque(cal, {}, emptyPlan(), '2026-11-23');
    expect(h.map((x) => [x.id, x.cerrado])).toEqual([['P0', true], ['P1V0', true], ['P1', false]]);
    expect(h.find((x) => x.id === 'P1')!.estimadas).toBe(11 + 11 + 10);
  });

  it('con la 1.0 publicada el factor es horas reales / 47; con la 1.1, / 95,5', () => {
    const v10 = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-25' } } } };
    // 14 h por día del 21 al 25 nov (5 días): 70 h reales contra 47. Las del 19 y 20 nov son de PetrIA v0 y no cuentan.
    const lento = calibrar(cal, dias('2026-11-19', '2026-11-25', 98), v10, '2026-11-26');
    expect(lento).toMatchObject({ listo: true, hito: '1.0', estimadas: 47, reales: 70, factor: 1.49, regla: 'lento', cuando: '2026-11-30' });
    const v11 = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-25' }, '1.1': { publicada: '2026-11-30' } } } };
    const c = calibrar(cal, dias('2026-11-21', '2026-11-30', 49), v11, '2026-12-01');
    expect(c).toMatchObject({ hito: '1.1', estimadas: 95.5, reales: 70, factor: 0.73, regla: 'rapido', cuando: null });
    // La 1.1 sola (sin la 1.0) no calibra.
    expect(calibrar(cal, {}, { ...emptyPlan(), versiones: { P1: { '1.1': { publicada: '2026-11-30' } } } }, '2026-12-01').hito).toBeNull();
  });

  it('las horas cargadas a mano mandan sobre el foco de ese día', () => {
    const v10 = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-22' } } }, horasManuales: { '2026-11-21': { programacion: 10 }, '2026-11-22': { programacion: 11 } } };
    // El 21 tiene 2 h de foco y 10 a mano: cuentan las 10.
    const c = calibrar(cal, dias('2026-11-21', '2026-11-22', 14), v10, '2026-11-23');
    expect(c).toMatchObject({ reales: 21, estimadas: 47, factor: 0.45 });
  });

  it('la sugerencia no recorta: dice cuántos días se corre el plan', () => {
    const lento = calibrar(cal, dias('2026-11-21', '2026-11-25', 98), { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-25' } } } }, '2026-11-26');
    const s = sugerencia(lento, '2031-12-01', '2031-06-04')!;
    expect(s.texto).toMatch(/^Vas más lento que lo estimado \(factor 1,49\): el plan se correría 180 días\. No se recorta profundidad: en Períodos ves qué bloques correr y lo confirmás\.$/);
    expect(sugerencia({ ...lento, regla: 'en-plan' }, '2031-06-04', '2031-06-04')).toBeNull();
  });
  it('proyectar y escenarios (v12.1): una proyección en días hábiles sobre el plan fechado; el calendario no se mueve', () => {
    const base = proyectar(1);
    expect(base).toMatchObject({ deltaDias: 0, fin: '2028-12-14', horas: 6480.5 }); // v12.4: PetrIA 193,5 h y VitalIA 102 h; el plan termina el 14 dic 2028
    const lento = proyectar(1.15);
    expect(lento.horas).toBeGreaterThan(base.horas);
    expect(lento.fin > base.fin).toBe(true);
    expect(lento.deltaDias).toBe(57); // los proyectos son unos 2/3 del plan: +15 % en ellos son 8 semanas
    const e = escenarios();
    expect(e.map((x) => [x.id, x.factor])).toEqual([['rapido', 0.85], ['en-plan', 1], ['lento', 1.15]]);
    expect(e[0].fin < e[1].fin && e[1].fin < e[2].fin).toBe(true);
    // Lo ya cerrado no se estira: con P1 y P2 cerrados el escenario lento cambia menos.
    expect(proyectar(1.15, undefined, ['P1', 'P2']).deltaDias).toBeLessThan(lento.deltaDias);
    // Con PetrIA cerrada: más rápido termina antes, más lento después (y +10 % corre el fin 34 días).
    expect(escenarios(undefined, ['P1']).map((x) => x.fin)).toEqual(['2028-10-23', '2028-12-14', '2029-02-06']);
    expect(diasPorDiezPorCiento(undefined, ['P1'])).toBe(34);
    // Proyectar no toca el calendario real: sigue terminando el 14 dic 2028.
    expect(calendarioVivo().reduce((m, b) => (b.fin > m ? b.fin : m), '')).toBe('2028-12-14');
  });
});
