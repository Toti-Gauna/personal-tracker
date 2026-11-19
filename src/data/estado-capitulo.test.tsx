import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { completeReview, saveTest, seguirEstudiando, terminarEstudio, tramoDone, volverAEstudiar } from '../state/study';
import { marcarTarea } from '../ui/acciones';
import { EstadoEstudio, abrirEstadoEstudio, cerrarEstadoEstudio, estadoEstudioAbierto } from '../ui/EstadoEstudio';
import { finSesion, sesionVencida } from '../ui/estudio-acciones';
import { capitulosEnJuego, estadoCapitulo, historial, resumenLibro } from './estado-capitulo';
import { focusUnit } from './study';

const D = '2026-11-18';
const act = () => getState().study.activities.find((a) => a.id === 'conamat')!;
const est = (n: number, d = D) => estadoCapitulo(getState().study, act(), n, d);
const sinErrores = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-16'); });
afterEach(() => cerrarEstadoEstudio());

describe('ola 28 · el capítulo no avanza solo', () => {
  it('terminar el tiempo de estudiar no da el capítulo por estudiado (antes pasaba al cap. 2 solo)', () => {
    tramoDone(D, { step: 'estudiar', kind: 'capitulo', title: 'Cap. 1', sub: '', min: 50, ref: 'learn:conamat:1', activityId: 'conamat' }, true);
    expect(est(1).estado).toBe('estudiando');
    expect(focusUnit(act(), getState().study, '2026-11-19')!.n).toBe(1);
    expect(getState().study.reviews).toHaveLength(0);
  });

  it('sigo estudiando: el paso de hoy queda hecho, mañana sigue el mismo capítulo y no hay test', () => {
    seguirEstudiando(D, 'conamat', 1);
    expect(getState().days[D]?.studyDone ?? []).toEqual([]); // sin día creado no hay dónde marcar
    startDay('completo', '04:00', D);
    seguirEstudiando(D, 'conamat', 1);
    expect(getState().days[D].studyDone).toContain('learn:conamat:1');
    expect(est(1, '2026-11-19').estado).toBe('estudiando');
    expect(getState().study.reviews).toHaveLength(0);
    // Más tarde ese día lo termina: no lo bloquea el "sigo estudiando".
    expect(terminarEstudio(D, 'conamat', 1)).toBeNull();
    expect(est(1, '2026-11-19')).toMatchObject({ estado: 'test', etiqueta: 'test hoy' });
  });

  it('lo terminé → test (día 2, con cold recall); todavía no lo terminé → vuelve a estudiando sin el cold recall ni el test', () => {
    startDay('completo', '04:00', D);
    terminarEstudio(D, 'conamat', 1);
    expect(est(1)).toMatchObject({ estado: 'test', etiqueta: 'test mañana' });
    expect(getState().study.reviews.map((r) => [r.kind, r.unit, r.due])).toEqual([['cold', 1, '2026-11-19']]);
    expect(focusUnit(act(), getState().study, '2026-11-19')!.n).toBe(2);
    expect(volverAEstudiar('conamat', 1)).toBe(true);
    expect(est(1).estado).toBe('estudiando');
    expect(getState().study.reviews).toHaveLength(0);
    expect(getState().days[D].studyDone ?? []).not.toContain('learn:conamat:1');
    expect(focusUnit(act(), getState().study, '2026-11-19')!.n).toBe(1);
    // Con un test cargado ya no se puede deshacer.
    terminarEstudio(D, 'conamat', 1);
    saveTest('2026-11-19', 'conamat', 1, { score: 10, total: 15, errors: sinErrores, mode: 'papel' });
    expect(volverAEstudiar('conamat', 1)).toBe(false);
  });

  it('test aprobado → tesis al día siguiente → repasos 8, 22 y 61 (los agenda el motor solo); con el %', () => {
    startDay('completo', '04:00', D);
    terminarEstudio(D, 'conamat', 1);
    saveTest('2026-11-19', 'conamat', 1, { score: 13, total: 15, errors: sinErrores, mode: 'papel' });
    const t = est(1, '2026-11-19');
    expect(t).toMatchObject({ estado: 'tesis', etiqueta: 'tesis mañana', mejor: 87, ultimo: 87 });
    completeReview('2026-11-20', t.tesis!.id);
    const r = est(1, '2026-11-20');
    expect(r.estado).toBe('repasos');
    expect(r.etiqueta).toMatch(/^aprobado 87 % · repaso el 25 nov$/);
    expect(r.repasos.filter((x) => !x.doneOn).map((x) => x.due)).toEqual(['2026-11-25', '2026-12-09', '2027-01-17']);
    const res = resumenLibro(getState().study, act(), '2026-11-20');
    expect(res).toMatchObject({ aprobados: 1, total: 11, promedio: 87 });
    expect(res.final).toMatchObject({ titulo: 'Examen de aritmética', disponible: false });
  });

  it('test reprobado → re-test; el historial cuenta lo que pasó cada día', () => {
    startDay('completo', '04:00', D);
    terminarEstudio(D, 'conamat', 1);
    saveTest('2026-11-19', 'conamat', 1, { score: 9, total: 15, errors: sinErrores, mode: 'papel' });
    expect(est(1, '2026-11-19')).toMatchObject({ estado: 'retest', ultimo: 60 });
    expect(est(1, '2026-11-19').etiqueta).toBe('re-test el 21 nov · 60 %');
    const h = historial(getState().study, getState().days, act());
    expect(h.map((d) => [d.fecha, d.eventos])).toEqual([
      ['2026-11-19', ['Test del cap. 1: 9/15 (60 %)']],
      ['2026-11-18', ['Terminaste de estudiar el cap. 1']],
    ]);
  });

  it('capítulos en juego: el que estudiás, el del test y la tesis que vence', () => {
    startDay('completo', '04:00', D);
    terminarEstudio(D, 'conamat', 1);
    expect(capitulosEnJuego(getState().study, act(), '2026-11-19').map((c) => [c.n, c.estado])).toEqual([[1, 'test'], [2, 'estudiando']]);
  });
});

describe('ola 28 · ¿en qué estado estás?', () => {
  it('al cerrar la meta de matemática en Hoy se abre la hoja, y desde ahí se marca el capítulo', () => {
    startDay('completo', '04:00', D);
    const b = getState().days[D].blocks.find((x) => x.key === 'math')!;
    for (const t of b.tasks) marcarTarea(D, 'math', t.id);
    expect(estadoEstudioAbierto()).toMatchObject({ date: D });
    render(<EstadoEstudio />);
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByRole('heading', { name: '¿En qué estado estás?' })).toBeInTheDocument();
    expect(within(dlg).getByText('Cap. 1 · Números reales')).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Lo terminé · test mañana' }));
    expect(est(1).estado).toBe('test');
    // La hoja se actualiza: ahora el cap. 1 tiene el test y el cap. 2 es el que se estudia.
    expect(within(dlg).getByRole('button', { name: 'Todavía no lo terminé' })).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Todavía no lo terminé' }));
    expect(est(1).estado).toBe('estudiando');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Listo' }));
    expect(estadoEstudioAbierto()).toBeNull();
  });

  it('al terminar una sesión de CONAMAT pregunta; si la sesión quedó abierta y terminó sola, avisa y no da nada por hecho', () => {
    startDay('completo', '04:00', D);
    const f = { date: D, key: 'math', plan: 'Sesión de estudio', segs: [{ type: 'focus' as const, min: 50 }], i: 0, segStart: 0, pausedAt: null, activityId: 'conamat', tramos: [] };
    finSesion(f);
    expect(estadoEstudioAbierto()).toMatchObject({ actividades: ['conamat'] });
    cerrarEstadoEstudio();
    sesionVencida(f);
    expect(estadoEstudioAbierto()!.nota).toMatch(/terminó sola: no di nada por hecho/);
    expect(est(1).estado).toBe('estudiando');
  });

  it('sin nada en juego no pregunta', () => {
    abrirEstadoEstudio(D, { actividades: ['make-it-stick'] });
    render(<EstadoEstudio />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('ola 28 · Aritmética y Álgebra son dos libros', () => {
  it('Álgebra tiene sus 17 capítulos y no entra en el día hasta terminar Aritmética', async () => {
    const { activitiesFor, librosMate } = await import('./study');
    const st = () => getState().study;
    const alg = st().activities.find((a) => a.id === 'conamat-algebra')!;
    expect(alg).toMatchObject({ title: 'CONAMAT · Álgebra', despuesDe: 'conamat', front: 'math' });
    expect(alg.units!.map((u) => u.title).slice(0, 4)).toEqual(['Conjuntos y lógica', 'Conceptos básicos de álgebra', 'Productos notables', 'Factorización']);
    expect(alg.units).toHaveLength(17);
    expect(activitiesFor(st(), D).map((a) => a.id)).not.toContain('conamat-algebra');
    expect(librosMate(st()).map((a) => a.id)).toEqual(['conamat']);
    // Con los 11 de Aritmética aprobados, arranca Álgebra.
    startDay('completo', '04:00', D);
    for (let n = 1; n <= 11; n++) {
      terminarEstudio(D, 'conamat', n);
      saveTest('2026-11-19', 'conamat', n, { score: 14, total: 15, errors: sinErrores, mode: 'papel' });
    }
    expect(activitiesFor(st(), '2026-11-20').map((a) => a.id)).toContain('conamat-algebra');
    expect(librosMate(st()).map((a) => a.id)).toEqual(['conamat', 'conamat-algebra']);
    expect(estadoCapitulo(st(), alg, 1, '2026-11-20').estado).toBe('estudiando');
  });

  it('un estado viejo suma Álgebra justo después de Aritmética, sin tocar lo estudiado', async () => {
    const { migrate } = await import('../state/store');
    const viejo = structuredClone(getState());
    viejo.study.activities = viejo.study.activities.filter((a) => a.id !== 'conamat-algebra');
    viejo.study.units = { conamat: { 1: { learnedOn: '2026-11-17', tests: [] } } };
    const m = migrate(viejo);
    expect(m.study.activities.map((a) => a.id).slice(0, 2)).toEqual(['conamat', 'conamat-algebra']);
    expect(m.study.units.conamat[1].learnedOn).toBe('2026-11-17');
  });
});
