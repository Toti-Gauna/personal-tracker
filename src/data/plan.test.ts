import { describe, expect, it } from 'vitest';
import { PLAN_EXT, calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, capacidadDelDia, semanasDeTramo, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (v12.1: fechas explícitas, 10 h entre semana y 11 h el fin de semana)', () => {
  it('53 semanas de calendario: del lunes 16 nov 2026 al domingo 21 nov 2027 (T+18 = cierre de la etapa 2 en la v12.1)', () => {
    expect(SEMANAS).toBe(53);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2027-11-21')).toBe(53);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    // La pausa de diciembre (20–26 dic 2027) cae después del cierre de la etapa 2: el cierre no tiene pausas adentro.
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ inicio: '2027-11-16', fin: '2027-11-21' });
    expect(TRAMOS.find((t) => t.id === 'CIE2')!.pausas ?? []).toEqual([]);
    expect(tramoActivo('2029-03-01').id).toBe('CIE2');
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2 (21 nov 2027)', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2027-11-21']]);
  });

  it('6 bimestres: 5 de 9 semanas y el último de 8', () => {
    expect(BIMESTRES).toBe(6);
    const b = Array.from({ length: 6 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 3).map((x) => [x.n, x.inicio, x.fin])).toEqual([[1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23']]);
    expect([b[5].n, b[5].inicio, b[5].fin, b[5].semanas]).toEqual([6, '2027-09-27', '2027-11-21', 8]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('Cert window 3 y AgrIA');
    expect(PLAN.nombresBimestre).toHaveLength(6);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(6);
    expect(PLAN.metasBimestre.programacion[0]).toBe('P0 Constelación, P1V0 PetrIA v0 (archived), P1 PetrIA, Cert window 1, E1, P2 VitalIA, Cert window 2, E2 y W1');
    expect(PLAN.metasBimestre.programacion[1]).toBe('W1, Cert window 3, E3, P3 AgrIA, Cert window 4, E4 y P4 Antena');
  });

  it('el calendario de T+18 son las etapas 1 y 2 sin huecos de días (sin pausas: la de dic 2027 cae en la etapa 3)', () => {
    // 41 bloques: P0, P1V0 (archivado), P1 … CIE2.
    expect(TRAMOS).toHaveLength(41);
    expect(TRAMOS.filter((t) => t.pausa)).toEqual([]);
    // Cada bloque empieza al día siguiente del anterior.
    for (let i = 1; i < TRAMOS.length; i++) expect(TRAMOS[i].inicio).toBe(addDays(TRAMOS[i - 1].fin!, 1));
    expect(TRAMOS[0].inicio).toBe(T0);
    // Las horas de cada bloque son las de la v12.1; los de días fijos sin horas (P0, P1V0, COL, CIE2) dan 0.
    for (const t of TRAMOS) expect(t.horas).toBe(PLAN_EXT.bloques.find((b) => b.id === t.id)!.horas ?? 0);
    const sum = (e: number) => TRAMOS.filter((t) => t.etapa === e && !t.pausa).reduce((a, t) => a + (t.horas ?? 0), 0);
    expect([sum(1), sum(2)]).toEqual([2950.5, 561]);
  });

  it('las fechas coinciden con el calendario del plan extendido (fechas explícitas de la v12.1)', () => {
    const cal = calendario(PLAN_EXT, { horas: { capacidad: capacidadDelDia } }).filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, t.inicio, t.fin])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Consolidación', inicio: '2027-09-10', fin: '2027-09-19' });
    // P0 queda como estaba (16–18 nov); las horas del 19–20 nov van a PetrIA v0 (archivado) y no cuentan.
    expect(TRAMOS.find((t) => t.id === 'P0')).toMatchObject({ inicio: '2026-11-16', fin: '2026-11-18' });
    expect(TRAMOS.find((t) => t.id === 'P1V0')).toMatchObject({ nombre: 'PetrIA v0 (archived)', horas: 0, inicio: '2026-11-19', fin: '2026-11-20' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'PetrIA', industria: 'petróleo', extra: 0, extraPosible: 0, horas: 193.5, inicio: '2026-11-21', fin: '2026-12-09' });
    expect(TRAMOS.find((t) => t.id === 'P1')!.version).toBeUndefined();
    expect(TRAMOS.find((t) => t.id === 'CW1')).toMatchObject({ tipo: 'cert', nombre: 'Cert window 1', horas: 42, inicio: '2026-12-10', fin: '2026-12-13' });
    expect(TRAMOS.find((t) => t.id === 'E1')).toMatchObject({ tipo: 'ingles', horas: 72, inicio: '2026-12-14', fin: '2026-12-20' });
    expect(TRAMOS.find((t) => t.id === 'J5')).toMatchObject({ tipo: 'busqueda', inicio: '2027-04-09', fin: '2027-04-12' });
    expect(TRAMOS.find((t) => t.id === 'P2')).toMatchObject({ nombre: 'VitalIA', horas: 100, inicio: '2026-12-21', fin: '2026-12-30' });
    expect(TRAMOS.find((t) => t.id === 'SUM')).toMatchObject({ tipo: 'sumas', nombre: 'Multiplatform week', horas: 25 });
    expect(TRAMOS.find((t) => t.id === 'P0B')).toMatchObject({ tipo: 'proyecto', nombre: 'Constelación 2.0 + 2.1', horas: 50 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', etapa: 2 });
    // Las certificaciones de la v7 (C1…C8) pasan a las cert windows CW1…CW12.
    expect(TRAMOS.some((t) => /^C\d$/.test(t.id))).toBe(false);
  });

  it('apagar la pausa no cambia T+18 (la única pausa, 20–26 dic 2027, cae en la etapa 3)', () => {
    const fin = () => TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ extra: 0, extraPosible: 0, horas: 193.5 });
      expect(SEMANAS).toBe(53);
      aplicarCalendario([], false);
      expect(TRAMOS.some((t) => t.pausa)).toBe(false);
      expect(fin()).toBe('2027-11-21');
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(53);
  });

  it('cargar el inicio del trabajo no corre el calendario: la v12.1 tiene fechas explícitas y no hay rutina con trabajo', () => {
    try {
      const fin = () => TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2027-03-01' });
      expect(fin()).toBe('2027-11-21');
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2026-12-01' });
      expect(fin()).toBe('2027-11-21');
    } finally {
      aplicarCalendario([]);
    }
  });

  it('matemática: solo las ventanas W1–W4 (los tramos diarios m1–m4 están archivados); fuera de una ventana toca la próxima', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.inicio, x.fin, x.horas]);
    expect(m).toEqual([['W1', '2027-01-15', '2027-02-03', 206], ['W2', '2027-05-30', '2027-06-18', 205], ['W3', '2027-07-19', '2027-08-01', 144], ['W4', '2027-09-20', '2027-09-24', 50]]);
    expect(PLAN.matematica.tramos.find((x) => x.id === 'W4')).toMatchObject({ habilita: 'S1' });
    expect(tramoMatematica('2026-11-21').id).toBe('W1');
    expect(tramoMatematica('2027-01-20').id).toBe('W1');
    expect(tramoMatematica('2027-03-01').id).toBe('W2');
    // Después de la última ventana, queda la última.
    expect(tramoMatematica('2027-12-01').id).toBe('W4');
  });
});

describe('qué toca en cada fecha', () => {
  const caso = (fecha: string) => {
    const t = tramoActivo(fecha);
    const b = bimestreDelPlan(fecha);
    return { semana: semanaDelPlan(fecha), bim: `B${b.n} · semana ${b.semana} de ${b.semanas}`, tramo: `${t.id} ${t.semana}/${t.semanas}` };
  };

  it('16 nov 2026: semana 1, B1, P0 Constelación v1 (3 días); el 19 nov PetrIA v0 (archivado) y el 21 nov arranca PetrIA', () => {
    expect(caso('2026-11-16')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P0 1/1' });
    expect(caso('2026-11-19')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P1V0 1/1' });
    expect(caso('2026-11-21')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P1 1/3' });
    expect(faseTrabajo('2026-11-16').id).toBe('busqueda');
    // El plan de idiomas de 6 años y Handyx quedan archivados/pausados, pero sus datos se conservan.
    expect(faseIngles('2026-11-16')).toMatchObject({ id: 'a1-mwm', nombre: 'Measure What Matters', desde: 1, hasta: 6 });
    expect(corteHandyx('2026-11-16')).toMatchObject({ id: 'lanzar', semana: 1, semanas: 13 });
  });

  it('PetrIA del 21 nov al 9 dic (3 semanas, 193,5 h); el 10 dic arranca la Cert window 1 y el 14 dic English E#1', () => {
    expect(caso('2026-12-09')).toEqual({ semana: 4, bim: 'B1 · semana 4 de 9', tramo: 'P1 3/3' });
    expect(nombreTramo(tramoActivo('2026-12-09'))).toBe('PetrIA · petróleo');
    expect(etapas('2026-12-09')[0]).toMatchObject({ titulo: 'P1 · PetrIA · petróleo' });
    expect(caso('2026-12-10').tramo).toBe('CW1 1/1');
    expect(caso('2026-12-14')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'E1 1/1' });
    expect(ventanaW('2026-12-14').prox?.id).toBe('W1');
  });

  it('el calendario va por días: VitalIA del 21 al 30 dic, después Cert window 2, English E#2 y W1 desde el 15 ene', () => {
    expect(caso('2026-12-21').tramo).toMatch(/^P2 1\//);
    expect(caso('2026-12-30').tramo).toMatch(/^P2 /);
    expect(caso('2026-12-31').tramo).toMatch(/^CW2 /);
    expect(caso('2027-01-08').tramo).toMatch(/^E2 /);
    expect(caso('2027-01-15').tramo).toBe('W1 1/3');
  });

  it('enero y febrero 2027: W1 del 15 ene al 3 feb, Cert window 3 desde el 4 feb y AgrIA desde el 19 feb', () => {
    expect(caso('2027-02-03').tramo).toBe('W1 3/3');
    expect(caso('2027-02-04').tramo).toBe('CW3 1/1');
    expect(caso('2027-02-19').tramo).toMatch(/^P3 1\//);
    expect(ventanaW('2027-01-20').ahora?.id).toBe('W1');
    expect(ventanaW('2027-03-01').ahora).toBeUndefined();
    expect(tramoMatematica('2027-01-20').id).toBe('W1');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, Job search E#7; Handyx (pausado) ya pasó su decisión', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 8', tramo: 'J7 1/1' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('21 nov 2027: cierre de la etapa 2 (semana 53); después de T+18 sigue el cierre', () => {
    expect(caso('2027-11-21')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 8', tramo: 'CIE2 1/1' });
    expect(tramoActivo('2027-12-22').id).toBe('CIE2');
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2027-11-21'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(53);
      expect(tramoActivo(d).id).toBeTruthy();
      const e = etapas(d);
      expect(e).toHaveLength(6);
      for (const x of e) expect(x.avance).toBeGreaterThan(0);
    }
  });

  it('con otro T0, todo se corre junto', () => {
    expect(tramoActivo('2026-12-02', '2026-11-23').id).toBe('P1');
    expect(semanaDelPlan('2026-11-23', '2026-11-23')).toBe(1);
  });
});

describe('entregas y metas de la semana', () => {
  it('las entregas entre ramas salen del plan', () => {
    expect(proximasEntregas('2026-12-14', 4).map((e) => [e.fecha, `${e.de}→${e.a}`, e.texto])).toEqual([
      ['2026-12-30', 'programacion→trabajo', 'VitalIA entra al portfolio con tráiler y landing'],
      ['2027-01-15', 'matematica→programacion', 'Ventana W1 de 3 semanas: la base de AgrIA'],
      ['2027-03-02', 'programacion→trabajo', 'AgrIA entra al portfolio con tráiler y landing'],
      ['2027-04-02', 'programacion→trabajo', 'Antena entra al portfolio con tráiler y landing'],
    ]);
    // Ola 21: el Cambridge C1 entra al CV cuando termina su fase de examen.
    expect(entregasDelPlan().find((e) => e.de === 'ingles')).toMatchObject({ a: 'trabajo', fecha: '2027-10-03' });
    expect(entregasDelPlan().length).toBeGreaterThan(10);
  });

  it('hasta T+2, la semana de búsqueda; después, con trabajo', () => {
    expect(metasSemanaPlan('2026-11-16').find((m) => m.id === 'postulaciones')?.meta).toBe(35);
    expect(metasSemanaPlan('2027-01-11').some((m) => m.id === 'postulaciones')).toBe(false);
  });
});
