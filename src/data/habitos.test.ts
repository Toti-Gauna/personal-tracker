import { describe, expect, it } from 'vitest';
import { HABITOS, diaIso, estadoHabitos, tocaHabito } from './habitos';
import type { DayLog } from './types';

const dia = (date: string, hechos: string[]): DayLog => ({
  date, wake: '04:00', routine: 'completo', notes: [], focus: [],
  blocks: hechos.map((key, n) => ({ key, n, title: key, short: key, area: 'ing', kind: 'fixed', start: '16:00', min: 15, fixed: true, tasks: [], hecho: { at: '16:15' } })),
} as unknown as DayLog);

describe('v12.1 · hábitos como rachas', () => {
  it('los cinco del plan, con sus días: recall y Anki diarios, post martes y jueves, demo sábado, revisión domingo', () => {
    expect(HABITOS.map((h) => [h.id, h.cuando])).toEqual([['recall', 'diario'], ['anki', 'diario'], ['post', [2, 4]], ['demo', [6]], ['revision', [7]]]);
    expect(diaIso('2026-11-23')).toBe(1); // lunes
    expect(diaIso('2026-11-22')).toBe(7); // domingo
    const post = HABITOS.find((h) => h.id === 'post')!;
    expect(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'].map((f) => tocaHabito(post, f))).toEqual([false, true, false, true]);
  });

  it('la racha cuenta solo los días que toca; hoy sin hacer no la corta, ayer sin hacer sí', () => {
    const days = { '2026-11-21': dia('2026-11-21', ['recall', 'demo']), '2026-11-22': dia('2026-11-22', ['recall']), '2026-11-23': dia('2026-11-23', ['recall']), '2026-11-24': dia('2026-11-24', ['post']) };
    const e = Object.fromEntries(estadoHabitos(days, '2026-11-24').map((x) => [x.habito.id, x]));
    expect(e.recall.racha).toBe(3); // 21, 22 y 23; el 24 todavía no
    expect(e.recall.hoy).toEqual({ toca: true, hecho: false });
    expect(e.post.racha).toBe(1);
    expect(e.demo.racha).toBe(1); // el sábado 21; domingo a martes no tocaba
    expect(e.revision.racha).toBe(0); // el domingo 22 no se hizo
    expect(e.post.semana.map((d) => d.hecho)).toEqual([null, true, null, false, null, null, null]);
    expect(estadoHabitos(days, '2026-11-25').find((x) => x.habito.id === 'recall')!.racha).toBe(0);
  });
});
