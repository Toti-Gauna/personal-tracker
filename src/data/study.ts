import { BUILTIN_PRESETS } from './defaults';
import { fitPreset } from './pomodoro';
import { CARD_SEC, LADDER, PASS, REVIEW_CAP, minutesFor } from './study-catalog';
import { DAY, retrievability } from './fsrs';
import type { Activity, Card, ErrType, ReviewItem, ReviewKind, Step, StudyState, Tramo, Unit, UnitState } from './study-types';
import { addDays, dateKey, parseDate } from './time';
import type { Preset } from './types';

/** 0 = lunes … 6 = domingo. */
export const weekday = (date: string) => (parseDate(date).getDay() + 6) % 7;

export const unitName = (a: Activity, u: Unit) => `${a.unitLabel ?? 'Unidad'} ${u.n} · ${u.title}`;
export const unitShort = (a: Activity, n: number) => `${a.unitLabel ?? 'Unidad'} ${n}`;

export const unitState = (st: StudyState, actId: string, n: number): UnitState =>
  st.units[actId]?.[n] ?? { tests: [] };

/** Actividades que tocan hoy. */
export const activitiesFor = (st: StudyState, date: string) =>
  st.activities.filter((a) => a.days.includes(weekday(date)));

/**
 * La unidad en la que se trabaja hoy: la que aprendiste o testeaste hoy (para que el
 * plan no cambie al aprobar), si no, la primera sin aprobar.
 */
export function focusUnit(a: Activity, st: StudyState, date: string): Unit | undefined {
  if (!a.units) return undefined;
  const today = a.units.find((u) => {
    const s = unitState(st, a.id, u.n);
    return s.learnedOn === date || s.tests.some((t) => t.date === date);
  });
  return today ?? a.units.find((u) => !unitState(st, a.id, u.n).approvedOn);
}

/** Aprobado con 85 %, o por debajo si todos los errores fueron de descuido. */
export function approves(score: number, total: number, errors: Record<ErrType, number>) {
  if (total <= 0) return false;
  if (score / total >= PASS - 1e-9) return true;
  return errors.concepto + errors.tecnica + errors.enunciado === 0 && errors.descuido > 0;
}

let seq = 0;
const rid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

const item = (a: Activity, unit: number | undefined, kind: ReviewKind, due: string, min: number, label: string): ReviewItem => ({
  id: rid(), activityId: a.id, unit, kind, due, min, label,
});

/** Día 0: lo aprendido vuelve al día siguiente como cold recall (si pasa por el motor). */
export function scheduleLearned(a: Activity, unit: Unit | undefined, date: string): ReviewItem[] {
  if (!a.engine) return [];
  const what = unit ? unitName(a, unit) : a.title;
  return [item(a, unit?.n, 'cold', addDays(date, LADDER.cold.days), LADDER.cold.min, `Cold recall · ${what}`)];
}

/** Test aprobado: la tesis a +3 y los repasos de ejercicios a +7, +21 y +60. */
export function scheduleApproved(a: Activity, unit: Unit, date: string): ReviewItem[] {
  const n = unitName(a, unit);
  return [
    item(a, unit.n, 'tesis', addDays(date, LADDER.tesis.days), LADDER.tesis.min, `Tesis · ${n}`),
    item(a, unit.n, 'ejercicios', addDays(date, LADDER.e7.days), LADDER.e7.min, `Ejercicios mixtos · ${n}`),
    item(a, unit.n, 'ejercicios', addDays(date, LADDER.e21.days), LADDER.e21.min, `Ejercicios mixtos · ${n}`),
    item(a, unit.n, 'examen', addDays(date, LADDER.e60.days), LADDER.e60.min, `Examen corto · ${n}`),
  ];
}

/** Test no aprobado: re-test con preguntas nuevas en 2 días. */
export const scheduleRetest = (a: Activity, unit: Unit, date: string): ReviewItem =>
  item(a, unit.n, 'retest', addDays(date, LADDER.retest.days), unit.test.min, `Re-test · ${unitName(a, unit)}`);

const PRIORITY: Record<ReviewKind, number> = { cold: 0, releer: 1, tesis: 2, ejercicios: 4, examen: 4, retest: 9 };

/**
 * El repaso del día: solo lo que vence, con tope de 20 min. Primero el cold recall, después
 * la tesis y los ejercicios (los más atrasados antes). Lo que no entra queda en "Hoy no toca".
 */
export function dueReview(reviews: ReviewItem[], date: string, cap = REVIEW_CAP) {
  const cands = reviews
    .filter((r) => r.kind !== 'retest' && (r.doneOn === date || (!r.doneOn && r.due <= date)))
    .sort((x, y) => PRIORITY[x.kind] - PRIORITY[y.kind] || x.due.localeCompare(y.due));
  const today: ReviewItem[] = [];
  const skipped: ReviewItem[] = [];
  let used = 0;
  for (const r of cands) {
    if (used + r.min <= cap) {
      today.push(r);
      used += r.min;
    } else skipped.push(r);
  }
  return { today, skipped, min: used };
}

const SUB: Record<ReviewKind, string> = {
  cold: 'Repasar · sin mirar',
  releer: 'Repasar · relectura corta de lo que faltó',
  tesis: 'Repasar · explicarlo con tus palabras',
  ejercicios: 'Repasar · ejercicios mixtos sin mirar',
  examen: 'Repasar · examen corto',
  retest: 'Comprobar',
};

export const reviewTramo = (r: ReviewItem, paper: boolean): Tramo => ({
  step: 'repasar',
  kind: r.kind === 'retest' ? 'test' : r.kind,
  title: r.label,
  sub: SUB[r.kind] + (r.kind === 'tesis' ? (paper ? ' · en papel' : ' · en la app') : ''),
  min: r.min,
  ref: `rev:${r.id}`,
  activityId: r.activityId,
  paper: r.kind === 'tesis' ? paper : undefined,
});

const presetById = (presets: Preset[], id?: string) =>
  presets.find((p) => p.id === id) ?? BUILTIN_PRESETS.find((p) => p.id === id) ?? BUILTIN_PRESETS[0];

export interface PlanCtx {
  study: StudyState;
  date: string;
  /** Duración del bloque donde entra la actividad. */
  blockMin: number;
  presets: Preset[];
  blockPresets: Record<string, string>;
  /** Repaso de hoy (de todas las actividades). */
  review: ReviewItem[];
  /** Tarjetas de hoy por frente (motor FSRS). */
  groups?: CardGroup[];
}

/**
 * La sesión de un contenido: Repasar → Aprender → Comprobar. La tesis del capítulo
 * nuevo no entra: se agenda a +3 y aparece en el Repasar de ese día.
 * Las duraciones suman exactamente el total del botón de foco.
 */
export function planActivity(a: Activity, ctx: PlanCtx): Tramo[] {
  const { study, date } = ctx;
  const out: Tramo[] = [];

  // 1 · Repasar: solo lo de esta actividad que vence hoy, y las tarjetas de su frente
  // (en la primera actividad del día de ese frente, para no repetirlas).
  const mine = ctx.review.filter((x) => x.activityId === a.id).map((r) => reviewTramo(r, a.testMode === 'papel'));
  const firstOfFront = activitiesFor(study, date).find((x) => x.front === a.front)?.id === a.id;
  const group = firstOfFront ? ctx.groups?.find((g) => g.frontId === a.front) : undefined;
  if (group) mine.push(cardsTramo(group));
  out.push(...sortRepasar(mine));
  const rep = out.reduce((s, t) => s + t.min, 0);

  // 3 · Comprobar (se calcula antes para saber cuánto queda para aprender).
  let comp: Tramo | null = null;
  const unit = focusUnit(a, study, date);
  let learnTitle = a.title;
  let learnSub = 'Aprender';
  let learnRef = `learn:${a.id}:`;
  if (a.units) {
    if (!unit) {
      learnTitle = 'Repaso general';
      learnSub = 'Aprender · repasar todo antes del examen';
      if (a.final) comp = { step: 'comprobar', kind: 'test', title: a.final.title, sub: `Comprobar · ${a.final.desc}`, min: 60, ref: `test:${a.id}:final`, activityId: a.id, paper: a.testMode === 'papel' };
    } else {
      const s = unitState(study, a.id, unit.n);
      const failed = s.tests.some((t) => !t.approved);
      const retest = study.reviews.find((r) => r.activityId === a.id && r.unit === unit.n && r.kind === 'retest' && !r.doneOn);
      const learnedBefore = !!s.learnedOn && s.learnedOn < date;
      const testedToday = s.tests.some((t) => t.date === date);
      learnRef = `learn:${a.id}:${unit.n}`;
      learnTitle = unitName(a, unit);
      learnSub = learnedBefore ? (failed ? 'Aprender · repasar lo que fallaste' : 'Aprender · terminar y repasar') : 'Aprender · teoría y ejercicios';
      const retestDue = retest && retest.due <= date;
      if (testedToday || !failed || retestDue) {
        const re = s.tests.some((t) => t.date < date && !t.approved);
        comp = {
          step: 'comprobar',
          kind: 'test',
          title: `${re ? 'Re-test' : 'Test'} ${unitShort(a, unit.n).toLowerCase()} · ${unit.test.count} ${unit.test.count === 1 ? 'ejercicio' : 'ejercicios'}`,
          sub: `Comprobar · ${a.testMode === 'papel' ? 'en papel' : 'en la app'}`,
          min: unit.test.min,
          ref: `test:${a.id}:${unit.n}`,
          activityId: a.id,
          paper: a.testMode === 'papel',
        };
      }
    }
  }
  const compMin = comp?.min ?? 0;

  // 2 · Aprender: con unidades llena el bloque; si no, lo que pide la sesión.
  const learnMin = a.units
    ? Math.max(15, ctx.blockMin - rep - compMin)
    : Math.max(5, Math.min(minutesFor(a), ctx.blockMin - rep || minutesFor(a)));
  const preset = presetById(ctx.presets, ctx.blockPresets[a.block]);
  const segs = fitPreset(preset, learnMin);
  const nombre = preset.straight ? 'corrido' : `${preset.focus}/${preset.rest}`;
  for (const sg of segs) {
    out.push(
      sg.type === 'focus'
        ? { step: 'aprender', kind: 'capitulo', title: learnTitle, sub: `${learnSub} · pomodoro ${nombre}`, min: sg.min, ref: learnRef, activityId: a.id }
        : { step: 'aprender', kind: 'descanso', title: 'Descanso', sub: 'Pararse, agua, nada de pantalla', min: sg.min, ref: learnRef, activityId: a.id },
    );
  }
  if (comp) out.push(comp);
  return out;
}

/** La sesión de "Repaso del día": todo lo que vence, de todos los frentes. */
export const planReview = (review: ReviewItem[], study: StudyState, groups: CardGroup[] = []): Tramo[] =>
  sortRepasar([
    ...review.map((r) => reviewTramo(r, study.activities.find((a) => a.id === r.activityId)?.testMode === 'papel')),
    ...groups.map(cardsTramo),
  ]);

const TRAMO_ORDER: Partial<Record<Tramo['kind'], number>> = { cold: 0, releer: 1, tesis: 2, tarjetas: 3, ejercicios: 4, examen: 4 };
const sortRepasar = (ts: Tramo[]) => [...ts].sort((x, y) => (TRAMO_ORDER[x.kind] ?? 9) - (TRAMO_ORDER[y.kind] ?? 9));

export const cardsTramo = (g: CardGroup): Tramo => ({
  step: 'repasar',
  kind: 'tarjetas',
  title: `${g.cards.length} ${g.cards.length === 1 ? 'tarjeta' : 'tarjetas'} de ${g.name}`,
  sub: 'Repasar · escribí antes de ver',
  min: g.min,
  ref: `cards:${g.frontId}`,
  activityId: g.activityId ?? 'repaso',
});

// ——— Tarjetas (FSRS) ———

export interface CardGroup {
  frontId: string;
  name: string;
  /** Actividad de ese frente (para el color y el minutero). */
  activityId?: string;
  cards: Card[];
  /** Las que todavía faltan hoy. */
  pending: Card[];
  min: number;
}

export const cardFront = (c: Card, fronts: StudyState['fronts']) =>
  c.frontId ?? fronts.find((f) => f.name === c.deck)?.id ?? 'otros';

const endOfDay = (date: string) => parseDate(addDays(date, 1)).getTime();
const reviewedOn = (c: Card, date: string) => c.srs?.last != null && dateKey(new Date(c.srs.last)) === date;

export const cardsMin = (n: number) => Math.ceil((n * CARD_SEC) / 60);

/**
 * Tarjetas de hoy: las que vencen (las más olvidadas primero) y hasta N nuevas,
 * dentro de lo que queda del tope después de cold recall, tesis y ejercicios.
 */
export function cardsForDay(study: StudyState, date: string, budgetMin: number) {
  const eod = endOfDay(date);
  const now = Math.min(Date.now(), eod - 1);
  const seen = study.cards.filter((c) => reviewedOn(c, date));
  const introduced = study.cards.filter((c) => c.firstOn === date).length;
  const due = study.cards
    .filter((c) => c.srs && c.srs.state !== 'new' && c.srs.due < eod && !reviewedOn(c, date))
    .sort((x, y) => retrievability((now - (x.srs!.last ?? now)) / DAY, x.srs!.s) - retrievability((now - (y.srs!.last ?? now)) / DAY, y.srs!.s));
  const nuevas = study.cards
    .filter((c) => !c.srs || c.srs.state === 'new')
    .filter((c) => !c.dueFrom || c.dueFrom <= date)
    .sort((x, y) => x.createdOn.localeCompare(y.createdOn))
    .slice(0, Math.max(0, study.rules.newPerDay - introduced));
  const max = Math.max(0, Math.floor((budgetMin * 60) / CARD_SEC));
  const chosen = [...seen, ...due, ...nuevas].slice(0, Math.max(max, seen.length));
  const skipped = due.length + nuevas.length - (chosen.length - seen.length);
  const pendingOf = (c: Card) => !reviewedOn(c, date) || (c.srs?.due ?? 0) < eod;
  const byFront = new Map<string, Card[]>();
  for (const c of chosen) {
    const f = cardFront(c, study.fronts);
    byFront.set(f, [...(byFront.get(f) ?? []), c]);
  }
  const groups: CardGroup[] = [...byFront.entries()].map(([frontId, cards]) => ({
    frontId,
    name: study.fronts.find((f) => f.id === frontId)?.name ?? 'Otros',
    activityId: study.activities.find((a) => a.front === frontId)?.id,
    cards,
    pending: cards.filter(pendingOf),
    min: cardsMin(cards.length),
  }));
  return { groups, skipped: Math.max(0, skipped), min: groups.reduce((s, g) => s + g.min, 0) };
}

/** Todo el repaso del día: ítems de la escalera y tarjetas, con un solo tope. */
export function dailyReview(study: StudyState, date: string) {
  const items = dueReview(study.reviews, date, study.rules.cap);
  const cards = cardsForDay(study, date, study.rules.cap - items.min);
  return { ...items, groups: cards.groups, skippedCards: cards.skipped, min: items.min + cards.min };
}

export interface PlanStep {
  step: Step;
  kind: Tramo['kind'];
  title: string;
  sub: string;
  min: number;
  ref: string;
  paper?: boolean;
  activityId: string;
}

/** Pasos para la lista de Estudio: el aprender (focos y descansos) va junto. */
export function groupSteps(tramos: Tramo[]): PlanStep[] {
  const out: PlanStep[] = [];
  for (const t of tramos) {
    const last = out[out.length - 1];
    if (t.step === 'aprender' && last?.step === 'aprender' && last.ref === t.ref) {
      last.min += t.min;
      continue;
    }
    out.push({ step: t.step, kind: t.kind === 'descanso' ? 'capitulo' : t.kind, title: t.title, sub: t.sub, min: t.min, ref: t.ref, paper: t.paper, activityId: t.activityId });
  }
  return out;
}

export const sumMin = (xs: { min: number }[]) => xs.reduce((s, x) => s + x.min, 0);

export const STEP_LABEL: Record<Step, string> = { repasar: 'Repasar', aprender: 'Aprender', comprobar: 'Comprobar' };
export const KIND_LABEL: Record<Tramo['kind'], string> = {
  cold: 'Cold recall', tesis: 'Tesis +3', ejercicios: 'Ejercicios', examen: 'Examen corto', releer: 'Releer', tarjetas: 'Tarjetas',
  capitulo: 'Capítulo', descanso: 'Descanso', test: 'Test',
};

/** Parsea la corrección que devuelve Claude: "17/20" y líneas "4: descuido". */
export function parseCorrection(text: string, total: number) {
  const m = text.match(/(\d+)\s*(?:\/|de)\s*(\d+)/);
  const perEx: (ErrType | null)[] = Array.from({ length: total }, () => null);
  const errors: Record<ErrType, number> = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const line of text.split('\n')) {
    const mm = norm(line).match(/^\s*(?:ej(?:ercicio)?\.?\s*)?(\d+)\s*[:.)\-–]\s*(concepto|tecnica|descuido|enunciado)/);
    if (mm) {
      const i = Number(mm[1]) - 1;
      const k = mm[2] as ErrType;
      if (i >= 0 && i < total) perEx[i] = k;
    }
  }
  perEx.forEach((e) => e && errors[e]++);
  const wrong = perEx.filter(Boolean).length;
  const score = m && Number(m[2]) === total ? Number(m[1]) : total - wrong;
  return { score, errors, perEx };
}

/** Tarjetas de la tesis: "frente :: dorso" y "texto con [[hueco]]". */
export function cardsFromText(text: string) {
  const out: { front: string; back: string; kind: 'pregunta' | 'completar' }[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes('::')) {
      const [f, ...b] = line.split('::');
      const back = b.join('::').trim().replace(/\.$/, '');
      if (f.trim() && back) out.push({ front: f.trim(), back: back[0].toUpperCase() + back.slice(1) + '.', kind: 'pregunta' });
    } else {
      const m = line.match(/\[\[(.+?)\]\]/);
      if (m) out.push({ front: line.replace(/\[\[(.+?)\]\]/g, '___'), back: m[1], kind: 'completar' });
    }
  }
  return out;
}

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Estado de una unidad para "Unidades y tests". */
export function unitStatus(a: Activity, st: StudyState, n: number, date: string): { label: string; tone: '' | 'on' | 'hoy' } {
  const s = unitState(st, a.id, n);
  const tesis = st.reviews.find((r) => r.activityId === a.id && r.unit === n && r.kind === 'tesis');
  const retest = st.reviews.find((r) => r.activityId === a.id && r.unit === n && r.kind === 'retest' && !r.doneOn);
  if (tesis?.doneOn) return { label: 'tesis ✓', tone: 'on' };
  if (tesis && tesis.due <= date) return { label: 'tesis hoy', tone: 'hoy' };
  if (s.approvedOn) return { label: `tesis ${tesis ? ddmm(tesis.due) : ''}`.trim(), tone: 'on' };
  if (retest) return { label: retest.due <= date ? 're-test hoy' : `re-test ${ddmm(retest.due)}`, tone: 'hoy' };
  if (s.learnedOn) return { label: 'test hoy', tone: 'hoy' };
  const cur = focusUnit(a, st, date);
  if (cur?.n === n && a.days.includes(weekday(date))) return { label: 'aprender hoy', tone: 'hoy' };
  return { label: '—', tone: '' };
}

/** Importa un .txt exportado de Anki ("frente<TAB>dorso", con o sin HTML) o un bloque con :: y [[ ]]. */
export function parseCardsText(text: string) {
  const strip = (s: string) =>
    s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  const out: { front: string; back: string; kind: 'pregunta' | 'completar' }[] = [];
  const rest: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (line.includes('\t')) {
      const [f, b] = line.split('\t');
      const front = strip(f.replace(/^"|"$/g, ''));
      const back = strip((b ?? '').replace(/^"|"$/g, ''));
      const cloze = front.match(/\{\{c\d+::(.+?)(::.*?)?\}\}/);
      if (cloze) out.push({ front: front.replace(/\{\{c\d+::(.+?)(::.*?)?\}\}/g, '___'), back: cloze[1], kind: 'completar' });
      else if (front && back) out.push({ front, back, kind: 'pregunta' });
    } else rest.push(line);
  }
  return [...out, ...cardsFromText(rest.join('\n'))];
}

/** Minutos de repaso de los próximos días (estimado con lo agendado hoy). */
export function forecast(study: StudyState, date: string, days = 7) {
  const out: { date: string; min: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(date, i);
    if (i === 0) {
      out.push({ date: d, min: dailyReview(study, d).min });
      continue;
    }
    const items = study.reviews.filter((r) => r.kind !== 'retest' && !r.doneOn && r.due === d).reduce((s, r) => s + r.min, 0);
    const eod = endOfDay(d);
    const sod = endOfDay(addDays(d, -1));
    const cards = study.cards.filter((c) => c.srs && c.srs.state !== 'new' && c.srs.due < eod && c.srs.due >= sod).length;
    out.push({ date: d, min: Math.min(study.rules.cap, items + cardsMin(cards)) });
  }
  return out;
}
