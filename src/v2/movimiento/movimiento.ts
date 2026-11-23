/**
 * Trazo 2.0 · el sistema de movimiento (tanda 1.6). Una regla: el movimiento explica algo — de dónde vino una pantalla,
 * qué cambió, qué terminaste. Todo usa los tokens de tokens.css y la Web Animations API (sin dependencias); con movimiento
 * reducido, todo pasa a un fundido de 150 ms o a nada.
 */
import { vibrar } from '../../ui/sound';

/** Los mismos tokens que tokens.css, para el JS. */
export const DUR = { toque: 120, estado: 200, entrada: 320, pantalla: 520 } as const;
export const CURVA = {
  salida: 'cubic-bezier(0.22, 1, 0.36, 1)',
  idaVuelta: 'cubic-bezier(0.65, 0, 0.35, 1)',
  /** Un resorte de verdad (rigidez 170, amortiguación 18) muestreado como linear(): pasa un 4,7 % y vuelve. */
  resorte: 'linear(0, 0.038, 0.119, 0.226, 0.345, 0.465, 0.579, 0.683, 0.773, 0.848, 0.909, 0.957, 0.992, 1.017, 1.034, 1.043, 1.047, 1.047, 1.045, 1.04, 1.035, 1.029, 1.024, 1.018, 1.014, 1.009, 1.006, 1.003, 1.001, 1)',
} as const;

export const reducido = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Anima si el navegador puede (jsdom y navegadores viejos no): devuelve la animación o null. */
export function animar(el: Element | null | undefined, cuadros: Keyframe[], opciones: KeyframeAnimationOptions): Animation | null {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return null;
  return (el as HTMLElement).animate(cuadros, opciones);
}

// ——— Navegación entre pantallas ———

export type Transicion = 'adelante' | 'atras' | 'zoom-in' | 'zoom-out' | 'fundido';

const segmentos = (hash: string) => hash.replace(/^#\/?/, '').split('/').filter(Boolean);

/**
 * La dirección de un cambio de pantalla, por la forma de las rutas: más hondo es adelante, menos hondo es atrás,
 * y un hermano o otra sección es un fundido (las pestañas no "van" a ningún lado).
 */
export function inferirTransicion(desde: string, hacia: string): Transicion {
  const a = segmentos(desde);
  const b = segmentos(hacia);
  if (!a.length || !b.length || a[0] !== b[0]) return 'fundido';
  if (b.length > a.length && a.every((x, i) => b[i] === x)) return 'adelante';
  if (b.length < a.length && b.every((x, i) => a[i] === x)) return 'atras';
  return 'fundido';
}

/** Un nombre de view-transition válido a partir de cualquier id ("P1:v1.0" → "vt-P1-v1-0"). */
export const nombreTransicion = (id: string) => `vt-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

type DocConVT = Document & { startViewTransition?: (f: () => Promise<void> | void) => { finished: Promise<void>; ready: Promise<void> } };

/** Espera a que React pinte la pantalla nueva después de cambiar el hash. */
function trasPintar(): Promise<void> {
  return new Promise((r) => {
    let listo = false;
    const fin = () => { if (!listo) { listo = true; r(); } };
    const pintar = () => requestAnimationFrame(() => requestAnimationFrame(fin));
    window.addEventListener('hashchange', pintar, { once: true });
    setTimeout(fin, 300);
  });
}

let ultima: Transicion = 'fundido';
/** Mientras `navegar` cambia el hash, el hashchange es suyo y no hay que animar otra vez. */
let propia = false;
export const ultimaTransicion = () => ultima;

interface OpcionesNavegar { transicion?: Transicion; origen?: HTMLElement | null; nombre?: string }

/**
 * Va a `destino` (un hash, "#/metas/periodos/P1") con su transición. Con View Transitions, la pantalla vieja y la nueva se
 * cruzan; con `origen` + `nombre`, ese elemento crece hasta el héroe de la pantalla nueva (que lleva el mismo nombre).
 * Sin View Transitions, la pantalla nueva entra sola (ver `entrarPantalla`).
 */
export async function navegar(destino: string, o: OpcionesNavegar = {}): Promise<void> {
  const hash = destino.startsWith('#') ? destino : `#/${destino.replace(/^\//, '')}`;
  const t = reducido() ? 'fundido' : o.transicion ?? inferirTransicion(window.location.hash, hash);
  ultima = t;
  const doc = document as DocConVT;
  if (window.location.hash === hash) return;
  propia = true;
  if (!doc.startViewTransition || reducido()) {
    window.location.hash = hash;
    await trasPintar();
    propia = false;
    entrarPantalla(t);
    return;
  }
  const raiz = document.documentElement;
  raiz.dataset.transicion = t;
  if (o.origen && o.nombre) o.origen.style.viewTransitionName = o.nombre;
  const vt = doc.startViewTransition(async () => {
    if (o.origen) o.origen.style.viewTransitionName = '';
    window.location.hash = hash;
    await trasPintar();
  });
  try { await vt.finished; } catch { /* una transición cortada por otra no es un error */ } finally {
    propia = false;
    if (raiz.dataset.transicion === t) delete raiz.dataset.transicion;
  }
}

/** Sin View Transitions: la pantalla nueva entra con la dirección de la navegación. */
export function entrarPantalla(t: Transicion = ultima) {
  const el = document.querySelector('.envoltura');
  if (reducido()) { animar(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); return; }
  const desde: Record<Transicion, string> = {
    adelante: 'translateX(24px)', atras: 'translateX(-24px)', 'zoom-in': 'scale(1.03)', 'zoom-out': 'scale(0.97)', fundido: 'translateY(6px)',
  };
  animar(el, [{ opacity: 0, transform: desde[t] }, { opacity: 1, transform: 'none' }], { duration: DUR.entrada, easing: CURVA.salida });
}

/**
 * Los links internos dentro de la 2.0 navegan con transición sin que cada pantalla lo pida. Un link puede fijar la suya
 * con `data-transicion`, prestar su elemento para el zoom con `data-vt` (el nombre), o salirse con `data-sin-transicion`.
 */
export function instalarNavegacion(raiz: Document | HTMLElement = document): () => void {
  const clic = (e: Event) => {
    const ev = e as MouseEvent;
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = (ev.target as HTMLElement | null)?.closest?.('a[href^="#/"]') as HTMLAnchorElement | null;
    if (!a || a.target || a.hasAttribute('data-sin-transicion') || !a.closest('.v2, [data-v2-nav]')) return;
    ev.preventDefault();
    const nombre = a.dataset.vt;
    void navegar(a.getAttribute('href')!, { transicion: a.dataset.transicion as Transicion | undefined, origen: nombre ? a : null, nombre });
  };
  // Lo que cambia de pantalla sin pasar por `navegar` (el botón atrás, la barra de la 1.0) entra igual, con su dirección.
  const cambio = (e: HashChangeEvent) => {
    if (propia) return;
    const t = inferirTransicion(new URL(e.oldURL).hash, new URL(e.newURL).hash);
    ultima = t;
    requestAnimationFrame(() => requestAnimationFrame(() => entrarPantalla(t)));
  };
  raiz.addEventListener('click', clic);
  window.addEventListener('hashchange', cambio);
  return () => { raiz.removeEventListener('click', clic); window.removeEventListener('hashchange', cambio); };
}

// ——— Sensación ———

/** Una vibración corta en el teléfono, si se puede. `exito`: dos toques. */
export function haptico(tipo: 'leve' | 'exito' = 'leve') {
  vibrar(tipo === 'exito' ? [12, 40, 18] : 8);
}

/**
 * El festejo de terminar algo: astillas del trazo amarillo que salen del elemento y un pulso. Con movimiento reducido,
 * solo el pulso. Devuelve cuántas astillas lanzó.
 */
export function festejar(el: HTMLElement | null, { cantidad = 10, alcance = 34 } = {}): number {
  if (!el) return 0;
  haptico('exito');
  animar(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: DUR.entrada, easing: CURVA.resorte });
  if (reducido() || typeof el.animate !== 'function') return 0;
  const r = el.getBoundingClientRect();
  const capa = document.createElement('div');
  capa.className = 'mv-festejo';
  capa.setAttribute('aria-hidden', 'true');
  capa.style.left = `${r.left + r.width / 2}px`;
  capa.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(capa);
  const vivas: Promise<unknown>[] = [];
  for (let i = 0; i < cantidad; i++) {
    const a = (i / cantidad) * Math.PI * 2 + (i % 2 ? 0.25 : -0.1);
    const d = alcance * (0.75 + ((i * 7) % 5) / 10);
    const s = document.createElement('i');
    capa.appendChild(s);
    const giro = (a * 180) / Math.PI;
    const an = s.animate([
      { transform: `rotate(${giro}deg) translateX(4px) scale(0.6)`, opacity: 1 },
      { transform: `rotate(${giro}deg) translateX(${d}px) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `rotate(${giro}deg) translateX(${d + 8}px) scale(0.4)`, opacity: 0 },
    ], { duration: DUR.pantalla + 80, easing: CURVA.salida, delay: (i % 3) * 18 });
    vivas.push(an.finished.catch(() => {}));
  }
  void Promise.all(vivas).then(() => capa.remove());
  return cantidad;
}

/** Entrada escalonada: cada hijo entra 40 ms después del anterior (los primeros 8; el resto, junto con el octavo). */
export function escalonar(padre: HTMLElement | null, { paso = 40, maximo = 8, desplazamiento = 8 } = {}): number {
  if (!padre) return 0;
  const hijos = [...padre.children] as HTMLElement[];
  hijos.forEach((h, i) => {
    if (reducido()) { animar(h, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); return; }
    animar(h, [{ opacity: 0, transform: `translateY(${desplazamiento}px)` }, { opacity: 1, transform: 'none' }], { duration: DUR.entrada, easing: CURVA.salida, delay: Math.min(i, maximo) * paso, fill: 'backwards' });
  });
  return hijos.length;
}

/** La curva de los números que cuentan: arranca rápido y se asienta. */
export const salidaExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
