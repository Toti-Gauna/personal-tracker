/**
 * Ola 8b · Búsqueda intensiva. Activar el modo cambia las rutinas de toda la semana, deja el
 * día libre en "ninguno" y pone Handyx y ventas en pausa (stand-by). Desactivarlo vuelve
 * exactamente a lo de antes. Nada se borra: las pausas guardan una foto de lo que había.
 *
 * Son funciones puras (estado → estado) para usarlas igual desde la migración, desde el registro
 * y desde los botones de Ajustes, y para testearlas sin la app.
 */
import { DEFAULT_PLAN_SETTINGS, PAUSAS_INTENSIVA, pausaAbierta, type Pausa, type PlanSettings, type PlanState } from './plan-state';
import type { Settings } from './types';

export const MOTIVO_INTENSIVA = 'búsqueda intensiva';

const cfgDe = (s: Settings): PlanSettings => ({ ...DEFAULT_PLAN_SETTINGS, ...(s.plan ?? {}) });

/** Activa la búsqueda intensiva desde una fecha. Si ya estaba activa, no cambia nada. */
export function aplicarIntensiva(settings: Settings, plan: PlanState, desde: string): { settings: Settings; plan: PlanState } {
  const cfg = cfgDe(settings);
  if (cfg.modo === 'busqueda-intensiva') return { settings, plan };
  const previo = { rutina: cfg.rutina, diaLibre: cfg.diaLibre };
  const pausas: Pausa[] = [...(plan.pausas ?? [])];
  for (const o of PAUSAS_INTENSIVA) {
    if (pausaAbierta({ pausas }, o)) continue;
    pausas.push({ id: `pausa-${o}-${desde}`, objetivo: o, desde, motivo: MOTIVO_INTENSIVA, guardado: o === 'handyx' ? { handyx: structuredClone(plan.handyx ?? {}) } : {} });
  }
  return {
    settings: { ...settings, plan: { ...(settings.plan ?? {}), modo: 'busqueda-intensiva', diaLibre: null, previo } },
    plan: { ...plan, pausas },
  };
}

/** Vuelve a la rutina y al día libre de antes y cierra las pausas del modo (o solo la que se retoma). */
export function quitarIntensiva(settings: Settings, plan: PlanState, hoy: string, soloObjetivo?: string): { settings: Settings; plan: PlanState } {
  const cfg = cfgDe(settings);
  const previo = cfg.previo ?? { rutina: DEFAULT_PLAN_SETTINGS.rutina, diaLibre: DEFAULT_PLAN_SETTINGS.diaLibre };
  const pausas = (plan.pausas ?? []).map((p) => {
    const toca = soloObjetivo ? p.objetivo === soloObjetivo : p.motivo === MOTIVO_INTENSIVA;
    return toca && !p.hasta ? { ...p, hasta: hoy } : p;
  });
  const sinPrevio = { ...(settings.plan ?? {}) };
  delete sinPrevio.previo;
  const nuevoPlan = cfg.modo === 'busqueda-intensiva' ? { ...sinPrevio, modo: null, rutina: previo.rutina, diaLibre: previo.diaLibre } : sinPrevio;
  return { settings: { ...settings, plan: nuevoPlan }, plan: { ...plan, pausas } };
}

/** Días que lleva (o llevó) en pausa un objetivo, sumando todas sus pausas hasta una fecha. */
export function diasEnPausa(plan: Pick<PlanState, 'pausas'>, objetivo: string, hasta: string) {
  let d = 0;
  for (const p of plan.pausas ?? []) {
    if (p.objetivo !== objetivo || p.desde > hasta) continue;
    const fin = p.hasta && p.hasta < hasta ? p.hasta : hasta;
    d += Math.max(0, Math.round((new Date(fin + 'T12:00').getTime() - new Date(p.desde + 'T12:00').getTime()) / 864e5));
  }
  return d;
}

/**
 * Los cortes de Handyx corridos por la pausa: cada corte que cae después del inicio de la
 * pausa se corre lo que dure (si sigue abierta, lo que va hasta hoy). La fecha original queda
 * para mostrarla tachada.
 */
export function cortesCorridos(cortes: { id: string; fin: string }[], plan: Pick<PlanState, 'pausas'>, hoy: string) {
  const ps = (plan.pausas ?? []).filter((p) => p.objetivo === 'handyx');
  const desde = ps.length ? ps.map((p) => p.desde).sort()[0] : null;
  const n = diasEnPausa(plan, 'handyx', hoy);
  return cortes.map((c) => {
    const corre = desde != null && c.fin > desde && n > 0;
    const fecha = corre ? new Date(new Date(c.fin + 'T12:00').getTime() + n * 864e5).toISOString().slice(0, 10) : c.fin;
    return { ...c, fecha, original: c.fin, corrido: corre ? n : 0 };
  });
}
