/**
 * Trazo 2.0 · lo que flota sobre cualquier pantalla (tanda 1.5): los avisos (toasts) y la confirmación. Se piden desde
 * cualquier lado con `aviso()` y `confirmar()`; `CapasV2` los muestra (App la monta solo en la 2.0).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icono, type NombreIcono } from '../iconos';
import './superficies.css';
import './kit.css';

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

interface PedidoConfirmar { titulo: string; texto?: string; accion: string; cancelar?: string; peligro?: boolean; responder: (si: boolean) => void }

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

/** Pregunta antes de algo que no se deshace. Resuelve `true` si confirma. */
export function confirmar(o: Omit<PedidoConfirmar, 'responder'>): Promise<boolean> {
  return new Promise((r) => { pedido?.responder(false); pedido = { ...o, responder: (si) => { pedido = null; emitir(); r(si); } }; emitir(); });
}

/** Para los tests: vacía todo. */
export function limpiarCapas() { avisos = []; pedido?.responder(false); pedido = null; emitir(); }

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
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    (p.peligro ? no : si).current?.focus();
    return () => previo?.focus?.();
  }, [p]);
  return (
    <div className="h-velo centro" onClick={() => p.responder(false)}>
      <div className="c-dialogo capa-3" role="alertdialog" aria-modal="true" aria-labelledby="c-dialogo-t" aria-describedby={p.texto ? 'c-dialogo-d' : undefined}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') p.responder(false);
          if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === no.current ? si : no).current?.focus(); }
        }}>
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

export default function CapasV2() {
  const xs = useSyncExternalStore(suscribir, () => avisos);
  const p = useSyncExternalStore(suscribir, () => pedido);
  return (
    <>
      <div className="c-avisos" aria-live="polite">{xs.map((a) => <Aviso key={a.id} a={a} />)}</div>
      {p && <Confirmar p={p} />}
    </>
  );
}
