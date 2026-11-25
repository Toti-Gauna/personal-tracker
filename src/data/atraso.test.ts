import { describe, expect, it } from 'vitest';
import { UMBRAL_ATRASO_DIAS, atrasoPrincipal, recuperaPausando } from './atraso';
import { medir } from './periodos';
import { arbolPlan } from './periodos-plan';
import { calendarioCompleto } from './plan-vistas';
import { emptyPlan } from './plan-state';
import { confirmarCorrimiento } from '../state/plan';
import { getState, register, resetState } from '../state/store';

const cal = calendarioCompleto();
const plan = (extra: Partial<ReturnType<typeof emptyPlan>> = {}) => ({ ...emptyPlan(), ...extra });
const atraso = (hoy: string, p = plan()) => atrasoPrincipal(arbolPlan(cal, { plan: p }).map((x) => medir(x, hoy)), cal, p, hoy);

describe('v12.4 · el atraso acumulado de la principal (alerta cuando pasa de 7 días)', () => {
  it('al día: sin atraso y sin alerta; el fin del plan es el 14 dic 2028 (una estimación)', () => {
    const a = atraso('2026-11-23');
    expect(a).toMatchObject({ dias: 0, finPlan: '2028-12-14', finEstimado: '2028-12-14', excede: false, sugerencias: [] });
    expect(a.bloque).toBeUndefined();
  });

  it('PetrIA con 0 de trabajo el 25 nov (4 días adentro): se corre ~4 días y todavía no alerta (el umbral es más de 7)', () => {
    expect(UMBRAL_ATRASO_DIAS).toBe(7);
    const a = atraso('2026-11-25');
    expect(a.bloque).toMatchObject({ id: 'P1', nombre: 'PetrIA' });
    expect(a.dias).toBeGreaterThanOrEqual(4);
    expect(a.dias).toBeLessThanOrEqual(UMBRAL_ATRASO_DIAS);
    expect(a.excede).toBe(false);
    expect(a.sugerencias).toEqual([]);
  });

  it('más de 7 días: da el nuevo fin estimado y sugiere pausar primero lo comercial y después lo secundario', () => {
    const a = atraso('2026-12-20');
    expect(a.excede).toBe(true);
    expect(a.dias).toBeGreaterThan(UMBRAL_ATRASO_DIAS);
    expect(a.finEstimado > '2028-12-14').toBe(true);
    expect(a.sugerencias.map((x) => x.pista)).toEqual(['comercial', 'secundaria']);
    for (const x of a.sugerencias) expect(x.horas).toBeGreaterThan(0);
  });

  it('el atraso ya confirmado cuenta: los corrimientos que corren el cierre final suman al acumulado', () => {
    resetState();
    register('Toti', 'Abi', '2026-11-16');
    confirmarCorrimiento([{ id: 'CIE4', nuevoInicio: '2028-12-20', nuevoFin: '2028-12-22' }], '2026-12-01');
    const p = getState().plan;
    const viva = calendarioCompleto();
    const a = atrasoPrincipal(arbolPlan(viva, { plan: p }).map((x) => medir(x, '2026-11-23')), viva, p, '2026-11-23');
    expect(a).toMatchObject({ finEstimado: '2028-12-22', dias: 8, excede: true });
    resetState();
  });

  it('pausar una pista a mano le devuelve horas a la principal: lo comercial, 1 h por día de slot', () => {
    // 13–27 dic 2026 es el slot #1: 15 días con 1 h comercial cada uno.
    expect(recuperaPausando('comercial', '2026-12-13', '2026-12-27')).toMatchObject({ horas: 15 });
    expect(recuperaPausando('secundaria', '2026-12-13', '2026-12-27')).toMatchObject({ horas: 15 });
    // Sin ningún slot comercial (agosto de 2027) no hay nada que devolver.
    expect(recuperaPausando('comercial', '2027-08-09', '2027-08-15')).toEqual({ horas: 0, dias: 0 });
  });
});
