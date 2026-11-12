import { addDays, daysBetween } from './time';
import { blockDone, mejoraDia } from './mejora';
import type { DayLog } from './types';
import type { State } from '../state/store';
import { valueOf } from './goals';

export const SEAL_XP = 50;
export const XP_PER_TASK = 4;
export const XP_PER_GOAL = 10;

/** XP que da un día: 4 por tarea hecha y 10 por meta cumplida. */
export function dayXp(day: Pick<DayLog, 'blocks'>) {
  const tasks = day.blocks.flatMap((b) => b.tasks).filter((t) => t.done).length;
  return tasks * XP_PER_TASK + day.blocks.filter(blockDone).length * XP_PER_GOAL;
}

/** Subir del nivel n al n+1 cuesta 300 XP más 100 por cada nivel: 300, 400, 500… */
export const levelCost = (n: number) => 300 + 100 * (n - 1);

export function levelOf(xp: number) {
  let n = 1;
  let acc = 0;
  while (xp >= acc + levelCost(n)) {
    acc += levelCost(n);
    n++;
  }
  return { level: n, into: xp - acc, cost: levelCost(n), toNext: acc + levelCost(n) - xp };
}

export type SealGroup = 'constancia' | 'cuerpo' | 'estudio' | 'trabajo';
export const GROUP_LABEL: Record<SealGroup, string> = { constancia: 'Constancia', cuerpo: 'Cuerpo', estudio: 'Estudio', trabajo: 'Trabajo' };
export const GROUP_ORDER: SealGroup[] = ['constancia', 'cuerpo', 'estudio', 'trabajo'];

export interface Progress {
  value: number;
  target: number;
  /** "Hoy 88,4 kg · faltan 1,6" */
  hint: string;
}

export interface SealDef {
  id: string;
  group: SealGroup;
  /** Lo que va dentro del círculo. */
  mark: string;
  name: string;
  /** Cómo se gana. */
  how: string;
  /** Frase del sello al ganarlo. */
  line: string;
  color: string;
  /** Se marca a mano desde el sello. */
  manual?: boolean;
  test: (c: Ctx) => boolean;
  progress?: (c: Ctx) => Progress;
}

export interface Ctx {
  s: State;
  date: string;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const closedDays = (s: State) => Object.values(s.days).filter((d) => d.closed).sort((a, b) => a.date.localeCompare(b.date));
const active = (d: DayLog) => mejoraDia(d) > 0;

/** Racha más larga de días seguidos con alguna meta cumplida. */
export function bestStreak(days: Record<string, DayLog>) {
  const keys = Object.keys(days).filter((k) => active(days[k])).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/** Días seguidos que te levantaste a las 4:30 o antes. */
export function earlyStreak(days: Record<string, DayLog>) {
  const keys = Object.keys(days).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const k of keys) {
    const early = days[k].wake <= '04:30';
    run = early ? (prev && addDays(prev, 1) === k ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    prev = early ? k : '';
  }
  return best;
}

const maxKg = (s: State, ex: string, who: 'me' | 'partner' = 'me') =>
  Math.max(0, ...s.train.sessions.filter((x) => !x.deload).flatMap((x) => x.sets).filter((x) => x.who === who && x.ex.includes(ex)).map((x) => x.kg));
const lastWeight = (s: State) => [...s.train.weights].sort((a, b) => a.date.localeCompare(b.date)).pop()?.kg ?? 0;
const approvedUnits = (s: State, act: string) => s.study.activities.find((a) => a.id === act)?.units?.filter((u) => s.study.units[act]?.[u.n]?.approvedOn) ?? [];
const matureCards = (s: State) => s.study.cards.filter((c) => c.srs?.state === 'review' && c.srs.s >= 21).length;
const mejoraAcum = (s: State, upTo: string) => {
  const ks = Object.keys(s.days).filter((k) => k <= upTo).sort();
  return (ks.reduce((p, k) => p * (1 + mejoraDia(s.days[k]) / 100), 1) - 1) * 100;
};
const prog = (value: number, target: number, hint: string): Progress => ({ value: Math.min(value, target), target, hint });

/** Los 24 sellos, en 4 grupos de 6. */
export const SEALS: SealDef[] = [
  // Constancia
  { id: 'hombre-nuevo', group: 'constancia', mark: 'D0', name: 'Hombre nuevo', how: 'Empezar el día 0 de la ruta.', line: 'Empezó la ruta.', color: 'var(--rutina)', test: ({ s }) => Object.keys(s.days).length > 0 },
  { id: 'madrugador', group: 'constancia', mark: '04', name: 'Madrugador', how: 'Levantarte a las 4:30 o antes 3 días seguidos.', line: 'Tres días seguidos arriba a las 4.', color: 'var(--economia)',
    test: ({ s }) => earlyStreak(s.days) >= 3, progress: ({ s }) => prog(earlyStreak(s.days), 3, `Racha de madrugadas: ${earlyStreak(s.days)}`) },
  { id: 'siete', group: 'constancia', mark: '7', name: '7 seguidos', how: '7 días seguidos cumpliendo al menos una meta.', line: 'Una semana sin cortar la racha.', color: 'var(--ing)',
    test: ({ s }) => bestStreak(s.days) >= 7, progress: ({ s }) => prog(bestStreak(s.days), 7, `Mejor racha: ${bestStreak(s.days)}`) },
  { id: 'treinta', group: 'constancia', mark: '30', name: '30 seguidos', how: '30 días seguidos cumpliendo al menos una meta.', line: 'Un mes entero sin cortar.', color: 'var(--ing)',
    test: ({ s }) => bestStreak(s.days) >= 30, progress: ({ s }) => prog(bestStreak(s.days), 30, `Mejor racha: ${bestStreak(s.days)}`) },
  { id: 'cien-dias', group: 'constancia', mark: '100', name: '100 días', how: 'Cerrar 100 días.', line: 'Cien días cerrados.', color: 'var(--economia)',
    test: ({ s }) => closedDays(s).length >= 100, progress: ({ s }) => prog(closedDays(s).length, 100, `${closedDays(s).length} ${closedDays(s).length === 1 ? 'día cerrado' : 'días cerrados'}`) },
  { id: 'dia-perfecto', group: 'constancia', mark: '1%', name: 'Día perfecto', how: 'Cumplir las 8 metas de un día: 1 % de mejora.', line: 'Un día completo: 1 % de mejora.', color: 'var(--economia)',
    test: ({ s }) => Object.values(s.days).some((d) => d.blocks.length > 0 && d.blocks.every(blockDone)) },
  // Cuerpo
  { id: 'primer-entreno', group: 'cuerpo', mark: '1', name: 'Primer entreno', how: 'Terminar tu primer entrenamiento.', line: 'Primer entreno en el cuaderno.', color: 'var(--salud)', test: ({ s }) => s.train.sessions.length >= 1 },
  { id: 'pesar-90', group: 'cuerpo', mark: '90', name: 'Pesar 90', how: 'Llegar a 90 kg.', line: 'Llegaste a los 90 kg.', color: 'var(--salud)',
    test: ({ s }) => lastWeight(s) >= 90, progress: ({ s }) => prog(lastWeight(s), 90, `Hoy ${fmt(lastWeight(s))} kg · faltan ${fmt(Math.max(0, 90 - lastWeight(s)))}`) },
  { id: 'pesar-95', group: 'cuerpo', mark: '95', name: 'Pesar 95', how: 'Llegar a 95 kg.', line: 'La meta del año: 95 kg.', color: 'var(--salud)',
    test: ({ s }) => lastWeight(s) >= 95, progress: ({ s }) => prog(lastWeight(s), 95, `Hoy ${fmt(lastWeight(s))} kg · faltan ${fmt(Math.max(0, 95 - lastWeight(s)))}`) },
  { id: 'sentadilla-120', group: 'cuerpo', mark: '120', name: 'Sentadilla 120', how: 'Hacer una serie de sentadilla con 120 kg o más.', line: 'Sentadilla con 120 kg.', color: 'var(--salud)',
    test: ({ s }) => maxKg(s, 'sentadilla') >= 120, progress: ({ s }) => prog(maxKg(s, 'sentadilla'), 120, `Tu mejor: ${fmt(maxKg(s, 'sentadilla'))} kg`) },
  { id: 'record-reps', group: 'cuerpo', mark: '+1', name: 'Récord de reps', how: 'Batir un récord en un entreno.', line: 'Primer récord batido.', color: 'var(--salud)', test: ({ s }) => s.train.sessions.some((x) => x.records.length > 0) },
  { id: 'cincuenta-abi', group: 'cuerpo', mark: '50', name: '50 con Abi', how: 'Entrenar 50 veces en pareja.', line: 'Cincuenta entrenos juntos.', color: 'var(--salud)',
    test: ({ s }) => s.train.sessions.filter((x) => x.athletes.length > 1).length >= 50, progress: ({ s }) => prog(s.train.sessions.filter((x) => x.athletes.length > 1).length, 50, `${s.train.sessions.filter((x) => x.athletes.length > 1).length} entrenos juntos`) },
  // Estudio
  { id: 'primer-capitulo', group: 'estudio', mark: 'C1', name: 'Primer capítulo', how: 'Aprobar tu primer capítulo con test.', line: 'Primer capítulo aprobado.', color: 'var(--ing)',
    test: ({ s }) => s.study.activities.some((a) => a.units && approvedUnits(s, a.id).length > 0) },
  { id: 'memoria-viva', group: 'estudio', mark: '100', name: 'Memoria viva', how: 'Tener 100 tarjetas maduras: recordadas a más de 21 días.', line: 'Cien tarjetas ya maduras.', color: 'var(--ing)',
    test: ({ s }) => matureCards(s) >= 100, progress: ({ s }) => prog(matureCards(s), 100, 'Recordadas a más de 21 días') },
  { id: 'test-perfecto', group: 'estudio', mark: '100%', name: 'Test perfecto', how: 'Sacar 100 % en un test.', line: 'Test sin un error.', color: 'var(--ing)',
    test: ({ s }) => Object.values(s.study.units).flatMap((u) => Object.values(u)).flatMap((x) => x.tests).some((t) => t.total > 0 && t.score === t.total) },
  { id: 'aritmetica', group: 'estudio', mark: 'AR', name: 'Aritmética', how: 'Aprobar los 11 capítulos de Aritmética de CONAMAT.', line: 'Aritmética completa.', color: 'var(--ing)',
    test: ({ s }) => approvedUnits(s, 'conamat').length >= 11, progress: ({ s }) => prog(approvedUnits(s, 'conamat').length, 11, 'CONAMAT, 11 capítulos') },
  { id: 'conamat', group: 'estudio', mark: '69', name: 'CONAMAT completo', how: 'Aprobar los 69 capítulos de CONAMAT, del B1 al B6.', line: 'CONAMAT, completo.', color: 'var(--ing)',
    test: ({ s }) => approvedUnits(s, 'conamat').length >= 69, progress: ({ s }) => prog(approvedUnits(s, 'conamat').length, 69, 'Llegan los capítulos de los bimestres 2 al 6') },
  { id: 'libro', group: 'estudio', mark: 'L1', name: 'Libro terminado', how: 'Terminar un libro o curso cargado como actividad.', line: 'Un libro terminado.', color: 'var(--handyx)',
    test: ({ s }) => s.study.activities.some((a) => !a.units && a.total > 0 && a.progress >= a.total) },
  // Trabajo
  { id: 'primera-venta', group: 'trabajo', mark: '$', name: 'Primera venta', how: 'Registrar una venta en tus metas.', line: 'Primera venta.', color: 'var(--eclipse)',
    test: ({ s }) => s.goals.goals.some((g) => /venta/i.test(g.title) && !g.auto && Object.values(g.progress).some((v) => v > 0)) },
  { id: 'bimestre-cerrado', group: 'trabajo', mark: 'B1', name: 'Bimestre cerrado', how: 'Terminar un bimestre de la ruta.', line: 'Un bimestre cerrado.', color: 'var(--eclipse)',
    test: ({ date }) => date > '2027-01-15' },
  { id: 'mvp', group: 'trabajo', mark: 'MVP', name: 'MVP de Handyx', how: 'Lanzar el MVP de Handyx. Lo marcás vos.', line: 'El MVP de Handyx, lanzado.', color: 'var(--handyx)', manual: true, test: () => false },
  { id: 'usd-3000', group: 'trabajo', mark: '3K', name: 'USD 3.000', how: 'Llegar a USD 3.000 por mes en ventas.', line: 'USD 3.000 por mes.', color: 'var(--eclipse)',
    test: ({ s, date }) => s.goals.goals.filter((g) => g.horizon === 'anio' && g.unit === 'USD').some((g) => valueOf(g, date, { study: s.study, days: s.days, train: s.train }) >= g.target) },
  { id: 'trabajo-nuevo', group: 'trabajo', mark: 'AI', name: 'Trabajo nuevo', how: 'Conseguir tu primer trabajo remoto como AI/ML engineer. Lo marcás vos.', line: 'Primer trabajo remoto.', color: 'var(--rutina)', manual: true, test: () => false },
  { id: 'mejora-10', group: 'trabajo', mark: '+10', name: 'Mejora +10 %', how: 'Acumular +10 % de mejora diaria.', line: 'Mejora acumulada de +10 %.', color: 'var(--economia)',
    test: ({ s, date }) => mejoraAcum(s, date) >= 10, progress: ({ s, date }) => prog(mejoraAcum(s, date), 10, `Acumulado: +${fmt(mejoraAcum(s, date))} %`) },
];

export const sealById = (id: string) => SEALS.find((x) => x.id === id);

/** Sellos que se ganan hoy y todavía no estaban en la lista. */
export function newSeals(s: State, date: string) {
  const have = s.profile.seals;
  return SEALS.filter((d) => !have[d.id] && !d.manual && d.test({ s, date })).map((d) => d.id);
}

/** XP total: lo de los días cerrados más 50 por cada sello. */
export function totalXp(s: State) {
  return closedDays(s).reduce((a, d) => a + (d.closed?.xp ?? 0), 0) + Object.keys(s.profile.seals).length * SEAL_XP;
}

/** Hitos: los sellos que faltan con su avance, los más cercanos primero. */
export function hitos(s: State, date: string, n = 5) {
  return SEALS.filter((d) => !s.profile.seals[d.id] && d.progress)
    .map((d) => ({ def: d, p: d.progress!({ s, date }) }))
    .filter((x) => x.p.value > 0)
    .sort((a, b) => b.p.value / b.p.target - a.p.value / a.p.target)
    .slice(0, n);
}

/** Historial: un renglón por día cerrado, con los sellos que ganó. */
export function history(s: State, startDate: string) {
  const byDate = new Map<string, string[]>();
  for (const [id, d] of Object.entries(s.profile.seals)) byDate.set(d, [...(byDate.get(d) ?? []), sealById(id)?.name ?? id]);
  const dates = new Set([...closedDays(s).map((d) => d.date), ...byDate.keys()]);
  return [...dates].sort().reverse().map((date) => {
    const d = s.days[date];
    const day = Math.max(0, daysBetween(startDate, date));
    const pct = d?.closed ? Math.round(d.closed.score * 100) : null;
    const seals = byDate.get(date);
    return { date, text: `${pct != null ? `Día ${String(day).padStart(2, '0')} al ${pct} %.` : `Día ${String(day).padStart(2, '0')}.`}${seals ? ` ${seals.length > 1 ? 'Sellos' : 'Sello'} ${seals.join(', ')}.` : ''}` };
  });
}
