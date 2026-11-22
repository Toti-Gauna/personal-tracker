/**
 * v12.1 · las metas como períodos. Cada nodo del plan (etapa › fase › bloque › versión | lote | capítulo | paper | cert | hito) es un
 * período con inicio y fin: la barra de tiempo dice cuánto del período ya pasó y la de trabajo cuánto está hecho (ponderado por los
 * hijos). El estado sale de comparar las dos. Puro: las fechas son claves locales (America/Argentina/Buenos_Aires) 'YYYY-MM-DD'.
 *
 * Pesos (respuesta 5): versiones por días, certificaciones por horas de estudio, hitos de matemática por días, lotes por horas,
 * semanas de inglés y de búsqueda por días. Lo que no dice nada pesa por días.
 */
import { addDays, daysBetween } from './time';

export type NivelPeriodo = 'etapa' | 'fase' | 'bloque' | 'version' | 'lote' | 'capitulo' | 'paper' | 'cert' | 'hito';
export type EstadoPeriodo = 'proximo' | 'en-plan' | 'adelantado' | 'atrasado' | 'vencido' | 'hecho' | 'pausado';

export interface Periodo {
  id: string;
  nombre: string;
  nivel: NivelPeriodo;
  inicio: string;
  /** El fin planificado (en un proyecto, el estimado). El tiempo se mide contra este fin. */
  fin: string;
  /** Fecha límite, si es distinta del fin: recién después de ella el período está vencido. */
  deadline?: string;
  /** Peso entre sus hermanos; sin peso, los días del período. */
  peso?: number;
  /** Solo en las hojas: cuánto está hecho (0 a 1). */
  progreso?: number;
  horasPlan?: number;
  horasReal?: number;
  /** No se corre nunca (la pausa de diciembre, un examen reservado). */
  fija?: boolean;
  aConfirmar?: boolean;
  /** v12.2: la pista (principal, secundaria, comercial). Sin valor, principal. */
  track?: 'principal' | 'secundaria' | 'comercial';
  /** v12.2: pausas fijas de lo de fondo (PNPT y 20–26 dic 2027): en ellas se ve en pausa, no atrasado. */
  pausas?: { inicio: string; fin: string }[];
  /** v12.2: los entregables de una versión (la línea de la versión, partida), con la clave de `plan.hitos` que los tilda. */
  checklist?: { clave: string; texto: string; hecho: boolean }[];
  hijos?: Periodo[];
}

export interface PeriodoMedido extends Omit<Periodo, 'hijos'> {
  /** Parte del tiempo que ya pasó (0 a 1), al empezar el día de hoy. */
  tiempo: number;
  /** Parte del trabajo hecha (0 a 1). */
  trabajo: number;
  estado: EstadoPeriodo;
  /** Posiciones (0 a 1) sobre la barra, que va del inicio a max(fin, deadline). */
  marcas: { hoy: number; estimado?: number; deadline?: number };
  hijos?: PeriodoMedido[];
}

/** Diferencia (en puntos, 0 a 1) entre trabajo y tiempo que todavía cuenta como "en plan". */
export const TOLERANCIA = 0.1;

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** Días del período, contando el primero y el último. */
export const diasDe = (p: { inicio: string; fin: string }) => daysBetween(p.inicio, p.fin) + 1;

/** Cuánto del período pasó al empezar `hoy`: 0 el primer día, 1 el día después del fin. */
export function tiempoTranscurrido(p: { inicio: string; fin: string }, hoy: string): number {
  if (hoy <= p.inicio) return 0;
  if (hoy > p.fin) return 1;
  return r3(daysBetween(p.inicio, hoy) / diasDe(p));
}

export function estadoDe(tiempo: number, trabajo: number, p: { inicio: string; fin: string; deadline?: string; pausas?: { inicio: string; fin: string }[] }, hoy: string): EstadoPeriodo {
  if (trabajo >= 1 - 1e-9) return 'hecho';
  if (hoy < p.inicio) return 'proximo';
  // v12.2: lo de fondo en una pausa fija se ve en pausa, no atrasado ni vencido.
  if (p.pausas?.some((x) => x.inicio <= hoy && hoy <= x.fin)) return 'pausado';
  if (hoy > (p.deadline && p.deadline > p.fin ? p.deadline : p.fin)) return 'vencido';
  if (hoy > p.fin) return 'atrasado'; // pasó el estimado y falta trabajo, aunque la fecha límite siga en pie
  if (trabajo > tiempo + TOLERANCIA) return 'adelantado';
  if (trabajo < tiempo - TOLERANCIA) return 'atrasado';
  return 'en-plan';
}

/**
 * v12.2 · el peso de cada hijo: el que trae (lotes y certs, por horas); si no, las horas planificadas cuando todos los hermanos
 * las tienen; si no, los días.
 */
const pesos = (hs: Periodo[]) => {
  const porHoras = hs.every((h) => h.peso != null || (h.horasPlan ?? 0) > 0);
  return hs.map((h) => h.peso ?? (porHoras ? h.horasPlan! : diasDe(h)));
};

/** Mide un período y todos sus hijos. El trabajo de un padre es el promedio de sus hijos ponderado por peso. */
export function medir(p: Periodo, hoy: string): PeriodoMedido {
  const hijos = p.hijos?.map((h) => medir(h, hoy));
  let trabajo: number;
  if (hijos?.length) {
    const ws = pesos(p.hijos!);
    const total = ws.reduce((s, w) => s + w, 0);
    trabajo = total > 0 ? hijos.reduce((s, h, i) => s + h.trabajo * ws[i], 0) / total : 0;
    // Una hoja marcada como hecha arriba (p. ej. la versión publicada) manda sobre sus lotes.
    if (p.progreso != null) trabajo = Math.max(trabajo, p.progreso);
  } else trabajo = p.progreso ?? 0;
  trabajo = r3(clamp(trabajo));
  const tiempo = tiempoTranscurrido(p, hoy);
  const fin = p.deadline && p.deadline > p.fin ? p.deadline : p.fin;
  const largo = daysBetween(p.inicio, fin) + 1;
  const pos = (d: string) => r3(clamp((daysBetween(p.inicio, d) + 1) / largo));
  const suma = (k: 'horasPlan' | 'horasReal') => (p[k] != null ? p[k] : hijos?.some((h) => h[k] != null) ? r3(hijos.reduce((s, h) => s + (h[k] ?? 0), 0)) : undefined);
  const horasPlan = suma('horasPlan');
  const horasReal = suma('horasReal');
  const { hijos: _h, ...resto } = p;
  void _h;
  return {
    ...resto,
    ...(horasPlan != null ? { horasPlan } : {}),
    ...(horasReal != null ? { horasReal } : {}),
    tiempo, trabajo,
    estado: estadoDe(tiempo, trabajo, p, hoy),
    marcas: {
      hoy: r3(clamp(daysBetween(p.inicio, hoy) / largo)),
      ...(p.deadline && p.deadline !== p.fin ? { estimado: pos(p.fin), deadline: pos(p.deadline) } : {}),
    },
    ...(hijos ? { hijos } : {}),
  };
}

/** Los períodos en curso hoy, del más grande al más chico, siguiendo el primer hijo activo ("Fase 1 › PetrIA › v1.0 › lote 1.3"). */
export function activoAhora(raices: PeriodoMedido[], hoy: string): PeriodoMedido[] {
  const enCurso = (p: PeriodoMedido) => p.inicio <= hoy && hoy <= (p.deadline && p.deadline > p.fin ? p.deadline : p.fin) && p.estado !== 'hecho';
  const out: PeriodoMedido[] = [];
  let nivel = raices;
  for (;;) {
    // Primero lo que está dentro de su fin estimado; si nada, lo que sigue abierto hasta su deadline.
    const x = nivel.find((p) => enCurso(p) && hoy <= p.fin) ?? nivel.find(enCurso);
    if (!x) break;
    out.push(x);
    if (!x.hijos?.length) break;
    nivel = x.hijos;
  }
  return out;
}

/** Recorre el árbol (pre-orden). */
export function* recorrer<T extends { hijos?: T[] }>(ps: T[]): Generator<T> {
  for (const p of ps) { yield p; if (p.hijos) yield* recorrer(p.hijos); }
}

/** Lo que vence hoy (fin o deadline) y no está hecho. */
export const vencenHoy = (raices: PeriodoMedido[], hoy: string) =>
  [...recorrer(raices)].filter((p) => p.estado !== 'hecho' && (p.fin === hoy || p.deadline === hoy) && p.inicio <= hoy);

/** La próxima fecha límite después de hoy (deadline o, si no hay, fin) de lo que no está hecho, en el nivel pedido o en todos. */
export function proximaFechaLimite(raices: PeriodoMedido[], hoy: string, niveles?: NivelPeriodo[]): { periodo: PeriodoMedido; fecha: string } | null {
  let mejor: { periodo: PeriodoMedido; fecha: string } | null = null;
  for (const p of recorrer(raices)) {
    if (p.estado === 'hecho' || (niveles && !niveles.includes(p.nivel))) continue;
    const f = p.deadline ?? p.fin;
    if (f > hoy && (!mejor || f < mejor.fecha)) mejor = { periodo: p, fecha: f };
  }
  return mejor;
}

/**
 * Cuándo terminaría un período que va atrasado si lo que falta sigue al ritmo planificado: lo que falta (1 − trabajo) por los días
 * del período, contado desde hoy. Nunca antes del fin planificado.
 */
export function finProyectado(p: Pick<PeriodoMedido, 'inicio' | 'fin' | 'trabajo'>, hoy: string): string {
  if (p.trabajo >= 1) return p.fin;
  const faltan = Math.max(1, Math.ceil((1 - p.trabajo) * diasDe(p) - 1e-9));
  const desde = hoy > p.inicio ? hoy : p.inicio;
  const fin = addDays(desde, faltan - 1);
  return fin > p.fin ? fin : p.fin;
}

export interface Tramo {
  id: string; nombre?: string; inicio: string; fin: string; fija?: boolean;
  /** v12.2: absorbe atrasos (consolidación, cierre de etapa, descanso, cierre final): se achica en vez de correr lo que sigue. */
  absorbe?: boolean;
}

/** v12.2 · un absorbedor no baja de 3 días hábiles. */
export const MIN_ABSORBEDOR = 3;
export interface Corrimiento { id: string; nombre?: string; inicio: string; fin: string; nuevoInicio: string; nuevoFin: string; dias: number; /** v12.2: se achicó para absorber el atraso. */ absorbe?: boolean }

/**
 * La sugerencia de correr lo que sigue cuando un bloque se atrasa: el atrasado termina en `nuevoFin` y los siguientes de la secuencia
 * se corren los mismos días, manteniendo sus días hábiles. Las fechas fijas (la pausa de diciembre, los exámenes reservados, los tramos
 * con `fija`) no se mueven y no son hábiles: un bloque corrido las saltea y termina más tarde, y eso se suma a los que vienen.
 * v12.2: el corrimiento se frena en el próximo absorbedor (consolidación, cierre de etapa, descanso, cierre final), que se achica y
 * conserva su fin; si quedaría con menos de 3 días, queda en 3 y el atraso sigue hasta el próximo absorbedor. Solo sugiere: no cambia
 * nada hasta que lo confirmes.
 */
export function sugerirCorrimiento(secuencia: Tramo[], atrasadoId: string, nuevoFin: string, fijas: { inicio: string; fin: string }[] = []): Corrimiento[] {
  const i = secuencia.findIndex((t) => t.id === atrasadoId);
  if (i < 0) return [];
  const a = secuencia[i];
  if (nuevoFin <= a.fin) return [];
  const bloqueos = [...fijas, ...secuencia.filter((t) => t.fija)].sort((x, y) => (x.inicio < y.inicio ? -1 : 1));
  const bloqueado = (d: string) => bloqueos.some((x) => d >= x.inicio && d <= x.fin);
  // Los días que le faltan al atrasado tampoco caen en fechas fijas.
  let finA = a.fin;
  for (let c = 0, n = daysBetween(a.fin, nuevoFin); c < n; ) { finA = addDays(finA, 1); if (!bloqueado(finA)) c++; }
  nuevoFin = finA;
  const out: Corrimiento[] = [{ id: a.id, nombre: a.nombre, inicio: a.inicio, fin: a.fin, nuevoInicio: a.inicio, nuevoFin, dias: daysBetween(a.fin, nuevoFin) }];
  let libre = addDays(nuevoFin, 1); // el primer día que puede usar el que sigue
  for (const t of secuencia.slice(i + 1)) {
    if (t.fija) continue;
    // El largo en días hábiles: los días fijos que ya tenía adentro no se cuentan dos veces.
    let n = 0;
    for (let d = t.inicio; d <= t.fin; d = addDays(d, 1)) if (!bloqueado(d)) n++;
    n = Math.max(1, n);
    let ini = t.inicio > libre ? t.inicio : libre;
    while (bloqueado(ini)) ini = addDays(ini, 1);
    if (ini === t.inicio) break; // ya no lo alcanza el corrimiento, ni a los que siguen
    if (t.absorbe) {
      // Se achica: empieza más tarde y conserva su fin, si le quedan al menos 3 días hábiles.
      let quedan = 0;
      for (let d = ini; d <= t.fin; d = addDays(d, 1)) if (!bloqueado(d)) quedan++;
      if (quedan >= MIN_ABSORBEDOR) {
        out.push({ id: t.id, nombre: t.nombre, inicio: t.inicio, fin: t.fin, nuevoInicio: ini, nuevoFin: t.fin, dias: daysBetween(t.inicio, ini), absorbe: true });
        return out;
      }
      n = MIN_ABSORBEDOR; // queda en 3 días y lo que sobra sigue hasta el próximo absorbedor
    }
    let fin = ini;
    for (let c = 1; c < n; ) { fin = addDays(fin, 1); if (!bloqueado(fin)) c++; }
    out.push({ id: t.id, nombre: t.nombre, inicio: t.inicio, fin: t.fin, nuevoInicio: ini, nuevoFin: fin, dias: daysBetween(t.inicio, ini), ...(t.absorbe ? { absorbe: true } : {}) });
    libre = addDays(fin, 1);
  }
  return out;
}

/** Aplica los corrimientos confirmados (id → fechas nuevas) a una secuencia; lo demás queda igual. */
export const aplicarCorrimientos = <T extends Tramo>(secuencia: T[], confirmados: Record<string, { inicio: string; fin: string }> | undefined): T[] =>
  confirmados ? secuencia.map((t) => (confirmados[t.id] && !t.fija ? { ...t, inicio: confirmados[t.id].inicio, fin: confirmados[t.id].fin } : t)) : secuencia;

/**
 * v12.2 · a dónde va una fecha si se confirman esos corrimientos: dentro de un bloque corrido, a la misma distancia de su nuevo
 * inicio (sin pasarse de su nuevo fin); fuera de ellos, queda igual. Sirve para correr lo de fondo con su ventana.
 */
export function moverFecha(d: string, secuencia: Tramo[], cs: Corrimiento[]): string {
  const t = secuencia.find((x) => x.inicio <= d && d <= x.fin);
  const c = t && cs.find((x) => x.id === t.id);
  if (!t || !c) return d;
  const nueva = addDays(c.nuevoInicio, daysBetween(t.inicio, d));
  return nueva > c.nuevoFin ? c.nuevoFin : nueva;
}

/** v12.2 · los períodos de fondo (secundarias y comerciales) que se corren con sus ventanas: sugerencia, como el resto. */
export function corrimientoDeFondo<T extends { id: string; nombre?: string; inicio: string; fin: string }>(fondo: T[], secuencia: Tramo[], cs: Corrimiento[]): Corrimiento[] {
  return fondo.flatMap((f) => {
    const ni = moverFecha(f.inicio, secuencia, cs);
    let nf = moverFecha(f.fin, secuencia, cs);
    if (nf < ni) nf = ni;
    return ni === f.inicio && nf === f.fin ? [] : [{ id: f.id, nombre: f.nombre, inicio: f.inicio, fin: f.fin, nuevoInicio: ni, nuevoFin: nf, dias: daysBetween(f.inicio, ni) }];
  });
}
