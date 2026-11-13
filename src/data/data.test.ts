import { describe, expect, it } from 'vitest';
import { BUILTIN_PRESETS, DEFAULT_PRESETS } from './defaults';
import { dayJson } from './export';
import { extend, focusIndex, pause, restNow, resume, segRemaining, startFocus, tick } from './focus';
import { acumulado, mejoraDia } from './mejora';
import { fitPreset, focusMinutes, planLabel, totalMinutes } from './pomodoro';
import { buildBlocks, currentBlock, planDay, remainingMin } from './schedule';
import { fmtDur, toMin } from './time';
import type { DayLog, Settings } from './types';

const preset = (id: string) => [...BUILTIN_PRESETS, ...DEFAULT_PRESETS].find((p) => p.id === id)!;

describe('pomodoros que entran justos', () => {
  it.each([
    ['b-50-10', '50/10 + 30', 80],
    ['b-80-10', '80/10', 80],
    ['b-25-5', '25/5 × 3', 75],
    ['b-corrido', '90 corrido', 90],
    ['p-prog', '50/10 + 30', 80],
  ])('%s en 90 min → %s', (id, label, foco) => {
    const segs = fitPreset(preset(id), 90);
    expect(planLabel(segs)).toBe(label);
    expect(focusMinutes(segs)).toBe(foco);
    expect(totalMinutes(segs)).toBe(90);
  });

  it('el sobrante chico se suma al descanso', () => {
    const segs = fitPreset(preset('b-50-10'), 65);
    expect(totalMinutes(segs)).toBe(65);
    expect(segs).toEqual([{ type: 'focus', min: 50 }, { type: 'rest', min: 15 }]);
  });

  it('usa el descanso largo al final de los ciclos', () => {
    const segs = fitPreset(preset('p-clasico'), 140);
    expect(segs.slice(0, 8).map((s) => s.min)).toEqual([25, 5, 25, 5, 25, 5, 25, 25]);
    expect(totalMinutes(segs)).toBe(140);
  });
});

describe('metas del día', () => {
  it('8 metas de lunes a viernes, con lo que quedó de ayer sumado a su bloque', () => {
    const blocks = buildBlocks(planDay('2026-11-11', 'completo'), { prog: ['Commit de lo avanzado'] });
    expect(blocks.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(blocks.find((b) => b.key === 'prog')!.tasks).toHaveLength(4);
  });

  it('bloque en curso y lo que le queda', () => {
    const blocks = buildBlocks(planDay('2026-11-11', 'completo'));
    const cur = currentBlock(blocks, toMin('07:00'))!;
    expect(cur.key).toBe('prog');
    expect(fmtDur(remainingMin(cur, toMin('07:00')))).toBe('1 h 30');
  });
});

describe('motor del foco', () => {
  const segs = fitPreset(preset('b-50-10'), 90);
  const t0 = 1_000_000;
  const M = 60000;

  it('avanza tramos, aun después de cerrar la app', () => {
    const s = startFocus('2026-11-11', 'prog', '50/10 + 30', segs, t0);
    const r = tick(s, t0 + 61 * M);
    expect(r.state.i).toBe(2);
    expect(r.ended.map((x) => x.type)).toEqual(['focus', 'rest']);
    expect(segRemaining(r.state, t0 + 61 * M)).toBe(29 * M);
    expect(tick(s, t0 + 91 * M).finished).toBe(true);
  });

  it('la pausa congela el tiempo', () => {
    let s = startFocus('d', 'k', 'p', segs, t0);
    s = pause(s, t0 + 10 * M);
    expect(tick(s, t0 + 100 * M).ended).toHaveLength(0);
    s = resume(s, t0 + 30 * M);
    expect(segRemaining(s, t0 + 30 * M)).toBe(40 * M);
  });

  it('descanso ahora, foco n de m y +10 min', () => {
    let s = startFocus('d', 'k', 'p', segs, t0);
    expect(focusIndex(s)).toEqual({ n: 1, m: 2 });
    s = restNow(s, t0 + 20 * M);
    expect(s.segs[s.i].type).toBe('rest');
    expect(s.segs[0].min).toBe(20);
    s = extend(s, 10, t0 + 30 * M);
    expect(s.segs[s.i]).toEqual({ type: 'focus', min: 10 });
  });
});

describe('mejora y JSON del día', () => {
  const blocks = buildBlocks(planDay('2026-11-11', 'completo'));
  blocks[0].tasks.forEach((t) => (t.done = true));
  blocks[1].tasks.forEach((t) => (t.done = true));
  const day: DayLog = { date: '2026-11-11', wake: '04:00', routine: 'completo', blocks, notes: ['idea'], focus: [] };

  it('hasta 1 % repartido entre las 8 metas', () => {
    expect(mejoraDia(day)).toBe(0.25);
    expect(acumulado([1, 1])).toBeCloseTo(2.01);
  });

  it('exporta el día con la mejora comparada con ayer', () => {
    const ayer: DayLog = { ...day, date: '2026-11-10', blocks: buildBlocks(planDay('2026-11-11', 'completo')) };
    ayer.blocks[0].tasks.forEach((t) => (t.done = true));
    const settings: Settings = { names: { me: 'T', partner: 'A' }, startDate: '2026-11-08', presets: [], blockPresets: {} };
    const j = dayJson(day, settings, { [day.date]: day, [ayer.date]: ayer });
    expect(j.day).toBe(3);
    expect(j.bimester).toEqual({ n: 1, name: 'El despegue', week: 1 });
    expect(j.blocks).toHaveLength(8);
    expect(j.blocks[0]).toMatchObject({ n: 1, id: 'math', area: 'ing', start: '04:30', done: true });
    expect(j.mejora).toEqual({ hoy: 0.25, ayer: 0.125, acumulado: 0.38 });
  });
});

import { parseCorrection } from './study';
describe('corrección de Claude', () => {
  it('lee el puntaje y el tipo de cada error', () => {
    const r = parseCorrection('17/20\n4: descuido\n11: técnica\nEj. 17 - descuido', 20);
    expect(r.score).toBe(17);
    expect(r.errors).toEqual({ concepto: 0, tecnica: 1, descuido: 2, enunciado: 0 });
    expect(r.perEx[3]).toBe('descuido');
  });
});
