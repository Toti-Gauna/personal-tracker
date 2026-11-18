import { describe, expect, it } from 'vitest';
import { PLAN_EXT, calendario } from './plan-extendido';
import {
  BIMESTRES, PLAN, SEMANAS, TRAMOS, aplicarCalendario, capacidadDelDia, semanasDeTramo, bimestreDelPlan, corteHandyx, entregasDelPlan, etapas, faseIngles, faseTrabajo, fechaHito, finSemana, inicioSemana, metasSemanaPlan, nombreTramo,
  proximasEntregas, semanaDelPlan, tramoActivo, tramoMatematica, ventanaW,
} from './plan';
import { addDays } from './time';

const T0 = '2026-11-16';

describe('el calendario del plan (ola 27: v3, medido en horas, con las capas y la pausa de fin de año)', () => {
  it('89 semanas de calendario: del lunes 16 nov 2026 al sábado 25 jul 2028 (T+18, cierre de la etapa 2)', () => {
    expect(SEMANAS).toBe(89);
    expect(semanaDelPlan(T0)).toBe(1);
    expect(semanaDelPlan('2028-07-25')).toBe(89);
    expect(semanaDelPlan('2028-07-31')).toBe(90);
    expect(semanaDelPlan('2026-11-15')).toBe(0);
    expect(TRAMOS[TRAMOS.length - 1]).toMatchObject({ id: 'CIE2', fin: '2028-07-25' });
  });

  it('los hitos de main caen en sus fechas; T+18 es el cierre de la etapa 2 (a fin de la semana de calendario en que cae)', () => {
    expect(PLAN.hitos.map((h) => [h.id, fechaHito(h)])).toEqual([['T+0', '2026-11-16'], ['T+2', '2027-01-11'], ['T+12', '2027-11-15'], ['T+18', '2028-07-30']]);
  });

  it('10 bimestres: 9 de 9 semanas y el último de 8', () => {
    expect(BIMESTRES).toBe(10);
    const b = Array.from({ length: 10 }, (_, i) => bimestreDelPlan(inicioSemana(i * 9 + 1)));
    expect(b.slice(0, 3).map((x) => [x.n, x.inicio, x.fin])).toEqual([[1, '2026-11-16', '2027-01-17'], [2, '2027-01-18', '2027-03-21'], [3, '2027-03-22', '2027-05-23']]);
    expect([b[9].n, b[9].inicio, b[9].fin, b[9].semanas]).toEqual([10, '2028-06-05', '2028-07-30', 8]);
    // B1 conserva su nombre; los demás salen de lo que hay de programación en cada uno.
    expect(PLAN.nombresBimestre[0]).toBe('El despegue');
    expect(PLAN.nombresBimestre[1]).toBe('Surco v1 y AWS SAA');
    expect(PLAN.nombresBimestre).toHaveLength(10);
    for (const r of Object.keys(PLAN.metasBimestre) as (keyof typeof PLAN.metasBimestre)[]) expect(PLAN.metasBimestre[r]).toHaveLength(10);
    expect(PLAN.metasBimestre.programacion[1]).toBe('W1, P3 Surco v1, AWS SAA y P4 Estación v1');
  });

  it('el calendario de T+18 son las etapas 1 y 2 sin huecos de días, con las 2 pausas', () => {
    // 27 bloques de las etapas 1 y 2, la Semana de sumas, PAUSA-2026 (parte P2) y PAUSA-2027 (parte P10).
    expect(TRAMOS).toHaveLength(30);
    expect(TRAMOS.filter((t) => t.pausa).map((t) => [t.id, t.inicio])).toEqual([['PAUSA-2026', '2026-12-21'], ['PAUSA-2027', '2027-12-20']]);
    // Cada bloque empieza al día siguiente del anterior (las pausas que parten un bloque quedan adentro).
    const sinPausa = TRAMOS.filter((t) => !t.pausa);
    for (let i = 1; i < sinPausa.length; i++) expect(sinPausa[i].inicio).toBe(addDays(sinPausa[i - 1].fin!, 1));
    expect(sinPausa[0].inicio).toBe(T0);
    // Las horas de cada bloque son sus semanas del plan × 24,5.
    for (const t of sinPausa) if (t.tipo !== 'descanso') expect(t.horas).toBe(Math.floor(t.meta! * 24.5 + 1e-9));
    const sum = (e: number) => TRAMOS.filter((t) => t.etapa === e && !t.pausa).reduce((a, t) => a + t.meta!, 0);
    expect([sum(1), sum(2)]).toEqual([77, 29]);
  });

  it('las fechas coinciden con el calendario por horas (el id nuevo COL conserva su detalle)', () => {
    const cal = calendario(PLAN_EXT, { horas: { capacidad: capacidadDelDia } }).filter((b) => b.etapa <= 2);
    expect(TRAMOS.map((t) => [t.id, t.inicio, t.fin])).toEqual(cal.map((b) => [b.id, b.inicio, b.fin]));
    expect(TRAMOS.find((t) => t.id === 'COL')).toMatchObject({ tipo: 'colchon', nombre: 'Colchón' });
    expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ nombre: 'Faro', version: 'v1', industria: 'petróleo', extra: 2, extraPosible: 2, plataforma: 0, plataformaPosible: 0, meta: 5, horas: 122 });
    expect(TRAMOS.find((t) => t.id === 'P2')).toMatchObject({ pausas: [6], meta: 4, horas: 98 });
    expect(TRAMOS.find((t) => t.id === 'SUM')).toMatchObject({ tipo: 'sumas', nombre: 'Semana de sumas', meta: 2, horas: 49 });
    expect(TRAMOS.find((t) => t.id === 'P10')).toMatchObject({ arquitectura: 2, arquitecturaPosible: 2, meta: 7 });
    expect(TRAMOS.find((t) => t.id === 'C4')).toMatchObject({ tipo: 'cert', corto: 'PNPT', etapa: 2 });
    expect(TRAMOS.find((t) => t.id === 'CIE2')).toMatchObject({ tipo: 'cierre', nombre: 'Cierre de T+18' });
  });

  it('apagar extras o la pausa recalcula todo: T+18 y los hitos se corren', () => {
    try {
      aplicarCalendario(['P1']);
      expect(TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ extra: 0, extraPosible: 2, meta: 3, horas: 73 });
      const fin = (id: string) => TRAMOS.find((t) => t.id === id)!.fin!;
      expect(fin('P1') < '2026-12-09').toBe(true);
      const sinP1 = SEMANAS;
      expect(sinP1).toBeLessThan(89);
      // Sin pausas, ni plataforma, ni arquitectura, ni extras: solo las semanas base.
      const capas = TRAMOS.filter((t) => t.tipo === 'proyecto').flatMap((t) => [`${t.id}:plataforma`, `${t.id}:arquitectura`]);
      aplicarCalendario(capas, false);
      expect(SEMANAS).toBeLessThan(sinP1 + 1);
      const sinCapas = SEMANAS;
      aplicarCalendario([...capas, ...TRAMOS.filter((t) => t.tipo === 'proyecto').map((t) => t.id)], false);
      expect(SEMANAS).toBeLessThan(sinCapas);
      expect(TRAMOS.some((t) => t.pausa)).toBe(false);
    } finally {
      aplicarCalendario([]);
    }
    expect(SEMANAS).toBe(89);
  });

  it('cargar el inicio del trabajo recalcula el calendario con la capacidad de la rutina con trabajo', () => {
    try {
      const fin = () => TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
      const defecto = fin();
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2027-03-01' });
      // Más tarde el trabajo: más semanas con 53 h, el plan termina antes.
      expect(fin() < defecto).toBe(true);
      aplicarCalendario([], true, { t0: T0, inicioTrabajo: '2026-12-01' });
      expect(fin() > defecto).toBe(true);
    } finally {
      aplicarCalendario([]);
    }
  });

  it('matemática: las ventanas salen del calendario y los tramos diarios se miden en horas, pausados durante cada ventana', () => {
    const m = PLAN.matematica.tramos.map((x) => [x.id, x.inicio, x.fin, x.horas]);
    expect(m).toEqual([
      ['m1', '2026-11-16', '2027-03-10', 126], ['W1', '2027-01-06', '2027-01-31', 122], ['m2', '2027-03-11', '2027-07-22', 196], ['W2', '2027-06-01', '2027-07-06', 147],
      ['m3', '2027-07-23', '2027-09-16', 112], ['m4', '2027-09-17', '2028-07-25', 560], ['W3', '2027-09-18', '2027-10-16', 122], ['W4', '2028-02-01', '2028-02-13', 49],
    ]);
    expect(PLAN.matematica.tramos.find((x) => x.id === 'W4')).toMatchObject({ habilita: 'S1' });
    // La matemática de un día de ventana es la ventana; fuera de ella, el tramo diario que corre.
    expect(tramoMatematica('2027-01-20').id).toBe('W1');
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

  it('16 nov 2026: semana 1, B1, P0 consolidación (una semana)', () => {
    expect(caso('2026-11-16')).toEqual({ semana: 1, bim: 'B1 · semana 1 de 9', tramo: 'P0 1/1' });
    expect(faseTrabajo('2026-11-16').id).toBe('busqueda');
    expect(faseIngles('2026-11-16')).toMatchObject({ id: 'a1-mwm', nombre: 'Measure What Matters', desde: 1, hasta: 6 });
    expect(corteHandyx('2026-11-16')).toMatchObject({ id: 'lanzar', semana: 1, semanas: 13 });
  });

  it('14 dic 2026: P2 Escudo, semana 2 de 4 (cada semana son 24,5 h del plan, no 7 días)', () => {
    expect(caso('2026-12-14')).toEqual({ semana: 5, bim: 'B1 · semana 5 de 9', tramo: 'P2 2/4' });
    expect(nombreTramo(tramoActivo('2026-12-14'))).toBe('Escudo · medicina');
    expect(etapas('2026-12-14')[0]).toMatchObject({ titulo: 'P2 · Escudo · medicina' });
    expect(ventanaW('2026-12-14').prox?.id).toBe('W1');
  });

  it('el calendario va por días: P1 termina el 9 dic, P2 sigue hasta el 29 y la pausa de Navidad lo parte', () => {
    expect(caso('2026-12-09').tramo).toMatch(/^P1 /);
    expect(caso('2026-12-10').tramo).toMatch(/^P2 /);
    expect(caso('2026-12-22')).toEqual({ semana: 6, bim: 'B1 · semana 6 de 9', tramo: 'PAUSA-2026 1/1' });
    expect(caso('2026-12-30').tramo).toMatch(/^SUM /);
    expect(caso('2027-01-06').tramo).toMatch(/^W1 /);
  });

  it('febrero y marzo 2027: W1 termina el 31 de enero, Surco v1 va del 1 de febrero al 2 de marzo', () => {
    expect(caso('2027-01-31').tramo).toMatch(/^W1 /);
    expect(caso('2027-02-01').tramo).toMatch(/^P3 1\//);
    expect(ventanaW('2027-01-20').ahora?.id).toBe('W1');
    expect(ventanaW('2027-03-01').ahora).toBeUndefined();
    expect(tramoMatematica('2027-01-20').id).toBe('W1');
    expect(faseTrabajo('2027-02-01').id).toBe('trabajo-nuevo');
  });

  it('15 nov 2027: semana 53 (T+12), B6, P9 Lupa v2 y Handyx ya decidido', () => {
    expect(caso('2027-11-15')).toEqual({ semana: 53, bim: 'B6 · semana 8 de 9', tramo: 'P9 3/5' });
    expect(corteHandyx('2027-11-15')).toBeNull();
    expect(corteHandyx('2027-11-14')).toMatchObject({ id: 'decidir' });
    expect(etapas('2027-11-15')[4].titulo).toBe('Según la decisión');
  });

  it('14 may 2028: semana 78, B9, PNPT y francés', () => {
    expect(caso('2028-05-14')).toEqual({ semana: 78, bim: 'B9 · semana 6 de 9', tramo: 'C6 1/3' });
    // Ola 21: en mayo de 2028 es el año 2 (francés), pronunciación aplicada.
    expect(faseIngles('2028-05-14')).toMatchObject({ id: 'a2-aplicada', nombre: 'Francés · Pronunciación aplicada' });
  });

  it('25 jul 2028: semana 89, el cierre de T+18', () => {
    expect(caso('2028-07-25')).toEqual({ semana: 89, bim: 'B10 · semana 8 de 8', tramo: 'CIE2 1/1' });
  });

  it('para cada día del plan hay semana, bimestre, tramo y etapa de cada rama', () => {
    for (let d = T0; d <= '2028-07-25'; d = addDays(d, 1)) {
      const s = semanaDelPlan(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(89);
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
      ['2026-12-29', 'programacion→trabajo', 'Escudo entra al portfolio con tráiler y landing'],
      ['2027-01-06', 'matematica→programacion', 'Ventana W1 de 4 semanas: la base de Surco v1'],
      ['2027-03-02', 'programacion→trabajo', 'Surco v1 entra al portfolio con tráiler y landing'],
      ['2027-04-19', 'programacion→trabajo', 'Estación v1 entra al portfolio con tráiler y landing'],
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
