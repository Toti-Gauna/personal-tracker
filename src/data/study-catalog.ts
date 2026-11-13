import type { Activity, Front, Rules, StudyState, Unit } from './study-types';

export const FRONTS: Front[] = [
  { id: 'math', name: 'Matemática', color: 'ing' },
  { id: 'prog', name: 'Programación', color: 'salud' },
  { id: 'lectura', name: 'Lectura', color: 'handyx' },
  { id: 'ingles', name: 'Inglés', color: 'eclipse' },
];

const t = (count: number, desc: string, min = 25) => ({ count, desc, min });

/**
 * CONAMAT · Aritmética, caps. 1 a 11 (B1). `count` son los ejercicios nuevos del capítulo;
 * desde el cap. 2 el test suma 5 de los anteriores (ver `testOf`). Todos duran 25 min.
 */
export const CONAMAT_B1: Unit[] = [
  { n: 1, title: 'Números reales', test: t(15, '15 ejercicios de clasificar, ordenar y valor absoluto.') },
  { n: 2, title: 'Números enteros', test: t(15, '20 operaciones combinadas con signos de agrupación.') },
  { n: 3, title: 'Teoría de números', test: t(15, 'Divisibilidad, primos, MCD y MCM, más 25 % de 01-02.') },
  { n: 4, title: 'Números racionales', test: t(15, 'Fracciones equivalentes, operaciones y fracciones complejas.') },
  { n: 5, title: 'Números decimales', test: t(15, 'Operaciones y pasar de fracción a decimal y al revés.') },
  { n: 6, title: 'Potenciación y radicación', test: t(15, 'Leyes de exponentes, simplificar raíces y racionalizar.') },
  { n: 7, title: 'Notación científica y logaritmos', test: t(15, 'Convertir, operar y aplicar propiedades de logaritmos.') },
  { n: 8, title: 'Razones y proporciones', test: t(15, 'Regla de tres, porcentajes e interés simple con problemas.') },
  { n: 9, title: 'Sistemas de numeración', test: t(15, 'Conversiones entre bases (binario, octal, hex y otras) y operaciones en base 2.') },
  { n: 10, title: 'Sistema métrico decimal', test: t(15, 'Conversiones de longitud, masa, capacidad, superficie y volumen.') },
  { n: 11, title: 'Razonamiento aritmético', test: t(10, '10 problemas de enunciado mezclando todo lo anterior.') },
];

/** Puntos clave de cada capítulo («tema :: detalle»): contra esto se compara el cold recall. */
export const CONAMAT_PUNTOS: Record<number, string[]> = {
  1: ['Naturales, enteros, racionales e irracionales :: cada conjunto contiene al anterior; los reales son racionales e irracionales juntos', 'Número racional :: se puede escribir como fracción de enteros', 'Número irracional :: su decimal no es finito ni periódico (√2, π)', 'Valor absoluto :: distancia al cero, nunca negativo', 'Orden en la recta :: a la izquierda, menor', 'Opuesto :: mismo valor absoluto, signo contrario'],
  2: ['Qué son los enteros :: naturales, cero y opuestos', 'Suma con signos distintos :: restar valores absolutos, signo del mayor', 'Ley de signos del producto :: menos por menos da más', 'Restar es sumar el opuesto :: a − b = a + (−b)', 'Valor absoluto :: distancia al cero, siempre positiva', 'Orden en la recta :: −5 es menor que −2'],
  3: ['Divisibilidad :: a es divisible entre b si la división es exacta', 'Criterios de 2, 3, 5 y 9 :: última cifra par, suma de cifras múltiplo de 3, termina en 0 o 5, suma múltiplo de 9', 'Número primo :: tiene exactamente dos divisores', 'Descomposición en primos :: todo número es producto de primos de una sola forma', 'MCD :: factores comunes con el menor exponente', 'MCM :: factores comunes y no comunes con el mayor exponente'],
  4: ['Fracciones equivalentes :: multiplicar o dividir arriba y abajo por lo mismo', 'Simplificar :: dividir por el MCD de numerador y denominador', 'Suma con distinto denominador :: llevar al MCM de los denominadores', 'Producto de fracciones :: numerador por numerador, denominador por denominador', 'División de fracciones :: multiplicar por la inversa', 'Fracción compleja :: resolver arriba y abajo y después dividir'],
  5: ['Suma de decimales :: alinear la coma', 'Producto de decimales :: tantas cifras decimales como sumen los factores', 'Fracción a decimal :: dividir numerador entre denominador', 'Decimal finito a fracción :: sobre 10, 100 o 1000 y simplificar', 'Decimal periódico puro :: el período sobre tantos nueves como cifras tenga', 'Redondeo :: mirar la cifra siguiente'],
  6: ['Producto de potencias de igual base :: se suman los exponentes', 'Cociente de potencias :: se restan los exponentes', 'Potencia de una potencia :: se multiplican los exponentes', 'Exponente negativo :: a⁻ⁿ = 1/aⁿ', 'Simplificar una raíz :: sacar los factores con exponente igual al índice', 'Racionalizar :: multiplicar para sacar la raíz del denominador'],
  7: ['Notación científica :: a × 10ⁿ con 1 ≤ a < 10', 'Producto en notación científica :: multiplicar las mantisas y sumar exponentes', 'Logaritmo :: log_b(x) = y si bʸ = x', 'Log de un producto :: suma de logaritmos', 'Log de una potencia :: el exponente pasa multiplicando', 'Cambio de base :: log_b(x) = log(x) / log(b)'],
  8: ['Razón :: cociente entre dos cantidades', 'Proporción :: igualdad de dos razones; producto de extremos igual al de medios', 'Regla de tres directa :: si una crece, la otra crece', 'Regla de tres inversa :: si una crece, la otra decrece', 'Porcentaje :: x % de N es N · x / 100', 'Interés simple :: I = C · r · t'],
  9: ['Base de un sistema :: cuántos símbolos usa', 'Decimal a otra base :: divisiones sucesivas, restos al revés', 'Otra base a decimal :: cada cifra por la base elevada a su posición', 'Binario a hexadecimal :: agrupar de a 4 cifras', 'Hexadecimal :: usa 0-9 y A-F', 'Suma en base 2 :: 1 + 1 = 10'],
  10: ['Unidad de longitud :: el metro; cada escalón multiplica por 10', 'Superficie :: cada escalón multiplica por 100', 'Volumen :: cada escalón multiplica por 1000', '1 dm³ :: es 1 litro', 'Masa :: el gramo; 1 kg = 1000 g', 'Convertir :: hacia unidades más chicas se multiplica'],
  11: ['Leer el enunciado :: qué dan y qué piden', 'Plantear :: pasar el texto a una operación', 'Repartos proporcionales :: dividir el total por la suma de las partes', 'Problemas de edades :: plantear la diferencia, que no cambia', 'Velocidad :: distancia sobre tiempo', 'Verificar :: reemplazar el resultado en el enunciado'],
};

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

/**
 * Escalera del motor, en días del capítulo: 1 estudiar → 2 cold recall y test → 3 tesis →
 * 8 → 22 → 61 repetir. `days` cuenta desde el día en que estudiaste (cold recall, repetir) o
 * desde el test (tesis al día siguiente de aprobar; releer y re-test después de reprobar).
 */
export const LADDER = {
  cold: { days: 1, min: 5 },
  tesis: { days: 1, min: 20 },
  releer: { days: 1, min: 15 },
  retest: { days: 2, min: 25 },
  e8: { days: 7, min: 15 },
  e22: { days: 21, min: 15 },
  e61: { days: 60, min: 15 },
};

/** Día del capítulo en que toca cada cosa (para mostrarlo: "día 2", "día 61"). */
export const DIA = { estudiar: 1, test: 2, tesis: 3, e8: 8, e22: 22, e61: 61 } as const;

/** A la tercera vez sin aprobar, el tema queda marcado como flojo. */
export const MAX_TRIES = 3;
/** Descanso entre el test y la tesis. */
export const REST_TEST = 10;

/** Test completo: los ejercicios nuevos del capítulo y 5 de los anteriores, 25 min. */
export const TEST_PREV = 5;
export const TEST_MIN = 25;

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
