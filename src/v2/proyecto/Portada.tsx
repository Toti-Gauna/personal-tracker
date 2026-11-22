/**
 * Trazo 2.0 · la portada: el dibujo generado de un bloque (`portada-datos`) con el color de su área, un velo para que se lea
 * lo que va encima y, al entrar, los trazos se dibujan de a uno. Es la cabeza de las páginas de proyecto, certificación,
 * ventana, pista e ítem de fondo.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { ALTO, ANCHO, portada } from './portada-datos';

export function Portada({ id, tipo, area, alto, children, className }: { id: string; tipo?: string; area: string; alto?: number; children?: ReactNode; className?: string }) {
  const arte = useMemo(() => portada(id, tipo), [id, tipo]);
  return (
    <div className={`pt-portada${className ? ` ${className}` : ''}`} data-motivo={arte.motivo} style={{ ['--area' as string]: area, ...(alto ? { minHeight: alto } : {}) } as CSSProperties}>
      <svg className="pt-arte" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        {arte.trazos.map((t, i) => <path key={i} d={t.d} pathLength={1} strokeWidth={t.w} style={{ opacity: t.o, ['--i' as string]: i } as CSSProperties} />)}
        {arte.puntos.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} style={{ opacity: p.o, ['--i' as string]: i } as CSSProperties} />)}
      </svg>
      <div className="pt-velo" />
      {children && <div className="pt-portada-pie">{children}</div>}
    </div>
  );
}
