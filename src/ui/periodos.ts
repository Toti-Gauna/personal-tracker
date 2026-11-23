/** Cómo se nombran los períodos del plan: la fecha corta, el estado, el nivel y el enlace a su página. */
import type { EstadoPeriodo, NivelPeriodo } from '../data/periodos';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "21 nov", o "21 nov 2027" fuera de 2026. */
export const fp = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}${d.slice(0, 4) === '2026' ? '' : ` ${d.slice(0, 4)}`}`;

export const ESTADO: Record<EstadoPeriodo, string> = { proximo: 'próximo', 'en-plan': 'en plan', adelantado: 'adelantado', atrasado: 'atrasado', vencido: 'vencido', hecho: 'hecho', pausado: 'en pausa' };
export const NIVEL: Record<NivelPeriodo, string> = { etapa: 'Etapa', fase: 'Fase', bloque: 'Bloque', version: 'Versión', lote: 'Lote', capitulo: 'Capítulo', paper: 'Paper', cert: 'Certificación', hito: 'Hito' };
export const hrefPeriodo = (id: string) => `#/metas/periodos/${encodeURIComponent(id)}`;
