import { describe, expect, it } from 'vitest';
import { calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (ola 16b: sale del Plan T+18 extendido)', () => {
  it('92 semanas con las semanas extra de feature: del lunes 16 nov 2026 al domingo 20 ago 2028 (T+18)', () => {
    expect(SEMANAS).toBe(92);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-08-20')).toBe(92);
    expect(semanaDelPlan('2028-08-21')).toBe(93);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    expect(finSemana(SEMANAS)).toBe('2028-08-20');
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-08-20']]);
  });

  it('11 bimestres de 9 semanas (el último de 2): los de siempre más B10 y B11', () => {
    expect(BIMESTRES).toBe(11);
    const b = Array.from({ length: 11 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 8).map((x) => [x.n, x.inicio, x.fin])).toEqual([
      [1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23'], [4, '2027-05-24', '2027-07-25'], [5, '2027-07-26', '2027-09-26'],
      [6, '2027-09-27', '2027-11-28'], [7, '2027-11-29', '2028-01-30'], [8, '2028-01-31', '2028-04-02'],
    ]);
    expect([b[8].inicio, b[8].semanas]).toEqual(['2028-04-03', 9]);
    expect([b[10].n, b[10].fin, b[10].semanas]).toEqual([11, '2028-08-20', 2]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('Escudo y Surco v1');
    expect(PLAN.nombresBimestre).toHaveLength(11);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(11);
    expect(PLAN.metasBimestre.programacion[1]).toBe('P2 Escudo, W1 y P3 Surco v1');
  });

  it('el calendario de T+18 son las etapas 1 y 2: 29 filas sin huecos que suman 92 semanas', () => {
    expect(TRAMOS).toHaveLength(29);
    let s = 1;
    for (const t of TRAMOS) {
      expect(t.desde).toBe(s);
      expect(t.hasta - t.desde + 1).toBe(t.meta);
      if (t.tipo === 'proyecto') expect(t.tope).toBe(t.meta! + 1);
      s = t.hasta + 1;
    }
    expect(s).toBe(93);
    expect(TRAMOS.filter((t) => t.etapa === 1).reduce((a, t) => a + t.meta!, 0)).toBe(64);
    expect(TRAMOS.filter((t) => t.etapa === 2).reduce((a, t) => a + t.meta!, 0)).toBe(28);
  });

  it('las fechas coinciden con el calendario derivado (y los ids nuevos PAU1 y COL conservan su detalle)', () => {
    const cal = calendario().filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, inicioSemana(t.desde), finSemana(t.hasta)])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    expect(TRAMOS.find((t) => t.id === 'PAU1')).toMatchObject({ tipo: 'pausa', nombre: 'Pausa de fin de año', que: 'Descanso y repasos' });
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Colchón' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'Faro', version: 'v1', industria: 'petróleo', extra: 2, extraPosible: 2 });
    expect(TRAMOS.find((t) => t.id === 'C4')).toMatchObject({ tipo: 'cert', corto: 'PNPT', etapa: 2 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', nombre: 'Cierre de T+18' });
  });

  it('apagar el extra de un proyecto recalcula todo: T+18 y los hitos se corren', () => {
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ desde: 3, hasta: 5, extra: 0, extraPosible: 2 });
      expect(SEMANAS).toBe(90);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-08-06');
      aplicarCalendario(TRAMOS.filter((t) => t.tipo === 'proyecto').map((t) => t.id));
      // Sin ningún extra vuelven las 78 semanas: T+18 el 14 may 2028, como el plan original.
      expect(SEMANAS).toBe(78);
      expect(BIMESTRES).toBe(9);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-05-14');
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(92);
  });

  it('matemática: las ventanas salen del calendario y los tramos diarios llenan los huecos', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.desde, x.hasta]);
    expect(m).toEqual([['m1', 1, 12], ['W1', 13, 15], ['m2', 16, 32], ['W2', 33, 36], ['m3', 37, 46], ['W3', 47, 50], ['m4', 51, 64], ['W4', 65, 66], ['m5', 67, 92]]);
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

  it('febrero y marzo 2027: W1 del 8 al 28 de feb y Surco v1 arranca el 1 de marzo', () => {
    expect(caso('2027-02-01')).toEqual({ semana: 12, bim: 'B2 · semana 3 de 9', tramo: 'P2 4/4' });
    expect(ventanaW('2027-02-08').ahora?.id).toBe('W1');
    expect(tramoMatematica('2027-02-08').id).toBe('W1');
    expect(tramoMatematica('2027-03-01').id).toBe('m2');
    expect(caso('2027-03-01').tramo).toBe('P3 1/4');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, P8 y Handyx ya decidido', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'P8 3/3' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(corteHandyx('2027-11-14')).toMatchObject({ id: 'decidir' });
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('14 may 2028: semana 78, B9, la PNPT de la etapa 2 y examen C1', () => {
    expect(caso('2028-05-14')).toEqual({ semana: 78, bim: 'B9 · semana 6 de 9', tramo: 'C4 3/3' });
    expect(faseIngles('2028-05-14').id).toBe('c1');
  });

  it('20 ago 2028: semana 92, el cierre de T+18', () => {
    expect(caso('2028-08-20')).toEqual({ semana: 92, bim: 'B11 · semana 2 de 2', tramo: 'CIE2 1/1' });
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-08-20'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(92);
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
      ['2027-02-07', 'programacion→trabajo', 'Escudo entra al portfolio con tráiler y landing'],
      ['2027-02-08', 'matematica→programacion', 'Ventana W1 de 3 semanas: la base de Surco v1'],
    ]);
    expect(entregasDelPlan().length).toBeGreaterThan(10);
  });

  it('hasta T+2, la semana de búsqueda; después, con trabajo', () => {
    expect(metasSemanaPlan('2026-11-16').find((m) => m.id === 'postulaciones')?.meta).toBe(35);
    expect(metasSemanaPlan('2027-01-11').some((m) => m.id === 'postulaciones')).toBe(false);
  });
});
