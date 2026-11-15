import { describe, expect, it } from 'vitest';
import {
  PLAN, SEMANAS, TRAMOS, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan', () => {
  it('78 semanas desde el lunes 16 nov 2026 hasta el domingo 14 may 2028', () => {
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-05-14')).toBe(78);
    expect(semanaDelPlan('2028-05-15')).toBe(79);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    expect(finSemana(SEMANAS)).toBe('2028-05-14');
  });

  it('los hitos de main caen en sus fechas', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-05-14']]);
  });

  it('9 bimestres de 9 semanas (B9 de 6), con las fechas del plan', () => {
    const b = Array.from({ length: 9 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.map((x) => [x.n, x.inicio, x.fin])).toEqual([
      [1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23'], [4, '2027-05-24', '2027-07-25'], [5, '2027-07-26', '2027-09-26'],
      [6, '2027-09-27', '2027-11-28'], [7, '2027-11-29', '2028-01-30'], [8, '2028-01-31', '2028-04-02'], [9, '2028-04-03', '2028-05-14'],
    ]);
    expect(b[8].semanas).toBe(6);
  });

  it('Ola 8b: el calendario comprimido tiene 19 filas, sin huecos, y suma 53 semanas', () => {
    expect(TRAMOS).toHaveLength(19);
    let s = 1;
    for (const t of TRAMOS) {
      expect(t.desde).toBe(s);
      expect(t.hasta - t.desde + 1).toBe(t.meta);
      if (t.tipo === 'proyecto') expect(t.tope).toBe(t.meta! + 1);
      s = t.hasta + 1;
    }
    expect(s).toBe(54);
    expect(TRAMOS.reduce((a, t) => a + t.meta!, 0)).toBe(53);
  });

  it('las fechas exactas de la tabla del calendario comprimido (5 ter)', () => {
    const f = (id: string) => { const t = TRAMOS.find((x) => x.id === id)!; return [inicioSemana(t.desde), finSemana(t.hasta)]; };
    const tabla: [string, string, string][] = [
      ['P0', '2026-11-16', '2026-11-29'], ['P1', '2026-11-30', '2026-12-20'], ['pausa', '2026-12-21', '2026-12-27'], ['P2', '2026-12-28', '2027-01-17'],
      ['W1', '2027-01-18', '2027-01-31'], ['P3', '2027-02-01', '2027-02-21'], ['C1', '2027-02-22', '2027-03-07'], ['P4', '2027-03-08', '2027-04-04'],
      ['P5', '2027-04-05', '2027-04-18'], ['C2', '2027-04-19', '2027-05-09'], ['W2', '2027-05-10', '2027-05-30'], ['P6', '2027-05-31', '2027-06-27'],
      ['P7', '2027-06-28', '2027-07-11'], ['C3', '2027-07-12', '2027-07-25'], ['W3', '2027-07-26', '2027-08-08'], ['P8', '2027-08-09', '2027-08-22'],
      ['P9', '2027-08-23', '2027-09-12'], ['P10', '2027-09-13', '2027-10-10'], ['colchon', '2027-10-11', '2027-11-21'],
    ];
    expect(tabla.map(([id]) => [id, ...f(id)])).toEqual(tabla);
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

  it('14 dic 2026: semana 5, P1 Faro v1 semana 3 de 3', () => {
    expect(caso('2026-12-14')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'P1 3/3' });
    expect(nombreTramo(tramoActivo('2026-12-14'))).toBe('Faro v1 · petróleo');
    expect(etapas('2026-12-14')[0]).toMatchObject({ titulo: 'P1 · Faro v1 · petróleo', sub: 'Entrega el dom 20 dic · sigue Escudo · medicina', lado: 'sem 3/3' });
    expect(ventanaW('2026-12-14').prox?.id).toBe('W1');
  });

  it('1 feb 2027: semana 12, B2, Surco v1 arranca después de W1', () => {
    expect(caso('2027-02-01')).toEqual({ semana: 12, bim: 'B2 · semana 3 de 9', tramo: 'P3 1/3' });
    expect(ventanaW('2027-01-18').ahora?.id).toBe('W1');
    expect(tramoMatematica('2027-01-18').id).toBe('W1');
    expect(tramoMatematica('2027-02-01').id).toBe('m2');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, la última del colchón y Handyx ya decidido', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'colchon 6/6' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(corteHandyx('2027-11-14')).toMatchObject({ id: 'decidir' });
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('14 may 2028: semana 78, B9 semana 6 de 6, margen y examen C1', () => {
    expect(caso('2028-05-14')).toEqual({ semana: 78, bim: 'B9 · semana 6 de 6', tramo: 'margen 25/25' });
    expect(faseIngles('2028-05-14').id).toBe('c1');
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-05-14'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(78);
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
      ['2026-12-20', 'programacion→trabajo', 'Faro v1 entra al portfolio con tráiler y landing'],
      ['2027-01-11', 'trabajo→ingles', 'Trabajo nuevo: empieza el bloque diario hacia el C1'],
      ['2027-01-17', 'programacion→trabajo', 'Escudo entra al portfolio con tráiler y landing'],
      ['2027-01-18', 'matematica→programacion', 'Ventana W1 de 2 semanas: la base de Surco v1'],
    ]);
    expect(entregasDelPlan().length).toBeGreaterThan(10);
  });

  it('hasta T+2, la semana de búsqueda; después, con trabajo', () => {
    expect(metasSemanaPlan('2026-11-16').find((m) => m.id === 'postulaciones')?.meta).toBe(35);
    expect(metasSemanaPlan('2027-01-11').some((m) => m.id === 'postulaciones')).toBe(false);
  });
});
