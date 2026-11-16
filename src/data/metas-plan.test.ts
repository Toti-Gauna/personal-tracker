import { describe, expect, it } from 'vitest';
import { avanceMeta, capitulosPlaneados, cierraEnMes, filasAnio, filasBimestre, metasMesGeneradas, metasSemanaGeneradas, semanasDelBimestre, type CtxPlan } from './metas-plan';
import { PLAN } from './plan';
import { emptyPlan } from './plan-state';
import { emptyStudy } from './study-catalog';
import { emptyTrain } from './train-catalog';

const T0 = '2026-11-16';
const ctx = (over: Partial<CtxPlan> = {}): CtxPlan => ({ plan: emptyPlan(), days: {}, study: emptyStudy(), train: emptyTrain(), t0: T0, ...over });

describe('metas generadas desde el plan', () => {
  it('la semana sigue la fase: búsqueda hasta T+2 y con trabajo después', () => {
    const s5 = metasSemanaGeneradas('2026-12-14', T0);
    expect(s5.find((m) => m.clave === 'postulaciones')?.meta).toBe(35);
    expect(s5.find((m) => m.clave === 'casillas:P1')?.meta).toBe(6);
    const s20 = metasSemanaGeneradas('2027-04-01', T0);
    expect(s20.find((m) => m.clave === 'postulaciones')).toBeUndefined();
    expect(s20.find((m) => m.clave === 'horas-ingles')?.meta).toBe(5.25);
    expect(metasSemanaGeneradas('2026-11-10', T0)).toEqual([]);
  });

  it('la semana 1 trae las tareas de la etapa actual', () => {
    const s1 = metasSemanaGeneradas('2026-11-18', T0);
    expect(s1.filter((m) => /^s-e\d/.test(m.id))).toHaveLength(PLAN.etapaActual.semana.metas.length);
  });

  it('el mes de T0 trae las metas del mes 1; diciembre, lo que cierra y la búsqueda prorrateada', () => {
    const nov = metasMesGeneradas('2026-11-20', T0);
    expect(nov.filter((m) => m.origen === 'plan').map((m) => m.texto)).toEqual(PLAN.etapaActual.mes.metas.map((m) => m.texto));
    const dic = metasMesGeneradas('2026-12-14', T0);
    // Faro v1 se entrega el 3 de enero (con las semanas de feature): entra en las metas de enero.
    expect(dic.find((m) => m.clave === 'casillas:P1')).toBeUndefined();
    expect(metasMesGeneradas('2027-01-10', T0).find((m) => m.clave === 'casillas:P1')?.texto).toBe('Faro v1 con tráiler, docs y landing');
    expect(dic.find((m) => m.clave === 'postulaciones')?.meta).toBe(155);
    expect(dic.filter((m) => m.origen === 'chequeo').map((m) => m.texto)).toEqual(['Registro de laboratorios de seguridad', 'Medidas del mes']);
    // El plan termina en T+18 (20 ago 2028): después no hay metas generadas.
    expect(metasMesGeneradas('2028-07-01', T0).length).toBeGreaterThan(0);
    expect(metasMesGeneradas('2028-09-01', T0)).toEqual([]);
  });

  it('los simulacros del C1 entran como chequeo en los últimos meses', () => {
    const abr = metasMesGeneradas('2028-04-10', T0);
    expect(abr.some((m) => m.origen === 'chequeo' && m.texto === 'Simulacro del C1')).toBe(true);
  });

  it('lo que cierra en diciembre y enero: la entrevista, la entrega de Faro v1 y la de Escudo (sin pausa)', () => {
    const c = cierraEnMes('2026-12-01', [{ fecha: '2026-12-17', rol: 'AI Engineer' }], T0);
    expect(c.map((x) => [x.fecha, x.rama])).toEqual([['2026-12-17', 'trabajo']]);
    const e = cierraEnMes('2027-01-01', [], T0);
    expect(e.map((x) => [x.fecha, x.rama])).toEqual([['2027-01-03', 'programacion'], ['2027-01-11', 'main'], ['2027-01-31', 'programacion']]);
    expect(e.some((x) => x.rama === null)).toBe(false);
  });

  it('los contadores suman lo de la semana; las horas también salen de las sesiones de foco', () => {
    const plan = { ...emptyPlan(), contadores: { '2026-12-14': { postulaciones: 4, 'horas-prog': 1 } } };
    const days = { '2026-12-14': { date: '2026-12-14', wake: '04:00', routine: 'completo' as const, notes: [], focus: [{ key: 'prog', plan: 'p', focusMin: 90, at: '07:00' }], blocks: [{ key: 'prog', n: 1, title: 'Prog', short: 'prog', area: 'ing' as const, kind: 'pomodoro' as const, start: '06:30', min: 120, fixed: false, rama: 'programacion' as const, tasks: [] }] } };
    const c = ctx({ plan, days });
    expect(avanceMeta({ id: 'a', texto: 'Postulaciones', meta: 35, clave: 'postulaciones', origen: 'plan' }, '2026-12-14', '2026-12-20', c).v).toBe(4);
    expect(avanceMeta({ id: 'b', texto: 'Horas', meta: 25, clave: 'horas-prog', origen: 'plan' }, '2026-12-14', '2026-12-20', c).v).toBe(2.5);
    expect(avanceMeta({ id: 'c', texto: 'Tarea', origen: 'propia', hecho: 1 }, '2026-12-14', '2026-12-20', c)).toEqual({ v: 1, auto: false });
  });
});

describe('proyecto', () => {
  it('casillas del estándar y examen de 85 % o más salen del estado del proyecto', () => {
    const plan = { ...emptyPlan(), proyectos: { P1: { estandar: { ux: true, ingenieria: true }, tiempo: { nucleo: 0, producto: 0, lanzamiento: 0 }, revisiones: [], examen: { fecha: '2026-12-27', puntaje: 88 } } } };
    const c = ctx({ plan });
    expect(avanceMeta({ id: 'a', texto: 'Faro', meta: 6, clave: 'casillas:P1', origen: 'plan' }, '2026-12-01', '2026-12-31', c)).toEqual({ v: 2, auto: true });
    expect(avanceMeta({ id: 'b', texto: 'Examen', meta: 1, clave: 'examen:P1', origen: 'plan' }, '2026-12-01', '2026-12-31', c).v).toBe(1);
  });
});

describe('bimestre y año', () => {
  it('B1 tiene 9 semanas con P0, Faro (5 con la feature) y Escudo, sin pausa; hay 10 bimestres de 9', () => {
    const b1 = semanasDelBimestre(1, T0);
    expect(b1.semanas.map((s) => s.letra)).toEqual(['P0', 'P0', 'F', 'F', 'F', 'F', 'F', 'E', 'E']);
    expect(b1.fin).toBe('2027-01-17');
    expect(semanasDelBimestre(9, T0).semanas).toHaveLength(9);
    expect(semanasDelBimestre(10, T0).semanas).toHaveLength(9);
  });

  it('los capítulos del bimestre salen del texto del plan', () => {
    expect(capitulosPlaneados('Aritmética 1–11')).toBe(11);
    expect(capitulosPlaneados('Álgebra 13–17, Geo y trig 1–10')).toBe(15);
    expect(capitulosPlaneados('Mathematics for ML')).toBe(0);
  });

  it('una meta por rama; la editada reemplaza al texto del plan', () => {
    const f = filasBimestre(1, '2026-12-14', ctx(), { 'b1-salud': 'Mi meta' });
    expect(f.map((x) => x.rama)).toEqual(['programacion', 'matematica', 'trabajo', 'ingles', 'handyx', 'salud']);
    expect(f.find((x) => x.rama === 'salud')?.titulo).toBe('Mi meta');
    expect(f.find((x) => x.rama === 'programacion')?.titulo).toBe(PLAN.metasBimestre.programacion[0]);
    expect(filasBimestre(3, '2026-12-14', ctx(), {}).every((x) => x.avance === 0)).toBe(true);
  });

  it('el año 1 toma los 95 kg y Handyx de tus metas personales', () => {
    const f = filasAnio('2026-12-14', ctx(), {}, { salud: { v: 88.4, target: 95, unit: 'kg' }, handyx: { v: 41, target: 100 } });
    expect(f.find((x) => x.rama === 'salud')?.lado).toBe('88,4 kg');
    expect(f.find((x) => x.rama === 'handyx')?.lado).toBe('41/100');
    expect(f).toHaveLength(6);
  });
});
