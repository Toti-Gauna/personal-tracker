/**
 * Trazo 2.0 · la hoja de abajo (tanda 1.5): se arrastra para cerrar o agrandar, Escape la cierra, el foco queda adentro y
 * vuelve a donde estaba. La ⓘ es una hoja con la explicación que antes vivía bajo el título.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from '../iconos';
import { GLOSARIO } from '../reglas';
import './superficies.css';

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
    if (!montada || saliendo) return;
    previo.current = document.activeElement as HTMLElement | null;
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caja.current?.focus();
    return () => { document.body.style.overflow = desborde; previo.current?.focus?.(); };
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
    <div className={`h-velo${saliendo ? ' saliendo' : ''}`} onClick={onCerrar}>
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
