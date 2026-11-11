import type { Activity, Front, Rules, StudyState, Unit } from './study-types';

export const FRONTS: Front[] = [
  { id: 'math', name: 'Matemática', color: 'ing' },
  { id: 'prog', name: 'Programación', color: 'salud' },
  { id: 'lectura', name: 'Lectura', color: 'handyx' },
  { id: 'ingles', name: 'Inglés', color: 'eclipse' },
];

const t = (count: number, desc: string, min = 25) => ({ count, desc, min });

/** CONAMAT · Aritmética, caps. 1 a 11 (B1). */
export const CONAMAT_B1: Unit[] = [
  { n: 1, title: 'Números reales', test: t(15, '15 ejercicios de clasificar, ordenar y valor absoluto.', 20) },
  { n: 2, title: 'Números enteros', test: t(20, '20 operaciones combinadas con signos de agrupación.') },
  { n: 3, title: 'Teoría de números', test: t(20, 'Divisibilidad, primos, MCD y MCM, más 25 % de los caps. 1 y 2.') },
  { n: 4, title: 'Números racionales', test: t(20, 'Fracciones equivalentes, operaciones y fracciones complejas.') },
  { n: 5, title: 'Números decimales', test: t(20, 'Operaciones y pasar de fracción a decimal y al revés.') },
  { n: 6, title: 'Potenciación y radicación', test: t(20, 'Leyes de exponentes, simplificar raíces y racionalizar.') },
  { n: 7, title: 'Notación científica y logaritmos', test: t(20, 'Convertir, operar y aplicar propiedades de logaritmos.') },
  { n: 8, title: 'Razones y proporciones', test: t(20, 'Regla de tres, porcentajes e interés simple con problemas.') },
  { n: 9, title: 'Sistemas de numeración', test: t(20, 'Conversiones entre bases (binario, octal, hex y otras) y operaciones en base 2.') },
  { n: 10, title: 'Sistema métrico decimal', test: t(20, 'Conversiones de longitud, masa, capacidad, superficie y volumen.') },
  { n: 11, title: 'Razonamiento aritmético', test: t(10, '10 problemas de enunciado mezclando todo lo anterior.') },
];

const build = 'Construir un ejercicio chico desde cero, sin mirar el curso.';
const book = 'Preguntas de concepto y aplicar una idea del libro en código.';

/** Programación del B1 según la ruta: Python, Fluent Python, FastAPI y AI Engineering. */
export const PROG_B1: Unit[] = [
  { n: 1, title: 'Python Tutorial, secciones 3 a 5', test: t(1, build) },
  { n: 2, title: 'Python Tutorial, secciones 6 a 10', test: t(1, `${build} Las 11 y 12, en lectura rápida.`) },
  { n: 3, title: 'Fluent Python, caps. 1 a 3', test: t(5, book) },
  { n: 4, title: 'Fluent Python, caps. 7 a 9', test: t(5, book) },
  { n: 5, title: 'FastAPI: rutas, Pydantic y dependencias', test: t(1, build) },
  { n: 6, title: 'FastAPI: seguridad, bases de datos y tests', test: t(1, build) },
  { n: 7, title: 'AI Engineering: evaluación, prompts y RAG', test: t(5, book) },
];

const TODOS = [0, 1, 2, 3, 4, 5];

export const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: 'conamat', title: 'CONAMAT · Aritmética', front: 'math', type: 'lectura', perSession: 1, total: 11, unit: 'caps.',
    days: TODOS, block: 'math', engine: true, progress: 0, units: CONAMAT_B1, unitLabel: 'Cap.', testMode: 'papel',
    final: { title: 'Examen de aritmética', desc: '40 ejercicios mixtos de todas las unidades, sin apuntes. Aprobás con 85 %.' },
  },
  {
    id: 'prog-b1', title: 'Python y FastAPI', front: 'prog', type: 'curso', perSession: 1, total: 7, unit: 'unidades',
    days: TODOS, block: 'prog', engine: true, progress: 0, units: PROG_B1, unitLabel: 'Unidad', testMode: 'app',
    final: { title: 'Complia Pro', desc: 'El producto del bimestre publicado, con README en inglés y demo de 2 minutos.' },
  },
  {
    id: 'make-it-stick', title: 'Make It Stick', front: 'lectura', type: 'lectura', perSession: 20, total: 313, unit: 'págs',
    days: [0, 2, 4], block: 'cierre', engine: true, progress: 0, testMode: 'app',
  },
];

export const emptyStudy = (): StudyState => ({
  fronts: FRONTS,
  activities: DEFAULT_ACTIVITIES,
  units: {},
  reviews: [],
  tesis: [],
  cards: [],
  rules: DEFAULT_RULES,
  log: [],
  points: {},
});

/** Duraciones de la escalera (min). El capítulo completo se repasa en ~50 min en dos meses. */
export const LADDER = {
  cold: { days: 1, min: 5 },
  tesis: { days: 3, min: 15 },
  e7: { days: 7, min: 10 },
  e21: { days: 21, min: 8 },
  e60: { days: 60, min: 12 },
  retest: { days: 2, min: 25 },
};

export const REVIEW_CAP = 20;

export const DEFAULT_RULES: Rules = {
  cap: REVIEW_CAP,
  retention: 0.9,
  newPerDay: 15,
  rereadBelow: 0.7,
  coldSkipAt: 0.85,
  shortenIfPerfect: true,
};

/** Segundos estimados por tarjeta (14 tarjetas ≈ 7 min). */
export const CARD_SEC = 30;
export const RELEER_MIN = 5;
export const PASS = 0.85;
/** Meta semanal de estudio: matemática 2 h + programación 2 h, 6 días. */
export const WEEK_GOAL_MIN = 24 * 60;

/** Unidad estimada en minutos por tipo de avance. */
export function minutesFor(a: Pick<Activity, 'perSession' | 'unit'>) {
  const u = a.unit.toLowerCase();
  if (u.startsWith('pág')) return Math.round(a.perSession * 1.75);
  if (u.startsWith('min')) return a.perSession;
  if (u.startsWith('lecc')) return a.perSession * 15;
  if (u.startsWith('secc')) return a.perSession * 20;
  if (u.startsWith('video')) return a.perSession * 20;
  return a.perSession * 30;
}
