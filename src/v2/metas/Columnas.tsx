/**
 * Trazo 2.0 · columnas con una línea encima: la mejora de cada día con su promedio, las horas de cada mes (apiladas por frente), el
 * avance de la ruta contra el plan. Hoy va con el trazo; el resto, en tinta o en el color del frente. Es un dibujo con su resumen en
 * palabras (`nombre`): lo que dice cada columna está en la tabla de al lado o en la hoja de detalle, no solo en el color.
 */
import type { CSSProperties } from 'react';

export interface Parte { valor: number; area?: string }
export interface Columna { etiqueta?: string; partes: Parte[]; hoy?: boolean; /** Un número arriba de la columna ("82"). */ texto?: string }

interface Props {
  columnas: Columna[];
  /** Una línea que cruza el gráfico (un valor por columna): el promedio de 7 días, el plan. */
  linea?: (number | null)[];
  /** Una raya horizontal punteada: el objetivo. */
  meta?: number;
  max?: number;
  alto?: number;
  nombre: string;
  /** La línea va punteada (el plan). */
  punteada?: boolean;
}

export function Columnas({ columnas, linea, meta, max, alto = 120, nombre, punteada }: Props) {
  const tope = max ?? Math.max(0.0001, meta ?? 0, ...(linea ?? []).map((v) => v ?? 0), ...columnas.map((c) => c.partes.reduce((s, p) => s + p.valor, 0)));
  const n = columnas.length;
  const puntos = (linea ?? []).map((v, i) => (v == null ? null : `${((i + 0.5) / n) * 100},${100 - Math.min(1, v / tope) * 100}`)).filter(Boolean).join(' ');
  return (
    <figure className="mt-cols" role="img" aria-label={nombre} data-grafico style={{ ['--n' as string]: n, ['--alto' as string]: `${alto}px` } as CSSProperties}>
      {columnas.some((c) => c.texto) && <div className="mt-cols-val" aria-hidden="true">{columnas.map((c, i) => <span key={i} className="t-dato">{c.texto}</span>)}</div>}
      <div className="mt-cols-area">
        {meta != null && <i className="mt-cols-meta" style={{ bottom: `${Math.min(100, (meta / tope) * 100)}%` }} aria-hidden="true" />}
        <div className="mt-cols-barras">
          {columnas.map((c, i) => (
            <span key={i} className={`mt-col${c.hoy && c.partes.length === 1 ? ' hoy' : ''}`}>
              {c.partes.map((p, k) => <i key={k} style={{ height: `${Math.max(p.valor > 0 ? 2 : 0, (p.valor / tope) * 100)}%`, ...(p.area ? { ['--parte' as string]: p.area } : {}) }} />)}
            </span>
          ))}
        </div>
        {puntos && <svg className={`mt-cols-linea${punteada ? ' punteada' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={puntos} /></svg>}
      </div>
      {columnas.some((c) => c.etiqueta) && <div className="mt-cols-et" aria-hidden="true">{columnas.map((c, i) => <span key={i} className={`t-rotulo${c.hoy ? ' hoy' : ''}`}>{c.etiqueta}</span>)}</div>}
    </figure>
  );
}
