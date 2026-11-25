import { describe, expect, it } from 'vitest';
import { PLAN_EXT, calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, capacidadDelDia, semanasDeTramo, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (v12.4: fechas explícitas, foco de 8 a 11 h por día según lo que corre de fondo)', () => {
  it('62 semanas de calendario: del lunes 16 nov 2026 al domingo 23 ene 2028 (T+18 = cierre de la etapa 2, el 21 ene 2028, en la v12.4)', () => {
    expect(SEMANAS).toBe(62);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-01-23')).toBe(62);
    expect(semanaDelPlan('2027-11-21')).toBe(53);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    // El cierre de la etapa 2 (19–21 ene 2028) es un absorbedor de 3 días y no tiene pausas adentro: la de dic 2027 cae en el PNPT.
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ inicio: '2028-01-19', fin: '2028-01-21' });
    expect(TRAMOS.find((t) => t.id === 'CIE2')!.pausas ?? []).toEqual([]);
    expect(tramoActivo('2029-03-01').id).toBe('CIE2');
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2 (la semana que termina el 23 ene 2028)', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-01-23']]);
  });

  it('7 bimestres: 6 de 9 semanas y el último de 8', () => {
    expect(BIMESTRES).toBe(7);
    const b = Array.from({ length: 7 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 3).map((x) => [x.n, x.inicio, x.fin])).toEqual([[1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23']]);
    expect([b[5].n, b[5].inicio, b[5].fin, b[5].semanas]).toEqual([6, '2027-09-27', '2027-11-28', 9]);
    expect([b[6].n, b[6].inicio, b[6].fin, b[6].semanas]).toEqual([7, '2027-11-29', '2028-01-23', 8]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('Cert window 2 y Cert window 3');
    expect(PLAN.nombresBimestre).toHaveLength(7);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(7);
    expect(PLAN.metasBimestre.programacion[0]).toBe('P0 Constelación, P1V0 PetrIA v0 (archived), P1 PetrIA, Cert window 1, E1, P2 VitalIA y Cert window 2');
    expect(PLAN.metasBimestre.programacion[1]).toBe('Cert window 2, E2, W1, Cert window 3, E3 y P3 AgrIA');
  });

  it('el calendario de T+18 son las etapas 1 y 2 sin huecos de días (una sola pausa: la del 20–26 dic 2027 parte al PNPT)', () => {
    // 41 bloques (P0, P1V0 archivado, P1 … CIE2) y la pausa de fin de año de 2027, que cae adentro del PNPT.
    expect(TRAMOS).toHaveLength(42);
    expect(TRAMOS.filter((t) => t.pausa).map((t) => [t.id, t.inicio, t.fin])).toEqual([['PAUSA-2027', '2027-12-20', '2027-12-26']]);
    const bloques = TRAMOS.filter((t) => !t.pausa);
    expect(bloques).toHaveLength(41);
    // Cada bloque empieza al día siguiente del anterior.
    for (let i = 1; i < bloques.length; i++) expect(bloques[i].inicio).toBe(addDays(bloques[i - 1].fin!, 1));
    expect(bloques[0].inicio).toBe(T0);
    expect(TRAMOS.find((t) => t.id === 'CW9')).toMatchObject({ inicio: '2027-12-13', fin: '2028-01-13', pausas: [58] });
    // Las horas de cada bloque son las de la v12.4; los de días fijos sin horas (P0, P1V0, COL, CIE2) dan 0.
    for (const t of bloques) expect(t.horas).toBe(PLAN_EXT.bloques.find((b) => b.id === t.id)!.horas ?? 0);
    const sum = (e: number) => TRAMOS.filter((t) => t.etapa === e && !t.pausa).reduce((a, t) => a + (t.horas ?? 0), 0);
    expect([sum(1), sum(2)]).toEqual([2952.5, 561]);
  });

  it('las fechas coinciden con el calendario del plan extendido (fechas explícitas de la v12.4)', () => {
    const cal = calendario(PLAN_EXT, { horas: { capacidad: capacidadDelDia } }).filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, t.inicio, t.fin])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Consolidación', inicio: '2027-11-01', fin: '2027-11-03' });
    // P0 queda como estaba (16–18 nov); las horas del 19–20 nov van a PetrIA v0 (archivado) y no cuentan.
    expect(TRAMOS.find((t) => t.id === 'P0')).toMatchObject({ inicio: '2026-11-16', fin: '2026-11-18' });
    expect(TRAMOS.find((t) => t.id === 'P1V0')).toMatchObject({ nombre: 'PetrIA v0 (archived)', horas: 0, inicio: '2026-11-19', fin: '2026-11-20' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'PetrIA', industria: 'petróleo', extra: 0, extraPosible: 0, horas: 193.5, inicio: '2026-11-21', fin: '2026-12-12' });
    expect(TRAMOS.find((t) => t.id === 'P1')!.version).toBeUndefined();
    expect(TRAMOS.find((t) => t.id === 'CW1')).toMatchObject({ tipo: 'cert', nombre: 'Cert window 1', horas: 42, inicio: '2026-12-13', fin: '2026-12-18' });
    expect(TRAMOS.find((t) => t.id === 'E1')).toMatchObject({ tipo: 'ingles', horas: 72, inicio: '2026-12-19', fin: '2026-12-27' });
    expect(TRAMOS.find((t) => t.id === 'J5')).toMatchObject({ tipo: 'busqueda', inicio: '2027-05-10', fin: '2027-05-15' });
    expect(TRAMOS.find((t) => t.id === 'P2')).toMatchObject({ nombre: 'VitalIA', horas: 102, inicio: '2026-12-28', fin: '2027-01-08' });
    expect(TRAMOS.find((t) => t.id === 'SUM')).toMatchObject({ tipo: 'sumas', nombre: 'Multiplatform week', horas: 25 });
    expect(TRAMOS.find((t) => t.id === 'P0B')).toMatchObject({ tipo: 'proyecto', nombre: 'Constelación 2.0 + 2.1', horas: 50 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', etapa: 2 });
    // Las certificaciones de la v7 (C1…C8) pasan a las cert windows CW1…CW12.
    expect(TRAMOS.some((t) => /^C\d$/.test(t.id))).toBe(false);
  });

  it('apagar la pausa no cambia T+18 (la única pausa, 20–26 dic 2027, parte al PNPT: sus fechas son explícitas)', () => {
    const fin = () => TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ extra: 0, extraPosible: 0, horas: 193.5 });
      expect(SEMANAS).toBe(62);
      aplicarCalendario([], false);
      expect(TRAMOS.some((t) => t.pausa)).toBe(false);
      expect(fin()).toBe('2028-01-21');
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(62);
  });

  it('cargar el inicio del trabajo no corre el calendario: la v12.4 tiene fechas explícitas y no hay rutina con trabajo', () => {
    try {
      const fin = () => TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2027-03-01' });
      expect(fin()).toBe('2028-01-21');
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2026-12-01' });
      expect(fin()).toBe('2028-01-21');
    } finally {
      aplicarCalendario([]);
    }
  });

  it('matemática: solo las ventanas W1–W4 (los tramos diarios m1–m4 están archivados); fuera de una ventana toca la próxima', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.inicio, x.fin, x.horas]);
    expect(m).toEqual([['W1', '2027-01-28', '2027-02-21', 206], ['W2', '2027-07-12', '2027-08-05', 205], ['W3', '2027-09-06', '2027-09-21', 144], ['W4', '2027-11-04', '2027-11-09', 50]]);
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

  it('PetrIA del 21 nov al 12 dic (22 días, 193,5 h); el 13 dic arranca la Cert window 1 y el 19 dic English E#1', () => {
    expect(caso('2026-12-12')).toEqual({ semana: 4, bim: 'B1 · semana 4 de 9', tramo: 'P1 3/3' });
    expect(nombreTramo(tramoActivo('2026-12-12'))).toBe('PetrIA · petróleo');
    expect(etapas('2026-12-12')[0]).toMatchObject({ titulo: 'P1 · PetrIA · petróleo' });
    expect(caso('2026-12-13').tramo).toBe('CW1 1/1');
    expect(caso('2026-12-18').tramo).toBe('CW1 1/1');
    expect(caso('2026-12-19')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'E1 1/1' });
    expect(ventanaW('2026-12-19').prox?.id).toBe('W1');
  });

  it('el calendario va por días: VitalIA del 28 dic al 8 ene, después Cert window 2 (9–18 ene), English E#2 y W1 desde el 28 ene', () => {
    expect(caso('2026-12-28').tramo).toMatch(/^P2 1\//);
    expect(caso('2027-01-08').tramo).toMatch(/^P2 /);
    expect(caso('2027-01-09').tramo).toMatch(/^CW2 /);
    expect(caso('2027-01-19').tramo).toMatch(/^E2 /);
    expect(caso('2027-01-28').tramo).toBe('W1 1/4');
  });

  it('enero a marzo 2027: W1 del 28 ene al 21 feb, Cert window 3 desde el 22 feb y AgrIA desde el 13 mar', () => {
    expect(caso('2027-02-21').tramo).toBe('W1 4/4');
    expect(caso('2027-02-22').tramo).toBe('CW3 1/1');
    expect(caso('2027-03-13').tramo).toMatch(/^P3 1\//);
    expect(ventanaW('2027-02-01').ahora?.id).toBe('W1');
    expect(ventanaW('2027-03-01').ahora).toBeUndefined();
    expect(tramoMatematica('2027-02-01').id).toBe('W1');
    // Antes de la ventana, la matemática toca la próxima.
    expect(tramoMatematica('2027-01-20').id).toBe('W1');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6 y Bóveda (S1); Handyx (pausado) ya pasó su decisión', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'S1 1/1' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('21 ene 2028: cierre de la etapa 2 (semana 62); la pausa del 20–26 dic 2027 gana adentro del PNPT; después de T+18 sigue el cierre', () => {
    expect(caso('2028-01-21')).toEqual({ semana: 62, bim: 'B7 · semana 8 de 8', tramo: 'CIE2 1/1' });
    expect(caso('2027-11-21').tramo).toBe('S2 1/2');
    expect(tramoActivo('2027-12-22').id).toBe('PAUSA-2027');
    expect(tramoActivo('2027-12-30').id).toBe('CW9');
    expect(tramoActivo('2029-03-01').id).toBe('CIE2');
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-01-21'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(62);
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
      ['2027-01-08', 'programacion→trabajo', 'VitalIA entra al portfolio con tráiler y landing'],
      ['2027-01-28', 'matematica→programacion', 'Ventana W1 de 4 semanas: la base de AgrIA'],
      ['2027-03-25', 'programacion→trabajo', 'AgrIA entra al portfolio con tráiler y landing'],
      ['2027-05-01', 'programacion→trabajo', 'Antena entra al portfolio con tráiler y landing'],
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
