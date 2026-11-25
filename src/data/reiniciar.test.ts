import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePeriodos } from '../ui/usePeriodos';
import { confirmarCorrimiento, restaurarCorrimientos, volverTodoAlPlan } from '../state/plan';
import { getState, register, resetState } from '../state/store';
import { estadoCert, certV12, fijasDeReservas } from './certs-v12';
import { corrimientoDeFondo, reiniciarDesde, type PeriodoMedido, type Tramo } from './periodos';
import { itemsDeFondo } from './fondo';
import { llevarDeBloque, llevarFecha, secuenciaPlan } from './periodos-plan';
import { PLAN_EXT } from './plan-extendido';

const t = (id: string, inicio: string, fin: string, extra: Partial<Tramo> = {}): Tramo => ({ id, inicio, fin, ...extra });
const fin = (cs: { id: string; nuevoFin: string }[], id: string) => cs.find((c) => c.id === id)?.nuevoFin;
const ini = (cs: { id: string; nuevoInicio: string }[], id: string) => cs.find((c) => c.id === id)?.nuevoInicio;

describe('Empezar de nuevo · el cálculo', () => {
  // A y B: 5 días cada uno; COL (absorbe): 10 días; C sigue después.
  const seq = [t('A', '2026-11-21', '2026-11-25'), t('B', '2026-11-26', '2026-11-30'), t('COL', '2026-12-01', '2026-12-10', { absorbe: true }), t('C', '2026-12-11', '2026-12-15')];

  it('el primer bloque arranca ese día, el que sigue lo acompaña y el absorbedor se achica y conserva su fin', () => {
    const cs = reiniciarDesde(seq, 'A', '2026-11-25');
    expect([ini(cs, 'A'), fin(cs, 'A')]).toEqual(['2026-11-25', '2026-11-29']);
    expect([ini(cs, 'B'), fin(cs, 'B')]).toEqual(['2026-11-30', '2026-12-04']);
    const col = cs.find((c) => c.id === 'COL')!;
    expect([col.nuevoInicio, col.nuevoFin, col.absorbe]).toEqual(['2026-12-05', '2026-12-10', true]); // 10 días → 6, mismo fin
    expect(cs.find((c) => c.id === 'C')).toBeUndefined(); // desde ahí, nada cambia
  });

  it('si el atraso no entra en el absorbedor, queda en 3 días y lo que sobra sigue', () => {
    const cs = reiniciarDesde(seq, 'A', '2026-12-05'); // 14 días tarde
    const col = cs.find((c) => c.id === 'COL')!;
    expect(col.nuevoFin).toBe(addDias(col.nuevoInicio, 2)); // 3 días
    expect(ini(cs, 'C')).toBe(addDias(col.nuevoFin, 1)); // C arranca atrás del absorbedor y se corre
  });

  it('adelantarse alarga el absorbedor (conserva su fin) y no toca lo que sigue', () => {
    const cs = reiniciarDesde(seq, 'A', '2026-11-18');
    expect([ini(cs, 'A'), fin(cs, 'A')]).toEqual(['2026-11-18', '2026-11-22']);
    const col = cs.find((c) => c.id === 'COL')!;
    expect([col.nuevoInicio, col.nuevoFin]).toEqual(['2026-11-28', '2026-12-10']);
    expect(cs.find((c) => c.id === 'C')).toBeUndefined();
  });

  it('las fechas fijas no se mueven ni cuentan: el bloque las saltea', () => {
    const cs = reiniciarDesde(seq, 'A', '2026-11-25', [{ inicio: '2026-11-27', fin: '2026-11-28' }]);
    expect(ini(cs, 'A')).toBe('2026-11-25');
    expect(fin(cs, 'A')).toBe('2026-12-01'); // 25, 26, (27 y 28 fijos), 29, 30 y 1 dic: cinco días hábiles
  });

  it('si ya está fechado desde ese día no cambia nada, y un id que no existe no rompe', () => {
    expect(reiniciarDesde(seq, 'A', '2026-11-21')).toEqual([]);
    expect(reiniciarDesde(seq, 'NADA', '2026-11-25')).toEqual([]);
  });
});

const addDias = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

describe('llevarFecha · lo de adentro de un bloque corrido', () => {
  it('con el mismo largo corre los mismos días; las de afuera mantienen su distancia al borde; sin corrimiento no cambia', () => {
    const de = { inicio: '2026-11-21', fin: '2026-12-09' };
    const a = { inicio: '2026-11-25', fin: '2026-12-13' };
    expect(llevarFecha('2026-11-25', de, a)).toBe('2026-11-29');
    expect(llevarFecha('2026-12-09', de, a)).toBe('2026-12-13');
    expect(llevarFecha('2026-12-12', de, a)).toBe('2026-12-16'); // deadline después del fin
    expect(llevarFecha('2026-11-25', de, de)).toBe('2026-11-25');
    expect(llevarFecha('2026-11-25', undefined, a)).toBe('2026-11-25');
  });
  it('si el bloque se achicó o se alargó, lo de adentro se acomoda en proporción y los extremos quedan en los extremos', () => {
    const de = { inicio: '2026-11-01', fin: '2026-11-11' };
    const a = { inicio: '2026-11-01', fin: '2026-11-21' };
    expect(llevarFecha('2026-11-01', de, a)).toBe('2026-11-01');
    expect(llevarFecha('2026-11-11', de, a)).toBe('2026-11-21');
    expect(llevarFecha('2026-11-06', de, a)).toBe('2026-11-11');
  });
});

describe('Empezar de nuevo · el plan real, empezando hoy (25 nov)', () => {
  const HOY = '2026-11-25';
  beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); });
  const usar = () => renderHook(() => usePeriodos(HOY)).result.current;
  const recorrer = (ps: PeriodoMedido[]): PeriodoMedido[] => ps.flatMap((p) => [p, ...recorrer(p.hijos ?? [])]);
  const calcular = () => {
    const { arbol, cal, plan } = usar();
    const reservas = fijasDeReservas(plan);
    const seq = secuenciaPlan(cal, reservas);
    const cs = reiniciarDesde(seq, 'P1', HOY, [...(PLAN_EXT.capacidad?.fijas ?? []), ...reservas]);
    return { arbol, cs, fondo: corrimientoDeFondo(itemsDeFondo(), seq, cs) };
  };

  it('antes: PetrIA y su v1.0 van atrasados; después de empezar hoy, nada del plan queda atrasado ni vencido', () => {
    const { arbol, cs, fondo } = calcular();
    const antes = recorrer(arbol);
    expect(antes.find((p) => p.id === 'P1')!.estado).toBe('atrasado');
    expect(antes.find((p) => p.id === 'P1:v1.0')!.estado).toBe('atrasado');
    confirmarCorrimiento([...cs, ...fondo], HOY);
    const despues = recorrer(usar().arbol);
    const malos = despues.filter((p) => p.estado === 'atrasado' || p.estado === 'vencido').map((p) => `${p.id} ${p.estado}`);
    expect(malos).toEqual([]);
    const p1 = despues.find((p) => p.id === 'P1')!;
    expect([p1.inicio, p1.fin]).toEqual(['2026-11-25', '2026-12-13']);
    // Sus versiones y lotes van con él.
    expect(despues.find((p) => p.id === 'P1:v1.0')!.inicio).toBe('2026-11-25');
    expect(despues.find((p) => p.id === 'P1:v3.0')!.fin).toBe('2026-12-13');
  });

  it('el corrimiento se frena en la consolidación: las etapas y lo que viene después conservan sus fechas', () => {
    const { arbol, cs } = calcular();
    const col = cs.find((c) => c.absorbe);
    expect(col?.id).toBe('COL');
    expect(col!.nuevoFin).toBe(col!.fin);
    confirmarCorrimiento(cs, HOY);
    const despues = recorrer(usar().arbol);
    for (const id of ['W4', 'S1', 'CIE2', 'Q1', 'A7']) {
      const a = recorrer(arbol).find((p) => p.id === id)!;
      const d = despues.find((p) => p.id === id)!;
      expect([d.inicio, d.fin], id).toEqual([a.inicio, a.fin]);
    }
  });

  it('la certificación y la ventana de matemática también van con su bloque: el examen del plan, el día por día y los hitos', () => {
    const { cs } = calcular();
    confirmarCorrimiento(cs, HOY);
    const plan = getState().plan;
    const c = certV12('claude-architect')!;
    const e = estadoCert(c, plan, HOY);
    const delta = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
    const corrida = delta(PLAN_EXT.bloques.find((b) => b.id === 'CW1')!.fechas!.inicio, plan.corrimientos!.CW1.inicio);
    expect(corrida).toBeGreaterThan(0);
    expect(delta(c.examen, e.examen)).toBe(corrida); // el examen del plan se corre con la ventana
    expect(e.cert.plan.map((p) => delta(c.plan[0].fecha, p.fecha))).toEqual(c.plan.map((p) => delta(c.plan[0].fecha, p.fecha) + corrida));
    // Un examen reservado es fijo: no se mueve.
    const reservado = estadoCert(c, { ...plan, reservas: { [c.id]: { examen: '2026-12-13', reservado: '2026-11-25' } as never } }, HOY);
    expect(reservado.examen).toBe('2026-12-13');
    // Los hitos de una ventana de matemática.
    expect(llevarDeBloque(plan.corrimientos, 'W1')('2027-01-15')).toBe(plan.corrimientos!.W1.inicio); // el primer día de la ventana va a su nuevo primer día
    expect(llevarDeBloque(undefined, 'W1')('2027-01-15')).toBe('2027-01-15'); // sin corrimiento, queda como dice el plan
  });

  it('lo hecho queda: marcar un lote antes de empezar de nuevo lo deja marcado, y deshacer vuelve las fechas', () => {
    const { cs, fondo } = calcular();
    const previo = getState().plan.corrimientos;
    confirmarCorrimiento([...cs, ...fondo], HOY);
    expect(Object.keys(getState().plan.corrimientos ?? {}).length).toBeGreaterThan(2);
    restaurarCorrimientos(previo);
    expect(recorrer(usar().arbol).find((p) => p.id === 'P1')!.inicio).toBe('2026-11-21');
  });

  it('"volver todo a las fechas del plan" saca todos los corrimientos y devuelve los que había', () => {
    const { cs } = calcular();
    confirmarCorrimiento(cs, HOY);
    const antes = volverTodoAlPlan();
    expect(Object.keys(antes ?? {}).length).toBeGreaterThan(0);
    expect(getState().plan.corrimientos).toEqual({});
    restaurarCorrimientos(antes);
    expect(Object.keys(getState().plan.corrimientos ?? {})).toEqual(Object.keys(antes ?? {}));
  });
});
