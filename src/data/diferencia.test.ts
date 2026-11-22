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

describe('diferencia contra el plan v12.1 (fechas explícitas)', () => {
  it('cada bloque con fechas tiene su fila con las fechas de Trazo y los días de diferencia', () => {
    const filas = diferenciaRoadmap(calendarioVivo());
    // Los 73 bloques de v12.1; las pausas que inserta el motor no tienen fila.
    expect(filas).toHaveLength(73);
    expect(filas.some((x) => x.id.startsWith('PAUSA'))).toBe(false);
    expect(filas.find((x) => x.id === 'P1')).toMatchObject({ horas: 193.5, inicio: '2026-11-21', fin: '2026-12-09', roadmap: { inicio: '2026-11-21', fin: '2026-12-09' }, deltaInicio: 0, deltaFin: 0 });
    // Con fechas explícitas el motor las respeta: ninguna fila se corre.
    expect(filas.filter((x) => x.deltaInicio !== 0 || x.deltaFin !== 0)).toEqual([]);
    expect(filas.find((x) => x.id === 'P1V0')!.nota).toMatch(/no cuentan para la PetrIA de v12.1/);
  });

  it('el resumen: el plan termina el 27 oct 2028, en fecha; nada se adelanta ni se atrasa', () => {
    const r = resumenDiferencia(diferenciaRoadmap(calendarioVivo()))!;
    expect(r).toMatchObject({ fin: '2028-10-27', finRoadmap: '2028-10-27', delta: 0, horas: 6478.5, masAntes: null, masDespues: null });
    expect(resumenDiferencia([])).toBeNull();
  });

  it('textos de la diferencia', () => {
    expect([textoDelta(0), textoDelta(-10), textoDelta(1), textoDelta(-1)]).toEqual(['en fecha', '10 días antes', '1 día después', '1 día antes']);
  });

  it('lo que no cierra, con la cuenta: la Semana multiplataforma y Bóveda tienen más capacidad que horas; no hay huecos ni solapes', () => {
    const ch = chequeosRoadmap(PLAN_EXT, capacidad, pausa);
    expect(ch.map((c) => [c.id, c.tipo])).toEqual([['horas-SUM', 'horas'], ['horas-S1', 'horas']]);
    expect(ch[0].texto).toBe('SUM · Multiplatform week: en sus fechas del roadmap entran 32 h y el bloque pide 25 (sobran 7 h)');
    expect(ch[0].calculo).toBe('3 días del 3 jul 2027 al 5 jul 2027 con la capacidad del plan = 32 h; 25 h / 3 días = 8,3 h por día');
  });

  it('un hueco o un solape entre bloques se avisa (la pausa de diciembre no es hueco)', () => {
    const d = structuredClone(raw) as unknown as PlanExtendido;
    d.bloques.find((b) => b.id === 'P2')!.roadmap = { inicio: '2026-12-23', fin: '2027-01-02' };
    const ch = chequeosRoadmap(d, capacidad, pausa).filter((c) => c.tipo !== 'horas');
    expect(ch.map((c) => c.texto)).toEqual(['Entre E1 y P2 quedan 2 días sin bloque', 'P2 y CW2 se pisan 3 días']);
    expect(ch[1].calculo).toBe('P2 termina el 2 ene 2027 y CW2 empieza el 31 dic 2026');
    // La pausa del 20 al 26 dic 2027 cae dentro de Q2: no hay huecos en el plan.
    expect(chequeosRoadmap(PLAN_EXT, capacidad, pausa).filter((c) => c.tipo === 'hueco')).toEqual([]);
  });

  it('matemática diaria: los tramos m1–m4 están archivados en v12.1, no hay filas', () => {
    expect(diferenciaMate(PLAN_EXT, PLAN.matematica.tramos)).toEqual([]);
  });
});
