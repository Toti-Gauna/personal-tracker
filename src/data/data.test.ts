import { describe, expect, it } from 'vitest';
import { BUILTIN_PRESETS, DEFAULT_PRESETS } from './defaults';
import { dayJson } from './export';
import { extend, focusIndex, pause, restNow, resume, segRemaining, startFocus, tick } from './focus';
import { acumulado, mejoraDia } from './mejora';
import { fitPreset, focusMinutes, planLabel, totalMinutes } from './pomodoro';
import { buildBlocks, currentBlock, fitChained, planDay, remainingMin, wakeRange } from './schedule';
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

describe('rutinas del día', () => {
  it('04:00 arma el día completo y 05:00 el corto, con Abi fijo a las 08:30', () => {
    const completo = planDay('completo', '04:00');
    expect(completo.map((p) => p.start).slice(0, 4)).toEqual(['04:00', '04:30', '06:30', '08:30']);
    const corto = planDay('corto', '05:00');
    expect(corto.slice(0, 4).map((p) => [p.start, p.min])).toEqual([['05:00', 20], ['05:20', 90], ['06:50', 100], ['08:30', 90]]);
  });

  it('"Otra hora" corre los bloques y acorta los flexibles hasta el primer fijo', () => {
    for (let w = wakeRange().min; w <= wakeRange().max; w += 10) {
      const d = fitChained(w);
      expect(d.rutina + d.math + d.prog).toBeLessThanOrEqual(toMin('08:30') - w);
      if (w >= toMin('04:00')) expect(d.rutina + d.math + d.prog).toBe(toMin('08:30') - w);
      expect(d.math).toBeGreaterThanOrEqual(45);
      expect(d.prog).toBeGreaterThanOrEqual(45);
      expect(d.rutina).toBeGreaterThanOrEqual(15);
    }
    const plan = planDay('otra', '04:40');
    expect(plan[3].start).toBe('08:30');
    expect(plan[2].start).not.toBe('08:30');
  });

  it('8 metas y 18 tareas, con lo que quedó de ayer sumado a su bloque', () => {
    const blocks = buildBlocks(planDay('completo', '04:00'), { prog: ['Commit de lo avanzado'] });
    expect(blocks.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(blocks.flatMap((b) => b.tasks)).toHaveLength(19);
  });

  it('bloque en curso y lo que le queda', () => {
    const blocks = buildBlocks(planDay('completo', '04:00'));
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
  const blocks = buildBlocks(planDay('completo', '04:00'));
  blocks[0].tasks.forEach((t) => (t.done = true));
  blocks[1].tasks.forEach((t) => (t.done = true));
  const day: DayLog = { date: '2026-11-11', wake: '04:00', routine: 'completo', blocks, notes: ['idea'], focus: [] };

  it('hasta 1 % repartido entre las 8 metas', () => {
    expect(mejoraDia(day)).toBe(0.25);
    expect(acumulado([1, 1])).toBeCloseTo(2.01);
  });

  it('exporta el día con la mejora comparada con ayer', () => {
    const ayer: DayLog = { ...day, date: '2026-11-10', blocks: buildBlocks(planDay('completo', '04:00')) };
    ayer.blocks[0].tasks.forEach((t) => (t.done = true));
    const settings: Settings = { names: { me: 'T', partner: 'A' }, startDate: '2026-11-08', presets: [], blockPresets: {} };
    const j = dayJson(day, settings, { [day.date]: day, [ayer.date]: ayer });
    expect(j.day).toBe(3);
    expect(j.bimester).toEqual({ n: 1, name: 'El despegue', week: 1 });
    expect(j.blocks).toHaveLength(8);
    expect(j.blocks[0]).toMatchObject({ n: 1, id: 'rutina', area: 'rutina', start: '04:00', done: true });
    expect(j.mejora).toEqual({ hoy: 0.25, ayer: 0.125, acumulado: 0.38 });
  });
});
