/**
 * v12.4 · qué corre de fondo cada día y cuántas horas le saca al foco. Las dos pistas de fondo (apps secundarias y slots comerciales)
 * dan 1 h por día cada una, y esa hora sale de las 10 h de lunes a viernes y las 11 del fin de semana, nunca de después. Cuando una
 * pista no tiene nada activo, su hora vuelve a la principal. En la ventana del PNPT y en cada día libre fijo no corre ninguna.
 * Hoja de módulos: la usan la capacidad (`capacidad.ts`) y lo de fondo (`fondo.ts`). Puro.
 */
import { DIAS_LIBRES, EXTRAS_FOCO, PAUSAS_FONDO, V122, type Comercial, type Secundaria } from './v12-2';

export type PistaFondo = 'secundaria' | 'comercial';

export interface FondoActivo {
  secundaria: { app: Secundaria; version: string }[];
  comercial: Comercial | null;
  pausa: (typeof PAUSAS_FONDO)[number] | null;
}

/** Qué corre de fondo una fecha (en una pausa fija, nada: se ve la pausa). */
export function fondoEn(fecha: string): FondoActivo {
  const pausa = PAUSAS_FONDO.find((p) => p.inicio <= fecha && fecha <= p.fin) ?? null;
  if (pausa) return { secundaria: [], comercial: null, pausa };
  return {
    secundaria: V122.secundarias.flatMap((app) => app.versiones.filter((v) => v.inicio <= fecha && fecha <= v.fin).map((v) => ({ app, version: v.id }))),
    comercial: V122.comerciales.find((c) => c.inicio <= fecha && fecha <= c.fin) ?? null,
    pausa: null,
  };
}

/** ¿Ese día es un día libre fijo? (la pausa del 20–26 dic 2027 y los dos descansos: no se trabaja, ni de fondo). */
export const esDiaLibre = (fecha: string) => DIAS_LIBRES.some((d) => d.inicio <= fecha && fecha <= d.fin);

/** Las pistas de fondo con algo activo ese día, sin las que pausaste a mano. */
export function pistasActivas(fecha: string, pausadas: readonly PistaFondo[] = []): PistaFondo[] {
  const f = fondoEn(fecha);
  const out: PistaFondo[] = [];
  if (f.secundaria.length && !pausadas.includes('secundaria')) out.push('secundaria');
  if (f.comercial && !pausadas.includes('comercial')) out.push('comercial');
  return out;
}

/** Las horas de foco que un día se llevan lo de fondo: 1 por pista activa y las extras del plan (Alawys v0.1: 1 h de PetrIA). */
export function horasDeFondo(fecha: string, pausadas: readonly PistaFondo[] = []): number {
  const extras = esDiaLibre(fecha) ? 0 : EXTRAS_FOCO.filter((x) => x.inicio <= fecha && fecha <= x.fin).reduce((s, x) => s + x.horas, 0);
  return pistasActivas(fecha, pausadas).length + extras;
}
