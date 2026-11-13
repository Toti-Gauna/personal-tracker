import { BUILTIN_PRESETS } from './defaults';
import { CARD_SEC, LADDER, PASS, REVIEW_CAP, TEST_MIN, TEST_PREV, minutesFor } from './study-catalog';
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
 * La unidad en la que se trabaja hoy: la que estudiaste o testeaste hoy (para que el
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

/**
 * El test completo de una unidad: los ejercicios nuevos del capítulo y, desde la segunda,
 * 5 de las anteriores (solo en tests de ejercicios, no en los de construir algo). 25 min.
 */
export function testOf(u: Unit) {
  const prev = u.n > 1 && u.test.count >= 10 ? TEST_PREV : 0;
  return { nuevos: u.test.count, prev, total: u.test.count + prev, min: u.test.count >= 10 ? TEST_MIN : u.test.min };
}

/** El corte es 85 %: con eso o más pasás y la tesis queda a +3; con menos, re-test a +2. */
export function approves(score: number, total: number) {
  return total > 0 && score / total >= PASS - 1e-9;
}

let seq = 0;
const rid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

const item = (a: Activity, unit: number | undefined, kind: ReviewKind, due: string, min: number, label: string): ReviewItem => ({
  id: rid(), activityId: a.id, unit, kind, due, min, label,
});

/** Día 0: lo estudiado vuelve al día siguiente como cold recall (si pasa por el motor). */
export function scheduleLearned(a: Activity, unit: Unit | undefined, date: string): ReviewItem[] {
  if (!a.engine) return [];
  const what = unit ? unitName(a, unit) : a.title;
  return [item(a, unit?.n, 'cold', addDays(date, LADDER.cold.days), LADDER.cold.min, `Cold recall · ${what}`)];
}

/** Test aprobado: la tesis a +3 y repetir a +7, +21 y +60 (relectura de lo flojo y ejercicios mixtos). */
export function scheduleApproved(a: Activity, unit: Unit, date: string): ReviewItem[] {
  const n = unitName(a, unit);
  return [
    item(a, unit.n, 'tesis', addDays(date, LADDER.tesis.days), LADDER.tesis.min, `Tesis · ${n}`),
    item(a, unit.n, 'ejercicios', addDays(date, LADDER.e7.days), LADDER.e7.min, `Estudio + ejercicios · ${n}`),
    item(a, unit.n, 'ejercicios', addDays(date, LADDER.e21.days), LADDER.e21.min, `Ejercicios mixtos · ${n}`),
    item(a, unit.n, 'examen', addDays(date, LADDER.e60.days), LADDER.e60.min, `Examen corto · ${n}`),
  ];
}

/** Test no aprobado: releés lo que falló y repetís el test a los 2 días, con ejercicios nuevos. */
export const scheduleRetest = (a: Activity, unit: Unit, date: string): ReviewItem =>
  item(a, unit.n, 'retest', addDays(date, LADDER.retest.days), testOf(unit).min, `Re-test · ${unitName(a, unit)}`);

/** Orden de lo que vence: cold recall, releer, (tarjetas), ejercicios y, aparte, la tesis. */
const PRIORITY: Record<ReviewKind, number> = { cold: 0, releer: 1, ejercicios: 4, examen: 4, tesis: 8, retest: 9 };

const vence = (r: ReviewItem, date: string) => r.doneOn === date || (!r.doneOn && r.due <= date);

/**
 * El repaso del día: solo lo que vence, con tope de 20 min. Primero el cold recall, después
 * releer y los ejercicios (los más atrasados antes). Lo que no entra queda en "Hoy no toca".
 * La tesis (+3, 20 min) va aparte, fuera del tope.
 */
export function dueReview(reviews: ReviewItem[], date: string, cap = REVIEW_CAP) {
  const cands = reviews
    .filter((r) => r.kind !== 'retest' && r.kind !== 'tesis' && vence(r, date))
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
  const tesis = reviews.filter((r) => r.kind === 'tesis' && vence(r, date)).sort((x, y) => x.due.localeCompare(y.due));
  return { today, skipped, min: used, tesis };
}

/** La tesis no se hace el mismo día que el test de esa unidad. */
const testedOn = (st: StudyState, actId: string, n: number | undefined, date: string) =>
  n != null && unitState(st, actId, n).tests.some((t) => t.date === date);

const lower1 = (s: string) => s[0].toLowerCase() + s.slice(1);

/** Cómo se llama un ítem de repaso en la sesión ("Cold recall · cap. 2") y en Estudio ("Cap. 2 · Números enteros, sin mirar"). */
export function reviewTramo(r: ReviewItem, paper: boolean, a?: Activity): Tramo {
  const u = r.unit != null ? a?.units?.find((x) => x.n === r.unit) : undefined;
  const what = u && a ? unitName(a, u) : r.label.replace(/^[^·]+ · /, '');
  const short = u && a ? lower1(unitShort(a, u.n)) : what;
  const base = { step: 'repetir' as Step, min: r.min, ref: `rev:${r.id}`, activityId: r.activityId };
  switch (r.kind) {
    case 'cold':
      return { ...base, kind: 'cold', title: `Cold recall · ${short}`, paso: `${what}, sin mirar`, sub: 'Repetir · sin mirar' };
    case 'tesis':
      return { ...base, kind: 'tesis', title: `Tesis · ${short}`, paso: `${what}, con tus palabras`, sub: 'Repetir · día +3, en papel o en la app', paper };
    case 'releer':
      return { ...base, kind: 'releer', title: `Releer · ${short}`, paso: `${what}, lo que se olvidó`, sub: 'Repetir · relectura corta de lo que faltó' };
    case 'examen':
      return { ...base, kind: 'examen', title: `Examen corto · ${short}`, paso: `${what}, examen corto`, sub: 'Repetir · +60, sin mirar' };
    default:
      return { ...base, kind: 'ejercicios', title: `${r.label.split(' · ')[0]} · ${short}`, paso: `${what}, lo flojo y ejercicios mixtos`, sub: 'Repetir · releer lo flojo y ejercicios mixtos' };
  }
}

const presetById = (presets: Preset[], id?: string) =>
  presets.find((p) => p.id === id) ?? BUILTIN_PRESETS.find((p) => p.id === id) ?? BUILTIN_PRESETS[0];

/** El pomodoro con que se estudia el capítulo: el de la actividad o 50/10. */
export const studyPreset = (a: Activity, presets: Preset[]) => presetById(presets, a.pomodoro ?? 'b-50-10');
export const presetName = (p: Preset) => (p.straight ? 'corrido' : `${p.focus}/${p.rest}`);

/**
 * Estudiar de corrido, en pomodoros enteros: ciclos de foco + descanso mientras entren.
 * Si no entra ni uno, va todo de corrido. Lo que sobra (menos de un ciclo) no se usa.
 */
export function studySegs(p: Preset, avail: number): Seg[] {
  if (avail <= 0) return [];
  const cycle = p.focus + p.rest;
  if (p.straight || p.focus <= 0 || avail < cycle) return [{ type: 'focus', min: avail }];
  const n = Math.floor(avail / cycle);
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) out.push({ type: 'focus', min: p.focus }, ...(p.rest ? [{ type: 'rest' as const, min: p.rest }] : []));
  const left = avail - n * cycle;
  if (left >= Math.max(20, p.focus / 2)) out.push({ type: 'focus', min: left });
  return out;
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
 * El día de un contenido, en orden: primero lo que vence (cold recall, tarjetas y, si toca,
 * la tesis), después estudiar el capítulo de corrido y al final el test completo.
 * La sesión dura lo que entra en el bloque en pomodoros enteros (nunca más que el bloque).
 */
export function planActivity(a: Activity, ctx: PlanCtx): Tramo[] {
  const { study, date } = ctx;
  const out: Tramo[] = [];
  const paper = a.testMode === 'papel';

  // 1 · Repetir: lo de esta actividad que vence hoy, las tarjetas de su frente (en la primera
  // actividad del día de ese frente, para no repetirlas) y la tesis que vence, fuera del tope.
  const mine = ctx.review.filter((x) => x.activityId === a.id).map((r) => reviewTramo(r, paper, a));
  const firstOfFront = activitiesFor(study, date).find((x) => x.front === a.front)?.id === a.id;
  const group = firstOfFront ? ctx.groups?.find((g) => g.frontId === a.front) : undefined;
  if (group) mine.push(cardsTramo(group, a.units ? actShort(a) : undefined));
  const tesis = dueReview(study.reviews, date).tesis.filter((r) => r.activityId === a.id && !testedOn(study, a.id, r.unit, date));
  mine.push(...tesis.map((r) => reviewTramo(r, paper, a)));
  out.push(...sortRepetir(mine));
  const rep = out.reduce((s, t) => s + t.min, 0);

  // 3 · Test (se calcula antes para saber cuánto queda para estudiar).
  let comp: Tramo | null = null;
  const unit = focusUnit(a, study, date);
  let title = a.title;
  let paso = `${a.title}, de corrido`;
  let sub = 'Estudiar · de corrido';
  let ref = `learn:${a.id}:`;
  if (a.units) {
    if (!unit) {
      title = 'Repaso general';
      paso = 'Repaso general antes del examen';
      sub = 'Estudiar · todo antes del examen';
      if (a.final) comp = { step: 'test', kind: 'test', title: a.final.title, paso: a.final.title, sub: `Test · ${a.final.desc}`, min: 60, ref: `test:${a.id}:final`, activityId: a.id, paper };
    } else {
      const s = unitState(study, a.id, unit.n);
      const failed = s.tests.some((t) => !t.approved) && !s.approvedOn;
      const retest = study.reviews.find((r) => r.activityId === a.id && r.unit === unit.n && r.kind === 'retest' && !r.doneOn);
      const testedToday = s.tests.some((t) => t.date === date);
      const retestDue = !!retest && retest.due <= date;
      ref = `learn:${a.id}:${unit.n}`;
      title = unitName(a, unit);
      paso = failed ? `${title}, releer lo que falló` : `${title}, de corrido`;
      sub = failed ? 'Estudiar · releer lo que falló' : 'Estudiar · de corrido';
      if (testedToday || !failed || retestDue) {
        const re = s.tests.some((t) => t.date < date && !t.approved);
        const t = testOf(unit);
        const cap = lower1(unitShort(a, unit.n));
        const ej = `${t.total} ${t.total === 1 ? 'ejercicio' : 'ejercicios'}`;
        comp = {
          step: 'test',
          kind: 'test',
          title: `${re ? 'Re-test' : 'Test completo'} · ${cap}`,
          paso: `${unitShort(a, unit.n)} · ${ej}, ${Math.round(PASS * 100)} % para pasar`,
          sub: `Test · ${ej}, ${paper ? 'en papel' : 'en la app'}`,
          min: t.min,
          ref: `test:${a.id}:${unit.n}`,
          activityId: a.id,
          paper,
        };
      }
    }
  }
  const compMin = comp?.min ?? 0;

  // 2 · Estudiar: con unidades, el capítulo en pomodoros enteros con lo que queda del bloque;
  // si no, lo que pide la sesión (páginas, secciones o minutos).
  const avail = a.units
    ? Math.max(15, ctx.blockMin - rep - compMin)
    : Math.max(5, Math.min(minutesFor(a), ctx.blockMin - rep || minutesFor(a)));
  const preset = studyPreset(a, ctx.presets);
  const segs = a.units ? studySegs(preset, avail) : [{ type: 'focus' as const, min: avail }];
  const nombre = presetName(preset);
  for (const sg of segs) {
    out.push(
      sg.type === 'focus'
        ? { step: 'estudiar', kind: 'capitulo', title, paso, sub: a.units ? `${sub}, pomodoro ${nombre}` : sub, min: sg.min, ref, activityId: a.id }
        : { step: 'estudiar', kind: 'descanso', title: 'Descanso', sub: 'Pararse, agua, nada de pantalla', min: sg.min, ref, activityId: a.id },
    );
  }
  if (comp) out.push(comp);
  return out;
}

/** La sesión de "Repaso del día": lo que vence con tope, de todos los frentes (sin la tesis). */
export const planReview = (review: ReviewItem[], study: StudyState, groups: CardGroup[] = []): Tramo[] =>
  sortRepetir([
    ...review.filter((r) => r.kind !== 'tesis').map((r) => {
      const a = study.activities.find((x) => x.id === r.activityId);
      return reviewTramo(r, a?.testMode === 'papel', a);
    }),
    ...groups.map((g) => cardsTramo(g)),
  ]);

const TRAMO_ORDER: Partial<Record<Tramo['kind'], number>> = { cold: 0, releer: 1, tarjetas: 2, ejercicios: 3, examen: 3, tesis: 5 };
const sortRepetir = (ts: Tramo[]) => [...ts].sort((x, y) => (TRAMO_ORDER[x.kind] ?? 9) - (TRAMO_ORDER[y.kind] ?? 9));

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

/** Todo el repaso del día: ítems de la escalera y tarjetas, con un solo tope. La tesis va aparte. */
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

/** Pasos para la lista de Estudio: el capítulo (focos y descansos) va junto. */
export function groupSteps(tramos: Tramo[]): PlanStep[] {
  const out: PlanStep[] = [];
  for (const t of tramos) {
    const last = out[out.length - 1];
    if (t.step === 'estudiar' && last?.step === 'estudiar' && last.ref === t.ref) {
      last.min += t.min;
      if (t.kind !== 'descanso') last.ver += t.min;
      continue;
    }
    out.push({ step: t.step, kind: t.kind === 'descanso' ? 'capitulo' : t.kind, title: t.paso ?? t.title, sub: t.sub, min: t.min, ver: t.kind === 'descanso' ? 0 : t.min, ref: t.ref, paper: t.paper, activityId: t.activityId });
  }
  return out;
}

export const sumMin = (xs: { min: number }[]) => xs.reduce((s, x) => s + x.min, 0);

export const STEP_LABEL: Record<Step, string> = { repetir: 'Repetir', estudiar: 'Estudiar', test: 'Test' };
export const KIND_LABEL: Record<Tramo['kind'], string> = {
  cold: 'Cold recall +1', tesis: 'Tesis +3', ejercicios: 'Estudio y ejercicios', examen: 'Examen corto', releer: 'Releer', tarjetas: 'Tarjetas',
  capitulo: 'Capítulo', descanso: 'Descanso', test: 'Completo',
};

/** Las cuatro fases del capítulo en curso, con cuándo toca cada una y en cuál estás. */
export function unitPhases(a: Activity, st: StudyState, date: string) {
  const u = focusUnit(a, st, date);
  if (!u) return null;
  const s = unitState(st, a.id, u.n);
  const retest = st.reviews.find((r) => r.activityId === a.id && r.unit === u.n && r.kind === 'retest' && !r.doneOn);
  const tesis = st.reviews.find((r) => r.activityId === a.id && r.unit === u.n && r.kind === 'tesis');
  const testDay = s.approvedOn ?? (retest ? retest.due : date);
  const tesisDay = tesis?.due ?? addDays(testDay, LADDER.tesis.days);
  const cuando = (d: string) => (d === date ? 'hoy' : d === addDays(date, 1) ? 'mañana' : `${DOW[weekday(d)]} · +${daysBetween(testDay, d)}`);
  const actual = !s.learnedOn || (s.learnedOn === date && !s.tests.some((t) => t.date === date)) ? 0 : !s.approvedOn ? 1 : !tesis?.doneOn ? 2 : 3;
  return {
    unit: u,
    actual,
    fases: [
      { name: 'Estudiar', when: s.learnedOn && s.learnedOn < date ? (retest ? 'releer' : 'hecho') : 'hoy' },
      { name: 'Test', when: retest ? cuando(retest.due) : s.approvedOn && s.approvedOn < date ? 'hecho' : 'hoy' },
      { name: 'Tesis', when: tesis?.doneOn ? 'hecha' : tesisDay === date ? 'hoy' : `${DOW[weekday(tesisDay)]} · +${LADDER.tesis.days}` },
      { name: 'Repetir', when: `+${LADDER.e7.days} → +${LADDER.e60.days}` },
    ],
  };
}

const DOW = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);

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

/** Para el cierre: la victoria de hoy (un test aprobado) y lo primero de mañana (lo que vence). */
export function cierreSugerido(st: StudyState, date: string) {
  let victoria = '';
  for (const a of st.activities) {
    for (const u of a.units ?? []) {
      const t = unitState(st, a.id, u.n).tests.find((x) => x.date === date && x.approved);
      if (t) victoria = `Aprobé el test del ${lower1(unitShort(a, u.n))}`;
    }
  }
  const manana = addDays(date, 1);
  const first = dueReview(st.reviews, manana).today.find((r) => r.due === manana) ?? dueReview(st.reviews, manana).tesis[0];
  const a = first && st.activities.find((x) => x.id === first.activityId);
  const short = first && a && first.unit != null ? lower1(unitShort(a, first.unit)) : first?.label.replace(/^[^·]+ · /, '');
  const qué = first ? { cold: 'Cold recall', tesis: 'Tesis', releer: 'Releer', ejercicios: 'Ejercicios', examen: 'Examen corto', retest: 'Re-test' }[first.kind] : '';
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
export function unitStatus(a: Activity, st: StudyState, n: number, date: string): { label: string; tone: '' | 'on' | 'hoy' } {
  const s = unitState(st, a.id, n);
  const of = (k: ReviewKind) => st.reviews.filter((r) => r.activityId === a.id && r.unit === n && r.kind === k);
  const hoy = (k: ReviewKind) => of(k).find((r) => !r.doneOn && r.due <= date);
  const retest = of('retest').find((r) => !r.doneOn);
  if (hoy('tesis')) return { label: 'tesis hoy', tone: 'on' };
  if (retest && retest.due <= date) return { label: 're-test hoy', tone: 'hoy' };
  if (hoy('cold')) return { label: 'recall hoy', tone: 'on' };
  if (retest) return { label: retest.due <= date ? 're-test hoy' : `re-test ${ddmm(retest.due)}`, tone: 'hoy' };
  const tesis = of('tesis')[0];
  if (s.approvedOn && tesis && !tesis.doneOn) return { label: `tesis ${ddmm(tesis.due)}`, tone: 'on' };
  const next = st.reviews.filter((r) => r.activityId === a.id && r.unit === n && !r.doneOn && r.kind !== 'retest').sort((x, y) => x.due.localeCompare(y.due))[0];
  if (s.approvedOn) return next ? { label: next.due <= date ? 'repetir hoy' : `repetir ${ddmm(next.due)}`, tone: next.due <= date ? 'on' : '' } : { label: '✓', tone: 'on' };
  const cur = focusUnit(a, st, date);
  if (cur?.n === n && a.days.includes(weekday(date))) return { label: s.learnedOn && s.learnedOn < date ? 'test hoy' : 'estudio y test hoy', tone: 'hoy' };
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

/** Minutos de repaso de los próximos días (estimado con lo agendado hoy; la tesis va aparte). */
export function forecast(study: StudyState, date: string, days = 7) {
  const out: { date: string; min: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(date, i);
    if (i === 0) {
      out.push({ date: d, min: dailyReview(study, d).min });
      continue;
    }
    const items = study.reviews.filter((r) => r.kind !== 'retest' && r.kind !== 'tesis' && !r.doneOn && r.due === d).reduce((s, r) => s + r.min, 0);
    const eod = endOfDay(d);
    const sod = endOfDay(addDays(d, -1));
    const cards = study.cards.filter((c) => c.srs && c.srs.state !== 'new' && c.srs.due < eod && c.srs.due >= sod).length;
    out.push({ date: d, min: Math.min(study.rules.cap, items + cardsMin(cards)) });
  }
  return out;
}
