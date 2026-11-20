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
    // Ola 27: con trabajo, idiomas son 6,5 h por semana y programación 29.
    expect(s20.find((m) => m.clave === 'horas-ingles')?.meta).toBe(6.5);
    expect(s20.find((m) => m.clave === 'horas-prog')?.meta).toBe(29);
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
    // Con el roadmap v7, PetrIA se entrega el 26 de diciembre (a 8 h por día); VitalIA, en febrero.
    expect(dic.find((m) => m.clave === 'casillas:P1')?.texto).toBe('PetrIA con tráiler, docs y landing');
    expect(dic.find((m) => m.clave === 'casillas:P2')).toBeUndefined();
    expect(metasMesGeneradas('2027-01-10', T0).find((m) => /^casillas/.test(m.clave ?? ''))).toBeUndefined();
    expect(dic.find((m) => m.clave === 'postulaciones')?.meta).toBe(155);
    expect(dic.filter((m) => m.origen === 'chequeo').map((m) => m.texto)).toEqual(['Registro de laboratorios de seguridad', 'Medidas del mes']);
    // El plan termina en T+18 (27 dic 2028): después no hay metas generadas.
    expect(metasMesGeneradas('2028-12-01', T0).length).toBeGreaterThan(0);
    expect(metasMesGeneradas('2029-02-01', T0)).toEqual([]);
  });

  it('los simulacros de Cambridge C1 entran como chequeo durante la preparación (semanas 20 a 46), no después', () => {
    const chequeo = (f: string) => metasMesGeneradas(f, T0).some((m) => m.origen === 'chequeo' && m.texto === 'Simulacro de Cambridge C1 (sobre 180)');
    expect(chequeo('2027-05-10')).toBe(true);
    expect(chequeo('2027-09-10')).toBe(true);
    expect(chequeo('2026-12-10')).toBe(false);
    expect(chequeo('2028-04-10')).toBe(false);
  });

  it('idiomas en el mes: las 11,5 h por semana y el hito de la fase que cierra', () => {
    const dic = metasMesGeneradas('2026-12-10', T0);
    expect(dic.find((m) => m.id === 'm-ing')).toMatchObject({ rama: 'ingles', unidad: 'h', meta: 50.9 });
    expect(dic.find((m) => m.id === 'm-idioma-a1-mwm')?.texto).toBe('Measure What Matters: tesis final + 3 min hablados sin leer');
    const oct = metasMesGeneradas('2027-10-10', T0);
    expect(oct.some((m) => m.id === 'm-idioma-a1-examen')).toBe(true);
  });

  it('lo que cierra en diciembre y enero: la entrevista, la entrega de PetrIA (sin pausa en 2026), la certificación 1 y T+2', () => {
    const c = cierraEnMes('2026-12-01', [{ fecha: '2026-12-17', rol: 'AI Engineer' }], T0);
    expect(c.map((x) => [x.fecha, x.rama, x.texto])).toEqual([['2026-12-17', 'trabajo', 'Entrevista · AI Engineer'], ['2026-12-26', 'programacion', 'PetrIA entregado y examen de programación']]);
    const e = cierraEnMes('2027-01-01', [], T0);
    expect(e.map((x) => [x.fecha, x.rama, x.texto])).toEqual([['2027-01-02', 'programacion', 'Examen de Claude + GitHub Foundations'], ['2027-01-11', 'main', 'T+2 · Remoto de USD 3.000 a 5.000']]);
    expect(e.some((x) => x.rama === null)).toBe(false);
    // La pausa de 2027 sí aparece.
    expect(cierraEnMes('2027-12-01', [], T0).some((x) => x.rama === null && /Pausa de fin de año/.test(x.texto))).toBe(true);
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

const LETRA_PAUSA = '—';

describe('bimestre y año', () => {
  it('B1 tiene 9 semanas de calendario con PetrIA, la certificación 1 y VitalIA; hay 13 bimestres, el último de 3', () => {
    const b1 = semanasDelBimestre(1, T0);
    // La semana es del tramo que tiene el jueves: P0 dura del lunes 16 al miércoles 18, así que la semana 1 ya es de PetrIA.
    expect(b1.semanas.map((s) => s.letra)).toEqual(['P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'C', 'P2', 'P2']);
    expect(b1.leyenda).toEqual(['P1 PetrIA', 'C Claude + GitHub Foundations', 'P2 VitalIA']);
    expect(b1.fin).toBe('2027-01-17');
    expect(semanasDelBimestre(12, T0).semanas).toHaveLength(9);
    expect(semanasDelBimestre(13, T0).semanas).toHaveLength(3);
    expect(semanasDelBimestre(7, T0).semanas.map((s) => s.letra)).toContain(LETRA_PAUSA);
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
