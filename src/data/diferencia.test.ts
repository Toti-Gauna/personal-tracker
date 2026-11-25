import { describe, expect, it } from 'vitest';
import raw from '../../data/plan-extendido.json';
import { esDiaDePausa, horasDelDia } from './capacidad';
import { chequeosRoadmap, diferenciaMate, diferenciaRoadmap, resumenDiferencia, textoDelta } from './diferencia';
import { PLAN, calendarioVivo } from './plan';
import { PLAN_EXT, type PlanExtendido } from './plan-extendido';

const cfg = { t0: '2026-11-16', inicioTrabajo: '2027-01-04' };
// v12.1: las ventanas de matemática usan la misma capacidad que el resto (10 h entre semana, 11 h el finde).
const capacidad = (f: string) => horasDelDia(f, cfg);
const pausa = (f: string) => esDiaDePausa(f);

describe('diferencia contra el plan v12.4 (fechas explícitas)', () => {
  it('cada bloque con fechas tiene su fila con las fechas de Trazo y los días de diferencia', () => {
    const filas = diferenciaRoadmap(calendarioVivo());
    // Los 71 bloques de v12.4 (los 69 de primer plano, Constelación v1 y PetrIA v0 archivada); los días libres fijos no son bloques y las pausas que inserta el motor no tienen fila.
    expect(filas).toHaveLength(71);
    expect(filas.some((x) => x.id.startsWith('PAUSA'))).toBe(false);
    expect(filas.find((x) => x.id === 'P1')).toMatchObject({ horas: 193.5, inicio: '2026-11-21', fin: '2026-12-12', roadmap: { inicio: '2026-11-21', fin: '2026-12-12' }, deltaInicio: 0, deltaFin: 0 });
    // Con fechas explícitas el motor las respeta: ninguna fila se corre.
    expect(filas.filter((x) => x.deltaInicio !== 0 || x.deltaFin !== 0)).toEqual([]);
    expect(filas.find((x) => x.id === 'P1V0')!.nota).toMatch(/no cuentan para la PetrIA de v12.1/);
  });

  it('el resumen: el plan termina el 14 dic 2028, en fecha; nada se adelanta ni se atrasa', () => {
    const r = resumenDiferencia(diferenciaRoadmap(calendarioVivo()))!;
    expect(r).toMatchObject({ fin: '2028-12-14', finRoadmap: '2028-12-14', delta: 0, horas: 6480.5, masAntes: null, masDespues: null });
    expect(resumenDiferencia([])).toBeNull();
  });

  it('textos de la diferencia', () => {
    expect([textoDelta(0), textoDelta(-10), textoDelta(1), textoDelta(-1)]).toEqual(['en fecha', '10 días antes', '1 día después', '1 día antes']);
  });

  it('lo que no cierra, con la cuenta: solo el PNPT tiene más capacidad que horas (el examen práctico son 5 días seguidos); no hay huecos ni solapes', () => {
    // Un bloque ocupa días enteros: lo que sobra del último día no es un desvío. Con la capacidad de v12.4 (lo de fondo sale del foco)
    // las fechas del doc reproducen las horas de cada bloque; el PNPT, armado a mano, tiene 184 h de capacidad para 154 h.
    const ch = chequeosRoadmap(PLAN_EXT, capacidad, pausa);
    expect(ch.map((c) => [c.id, c.tipo])).toEqual([['horas-CW9', 'horas']]);
    expect(ch[0].texto).toBe('CW9 · PNPT: en sus fechas del roadmap entran 184 h y el bloque pide 154 (sobran 30 h)');
    expect(ch[0].calculo).toBe('18 días del 13 dic 2027 al 13 ene 2028 con la capacidad del plan = 184 h; 154 h / 18 días = 8,6 h por día');
  });

  it('un hueco o un solape entre bloques se avisa (la pausa de diciembre no es hueco)', () => {
    const d = structuredClone(raw) as unknown as PlanExtendido;
    // v12.4: E1 termina el 27 dic 2026 y CW2 empieza el 9 ene 2027; VitalIA, corrida a 30 dic–11 ene, deja 2 días libres y pisa 3.
    d.bloques.find((b) => b.id === 'P2')!.roadmap = { inicio: '2026-12-30', fin: '2027-01-11' };
    const ch = chequeosRoadmap(d, capacidad, pausa).filter((c) => c.tipo !== 'horas');
    expect(ch.map((c) => c.texto)).toEqual(['Entre E1 y P2 quedan 2 días sin bloque', 'P2 y CW2 se pisan 3 días']);
    expect(ch[1].calculo).toBe('P2 termina el 11 ene 2027 y CW2 empieza el 9 ene 2027');
    // Los tres días libres fijos (20–26 dic 2027, 31 dic 2027–6 ene 2028 y 9–15 jun 2028) caen dentro de PNPT y de Math WA1: no hay huecos en el plan.
    expect(chequeosRoadmap(PLAN_EXT, capacidad, pausa).filter((c) => c.tipo === 'hueco')).toEqual([]);
  });

  it('matemática diaria: los tramos m1–m4 están archivados en v12.1, no hay filas', () => {
    expect(diferenciaMate(PLAN_EXT, PLAN.matematica.tramos)).toEqual([]);
  });
});
