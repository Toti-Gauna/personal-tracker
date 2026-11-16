/**
 * Ola 23 · gráficos del clipping: SVG propios, con tabla para lector de pantalla y animación de
 * dibujo (useDibujo respeta "reducir movimiento"). Sin sombras; acento del área Eclipse.
 */
import { smooth, TablaSR, useDibujo } from './core';

const fmtUsd = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0).replace('.', ',')}k` : `${Math.round(v)}`);
const usd2 = (v: number) => v.toFixed(2).replace('.', ',');

/** 1 · Ingreso mensual: barras de lo cobrado contra la meta, las tres curvas y la línea de USD 10k. */
export function IngresoMensual({ cobrado, metas, optimista, conservador, actual, techo = 10000 }: {
  cobrado: number[]; metas: number[]; optimista: number[]; conservador: number[]; actual: number; techo?: number;
}) {
  const ref = useDibujo<SVGSVGElement>([cobrado.join(',')]);
  const W = 340;
  const H = 190;
  const T = 14;
  const B = 160;
  const L = 30;
  const n = metas.length;
  const max = Math.max(techo * 1.1, ...cobrado, ...optimista);
  const slot = (W - L - 4) / n;
  const bw = Math.min(16, slot * 0.58);
  const cx = (i: number) => L + slot * i + slot / 2;
  const y = (v: number) => B - (v / max) * (B - T);
  const linea = (vs: number[]) => smooth(vs.map((v, i) => [cx(i), y(v)] as [number, number]));
  return (
    <>
      <svg ref={ref} className="ch clip-ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ingreso mensual: ${cobrado.filter((v) => v > 0).length} meses con cobros; el mes ${actual} lleva USD ${Math.round(cobrado[actual - 1] ?? 0)} de ${metas[actual - 1] ?? 0}`}>
        {[2500, 5000, 7500].map((g) => (
          <g key={g}><line x1={L} x2={W - 4} y1={y(g)} y2={y(g)} className="ch-grid" /><text x={L - 4} y={y(g) + 4} textAnchor="end" className="ch-eje">{fmtUsd(g)}</text></g>
        ))}
        <line x1={L} x2={W - 4} y1={y(techo)} y2={y(techo)} className="clip-techo" />
        <text x={W - 4} y={y(techo) - 5} textAnchor="end" className="clip-techo-t">USD 10k</text>
        <line x1={L} x2={W - 4} y1={B} y2={B} className="ch-base" />
        {metas.map((m, i) => (
          <g key={i} className="crece">
            <rect x={cx(i) - bw / 2} y={y(m)} width={bw} height={B - y(m)} rx={3} className={`clip-meta${i + 1 === actual ? ' actual' : ''}`} />
            {cobrado[i] > 0 && <rect x={cx(i) - bw / 2} y={y(cobrado[i])} width={bw} height={B - y(cobrado[i])} rx={3} className={`clip-cob${cobrado[i] >= m ? ' ok' : ''}`} />}
            <text x={cx(i)} y={H - 10} textAnchor="middle" className={`ch-eje${i + 1 === actual ? ' hoy' : ''}`}>{i + 1}</text>
          </g>
        ))}
        <path d={linea(optimista)} className="clip-curva opt dibujo" />
        <path d={linea(metas)} className="clip-curva base dibujo" />
        <path d={linea(conservador)} className="clip-curva cons dibujo" />
      </svg>
      <TablaSR caption="Ingreso por mes del roadmap (USD)" head={['Mes', 'Cobrado', 'Base', 'Optimista', 'Conservador']}
        rows={metas.map((m, i) => [`Mes ${i + 1}`, Math.round(cobrado[i] ?? 0), m, optimista[i], conservador[i]])} />
    </>
  );
}

/** 3 · Pago real por 1.000 views: una barra por campaña, la tarifa listada como punto y los pisos 0,80 y 0,70. */
export function PagoPorCampana({ filas, pisos = [0.8, 0.7] }: { filas: { nombre: string; pagoReal: number | null; tarifa: number }[]; pisos?: number[] }) {
  const ref = useDibujo<SVGSVGElement>([filas.map((f) => f.pagoReal).join(',')]);
  const W = 340;
  const RH = 34;
  const L = 112;
  const R = W - 30;
  const H = Math.max(1, filas.length) * RH + 26;
  const max = Math.max(2, ...filas.map((f) => Math.max(f.pagoReal ?? 0, f.tarifa))) * 1.08;
  const x = (v: number) => L + (v / max) * (R - L);
  return (
    <>
      <svg ref={ref} className="ch clip-ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Pago real por 1.000 views en ${filas.length} campañas, contra la tarifa listada`}>
        {pisos.map((p, i) => (
          <g key={p}><line x1={x(p)} x2={x(p)} y1={4} y2={H - 20} className={`clip-piso p${Math.round(p * 100)}`} /><text x={x(p) + (i ? -3 : 3)} y={H - 6} textAnchor={i ? 'end' : 'start'} className="ch-eje">{usd2(p)}</text></g>
        ))}
        {filas.map((f, i) => {
          const yy = 8 + i * RH;
          const bajo = f.pagoReal != null && f.pagoReal < pisos[pisos.length - 1];
          return (
            <g key={f.nombre}>
              <text x={L - 8} y={yy + 15} textAnchor="end" className="clip-et">{f.nombre.length > 16 ? `${f.nombre.slice(0, 15)}…` : f.nombre}</text>
              <rect x={L} y={yy + 4} width={R - L} height={16} rx={3} className="clip-pista" />
              {f.pagoReal != null && <rect x={L} y={yy + 4} width={Math.max(2, x(f.pagoReal) - L)} height={16} rx={3} className={`clip-barra crece-x${bajo ? ' bajo' : ''}`} />}
              <circle cx={x(f.tarifa)} cy={yy + 12} r={4.5} className="clip-tarifa aparece" />
              <text x={R + 4} y={yy + 16} className="clip-v">{f.pagoReal == null ? '—' : usd2(f.pagoReal)}</text>
            </g>
          );
        })}
      </svg>
      <TablaSR caption="Pago real contra tarifa listada (USD por 1.000 views)" head={['Campaña', 'Pago real', 'Tarifa listada']} rows={filas.map((f) => [f.nombre, f.pagoReal == null ? 'sin cobros' : usd2(f.pagoReal), usd2(f.tarifa)])} />
    </>
  );
}

/** 4 · Embudo: publicados → aprobados → más de 1.000 views → pagados. */
export function Embudo({ pasos }: { pasos: { nombre: string; v: number }[] }) {
  const ref = useDibujo<HTMLOListElement>([pasos.map((p) => p.v).join(',')]);
  const max = Math.max(1, pasos[0]?.v ?? 1);
  return (
    <>
      <ol ref={ref} className="clip-embudo" aria-hidden="true">
        {pasos.map((p, i) => (
          <li key={p.nombre}>
            <span className="clip-emb-t"><b className="mono">{p.v.toLocaleString('es-AR')}</b> {p.nombre}</span>
            <span className="clip-emb-b"><i className="crece-x" style={{ width: `${Math.max(p.v ? 2 : 0, (p.v / max) * 100)}%`, opacity: 1 - i * 0.16 }} /></span>
            {i > 0 && <small className="mono sub">{pasos[0].v ? `${Math.round((p.v / pasos[0].v) * 100)} %` : '—'}</small>}
          </li>
        ))}
      </ol>
      <TablaSR caption="Embudo de clips" head={['Paso', 'Clips']} rows={pasos.map((p) => [p.nombre, p.v])} />
    </>
  );
}

/** 5 · Cuentas activas (o clips por día) contra el plan: escalera del plan y puntos reales. */
export function EscaleraPlan({ plan, real, actual, unidad }: { plan: number[]; real: (number | null)[]; actual: number; unidad: string }) {
  const ref = useDibujo<SVGSVGElement>([real.join(',')]);
  const W = 340;
  const H = 150;
  const T = 12;
  const B = 122;
  const L = 26;
  const n = plan.length;
  const max = Math.max(1, ...plan, ...real.map((v) => v ?? 0)) * 1.1;
  const step = (W - L - 6) / n;
  const x = (i: number) => L + step * i;
  const y = (v: number) => B - (v / max) * (B - T);
  let d = '';
  plan.forEach((v, i) => { d += `${i ? 'L' : 'M'}${x(i)},${y(v)}L${x(i + 1)},${y(v)}`; });
  const pts = real.map((v, i) => (v == null ? null : ([x(i) + step / 2, y(v)] as [number, number]))).filter(Boolean) as [number, number][];
  return (
    <>
      <svg ref={ref} className="ch clip-ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${unidad} contra el plan, mes ${actual}: ${real[actual - 1] ?? 0} de ${plan[actual - 1] ?? 0}`}>
        {[0.5, 1].map((g) => <g key={g}><line x1={L} x2={W - 6} y1={y(g * Math.max(...plan))} y2={y(g * Math.max(...plan))} className="ch-grid" /><text x={L - 4} y={y(g * Math.max(...plan)) + 4} textAnchor="end" className="ch-eje">{Math.round(g * Math.max(...plan))}</text></g>)}
        <line x1={L} x2={W - 6} y1={B} y2={B} className="ch-base" />
        <path d={d} className="clip-escalon dibujo" />
        {pts.length > 1 && <path d={smooth(pts)} className="ch-linea dibujo" />}
        {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={4} className="ch-punto aparece" />)}
        {plan.map((_, i) => <text key={i} x={x(i) + step / 2} y={H - 8} textAnchor="middle" className={`ch-eje${i + 1 === actual ? ' hoy' : ''}`}>{i + 1}</text>)}
      </svg>
      <TablaSR caption={`${unidad} por mes contra el plan`} head={['Mes', 'Plan', 'Real']} rows={plan.map((p, i) => [`Mes ${i + 1}`, p, real[i] ?? '—'])} />
    </>
  );
}

/** 6 · Concentración: una barra por fuente y la línea del máximo (30 %). */
export function Concentracion({ partes, max = 0.3 }: { partes: { nombre: string; pct: number; usd: number }[]; max?: number }) {
  const ref = useDibujo<HTMLUListElement>([partes.map((p) => p.pct).join(',')]);
  return (
    <>
      <ul ref={ref} className="clip-conc" aria-hidden="true" style={{ ['--max' as string]: `${max * 100}%` }}>
        {partes.slice(0, 8).map((p) => (
          <li key={p.nombre} className={p.pct > max ? 'pasa' : ''}>
            <span className="clip-conc-t"><span>{p.nombre}</span><b className="mono">{Math.round(p.pct * 100)} %</b></span>
            <span className="clip-conc-b"><i className="crece-x" style={{ width: `${p.pct * 100}%` }} /><em /></span>
          </li>
        ))}
      </ul>
      <TablaSR caption={`De dónde sale el ingreso (máximo ${Math.round(max * 100)} %)`} head={['Fuente', 'Parte', 'USD']} rows={partes.map((p) => [p.nombre, `${Math.round(p.pct * 100)} %`, Math.round(p.usd)])} />
    </>
  );
}

/** 8 y 9 · Barras verticales simples con una línea de objetivo opcional. */
export function Barras({ valores, objetivo, etiqueta, formato = (v: number) => String(Math.round(v)) }: {
  valores: { label: string; v: number | null; resaltado?: boolean }[]; objetivo?: { v: number; label: string; indice?: number }; etiqueta: string; formato?: (v: number) => string;
}) {
  const ref = useDibujo<SVGSVGElement>([valores.map((x) => x.v).join(',')]);
  const W = 340;
  const H = 150;
  const T = 16;
  const B = 122;
  const n = Math.max(1, valores.length);
  const slot = (W - 8) / n;
  const bw = Math.min(26, slot * 0.6);
  const max = Math.max(1e-9, ...valores.map((x) => x.v ?? 0), objetivo && objetivo.indice == null ? objetivo.v : 0) * 1.12;
  const cx = (i: number) => 4 + slot * i + slot / 2;
  const y = (v: number) => B - (v / max) * (B - T);
  return (
    <>
      <svg ref={ref} className="ch clip-ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={etiqueta}>
        <line x1={4} x2={W - 4} y1={B} y2={B} className="ch-base" />
        {objetivo && objetivo.indice == null && <><line x1={4} x2={W - 4} y1={y(objetivo.v)} y2={y(objetivo.v)} className="clip-techo" /><text x={W - 4} y={y(objetivo.v) - 5} textAnchor="end" className="clip-techo-t">{objetivo.label}</text></>}
        {objetivo?.indice != null && <><line x1={cx(objetivo.indice) - slot / 2} x2={cx(objetivo.indice) - slot / 2} y1={T} y2={B} className="clip-techo" /><text x={cx(objetivo.indice) - slot / 2 + 4} y={T + 6} className="clip-techo-t">{objetivo.label}</text></>}
        {valores.map((x, i) => (
          <g key={x.label + i}>
            {x.v != null && x.v > 0 && <rect x={cx(i) - bw / 2} y={y(x.v)} width={bw} height={B - y(x.v)} rx={3} className={`clip-cob crece${x.resaltado ? ' ok' : ''}`} />}
            {x.v != null && x.v > 0 && <text x={cx(i)} y={y(x.v) - 4} textAnchor="middle" className="clip-v aparece">{formato(x.v)}</text>}
            <text x={cx(i)} y={H - 8} textAnchor="middle" className="ch-eje">{x.label}</text>
          </g>
        ))}
      </svg>
      <TablaSR caption={etiqueta} head={['', 'Valor']} rows={valores.map((x) => [x.label, x.v == null ? '—' : formato(x.v)])} />
    </>
  );
}
