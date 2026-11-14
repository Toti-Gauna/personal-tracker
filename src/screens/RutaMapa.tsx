import { useState } from 'react';
import { COLUMNAS, filasMapa, type Fila, type Rango } from '../data/mapa';
import { fechaCorta } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog, Rama } from '../data/types';
import { useStore } from '../state/store';
import { TablaSR, useDibujo } from '../ui/charts/core';
import '../styles/plan.css';

const FILA = 58;
const MAIN = 16;
const PASO = 19;
const x = (r: Rama | 'main') => (r === 'main' ? MAIN : MAIN + PASO * (COLUMNAS.indexOf(r) + 1));
const RANGOS: [Rango, string][] = [['mes', 'Este mes'], ['trimestre', 'Trimestre'], ['todo', '18 meses']];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Línea de una rama: sale de main en T+0 (abajo), sube por su columna y vuelve a main en T+18 (arriba). */
function camino(r: Rama, y0: number, y1: number, curvaArriba: boolean, curvaAbajo: boolean) {
  const cx = x(r);
  const parts: string[] = [];
  if (curvaAbajo) parts.push(`M${MAIN},${y0} C${MAIN},${y0 - FILA * 0.55} ${cx},${y0 - FILA * 0.35} ${cx},${y0 - FILA * 0.9}`);
  else parts.push(`M${cx},${y0}`);
  parts.push(`L${cx},${y1 + (curvaArriba ? FILA * 0.9 : 0)}`);
  if (curvaArriba) parts.push(`C${cx},${y1 + FILA * 0.35} ${MAIN},${y1 + FILA * 0.55} ${MAIN},${y1}`);
  return parts.join(' ');
}

/** 7.2 El mapa: el historial del plan como git log --graph, con las seis ramas saliendo y volviendo a main. */
export function RutaMapa({ day }: { day: DayLog }) {
  const [rango, setRango] = useState<Rango>('mes');
  const plan = useStore((s) => s.plan);
  const study = useStore((s) => s.study);
  const t0 = useStore((s) => s.settings?.startDate);
  const filas = filasMapa(day.date, rango, plan, study, t0);
  const ref = useDibujo<SVGSVGElement>([rango, filas.length]);
  const H = filas.length * FILA;
  const cy = (i: number) => i * FILA + 22;
  const top = cy(0);
  const bottom = cy(filas.length - 1);
  const headI = filas.findIndex((f) => f.tipo === 'head');
  const headY = cy(headI);
  const curvaArriba = filas[0].hito === 'T+18';
  const curvaAbajo = filas[filas.length - 1].hito === 'T+0';
  const W = MAIN + PASO * (COLUMNAS.length + 1);

  const etiqueta = (f: Fila) => {
    if (f.tipo === 'hito') return `${f.hito} · ${f.hito === 'T+18' ? `${MESES[Number(f.fecha.slice(5, 7)) - 1]} ${f.fecha.slice(0, 4)}` : fechaCorta(f.fecha)}`;
    if (f.tipo === 'head') return `HEAD · hoy ${fechaCorta(f.fecha)}`;
    if (f.tipo === 'gap') return '⋮';
    return `${f.rama} · ${fechaCorta(f.fecha)}`;
  };

  return (
    <main className="pantalla mapa-pag">
      <div className="topbar"><a className="volver" href="#/metas">Ruta</a><span className="mono sub">git log --graph</span></div>
      <header>
        <h1 className="titulo">El mapa</h1>
        <p className="sub">Las seis ramas salen de main el {fechaCorta(filas[filas.length - 1].fecha)} y vuelven a juntarse en mayo de 2028. Lo hecho va en trazo lleno; lo que viene, punteado.</p>
      </header>
      <div className="segmentado" role="radiogroup" aria-label="Cuánto mirar">
        {RANGOS.map(([id, n]) => <button key={id} role="radio" aria-checked={rango === id} onClick={() => setRango(id)}>{n}</button>)}
      </div>

      <div className="mapa" style={{ ['--w' as string]: `${W + 14}px` }}>
        <svg ref={ref} className="mapa-svg" width={W + 8} height={H} viewBox={`0 0 ${W + 8} ${H}`} role="img"
          aria-label={`Mapa en ramas: ${filas.filter((f) => f.tipo !== 'gap').length} momentos, de ${etiqueta(filas[filas.length - 1])} a ${etiqueta(filas[0])}. HEAD en ${fechaCorta(day.date)}.`}>
          {/* main y las seis ramas: pasado lleno, desde HEAD hacia arriba punteado */}
          <line x1={MAIN} x2={MAIN} y1={headY} y2={bottom} className="mp-linea" style={{ stroke: 'var(--tinta)' }} />
          <line x1={MAIN} x2={MAIN} y1={top} y2={headY} className="mp-linea futuro" style={{ stroke: 'var(--tinta)' }} />
          {COLUMNAS.map((r) => {
            const d = camino(r, bottom, top, curvaArriba, curvaAbajo);
            return (
              <g key={r} style={{ stroke: RAMA_COLOR[r] }}>
                <clipPath id={`pas-${r}`}><rect x="0" y={headY} width={W + 8} height={H} /></clipPath>
                <clipPath id={`fut-${r}`}><rect x="0" y="0" width={W + 8} height={headY} /></clipPath>
                <path d={d} className="mp-linea dibujo" clipPath={`url(#pas-${r})`} />
                <path d={d} className="mp-linea futuro" clipPath={`url(#fut-${r})`} />
              </g>
            );
          })}
          {/* entregas entre ramas: curva S del color de la que entrega */}
          {filas.map((f, i) => (f.a && f.rama !== 'main' ? (
            <path key={`e-${f.id}`} d={`M${x(f.rama)},${cy(i)} C${x(f.rama)},${cy(i) - FILA * 0.5} ${x(f.a)},${cy(i) - FILA * 0.4} ${x(f.a)},${cy(i) - FILA * 0.85}`} className={`mp-linea${f.futuro ? ' futuro' : ''}`} style={{ stroke: RAMA_COLOR[f.rama] }} />
          ) : null))}
          {/* commits */}
          {filas.map((f, i) => {
            if (f.tipo === 'gap') return null;
            const cx = x(f.rama);
            const s = f.tipo === 'head' ? 14 : f.tipo === 'hito' ? 13 : 10;
            const c = f.rama === 'main' ? 'var(--tinta)' : RAMA_COLOR[f.rama];
            return (
              <g key={f.id}>
                {f.tipo === 'head' && <circle cx={cx} cy={cy(i)} r={15} className="mp-halo" />}
                <rect x={cx - s / 2} y={cy(i) - s / 2} width={s} height={s} rx={3} className={f.futuro ? 'mp-commit futuro' : 'mp-commit'} style={{ ['--c' as string]: c }} />
              </g>
            );
          })}
        </svg>
        <ol className="mapa-filas">
          {filas.map((f) => (
            <li key={f.id} className={`mf-${f.tipo}`} style={{ ['--c' as string]: f.rama === 'main' ? 'var(--tinta)' : RAMA_COLOR[f.rama] }}>
              <span className="mono mf-et">{etiqueta(f)}</span>
              <span className={f.tipo === 'head' ? 'mf-t resaltado' : 'mf-t'} style={f.tipo === 'head' ? { ['--c' as string]: 'var(--ing)' } : undefined}>{f.texto}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mapa-ley mono" aria-hidden="true">
        <span style={{ ['--c' as string]: 'var(--tinta)' }}><i />main</span>
        {COLUMNAS.map((r) => <span key={r} style={{ ['--c' as string]: RAMA_COLOR[r] }}><i />{r}</span>)}
      </div>
      <TablaSR caption="Mapa en ramas, de lo más nuevo a lo más viejo" head={['Cuándo', 'Rama', 'Qué']} rows={filas.filter((f) => f.tipo !== 'gap').map((f) => [etiqueta(f), f.rama, f.texto])} />
    </main>
  );
}
