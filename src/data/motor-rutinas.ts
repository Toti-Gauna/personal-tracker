/**
 * Ola 34 · el motor de rutinas del día. Genera una rutina a partir de restricciones (a qué hora te levantás y te acostás, lo fijo
 * del día y las horas que pide cada cosa), la adapta a otro horario (un día, días de la semana o un rango de fechas) y arranca de
 * una plantilla (las de v12.1, las archivadas o las tuyas). Una rutina propia se usa tal cual: sin las reglas automáticas del plan.
 * Puro: las horas son 'HH:MM' locales (America/Argentina/Buenos_Aires).
 */
import { ROUTINES_FILE, blockMin, type RoutineBlock } from './routines';
import { toHHMM, toMin } from './time';
import type { Area, RamaOMain } from './types';

export interface RutinaPropia {
  id: string;
  nombre: string;
  /** De qué plantilla o rutina salió. */
  origen?: string;
  creada: string;
  bloques: RoutineBlock[];
}

/** A qué días se aplica una rutina propia. Un día manda sobre un rango, y un rango sobre los días de la semana. */
export interface AsignacionRutina {
  id: string;
  rutina: string;
  tipo: 'dia' | 'semana' | 'rango';
  /** tipo 'dia'. */
  fecha?: string;
  /** tipo 'semana': días ISO (1 = lunes … 7 = domingo), desde `desde`. */
  dias?: number[];
  /** tipo 'semana' (desde) y 'rango' (desde y hasta, inclusive). */
  desde?: string;
  hasta?: string;
}

export interface Fijo { id?: string; label: string; start: string; end: string; area?: Area; rama?: RamaOMain; focus?: boolean; tasks?: string[] }
export interface Necesidad { id?: string; label: string; min: number; area?: Area; rama?: RamaOMain; focus?: boolean; tasks?: string[]; /** Tope por bloque (min); de fábrica 240. */ maxBloque?: number }

export interface Restricciones {
  despertar: string;
  dormir: string;
  /** Minutos para despertarse y arrancar (no es meta). De fábrica 30. */
  manana?: number;
  fijos: Fijo[];
  /** Lo que pide horas, en orden de prioridad: se ubica en los huecos entre los fijos. */
  necesidades: Necesidad[];
}

export interface Generada {
  bloques: RoutineBlock[];
  /** Lo que no entró (min por necesidad). */
  faltan: { label: string; min: number }[];
  /** Minutos libres que quedaron. */
  libre: number;
  /** Problemas con los fijos (se pisan o caen fuera del día). */
  errores: string[];
}

const DIA = 24 * 60;
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bloque';
const redondear = (m: number) => Math.round(m / 5) * 5;
/** Minutos desde el despertar (el día puede cruzar la medianoche hasta la hora de dormir). */
const rel = (hhmm: string, base: number) => (toMin(hhmm) - base + DIA) % DIA;

/**
 * Arma la rutina: el despertar, los fijos donde van, y cada necesidad (en orden) en los huecos, partida en bloques de hasta
 * `maxBloque`. Lo que sobra queda como "Libre"; lo que no entra se informa en `faltan`.
 */
export function generarRutina(r: Restricciones): Generada {
  const w = toMin(r.despertar);
  const fin = rel(r.dormir, w) || DIA;
  const manana = Math.min(r.manana ?? 30, fin);
  const errores: string[] = [];
  const ids = new Set<string>();
  const id = (base: string) => { let x = slug(base); let i = 2; while (ids.has(x)) x = `${slug(base)}-${i++}`; ids.add(x); return x; };
  const bloque = (b: Omit<RoutineBlock, 'start' | 'end' | 'short' | 'id'> & { id?: string; ini: number; fin: number; short?: string }): RoutineBlock => ({
    id: b.id && !ids.has(b.id) ? (ids.add(b.id), b.id) : id(b.label), label: b.label, short: b.short ?? b.label.toLowerCase(),
    start: toHHMM((w + b.ini) % DIA), end: toHHMM((w + b.fin) % DIA), area: b.area, kind: b.kind, focus: b.focus,
    ...(b.meta === false ? { meta: false } : {}), ...(b.rama ? { rama: b.rama } : {}), ...(b.tasks?.length ? { tasks: b.tasks } : {}),
  });

  // Los fijos, en minutos desde el despertar; los que se pisan o caen fuera del día se informan y no entran.
  const fijos = r.fijos
    .map((f) => ({ f, ini: rel(f.start, w), fin: rel(f.start, w) + ((toMin(f.end) - toMin(f.start) + DIA) % DIA || DIA) }))
    .sort((a, b) => a.ini - b.ini)
    .filter((x, i, xs) => {
      if (x.ini < manana || x.fin > fin) { errores.push(`${x.f.label} cae fuera del día (de ${r.despertar} a ${r.dormir}, después del despertar)`); return false; }
      const prev = xs.slice(0, i).find((y) => y.fin > x.ini && !errores.some((e) => e.startsWith(`${y.f.label} `)));
      if (prev) { errores.push(`${x.f.label} se pisa con ${prev.f.label}`); return false; }
      return true;
    });

  // Los huecos libres entre el despertar, los fijos y la hora de dormir.
  const huecos: { ini: number; fin: number }[] = [];
  let c = manana;
  for (const x of fijos) { if (x.ini > c) huecos.push({ ini: c, fin: x.ini }); c = Math.max(c, x.fin); }
  if (fin > c) huecos.push({ ini: c, fin });

  const puestos: { ini: number; b: RoutineBlock }[] = [];
  puestos.push({ ini: 0, b: bloque({ id: 'rutina', label: 'Despertar y arrancar', short: 'la rutina', ini: 0, fin: manana, area: 'rutina', kind: 'flex', focus: false, meta: false, rama: 'main' }) });
  for (const x of fijos) puestos.push({ ini: x.ini, b: bloque({ id: x.f.id, label: x.f.label, ini: x.ini, fin: x.fin, area: x.f.area ?? 'rutina', kind: 'fixed', focus: x.f.focus ?? false, rama: x.f.rama, tasks: x.f.tasks }) });

  const faltan: Generada['faltan'] = [];
  const libres = huecos.map((h) => ({ ...h }));
  for (const n of r.necesidades) {
    let resta = redondear(n.min);
    const tope = n.maxBloque ?? 240;
    let parte = 0;
    for (const h of libres) {
      while (resta > 0 && h.fin - h.ini >= 15) {
        const m = Math.min(resta, h.fin - h.ini, tope);
        if (m < 15) break;
        parte++;
        puestos.push({ ini: h.ini, b: bloque({ id: parte === 1 ? n.id : undefined, label: n.label, ini: h.ini, fin: h.ini + m, area: n.area ?? 'ing', kind: 'flex', focus: n.focus ?? true, rama: n.rama, tasks: n.tasks }) });
        h.ini += m;
        resta -= m;
      }
      if (resta <= 0) break;
    }
    if (resta > 0) faltan.push({ label: n.label, min: resta });
  }
  let libre = 0;
  for (const h of libres) {
    if (h.fin - h.ini >= 15) { puestos.push({ ini: h.ini, b: bloque({ label: 'Libre', short: 'el libre', ini: h.ini, fin: h.fin, area: 'rutina', kind: 'flex', focus: false, meta: false, rama: 'main' }) }); }
    libre += h.fin - h.ini;
  }
  const dormir = bloque({ id: 'sueno', label: `Dormir a las ${r.dormir}`, short: 'dormir', ini: fin, fin: DIA, area: 'rutina', kind: 'fixed', focus: false, rama: 'salud', tasks: [`En la cama a las ${r.dormir}`] });
  const bloques = [...puestos.sort((a, b) => a.ini - b.ini).map((p) => p.b), dormir];
  return { bloques, faltan, libre, errores };
}

/** Las restricciones de una rutina existente: los fijos quedan fijos y cada bloque flexible que es meta pasa a ser una necesidad. */
export function restriccionesDe(bloques: RoutineBlock[]): Restricciones {
  const sueno = bloques.find((b) => b.id === 'sueno') ?? bloques[bloques.length - 1];
  const primero = bloques[0];
  return {
    despertar: primero.start,
    dormir: sueno.start,
    manana: primero.meta === false || primero.id === 'rutina' ? blockMin(primero) : 0,
    fijos: bloques.filter((b) => b.kind === 'fixed' && b !== sueno).map((b) => ({ id: b.id, label: b.label, start: b.start, end: b.end, area: b.area, rama: b.rama, focus: b.focus, tasks: b.tasks })),
    necesidades: bloques
      .filter((b) => b.kind === 'flex' && b !== primero && b.meta !== false)
      .map((b) => ({ id: b.id, label: b.label, min: blockMin(b), area: b.area, rama: b.rama, focus: b.focus, tasks: b.tasks, maxBloque: Math.max(blockMin(b), 240) })),
  };
}

export interface Cambio {
  despertar?: string;
  dormir?: string;
  /** Compromisos nuevos (fijos) del día. */
  fijos?: Fijo[];
  /** Ids de bloques que se sacan (un fijo que ese día no va). */
  quitar?: string[];
}

/**
 * Adapta una rutina a otro horario: rehace el día con los fijos en su lugar y lo flexible alrededor. Un compromiso nuevo manda: el
 * fijo de antes que pisa (o que queda antes del nuevo despertar o después de la nueva hora de dormir) pasa a ser flexible y se
 * ubica donde entre.
 */
export function adaptarRutina(bloques: RoutineBlock[], c: Cambio): Generada {
  const r = restriccionesDe(bloques);
  const fuera = new Set(c.quitar ?? []);
  const nuevos = c.fijos ?? [];
  const despertar = c.despertar ?? r.despertar;
  const dormir = c.dormir ?? r.dormir;
  const w = toMin(despertar);
  const finDia = rel(dormir, w) || DIA;
  const tramo = (f: Fijo) => { const i = rel(f.start, w); return { i, f: i + ((toMin(f.end) - toMin(f.start) + DIA) % DIA || DIA) }; };
  const choca = (f: Fijo) => {
    const a = tramo(f);
    if (a.i < (r.manana ?? 30) || a.f > finDia) return true;
    return nuevos.some((n) => { const b = tramo(n); return a.i < b.f && b.i < a.f; });
  };
  const viejos = r.fijos.filter((f) => !fuera.has(f.id ?? ''));
  // Lo flexible conserva el orden que tenía en el día (por su hora de antes).
  const w0 = toMin(r.despertar);
  const horaDe = (id?: string) => { const b = bloques.find((x) => x.id === id); return b ? rel(b.start, w0) : DIA; };
  const pasanAFlex: Necesidad[] = viejos.filter(choca).map((f) => ({ id: f.id, label: f.label, min: (toMin(f.end) - toMin(f.start) + DIA) % DIA, area: f.area, rama: f.rama, focus: f.focus, tasks: f.tasks }));
  return generarRutina({
    ...r,
    despertar, dormir,
    fijos: [...viejos.filter((f) => !choca(f)), ...nuevos],
    necesidades: [...pasanAFlex, ...r.necesidades.filter((n) => !fuera.has(n.id ?? ''))].sort((a, b) => horaDe(a.id) - horaDe(b.id)),
  });
}

/** La rutina propia que rige una fecha: un día manda sobre un rango, y un rango sobre los días de la semana (la más nueva gana). */
export function rutinaParaFecha(fecha: string, asignaciones: AsignacionRutina[] | undefined, rutinas: RutinaPropia[] | undefined): RutinaPropia | null {
  if (!asignaciones?.length || !rutinas?.length) return null;
  const iso = ((new Date(`${fecha}T12:00:00`).getDay() + 6) % 7) + 1;
  const vale = (a: AsignacionRutina) =>
    a.tipo === 'dia' ? a.fecha === fecha
      : a.tipo === 'rango' ? !!a.desde && !!a.hasta && a.desde <= fecha && fecha <= a.hasta
        : !!a.dias?.includes(iso) && (!a.desde || a.desde <= fecha) && (!a.hasta || fecha <= a.hasta);
  const orden = { dia: 0, rango: 1, semana: 2 };
  const a = asignaciones
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => vale(x) && rutinas.some((r) => r.id === x.rutina))
    .sort((p, q) => orden[p.x.tipo] - orden[q.x.tipo] || q.i - p.i)[0];
  return a ? rutinas.find((r) => r.id === a.x.rutina)! : null;
}

export interface Plantilla { id: string; nombre: string; grupo: 'v12' | 'archivada'; bloques: RoutineBlock[] }

/** Las plantillas: las rutinas de v12.1 (el modo intensivo) y las archivadas (las de antes, con trabajo, día libre y la de las 08:00). */
export const PLANTILLAS: Plantilla[] = [
  ...Object.entries(ROUTINES_FILE.dayRoutines).map(([k, d]) => ({ id: `plantilla:${k}`, nombre: d.label, grupo: (k.startsWith('busqueda-intensiva') ? 'v12' : 'archivada') as Plantilla['grupo'], bloques: d.blocks })),
  { id: 'plantilla:tarde', nombre: ROUTINES_FILE.tarde.label, grupo: 'archivada' as const, bloques: ROUTINES_FILE.tarde.blocks },
].sort((a, b) => (a.grupo === b.grupo ? 0 : a.grupo === 'v12' ? -1 : 1));

/** Minutos por rama de una rutina (para las metas de horas). */
export function minutosPorRama(bloques: RoutineBlock[]): Partial<Record<RamaOMain, number>> {
  const out: Partial<Record<RamaOMain, number>> = {};
  for (const b of bloques) if (b.rama && b.id !== 'sueno') out[b.rama] = (out[b.rama] ?? 0) + blockMin(b);
  return out;
}
