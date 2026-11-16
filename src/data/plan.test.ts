import { describe, expect, it } from 'vitest';
import { calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (ola 16b: sale del Plan T+18 extendido)', () => {
  it('90 semanas con las semanas extra de feature y sin pausas: del lunes 16 nov 2026 al domingo 6 ago 2028 (T+18)', () => {
    expect(SEMANAS).toBe(90);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-08-06')).toBe(90);
    expect(semanaDelPlan('2028-08-07')).toBe(91);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    expect(finSemana(SEMANAS)).toBe('2028-08-06');
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-08-06']]);
  });

  it('10 bimestres de 9 semanas: los de siempre más B10', () => {
    expect(BIMESTRES).toBe(10);
    const b = Array.from({ length: 10 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 8).map((x) => [x.n, x.inicio, x.fin])).toEqual([
      [1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23'], [4, '2027-05-24', '2027-07-25'], [5, '2027-07-26', '2027-09-26'],
      [6, '2027-09-27', '2027-11-28'], [7, '2027-11-29', '2028-01-30'], [8, '2028-01-31', '2028-04-02'],
    ]);
    expect([b[8].inicio, b[8].semanas]).toEqual(['2028-04-03', 9]);
    expect([b[9].n, b[9].inicio, b[9].fin, b[9].semanas]).toEqual([10, '2028-06-05', '2028-08-06', 9]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('Escudo y Surco v1');
    expect(PLAN.nombresBimestre).toHaveLength(10);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(10);
    expect(PLAN.metasBimestre.programacion[1]).toBe('P2 Escudo, W1 y P3 Surco v1');
  });

  it('el calendario de T+18 son las etapas 1 y 2: 27 filas sin huecos que suman 90 semanas', () => {
    expect(TRAMOS).toHaveLength(27);
    let s = 1;
    for (const t of TRAMOS) {
      expect(t.desde).toBe(s);
      expect(t.hasta - t.desde + 1).toBe(t.meta);
      if (t.tipo === 'proyecto') expect(t.tope).toBe(t.meta! + 1);
      s = t.hasta + 1;
    }
    expect(s).toBe(91);
    expect(TRAMOS.filter((t) => t.etapa === 1).reduce((a, t) => a + t.meta!, 0)).toBe(63);
    expect(TRAMOS.filter((t) => t.etapa === 2).reduce((a, t) => a + t.meta!, 0)).toBe(27);
  });

  it('las fechas coinciden con el calendario derivado (sin pausas; el id nuevo COL conserva su detalle)', () => {
    const cal = calendario().filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, inicioSemana(t.desde), finSemana(t.hasta)])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    // Las pausas no existen: ni en el calendario ni como tipo de tramo.
    expect(TRAMOS.filter((t) => t.id.startsWith('PAU') || (t.tipo as string) === 'pausa')).toEqual([]);
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Colchón' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'Faro', version: 'v1', industria: 'petróleo', extra: 2, extraPosible: 2 });
    expect(TRAMOS.find((t) => t.id === 'C4')).toMatchObject({ tipo: 'cert', corto: 'PNPT', etapa: 2 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', nombre: 'Cierre de T+18' });
  });

  it('apagar el extra de un proyecto recalcula todo: T+18 y los hitos se corren', () => {
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ desde: 3, hasta: 5, extra: 0, extraPosible: 2 });
      expect(SEMANAS).toBe(88);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-07-23');
      aplicarCalendario(TRAMOS.filter((t) => t.tipo === 'proyecto').map((t) => t.id));
      // Sin ningún extra quedan las 76 semanas base (52 + 24): T+18 el 30 abr 2028.
      expect(SEMANAS).toBe(76);
      expect(BIMESTRES).toBe(9);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-04-30');
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(90);
  });

  it('matemática: las ventanas salen del calendario y los tramos diarios llenan los huecos', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.desde, x.hasta]);
    expect(m).toEqual([['m1', 1, 11], ['W1', 12, 14], ['m2', 15, 31], ['W2', 32, 35], ['m3', 36, 45], ['W3', 46, 49], ['m4', 50, 63], ['W4', 64, 65], ['m5', 66, 90]]);
    expect(PLAN.matematica.tramos.find((x) => x.id === 'W4')).toMatchObject({ habilita: 'S1' });
  });
});

describe('qué toca en cada fecha', () => {
  const caso = (fecha: string) => {
    const t = tramoActivo(fecha);
    const b = bimestreDelPlan(fecha);
    return { semana: semanaDelPlan(fecha), bim: `B${b.n} · semana ${b.semana} de ${b.semanas}`, tramo: `${t.id} ${t.semana}/${t.semanas}` };
  };

  it('16 nov 2026: semana 1, B1, P0 consolidación', () => {
    expect(caso('2026-11-16')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P0 1/2' });
    expect(faseTrabajo('2026-11-16').id).toBe('busqueda');
    expect(faseIngles('2026-11-16').id).toBe('entrevista');
    expect(corteHandyx('2026-11-16')).toMatchObject({ id: 'lanzar', semana: 1, semanas: 13 });
  });

  it('14 dic 2026: semana 5, P1 Faro v1 semana 3 de 5 (3 + 2 de feature)', () => {
    expect(caso('2026-12-14')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'P1 3/5' });
    expect(nombreTramo(tramoActivo('2026-12-14'))).toBe('Faro v1 · petróleo');
    expect(etapas('2026-12-14')[0]).toMatchObject({ titulo: 'P1 · Faro v1 · petróleo', sub: 'Entrega el dom 3 ene · sigue Escudo · medicina', lado: 'sem 3/5' });
    expect(ventanaW('2026-12-14').prox?.id).toBe('W1');
  });

  it('febrero 2027, sin pausa de fin de año: Escudo termina el 31 de enero, W1 va del 1 al 21 de feb y Surco v1 arranca el 22', () => {
    expect(caso('2027-01-31').tramo).toBe('P2 4/4');
    expect(caso('2027-02-01')).toEqual({ semana: 12, bim: 'B2 · semana 3 de 9', tramo: 'W1 1/3' });
    expect(ventanaW('2027-02-08').ahora?.id).toBe('W1');
    expect(tramoMatematica('2027-02-08').id).toBe('W1');
    expect(tramoMatematica('2027-02-22').id).toBe('m2');
    expect(caso('2027-02-22').tramo).toBe('P3 1/4');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, P9 y Handyx ya decidido', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'P9 1/4' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(corteHandyx('2027-11-14')).toMatchObject({ id: 'decidir' });
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('14 may 2028: semana 78, B9, la CKA de la etapa 2 y examen C1', () => {
    expect(caso('2028-05-14')).toEqual({ semana: 78, bim: 'B9 · semana 6 de 9', tramo: 'C5 2/2' });
    expect(faseIngles('2028-05-14').id).toBe('c1');
  });

  it('6 ago 2028: semana 90, el cierre de T+18', () => {
    expect(caso('2028-08-06')).toEqual({ semana: 90, bim: 'B10 · semana 9 de 9', tramo: 'CIE2 1/1' });
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-08-06'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(90);
      expect(tramoActivo(d).id).toBeTruthy();
      const e = etapas(d);
      expect(e).toHaveLength(6);
      for (const x of e) expect(x.avance).toBeGreaterThan(0);
    }
  });

  it('con otro T0, todo se corre junto', () => {
    expect(tramoActivo('2026-12-21', '2026-11-23').id).toBe('P1');
    expect(semanaDelPlan('2026-11-23', '2026-11-23')).toBe(1);
  });
});

describe('entregas y metas de la semana', () => {
  it('las entregas entre ramas salen del plan', () => {
    expect(proximasEntregas('2026-12-14', 4).map((e) => [e.fecha, `${e.de}→${e.a}`, e.texto])).toEqual([
      ['2027-01-03', 'programacion→trabajo', 'Faro v1 entra al portfolio con tráiler y landing'],
      ['2027-01-11', 'trabajo→ingles', 'Trabajo nuevo: empieza el bloque diario hacia el C1'],
      ['2027-01-31', 'programacion→trabajo', 'Escudo entra al portfolio con tráiler y landing'],
      ['2027-02-01', 'matematica→programacion', 'Ventana W1 de 3 semanas: la base de Surco v1'],
    ]);
    expect(entregasDelPlan().length).toBeGreaterThan(10);
  });

  it('hasta T+2, la semana de búsqueda; después, con trabajo', () => {
    expect(metasSemanaPlan('2026-11-16').find((m) => m.id === 'postulaciones')?.meta).toBe(35);
    expect(metasSemanaPlan('2027-01-11').some((m) => m.id === 'postulaciones')).toBe(false);
  });
});
