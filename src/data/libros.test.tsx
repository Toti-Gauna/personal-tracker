import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, migrate, register, resetState } from '../state/store';
import { completeLearn, completeReview, guardarArtefacto, guardarMicrotesis, guardarTestFinal, marcarRecurso, saveTest } from '../state/study';
import { LibroPantalla } from '../screens/Libro';
import { TestFinal } from '../screens/TestFinal';
import { DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from './defaults';
import {
  LIBROS, actividadDeLibro, actIdDeLibro, capsTexto, estadoLibro, libroCerrado, libroPorId, microFaltantes, unidadesDe, unidadesMotor, validarLibro, validarLibros,
  type Libro,
} from './libros';
import { activitiesFor, dueReview, planActivity, testOf } from './study';
import { addDays } from './time';

const D0 = '2026-11-16';
const ACT = actIdDeLibro('mwm');
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
const mwm = libroPorId('mwm')!;
const act = () => getState().study.activities.find((a) => a.id === ACT)!;

describe('data/libros.json · Measure What Matters', () => {
  it('es válido: 21 capítulos y 6 recursos en 11 unidades (7 de la parte 1 y 4 de la parte 2)', () => {
    expect(validarLibros()).toEqual([]);
    expect(LIBROS.map((l) => l.id)).toEqual(['mwm']);
    expect(mwm.capitulos).toHaveLength(21);
    expect(mwm.recursos).toHaveLength(6);
    const us = unidadesDe(mwm);
    expect(us).toHaveLength(11);
    expect(us.filter((u) => mwm.capitulos.find((c) => c.n === u.caps[0])!.parte === 1)).toHaveLength(7);
    expect(us[10]).toEqual({ n: 11, caps: [21], recursos: ['R1'] });
    expect(mwm.capitulos.filter((c) => c.teoria).map((c) => c.n)).toEqual([4, 7, 10, 12]);
  });

  it('cada unidad del motor es de 2 capítulos, con mini-test de 8 preguntas en 15 min (sin sumar anteriores)', () => {
    const u = unidadesMotor(mwm);
    expect(u[2].title).toBe('Caps. 5 y 6 · Focus: The Remind Story y Commit: The Nuna Story');
    expect(u[10].title).toBe("Cap. 21 · The Goals to Come y Resource 1: Google's OKR Playbook");
    expect(testOf(u[2])).toEqual({ nuevos: 8, prev: 0, total: 8, min: 15 });
    expect(capsTexto([5, 6])).toBe('caps. 5 y 6');
  });

  it('el validador marca capítulos fuera de orden, repetidos, sin unidad o unidades de 3', () => {
    const malo: Libro = { id: 'x', titulo: 'X', capitulos: [{ n: 1, titulo: 'a' }, { n: 3, titulo: 'b' }, { n: 3, titulo: 'c' }], unidades: [{ n: 1, caps: [1, 3, 3] }] };
    const e = validarLibro(malo).join('\n');
    expect(e).toMatch(/el capítulo 2 tiene n = 3/);
    expect(e).toMatch(/la unidad 1 tiene 3 capítulos/);
    expect(e).toMatch(/el cap. 3 está en las unidades 1 y 1/);
    // Sin unidades, se arman de a 2.
    expect(unidadesDe({ id: 'y', titulo: 'Y', capitulos: [1, 2, 3].map((n) => ({ n, titulo: `c${n}` })) }).map((u) => u.caps)).toEqual([[1, 2], [3]]);
  });
});

describe('el libro en el motor de estudio', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
  });

  it('Measure What Matters ya está como actividad: bloque de inglés, todos los días, unidades de 2 capítulos', () => {
    expect(act()).toMatchObject({ libro: 'mwm', area: 'libro', block: 'ingles', unitLabel: 'Unidad', testMode: 'app', days: [0, 1, 2, 3, 4, 5, 6] });
    expect(act().units).toHaveLength(11);
    expect(activitiesFor(getState().study, '2026-11-22').some((a) => a.id === ACT)).toBe(true);
  });

  it('un estado guardado de antes suma el libro sin tocar lo estudiado, y CONAMAT toma el área matemática', () => {
    const viejo = structuredClone(getState()) as unknown as { study: { activities: { id: string }[] } };
    viejo.study.activities = viejo.study.activities.filter((a) => a.id !== ACT);
    const s = migrate(viejo);
    expect(s.study.activities.filter((a) => a.id === ACT)).toHaveLength(1);
    expect(s.study.activities.find((a) => a.id === 'conamat')!.area).toBe('matematica');
    // Migrar de nuevo no lo duplica.
    expect(migrate(s).study.activities.filter((a) => a.id === ACT)).toHaveLength(1);
  });

  it('la micro-tesis de cada capítulo queda como punto de la unidad y como tarjeta; editarla cambia la tarjeta', () => {
    expect(microFaltantes(getState().study, act(), 3)).toEqual([5, 6]);
    guardarMicrotesis(D0, ACT, 5, 'Con OKRs se elige lo que importa y se deja lo demás.');
    expect(microFaltantes(getState().study, act(), 3)).toEqual([6]);
    const card = getState().study.cards.find((c) => c.source === 'Micro-tesis · cap. 5')!;
    expect(card).toMatchObject({ kind: 'explicar', activityId: ACT, unit: 3, back: 'Con OKRs se elige lo que importa y se deja lo demás.' });
    expect(card.front).toBe('Measure What Matters · cap. 5 (Focus: The Remind Story): ¿cuál es la idea central?');
    expect(getState().study.points[`${ACT}:3`]).toEqual(['Cap. 5 · Focus: The Remind Story :: Con OKRs se elige lo que importa y se deja lo demás.']);
    guardarMicrotesis(D0, ACT, 5, 'Foco: pocas prioridades.');
    expect(getState().study.cards.filter((c) => c.source === 'Micro-tesis · cap. 5')).toHaveLength(1);
    expect(getState().study.cards.find((c) => c.id === card.id)!.back).toBe('Foco: pocas prioridades.');
    // Sin tarjeta, solo el punto.
    guardarMicrotesis(D0, ACT, 6, 'Compromiso personal.', false);
    expect(getState().study.cards.some((c) => c.source === 'Micro-tesis · cap. 6')).toBe(false);
    expect(getState().study.points[`${ACT}:3`]).toHaveLength(2);
  });

  it('la lectura de apoyo se tilda y se destilda', () => {
    marcarRecurso(D0, ACT, 'R2');
    expect(getState().study.recursosLeidos).toEqual({ [`${ACT}:R2`]: D0 });
    marcarRecurso(D0, ACT, 'R2');
    expect(getState().study.recursosLeidos).toEqual({});
  });

  it('cierre: con las 11 unidades aprobadas toca el test final; aprobado, mañana la tesis final; con artefacto, terminado', () => {
    let d = D0;
    for (const u of act().units!) {
      completeLearn(d, ACT, u.n);
      saveTest(addDays(d, 1), ACT, u.n, { score: 8, total: 8, errors: ok, mode: 'app' });
      d = addDays(d, 1);
    }
    expect(estadoLibro(getState().study, mwm)).toMatchObject({ aprobadas: 11, finalToca: true, estado: 'leyendo' });
    d = addDays(d, 1);
    const st = getState().study;
    const tramos = planActivity(act(), { study: st, date: d, blockMin: 90, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review: dueReview(st.reviews, d).today });
    expect(tramos.some((t) => t.ref === `test:${ACT}:final`)).toBe(true);

    expect(guardarTestFinal(d, ACT, { score: 16, total: 20, errors: { ...ok, concepto: 4 }, mode: 'app' }).approved).toBe(false);
    expect(guardarTestFinal(d, ACT, { score: 18, total: 20, errors: { ...ok, descuido: 2 }, mode: 'app' }).approved).toBe(true);
    const fin = getState().study.finales![ACT];
    expect(fin.tests).toHaveLength(2);
    const tesis = getState().study.reviews.find((r) => r.id === fin.tesisItem)!;
    expect(tesis).toMatchObject({ kind: 'tesis', due: addDays(d, 1), label: 'Tesis final · Measure What Matters' });
    // Ya aprobado, el test final no vuelve a aparecer.
    const st2 = getState().study;
    expect(planActivity(act(), { study: st2, date: addDays(d, 1), blockMin: 90, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review: [] }).some((t) => t.ref === `test:${ACT}:final`)).toBe(false);

    completeReview(addDays(d, 1), tesis.id);
    expect(estadoLibro(getState().study, mwm).estado).toBe('leido');
    expect(libroCerrado(getState().study, act())).toBe(true);
    expect(activitiesFor(getState().study, addDays(d, 2)).some((a) => a.id === ACT)).toBe(false);
    guardarArtefacto(addDays(d, 3), ACT, { tipo: 'framework', titulo: 'Mis OKR del trimestre' });
    expect(estadoLibro(getState().study, mwm).estado).toBe('terminado');
    guardarArtefacto(addDays(d, 3), ACT, null);
    expect(estadoLibro(getState().study, mwm).estado).toBe('leido');
  });

  it('actividadDeLibro arma la actividad en otro bloque si se pide', () => {
    expect(actividadDeLibro(mwm, { block: 'cierre', front: 'ingles', days: [0, 2] })).toMatchObject({ block: 'cierre', front: 'ingles', days: [0, 2], id: ACT });
  });
});

describe('pantallas del libro', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
  });
  const day = () => ({ date: D0, wake: '04:00', routine: 'completo' as const, blocks: [], notes: [], focus: [] });

  it('el libro muestra dónde estás, las unidades por parte y el cierre de 3 pasos', () => {
    render(<LibroPantalla day={day()} id="mwm" />);
    expect(screen.getByRole('heading', { name: 'Measure What Matters' })).toBeInTheDocument();
    expect(screen.getByText('Unidad 1 de 11 · caps. 1 y 2')).toBeInTheDocument();
    expect(screen.getByText('Parte 1 · OKRs in Action')).toBeInTheDocument();
    expect(screen.getByText('Parte 2 · The New World of Work')).toBeInTheDocument();
    // La unidad actual viene abierta, con las micro-tesis de sus 2 capítulos.
    const micro = screen.getByRole('region', { name: 'Micro-tesis de la unidad 1' });
    fireEvent.change(within(micro).getByLabelText('Micro-tesis del cap. 1'), { target: { value: 'OKR: qué y cómo medirlo.' } });
    fireEvent.click(within(micro).getByRole('button', { name: 'Guardar micro-tesis' }));
    expect(getState().study.microtesis![`${ACT}:1`].texto).toBe('OKR: qué y cómo medirlo.');
    expect(screen.getByRole('region', { name: 'Cierre del libro' })).toHaveTextContent('Por ahora no: primero se lee el libro y después se aplica.');
  });

  it('el test final guarda el resultado con el corte de 85 %', () => {
    render(<TestFinal day={day()} actId={ACT} />);
    expect(screen.getByRole('heading', { name: 'Test final · Measure What Matters' })).toBeInTheDocument();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Una menos' }));
    expect(screen.getByText(/Aprobado · el corte es 85/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }));
    expect(getState().study.finales![ACT].aprobadoOn).toBe(D0);
  });
});
