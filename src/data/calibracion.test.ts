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

describe('ola 33 · calibración con PetrIA 1.0 y 1.1 (las horas de los demás llevan un 1,5 provisional)', () => {
  it('antes de publicar la 1.0 no hay factor; dice cuándo la da el calendario', () => {
    const c = calibrar(cal, {}, emptyPlan(), '2026-11-21');
    expect(c).toMatchObject({ listo: false, hito: null, factor: null, cuando: '2026-11-28', regla: null });
    expect(c.versiones.map((v) => [v.version, v.estimadas, v.reales, v.finTrazo])).toEqual([['1.0', 74, null, '2026-11-28'], ['1.1', 74, null, '2026-12-07']]);
    // Las horas por proyecto siguen: P0 (días fijos) cerrado y P1 en curso a 8 h por día.
    const h = horasPorBloque(cal, {}, emptyPlan(), '2026-12-12');
    expect(h.map((x) => [x.id, x.cerrado])).toEqual([['P0', true], ['P1', false]]);
    expect(h.find((x) => x.id === 'P1')!.estimadas).toBe(24 * 8);
  });

  it('con la 1.0 publicada el factor es horas reales / 74; con la 1.1, / 148', () => {
    const v10 = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-12-01' } } } };
    // 8 h por día del 19 nov al 1 dic (13 días): 104 h reales contra 74.
    const lento = calibrar(cal, dias('2026-11-19', '2026-12-01', 56), v10, '2026-12-02');
    expect(lento).toMatchObject({ listo: true, hito: '1.0', estimadas: 74, reales: 104, factor: 1.41, regla: 'lento', cuando: '2026-12-07' });
    const v11 = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-12-01' }, '1.1': { publicada: '2026-12-10' } } } };
    const c = calibrar(cal, dias('2026-11-19', '2026-12-10', 35), v11, '2026-12-11');
    expect(c).toMatchObject({ hito: '1.1', estimadas: 148, reales: 110, factor: 0.74, regla: 'rapido', cuando: null });
    // La 1.1 sola (sin la 1.0) no calibra.
    expect(calibrar(cal, {}, { ...emptyPlan(), versiones: { P1: { '1.1': { publicada: '2026-12-10' } } } }, '2026-12-11').hito).toBeNull();
  });

  it('las horas cargadas a mano mandan sobre el foco de ese día', () => {
    const v10 = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-20' } } }, horasManuales: { '2026-11-19': { programacion: 8 }, '2026-11-20': { programacion: 9 } } };
    // El 19 tiene 2 h de foco y 8 a mano: cuentan las 8.
    const c = calibrar(cal, dias('2026-11-19', '2026-11-20', 14), v10, '2026-11-21');
    expect(c).toMatchObject({ reales: 17, estimadas: 74, factor: 0.23 });
  });

  it('la sugerencia no recorta: dice cuántos días se corre el plan', () => {
    const lento = calibrar(cal, dias('2026-11-19', '2026-12-01', 56), { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-12-01' } } } }, '2026-12-02');
    const s = sugerencia(lento, '2031-12-01', '2031-06-04')!;
    expect(s.texto).toMatch(/^Vas más lento que lo estimado \(factor 1,41\): el plan se corre 180 días\. No se recorta profundidad: se mueven fechas\.$/);
    expect(sugerencia({ ...lento, regla: 'en-plan' }, '2031-06-04', '2031-06-04')).toBeNull();
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
