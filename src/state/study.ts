import { scheduleApproved, scheduleLearned, scheduleRetest, approves, unitState } from '../data/study';
import type { Activity, CardDraft, ErrType, StudyState, Tesis, Tramo } from '../data/study-types';
import { newId } from '../data/schedule';
import { getState, setState, updateDay } from './store';

function updateStudy(fn: (st: StudyState) => StudyState) {
  setState((s) => ({ ...s, study: fn(s.study) }));
}

const findAct = (id: string) => getState().study.activities.find((a) => a.id === id);

/** Marca un paso de estudio como hecho en el día. */
export function markStep(date: string, ref: string) {
  updateDay(date, (d) => ((d.studyDone ?? []).includes(ref) ? d : { ...d, studyDone: [...(d.studyDone ?? []), ref] }));
}

export function unmarkStep(date: string, ref: string) {
  updateDay(date, (d) => ({ ...d, studyDone: (d.studyDone ?? []).filter((r) => r !== ref) }));
}

export function logStudy(date: string, activityId: string, min: number) {
  if (min <= 0) return;
  const a = findAct(activityId);
  const front = a?.front ?? 'repaso';
  updateDay(date, (d) => ({ ...d, study: [...(d.study ?? []), { front, activityId, min }] }));
}

/** Repaso hecho (cold recall, ejercicios, examen corto o tesis). */
export function completeReview(date: string, itemId: string) {
  updateStudy((st) => ({ ...st, reviews: st.reviews.map((r) => (r.id === itemId ? { ...r, doneOn: date } : r)) }));
  markStep(date, `rev:${itemId}`);
}

export function uncompleteReview(date: string, itemId: string) {
  updateStudy((st) => ({ ...st, reviews: st.reviews.map((r) => (r.id === itemId ? { ...r, doneOn: undefined } : r)) }));
  unmarkStep(date, `rev:${itemId}`);
}

/** Aprender hecho: la unidad queda aprendida hoy y el cold recall se agenda para mañana. */
export function completeLearn(date: string, activityId: string, n?: number) {
  const a = findAct(activityId);
  if (!a) return;
  const ref = `learn:${a.id}:${n ?? ''}`;
  if ((getState().days[date]?.studyDone ?? []).includes(ref)) return;
  const unit = n != null ? a.units?.find((u) => u.n === n) : undefined;
  const first = unit ? !unitState(getState().study, a.id, unit.n).learnedOn : true;
  updateStudy((st) => {
    const units = { ...st.units };
    if (unit) {
      const cur = units[a.id]?.[unit.n] ?? { tests: [] };
      units[a.id] = { ...units[a.id], [unit.n]: { ...cur, learnedOn: cur.learnedOn ?? date } };
    }
    const activities = unit ? st.activities : st.activities.map((x) => (x.id === a.id ? { ...x, progress: Math.min(x.total, x.progress + x.perSession) } : x));
    return { ...st, units, activities, reviews: first ? [...st.reviews, ...scheduleLearned(a, unit, date)] : st.reviews };
  });
  markStep(date, ref);
}

/** Guarda un test. Aprobado: tesis a +3 y repasos a +7, +21, +60. Si no, re-test en 2 días. */
export function saveTest(date: string, activityId: string, n: number, data: { score: number; total: number; errors: Record<ErrType, number>; mode: 'app' | 'papel'; perEx?: (ErrType | null)[] }) {
  const a = findAct(activityId);
  const unit = a?.units?.find((u) => u.n === n);
  if (!a || !unit) return false;
  const approved = approves(data.score, data.total, data.errors);
  updateStudy((st) => {
    const cur = st.units[a.id]?.[n] ?? { tests: [] };
    const next = { ...cur, learnedOn: cur.learnedOn ?? date, tests: [...cur.tests, { ...data, date, approved }], approvedOn: cur.approvedOn ?? (approved ? date : undefined) };
    const reviews = st.reviews.map((r) => (r.activityId === a.id && r.unit === n && r.kind === 'retest' && !r.doneOn ? { ...r, doneOn: date } : r));
    const added = approved
      ? (cur.approvedOn ? [] : scheduleApproved(a, unit, date))
      : [scheduleRetest(a, unit, date)];
    const cold = cur.learnedOn ? [] : scheduleLearned(a, unit, date);
    return { ...st, units: { ...st.units, [a.id]: { ...st.units[a.id], [n]: next } }, reviews: [...reviews, ...added, ...cold] };
  });
  markStep(date, `test:${a.id}:${n}`);
  markStep(date, `learn:${a.id}:${n}`);
  return approved;
}

/** Guarda la tesis (se abre desde el repaso del día en que vence) y sus tarjetas. */
export function saveTesis(date: string, itemId: string, t: Omit<Tesis, 'itemId' | 'savedOn' | 'activityId' | 'unit'>, cards: CardDraft[]) {
  const item = getState().study.reviews.find((r) => r.id === itemId);
  if (!item) return;
  const a = findAct(item.activityId);
  const deck = getState().study.fronts.find((f) => f.id === a?.front)?.name ?? 'General';
  updateStudy((st) => ({
    ...st,
    tesis: [...st.tesis.filter((x) => x.itemId !== itemId), { ...t, itemId, activityId: item.activityId, unit: item.unit, savedOn: date }],
    cards: [...st.cards, ...cards.map((c) => ({ ...c, id: `c${newId()}`, deck, source: item.label.replace(/^Tesis · /, ''), createdOn: date }))],
  }));
  completeReview(date, itemId);
}

export function saveActivity(a: Activity) {
  updateStudy((st) => ({
    ...st,
    activities: st.activities.some((x) => x.id === a.id) ? st.activities.map((x) => (x.id === a.id ? a : x)) : [...st.activities, a],
  }));
}

export function deleteActivity(id: string) {
  updateStudy((st) => ({ ...st, activities: st.activities.filter((a) => a.id !== id) }));
}

export function addFront(name: string, color: StudyState['fronts'][number]['color']) {
  const id = `f${newId()}`;
  updateStudy((st) => ({ ...st, fronts: [...st.fronts, { id, name, color }] }));
  return id;
}

/** Efecto de terminar un tramo de la sesión. */
export function tramoDone(date: string, t: Tramo, isLastLearn: boolean) {
  if (t.ref.startsWith('rev:') && t.kind !== 'tesis') completeReview(date, t.ref.slice(4));
  if (t.kind === 'capitulo' && isLastLearn) {
    const [, act, n] = t.ref.split(':');
    completeLearn(date, act, n ? Number(n) : undefined);
  }
}
