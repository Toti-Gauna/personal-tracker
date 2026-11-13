import { useMemo } from 'react';
import { BLOCKS } from '../data/defaults';
import { activitiesFor, dailyReview, groupSteps, planActivity, planReview, sumMin, type PlanStep } from '../data/study';
import type { Activity, ReviewItem, Tramo } from '../data/study-types';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';

export interface Contenido {
  id: string;
  activity?: Activity;
  title: string;
  front: string;
  color: string;
  blockKey: string;
  start?: string;
  end?: string;
  tramos: Tramo[];
  steps: PlanStep[];
  total: number;
  done: (s: PlanStep) => boolean;
  falta: number;
}

/** El plan de estudio del día: contenidos, pasos y lo que no toca. */
export function useStudyPlan(day: DayLog) {
  const study = useStore((s) => s.study);
  const settings = useStore((s) => s.settings)!;
  return useMemo(() => {
    const date = day.date;
    const daily = dailyReview(study, date);
    const { today: review, skipped, groups } = daily;
    const doneRefs = new Set(day.studyDone ?? []);
    const cardsDone = new Set(groups.filter((g) => g.pending.length === 0).map((g) => `cards:${g.frontId}`));
    const isDone = (s: PlanStep) => doneRefs.has(s.ref) || cardsDone.has(s.ref);
    const frontOf = (id: string) => study.fronts.find((f) => f.id === id);
    const contenidos: Contenido[] = [];
    if (review.length || groups.length) {
      const tramos = planReview(review, study, groups);
      const steps = groupSteps(tramos);
      contenidos.push({
        id: 'repaso', title: 'Repaso del día', front: 'Repaso · todos', color: 'economia', blockKey: blockOfReview(review, study.activities),
        tramos, steps, total: sumMin(tramos), done: isDone, falta: sumMin(steps.filter((s) => !isDone(s))),
      });
    }
    for (const a of activitiesFor(study, date)) {
      const block = day.blocks.find((b) => b.key === a.block) ?? BLOCKS.find((b) => b.key === a.block);
      const blockMin = block && 'min' in block ? block.min : 60;
      const tramos = planActivity(a, { study, date, blockMin, presets: settings.presets, blockPresets: settings.blockPresets, review, groups });
      const steps = groupSteps(tramos);
      const f = frontOf(a.front);
      const start = day.blocks.find((b) => b.key === a.block)?.start;
      contenidos.push({
        id: a.id, activity: a, title: a.title, front: f?.name ?? a.front, color: f?.color ?? 'ing', blockKey: a.block,
        start, end: start ? addMin(start, blockMin) : undefined,
        tramos, steps, total: sumMin(tramos), done: isDone, falta: sumMin(steps.filter((s) => !isDone(s))),
      });
    }
    // Pasos únicos: el repaso de cada actividad ya figura dentro del Repaso del día.
    const unique = new Map<string, PlanStep>();
    for (const c of contenidos) for (const s of c.steps) unique.set(s.ref, s);
    const all = [...unique.values()];
    return {
      contenidos,
      review,
      skipped,
      daily,
      stepsTotal: all.length,
      stepsDone: all.filter(isDone).length,
      falta: sumMin(all.filter((s) => !isDone(s))),
      total: sumMin(all),
    };
  }, [study, settings, day]);
}

const addMin = (hhmm: string, m: number) => {
  const [h, mm] = hhmm.split(':').map(Number);
  const t = h * 60 + mm + m;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

function blockOfReview(review: ReviewItem[], acts: Activity[]) {
  return acts.find((a) => a.id === review[0]?.activityId)?.block ?? 'math';
}

/** Tarjetas y repasos pendientes de hoy, para el contador de la barra. */
export function usePendientes(date: string) {
  const study = useStore((s) => s.study);
  return useMemo(() => {
    const d = dailyReview(study, date);
    return d.groups.reduce((s, g) => s + g.pending.length, 0) + [...d.today, ...d.tesis].filter((r) => r.doneOn !== date).length;
  }, [study, date]);
}
