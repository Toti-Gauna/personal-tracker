import { describe, expect, it } from 'vitest';
import raw from '../../data/plan-extendido.json';
import { esDiaDePausa, horasDelDia } from './capacidad';
import { chequeosRoadmap, diferenciaMate, diferenciaRoadmap, resumenDiferencia, textoDelta } from './diferencia';
import { PLAN, calendarioVivo } from './plan';
import { PLAN_EXT, type PlanExtendido } from './plan-extendido';

const cfg = { t0: '2026-11-16', inicioTrabajo: '2027-01-04' };
const capacidad = (f: string, tipo: string) => (tipo === 'ventana' ? 43 / 7 : horasDelDia(f, cfg));
const pausa = (f: string) => esDiaDePausa(f);

describe('ola 29 · diferencia contra el roadmap v7', () => {
  it('cada bloque con fechas del roadmap tiene su fila con las fechas de Trazo y los días de diferencia', () => {
    const filas = diferenciaRoadmap(calendarioVivo());
    // Los 60 bloques del roadmap; las pausas que inserta el motor no tienen fila.
    expect(filas).toHaveLength(60);
    expect(filas.some((x) => x.id.startsWith('PAUSA'))).toBe(false);
    expect(filas.find((x) => x.id === 'P1')).toMatchObject({ horas: 304, horasAntes: 122, inicio: '2026-11-19', fin: '2026-12-26', roadmap: { inicio: '2026-11-19', fin: '2027-01-05' }, deltaInicio: 0, deltaFin: -10 });
    expect(filas.find((x) => x.id === 'C7')).toMatchObject({ numero: 10, dias: 18, deltaFin: 0 });
    expect(filas.find((x) => x.id === 'C8')!.nota).toMatch(/Claude Partner Network/);
  });

  it('el resumen: el plan termina el 4 jun 2031, 8 días después del 27 may que estima el roadmap; PetrIA es lo que más se adelanta', () => {
    const r = resumenDiferencia(diferenciaRoadmap(calendarioVivo()))!;
    expect(r).toMatchObject({ fin: '2031-06-04', finRoadmap: '2031-05-27', delta: 8, horas: 6188, horasAntes: 3503 });
    expect(r.masAntes!.id).toBe('P1');
    expect(r.masDespues!.id).toBe('CIE4');
    expect(resumenDiferencia([])).toBeNull();
  });

  it('textos de la diferencia', () => {
    expect([textoDelta(0), textoDelta(-10), textoDelta(1), textoDelta(-1)]).toEqual(['en fecha', '10 días antes', '1 día después', '1 día antes']);
  });

  it('lo que no cierra en el roadmap, con la cuenta: PetrIA y la Semana multiplataforma tienen más capacidad que horas; no hay huecos ni solapes', () => {
    const ch = chequeosRoadmap(PLAN_EXT, capacidad, pausa);
    expect(ch.map((c) => [c.id, c.tipo])).toEqual([['horas-P1', 'horas'], ['horas-SUM', 'horas']]);
    expect(ch[0].texto).toBe('P1 · PetrIA: en sus fechas del roadmap entran 374 h y el bloque pide 304 (sobran 70 h)');
    expect(ch[0].calculo).toBe('48 días del 19 nov 2026 al 5 ene 2027 con la capacidad del plan = 374 h; 304 h / 48 días = 6,3 h por día');
  });

  it('un hueco o un solape entre bloques del roadmap se avisa (la pausa de diciembre no es hueco)', () => {
    const d = structuredClone(raw) as unknown as PlanExtendido;
    d.bloques.find((b) => b.id === 'P2')!.roadmap = { inicio: '2027-01-15', fin: '2027-02-18' };
    d.bloques.find((b) => b.id === 'P3')!.roadmap = { inicio: '2027-03-15', fin: '2027-05-02' };
    const ch = chequeosRoadmap(d, capacidad, pausa).filter((c) => c.tipo !== 'horas');
    expect(ch.map((c) => c.texto)).toEqual(['Entre C8 y P2 quedan 2 días sin bloque', 'W1 y P3 se pisan 6 días']);
    expect(ch[1].calculo).toBe('W1 termina el 20 mar 2027 y P3 empieza el 15 mar 2027');
    // Entre C7 (PNPT) y el cierre está la pausa del 18 al 24 dic 2028: no es hueco.
    expect(chequeosRoadmap(PLAN_EXT, capacidad, pausa).some((c) => c.id === 'hueco-CIE2')).toBe(false);
  });

  it('matemática diaria: m1, m2 y m3 en fecha; m4 una semana antes del ≈ 2 jun 2028', () => {
    expect(diferenciaMate(PLAN_EXT, PLAN.matematica.tramos).map((m) => [m.id, m.fin, m.delta])).toEqual([
      ['m1', '2027-02-11', 0], ['m2', '2027-06-09', 0], ['m3', '2027-08-04', 0], ['m4', '2028-05-26', -7],
    ]);
  });
});
