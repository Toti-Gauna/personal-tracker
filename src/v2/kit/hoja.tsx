/**
 * Trazo 2.0 · la hoja de abajo (tanda 1.5): se arrastra para cerrar o agrandar, Escape la cierra, el foco queda adentro y
 * vuelve a donde estaba. La ⓘ es una hoja con la explicación que antes vivía bajo el título.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from '../iconos';
import { GLOSARIO } from '../reglas';
import './superficies.css';

/**
 * Varias hojas pueden convivir un instante (una se cierra mientras otra se abre): el bloqueo del scroll se cuenta, para que
 * la que se va no destrabe la página de la que llega, ni la deje trabada al revés.
 */
let abiertas = 0;
/** Las hojas abiertas, de abajo hacia arriba: la de arriba es la que tiene el foco. */
const pila: HTMLElement[] = [];
let desbordePrevio = '';
function bloquear() {
  if (abiertas++ > 0) return;
  desbordePrevio = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  // Con una hoja abierta, los avisos suben arriba de todo para no tapar sus botones.
  document.documentElement.dataset.hoja = '1';
}
/** Devuelve `true` si era la última hoja abierta. */
function liberar() {
  abiertas = Math.max(0, abiertas - 1);
  if (abiertas > 0) return false;
  document.body.style.overflow = desbordePrevio;
  delete document.documentElement.dataset.hoja;
  return true;
}

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
const SALIDA_MS = 260;

interface HojaProps {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** `auto`: tan alta como su contenido (y se agranda arrastrando hacia arriba). `completa`: casi toda la pantalla. */
  alto?: 'auto' | 'completa';
  pie?: ReactNode;
}

export function Hoja({ abierta, onCerrar, titulo, children, alto = 'auto', pie }: HojaProps) {
  const [montada, setMontada] = useState(abierta);
  const [saliendo, setSaliendo] = useState(false);
  const [completa, setCompleta] = useState(alto === 'completa');
  const [arrastre, setArrastre] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const previo = useRef<HTMLElement | null>(null);
  const toque = useRef<{ y: number; t: number } | null>(null);
  const id = useId();

  useEffect(() => {
    if (abierta) { setMontada(true); setSaliendo(false); setCompleta(alto === 'completa'); return; }
    if (!montada) return;
    setSaliendo(true);
    const t = window.setTimeout(() => { setMontada(false); setSaliendo(false); setArrastre(0); }, SALIDA_MS);
    return () => window.clearTimeout(t);
  }, [abierta]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!montada || saliendo || !caja.current) return;
    const yo = caja.current;
    previo.current = document.activeElement as HTMLElement | null;
    bloquear();
    pila.push(yo);
    yo.focus();
    // Si lo que tenía el foco desaparece adentro de la hoja (cambiar de vista, guardar, borrar un paso), el foco vuelve a la hoja:
    // si no, cae en la página de atrás, y Escape y Tab dejan de funcionar.
    const vigia = new MutationObserver(() => {
      if (pila[pila.length - 1] !== yo) return;
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body || (!yo.contains(a) && !a.closest('.h-velo, .c-avisos'))) yo.focus();
    });
    vigia.observe(yo, { childList: true, subtree: true });
    return () => {
      vigia.disconnect();
      const i = pila.lastIndexOf(yo);
      const arriba = i === pila.length - 1;
      if (i >= 0) pila.splice(i, 1);
      liberar();
      // Si después se abrió otra hoja que sigue abierta, el foco es de ella.
      if (!arriba) return;
      // El foco vuelve a quien abrió la hoja; si ya no está (se borró lo que la abrió), a la hoja de abajo o al título de la pantalla.
      const p = previo.current;
      if (p?.isConnected && p !== document.body) { p.focus(); return; }
      const abajo = pila[pila.length - 1];
      if (abajo) { abajo.focus(); return; }
      const titulo = document.querySelector<HTMLElement>('main h1');
      if (titulo) { titulo.tabIndex = -1; titulo.focus({ preventScroll: true }); }
    };
  }, [montada, saliendo]);

  if (!montada) return null;

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); return; }
    if (e.key !== 'Tab' || !caja.current) return;
    const xs = [...caja.current.querySelectorAll<HTMLElement>(ENFOCABLES)];
    if (!xs.length) { e.preventDefault(); return; }
    const [a, z] = [xs[0], xs[xs.length - 1]];
    if (e.shiftKey && (document.activeElement === a || document.activeElement === caja.current)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };

  const bajar = (e: React.PointerEvent) => { toque.current = { y: e.clientY, t: performance.now() }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const mover = (e: React.PointerEvent) => {
    if (!toque.current) return;
    const dy = e.clientY - toque.current.y;
    setArrastre(dy > 0 ? dy : dy / 3); // hacia arriba resiste
  };
  const soltar = (e: React.PointerEvent) => {
    if (!toque.current) return;
    const dy = e.clientY - toque.current.y;
    const vel = dy / Math.max(1, performance.now() - toque.current.t);
    toque.current = null;
    setArrastre(0);
    if (dy > 120 || vel > 0.6) onCerrar();
    else if (dy < -60) setCompleta(true);
  };

  return createPortal(
    <div className={`h-velo${saliendo ? ' saliendo' : ''}`} data-v2-nav="" onClick={onCerrar}>
      <div ref={caja} className={`h-hoja capa-3${completa ? ' completa' : ''}${saliendo ? ' saliendo' : ''}${arrastre ? ' arrastrando' : ''}`}
        role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} onKeyDown={teclas} onClick={(e) => e.stopPropagation()}
        style={arrastre ? { transform: `translateY(${arrastre}px)` } : undefined}>
        <div className="h-asa" onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} aria-hidden="true"><i /></div>
        <header className="h-cabeza">
          <h2 id={id} className="t-encabezado">{titulo}</h2>
          <button type="button" className="k-boton fantasma solo-icono chico" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" lado={20} /></button>
        </header>
        <div className="h-cuerpo">{children}</div>
        {pie && <footer className="h-pie">{pie}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** La ⓘ: un botón chico que abre la explicación. Va al lado del título, nunca en lugar del contenido. */
export function Info({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" className="h-info" aria-label={`Cómo funciona: ${titulo}`} onClick={() => setAbierta(true)}><Icono nombre="info" lado={20} /></button>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo={titulo}>{children}</Hoja>
    </>
  );
}

/** Una palabra del glosario con su ⓘ: "Ritmo ⓘ" abre lo que significa. */
export function Termino({ termino }: { termino: string }) {
  const g = GLOSARIO.find((x) => x.ahora === termino || x.antes === termino);
  if (!g) return <>{termino}</>;
  return <span className="h-termino">{g.ahora}<Info titulo={g.ahora}><p className="t-cuerpo-l">{g.explica}</p></Info></span>;
}
