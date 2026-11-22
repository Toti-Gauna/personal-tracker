/**
 * Trazo 2.0 · Plan: lo que decide la pantalla, sin dibujar nada. La frase de cada período (cómo va, en palabras), el zoom por
 * horizonte (semana, mes, bimestre, año), el camino hasta un período y la semana día por día. Puro.
 */
import { finProyectado, recorrer, type NivelPeriodo, type PeriodoMedido } from '../../data/periodos';
import { addDays, daysBetween } from '../../data/time';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "9 dic", y el año solo si no es el de hoy: "5 ene 2027". */
export const fecha = (d: string, hoy?: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}${hoy && d.slice(0, 4) === hoy.slice(0, 4) ? '' : hoy ? ` ${d.slice(0, 4)}` : ''}`;
/** "21 – 25 nov" en el mismo mes; "21 nov – 9 dic" si cambia; el año solo si no es el de hoy. */
export function rango(a: string, b: string, hoy: string) {
  if (a === b) return fecha(a, hoy);
  if (a.slice(0, 7) === b.slice(0, 7)) return `${Number(a.slice(8))} – ${fecha(b, hoy)}`;
  return `${fecha(a, hoy)} – ${fecha(b, hoy)}`;
}
const enDias = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);
const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`);

export const NIVEL: Record<NivelPeriodo, string> = { etapa: 'Etapa', fase: 'Fase', bloque: 'Bloque', version: 'Versión', lote: 'Lote', capitulo: 'Capítulo', paper: 'Paper', cert: 'Certificación', hito: 'Hito' };
const PLURAL: Record<NivelPeriodo, string> = { etapa: 'etapas', fase: 'fases', bloque: 'bloques', version: 'versiones', lote: 'lotes', capitulo: 'capítulos', paper: 'papers', cert: 'certificaciones', hito: 'hitos' };
export const plural = (nivel: NivelPeriodo, n: number) => `${n} ${n === 1 ? NIVEL[nivel].toLowerCase() : PLURAL[nivel]}`;

/** El fin que cuenta para vencer: la fecha límite si la hay y es posterior al estimado. */
export const limite = (p: Pick<PeriodoMedido, 'fin' | 'deadline'>) => (p.deadline && p.deadline > p.fin ? p.deadline : p.fin);

/**
 * Cómo va un período, en una frase. Calma: dice qué pasa y qué viene, sin alarma; el rojo queda para la píldora de "vencido".
 */
export function frase(p: PeriodoMedido, hoy: string): string {
  switch (p.estado) {
    case 'hecho': return 'Hecho.';
    case 'proximo': { const n = daysBetween(hoy, p.inicio); return `Empieza el ${fecha(p.inicio, hoy)} (${enDias(n)}).`; }
    case 'pausado': { const x = p.pausas?.find((z) => z.inicio <= hoy && hoy <= z.fin); return x ? `En pausa hasta el ${fecha(x.fin, hoy)}.` : 'En pausa.'; }
    case 'vencido': return `Venció el ${fecha(limite(p), hoy)}.`;
    case 'adelantado': return `Vas adelantado: termina el ${fecha(p.fin, hoy)} o antes.`;
    case 'en-plan': return `Vas en plan: termina el ${fecha(p.fin, hoy)}.`;
    case 'atrasado': {
      if (hoy > p.fin) return `Pasó el estimado (${fecha(p.fin, hoy)}). El límite es el ${fecha(limite(p), hoy)}.`;
      const f = finProyectado(p, hoy);
      const mas = daysBetween(p.fin, f);
      return mas > 0 ? `Vas ${dias(mas)} atrás: termina el ${fecha(f, hoy)}.` : 'Vas un poco atrás del tiempo.';
    }
  }
}

/** Los datos de la tarjeta grande: fechas, límite, horas y cuánto falta. Cada uno con su rótulo. */
export function datosDe(p: PeriodoMedido, hoy: string): { etiqueta: string; valor: string }[] {
  // El fin ya está en el rótulo de arriba ("21 nov – 9 dic"): acá va lo que no se ve ahí.
  const out: { etiqueta: string; valor: string }[] = [];
  if (p.deadline && p.deadline !== p.fin) out.push({ etiqueta: 'Límite', valor: fecha(p.deadline, hoy) });
  if (p.horasPlan != null) out.push({ etiqueta: 'Horas', valor: `${n1(p.horasReal ?? 0)} de ${n1(p.horasPlan)} h` });
  else if (p.estado !== 'hecho' && hoy <= limite(p) && p.inicio <= hoy) out.push({ etiqueta: 'Quedan', valor: dias(daysBetween(hoy, limite(p)) + 1) });
  return out;
}
const n1 = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');

/**
 * El nombre como título y lo que lo ubica como rótulo: "Fase 1 · AI Full-stack Engineer" → "AI Full-stack Engineer" con
 * "Fase 1" arriba. Solo cuando el nombre empieza con su nivel (etapas, fases y lotes); lo demás queda igual.
 */
export function partesNombre(p: Pick<PeriodoMedido, 'nombre' | 'nivel'>): { titulo: string; prefijo: string } {
  const i = p.nombre.indexOf(' · ');
  const pre = i > 0 ? p.nombre.slice(0, i) : '';
  if (pre && pre.startsWith(NIVEL[p.nivel])) return { titulo: p.nombre.slice(i + 3), prefijo: pre };
  return { titulo: p.nombre, prefijo: NIVEL[p.nivel] };
}

/** Cómo se nombra un período en "volver" y en el camino: "Fase 1" en vez de "Fase 1 · AI Full-stack Engineer". */
export const nombreCorto = (p: Pick<PeriodoMedido, 'nombre' | 'nivel'>) => { const x = partesNombre(p); return x.titulo === p.nombre ? p.nombre : x.prefijo; };

/** Los estados que son noticia en una lista. "Próximo" y "en plan" son lo esperado: no se dicen. */
export const esNoticia = (e: PeriodoMedido['estado']) => e !== 'proximo' && e !== 'en-plan';

/** El camino desde la etapa hasta el período (o vacío si no existe). */
export function camino(raices: PeriodoMedido[], id: string): PeriodoMedido[] {
  for (const r of raices) {
    if (r.id === id) return [r];
    const sub = r.hijos ? camino(r.hijos, id) : [];
    if (sub.length) return [r, ...sub];
  }
  return [];
}

// ——— El zoom por horizonte ———

export type Horizonte = 'semana' | 'mes' | 'bimestre' | 'anio';
export const HORIZONTES: [Horizonte, string][] = [['semana', 'Semana'], ['mes', 'Mes'], ['bimestre', 'Bimestre'], ['anio', 'Año']];

/** Cada horizonte mira un largo y un nivel: la semana, día por día; el mes, versiones y exámenes; el bimestre, bloques; el año, fases. */
export const ZOOM: Record<Exclude<Horizonte, 'semana'>, { dias: number; niveles: NivelPeriodo[] }> = {
  mes: { dias: 30, niveles: ['version', 'cert', 'hito'] },
  bimestre: { dias: 61, niveles: ['bloque'] },
  anio: { dias: 365, niveles: ['fase'] },
};

/** Lo que toca en ese horizonte: los períodos de esos niveles que se cruzan con [hoy, hoy + días), en orden de fin. */
export function enHorizonte(raices: PeriodoMedido[], hoy: string, h: Exclude<Horizonte, 'semana'>): PeriodoMedido[] {
  const { dias: n, niveles } = ZOOM[h];
  const hasta = addDays(hoy, n - 1);
  return [...recorrer(raices)]
    .filter((p) => niveles.includes(p.nivel) && p.inicio <= hasta && limite(p) >= hoy && (p.estado !== 'hecho' || p.fin >= hoy))
    .sort((a, b) => (a.fin < b.fin ? -1 : a.fin > b.fin ? 1 : a.inicio < b.inicio ? -1 : 1));
}

/** El bloque principal que corre ese día (el más chico de nivel bloque que lo contiene). */
export function bloqueDelDia(raices: PeriodoMedido[], d: string): PeriodoMedido | undefined {
  return [...recorrer(raices)].find((p) => p.nivel === 'bloque' && p.inicio <= d && d <= p.fin);
}

/** La semana de lunes a domingo: el bloque de cada día y lo que vence ese día (sin etapas ni fases). */
export function semana(raices: PeriodoMedido[], hoy: string) {
  const lunes = addDays(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7));
  const todos = [...recorrer(raices)].filter((p) => p.nivel !== 'etapa' && p.nivel !== 'fase' && p.estado !== 'hecho');
  return Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).map((d) => ({
    fecha: d,
    bloque: bloqueDelDia(raices, d),
    vence: todos.filter((p) => p.fin === d || p.deadline === d),
  }));
}

/** Lo que va a la vista en el héroe del Plan: el bloque activo (o lo más chico activo que no sea etapa ni fase). */
export function heroeDe(cadena: PeriodoMedido[]): PeriodoMedido | undefined {
  return cadena.find((p) => p.nivel === 'bloque') ?? cadena[cadena.length - 1];
}
