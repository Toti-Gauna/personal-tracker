/**
 * Trazo 2.0 · la línea de tiempo: qué va en cada carril, dónde cae cada barra y cómo se acerca y se aleja. Puro.
 * Los carriles van por tipo (proyectos, certificaciones, matemática…) y no por fase: las fases son seguidas en el tiempo, así
 * que una fila por fase dibuja una escalera y desperdicia la pantalla. Las etapas y las fases van arriba, como tramos.
 */
import { recorrer, type PeriodoMedido } from '../../data/periodos';
import { bloqueDe } from '../../data/periodos-plan';
import { PLAN_EXT, type TipoBloque } from '../../data/plan-extendido';
import { addDays, daysBetween } from '../../data/time';

export interface Carril { id: string; nombre: string; area: string; barras: PeriodoMedido[]; /** De fondo: lo cruzan sus propias pausas. */ fondo?: boolean }

const CARRILES: { id: string; nombre: string; area: string; tipos: TipoBloque[] }[] = [
  { id: 'proyectos', nombre: 'Proyectos', area: 'var(--a-ing)', tipos: ['proyecto', 'sumas'] },
  { id: 'certs', nombre: 'Certificaciones', area: 'var(--a-ing)', tipos: ['cert'] },
  { id: 'mate', nombre: 'Matemática', area: 'var(--a-economia)', tipos: ['ventana'] },
  { id: 'idioma', nombre: 'Inglés y búsqueda', area: 'var(--a-idi)', tipos: ['ingles', 'busqueda'] },
  { id: 'cierres', nombre: 'Cierres y descansos', area: 'var(--texto-2)', tipos: ['colchon', 'cierre', 'descanso'] },
];

export const tipoDe = (id: string) => PLAN_EXT.bloques.find((b) => b.id === bloqueDe(id))?.tipo;

/** Los carriles del plan principal (por tipo de bloque) y los dos de fondo. Un carril sin barras no se dibuja. */
export function carriles(arbol: PeriodoMedido[], fondo: { sec: PeriodoMedido[]; com: PeriodoMedido[] }): Carril[] {
  const bloques = [...recorrer(arbol)].filter((p) => p.nivel === 'bloque');
  const out: Carril[] = CARRILES.map((c) => ({ id: c.id, nombre: c.nombre, area: c.area, barras: bloques.filter((b) => { const t = tipoDe(b.id); return !!t && c.tipos.includes(t); }) }));
  out.push({ id: 'secundaria', nombre: 'Secundaria · de fondo', area: 'var(--a-handyx)', barras: fondo.sec, fondo: true });
  out.push({ id: 'comercial', nombre: 'Comercial · de fondo', area: 'var(--a-eclipse)', barras: fondo.com, fondo: true });
  return out.filter((c) => c.barras.length > 0);
}

// ——— La escala ———

export interface Escala { inicio: string; fin: string; dias: number; /** Píxeles por día. */ ppd: number }

export const escalaDe = (inicio: string, fin: string, ppd: number): Escala => ({ inicio, fin, dias: daysBetween(inicio, fin) + 1, ppd });
/** Dónde empieza un día (px desde el borde izquierdo). */
export const xDe = (e: Escala, d: string) => daysBetween(e.inicio, d) * e.ppd;
/** El ancho de un tramo de días, contando el primero y el último. */
export const anchoDe = (e: Escala, inicio: string, fin: string) => (daysBetween(inicio, fin) + 1) * e.ppd;
/** El día que cae en ese píxel. */
export const diaEn = (e: Escala, x: number) => addDays(e.inicio, Math.max(0, Math.min(e.dias - 1, Math.floor(x / e.ppd))));

export type Zoom = 'todo' | 'anio' | 'trimestre' | 'mes';
export const ZOOMS: [Zoom, string][] = [['todo', 'Todo'], ['anio', 'Año'], ['trimestre', 'Trimestre'], ['mes', 'Mes']];
const DIAS_ZOOM: Record<Exclude<Zoom, 'todo'>, number> = { anio: 365, trimestre: 91, mes: 30 };

/** Los píxeles por día para que en el ancho visible entre ese zoom (todo el plan, un año, un trimestre o un mes). */
export function ppdDe(zoom: Zoom, ancho: number, diasPlan: number) {
  return ancho / (zoom === 'todo' ? diasPlan : DIAS_ZOOM[zoom]);
}
/** Entre ver el plan entero y ver dos semanas. */
export const limitesPpd = (ancho: number, diasPlan: number) => ({ min: ancho / diasPlan, max: ancho / 14 });
export const acotar = (ppd: number, l: { min: number; max: number }) => Math.max(l.min, Math.min(l.max, ppd));
/** El zoom con nombre más cercano a una escala (para marcar el botón mientras pellizcás). */
export function zoomCercano(ppd: number, ancho: number, diasPlan: number): Zoom {
  return ZOOMS.map(([z]) => z).reduce((mejor, z) => (Math.abs(Math.log(ppdDe(z, ancho, diasPlan) / ppd)) < Math.abs(Math.log(ppdDe(mejor, ancho, diasPlan) / ppd)) ? z : mejor), 'todo' as Zoom);
}

/**
 * Al cambiar la escala, el día que estaba bajo el dedo (o en el centro) queda en el mismo lugar de la pantalla: devuelve el
 * scroll nuevo. `foco` es la distancia en px desde el borde izquierdo de lo visible.
 */
export function scrollAlEscalar(scroll: number, foco: number, ppdViejo: number, ppdNuevo: number) {
  const dia = (scroll + foco) / ppdViejo;
  return Math.max(0, dia * ppdNuevo - foco);
}

// ——— El eje ———

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export interface Marca { fecha: string; texto: string; fuerte: boolean }

/** Las marcas del eje: todos los meses si hay lugar; si no, cada tres (y enero siempre, con el año). */
export function marcasEje(e: Escala): Marca[] {
  const out: Marca[] = [];
  const cada = e.ppd * 30 >= 34 ? 1 : e.ppd * 30 >= 12 ? 3 : 6;
  for (let d = `${e.inicio.slice(0, 7)}-01`; d <= e.fin; d = `${addDays(`${d.slice(0, 7)}-28`, 4).slice(0, 7)}-01`) {
    if (d < e.inicio) continue;
    const m = Number(d.slice(5, 7));
    const enero = m === 1;
    if (!enero && (m - 1) % cada !== 0) continue;
    out.push({ fecha: d, texto: enero ? `${MES[0]} ${d.slice(2, 4)}` : MES[m - 1], fuerte: enero });
  }
  return out;
}

/** Los bloques que ya empezaron, del más nuevo al más viejo, con horas planificadas (para "Horas"). */
export function empezados(arbol: PeriodoMedido[], hoy: string, tope = 6): PeriodoMedido[] {
  return [...recorrer(arbol)].filter((p) => p.nivel === 'bloque' && p.inicio <= hoy && p.horasPlan != null).slice(-tope).reverse();
}
