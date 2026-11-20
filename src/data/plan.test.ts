import { describe, expect, it } from 'vitest';
import { PLAN_EXT, calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, capacidadDelDia, semanasDeTramo, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (ola 29: roadmap v7, medido en horas, con la pausa de fin de año)', () => {
  it('111 semanas de calendario: del lunes 16 nov 2026 al lunes 27 dic 2028 (T+18, cierre de la etapa 2 con el roadmap v7)', () => {
    expect(SEMANAS).toBe(111);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-12-27')).toBe(111);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    // La pausa de 2028 cae adentro del cierre: el cierre es lo último que termina.
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ fin: '2028-12-27', pausas: [110] });
    expect(tramoActivo('2029-03-01').id).toBe('CIE2');
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2 (a fin de la semana de calendario en que cae)', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-12-31']]);
  });

  it('13 bimestres: 12 de 9 semanas y el último de 3', () => {
    expect(BIMESTRES).toBe(13);
    const b = Array.from({ length: 13 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 3).map((x) => [x.n, x.inicio, x.fin])).toEqual([[1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23']]);
    expect([b[12].n, b[12].inicio, b[12].fin, b[12].semanas]).toEqual([13, '2028-12-11', '2028-12-31', 3]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('VitalIA y AgrIA');
    expect(PLAN.nombresBimestre).toHaveLength(13);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(13);
    expect(PLAN.metasBimestre.programacion[0]).toBe('P0 Constelación, P1 PetrIA, Claude + GitHub Foundations y P2 VitalIA');
    expect(PLAN.metasBimestre.programacion[1]).toBe('P2 VitalIA, sumas, W1 y P3 AgrIA');
  });

  it('el calendario de T+18 son las etapas 1 y 2 sin huecos de días, con las pausas de 2027 y 2028 (2026 no tiene)', () => {
    // 29 bloques de las etapas 1 y 2, PAUSA-2027 (parte AgrIA Sat) y PAUSA-2028 (parte el cierre).
    expect(TRAMOS).toHaveLength(31);
    expect(TRAMOS.filter((t) => t.pausa).map((t) => [t.id, t.inicio])).toEqual([['PAUSA-2027', '2027-12-20'], ['PAUSA-2028', '2028-12-18']]);
    // Cada bloque empieza al día siguiente del anterior (las pausas que parten un bloque quedan adentro).
    const sinPausa = TRAMOS.filter((t) => !t.pausa);
    for (let i = 1; i < sinPausa.length; i++) expect(sinPausa[i].inicio).toBe(addDays(sinPausa[i - 1].fin!, 1));
    expect(sinPausa[0].inicio).toBe(T0);
    // Las horas de cada bloque son las del roadmap v7 ("ahora"); los de días fijos no tienen horas.
    for (const t of sinPausa) expect(t.horas).toBe(PLAN_EXT.bloques.find((b) => b.id === t.id)!.horas ?? 0);
    const sum = (e: number) => TRAMOS.filter((t) => t.etapa === e && !t.pausa).reduce((a, t) => a + (t.horas ?? 0), 0);
    expect([sum(1), sum(2)]).toEqual([2385, 539]);
  });

  it('las fechas coinciden con el calendario por horas (el id COL es la Consolidación de la v7)', () => {
    const cal = calendario(PLAN_EXT, { horas: { capacidad: capacidadDelDia } }).filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, t.inicio, t.fin])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Consolidación', inicio: '2028-07-01', fin: '2028-07-12' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'PetrIA', industria: 'petróleo', extra: 0, extraPosible: 0, meta: 5, horas: 304, inicio: '2026-11-19', fin: '2026-12-26' });
    expect(TRAMOS.find((t) => t.id === 'P1')!.version).toBeUndefined();
    expect(TRAMOS.find((t) => t.id === 'C8')).toMatchObject({ tipo: 'cert', corto: 'Claude + GitHub Foundations', horas: 0, inicio: '2026-12-27', fin: '2027-01-02' });
    expect(TRAMOS.find((t) => t.id === 'P2')).toMatchObject({ nombre: 'VitalIA', meta: 5, horas: 155 });
    expect(TRAMOS.find((t) => t.id === 'SUM')).toMatchObject({ tipo: 'sumas', nombre: 'Semana multiplataforma', horas: 40 });
    expect(TRAMOS.find((t) => t.id === 'P0B')).toMatchObject({ tipo: 'proyecto', nombre: 'Constelación 2.0 y 2.1', horas: 75 });
    expect(TRAMOS.find((t) => t.id === 'C4')).toMatchObject({ tipo: 'cert', corto: 'PNPT', etapa: 2 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', nombre: 'Cierre de etapa' });
    // CKA, CKS y AWS Security Specialty pasan a la etapa 3: no están en T+18.
    expect(TRAMOS.some((t) => ['C5', 'C6', 'C7'].includes(t.id))).toBe(false);
  });

  it('apagar la pausa recalcula todo (la v7 no tiene semanas extra que apagar)', () => {
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ extra: 0, extraPosible: 0, horas: 304 });
      expect(SEMANAS).toBe(111);
      aplicarCalendario([], false);
      expect(TRAMOS.some((t) => t.pausa)).toBe(false);
      expect(TRAMOS.find((t) => t.id === 'CIE2')!.fin! < '2028-12-27').toBe(true);
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(111);
  });

  it('cargar el inicio del trabajo recalcula el calendario con la capacidad de la rutina con trabajo', () => {
    try {
      const fin = () => TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
      const defecto = fin();
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2027-03-01' });
      // Más tarde el trabajo: más días a 8 h, el plan termina antes.
      expect(fin() < defecto).toBe(true);
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2026-12-01' });
      expect(fin() > defecto).toBe(true);
    } finally {
      aplicarCalendario([]);
    }
  });

  it('matemática: las ventanas salen del calendario y los tramos diarios se miden en horas, pausados durante cada ventana', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.inicio, x.fin, x.horas]);
    // m1, m2 y m3 terminan el 11 feb, el 9 jun y el 4 ago 2027, como en el roadmap v7; m4 (504 h), el 26 may 2028 (el roadmap dice ≈ 2 jun).
    expect(m).toEqual([
      ['m1', '2026-11-16', '2027-02-11', 126], ['m2', '2027-02-12', '2027-06-09', 196], ['W1', '2027-02-20', '2027-03-11', 122], ['m3', '2027-06-10', '2027-08-04', 112],
      ['m4', '2027-08-05', '2028-05-26', 504], ['W2', '2027-09-16', '2027-10-09', 147], ['W3', '2028-01-24', '2028-02-12', 122], ['W4', '2028-07-13', '2028-07-20', 49],
    ]);
    expect(PLAN.matematica.tramos.find((x) => x.id === 'W4')).toMatchObject({ habilita: 'S1' });
    // La matemática de un día de ventana es la ventana; fuera de ella, el tramo diario que corre.
    expect(tramoMatematica('2027-03-01').id).toBe('W1');
    expect(tramoMatematica('2027-02-10').id).toBe('m1');
    expect(tramoMatematica('2027-03-15').id).toBe('m2');
  });
});

describe('qué toca en cada fecha', () => {
  const caso = (fecha: string) => {
    const t = tramoActivo(fecha);
    const b = bimestreDelPlan(fecha);
    return { semana: semanaDelPlan(fecha), bim: `B${b.n} · semana ${b.semana} de ${b.semanas}`, tramo: `${t.id} ${t.semana}/${t.semanas}` };
  };

  it('16 nov 2026: semana 1, B1, P0 Constelación v1 (3 días, la arman los agentes)', () => {
    expect(caso('2026-11-16')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P0 1/1' });
    expect(caso('2026-11-19')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P1 1/5' });
    expect(faseTrabajo('2026-11-16').id).toBe('busqueda');
    expect(faseIngles('2026-11-16')).toMatchObject({ id: 'a1-mwm', nombre: 'Measure What Matters', desde: 1, hasta: 6 });
    expect(corteHandyx('2026-11-16')).toMatchObject({ id: 'lanzar', semana: 1, semanas: 13 });
  });

  it('14 dic 2026: P1 PetrIA, semana 4 de 5 (las 304 h repartidas en sus 5 semanas)', () => {
    expect(caso('2026-12-14')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'P1 4/5' });
    expect(nombreTramo(tramoActivo('2026-12-14'))).toBe('PetrIA · petróleo');
    expect(etapas('2026-12-14')[0]).toMatchObject({ titulo: 'P1 · PetrIA · petróleo' });
    expect(ventanaW('2026-12-14').prox?.id).toBe('W1');
  });

  it('el calendario va por días: PetrIA termina el 26 dic, sigue la certificación 1 y VitalIA arranca el 3 ene', () => {
    expect(caso('2026-12-26').tramo).toBe('P1 5/5');
    expect(caso('2026-12-27').tramo).toBe('C8 1/1');
    expect(caso('2027-01-03').tramo).toMatch(/^P2 1\//);
    expect(caso('2027-02-09').tramo).toMatch(/^SUM /);
    expect(caso('2027-02-20').tramo).toMatch(/^W1 /);
  });

  it('febrero y marzo 2027: W1 del 20 feb al 11 mar, AgrIA desde el 12 mar', () => {
    expect(caso('2027-03-11').tramo).toMatch(/^W1 /);
    expect(caso('2027-03-12').tramo).toMatch(/^P3 1\//);
    expect(ventanaW('2027-03-01').ahora?.id).toBe('W1');
    expect(ventanaW('2027-03-20').ahora).toBeUndefined();
    expect(tramoMatematica('2027-03-01').id).toBe('W1');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, P6 AeroScan y Handyx ya decidido', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'P6 6/7' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(corteHandyx('2027-11-14')).toMatchObject({ id: 'decidir' });
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('14 may 2028: semana 78, B9, Antena Ops y francés', () => {
    expect(caso('2028-05-14')).toEqual({ semana: 78, bim: 'B9 · semana 6 de 9', tramo: 'P10 1/7' });
    // Ola 21: en mayo de 2028 es el año 2 (francés), pronunciación aplicada.
    expect(faseIngles('2028-05-14')).toMatchObject({ id: 'a2-aplicada', nombre: 'Francés · Pronunciación aplicada' });
  });

  it('20 y 27 dic 2028: la pausa de fin de año parte el cierre de T+18 (semana 111)', () => {
    expect(caso('2028-12-20')).toEqual({ semana: 110, bim: 'B13 · semana 2 de 3', tramo: 'PAUSA-2028 1/1' });
    expect(caso('2028-12-27')).toEqual({ semana: 111, bim: 'B13 · semana 3 de 3', tramo: 'CIE2 1/1' });
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-12-27'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(111);
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
      ['2026-12-26', 'programacion→trabajo', 'PetrIA entra al portfolio con tráiler y landing'],
      ['2027-02-08', 'programacion→trabajo', 'VitalIA entra al portfolio con tráiler y landing'],
      ['2027-02-20', 'matematica→programacion', 'Ventana W1 de 3 semanas: la base de AgrIA'],
      ['2027-04-24', 'programacion→trabajo', 'AgrIA entra al portfolio con tráiler y landing'],
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
