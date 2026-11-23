/** Ola 23 · acciones de la planilla de clipping sobre el estado. */
import { migrarClipping, type Campana, type ClippingState, type Cuenta, type FilaClip, type Retainer } from '../data/clipping-state';
import { newId } from '../data/schedule';
import { lunesDe } from './plan';
import { getState, setState } from './store';

function update(fn: (c: ClippingState) => ClippingState) {
  setState((s) => ({ ...s, clipping: fn(s.clipping) }));
}

const limpio = <T extends object>(x: T): T => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v)))) as T;

/** Agrega una fila a la planilla (acepta fechas pasadas) y recuerda la cuenta y la campaña. Devuelve el id. */
export function registrarClips(f: Omit<FilaClip, 'id'>): string {
  const id = `r${newId()}`;
  update((c) => ({
    ...c,
    registro: [...c.registro, limpio({ ...f, id })].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    ultima: { cuenta: f.cuenta, campana: f.campana },
  }));
  return id;
}

export function editarFila(id: string, cambios: Partial<Omit<FilaClip, 'id'>>) {
  update((c) => ({ ...c, registro: c.registro.map((f) => (f.id === id ? limpio({ ...f, ...cambios }) : f)).sort((a, b) => a.fecha.localeCompare(b.fecha)) }));
}

export function borrarFila(id: string) {
  update((c) => ({ ...c, registro: c.registro.filter((f) => f.id !== id) }));
}

/** Vuelve a poner una fila borrada (el "Deshacer" del aviso). */
export function restaurarFila(f: FilaClip) {
  update((c) => ({ ...c, registro: [...c.registro.filter((x) => x.id !== f.id), f].sort((a, b) => a.fecha.localeCompare(b.fecha)) }));
}

/** Guarda (o crea). Con `exacto`, lo deja tal cual viene, sin mezclar con lo que había: es lo que usa Deshacer. */
export function guardarCuenta(x: Omit<Cuenta, 'id'> & { id?: string }, exacto = false): string {
  const id = x.id ?? `c${newId()}`;
  update((c) => ({ ...c, cuentas: c.cuentas.some((y) => y.id === id) ? c.cuentas.map((y) => (y.id === id ? limpio(exacto ? { ...x, id } : { ...y, ...x, id }) : y)) : [...c.cuentas, limpio({ ...x, id })] }));
  return id;
}

export function borrarCuenta(id: string) {
  update((c) => ({ ...c, cuentas: c.cuentas.filter((y) => y.id !== id) }));
}

/** Guarda (o crea). Con `exacto`, lo deja tal cual viene, sin mezclar con lo que había: es lo que usa Deshacer. */
export function guardarCampana(x: Omit<Campana, 'id'> & { id?: string }, exacto = false): string {
  const id = x.id ?? `k${newId()}`;
  update((c) => ({ ...c, campanas: c.campanas.some((y) => y.id === id) ? c.campanas.map((y) => (y.id === id ? limpio(exacto ? { ...x, id } : { ...y, ...x, id }) : y)) : [...c.campanas, limpio({ ...x, id })] }));
  return id;
}

export function borrarCampana(id: string) {
  update((c) => ({ ...c, campanas: c.campanas.filter((y) => y.id !== id) }));
}

/** Guarda (o crea). Con `exacto`, lo deja tal cual viene, sin mezclar con lo que había: es lo que usa Deshacer. */
export function guardarRetainer(x: Omit<Retainer, 'id'> & { id?: string }, exacto = false): string {
  const id = x.id ?? `t${newId()}`;
  update((c) => ({ ...c, retainers: c.retainers.some((y) => y.id === id) ? c.retainers.map((y) => (y.id === id ? limpio(exacto ? { ...x, id } : { ...y, ...x, id }) : y)) : [...c.retainers, limpio({ ...x, id })] }));
  return id;
}

export function borrarRetainer(id: string) {
  update((c) => ({ ...c, retainers: c.retainers.filter((y) => y.id !== id) }));
}

/** Suma mensajes o pruebas a la prospección de la semana de una fecha. */
export function sumarProspeccion(date: string, k: 'mensajes' | 'pruebas', n = 1) {
  const l = lunesDe(date);
  update((c) => {
    const cur = c.prospeccion[l] ?? { mensajes: 0, pruebas: 0 };
    return { ...c, prospeccion: { ...c.prospeccion, [l]: { ...cur, [k]: Math.max(0, cur[k] + n) } } };
  });
}

/** Tilda o destilda un paso de la rutina semanal. */
export function tildarRutina(date: string, id: string) {
  const l = lunesDe(date);
  update((c) => {
    const cur = new Set(c.rutina[l] ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    return { ...c, rutina: { ...c.rutina, [l]: [...cur] } };
  });
}

/** Mezcla una planilla importada: agrega lo nuevo por id y reemplaza lo que ya estaba. */
export function importarPlanilla(x: unknown) {
  const nueva = migrarClipping(x);
  const porId = <T extends { id: string }>(a: T[], b: T[]) => {
    const m = new Map(a.map((y) => [y.id, y]));
    for (const y of b) m.set(y.id || `i${newId()}`, { ...y, id: y.id || `i${newId()}` });
    return [...m.values()];
  };
  update((c) => ({
    ...c,
    cuentas: porId(c.cuentas, nueva.cuentas),
    campanas: porId(c.campanas, nueva.campanas),
    registro: porId(c.registro, nueva.registro).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    retainers: porId(c.retainers, nueva.retainers),
    prospeccion: { ...c.prospeccion, ...nueva.prospeccion },
  }));
}

export const planilla = () => getState().clipping;
