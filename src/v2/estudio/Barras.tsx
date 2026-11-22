/**
 * Trazo 2.0 · barras chicas con una meta punteada: la semana de estudio y el pronóstico de repaso. Hoy va con el trazo; el resto,
 * en tinta. Cada barra lleva su rótulo y todo el gráfico se lee entero para el lector de pantalla.
 */
import type { CSSProperties } from 'react';
import './barras.css';

export interface Barra { etiqueta: string; valor: number; hoy?: boolean; texto?: string }

export function Barras({ barras, meta, nombre, alto = 96 }: { barras: Barra[]; meta?: number; nombre: string; alto?: number }) {
  const max = Math.max(1, meta ?? 0, ...barras.map((b) => b.valor));
  return (
    <figure className="es-barras" style={{ ['--alto' as string]: `${alto}px` } as CSSProperties} role="img" aria-label={nombre}>
      {meta != null && meta > 0 && <i className="es-meta" style={{ bottom: `calc(${(meta / max) * 100}% * var(--alto) / 100 + 22px)` }} aria-hidden="true" />}
      {barras.map((b) => (
        <span key={b.etiqueta} className={`es-barra${b.hoy ? ' hoy' : ''}`}>
          <span className="es-barra-valor t-dato">{b.texto ?? (b.valor ? String(b.valor) : '—')}</span>
          <span className="es-barra-col"><span style={{ height: `${(b.valor / max) * 100}%` }} /></span>
          <span className="es-barra-et t-rotulo">{b.etiqueta}</span>
        </span>
      ))}
    </figure>
  );
}
