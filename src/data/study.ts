import { BUILTIN_PRESETS } from './defaults';
import { CARD_SEC, DIA, LADDER, PASS, REST_TEST, REVIEW_CAP, TEST_MIN, TEST_PREV, minutesFor } from './study-catalog';
import { DAY, retrievability } from './fsrs';
import type { Activity, Card, ErrType, ReviewItem, ReviewKind, Step, StudyState, TestResult, Tramo, Unit, UnitState } from './study-types';
import { addDays, dateKey, parseDate } from './time';
import type { Preset, Seg } from './types';

/** 0 = lunes … 6 = domingo. */
export const weekday = (date: string) => (parseDate(date).getDay() + 6) % 7;

export const unitName = (a: Activity, u: Unit) => `${a.unitLabel ?? 'Unidad'} ${u.n} · ${u.title}`;
export const unitShort = (a: Activity, n: number) => `${a.unitLabel ?? 'Unidad'} ${n}`;
/** "Aritmética" de "CONAMAT · Aritmética". */
export const actShort = (a: Activity) => a.title.split(' · ').pop()!.trim();

export const unitState = (st: StudyState, actId: string, n: number): UnitState =>
  st.units[actId]?.[n] ?? { tests: [] };

/** Actividades que tocan hoy. */
export const activitiesFor = (st: StudyState, date: string) =>
  st.activities.filter((a) => a.days.includes(weekday(date)));

/**
 * La unidad que se estudia hoy: la que estudiaste hoy (para que el plan no cambie al
 * terminarla), si no, la primera que todavía no estudiaste. Cada día, un capítulo nuevo.
 */
export function focusUnit(a: Activity, st: StudyState, date: string): Unit | undefined {
  if (!a.units) return undefined;
  return a.units.find((u) => unitState(st, a.id, u.n).learnedOn === date) ?? a.units.find((u) => !unitState(st, a.id, u.n).learnedOn);
}

/**
 * ¿Toca hoy el test de esta unidad? El día 2 (o después, si quedó atrasado) si nunca lo
 * hiciste, el día del re-test si reprobaste, y el día que lo hiciste (para que siga en el plan).
 */
export function testDue(st: StudyState, actId: string, n: number, date: string) {
  const s = unitState(st, actId, n);
  if (s.tests.some((t) => t.date === date)) return true;
  if (!s.learnedOn || s.learnedOn >= date || s.approvedOn || s.flojo) return false;
  if (!s.tests.length) return true;
  return st.reviews.some((r) => r.activityId === actId && r.unit === n && r.kind === 'retest' && !r.doneOn && r.due <= date);
}

/**
 * El test completo de una unidad: los ejercicios nuevos del capítulo y, desde la segunda,
 * 5 de las anteriores (solo en tests de ejercicios, no en los de construir algo). 25 min.
 */
export function testOf(u: Unit) {
  const prev = u.n > 1 && u.test.count >= 10 ? TEST_PREV : 0;
  return { nuevos: u.test.count, prev, total: u.test.count + prev, min: u.test.count >= 10 ? TEST_MIN : u.test.min };
}

/** El corte es 85 %: con eso o más, la tesis al día siguiente; con menos, releer y re-test. */
export function approves(score: number, total: number) {
  return total > 0 && score / total >= PASS - 1e-9;
}

let seq = 0;
const rid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

const item = (a: Activity, unit: number | undefined, kind: ReviewKind, due: string, min: number, label: string): ReviewItem => ({
  id: rid(), activityId: a.id, unit, kind, due, min, label,
});

/** Día 1: lo estudiado vuelve el día 2 como cold recall, el calentamiento del test. */
export function scheduleLearned(a: Activity, unit: Unit | undefined, date: string): ReviewItem[] {
  if (!a.engine) return [];
  const what = unit ? unitName(a, unit) : a.title;
  return [item(a, unit?.n, 'cold', addDays(date, LADDER.cold.days), LADDER.cold.min, `Cold recall · ${what}`)];
}

/**
 * Test aprobado (o el tema marcado como flojo): la tesis al día siguiente y repetir los días
 * 8, 22 y 61 del capítulo (estudio de lo flojo y ejercicios mixtos). Si el test se atrasó,
 * ningún repaso cae antes del día después de la tesis.
 */
export function scheduleApproved(a: Activity, unit: Unit, date: string, learnedOn = date): ReviewItem[] {
  const n = unitName(a, unit);
  const min = addDays(date, LADDER.tesis.days + 1);
  const at = (d: number) => (addDays(learnedOn, d) < min ? min : addDays(learnedOn, d));
  return [
    item(a, unit.n, 'tesis', addDays(date, LADDER.tesis.days), LADDER.tesis.min, `Tesis · ${n}`),
    item(a, unit.n, 'ejercicios', at(LADDER.e8.days), LADDER.e8.min, `Estudio + ejercicios · ${n}`),
    item(a, unit.n, 'ejercicios', at(LADDER.e22.days), LADDER.e22.min, `Ejercicios mixtos · ${n}`),
    item(a, unit.n, 'examen', at(LADDER.e61.days), LADDER.e61.min, `Examen corto · ${n}`),
  ];
}

/** Test reprobado: al día siguiente releés lo que falló y al otro, el re-test con ejercicios nuevos. */
export const scheduleFailed = (a: Activity, unit: Unit, date: string): ReviewItem[] => [
  item(a, unit.n, 'releer', addDays(date, LADDER.releer.days), LADDER.releer.min, `Releer lo que falló · ${unitName(a, unit)}`),
  item(a, unit.n, 'retest', addDays(date, LADDER.retest.days), testOf(unit).min, `Re-test · ${unitName(a, unit)}`),
];

/** Lo que entra en el tope de repaso: releer y los ejercicios espaciados (las tarjetas, aparte). */
const PRIORITY: Record<ReviewKind, number> = { releer: 0, ejercicios: 1, examen: 1, cold: 8, tesis: 8, retest: 9 };
const CAPPED: ReviewKind[] = ['releer', 'ejercicios', 'examen'];

const vence = (r: ReviewItem, date: string) => r.doneOn === date || (!r.doneOn && r.due <= date);

/**
 * El repaso del día: solo lo que vence, con tope de 20 min junto con las tarjetas. Lo que no
 * entra queda en "Hoy no toca". El cold recall (calentamiento del test) y la tesis van aparte,
 * con su contenido y fuera del tope.
 */
export function dueReview(reviews: ReviewItem[], date: string, cap = REVIEW_CAP) {
  const cands = reviews
    .filter((r) => CAPPED.includes(r.kind) && vence(r, date))
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
  const of = (k: ReviewKind) => reviews.filter((r) => r.kind === k && vence(r, date)).sort((x, y) => x.due.localeCompare(y.due));
  return { today, skipped, min: used, tesis: of('tesis'), cold: of('cold') };
}

const lower1 = (s: string) => s[0].toLowerCase() + s.slice(1);

/** Cómo se llama un ítem en la sesión ("Cold recall · cap. 2") y en Estudio ("Cap. 2 · Números enteros, sin mirar"). */
export function reviewTramo(r: ReviewItem, paper: boolean, a?: Activity): Tramo {
  const u = r.unit != null ? a?.units?.find((x) => x.n === r.unit) : undefined;
  const what = u && a ? unitName(a, u) : r.label.replace(/^[^·]+ · /, '');
  const short = u && a ? lower1(unitShort(a, u.n)) : what;
  const base = { min: r.min, ref: `rev:${r.id}`, activityId: r.activityId };
  switch (r.kind) {
    case 'cold':
      return { ...base, step: u ? 'test' : 'repetir', kind: 'cold', title: `Cold recall · ${short}`, paso: `${what}, sin mirar`, sub: u ? 'Test · calentamiento, sin mirar' : 'Repetir · sin mirar' };
    case 'tesis':
      return { ...base, step: 'tesis', kind: 'tesis', title: `Tesis · ${short}`, paso: `${what}, con tus palabras`, sub: 'Tesis · empieza por los errores del test', paper };
    case 'releer':
      return { ...base, step: 'repetir', kind: 'releer', title: `Releer · ${short}`, paso: `${what}, lo que falló`, sub: u ? 'Repetir · releer lo que falló en el test' : 'Repetir · relectura corta de lo que faltó' };
    case 'examen':
      return { ...base, step: 'repetir', kind: 'examen', title: `Examen corto · ${short}`, paso: `${what}, examen corto`, sub: 'Repetir · día 61, sin mirar' };
    default:
      return { ...base, step: 'repetir', kind: 'ejercicios', title: `${r.label.split(' · ')[0]} · ${short}`, paso: `${what}, lo flojo y ejercicios mixtos`, sub: 'Repetir · estudio de lo flojo y 3 a 5 ejercicios mixtos' };
  }
}

const presetById = (presets: Preset[], id?: string) =>
  presets.find((p) => p.id === id) ?? BUILTIN_PRESETS.find((p) => p.id === id) ?? BUILTIN_PRESETS[0];

/** El pomodoro con que se estudia el capítulo: el de la actividad o 50/10. */
export const studyPreset = (a: Activity, presets: Preset[]) => presetById(presets, a.pomodoro ?? 'b-50-10');
export const presetName = (p: Preset) => (p.straight ? 'corrido' : `${p.focus}/${p.rest}`);

/**
 * Estudiar de corrido, en pomodoros enteros: foco, descanso, foco… mientras entren (el
 * capítulo va al final del día, así que no termina en descanso). Si no entra ni un foco, va
 * todo de corrido. Lo que sobra y no llega a otro pomodoro no se usa.
 */
export function studySegs(p: Preset, avail: number): Seg[] {
  if (avail <= 0) return [];
  if (p.straight || p.focus <= 0 || avail < p.focus) return [{ type: 'focus', min: avail }];
  const k = Math.floor((avail + p.rest) / (p.focus + p.rest));
  const out: Seg[] = [];
  for (let i = 0; i < k; i++) {
    if (i && p.rest) out.push({ type: 'rest', min: p.rest });
    out.push({ type: 'focus', min: p.focus });
  }
  const left = avail - k * p.focus - (k - 1) * p.rest;
  if (p.rest && left >= p.rest + Math.max(20, p.focus / 2)) out.push({ type: 'rest', min: p.rest }, { type: 'focus', min: left - p.rest });
  return out;
}

/**
 * Cambia el pomodoro del capítulo en una sesión ya armada: rehace los tramos de estudiar con lo
 * que dejan libre los demás (`avail`). Devuelve null si ya empezaste a estudiar (índice `from`).
 */
export function rePomodoro(tramos: Tramo[], from: number, p: Preset, avail: number): Tramo[] | null {
  const i0 = tramos.findIndex((t) => t.step === 'estudiar');
  if (i0 < 0 || from > i0) return null;
  let i1 = i0;
  while (i1 + 1 < tramos.length && tramos[i1 + 1].step === 'estudiar') i1++;
  const base = tramos[i0];
  const sub = base.sub.replace(/, pomodoro .+$/, '') + `, pomodoro ${presetName(p)}`;
  const nuevos = studySegs(p, avail).map((sg): Tramo =>
    sg.type === 'focus' ? { ...base, kind: 'capitulo', sub, min: sg.min } : { ...base, kind: 'descanso', title: 'Descanso', paso: undefined, sub: 'Pararse, agua, nada de pantalla', min: sg.min });
  return [...tramos.slice(0, i0), ...nuevos, ...tramos.slice(i1 + 1)];
}

export interface PlanCtx {
  study: StudyState;
  date: string;
  /** Duración del bloque donde entra la actividad. */
  blockMin: number;
  presets: Preset[];
  blockPresets: Record<string, string>;
  /** Repaso de hoy (de todas las actividades), con tope. */
  review: ReviewItem[];
  /** Tarjetas de hoy por frente (motor FSRS). */
  groups?: CardGroup[];
}

/**
 * El día de un contenido. Cada día toca algo distinto de cada capítulo, en este orden:
 * cold recall, tarjetas (y lo que vence para repetir), el test del capítulo de ayer, un
 * descanso, la tesis del de antes de ayer y estudiar el capítulo nuevo, en pomodoros enteros.
 */
export function planActivity(a: Activity, ctx: PlanCtx): Tramo[] {
  const { study, date } = ctx;
  const paper = a.testMode === 'papel';
  const due = dueReview(study.reviews, date);
  const units = a.units ?? [];
  const tr = (r: ReviewItem) => reviewTramo(r, paper, a);

  // Cold recall: el calentamiento del test de hoy (o el de un libro sin unidades).
  const testHoy = units.filter((u) => testDue(study, a.id, u.n, date));
  const cold = due.cold.filter((r) => r.activityId === a.id && (r.unit == null || testHoy.some((u) => u.n === r.unit))).map(tr);

  // Repetir: las tarjetas de su frente (en la primera actividad del día de ese frente) y lo
  // de esta actividad que entra en el tope.
  const rep: Tramo[] = [];
  const firstOfFront = activitiesFor(study, date).find((x) => x.front === a.front)?.id === a.id;
  const group = firstOfFront ? ctx.groups?.find((g) => g.frontId === a.front) : undefined;
  if (group) rep.push(cardsTramo(group, a.units ? actShort(a) : undefined));
  rep.push(...ctx.review.filter((x) => x.activityId === a.id).map(tr));

  // Test: el del capítulo de ayer (o el re-test que vence), y un descanso antes de seguir.
  const tests: Tramo[] = testHoy.map((u) => {
    const s = unitState(study, a.id, u.n);
    const re = s.tests.some((t) => t.date < date);
    const t = testOf(u);
    const ej = `${t.total} ${t.total === 1 ? 'ejercicio' : 'ejercicios'}`;
    return {
      step: 'test', kind: 'test', title: `${re ? 'Re-test' : 'Test completo'} · ${lower1(unitShort(a, u.n))}`,
      paso: `${unitShort(a, u.n)} · ${ej}, ${Math.round(PASS * 100)} % para pasar`, sub: `Test · ${ej}, ${paper ? 'en papel' : 'en la app'}`,
      min: t.min, ref: `test:${a.id}:${u.n}`, activityId: a.id, paper,
    };
  });
  const unit = focusUnit(a, study, date);
  if (a.units && !unit && a.final && !testHoy.length && a.units.every((u) => unitState(study, a.id, u.n).approvedOn || unitState(study, a.id, u.n).flojo)) {
    tests.push({ step: 'test', kind: 'test', title: a.final.title, paso: a.final.title, sub: `Test · ${a.final.desc}`, min: 60, ref: `test:${a.id}:final`, activityId: a.id, paper });
  }

  // Tesis: la del capítulo que aprobaste ayer, fuera del tope.
  const tesis = due.tesis.filter((r) => r.activityId === a.id).map(tr);

  const out: Tramo[] = [...cold, ...rep, ...tests];
  if (tests.length && (tesis.length || a.units)) {
    const last = tests[tests.length - 1];
    out.push({ step: 'test', kind: 'descanso', title: 'Descanso', sub: 'Pararse, agua, nada de pantalla', min: REST_TEST, ref: last.ref, activityId: a.id });
  }
  out.push(...tesis);

  // Estudiar: el capítulo nuevo con lo que queda del bloque, en pomodoros enteros; sin
  // unidades, lo que pide la sesión (páginas, secciones o minutos).
  const usado = sumMin(out);
  let title = a.title;
  let paso = `${a.title}, de corrido`;
  let ref = `learn:${a.id}:`;
  if (a.units) {
    if (unit) {
      title = unitName(a, unit);
      paso = `${title}, de corrido`;
      ref = `learn:${a.id}:${unit.n}`;
    } else {
      title = 'Repaso general';
      paso = 'Repaso general antes del examen';
    }
  }
  const avail = a.units
    ? Math.max(15, ctx.blockMin - usado)
    : Math.max(5, Math.min(minutesFor(a), ctx.blockMin - usado || minutesFor(a)));
  const preset = studyPreset(a, ctx.presets);
  const segs = a.units ? studySegs(preset, avail) : [{ type: 'focus' as const, min: avail }];
  const sub = a.units ? `Estudiar · de corrido, pomodoro ${presetName(preset)}` : 'Estudiar · de corrido';
  for (const sg of segs) {
    out.push(
      sg.type === 'focus'
        ? { step: 'estudiar', kind: 'capitulo', title, paso, sub, min: sg.min, ref, activityId: a.id }
        : { step: 'estudiar', kind: 'descanso', title: 'Descanso', sub: 'Pararse, agua, nada de pantalla', min: sg.min, ref, activityId: a.id },
    );
  }
  return out;
}

/** La sesión de "Repaso del día": las tarjetas y lo que vence para repetir, con tope, de todos los frentes. */
export const planReview = (review: ReviewItem[], study: StudyState, groups: CardGroup[] = []): Tramo[] => [
  ...groups.map((g) => cardsTramo(g)),
  ...review.filter((r) => CAPPED.includes(r.kind)).map((r) => {
    const a = study.activities.find((x) => x.id === r.activityId);
    return reviewTramo(r, a?.testMode === 'papel', a);
  }),
];

/** Tarjetas de un frente; dentro de una actividad se nombran por ella ("9 tarjetas de Aritmética"). */
export const cardsTramo = (g: CardGroup, name = g.name): Tramo => ({
  step: 'repetir',
  kind: 'tarjetas',
  title: `${g.cards.length} ${g.cards.length === 1 ? 'tarjeta' : 'tarjetas'} de ${name}`,
  sub: 'Repetir · escribí antes de ver',
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
 * dentro de lo que queda del tope después del cold recall y los ejercicios.
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

/** Todo el repaso del día: lo que vence para repetir y las tarjetas, con un solo tope. Cold recall y tesis, aparte. */
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
  /** Minutos del paso, descansos incluidos (lo que suma al "falta"). */
  min: number;
  /** Minutos que se muestran: el capítulo, sin sus descansos. */
  ver: number;
  ref: string;
  paper?: boolean;
  activityId: string;
}

/** Pasos para la lista de Estudio: el capítulo con sus pomodoros va junto, y el test con su descanso. */
export function groupSteps(tramos: Tramo[]): PlanStep[] {
  const out: PlanStep[] = [];
  for (const t of tramos) {
    const last = out[out.length - 1];
    if (last && last.ref === t.ref && (t.step === 'estudiar' || t.kind === 'descanso')) {
      last.min += t.min;
      if (t.kind !== 'descanso') last.ver += t.min;
      continue;
    }
    out.push({ step: t.step, kind: t.kind === 'descanso' ? 'capitulo' : t.kind, title: t.paso ?? t.title, sub: t.sub, min: t.min, ver: t.kind === 'descanso' ? 0 : t.min, ref: t.ref, paper: t.paper, activityId: t.activityId });
  }
  return out;
}

export const sumMin = (xs: { min: number }[]) => xs.reduce((s, x) => s + x.min, 0);

export const STEP_LABEL: Record<Step, string> = { repetir: 'Repetir', test: 'Test', tesis: 'Tesis', estudiar: 'Estudiar' };
export const KIND_LABEL: Record<Tramo['kind'], string> = {
  cold: 'Cold recall', tesis: 'Día 3', ejercicios: 'Estudio y ejercicios', examen: 'Examen corto', releer: 'Releer', tarjetas: 'Tarjetas',
  capitulo: 'Capítulo nuevo', descanso: 'Descanso', test: 'Completo',
};

/**
 * Las cuatro fases de hoy, en el orden del capítulo (día 1 Estudiar, día 2 Test, día 3 Tesis,
 * días 8 a 61 Repetir), con el capítulo que toca en cada una: cada día es uno distinto.
 */
export function unitPhases(a: Activity, st: StudyState, date: string) {
  if (!a.units) return null;
  const cap = (n?: number) => (n == null ? '—' : lower1(unitShort(a, n)));
  const due = dueReview(st.reviews, date);
  const estudia = focusUnit(a, st, date);
  const test = a.units.find((u) => testDue(st, a.id, u.n, date));
  const tesis = due.tesis.find((r) => r.activityId === a.id);
  const rep = st.reviews.filter((r) => r.activityId === a.id && CAPPED.includes(r.kind) && vence(r, date));
  return [
    { step: 'estudiar' as Step, name: 'Estudiar', when: cap(estudia?.n) },
    { step: 'test' as Step, name: 'Test', when: cap(test?.n) },
    { step: 'tesis' as Step, name: 'Tesis', when: cap(tesis?.unit) },
    { step: 'repetir' as Step, name: 'Repetir', when: rep.length ? (rep.length === 1 ? cap(rep[0].unit) : `${rep.length} temas`) : `${DIA.e8} → ${DIA.e61}` },
  ];
}


const ERR_NOMBRE: Record<ErrType, [string, string]> = {
  concepto: ['error de concepto', 'errores de concepto'],
  tecnica: ['error de técnica', 'errores de técnica'],
  descuido: ['descuido', 'descuidos'],
  enunciado: ['error de enunciado', 'errores de enunciado'],
};
const NUM = ['', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'];

/**
 * Con qué arranca la tesis: el último test de la unidad y sus errores, empezando por los que
 * más pesan (concepto, técnica, enunciado, descuido).
 */
export function tesisStart(t: TestResult | undefined) {
  if (!t) return null;
  const orden: ErrType[] = ['concepto', 'tecnica', 'enunciado', 'descuido'];
  const partes = orden.filter((k) => t.errors[k] > 0).map((k) => {
    const n = t.errors[k];
    const ej = t.wrong?.find((w) => w.type === k);
    const txt = `${n < NUM.length ? NUM[n] : n} ${ERR_NOMBRE[k][n === 1 ? 0 : 1]}`;
    return ej ? `${txt} (${lower1(ej.q.replace(/\.$/, ''))})` : txt;
  });
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${lower1(partes[partes.length - 1])}` : partes[0];
  const primero = orden.find((k) => t.errors[k] > 0);
  const CIERRE: Record<ErrType, string> = {
    concepto: 'Explicá primero la idea que no te salió.',
    tecnica: 'Explicá primero el procedimiento que fallaste.',
    enunciado: 'Explicá primero qué pedía el enunciado.',
    descuido: 'Explicá primero dónde te apuraste.',
  };
  const cierre = primero ? CIERRE[primero] : 'Sin errores: explicá el capítulo de punta a punta.';
  return `En el test sacaste ${t.score} de ${t.total}.${lista ? ` ${lista}.` : ''} ${cierre}`;
}

/** Para el cierre: la victoria de hoy (un test aprobado) y lo primero de mañana en el orden de la sesión. */
export function cierreSugerido(st: StudyState, date: string) {
  let victoria = '';
  for (const a of st.activities) {
    for (const u of a.units ?? []) {
      const t = unitState(st, a.id, u.n).tests.find((x) => x.date === date && x.approved);
      if (t) victoria = `Aprobé el test del ${lower1(unitShort(a, u.n))}`;
    }
  }
  const manana = addDays(date, 1);
  const v = dueReview(st.reviews, manana);
  const retest = st.reviews.find((r) => r.kind === 'retest' && !r.doneOn && r.due <= manana);
  const first = v.cold.find((r) => !r.doneOn) ?? retest ?? v.today[0] ?? v.tesis[0];
  const a = first && st.activities.find((x) => x.id === first.activityId);
  const short = first && a && first.unit != null ? lower1(unitShort(a, first.unit)) : first?.label.replace(/^[^·]+ · /, '');
  const qué = first ? { cold: 'Cold recall y test', tesis: 'Tesis', releer: 'Releer lo que falló', ejercicios: 'Repetir', examen: 'Examen corto', retest: 'Re-test' }[first.kind] : '';
  return { victoria, manana: first ? `${qué} del ${short}` : '' };
}

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

/** Estado de una unidad para "Unidades y tests": qué toca hoy, o cuándo vuelve. */
export function unitStatus(a: Activity, st: StudyState, n: number, date: string): { label: string; tone: '' | 'on' | 'hoy' | 'flojo' } {
  const s = unitState(st, a.id, n);
  const of = (k: ReviewKind) => st.reviews.filter((r) => r.activityId === a.id && r.unit === n && r.kind === k);
  const hoy = (k: ReviewKind) => of(k).find((r) => !r.doneOn && r.due <= date);
  if (hoy('tesis')) return { label: 'tesis hoy', tone: 'on' };
  if (testDue(st, a.id, n, date) && !s.tests.some((t) => t.date === date)) return { label: s.tests.length ? 're-test hoy' : 'cold recall y test hoy', tone: 'hoy' };
  if (hoy('releer')) return { label: 'releer hoy', tone: 'hoy' };
  const retest = of('retest').find((r) => !r.doneOn);
  if (retest) return { label: `re-test ${ddmm(retest.due)}`, tone: 'hoy' };
  if (s.learnedOn === date || (!s.learnedOn && focusUnit(a, st, date)?.n === n && a.days.includes(weekday(date)))) return { label: 'estudio hoy', tone: 'hoy' };
  if (s.learnedOn && !s.tests.length) return { label: `test ${ddmm(addDays(s.learnedOn, 1))}`, tone: 'hoy' };
  const next = st.reviews.filter((r) => r.activityId === a.id && r.unit === n && !r.doneOn && r.kind !== 'retest').sort((x, y) => x.due.localeCompare(y.due))[0];
  if (s.flojo) return { label: next && next.due <= date ? 'flojo · repetir hoy' : 'flojo', tone: 'flojo' };
  if (s.approvedOn) return next ? { label: next.due <= date ? 'repetir hoy' : `${next.kind === 'tesis' ? 'tesis' : 'repetir'} ${ddmm(next.due)}`, tone: next.due <= date ? 'on' : '' } : { label: '✓', tone: 'on' };
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

/** Minutos de repaso de los próximos días (estimado con lo agendado hoy; cold recall y tesis van aparte). */
export function forecast(study: StudyState, date: string, days = 7) {
  const out: { date: string; min: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(date, i);
    if (i === 0) {
      out.push({ date: d, min: dailyReview(study, d).min });
      continue;
    }
    const items = study.reviews.filter((r) => CAPPED.includes(r.kind) && !r.doneOn && r.due === d).reduce((s, r) => s + r.min, 0);
    const eod = endOfDay(d);
    const sod = endOfDay(addDays(d, -1));
    const cards = study.cards.filter((c) => c.srs && c.srs.state !== 'new' && c.srs.due < eod && c.srs.due >= sod).length;
    out.push({ date: d, min: Math.min(study.rules.cap, items + cardsMin(cards)) });
  }
  return out;
}
