import { bimester, dayNumber, mejoraAcumulada, mejoraAyer } from './derive';
import { blockDone, mejoraDia, round } from './mejora';
import type { DayLog, Settings } from './types';

/** JSON del día: lo que se pega y se commitea en data/days/AAAA-MM-DD.json. */
export function dayJson(day: DayLog, settings: Settings, days: Record<string, DayLog>) {
  const b = bimester(settings.startDate, day.date);
  return {
    date: day.date,
    day: dayNumber(settings.startDate, day.date),
    bimester: { n: b.n, name: b.name, week: b.week },
    wake: day.wake,
    routine: day.routine,
    blocks: day.blocks.map((x) => ({
      n: x.n,
      id: x.key,
      area: x.area,
      start: x.start,
      min: x.min,
      done: blockDone(x),
      tasks: x.tasks.map((t) => ({ t: t.t, done: t.done })),
    })),
    focus: day.focus.map((f) => ({ block: f.key, plan: f.plan, min: f.focusMin, at: f.at })),
    notes: day.notes,
    mejora: {
      hoy: round(mejoraDia(day)),
      ayer: round(mejoraAyer(days, day.date)),
      acumulado: round(mejoraAcumulada(days, day.date), 2),
    },
  };
}
