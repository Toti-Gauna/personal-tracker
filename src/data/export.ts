import { bimestreDelPlan, enPlan, etapas, semanaDelPlan } from './plan';
import { bimester, dayNumber, mejoraAcumulada, mejoraAyer } from './derive';
import { blockDone, mejoraDia, round } from './mejora';
import type { TrainState } from './train-types';
import type { ClippingState } from './clipping-state';
import { mesDe as mesClipDe } from './clipping';
import { ingresoMes, totales } from './clipping-metricas';
import type { DayLog, Settings } from './types';

/** JSON del día: lo que se pega y se commitea en data/days/AAAA-MM-DD.json. */
export function dayJson(day: DayLog, settings: Settings, days: Record<string, DayLog>, names: Record<number, string> = {}, train?: Pick<TrainState, 'weights' | 'runs' | 'medidas'>, clipping?: ClippingState) {
  const b = bimester(settings.startDate, day.date, names);
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
      ...(x.rama ? { rama: x.rama } : {}),
      start: x.start,
      min: x.min,
      done: blockDone(x),
      tasks: x.tasks.map((t) => ({ t: t.t, done: t.done })),
    })),
    focus: day.focus.map((f) => ({ block: f.key, plan: f.plan, min: f.focusMin, at: f.at })),
    notes: day.notes,
    ...(day.closed ? { cierre: { at: day.closed.at, score: round(day.closed.score), xp: day.closed.xp, victoria: day.closed.victoria, manana: day.closed.manana } } : {}),
    ...planDelDia(day.date, settings.startDate),
    ...(train ? { salud: saludDelDia(day.date, train) } : {}),
    ...(clipping ? clippingDelDia(day.date, clipping) : {}),
    mejora: {
      hoy: round(mejoraDia(day)),
      ayer: round(mejoraAyer(days, day.date)),
      acumulado: round(mejoraAcumulada(days, day.date), 2),
    },
  };
}

/** Peso, corrida y medidas del día (ola 13); null lo que no se cargó. */
function saludDelDia(date: string, t: Pick<TrainState, 'weights' | 'runs' | 'medidas'>) {
  const peso = t.weights.find((w) => w.date === date);
  const run = t.runs.find((r) => r.date === date);
  const m = t.medidas.find((x) => x.date === date);
  return {
    peso: peso ? peso.kg : null,
    corrida: run ? { min: run.min, km: run.km ?? null, tipo: run.kind, sensacion: run.feel } : null,
    medidas: m ? { cintura: m.cintura ?? null, pecho: m.pecho ?? null, brazo: m.brazo ?? null } : null,
  };
}

/** Plan T+18 en el JSON del día: semana, bimestre y la etapa de cada rama. */
function planDelDia(date: string, t0: string) {
  if (!enPlan(date, t0)) return {};
  const b = bimestreDelPlan(date, t0);
  return {
    plan: {
      semana: semanaDelPlan(date, t0),
      bimestre: { n: b.n, semana: b.semana, semanas: b.semanas },
      ramas: Object.fromEntries(etapas(date, t0).map((e) => [e.rama, { etapa: e.titulo, lado: e.lado }])),
    },
  };
}

/** Ola 23: lo del clipping de ese día (solo si cargaste algo) y lo cobrado en el mes del roadmap. */
function clippingDelDia(date: string, c: ClippingState) {
  const fs = c.registro.filter((f) => f.fecha === date);
  if (!fs.length) return {};
  const t = totales(fs);
  const n = mesClipDe(date);
  return { clipping: { clips: t.clips, views: t.views, cobrado: Math.round(t.cobrado * 100) / 100, ...(n >= 1 && n <= 12 ? { mes: n, cobradoMes: ingresoMes(c, n) } : {}) } };
}
