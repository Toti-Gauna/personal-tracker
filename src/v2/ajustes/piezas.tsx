/**
 * Trazo 2.0 · piezas que repiten las pantallas de Ajustes y de las herramientas de Hoy (tanda 3.3): la barra de tramos de un
 * pomodoro, la descarga de un archivo y el nombre de las ramas con los colores de la 2.0.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Seg } from '../../data/types';

/** Barra de un plan de foco: foco lleno (en el color del área), descanso rayado. `actual` marca el tramo en curso. */
export function Tramos({ segs, area = 'var(--texto)', actual, nombre }: { segs: Seg[]; area?: string; actual?: number; nombre: string }) {
  const frase = segs.map((s) => `${s.type === 'focus' ? 'foco' : 'descanso'} de ${s.min} min`).join(', ');
  return (
    <div className="ax-tramos" role="img" aria-label={`${nombre}: ${frase}`} data-grafico style={{ ['--area' as string]: area } as CSSProperties}>
      {segs.map((s, i) => <span key={i} className={`ax-t-${s.type === 'focus' ? 'foco' : 'descanso'}${actual === i ? ' ax-t-actual' : ''}${actual != null && i < actual ? ' ax-t-paso' : ''}`} style={{ flexGrow: s.min }} />)}
    </div>
  );
}

/** Baja un texto como archivo. */
export function descargar(texto: string, nombre: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "23 nov" desde "2026-11-23". */
export const diaMes = (f: string) => `${Number(f.slice(8, 10))} ${MES[Number(f.slice(5, 7)) - 1]}`;

/** Horas con coma: 90 → "1,5". */
export const horasDe = (min: number) => String(Math.round((min / 60) * 100) / 100).replace('.', ',');

/** El rótulo visible de un control que no lo trae (el contador): todo número con su nombre. El control ya se llama igual para el lector. */
export function Etiquetado({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <div className="ax-etiquetado"><span className="t-rotulo" aria-hidden="true">{etiqueta}</span>{children}</div>;
}
