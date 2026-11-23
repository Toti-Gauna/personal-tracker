/**
 * Trazo 2.0 · lo que flota sobre cualquier pantalla (tanda 1.5): los avisos (toasts) y la confirmación. Se piden desde
 * cualquier lado con `aviso()`, `confirmar()` y `elegir()`; `CapasV2` los muestra e instala las transiciones.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icono, type NombreIcono } from '../iconos';
import { instalarNavegacion } from '../movimiento/movimiento';
import './superficies.css';
import './kit.css';
import '../movimiento/movimiento.css';

export type TonoAviso = 'info' | 'hecho' | 'atencion' | 'error';

export interface AvisoV2 {
  id: number;
  titulo: string;
  sub?: string;
  tono: TonoAviso;
  /** Una acción ("Ver"), o deshacer: los avisos de algo que se puede volver atrás duran más. */
  accion?: { etiqueta: string; run: () => void };
  duracion: number;
}

interface PedidoConfirmar {
  titulo: string; texto?: string; accion: string; cancelar?: string; peligro?: boolean;
  /** Una línea chica arriba del título ("Fin del bloque"). */
  rotulo?: string;
  /** Hay que elegir: tocar afuera o Escape no cierra (cerrar sin elegir correría una de las dos sin querer). */
  obligatorio?: boolean;
  /** `null`: otro pedido lo reemplazó o se limpiaron las capas, sin que nadie eligiera. */
  responder: (si: boolean | null) => void;
}

let avisos: AvisoV2[] = [];
let pedido: PedidoConfirmar | null = null;
let seq = 0;
const subs = new Set<() => void>();
const emitir = () => subs.forEach((f) => f());
const suscribir = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Muestra un aviso. Con `deshacer`, agrega el botón y dura 6 s en vez de 4. Devuelve su id. */
export function aviso(a: { titulo: string; sub?: string; tono?: TonoAviso; accion?: { etiqueta: string; run: () => void }; deshacer?: () => void; duracion?: number }): number {
  const id = ++seq;
  const accion = a.deshacer ? { etiqueta: 'Deshacer', run: a.deshacer } : a.accion;
  avisos = [...avisos, { id, titulo: a.titulo, sub: a.sub, tono: a.tono ?? 'info', accion, duracion: a.duracion ?? (a.deshacer ? 6000 : 4000) }].slice(-3);
  emitir();
  return id;
}

export function quitarAviso(id: number) { avisos = avisos.filter((x) => x.id !== id); emitir(); }

function pedir(o: Omit<PedidoConfirmar, 'responder'>): Promise<boolean | null> {
  return new Promise((r) => { pedido?.responder(null); pedido = { ...o, responder: (si) => { pedido = null; emitir(); r(si); } }; emitir(); });
}

/** Pregunta antes de algo que no se deshace. Resuelve `true` si confirma. */
export function confirmar(o: Omit<PedidoConfirmar, 'responder' | 'obligatorio'>): Promise<boolean> {
  return pedir(o).then((si) => si === true);
}

/**
 * Un freno con dos caminos (el fin de un bloque: "Volver a Hoy" o "Seguir 10 min más"). No se cierra tocando afuera: hay que
 * elegir. Resuelve `null` si otro pedido lo reemplaza antes.
 */
export function elegir(o: { rotulo?: string; titulo: string; texto?: string; primaria: string; secundaria: string }): Promise<'primaria' | 'secundaria' | null> {
  return pedir({ rotulo: o.rotulo, titulo: o.titulo, texto: o.texto, accion: o.primaria, cancelar: o.secundaria, obligatorio: true })
    .then((si) => (si == null ? null : si ? 'primaria' : 'secundaria'));
}

/** Para los tests: vacía todo. */
export function limpiarCapas() { avisos = []; pedido?.responder(null); pedido = null; emitir(); }

const ICONO: Record<TonoAviso, NombreIcono> = { info: 'info', hecho: 'tilde', atencion: 'atencion', error: 'alerta' };

function Aviso({ a }: { a: AvisoV2 }) {
  const [dx, setDx] = useState(0);
  const [pausa, setPausa] = useState(false);
  const resto = useRef(a.duracion);
  const desde = useRef(0);
  const toque = useRef<number | null>(null);
  useEffect(() => {
    if (pausa) return;
    desde.current = performance.now();
    const t = window.setTimeout(() => quitarAviso(a.id), resto.current);
    return () => { window.clearTimeout(t); resto.current -= performance.now() - desde.current; };
  }, [pausa, a.id]);
  return (
    <div className={`c-aviso capa-3 ${a.tono}`} role={a.tono === 'error' ? 'alert' : 'status'} style={dx ? { transform: `translateX(${dx}px)`, opacity: 1 - Math.min(0.8, Math.abs(dx) / 200) } : undefined}
      onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausa(false); }}
      onPointerDown={(e) => { if ((e.target as HTMLElement).closest('button')) return; toque.current = e.clientX; setPausa(true); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
      onPointerMove={(e) => { if (toque.current != null) setDx(e.clientX - toque.current); }}
      onPointerUp={(e) => { if (toque.current == null) return; const d = e.clientX - toque.current; toque.current = null; setPausa(false); if (Math.abs(d) > 80) quitarAviso(a.id); else setDx(0); }}>
      <span className="c-aviso-icono"><Icono nombre={ICONO[a.tono]} lado={20} /></span>
      <span className="c-aviso-texto"><b>{a.titulo}</b>{a.sub && <small>{a.sub}</small>}</span>
      {a.accion && <button type="button" className="k-boton fantasma chico" onClick={() => { a.accion!.run(); quitarAviso(a.id); }}>{a.accion.etiqueta}</button>}
      <button type="button" className="k-boton fantasma solo-icono chico" aria-label="Cerrar aviso" onClick={() => quitarAviso(a.id)}><Icono nombre="cerrar" lado={18} /></button>
    </div>
  );
}

function Confirmar({ p }: { p: PedidoConfirmar }) {
  const no = useRef<HTMLButtonElement>(null);
  const si = useRef<HTMLButtonElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    // El freno de fin de bloque llega solo (por tiempo), no por un toque: el foco va al diálogo y no a un botón, para que un
    // Enter que ibas a dar en otro lado no elija por vos.
    (p.obligatorio ? caja : p.peligro ? no : si).current?.focus();
    return () => { if (previo?.isConnected) previo.focus(); };
  }, [p]);
  return (
    <div className="h-velo centro" onClick={() => { if (!p.obligatorio) p.responder(false); }}>
      <div ref={caja} tabIndex={-1} className="c-dialogo capa-3" role="alertdialog" aria-modal="true" aria-labelledby="c-dialogo-t" aria-describedby={p.texto ? 'c-dialogo-d' : undefined}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !p.obligatorio) p.responder(false);
          if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === no.current ? si : no).current?.focus(); }
        }}>
        {p.rotulo && <p className="t-rotulo">{p.rotulo}</p>}
        <h2 id="c-dialogo-t" className="t-encabezado">{p.titulo}</h2>
        {p.texto && <p id="c-dialogo-d" className="t-cuerpo">{p.texto}</p>}
        <div className="c-dialogo-botones">
          <button ref={no} type="button" className="k-boton secundario" onClick={() => p.responder(false)}>{p.cancelar ?? 'Cancelar'}</button>
          <button ref={si} type="button" className={`k-boton ${p.peligro ? 'peligro lleno' : 'primario'}`} onClick={() => p.responder(true)}>{p.accion}</button>
        </div>
      </div>
    </div>
  );
}

/** Lo global: avisos, confirmación y la navegación con transiciones. */
export default function CapasV2() {
  useEffect(() => instalarNavegacion(), []);
  const xs = useSyncExternalStore(suscribir, () => avisos);
  const p = useSyncExternalStore(suscribir, () => pedido);
  return (
    <>
      <div className="c-avisos" aria-live="polite">{xs.map((a) => <Aviso key={a.id} a={a} />)}</div>
      {p && <Confirmar p={p} />}
    </>
  );
}
