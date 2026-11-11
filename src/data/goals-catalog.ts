import type { Goal, GoalsState } from './goals-types';

type Seed = Omit<Goal, 'id' | 'from' | 'progress' | 'repeat'> & { repeat?: boolean };

const WEEK: Seed[] = [
  { title: 'Ventas Foody', area: 'eclipse', group: 'Eclipse', horizon: 'semana', type: 'numero', target: 23, unit: 'ventas', quick: true, quickLabel: 'Venta Foody' },
  { title: 'Ventas Roofy', area: 'eclipse', group: 'Eclipse', horizon: 'semana', type: 'numero', target: 23, unit: 'ventas' },
  { title: 'Demos terminadas', area: 'eclipse', group: 'Eclipse', horizon: 'semana', type: 'numero', target: 12, unit: 'demos' },
  { title: 'Especialistas', area: 'handyx', group: 'Handyx', horizon: 'semana', type: 'numero', target: 56, unit: 'especialistas' },
  { title: 'Usuarios', area: 'handyx', group: 'Handyx', horizon: 'semana', type: 'numero', target: 100, unit: 'usuarios', quick: true, quickLabel: 'Usuario Handyx' },
  { title: 'Entrenar', area: 'salud', group: 'Salud', horizon: 'semana', type: 'contador', target: 7, unit: 'veces', quick: true, quickLabel: 'Entrené' },
  { title: 'Correr', area: 'salud', group: 'Salud', horizon: 'semana', type: 'contador', target: 7, unit: 'veces' },
  { title: 'Comer sano', area: 'salud', group: 'Salud', horizon: 'semana', type: 'contador', target: 7, unit: 'días' },
  { title: 'CV enviados', area: 'rutina', group: 'Trabajo nuevo', horizon: 'semana', type: 'numero', target: 70, unit: 'CV', step: 10, quick: true },
  { title: 'Mensajes a RRHH', area: 'rutina', group: 'Trabajo nuevo', horizon: 'semana', type: 'numero', target: 7, unit: 'mensajes' },
];

const MONTH: Seed[] = [
  { title: 'Tests aprobados con 85 % o más', area: 'ing', horizon: 'mes', type: 'numero', target: 5, unit: 'tests', auto: { kind: 'tests' } },
  { title: 'Horas de programación', area: 'ing', horizon: 'mes', type: 'numero', target: 40, unit: 'h', auto: { kind: 'horas', front: 'prog' } },
  { title: 'Leer Make It Stick', area: 'handyx', horizon: 'mes', type: 'numero', target: 313, unit: 'págs', auto: { kind: 'actividad', id: 'make-it-stick' } },
  { title: 'Ventas de Eclipse', area: 'eclipse', horizon: 'mes', type: 'numero', target: 10, unit: 'ventas' },
  { title: 'CV enviados', area: 'rutina', horizon: 'mes', type: 'numero', target: 300, unit: 'CV', step: 10 },
  { title: 'Entrenamientos', area: 'salud', horizon: 'mes', type: 'numero', target: 26, unit: 'veces' },
];

const BIM: Seed[] = [
  { title: 'Leer Make It Stick', area: 'handyx', horizon: 'bim', type: 'numero', target: 8, unit: 'caps', repeat: false },
  { title: 'Meditar 3× por semana', area: 'rutina', horizon: 'bim', type: 'contador', target: 3, unit: 'veces', repeat: false },
  { title: 'Pagar deudas', area: 'economia', horizon: 'bim', type: 'numero', target: 3, unit: 'pagos', repeat: false },
];

const YEAR: Seed[] = [
  { title: 'Primer trabajo remoto como AI/ML engineer', area: 'rutina', group: 'Trabajo nuevo', horizon: 'anio', type: 'numero', target: 6, unit: 'bim.', note: 'Roadmap, portfolio de 6 productos y búsqueda activa desde el bimestre 4' },
  { title: 'USD 3.000 por mes en ventas', area: 'eclipse', horizon: 'anio', type: 'numero', target: 3000, unit: 'USD', step: 100, note: 'Un producto nuevo por bimestre para vender' },
  { title: '100 usuarios y 56 especialistas', area: 'handyx', horizon: 'anio', type: 'numero', target: 100, unit: 'usuarios', note: 'Lanzar el MVP y sumar la primera ciudad' },
  { title: 'Llegar a 95 kg entrenando 6 días', area: 'salud', horizon: 'anio', type: 'numero', target: 95, unit: 'kg', note: 'Peso cada domingo, entreno con Abi' },
  { title: 'Terminar la matemática de los 6 bimestres', area: 'ing', horizon: 'anio', type: 'numero', target: 6, unit: 'bim.', note: 'CONAMAT, álgebra lineal, cálculo y probabilidad' },
];

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
