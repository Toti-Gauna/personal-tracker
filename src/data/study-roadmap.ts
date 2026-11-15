/**
 * Roadmaps de estudio (ola 12a): un libro que manda por fase y herramientas que se activan
 * cuando el problema lo pide. Fuente: data/study-roadmaps.json. Puro, sin estado.
 */
import raw from '../../data/study-roadmaps.json';
import type { ErrType, StudyState } from './study-types';

export type RolMaterial = 'nucleo' | 'complementario' | 'banco' | 'curso' | 'referencia';
export const ROLES: RolMaterial[] = ['nucleo', 'complementario', 'banco', 'curso', 'referencia'];

export interface Material {
  id: string;
  titulo: string;
  autor?: string;
  rol: RolMaterial;
  /** Para qué se usa. */
  uso: string;
  /** Cuándo se activa (los que no son núcleo). */
  cuando?: string;
  /** Qué parte del libro toca en esta fase, si el libro aparece en más de una ("Cálculo I"). */
  parte?: string;
}

export interface Bloque {
  titulo: string;
  /** Id del material núcleo del bloque. */
  nucleo: string;
  complementos?: string[];
  temas?: string[];
}

export interface Fase {
  id: string;
  nombre: string;
  /** El perfil que tenés al cerrar la fase ("Aritmético"). */
  perfil: string;
  /** Duración estimada en meses, de mínimo a máximo. */
  meses: [number, number];
  objetivo: string;
  materiales: Material[];
  bloques?: Bloque[];
  /** Lo que no entra en esta fase y por qué. */
  descartados?: string[];
  proyecto: { nombre: string; modulos: string[] };
  /** Lo que tenés que poder hacer para pasar. Se confirma a mano. */
  salida: string[];
  /** Actividad de Estudio que aporta evidencia (capítulos aprobados). */
  actividad?: string;
}

export type MotivoActivar = ErrType | 'profundidad';
export type Luz = 'verde' | 'amarillo' | 'rojo';

export interface RoadmapEstudio {
  id: string;
  nombre: string;
  /** Frente de Estudio al que pertenece. */
  frente: string;
  /** Color del cuaderno (token de área). */
  color: string;
  descripcion: string;
  regla: string;
  lema?: string;
  roles: Record<RolMaterial, { nombre: string; uso: string }>;
  protocolo: { paso: string; detalle: string }[];
  semaforo: { verde: number; amarillo: number; textos: Record<Luz, string> };
  activar: Record<MotivoActivar, { roles: RolMaterial[]; texto: string }>;
  cursos: { cuando: string; detalle: string }[];
  fases: Fase[];
  anios: { anio: number; fases: string[]; objetivo: string }[];
}

export interface StudyRoadmaps {
  version: 1;
  roadmaps: RoadmapEstudio[];
}

/** Progreso guardado de un roadmap: criterios de salida tildados y fases cerradas. */
export interface ProgresoRoadmap {
  /** Fase → índices de `salida` confirmados. */
  salida: Record<string, number[]>;
  /** Fase → fecha en que la cerraste. */
  cerradas: Record<string, string>;
}
export type EstudioRutaState = Record<string, ProgresoRoadmap>;
export const emptyEstudioRuta = (): EstudioRutaState => ({});
export const progresoVacio = (): ProgresoRoadmap => ({ salida: {}, cerradas: {} });

// ——— validación ———

const MOTIVOS: MotivoActivar[] = ['concepto', 'tecnica', 'descuido', 'enunciado', 'profundidad'];

/** Revisa el JSON a mano (sin dependencias). Devuelve la lista de problemas; vacía si está bien. */
export function validar(doc: unknown): string[] {
  const err: string[] = [];
  const d = doc as Partial<StudyRoadmaps>;
  if (!d || d.version !== 1) err.push('version debe ser 1');
  if (!Array.isArray(d?.roadmaps) || !d.roadmaps.length) return [...err, 'roadmaps vacío'];
  const ids = new Set<string>();
  for (const r of d.roadmaps) {
    const en = `roadmap ${r.id}`;
    if (!r.id || ids.has(r.id)) err.push(`${en}: id vacío o repetido`);
    ids.add(r.id);
    for (const k of ['nombre', 'frente', 'color', 'descripcion', 'regla'] as const) if (!r[k]) err.push(`${en}: falta ${k}`);
    for (const rol of ROLES) if (!r.roles?.[rol]?.nombre) err.push(`${en}: falta el rol ${rol}`);
    const s = r.semaforo;
    if (!s || !(s.amarillo > 0 && s.amarillo < s.verde && s.verde <= 1)) err.push(`${en}: semáforo inválido (0 < amarillo < verde ≤ 1)`);
    for (const m of MOTIVOS) {
      if (!r.activar?.[m]) err.push(`${en}: falta activar.${m}`);
      else for (const rol of r.activar[m].roles) if (!ROLES.includes(rol)) err.push(`${en}: activar.${m} tiene un rol desconocido (${rol})`);
    }
    if (!r.protocolo?.length) err.push(`${en}: falta el protocolo`);
    if (!r.fases?.length) { err.push(`${en}: sin fases`); continue; }
    const fases = new Set<string>();
    for (const f of r.fases) {
      const ef = `${en} · ${f.id}`;
      if (!f.id || fases.has(f.id)) err.push(`${ef}: id vacío o repetido`);
      fases.add(f.id);
      for (const k of ['nombre', 'perfil', 'objetivo'] as const) if (!f[k]) err.push(`${ef}: falta ${k}`);
      if (!Array.isArray(f.meses) || f.meses.length !== 2 || !(f.meses[0] > 0 && f.meses[0] <= f.meses[1])) err.push(`${ef}: meses inválidos`);
      if (!f.materiales?.length) err.push(`${ef}: sin materiales`);
      if (!f.materiales?.some((m) => m.rol === 'nucleo')) err.push(`${ef}: sin libro núcleo`);
      const mats = new Set<string>();
      for (const m of f.materiales ?? []) {
        if (!m.id || mats.has(m.id)) err.push(`${ef}: material con id vacío o repetido (${m.id})`);
        mats.add(m.id);
        if (!ROLES.includes(m.rol)) err.push(`${ef}: ${m.id} tiene un rol desconocido (${m.rol})`);
        if (!m.titulo || !m.uso) err.push(`${ef}: ${m.id} sin título o uso`);
      }
      for (const b of f.bloques ?? []) {
        if (!mats.has(b.nucleo)) err.push(`${ef}: el bloque "${b.titulo}" apunta a un núcleo que no está en la fase (${b.nucleo})`);
        else if (f.materiales.find((m) => m.id === b.nucleo)!.rol !== 'nucleo') err.push(`${ef}: el núcleo del bloque "${b.titulo}" no es un libro núcleo`);
        for (const c of b.complementos ?? []) if (!mats.has(c)) err.push(`${ef}: el bloque "${b.titulo}" apunta a un complemento que no está en la fase (${c})`);
      }
      if (!f.proyecto?.nombre || !f.proyecto.modulos?.length) err.push(`${ef}: proyecto incompleto`);
      if (!f.salida?.length) err.push(`${ef}: sin criterios de salida`);
    }
    for (const a of r.anios ?? []) for (const id of a.fases) if (!fases.has(id)) err.push(`${en}: el año ${a.anio} apunta a una fase que no existe (${id})`);
  }
  return err;
}

const doc = raw as unknown as StudyRoadmaps;
const problemas = validar(doc);
if (problemas.length) console.error('data/study-roadmaps.json tiene problemas:\n' + problemas.join('\n'));

export const STUDY_ROADMAPS: RoadmapEstudio[] = doc.roadmaps;
export const roadmapPorId = (id: string) => STUDY_ROADMAPS.find((r) => r.id === id);

// ——— lógica ———

/** Semáforo de un puntaje (0 a 1): verde avanza, amarillo activa complementario, rojo vuelve. */
export function semaforo(pct: number, r: Pick<RoadmapEstudio, 'semaforo'>): Luz {
  if (pct >= r.semaforo.verde) return 'verde';
  if (pct >= r.semaforo.amarillo) return 'amarillo';
  return 'rojo';
}

/** Qué materiales de la fase activar según el tipo de error. Nunca el núcleo: ese ya lo estás usando. */
export function paraActivar(r: RoadmapEstudio, f: Fase, motivo: MotivoActivar): Material[] {
  const roles = r.activar[motivo]?.roles ?? [];
  return f.materiales.filter((m) => m.rol !== 'nucleo' && roles.includes(m.rol))
    .sort((a, b) => roles.indexOf(a.rol) - roles.indexOf(b.rol));
}

/** Los materiales de una fase agrupados por rol, en el orden de ROLES. */
export const porRol = (f: Fase) => ROLES.map((rol) => [rol, f.materiales.filter((m) => m.rol === rol)] as const).filter(([, ms]) => ms.length);

/** Evidencia de Estudio para una fase: capítulos aprobados de su actividad. */
export function evidencia(f: Fase, study: Pick<StudyState, 'activities' | 'units'>): { hechos: number; total: number } | null {
  if (!f.actividad) return null;
  const a = study.activities.find((x) => x.id === f.actividad);
  if (!a) return null;
  if (a.units?.length) return { hechos: a.units.filter((u) => study.units[a.id]?.[u.n]?.approvedOn).length, total: a.units.length };
  return a.total ? { hechos: Math.min(a.progress, a.total), total: a.total } : null;
}

export interface EstadoFase {
  fase: Fase;
  i: number;
  estado: 'cerrada' | 'actual' | 'proxima';
  /** Criterios de salida confirmados. */
  criterios: { hechos: number; total: number };
  evidencia: { hechos: number; total: number } | null;
  /** Todos los criterios confirmados: se puede cerrar. */
  lista: boolean;
  cerrada?: string;
}

/**
 * Estado de cada fase. La actual es la primera sin cerrar: las fases se cierran en orden, a mano,
 * cuando confirmás sus criterios de salida (terminar páginas no alcanza).
 */
export function estadoFases(r: RoadmapEstudio, p: ProgresoRoadmap = progresoVacio(), study?: Pick<StudyState, 'activities' | 'units'>): EstadoFase[] {
  const actual = r.fases.findIndex((f) => !p.cerradas[f.id]);
  return r.fases.map((fase, i) => {
    const hechos = (p.salida[fase.id] ?? []).filter((k) => k >= 0 && k < fase.salida.length).length;
    return {
      fase, i,
      estado: p.cerradas[fase.id] ? 'cerrada' : i === actual ? 'actual' : 'proxima',
      criterios: { hechos, total: fase.salida.length },
      evidencia: study ? evidencia(fase, study) : null,
      lista: hechos === fase.salida.length,
      cerrada: p.cerradas[fase.id],
    };
  });
}

/** Dónde estás: la fase actual, tu perfil (el de la última cerrada) y el próximo. */
export function dondeEstas(r: RoadmapEstudio, p: ProgresoRoadmap = progresoVacio()) {
  const est = estadoFases(r, p);
  const actual = est.find((e) => e.estado === 'actual') ?? null;
  const cerradas = est.filter((e) => e.estado === 'cerrada');
  const ultima = cerradas[cerradas.length - 1];
  return {
    actual: actual?.fase ?? null,
    /** Perfil que ya tenés (null si no cerraste ninguna fase). */
    perfil: ultima?.fase.perfil ?? null,
    /** Perfil al que vas: el de la fase actual. */
    proximo: actual?.fase.perfil ?? null,
    cerradas: cerradas.length,
    total: r.fases.length,
    terminado: !actual,
  };
}

/** Meses estimados que quedan desde la fase actual (incluida), de mínimo a máximo. */
export function mesesRestantes(r: RoadmapEstudio, p: ProgresoRoadmap = progresoVacio()): [number, number] {
  return r.fases.filter((f) => !p.cerradas[f.id]).reduce<[number, number]>((a, f) => [a[0] + f.meses[0], a[1] + f.meses[1]], [0, 0]);
}
