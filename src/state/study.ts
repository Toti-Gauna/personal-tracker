import { approves, scheduleApproved, scheduleFailed, scheduleLearned, unitName, unitState } from '../data/study';
import { newSrs, review as fsrsReview, type Grade } from '../data/fsrs';
import { MAX_TRIES, RELEER_MIN } from '../data/study-catalog';
import type { Activity, Attempt, Card, CardDraft, ErrType, ReviewItem, Rules, StudyState, Tesis, Tramo } from '../data/study-types';
import { addDays } from '../data/time';
import { newId } from '../data/schedule';
import { getState, setState, updateDay } from './store';
import { logFromStudy } from './ruta';
import { claveMicro, libroPorId, unidadesDe, type TipoArtefacto } from '../data/libros';

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

/** Repaso hecho (releer, ejercicios, examen corto, cold recall o tesis). */
export function completeReview(date: string, itemId: string) {
  updateStudy((st) => ({ ...st, reviews: st.reviews.map((r) => (r.id === itemId ? { ...r, doneOn: date } : r)) }));
  markStep(date, `rev:${itemId}`);
}

export function uncompleteReview(date: string, itemId: string) {
  updateStudy((st) => ({ ...st, reviews: st.reviews.map((r) => (r.id === itemId ? { ...r, doneOn: undefined } : r)) }));
  unmarkStep(date, `rev:${itemId}`);
}

/** Estudiar hecho (día 1): la unidad queda estudiada hoy y mañana van el cold recall y el test. */
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
  if (unit) rutaFromStudy(date, a.id, unit.n, 'learn');
}

/**
 * Guarda un test (día 2). Con 85 % o más: la tesis al día siguiente y repetir los días 8, 22
 * y 61. Con menos: releer lo que falló al día siguiente y re-test al otro. A la tercera vez sin
 * aprobar, el tema queda marcado como flojo y sigue igual a la tesis y los repasos.
 * Los ejercicios que fallaste vuelven mañana como tarjetas.
 */
export function saveTest(date: string, activityId: string, n: number, data: { score: number; total: number; errors: Record<ErrType, number>; mode: 'app' | 'papel'; perEx?: (ErrType | null)[]; wrong?: { q: string; a: string; type: ErrType; tema?: string }[] }) {
  const a = findAct(activityId);
  const unit = a?.units?.find((u) => u.n === n);
  if (!a || !unit) return { approved: false, flojo: false };
  const approved = approves(data.score, data.total);
  const prev = unitState(getState().study, a.id, n);
  const tries = prev.tests.length + 1;
  const flojo = !approved && !prev.approvedOn && !prev.flojo && tries >= MAX_TRIES;
  const deck = getState().study.fronts.find((f) => f.id === a.front)?.name ?? 'General';
  const tomorrow = addDays(date, 1);
  const errCards: Card[] = (data.wrong ?? []).map((w) => ({
    id: `c${newId()}`, front: w.q, back: w.a, kind: 'ejercicio', deck, frontId: a.front, source: `Test · ${unitName(a, unit)}`,
    createdOn: date, activityId: a.id, unit: n, dueFrom: tomorrow,
  }));
  updateStudy((st) => {
    const cur = st.units[a.id]?.[n] ?? { tests: [] };
    const learnedOn = cur.learnedOn ?? date;
    const next = {
      ...cur, learnedOn, tests: [...cur.tests, { ...data, date, approved }],
      approvedOn: cur.approvedOn ?? (approved ? date : undefined), flojo: cur.flojo ?? (flojo ? date : undefined),
    };
    // Se cierran el re-test pendiente y lo que quedó sin hacer antes del test (cold recall, releer).
    const reviews = st.reviews.map((r) => (r.activityId === a.id && r.unit === n && (r.kind === 'retest' || r.kind === 'cold' || r.kind === 'releer') && !r.doneOn ? { ...r, doneOn: date } : r));
    const yaSigue = cur.approvedOn || cur.flojo;
    const added = yaSigue ? [] : approved || flojo ? scheduleApproved(a, unit, date, learnedOn) : scheduleFailed(a, unit, date);
    return { ...st, units: { ...st.units, [a.id]: { ...st.units[a.id], [n]: next } }, reviews: [...reviews, ...added], cards: [...st.cards, ...errCards] };
  });
  markStep(date, `test:${a.id}:${n}`);
  rutaFromStudy(date, a.id, n, 'learn');
  if (approved) rutaFromStudy(date, a.id, n, 'test');
  return { approved, flojo };
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
    cards: [...st.cards, ...cards.map((c) => ({ ...c, id: `c${newId()}`, deck, frontId: a?.front, activityId: item.activityId, unit: item.unit, source: item.label.replace(/^Tesis · /, ''), createdOn: date }))],
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
  // El cold recall y la tesis se cierran en su pantalla; las tarjetas, al calificarlas.
  if (t.ref.startsWith('rev:') && t.kind !== 'tesis' && t.kind !== 'cold') completeReview(date, t.ref.slice(4));
  if (t.kind === 'capitulo' && isLastLearn) {
    const [, act, n] = t.ref.split(':');
    completeLearn(date, act, n ? Number(n) : undefined);
  }
}

// ——— Motor de repaso (ola 3) ———

/** Califica una tarjeta con FSRS y registra el repaso. Si falla 2 veces seguidas, agenda releer. */
export function gradeCard(date: string, cardId: string, grade: Grade, now = Date.now()) {
  const st = getState().study;
  const card = st.cards.find((c) => c.id === cardId);
  if (!card) return;
  const srs = fsrsReview(card.srs ?? newSrs(now), grade, now, st.rules.retention);
  const releer = srs.fails >= 2 && (card.srs?.fails ?? 0) < 2 ? rereadItem(card, date) : null;
  updateStudy((s) => ({
    ...s,
    cards: s.cards.map((c) => (c.id === cardId ? { ...c, srs, firstOn: c.firstOn ?? date } : c)),
    log: [...s.log, { cardId, date, grade }],
    reviews: releer && !s.reviews.some((r) => r.kind === 'releer' && r.label === releer.label && !r.doneOn) ? [...s.reviews, releer] : s.reviews,
  }));
}

function rereadItem(card: Card, date: string): ReviewItem {
  return {
    id: `r${newId()}`,
    activityId: card.activityId ?? 'repaso',
    unit: card.unit,
    kind: 'releer',
    due: addDays(date, 1),
    min: RELEER_MIN,
    label: `Releer · ${card.source || card.deck}`,
  };
}

/**
 * Cold recall: lo comparás punto por punto. Lo que olvidaste vuelve mañana como tarjeta y,
 * con menos del 70 %, el motor agenda releer. Con 85 % o más no hace falta nada más.
 */
export function saveColdRecall(date: string, itemId: string, points: string[], recalled: boolean[], creia?: number) {
  const st = getState().study;
  const item = st.reviews.find((r) => r.id === itemId);
  if (!item) return 0;
  const a = st.activities.find((x) => x.id === item.activityId);
  const score = points.length ? recalled.filter(Boolean).length / points.length : 1;
  const what = item.label.replace(/^Cold recall · /, '');
  const forgotten = score >= st.rules.coldSkipAt ? [] : points.filter((_, i) => !recalled[i]);
  const tomorrow = addDays(date, 1);
  const cards: Card[] = forgotten.map((p) => {
    const [front, back] = p.includes('::') ? p.split('::').map((x) => x.trim()) : [`¿Qué recordás de «${p}»?`, p];
    return {
      id: `c${newId()}`, front, back, kind: 'pregunta', deck: st.fronts.find((f) => f.id === a?.front)?.name ?? 'General',
      frontId: a?.front, source: what, createdOn: date, activityId: item.activityId, unit: item.unit, dueFrom: tomorrow,
    };
  });
  // Con menos del 70 %, releer esas partes del capítulo mañana (además del test de hoy).
  const releer: ReviewItem[] = score < st.rules.rereadBelow
    ? [{ id: `r${newId()}`, activityId: item.activityId, unit: item.unit, kind: 'releer', due: tomorrow, min: RELEER_MIN, label: `Releer · ${what}` }]
    : [];
  const attempt: Attempt = {
    tema: item.unit != null ? `${item.activityId}:${item.unit}` : `mazo:${a?.front ?? 'otros'}`, frontId: a?.front ?? 'otros', kind: 'cold', date, ok: score,
    ...(creia != null ? { creia } : {}), ideas: points.map((p, i) => ({ idea: p.split('::')[0].trim(), ok: !!recalled[i] })),
  };
  updateStudy((s) => ({
    ...s,
    attempts: [...s.attempts.filter((x) => !(x.kind === 'cold' && x.date === date && x.tema === attempt.tema)), attempt],
    points: item.unit != null ? { ...s.points, [`${item.activityId}:${item.unit}`]: points } : s.points,
    reviews: [...s.reviews.map((r) => (r.id === itemId ? { ...r, doneOn: date, score } : r)), ...releer],
    cards: [...s.cards, ...cards],
  }));
  markStep(date, `rev:${itemId}`);
  return score;
}

/** Ejercicios más cortos si el anterior salió perfecto: 2/3 del tiempo (15 → 10 min). */
export const shorter = (min: number) => Math.max(5, Math.round((min * 2) / 3));

/**
 * Ejercicios hechos (cuántos bien de cuántos, si se sabe); si salieron perfectos, el próximo
 * de esa unidad es más corto. Queda el intento para los puntos débiles.
 */
export function completeExercises(date: string, itemId: string, perfect: boolean, de?: [number, number]) {
  const st = getState().study;
  const item = st.reviews.find((r) => r.id === itemId);
  if (!item) return;
  const a = st.activities.find((x) => x.id === item.activityId);
  const attempt: Attempt | null = de && (item.kind === 'ejercicios' || item.kind === 'examen')
    ? { tema: item.unit != null ? `${item.activityId}:${item.unit}` : `mazo:${a?.front ?? 'otros'}`, frontId: a?.front ?? 'otros', kind: 'ejercicio', date, ok: de[1] ? de[0] / de[1] : 0, de }
    : null;
  if (attempt) updateStudy((s) => ({ ...s, attempts: [...s.attempts, attempt] }));
  updateStudy((s) => {
    let shortened = false;
    const reviews = [...s.reviews]
      .sort((x, y) => x.due.localeCompare(y.due))
      .map((r) => {
        if (r.id === itemId) return { ...r, doneOn: date, perfect };
        if (perfect && s.rules.shortenIfPerfect && !shortened && !r.doneOn && r.activityId === item.activityId && r.unit === item.unit && (r.kind === 'ejercicios' || r.kind === 'examen') && r.due > item.due) {
          shortened = true;
          return { ...r, min: shorter(r.min) };
        }
        return r;
      });
    return { ...s, reviews };
  });
  markStep(date, `rev:${itemId}`);
}

export function addCards(date: string, drafts: (CardDraft & { deck: string; frontId?: string; source: string })[]) {
  const cards: Card[] = drafts.map((d) => ({ ...d, id: `c${newId()}`, createdOn: date }));
  updateStudy((s) => ({ ...s, cards: [...s.cards, ...cards] }));
  return cards.length;
}

export function updateCard(id: string, patch: Partial<Pick<Card, 'front' | 'back'>>) {
  updateStudy((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
}

export function setRules(patch: Partial<Rules>) {
  updateStudy((s) => ({ ...s, rules: { ...s.rules, ...patch } }));
}

export function savePoints(key: string, points: string[]) {
  updateStudy((s) => ({ ...s, points: { ...s.points, [key]: points } }));
}

/** CONAMAT · Aritmética (unidades 1 a 11) es el B1 de la ruta: aprender y aprobar cada capítulo empuja su ítem. */
function rutaFromStudy(date: string, activityId: string, n: number, part: 'learn' | 'test') {
  if (activityId !== 'conamat') return;
  logFromStudy(date, `b1-conamat-arit-${String(n).padStart(2, '0')}`, 0.5, `study:${part}:${activityId}:${n}`);
}

// ——— Sistema de libros (ola 20) ———

/**
 * Guarda la micro-tesis de un capítulo (una frase en tus palabras). Queda como punto clave de la unidad
 * (contra eso se compara el cold recall) y, si se pide, como tarjeta. Editarla actualiza su tarjeta.
 */
export function guardarMicrotesis(date: string, actId: string, cap: number, texto: string, tarjeta = true) {
  const st = getState().study;
  const a = st.activities.find((x) => x.id === actId);
  const l = a?.libro ? libroPorId(a.libro) : undefined;
  if (!a || !l) return;
  const t = texto.trim();
  const clave = claveMicro(actId, cap);
  const prev = st.microtesis?.[clave];
  const capi = l.capitulos.find((c) => c.n === cap);
  const unidad = unidadesDe(l).find((u) => u.caps.includes(cap));
  const deck = st.fronts.find((f) => f.id === a.front)?.name ?? 'General';
  let cardId = prev?.cardId;
  let nueva: Card | null = null;
  if (t && tarjeta && !cardId) {
    cardId = `c${newId()}`;
    nueva = {
      id: cardId, front: `${l.titulo} · cap. ${cap}${capi ? ` (${capi.titulo})` : ''}: ¿cuál es la idea central?`, back: t, kind: 'explicar',
      deck, frontId: a.front, source: `Micro-tesis · cap. ${cap}`, createdOn: date, activityId: actId, unit: unidad?.n,
    };
  }
  updateStudy((s) => {
    const microtesis = { ...(s.microtesis ?? {}) };
    if (t) microtesis[clave] = { texto: t, fecha: prev?.fecha ?? date, ...(cardId ? { cardId } : {}) };
    else delete microtesis[clave];
    // Los puntos de la unidad: las micro-tesis de sus capítulos (el cold recall compara contra esto).
    const points = { ...s.points };
    if (unidad) {
      const ps = unidad.caps.flatMap((c) => {
        const m = microtesis[claveMicro(actId, c)];
        const titulo = l.capitulos.find((x) => x.n === c)?.titulo ?? `Cap. ${c}`;
        return m ? [`Cap. ${c} · ${titulo} :: ${m.texto}`] : [];
      });
      if (ps.length) points[`${actId}:${unidad.n}`] = ps;
      else delete points[`${actId}:${unidad.n}`];
    }
    const cards = nueva ? [...s.cards, nueva] : s.cards.map((c) => (c.id === prev?.cardId && t ? { ...c, back: t } : c));
    return { ...s, microtesis, points, cards };
  });
}

/** Lectura de apoyo (Foreword, Resources): se tilda, sin test. */
export function marcarRecurso(date: string, actId: string, recurso: string) {
  updateStudy((s) => {
    const r = { ...(s.recursosLeidos ?? {}) };
    const k = `${actId}:${recurso}`;
    if (r[k]) delete r[k];
    else r[k] = date;
    return { ...s, recursosLeidos: r };
  });
}

/**
 * Test final del libro. Con 85 % o más queda aprobado y la tesis final vence mañana (va a la sesión
 * como cualquier tesis). Con menos, se puede repetir.
 */
export function guardarTestFinal(date: string, actId: string, data: { score: number; total: number; errors: Record<ErrType, number>; mode: 'app' | 'papel' }) {
  const a = findAct(actId);
  if (!a) return { approved: false };
  const approved = approves(data.score, data.total);
  updateStudy((s) => {
    const cur = s.finales?.[actId] ?? { tests: [] };
    const nuevo = approved && !cur.aprobadoOn;
    const tesis: ReviewItem | null = nuevo
      ? { id: `r${newId()}`, activityId: actId, kind: 'tesis', due: addDays(date, 1), min: 30, label: `Tesis final · ${a.title}` }
      : null;
    return {
      ...s,
      finales: { ...(s.finales ?? {}), [actId]: { ...cur, tests: [...cur.tests, { ...data, date, approved }], aprobadoOn: cur.aprobadoOn ?? (approved ? date : undefined), ...(tesis ? { tesisItem: tesis.id } : {}) } },
      reviews: tesis ? [...s.reviews, tesis] : s.reviews,
    };
  });
  markStep(date, `test:${actId}:final`);
  return { approved };
}

/** El artefacto del libro: sin él, el libro queda "leído" y no "terminado". */
export function guardarArtefacto(date: string, actId: string, art: { tipo: TipoArtefacto; titulo: string; link?: string } | null) {
  updateStudy((s) => {
    const cur = s.finales?.[actId] ?? { tests: [] };
    const { artefacto: _, ...resto } = cur;
    return { ...s, finales: { ...(s.finales ?? {}), [actId]: art ? { ...resto, artefacto: { ...art, fecha: date } } : resto } };
  });
}
