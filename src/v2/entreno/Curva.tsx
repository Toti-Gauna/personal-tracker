/**
 * Trazo 2.0 · una curva suave en el tiempo, con una meta punteada. El último punto es "estás acá" (trazo amarillo). Si la meta
 * queda lejos de los datos no aplasta la curva: se marca en el borde, con una flecha.
 */
import { useId } from 'react';

export interface PuntoCurva { fecha: string; valor: number; rotulo: string }

const W = 340;
const H = 168;
const IZQ = 34;
const DER = 12;
const ARRIBA = 14;
const ABAJO = 26;
const dia = (f: string) => Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10))) / 86400000;

/** Un paso "lindo" para el eje: 0,5 · 1 · 2 · 5 · 10… */
export function pasoLindo(tramo: number, cortes = 4): number {
  const bruto = Math.max(tramo, 0.1) / cortes;
  const base = 10 ** Math.floor(Math.log10(bruto));
  return [1, 2, 5, 10].map((m) => m * base).find((p) => p >= bruto) ?? 10 * base;
}

/** Una curva monótona por los puntos (no se pasa de largo entre dos pesajes). */
export function caminoSuave(ps: [number, number][]): string {
  if (!ps.length) return '';
  if (ps.length === 1) return `M${ps[0][0]} ${ps[0][1]}`;
  const n = ps.length;
  const dx = ps.slice(1).map((p, i) => p[0] - ps[i][0]);
  const m = ps.slice(1).map((p, i) => (p[1] - ps[i][1]) / (dx[i] || 1));
  const t = ps.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = Math.hypot(a, b);
    if (h > 3) { t[i] = (3 * a * m[i]) / h; t[i + 1] = (3 * b * m[i]) / h; }
  }
  const r = (x: number) => Math.round(x * 10) / 10;
  let d = `M${r(ps[0][0])} ${r(ps[0][1])}`;
  for (let i = 0; i < n - 1; i++) d += `C${r(ps[i][0] + dx[i] / 3)} ${r(ps[i][1] + (t[i] * dx[i]) / 3)} ${r(ps[i + 1][0] - dx[i] / 3)} ${r(ps[i + 1][1] - (t[i + 1] * dx[i]) / 3)} ${r(ps[i + 1][0])} ${r(ps[i + 1][1])}`;
  return d;
}

export function Curva({ puntos, meta, nombre, fmt }: { puntos: PuntoCurva[]; meta?: number; nombre: string; fmt: (n: number) => string }) {
  const id = useId();
  const vs = puntos.map((p) => p.valor);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const tramo = Math.max(hi - lo, 1);
  // La meta entra en el eje solo si está cerca; si no, va en el borde.
  const metaCerca = meta != null && meta >= lo - tramo * 1.5 && meta <= hi + tramo * 1.5;
  const paso = pasoLindo(Math.max(hi, metaCerca ? meta : hi) - Math.min(lo, metaCerca ? meta : lo) || 1);
  // Con la meta en el borde, se deja un paso libre de ese lado: la línea y su rótulo no pisan la curva.
  const min = Math.floor((Math.min(lo, metaCerca ? meta : lo) - paso * 0.25) / paso) * paso - (meta != null && !metaCerca && meta < lo ? paso : 0);
  const max = Math.ceil((Math.max(hi, metaCerca ? meta : hi) + paso * 0.25) / paso) * paso + (meta != null && !metaCerca && meta > hi ? paso : 0);
  const d0 = dia(puntos[0].fecha);
  const d1 = dia(puntos[puntos.length - 1].fecha);
  const x = (f: string) => (d1 > d0 ? IZQ + ((dia(f) - d0) / (d1 - d0)) * (W - IZQ - DER) : (IZQ + W - DER) / 2);
  const y = (v: number) => ARRIBA + (1 - (v - min) / (max - min)) * (H - ARRIBA - ABAJO);
  const ps = puntos.map((p) => [x(p.fecha), y(p.valor)] as [number, number]);
  const camino = caminoSuave(ps);
  const marcas: number[] = [];
  for (let v = min; v <= max + 1e-9; v += paso) marcas.push(Math.round(v * 100) / 100);
  const ultimo = ps[ps.length - 1];
  const yMeta = meta == null ? null : metaCerca ? y(meta) : meta > hi ? ARRIBA : H - ABAJO;
  return (
    <figure className="en-curva" role="img" aria-label={nombre} data-grafico>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="en-curva-g0" /><stop offset="1" className="en-curva-g1" /></linearGradient>
        </defs>
        {marcas.map((v) => <g key={v}><line className="en-curva-grilla" x1={IZQ} x2={W - DER} y1={y(v)} y2={y(v)} /><text className="en-curva-eje" x={IZQ - 8} y={y(v) + 3.5} textAnchor="end">{fmt(v)}</text></g>)}
        {yMeta != null && meta != null && (
          <g>
            <line className="en-curva-meta" x1={IZQ} x2={W - DER} y1={yMeta} y2={yMeta} />
            <text className="en-curva-meta-t" x={W - DER} y={yMeta + (metaCerca || meta < lo ? -6 : 13)} textAnchor="end">meta {fmt(meta)}{metaCerca ? '' : meta > hi ? ' ↑' : ' ↓'}</text>
          </g>
        )}
        {ps.length > 1 && <path className="en-curva-area" d={`${camino}L${ultimo[0]} ${H - ABAJO}L${ps[0][0]} ${H - ABAJO}Z`} fill={`url(#${id}g)`} />}
        {ps.length > 1 && <path className="en-curva-linea" d={camino} pathLength={1} />}
        {ps.slice(0, -1).map((p, i) => <circle key={puntos[i].fecha} className="en-curva-punto" cx={p[0]} cy={p[1]} r={3} />)}
        <circle className="en-curva-halo" cx={ultimo[0]} cy={ultimo[1]} r={9} />
        <circle className="en-curva-hoy" cx={ultimo[0]} cy={ultimo[1]} r={5} />
        <text className="en-curva-eje" x={IZQ} y={H - 6}>{puntos[0].rotulo}</text>
        {puntos.length > 1 && <text className="en-curva-eje" x={W - DER} y={H - 6} textAnchor="end">{puntos[puntos.length - 1].rotulo}</text>}
      </svg>
    </figure>
  );
}
