import { describe, expect, it } from 'vitest';
import { calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, semanasDeTramo, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (ola 24: plan T+18 v2, con las capas y la pausa de fin de año)', () => {
  it('104 semanas con feature, plataforma, arquitectura y 2 pausas: del lunes 16 nov 2026 al domingo 12 nov 2028 (T+18)', () => {
    expect(SEMANAS).toBe(104);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-11-12')).toBe(104);
    expect(semanaDelPlan('2028-11-13')).toBe(105);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    expect(finSemana(SEMANAS)).toBe('2028-11-12');
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-11-12']]);
  });

  it('12 bimestres: 11 de 9 semanas y el último de 5', () => {
    expect(BIMESTRES).toBe(12);
    const b = Array.from({ length: 12 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 3).map((x) => [x.n, x.inicio, x.fin])).toEqual([[1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23']]);
    expect([b[11].n, b[11].inicio, b[11].fin, b[11].semanas]).toEqual([12, '2028-10-09', '2028-11-12', 5]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('Escudo y Surco v1');
    expect(PLAN.nombresBimestre).toHaveLength(12);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(12);
    expect(PLAN.metasBimestre.programacion[1]).toBe('P2 Escudo, W1 y P3 Surco v1');
  });

  it('el calendario de T+18 son las etapas 1 y 2 sin huecos: 104 semanas con las 2 pausas', () => {
    // 27 bloques más PAUSA-2026 (parte P1) y PAUSA-2027 (entre W3 y P8).
    expect(TRAMOS).toHaveLength(29);
    expect(TRAMOS.filter((t) => t.pausa).map((t) => [t.id, t.desde])).toEqual([['PAUSA-2026', 6], ['PAUSA-2027', 58]]);
    let s = 1;
    for (const t of TRAMOS.filter((x) => !x.pausa || !TRAMOS.some((y) => y.pausas?.includes(x.desde)))) {
      expect(t.desde).toBe(s);
      expect(semanasDeTramo(t)).toBe(t.meta);
      if (t.tipo === 'proyecto') expect(t.tope).toBe(t.meta! + 1);
      s = t.hasta + 1;
    }
    expect(s).toBe(105);
    const sum = (e: number) => TRAMOS.filter((t) => t.etapa === e).reduce((a, t) => a + t.meta!, 0);
    expect([sum(1), sum(2)]).toEqual([75, 29]); // 73 + 2 pausas y 29
  });

  it('las fechas coinciden con el calendario derivado (el id nuevo COL conserva su detalle)', () => {
    const cal = calendario().filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, inicioSemana(t.desde), finSemana(t.hasta)])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Colchón' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'Faro', version: 'v1', industria: 'petróleo', extra: 2, extraPosible: 2, plataforma: 1, pausas: [6], meta: 6 });
    expect(TRAMOS.find((t) => t.id === 'P10')).toMatchObject({ arquitectura: 2, arquitecturaPosible: 2, meta: 7 });
    expect(TRAMOS.find((t) => t.id === 'C4')).toMatchObject({ tipo: 'cert', corto: 'PNPT', etapa: 2 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', nombre: 'Cierre de T+18' });
  });

  it('apagar extras o la pausa recalcula todo: T+18 y los hitos se corren', () => {
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ desde: 3, hasta: 7, extra: 0, extraPosible: 2, meta: 4 });
      expect(SEMANAS).toBe(102);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-10-29');
      // Con la pausa apagada y sin plataforma ni arquitectura, el calendario de la ola 18 (90 semanas).
      const capas = TRAMOS.filter((t) => t.tipo === 'proyecto').flatMap((t) => [`${t.id}:plataforma`, `${t.id}:arquitectura`]);
      aplicarCalendario(capas, false);
      expect(SEMANAS).toBe(90);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-08-06');
      // Sin ningún extra quedan las 76 semanas base (52 + 24): T+18 el 30 abr 2028.
      aplicarCalendario([...capas, ...TRAMOS.filter((t) => t.tipo === 'proyecto').map((t) => t.id)], false);
      expect(SEMANAS).toBe(76);
      expect(BIMESTRES).toBe(9);
      expect(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!)).toBe('2028-04-30');
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(104);
  });

  it('matemática: las ventanas salen del calendario y los tramos diarios llenan los huecos', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.desde, x.hasta]);
    expect(m).toEqual([['m1', 1, 14], ['W1', 15, 17], ['m2', 18, 37], ['W2', 38, 41], ['m3', 42, 53], ['W3', 54, 57], ['m4', 58, 75], ['W4', 76, 77], ['m5', 78, 104]]);
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
    expect(faseIngles('2026-11-16')).toMatchObject({ id: 'a1-mwm', nombre: 'Measure What Matters', desde: 1, hasta: 6 });
    expect(corteHandyx('2026-11-16')).toMatchObject({ id: 'lanzar', semana: 1, semanas: 13 });
  });

  it('14 dic 2026: semana 5, P1 Faro v1 semana 3 de 6 (3 + 2 de feature + 1 de plataforma)', () => {
    expect(caso('2026-12-14')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'P1 3/6' });
    expect(nombreTramo(tramoActivo('2026-12-14'))).toBe('Faro v1 · petróleo');
    expect(etapas('2026-12-14')[0]).toMatchObject({ titulo: 'P1 · Faro v1 · petróleo', sub: 'Entrega el dom 17 ene · sigue Escudo · medicina', lado: 'sem 3/6' });
    expect(ventanaW('2026-12-14').prox?.id).toBe('W1');
  });

  it('la pausa de fin de año parte P1: la semana del 21 dic es pausa y Faro v1 sigue hasta el 17 ene', () => {
    expect(caso('2026-12-22')).toEqual({ semana: 6, bim: 'B1 · semana 6 de 9', tramo: 'PAUSA-2026 1/1' });
    expect(caso('2027-01-11').tramo).toBe('P1 6/6');
    expect(caso('2027-01-18').tramo).toBe('P2 1/5');
  });

  it('febrero y marzo 2027: Escudo termina el 21 de febrero, W1 va del 22 de feb al 14 de mar y Surco v1 arranca el 15', () => {
    expect(caso('2027-02-21').tramo).toBe('P2 5/5');
    expect(caso('2027-02-22')).toEqual({ semana: 15, bim: 'B2 · semana 6 de 9', tramo: 'W1 1/3' });
    expect(ventanaW('2027-03-01').ahora?.id).toBe('W1');
    expect(tramoMatematica('2027-03-01').id).toBe('W1');
    expect(tramoMatematica('2027-03-15').id).toBe('m2');
    expect(caso('2027-03-15').tramo).toBe('P3 1/5');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, la AWS MLA y Handyx ya decidido', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'C3 2/2' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(corteHandyx('2027-11-14')).toMatchObject({ id: 'decidir' });
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('14 may 2028: semana 78, B9, Cripta (S1) y francés', () => {
    expect(caso('2028-05-14')).toEqual({ semana: 78, bim: 'B9 · semana 6 de 9', tramo: 'S1 1/4' });
    // Ola 21: en mayo de 2028 es el año 2 (francés), pronunciación aplicada.
    expect(faseIngles('2028-05-14')).toMatchObject({ id: 'a2-aplicada', nombre: 'Francés · Pronunciación aplicada' });
  });

  it('12 nov 2028: semana 104, el cierre de T+18', () => {
    expect(caso('2028-11-12')).toEqual({ semana: 104, bim: 'B12 · semana 5 de 5', tramo: 'CIE2 1/1' });
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-11-12'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(104);
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
      ['2027-01-17', 'programacion→trabajo', 'Faro v1 entra al portfolio con tráiler y landing'],
      ['2027-02-21', 'programacion→trabajo', 'Escudo entra al portfolio con tráiler y landing'],
      ['2027-02-22', 'matematica→programacion', 'Ventana W1 de 3 semanas: la base de Surco v1'],
      ['2027-04-18', 'programacion→trabajo', 'Surco v1 entra al portfolio con tráiler y landing'],
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
