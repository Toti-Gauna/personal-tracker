/** Trazo 2.0 · piezas de movimiento para usar en las pantallas: números que cuentan, listas que entran escalonadas. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DUR, escalonar, reducido, salidaExpo } from './movimiento';

const fmt = (n: number, dec: number) => n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

interface NumeroProps { valor: number; decimales?: number; prefijo?: string; sufijo?: string; duracion?: number; className?: string }

/**
 * Un número que cuenta desde el anterior (o desde 0 al aparecer) hasta su valor. El lector de pantalla lee solo el final.
 * Con movimiento reducido, aparece directo.
 */
export function Numero({ valor, decimales = 0, prefijo = '', sufijo = '', duracion = DUR.pantalla + 280, className }: NumeroProps) {
  const [visto, setVisto] = useState(() => (reducido() ? valor : 0));
  const previo = useRef(reducido() ? valor : 0);
  useEffect(() => {
    const desde = previo.current;
    if (reducido() || desde === valor || typeof requestAnimationFrame !== 'function') { previo.current = valor; setVisto(valor); return; }
    const t0 = performance.now();
    let id = 0;
    const paso = () => {
      // Un solo reloj (performance.now): el sello que pasa requestAnimationFrame no siempre comparte el origen.
      const t = Math.max(0, Math.min(1, (performance.now() - t0) / duracion));
      const v = desde + (valor - desde) * salidaExpo(t);
      previo.current = v;
      setVisto(v);
      if (t < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, duracion]);
  const final = `${prefijo}${fmt(valor, decimales)}${sufijo}`;
  return (
    <span className={`mv-numero ${className ?? ''}`}>
      <span aria-hidden="true">{prefijo}{fmt(visto, decimales)}{sufijo}</span>
      <span className="v2-oculto">{final}</span>
    </span>
  );
}

/** Sus hijos entran escalonados al montarse (y otra vez cuando cambia `clave`). */
export function Escalonado({ children, clave, className, como: Como = 'div' }: { children: ReactNode; clave?: string | number; className?: string; como?: 'div' | 'ul' | 'ol' }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => { escalonar(ref.current); }, [clave]);
  return <Como ref={ref as never} className={className}>{children}</Como>;
}
