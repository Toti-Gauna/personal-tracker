import type { Goal, GoalsState } from './goals-types';

type Seed = Omit<Goal, 'id' | 'from' | 'progress' | 'repeat'> & { repeat?: boolean };

const WEEK: Seed[] = [
  { title: 'Ventas Foody', area: 'eclipse', group: 'Eclipse', horizon: 'semana', type: 'numero', target: 23, unit: 'ventas', quick: true, quickLabel: 'Venta Foody' },
  { title: 'Ventas Roofy', area: 'eclipse', group: 'Eclipse', horizon: 'semana', type: 'numero', target: 23, unit: 'ventas' },
  { title: 'Demos terminadas', area: 'eclipse', group: 'Eclipse', horizon: 'semana', type: 'numero', target: 12, unit: 'demos' },
  { title: 'Especialistas', rama: 'handyx', area: 'handyx', group: 'Handyx', horizon: 'semana', type: 'numero', target: 56, unit: 'especialistas' },
  { title: 'Usuarios', rama: 'handyx', area: 'handyx', group: 'Handyx', horizon: 'semana', type: 'numero', target: 100, unit: 'usuarios', quick: true, quickLabel: 'Usuario Handyx' },
  { title: 'Correr', rama: 'salud', area: 'salud', group: 'Salud', horizon: 'semana', type: 'contador', target: 7, unit: 'veces', auto: { kind: 'correr' } },
  { title: 'Comer sano', rama: 'salud', area: 'salud', group: 'Salud', horizon: 'semana', type: 'contador', target: 7, unit: 'días' },
];

const MONTH: Seed[] = [
  { title: 'Leer Make It Stick', area: 'handyx', horizon: 'mes', type: 'numero', target: 313, unit: 'págs', auto: { kind: 'actividad', id: 'make-it-stick' } },
  { title: 'Ventas de Eclipse', area: 'eclipse', horizon: 'mes', type: 'numero', target: 10, unit: 'ventas' },
];

const BIM: Seed[] = [
  { title: 'Leer Make It Stick', area: 'handyx', horizon: 'bim', type: 'numero', target: 8, unit: 'caps', repeat: false },
  { title: 'Meditar 3× por semana', area: 'rutina', horizon: 'bim', type: 'contador', target: 3, unit: 'veces', repeat: false },
  { title: 'Pagar deudas', area: 'economia', horizon: 'bim', type: 'numero', target: 3, unit: 'pagos', repeat: false },
];

const YEAR: Seed[] = [
  { title: 'USD 3.000 por mes en ventas', area: 'eclipse', horizon: 'anio', type: 'numero', target: 3000, unit: 'USD', step: 100, note: 'Un producto nuevo por bimestre para vender' },
  { title: '100 usuarios y 56 especialistas', rama: 'handyx', area: 'handyx', horizon: 'anio', type: 'numero', target: 100, unit: 'usuarios', note: 'Lanzar el MVP y sumar la primera ciudad' },
  { title: 'Llegar a 95 kg entrenando 6 días', rama: 'salud', area: 'salud', horizon: 'anio', type: 'numero', target: 95, unit: 'kg', note: 'Peso cada domingo, entreno con Abi', auto: { kind: 'peso' } },
];

/**
 * Metas personales que el plan T+18 reemplaza con sus contadores (búsqueda, horas, entrenos,
 * tests): se sacan de los datos guardados solo si son semillas sin avance.
 */
export const REEMPLAZADAS_POR_PLAN: [string, string][] = [
  ['Entrenar', 'semana'], ['CV enviados', 'semana'], ['Mensajes a RRHH', 'semana'],
  ['Tests aprobados con 85 % o más', 'mes'], ['Horas de programación', 'mes'], ['CV enviados', 'mes'], ['Entrenamientos', 'mes'],
  ['Primer trabajo remoto como AI/ML engineer', 'anio'], ['Terminar la matemática de los 6 bimestres', 'anio'],
];
/** Rama del plan de las metas personales de partida. */
export const RAMA_DE_SEMILLA: Record<string, Goal['rama']> = {
  Especialistas: 'handyx', Usuarios: 'handyx', Correr: 'salud', 'Comer sano': 'salud', '100 usuarios y 56 especialistas': 'handyx', 'Llegar a 95 kg entrenando 6 días': 'salud',
};

/** Las metas de partida del diseño: se editan, se borran y se suman otras desde "Nueva meta". */
export function defaultGoals(today: string, keys: Record<string, string>): Goal[] {
  const all = [...WEEK, ...MONTH, ...BIM, ...YEAR];
  return all.map((s, i) => ({
    ...s,
    id: `g-seed-${i}`,
    repeat: s.repeat ?? (s.horizon === 'semana' || s.horizon === 'mes' || s.horizon === 'dia'),
    from: keys[s.horizon] ?? today,
    progress: {},
  }));
}

export const emptyGoals = (): GoalsState => ({ goals: [], bimesterNames: {} });
