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
    // v12.1: PetrIA va del 21 nov al 9 dic, así que los puntos del estándar están en su semana (la del 14 dic ya es E1).
    expect(metasSemanaGeneradas('2026-11-23', T0).find((m) => m.clave === 'casillas:P1')).toMatchObject({ texto: 'Puntos del estándar', meta: 12 });
    expect(s5.find((m) => m.clave === 'casillas:P1')).toBeUndefined();
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
    // v12.1 (respuesta 7): la meta de Handyx del mes 1 no sale, Handyx está en pausa.
    expect(nov.filter((m) => m.origen === 'plan').map((m) => m.texto)).toEqual(PLAN.etapaActual.mes.metas.filter((m) => m.rama !== 'handyx').map((m) => m.texto));
    const dic = metasMesGeneradas('2026-12-14', T0);
    // v12.4: PetrIA se entrega el 12 de diciembre, con la Cert window 1 (examen el 18); VitalIA cierra el 8 de enero.
    expect(dic.find((m) => m.clave === 'casillas:P1')?.texto).toBe('PetrIA con los 12 puntos del estándar');
    expect(dic.find((m) => m.clave === 'casillas:P2')).toBeUndefined();
    expect(dic.find((m) => m.id === 'm-cert-CW1')?.texto).toBe('Cert window 1 aprobada');
    const ene = metasMesGeneradas('2027-01-10', T0);
    expect(ene.find((m) => m.clave === 'casillas:P2')?.texto).toBe('VitalIA con los 12 puntos del estándar');
    expect(ene.find((m) => m.id === 'm-cert-CW2')?.texto).toBe('Cert window 2 aprobada');
    // Febrero no cierra ningún proyecto: no hay puntos del estándar.
    expect(metasMesGeneradas('2027-02-10', T0).find((m) => /^casillas/.test(m.clave ?? ''))).toBeUndefined();
    expect(dic.find((m) => m.clave === 'postulaciones')?.meta).toBe(155);
    expect(dic.filter((m) => m.origen === 'chequeo').map((m) => m.texto)).toEqual(['Registro de laboratorios de seguridad', 'Medidas del mes']);
    // El calendario por semanas termina en T+18 (21 ene 2028): después no hay metas generadas.
    expect(metasMesGeneradas('2028-01-10', T0).length).toBeGreaterThan(0);
    expect(metasMesGeneradas('2028-02-01', T0)).toEqual([]);
  });

  it('los simulacros de Cambridge C1 entran como chequeo durante la preparación (semanas 20 a 46), no después', () => {
    const chequeo = (f: string) => metasMesGeneradas(f, T0).some((m) => m.origen === 'chequeo' && m.texto === 'Simulacro de Cambridge C1 (sobre 180)');
    expect(chequeo('2027-05-10')).toBe(true);
    expect(chequeo('2027-09-10')).toBe(true);
    expect(chequeo('2026-12-10')).toBe(false);
    expect(chequeo('2028-04-10')).toBe(false);
  });

  it('idiomas en el mes: las horas de inglés, sin los hitos del plan de 6 años (archivado en v12.1)', () => {
    const dic = metasMesGeneradas('2026-12-10', T0);
    expect(dic.find((m) => m.id === 'm-ing')).toMatchObject({ rama: 'ingles', unidad: 'h' });
    expect(dic.some((m) => /^m-idioma-/.test(m.id))).toBe(false);
    const oct = metasMesGeneradas('2027-10-10', T0);
    expect(oct.some((m) => /^m-idioma-/.test(m.id))).toBe(false);
  });

  it('lo que cierra en diciembre y enero (v12.4): PetrIA, la entrevista, la Cert window 1, VitalIA (sin pausa en 2026), T+2, la Cert window 2 y W1', () => {
    const c = cierraEnMes('2026-12-01', [{ fecha: '2026-12-17', rol: 'AI Engineer' }], T0);
    expect(c.map((x) => [x.fecha, x.rama, x.texto])).toEqual([
      ['2026-12-12', 'programacion', 'PetrIA entregado y examen de programación'],
      ['2026-12-17', 'trabajo', 'Entrevista · AI Engineer'],
      ['2026-12-18', 'programacion', 'Examen de Cert window 1'],
    ]);
    const e = cierraEnMes('2027-01-01', [], T0);
    expect(e.map((x) => [x.fecha, x.rama, x.texto]).slice(0, 3)).toEqual([['2027-01-08', 'programacion', 'VitalIA entregado y examen de programación'], ['2027-01-11', 'main', 'T+2 · Remoto de USD 3.000 a 5.000'], ['2027-01-18', 'programacion', 'Examen de Cert window 2']]);
    expect(e[3]).toMatchObject({ fecha: '2027-01-28', rama: 'matematica' });
    expect(e.some((x) => x.rama === null)).toBe(false);
    // Enero 2028 cierra con el examen del PNPT y T+18; la pausa del 20–26 dic 2027 cae adentro del PNPT.
    expect(cierraEnMes('2028-01-01', [], T0).map((x) => x.texto)).toContain('Examen de PNPT');
    expect(cierraEnMes('2028-01-01', [], T0).map((x) => x.texto).some((t) => /^T\+18/.test(t))).toBe(true);
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
  it('los puntos del estándar (los 12 de la v7; las casillas viejas no cuentan) y el examen de 85 % o más salen del estado del proyecto', () => {
    const plan = { ...emptyPlan(), proyectos: { P1: { estandar: { ux: true, produccion: true, seguridad: true }, tiempo: { nucleo: 0, producto: 0, lanzamiento: 0 }, revisiones: [], examen: { fecha: '2026-12-27', puntaje: 88 } } } };
    const c = ctx({ plan });
    expect(avanceMeta({ id: 'a', texto: 'Faro', meta: 6, clave: 'casillas:P1', origen: 'plan' }, '2026-12-01', '2026-12-31', c)).toEqual({ v: 2, auto: true });
    expect(avanceMeta({ id: 'b', texto: 'Examen', meta: 1, clave: 'examen:P1', origen: 'plan' }, '2026-12-01', '2026-12-31', c).v).toBe(1);
  });
});

const LETRA_PAUSA = '—';

describe('bimestre y año', () => {
  it('B1 tiene 9 semanas de calendario (v12.4): PetrIA, Cert windows 1 y 2, English E#1 y VitalIA; hay 7 bimestres, el último de 8', () => {
    const b1 = semanasDelBimestre(1, T0);
    // La semana es del tramo que tiene el jueves: el jueves 19 nov es de PetrIA v0 (archivada), así que la semana 1 lleva su letra.
    expect(b1.semanas.map((s) => s.letra)).toEqual(['P1V0', 'P1', 'P1', 'P1', 'C', 'E1', 'P2', 'P2', 'C']);
    expect(b1.leyenda).toEqual(['P1V0 PetrIA v0 (archived)', 'P1 PetrIA', 'C Cert window 1', 'E1 English E#1', 'P2 VitalIA', 'C Cert window 2']);
    expect(b1.fin).toBe('2027-01-17');
    expect(semanasDelBimestre(5, T0).semanas).toHaveLength(9);
    expect(semanasDelBimestre(6, T0).semanas).toHaveLength(9);
    expect(semanasDelBimestre(7, T0).semanas).toHaveLength(8);
    // La pausa de fin de año (20–26 dic 2027) parte al PNPT: su semana lleva la letra de la pausa en el B7.
    expect([1, 2, 3, 4, 5, 6].some((n) => semanasDelBimestre(n, T0).semanas.some((s) => s.letra === LETRA_PAUSA))).toBe(false);
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
