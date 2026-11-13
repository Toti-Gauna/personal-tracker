import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, register, resetState, startDay, toggleTask } from '../state/store';
import { addPilot, ensureDayRefs, saveWeek, syncBlockRuta, toggleItemManual, weekPlan } from '../state/ruta';
import { completeLearn, saveTest } from '../state/study';
import { marcarTarea } from '../ui/acciones';
import { mejoraDia } from './mejora';
import {
  AXES, BIMS, allDoneUntil, axisOf, bimCurve, bimOf, bimProgress, competencyAxes, laneItems, laneOfItem, laneStatus, nextPart, partDelta,
  pace, progressMap, proposeWeek, routeCurve, routeDay, routeProgress, weekGoalValue, weekOf,
} from './ruta';
import { competencyScores } from './roadmap-charts';

const B1 = BIMS[0];
const D = '2026-11-16'; // lunes, día 1 de la ruta
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

describe('dónde estás', () => {
  it('bimestre y semana de una fecha; antes de la ruta cuenta B1, semana 1', () => {
    expect(bimOf('2026-11-12').n).toBe(1);
    expect(weekOf(B1, '2026-11-12')).toBe(1);
    expect(weekOf(B1, '2026-11-23')).toBe(2);
    expect(bimOf('2027-01-16').n).toBe(2);
    expect(weekOf(B1, '2027-01-15')).toBe(9);
    expect(routeDay(D)).toEqual({ day: 1, total: 1096 });
  });

  it('cada ítem cae en un carril de la pantalla', () => {
    expect(laneItems(B1, 'math')).toHaveLength(11);
    expect(laneItems(B1, 'prog').map((i) => i.title)).toEqual(['Python', 'FastAPI', 'RAG evaluado', 'OWASP LLM']);
    expect(laneItems(B1, 'cero').map((i) => i.id)).toEqual(['b1-pieza']);
    expect(laneItems(B1, 'producto').map((i) => i.id)).toEqual(['b1-producto']);
    expect(laneItems(BIMS[3], 'cert').map((i) => laneOfItem(i))).toEqual(['cert']);
  });
});

describe('avance por pasos', () => {
  const cap = B1.items[0];
  it('aprender y comprobar valen la mitad; construir se reparte en 3 sesiones por semana', () => {
    expect(partDelta(cap, 'learn')).toBe(0.5);
    expect(partDelta(B1.items.find((i) => i.id === 'b1-pieza')!, 'build')).toBeCloseTo(1 / 12);
    expect(nextPart(cap, 0)).toBe('learn');
    expect(nextPart(cap, 0.5)).toBe('test');
  });
  it('el avance se limita a 1 y se puede mirar a una fecha', () => {
    const log = [{ date: D, item: cap.id, delta: 0.5, src: 'a' }, { date: '2026-11-17', item: cap.id, delta: 0.8, src: 'b' }];
    expect(progressMap(log, D)[cap.id]).toBe(0.5);
    expect(progressMap(log)[cap.id]).toBe(1);
  });
});

describe('carriles y ritmo', () => {
  it('sin nada hecho a la semana 3: matemática atrasada, producto todavía no empieza', () => {
    const fecha = '2026-11-30';
    const m = laneStatus(B1, 'math', fecha, {});
    expect(m.tone).toBe('mal');
    expect(m.label).toMatch(/^atrasada \d/);
    expect(m.next?.id).toBe('b1-conamat-arit-01');
    expect(laneStatus(B1, 'producto', fecha, {}).label).toBe('semana 5');
    expect(pace(B1, fecha, {}).status).toBe('atrasado');
  });
  it('con todo lo de la semana 1 hecho, al día; con más, adelantada', () => {
    const p = Object.fromEntries(laneItems(B1, 'math').slice(0, 2).map((i) => [i.id, 1]));
    expect(laneStatus(B1, 'math', '2026-11-23', p).label).toBe('al día');
    const mas = Object.fromEntries(laneItems(B1, 'math').slice(0, 5).map((i) => [i.id, 1]));
    expect(laneStatus(B1, 'math', '2026-11-23', mas).tone).toBe('bien');
  });
  it('la curva del bimestre tiene 64 puntos de plan y el real llega hasta hoy', () => {
    const c = bimCurve(B1, [], '2026-11-23');
    expect(c.plan).toHaveLength(64);
    expect(c.real).toHaveLength(8);
    expect(c.today).toBe(7);
    expect(c.plan[63]).toBe(1);
  });
});

describe('propuesta de la semana', () => {
  it('la semana 1 arma matemática, programación, desde cero, piloto y el núcleo de Eclipse', () => {
    const w = proposeWeek(B1, 1, {});
    expect(w.goals.map((g) => g.lane)).toEqual(['math', 'prog', 'cero', 'piloto', 'hilo']);
    expect(w.goals[0].title).toBe('CONAMAT · caps. 1 a 2');
    expect(w.goals[4].title).toMatch(/Núcleo de Eclipse/);
  });
  it('lo pendiente pasa a la semana siguiente', () => {
    const p = { 'b1-conamat-arit-01': 1 };
    const w2 = proposeWeek(B1, 2, p);
    const math = w2.goals.find((g) => g.lane === 'math')!;
    expect(math.refs[0]).toBe('b1-conamat-arit-02');
    expect(math.carried).toBe(true);
    expect(weekGoalValue(math, { 'b1-conamat-arit-02': 0.5 }, [], D, D)).toBe(0.5);
  });
  it('desde B7 suma algoritmos y diseño de sistemas', () => {
    expect(proposeWeek(BIMS[6], 1, {}).goals.filter((g) => g.lane === 'hilo').map((g) => g.title)).toEqual([
      'Algoritmos · 3 por semana', 'Diseño de sistemas', 'Núcleo de Eclipse, reutilizado en todos los productos',
    ]);
  });
});

describe('gráficos', () => {
  it('ruta completa: 0 sin nada y 1 con todo; el plan llega a 1 en el B18', () => {
    expect(routeProgress({})).toBe(0);
    expect(routeProgress(allDoneUntil(18))).toBe(1);
    const c = routeCurve([], '2026-11-20');
    expect(c.plan).toHaveLength(19);
    expect(c.plan[18]).toBe(1);
    expect(c.real).toEqual([0, 0]);
  });
  it('seis ejes de competencias; la meta del año 1 queda por debajo de la del año 3', () => {
    expect(axisOf(B1.items.find((i) => i.title === 'OWASP LLM')!)).toBe('Seguridad');
    expect(axisOf(BIMS[3].items.find((i) => i.title === 'Docker')!)).toBe('Cloud');
    expect(axisOf(BIMS[11].items.find((i) => i.title === 'Jetson')!)).toBe('Hardware');
    const hoy = competencyScores(competencyAxes({}));
    const a1 = competencyScores(competencyAxes(allDoneUntil(6)));
    const a3 = competencyScores(competencyAxes(allDoneUntil(18)));
    expect(hoy.map((x) => x.id)).toEqual([...AXES]);
    expect(hoy.every((x) => x.score === 0)).toBe(true);
    expect(a3.every((x) => x.score === 100)).toBe(true);
    a1.forEach((x, i) => expect(x.score).toBeLessThanOrEqual(a3[i].score));
  });
});

describe('de la ruta a tu día', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 16, 7, 0));
    resetState();
    register('Toti', 'Abi', D);
    startDay('completo', '04:00', D);
  });
  afterEach(() => vi.useRealTimers());

  it('las metas de Hoy salen con su etiqueta de ruta', () => {
    const bl = Object.fromEntries(getState().days[D].blocks.map((b) => [b.key, b]));
    expect(bl.math).toMatchObject({ ref: 'b1-conamat-arit-01', part: 'learn' });
    expect(bl.prog).toMatchObject({ ref: 'b1-prog-python', part: 'learn' });
    expect(bl.eclipse.ref).toBe('b1-piloto');
    expect(bl.abi.ref).toBeUndefined();
    expect(bl.handyx.ref).toBeUndefined();
  });

  it('marcar la meta suma a la mejora, avanza la meta semanal, mueve el carril y recalcula el ritmo', () => {
    const antes = laneStatus(B1, 'math', D, progressMap(getState().ruta.log));
    const ritmoAntes = pace(B1, '2026-11-18', progressMap(getState().ruta.log));
    const math = getState().days[D].blocks.find((b) => b.key === 'math')!;
    for (const t of math.tasks) marcarTarea(D, 'math', t.id);
    const s = getState();
    const p = progressMap(s.ruta.log);
    expect(mejoraDia(s.days[D])).toBe(0.125);
    expect(p['b1-conamat-arit-01']).toBe(0.5);
    expect(laneStatus(B1, 'math', D, p).done).toBe(antes.done + 0.5);
    const semana = weekPlan(D).plan.goals.find((g) => g.lane === 'math')!;
    expect(weekGoalValue(semana, p, s.ruta.log, D, D)).toBe(0.5);
    expect(pace(B1, '2026-11-18', p).actual).toBeGreaterThan(ritmoAntes.actual);
    expect(bimProgress(B1, p)).toBeGreaterThan(0);
  });

  it('desmarcar la meta deshace el avance, y marcarla dos veces no suma doble', () => {
    const math = getState().days[D].blocks.find((b) => b.key === 'math')!;
    for (const t of math.tasks) toggleTask(D, 'math', t.id);
    syncBlockRuta(D, 'math');
    syncBlockRuta(D, 'math');
    expect(progressMap(getState().ruta.log)['b1-conamat-arit-01']).toBe(0.5);
    toggleTask(D, 'math', math.tasks[0].id);
    syncBlockRuta(D, 'math');
    expect(progressMap(getState().ruta.log)['b1-conamat-arit-01']).toBeUndefined();
  });

  it('el día siguiente pide el próximo paso: el test del capítulo 1', () => {
    const math = getState().days[D].blocks.find((b) => b.key === 'math')!;
    for (const t of math.tasks) marcarTarea(D, 'math', t.id);
    startDay('completo', '04:00', '2026-11-17');
    expect(getState().days['2026-11-17'].blocks.find((b) => b.key === 'math')).toMatchObject({ ref: 'b1-conamat-arit-01', part: 'test' });
  });

  it('aprobar el test de CONAMAT completa su ítem una sola vez', () => {
    completeLearn(D, 'conamat', 1);
    saveTest(D, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    saveTest(D, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    expect(progressMap(getState().ruta.log)['b1-conamat-arit-01']).toBe(1);
    expect(getState().ruta.log.filter((l) => l.item === 'b1-conamat-arit-01')).toHaveLength(2);
  });

  it('Eclipse suma llamadas al piloto y el embudo se ajusta a mano', () => {
    const ec = getState().days[D].blocks.find((b) => b.key === 'eclipse')!;
    for (const t of ec.tasks) marcarTarea(D, 'eclipse', t.id);
    addPilot(D, 1, 'calls', 1);
    addPilot(D, 1, 'interested', 1);
    const pil = weekPlan(D).plan.goals.find((g) => g.lane === 'piloto')!;
    expect(weekGoalValue(pil, {}, getState().ruta.log, D, '2026-11-22')).toBe(2);
    expect(getState().ruta.pilot[1].interested).toBe(1);
  });

  it('a mano: un paso por toque y, completo, se vacía', () => {
    toggleItemManual(D, 'b1-cert-x');
    toggleItemManual(D, 'b1-conamat-arit-05');
    expect(progressMap(getState().ruta.log)['b1-conamat-arit-05']).toBe(0.5);
    toggleItemManual(D, 'b1-conamat-arit-05');
    expect(progressMap(getState().ruta.log)['b1-conamat-arit-05']).toBe(1);
    toggleItemManual(D, 'b1-conamat-arit-05');
    expect(progressMap(getState().ruta.log)['b1-conamat-arit-05']).toBeUndefined();
  });

  it('la semana guardada se respeta y un día sin etiquetas las recibe', () => {
    const { key, plan } = weekPlan(D);
    saveWeek(key, { ...plan, goals: plan.goals.slice(0, 1), edited: true });
    expect(weekPlan(D).plan.goals).toHaveLength(1);
    startDay('completo', '04:00', '2026-11-18');
    const sin = getState().days['2026-11-18'];
    sin.blocks.forEach((b) => { delete b.ref; delete b.part; });
    ensureDayRefs('2026-11-18');
    expect(getState().days['2026-11-18'].blocks.find((b) => b.key === 'math')?.ref).toBeDefined();
  });
});
