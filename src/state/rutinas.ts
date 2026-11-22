/** Ola 34 · las acciones de las rutinas propias: guardar, borrar, asignar y adaptar un día (sin perder lo ya hecho). */
import { adaptarRutina, rutinaParaFecha, type AsignacionRutina, type Cambio, type RutinaPropia } from '../data/motor-rutinas';
import { planPropio } from '../data/rutinas-propias';
import { ROUTINES_FILE, type RoutineBlock } from '../data/routines';
import { buildBlocks, newId } from '../data/schedule';
import type { Block } from '../data/types';
import { getState, setState } from './store';

const plan = (fn: (p: ReturnType<typeof getState>['plan']) => ReturnType<typeof getState>['plan']) => setState((s) => ({ ...s, plan: fn(s.plan) }));

/** Guarda (o reemplaza) una rutina propia y devuelve su id. */
export function guardarRutina(r: Omit<RutinaPropia, 'id'> & { id?: string }): string {
  const id = r.id ?? `rut-${newId()}`;
  plan((p) => ({ ...p, rutinasPropias: [...(p.rutinasPropias ?? []).filter((x) => x.id !== id), { ...r, id }] }));
  return id;
}

/** Borra una rutina y sus asignaciones (los días ya armados con ella quedan como están). */
export function borrarRutina(id: string) {
  plan((p) => ({ ...p, rutinasPropias: (p.rutinasPropias ?? []).filter((x) => x.id !== id), asignacionesRutina: (p.asignacionesRutina ?? []).filter((a) => a.rutina !== id) }));
}

export function asignarRutina(a: Omit<AsignacionRutina, 'id'>): string {
  const id = `asig-${newId()}`;
  // Un día tiene una sola rutina asignada: la nueva reemplaza a la anterior de ese día.
  plan((p) => ({ ...p, asignacionesRutina: [...(p.asignacionesRutina ?? []).filter((x) => !(a.tipo === 'dia' && x.tipo === 'dia' && x.fecha === a.fecha)), { ...a, id }] }));
  return id;
}

export function quitarAsignacion(id: string) {
  plan((p) => ({ ...p, asignacionesRutina: (p.asignacionesRutina ?? []).filter((a) => a.id !== id) }));
}

const conAvance = (b: Block) => !!b.hecho || b.tasks.some((t) => t.done);

/**
 * Rearma un día ya empezado con la rutina propia que rige esa fecha: los bloques donde ya hiciste algo quedan como estaban; el resto
 * se reemplaza. Sin rutina propia para esa fecha, no hace nada.
 */
export function rearmarDia(date: string) {
  setState((s) => {
    const day = s.days[date];
    const r = rutinaParaFecha(date, s.plan.asignacionesRutina, s.plan.rutinasPropias);
    if (!day || !r) return s;
    const hechos = day.blocks.filter(conAvance);
    const nuevos = buildBlocks(planPropio(r.bloques)).filter((b) => !hechos.some((h) => h.key === b.key));
    const blocks = [...hechos, ...nuevos].sort((a, b) => a.start.localeCompare(b.start)).map((b, i) => ({ ...b, n: i + 1 }));
    return { ...s, days: { ...s.days, [date]: { ...day, rutinaPropia: r.nombre, blocks } } };
  });
}

/** La rutina en la que se basa una fecha: la propia asignada o, si no, la plantilla del plan de ese día. */
export function rutinaBase(date: string, dayType?: string): RoutineBlock[] {
  const s = getState();
  const r = rutinaParaFecha(date, s.plan.asignacionesRutina, s.plan.rutinasPropias);
  if (r) return r.bloques;
  const t = (dayType ?? s.days[date]?.dayType ?? 'busqueda-intensiva') as keyof typeof ROUTINES_FILE.dayRoutines;
  return (ROUTINES_FILE.dayRoutines[t] ?? ROUTINES_FILE.dayRoutines['busqueda-intensiva']).blocks;
}

/** Adapta un día: arma la rutina con el cambio, la guarda, la asigna a esa fecha y rearma el día si ya empezó. */
export function adaptarDia(date: string, cambio: Cambio, nombre = `Adaptada · ${date}`): { id: string; faltan: { label: string; min: number }[]; errores: string[] } {
  const g = adaptarRutina(rutinaBase(date), cambio);
  const id = guardarRutina({ nombre, origen: getState().days[date]?.dayType, creada: date, bloques: g.bloques });
  asignarRutina({ rutina: id, tipo: 'dia', fecha: date });
  rearmarDia(date);
  return { id, faltan: g.faltan, errores: g.errores };
}
