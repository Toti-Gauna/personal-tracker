import { describe, expect, it } from 'vitest';
import { emptyTrain } from './train-catalog';
import { esSemanaA, exercisesMin, ficha, history, isDeloadWeek, nextTarget, opcionesDia, pace, pasaDelLimite, plannedFor, recordsFor, rutinaDelDia, seriesPorGrupo, stalls, tempoTexto, totalMin, trainingMin, volume, warmMin, type Hist } from './train';
import type { Exercise, SetLog, TrainSession } from './train-types';

const ex = (kind: Exercise['kind'], sets = 3, lo = 8, hi = 10): Exercise => ({ id: 'e', name: 'E', sets, repMin: lo, repMax: hi, rest: 120, kind });
const h = (kg: number, ...reps: number[]): Hist => ({ date: '2026-11-01', kg, reps });
const sess = (date: string, who: 'me' | 'partner', exId: string, kg: number, reps: number[], deload = false): TrainSession => ({
  id: date + who, date, routineId: 'legs', routineName: 'Piernas', minutes: 60, athletes: [who], deload, note: '', skipped: [], records: [],
  sets: reps.map((r, i) => ({ ex: exId, who, i: i + 1, kg, reps: r })),
});

describe('doble progresión', () => {
  it('sin historial: pide elegir el peso y arranca en el mínimo', () => {
    expect(nextTarget([], ex('torso'), [8, 10])).toMatchObject({ kg: 0, reps: [8, 8, 8], kind: 'nuevo' });
  });

  it('suma una repetición en la serie más baja, sin pasar el tope', () => {
    const t = nextTarget([h(100, 8, 8, 7, 7)], ex('pierna', 4, 6, 8), [6, 8]);
    expect(t).toMatchObject({ kg: 100, reps: [8, 8, 8, 7], kind: 'rep' });
    expect(nextTarget([h(80, 8, 8, 8)], ex('torso'), [8, 10]).reps).toEqual([9, 8, 8]);
  });

  it('con una repetición para subir: "falta 1 rep"', () => {
    const t = nextTarget([h(100, 8, 8, 8, 7)], ex('pierna', 4, 6, 8), [6, 8]);
    expect(t).toMatchObject({ kg: 100, reps: [8, 8, 8, 8], kind: 'falta', note: 'falta 1 rep para subir' });
  });

  it('al tope en todas las series sube el peso (+5 piernas, +2,5 torso, +1 aislamiento) y vuelve al mínimo', () => {
    expect(nextTarget([h(100, 8, 8, 8, 8)], ex('pierna', 4, 6, 8), [6, 8])).toMatchObject({ kg: 105, reps: [6, 6, 6, 6], kind: 'sube', note: 'sube de 100 kg' });
    expect(nextTarget([h(80, 10, 10, 10)], ex('torso'), [8, 10])).toMatchObject({ kg: 82.5, reps: [8, 8, 8] });
    expect(nextTarget([h(29, 12, 12, 12)], ex('aislamiento', 3, 12, 12), [12, 12])).toMatchObject({ kg: 30, reps: [12, 12, 12] });
  });

  it('estancado: 2 sesiones iguales se mantiene y 3 baja un 10 %', () => {
    const e = ex('aislamiento', 3, 12, 12);
    expect(stalls([h(45, 12, 12, 11), h(45, 12, 12, 11)])).toBe(1);
    expect(nextTarget([h(45, 12, 12, 11), h(45, 12, 12, 11)], e, [12, 12])).toMatchObject({ kg: 45, kind: 'mantiene', note: 'se mantiene · 2.ª igual' });
    const t = nextTarget([h(45, 12, 12, 11), h(45, 12, 12, 11), h(45, 12, 11, 11)], e, [12, 12]);
    expect(t).toMatchObject({ kg: 40.5, reps: [12, 12, 12], kind: 'baja' });
  });

  it('mejorar o subir de peso reinicia el conteo', () => {
    expect(stalls([h(45, 12, 11, 11), h(45, 12, 12, 11)])).toBe(0);
    expect(stalls([h(40, 12, 12, 12), h(45, 12, 12, 12), h(45, 12, 12, 12)])).toBe(1);
  });

  it('la semana de descarga mantiene el peso con la mitad de las series', () => {
    const t = nextTarget([h(100, 8, 8, 8, 7)], ex('pierna', 4, 6, 8), [6, 8], true);
    expect(t).toMatchObject({ kg: 100, kind: 'descarga' });
    expect(t.reps).toHaveLength(2);
  });

  it('cada uno tiene su rango: Toti 6-8 y Abi 8-10', () => {
    const e = ex('pierna', 4, 6, 8);
    expect(nextTarget([h(52.5, 10, 10, 9, 8)], e, [8, 10]).reps).toEqual([10, 10, 9, 9]);
    expect(nextTarget([h(100, 8, 8, 8, 7)], e, [6, 8]).reps).toEqual([8, 8, 8, 8]);
  });
});

describe('semanas de descarga, récords y volumen', () => {
  it('descarga cada 6 semanas desde el primer entreno', () => {
    const ss = [sess('2026-11-09', 'me', 'e', 100, [8])];
    expect(isDeloadWeek(ss, '2026-11-16')).toBe(false);
    expect(isDeloadWeek(ss, '2026-12-14')).toBe(true); // semana 6
    expect(isDeloadWeek(ss, '2026-12-21')).toBe(false);
    expect(isDeloadWeek([], '2026-12-14')).toBe(false);
  });

  it('la descarga no cuenta en el historial', () => {
    const ss = [sess('2026-11-09', 'me', 'e', 100, [8, 8, 8]), sess('2026-12-14', 'me', 'e', 100, [8], true)];
    expect(history(ss, 'me', 'e')).toHaveLength(1);
  });

  it('récord por peso o por repeticiones con el mismo peso', () => {
    const prev = [sess('2026-11-09', 'me', 'sent', 97.5, [8, 8, 8]), sess('2026-11-09', 'partner', 'prensa', 90, [10, 10, 10])];
    const hoy: SetLog[] = [
      { ex: 'sent', who: 'me', i: 1, kg: 100, reps: 8 },
      { ex: 'prensa', who: 'partner', i: 1, kg: 90, reps: 12 },
      { ex: 'nuevo', who: 'me', i: 1, kg: 50, reps: 10 },
    ];
    const r = recordsFor(prev, hoy, { sent: 'Sentadilla', prensa: 'Prensa' });
    expect(r.map((x) => x.text)).toEqual(['+2,5 kg contra la mejor marca', '+2 repeticiones con el mismo peso']);
  });

  it('volumen en kg movidos', () => {
    const sets: SetLog[] = [{ ex: 'a', who: 'me', i: 1, kg: 100, reps: 8 }, { ex: 'a', who: 'partner', i: 1, kg: 50, reps: 10 }];
    expect(volume(sets, 'me')).toBe(800);
    expect(volume(sets)).toBe(1300);
  });
});

describe('rutinas y semana', () => {
  const t = emptyTrain();
  it('Legs A: 10 min de calentamiento, 60 de ejercicios y 130 con las dos caminatas de 30', () => {
    const legs = t.routines.find((r) => r.id === 'legs-a')!;
    expect(warmMin(legs)).toBe(10);
    expect(exercisesMin(legs)).toBe(60);
    expect(trainingMin(legs)).toBe(70);
    expect(totalMin(legs)).toBe(130);
    expect(pasaDelLimite(legs)).toBe(false);
  });

  it('una rutina que pasa de las 2 h de entrenamiento avisa', () => {
    const larga = { ...t.routines.find((r) => r.id === 'legs-a')!, exercises: Array.from({ length: 12 }, (_, i) => ({ ...t.routines[0].exercises[0], id: `x${i}`, sets: 4, rest: 180 })) };
    expect(trainingMin(larga)).toBeGreaterThan(120);
    expect(pasaDelLimite(larga)).toBe(true);
  });

  it('ritmo de peso por semana', () => {
    expect(pace([{ date: '2026-09-13', kg: 86 }])).toBeNull();
    const p = pace([{ date: '2026-09-13', kg: 86 }, { date: '2026-11-08', kg: 88.4 }])!;
    expect(p.change).toBeCloseTo(2.4);
    expect(p.perWeek).toBeCloseTo(0.3, 1);
  });
});

describe('ola 19 · las rutinas de Toti', () => {
  const t = emptyTrain();
  const ids = (r: { exercises: { id: string }[] }) => r.exercises.map((e) => e.id);

  it('hay seis rutinas suyas (Push, Pull y Legs en A y B), Upper y Lower, y las de la ola 5 ya no están entre las vivas', () => {
    const suyas = t.routines.filter((r) => r.slot && r.variante);
    expect(suyas.map((r) => r.name)).toEqual(['Push A', 'Pull A', 'Push B', 'Pull B', 'Legs A', 'Legs B']);
    expect(suyas.map((r) => r.exercises.length)).toEqual([6, 9, 6, 7, 7, 7]);
    expect(t.routines.filter((r) => r.slot && !r.variante).map((r) => [r.id, r.exercises.length])).toEqual([['upper', 8], ['lower', 8]]);
    expect(t.routines.map((r) => r.id).slice(-1)).toEqual(['full']);
    expect(t.v).toBe(3);
  });

  it('la semana es PPL + Upper/Lower de lunes a viernes; sábado y domingo, libres', () => {
    expect(t.plan.days).toEqual(['pull', 'legs', 'push', 'upper', 'lower', null, null]);
    const semana = (lunes: string) => [0, 1, 2, 3, 4, 5, 6].map((i) => { const p = plannedFor(t, `2026-${lunes}`.replace(/\d+$/, String(Number(lunes.slice(3)) + i).padStart(2, '0'))); return p.routine?.name ?? (p.libre ? 'libre' : '?'); });
    expect(semana('11-16')).toEqual(['Pull A', 'Legs A', 'Push A', 'Upper', 'Lower', 'libre', 'libre']);
  });

  it('A y B se alternan por semana: impares del plan, A; pares, B', () => {
    expect(esSemanaA('2026-11-16')).toBe(true); // semana 1
    expect(esSemanaA('2026-11-22')).toBe(true);
    expect(esSemanaA('2026-11-23')).toBe(false); // semana 2
    expect(esSemanaA('2026-11-30')).toBe(true);
    expect(esSemanaA('2026-11-09')).toBe(false); // la semana anterior al plan
    expect(rutinaDelDia(t.routines, 'pull', '2026-11-23')?.name).toBe('Pull B');
    expect(rutinaDelDia(t.routines, 'pull', '2026-11-30')?.name).toBe('Pull A');
    expect(rutinaDelDia(t.routines, 'upper', '2026-11-30')?.name).toBe('Upper');
    expect(rutinaDelDia(t.routines, 'push-b', '2026-11-30')?.name).toBe('Push B'); // un id directo no se alterna
    expect(rutinaDelDia(t.routines, null, '2026-11-30')).toBeNull();
    // Con otro T0 la cuenta arranca ahí.
    expect(esSemanaA('2026-11-23', '2026-11-23')).toBe(true);
  });

  it('cada rutina lleva calentamiento, RIR por serie y los músculos para estirar', () => {
    for (const r of t.routines.filter((x) => x.slot && x.variante)) {
      expect(r.calentamiento!.length).toBeGreaterThan(0);
      expect(r.estiramiento!.musculos).toBeTruthy();
      for (const e of r.exercises) if (e.rir) expect(e.rir).toHaveLength(e.sets);
    }
    const pullA = t.routines.find((r) => r.id === 'pull-a')!;
    const dom = pullA.exercises[0];
    expect(dom).toMatchObject({ name: 'Dominada con agarre neutro', rir: [2, 1, 0], tempo: '2-1-2', pesoInicial: 40, corporal: true, repMin: 8, repMax: 12 });
    expect(dom.posicion).toMatch(/agarre neutro/i);
    // Los pesos entre paréntesis salieron del nombre y son el peso inicial.
    expect(pullA.exercises.map((e) => e.name).join(' ')).not.toMatch(/\(\d+ ?kg/);
    expect(pullA.exercises.find((e) => e.id === 'encogimiento')).toMatchObject({ pesoInicial: 10, tempo: '2-2-2' });
    expect(pullA.exercises.find((e) => e.id === 'curl-barra-banco')!.pesoInicial).toBe(10);
    // "Wrist extension" trabaja los extensores.
    expect(pullA.exercises.find((e) => e.id === 'wrist-extension')!.musculos).toBe('Extensores del antebrazo');
    expect(t.routines.find((r) => r.id === 'pull-b')!.exercises.find((e) => e.id === 'wrist-extension')!.musculos).toBe('Extensores del antebrazo');
    // "Abi" era una anotación, no un RIR: ningún RIR sale de ahí.
    expect(JSON.stringify(t.routines)).not.toMatch(/Abi/);
  });

  it('el mismo ejercicio en A y B comparte id (y su historial)', () => {
    const a = ids(t.routines.find((r) => r.id === 'pull-a')!);
    const b = ids(t.routines.find((r) => r.id === 'pull-b')!);
    expect(a.filter((x) => b.includes(x))).toEqual(['encogimiento', 'curl-bayesian', 'wrist-extension', 'abs-polea']);
  });

  it('el peso inicial manda cuando no hay historial; sin él, a elegir; en peso corporal, sin peso', () => {
    const pull = t.routines.find((r) => r.id === 'pull-a')!;
    expect(nextTarget([], pull.exercises[0], [8, 12])).toMatchObject({ kg: 40, kind: 'nuevo', note: 'arrancá con 40 kg' });
    expect(nextTarget([], pull.exercises[1], [10, 12])).toMatchObject({ kg: 0, note: 'elegí tu peso' });
    const legsB = t.routines.find((r) => r.id === 'pull-b')!;
    const hang = legsB.exercises.find((e) => e.id === 'dead-hang')!;
    expect(nextTarget([], hang, [30, 60])).toMatchObject({ kg: 0, note: 'peso corporal', reps: [30, 30, 30] });
    expect(hang).toMatchObject({ unidad: 's', corporal: true, repMin: 30, repMax: 60 });
  });

  it('la ficha de "Cómo se hace" solo trae lo que el ejercicio dice', () => {
    const hack = t.routines.find((r) => r.id === 'legs-a')!.exercises[0];
    const f = Object.fromEntries(ficha(hack));
    expect(f.Tempo).toBe('3-1-2 · 3 s bajando — 1 s de pausa — 2 s subiendo');
    expect(f['RIR por serie']).toBe('2 · 1 · 0 — Última serie: fallo técnico limpio');
    expect(f.Posicionamiento).toMatch(/Espalda apoyada/);
    expect(f.Dropset).toBeUndefined();
    expect(tempoTexto('2-2-3')).toBe('2 s bajando — 2 s de pausa — 3 s subiendo');
    const ext = Object.fromEntries(ficha(t.routines.find((r) => r.id === 'legs-a')!.exercises[1]));
    expect(ext.Dropset).toMatch(/Reducir 25–30 %/);
  });

  it('en el día se elige Pull, Legs o Push una vez (con A y B), no las seis', () => {
    expect(opcionesDia(t.routines).map((o) => [o.id, o.nombre, o.alterna])).toEqual([
      ['push', 'Push', true], ['pull', 'Pull', true], ['legs', 'Legs', true], ['upper', 'Upper', false], ['lower', 'Lower', false], ['full', 'Full body', false],
    ]);
  });

  it('los estiramientos llevan los músculos del día', () => {
    expect(t.routines.find((r) => r.id === 'legs-a')!.estiramiento!.musculos).toBe('cuádriceps, aductores, glúteos y gemelos');
    expect(seriesPorGrupo([t.routines.find((r) => r.id === 'push-a')!])).toMatchObject({ Pecho: 9, Hombros: 3, Tríceps: 3 });
  });
});

describe('ola 19 · Upper y Lower propias', () => {
  const t = emptyTrain();
  const r = (id: string) => t.routines.find((x) => x.id === id)!;
  const ids = (id: string) => r(id).exercises.map((e) => e.id);
  const UPPER = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'];
  const PIERNA = ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Aductores', 'Gemelos'];
  /** Cuántas rutinas de la semana (lunes a viernes) trabajan cada grupo, con la A o con la B. */
  const sesiones = (v: 'A' | 'B') => {
    const dia = (slot: string) => (slot === 'upper' || slot === 'lower' ? r(slot) : r(`${slot}-${v.toLowerCase()}`));
    const out: Record<string, number> = {};
    for (const rr of ['pull', 'legs', 'push', 'upper', 'lower'].map(dia)) for (const g of new Set(rr.exercises.map((e) => e.grupo!))) out[g] = (out[g] ?? 0) + 1;
    return out;
  };
  const series = (v: 'A' | 'B') => {
    const dia = (slot: string) => (slot === 'upper' || slot === 'lower' ? r(slot) : r(`${slot}-${v.toLowerCase()}`));
    return seriesPorGrupo(['pull', 'legs', 'push', 'upper', 'lower'].map(dia));
  };

  it('Upper es el jueves y Lower el viernes, con tu estilo: tempo 2-1-2, RIR 2-1-0 y 8 a 12 repeticiones', () => {
    expect(r('upper').exercises.every((e) => e.tempo === '2-1-2')).toBe(true);
    expect(r('upper').exercises.filter((e) => e.sets === 3).every((e) => e.rir!.join('') === '210')).toBe(true);
    expect(r('upper').exercises.filter((e) => e.kind === 'torso').every((e) => e.repMin === 8 && e.repMax === 12)).toBe(true);
    expect(r('lower').exercises.every((e) => e.rir!.length === e.sets && e.rir![e.rir!.length - 1] === 0)).toBe(true);
    expect(plannedFor(t, '2026-11-19').routine?.name).toBe('Upper');
    expect(plannedFor(t, '2026-11-20').routine?.name).toBe('Lower');
  });

  it('otros ángulos: Upper no repite ningún ejercicio de Push ni de Pull; Lower solo repite la extensión y los aductores', () => {
    const ppl = ['push-a', 'push-b', 'pull-a', 'pull-b'].flatMap(ids);
    expect(ids('upper').filter((x) => ppl.includes(x))).toEqual([]);
    const legs = ['legs-a', 'legs-b'].flatMap(ids);
    expect(ids('lower').filter((x) => legs.includes(x))).toEqual(['extension-cuadriceps', 'aductores']);
  });

  it('cada músculo del torso se entrena dos veces por semana, con la A o con la B', () => {
    for (const v of ['A', 'B'] as const) for (const g of UPPER) expect(sesiones(v)[g], `${g} en la semana ${v}`).toBeGreaterThanOrEqual(2);
  });

  it('cada músculo de la pierna se entrena todas las semanas y dos veces al alternar Legs A o B con Lower', () => {
    for (const g of PIERNA) {
      const a = sesiones('A')[g] ?? 0;
      const b = sesiones('B')[g] ?? 0;
      expect(a, `${g} A`).toBeGreaterThanOrEqual(1);
      expect(b, `${g} B`).toBeGreaterThanOrEqual(1);
      expect(Math.max(a, b), `${g}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('el volumen semanal no deja ningún músculo atrás: 6 series o más en los grandes y 3 o más en todos', () => {
    for (const v of ['A', 'B'] as const) {
      const s = series(v);
      for (const g of [...UPPER, 'Cuádriceps', 'Isquiotibiales']) expect(s[g], `${g} ${v}`).toBeGreaterThanOrEqual(6);
      expect(Object.entries(s).filter(([, n]) => n < 3)).toEqual([]);
    }
  });

  it('Upper y Lower entran en las dos horas del bloque y llevan calentamiento y estiramiento', () => {
    for (const id of ['upper', 'lower']) {
      expect(pasaDelLimite(r(id))).toBe(false);
      expect(r(id).calentamiento!.length).toBeGreaterThan(0);
      expect(r(id).estiramiento!.musculos).toBeTruthy();
    }
  });
});
