import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { reducedMotion } from '../../lib/motion';

/** Camino suave (Catmull-Rom a Bézier) por los puntos dados. */
export function smooth(pts: [number, number][]): string {
  if (!pts.length) return '';
  if (pts.length < 3) return `M${pts.map((p) => p.join(',')).join('L')}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Cierra un camino hasta la base para pintar el área. */
export const areaOf = (line: string, pts: [number, number][], base: number) =>
  pts.length ? `${line}L${pts[pts.length - 1][0]},${base}L${pts[0][0]},${base}Z` : '';

/**
 * Entrada de un gráfico con GSAP: las líneas `.dibujo` se trazan y las áreas `.crece` suben.
 * Con movimiento reducido, un fundido de 150 ms.
 */
export function useDibujo<T extends Element>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      const t = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15, clearProps: 'opacity' });
      return () => { t.kill(); };
    }
    const ctx = gsap.context(() => {
      el.querySelectorAll<SVGPathElement>('.dibujo').forEach((p) => {
        const len = p.getTotalLength?.() ?? 0;
        if (!len) return;
        gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' });
      });
      const crece = el.querySelectorAll('.crece');
      if (crece.length) gsap.from(crece, { scaleY: 0, transformOrigin: '50% 100%', duration: 0.6, stagger: 0.03, ease: 'power2.out', clearProps: 'transform' });
      const aparece = el.querySelectorAll('.aparece');
      if (aparece.length) gsap.from(aparece, { opacity: 0, duration: 0.5, delay: 0.3, clearProps: 'opacity' });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Tabla de datos solo para lectores de pantalla. */
export function TablaSR({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Leyenda({ items }: { items: { label: string; color: string; kind: 'area' | 'linea' | 'punteada' | 'punto' }[] }) {
  return (
    <div className="ch-leyenda" aria-hidden="true">
      {items.map((i) => <span key={i.label}><i className={`ley-${i.kind}`} style={{ ['--c' as string]: i.color }} />{i.label}</span>)}
    </div>
  );
}

export const Card = ({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`r-card ${className}`}>
    {(title || aside) && <div className="r-card-cab">{title && <h2>{title}</h2>}{aside && <span className="sub">{aside}</span>}</div>}
    {children}
  </section>
);

export const pct = (x: number, d = 0) => `${(Math.round(x * 100 * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',')} %`;
export const num = (x: number, d = 2) => x.toFixed(d).replace('.', ',');
