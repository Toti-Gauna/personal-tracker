import { useState } from 'react';
import { RAMA_NOMBRE } from '../data/ramas';
import type { RamaMapa } from '../data/hitos';
import { COLUMNAS, colorMapa, filasMapa, type Fila, type Rango } from '../data/mapa';
import { PLAN, fechaCorta, fechaHito } from '../data/plan';
import type { DayLog } from '../data/types';
import { marcarHito, moverHito } from '../state/plan';
import { useStore } from '../state/store';
import { TablaSR, useDibujo } from '../ui/charts/core';
import '../styles/plan.css';

const FILA = 58;
const MAIN = 16;
/** Ola 8b: 7 columnas (suma clipping), así que el paso baja de 19 a 17 px. */
const PASO = 17;
const x = (r: RamaMapa | 'main') => (r === 'main' ? MAIN : MAIN + PASO * (COLUMNAS.indexOf(r) + 1));
const RANGOS: [Rango, string][] = [['mes', 'Este mes'], ['trimestre', 'Trimestre'], ['todo', '18 meses']];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Línea de una rama: sale de main en T+0 (abajo), sube por su columna y vuelve a main en T+18 (arriba). */
function camino(r: RamaMapa, y0: number, y1: number, curvaArriba: boolean, curvaAbajo: boolean) {
  const cx = x(r);
  const parts: string[] = [];
  if (curvaAbajo) parts.push(`M${MAIN},${y0} C${MAIN},${y0 - FILA * 0.55} ${cx},${y0 - FILA * 0.35} ${cx},${y0 - FILA * 0.9}`);
  else parts.push(`M${cx},${y0}`);
  parts.push(`L${cx},${y1 + (curvaArriba ? FILA * 0.9 : 0)}`);
  if (curvaArriba) parts.push(`C${cx},${y1 + FILA * 0.35} ${MAIN},${y1 + FILA * 0.55} ${MAIN},${y1}`);
  return parts.join(' ');
}

/**
 * 7.2 El mapa (con 10.1 foco y 10.4 hitos): el historial del plan como git log --graph. Con
 * ramas en pausa, la rama se dibuja punteada y tenue desde la pausa (mismo componente, sin
 * pantalla aparte). En Trimestre, los hitos de cada rama: rombo para los grandes.
 */
export function RutaMapa({ day }: { day: DayLog }) {
  const [rango, setRango] = useState<Rango>('mes');
  const [sel, setSel] = useState<string | null>(null);
  const [ramaF, setRamaF] = useState<RamaMapa | null>(null);
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
  // Antes de T0 HEAD es T+0 (abajo de todo).
  const headY = headI >= 0 ? cy(headI) : bottom;
  const curvaArriba = filas[0].hito === 'T+18';
  const curvaAbajo = filas[filas.length - 1].hito === 'T+0';
  const W = MAIN + PASO * (COLUMNAS.length + 1);
  // Ramas en pausa ahora: desde qué fila hacia arriba van punteadas y tenues.
  const pausas = (plan.pausas ?? []).filter((p) => !p.hasta);
  const yPausa = (r: RamaMapa) => {
    const p = pausas.find((q) => q.objetivo === r);
    if (!p) return null;
    const ult = filas.map((f, i) => ({ f, i })).filter(({ f }) => f.tipo !== 'gap' && f.fecha >= p.desde).pop();
    return ult ? cy(ult.i) : bottom;
  };
  const enPausa = new Set(pausas.map((p) => p.objetivo));
  const foco = pausas.length > 0;
  const titulo = rango === 'trimestre' ? 'El mapa · hitos' : foco ? 'El mapa · foco' : 'El mapa';
  const desdeTxt = pausas[0] ? fechaCorta(pausas[0].desde) : '';
  const texto = rango === 'trimestre'
    ? `Los hitos de cada rama del trimestre. El rombo marca un hito grande: cierra un proyecto, un libro o una etapa.${foco ? ' Handyx y Eclipse en stand-by; clipping tiene su propia rama.' : ''} Tocá un hito para marcarlo hecho.`
    : foco
      ? `Handyx y Eclipse quedan en stand-by desde el ${desdeTxt}. Las otras ramas van a fondo hasta que entre el trabajo. Lo hecho va en trazo lleno; lo que viene, punteado.`
      : `Las ramas salen de main el ${fechaCorta(filas[filas.length - 1].fecha)} y vuelven a juntarse en T+18 (${fechaCorta(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!, t0))} ${fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!, t0).slice(0, 4)}). Lo hecho va en trazo lleno; lo que viene, punteado.`;

  const fSel = filas.find((f) => f.id === sel);
  /** Con una rama elegida, lo que no es de ella (ni entrega ni recibe de ella) se atenúa. */
  const atenuada = (f: Fila) => ramaF != null && f.tipo !== 'gap' && f.tipo !== 'head' && f.rama !== ramaF && f.desde !== ramaF && f.a !== ramaF && f.rama !== 'main';
  const etiqueta = (f: Fila) => {
    if (f.tipo === 'hito') return `${f.hito} · ${f.hito === 'T+18' ? `${MESES[Number(f.fecha.slice(5, 7)) - 1]} ${f.fecha.slice(0, 4)}` : fechaCorta(f.fecha)}`;
    if (f.tipo === 'head') return `HEAD · hoy ${fechaCorta(f.fecha)}`;
    if (f.tipo === 'gap') return '⋮';
    return `${f.rama}${f.standby ? ' · stand-by' : ''} · ${fechaCorta(f.fecha)}${f.estado === 'vencido' ? ' · vencido' : ''}`;
  };

  return (
    <main className="pantalla mapa-pag">
      <div className="topbar"><a className="volver" href="#/metas">Ruta</a><span className="mono sub">git log --graph</span></div>
      <header>
        <h1 className="titulo">{titulo}</h1>
        <p className="sub">{texto}</p>
      </header>
      <div className="segmentado" role="radiogroup" aria-label="Cuánto mirar">
        {RANGOS.map(([id, n]) => <button key={id} role="radio" aria-checked={rango === id} onClick={() => { setRango(id); setSel(null); }}>{n}</button>)}
      </div>

      <div className="mapa" style={{ ['--w' as string]: `${W + 14}px` }}>
        <svg ref={ref} className="mapa-svg" width={W + 8} height={H} viewBox={`0 0 ${W + 8} ${H}`} role="img"
          aria-label={`Mapa en ramas: ${filas.filter((f) => f.tipo !== 'gap').length} momentos, de ${etiqueta(filas[filas.length - 1])} a ${etiqueta(filas[0])}.${foco ? ' Handyx en stand-by.' : ''}`}>
          {/* main y las ramas: pasado lleno, desde HEAD hacia arriba punteado; en pausa, punteado y tenue */}
          <line x1={MAIN} x2={MAIN} y1={headY} y2={bottom} className="mp-linea" style={{ stroke: 'var(--tinta)' }} />
          <line x1={MAIN} x2={MAIN} y1={top} y2={headY} className="mp-linea futuro" style={{ stroke: 'var(--tinta)' }} />
          {COLUMNAS.map((r) => {
            const d = camino(r, bottom, top, curvaArriba, curvaAbajo);
            const yp = yPausa(r);
            const corte = yp == null ? 0 : yp;
            return (
              <g key={r} style={{ stroke: colorMapa(r), opacity: ramaF && r !== ramaF ? 0.28 : 1 }}>
                <clipPath id={`pas-${r}`}><rect x="0" y={Math.max(headY, corte)} width={W + 8} height={H} /></clipPath>
                <clipPath id={`fut-${r}`}><rect x="0" y={corte} width={W + 8} height={Math.max(0, headY - corte)} /></clipPath>
                <path d={d} className="mp-linea dibujo" clipPath={`url(#pas-${r})`} />
                <path d={d} className="mp-linea futuro" clipPath={`url(#fut-${r})`} />
                {yp != null && (
                  <>
                    <clipPath id={`sb-${r}`}><rect x="0" y="0" width={W + 8} height={yp} /></clipPath>
                    <path d={d} className="mp-linea standby" clipPath={`url(#sb-${r})`} />
                  </>
                )}
              </g>
            );
          })}
          {/* entregas entre ramas: curva S del color de la que entrega */}
          {filas.map((f, i) => (f.a && f.rama !== 'main' ? (
            <path key={`e-${f.id}`} d={`M${x(f.rama)},${cy(i)} C${x(f.rama)},${cy(i) - FILA * 0.5} ${x(f.a)},${cy(i) - FILA * 0.4} ${x(f.a)},${cy(i) - FILA * 0.85}`} className={`mp-linea${f.futuro ? ' futuro' : ''}`} style={{ stroke: colorMapa(f.rama), opacity: atenuada(f) ? 0.28 : 1 }} />
          ) : null))}
          {/* flechas de hitos: la rama que entrega llega a este hito desde abajo */}
          {filas.map((f, i) => (f.desde && f.rama !== 'main' ? (
            <path key={`d-${f.id}`} d={`M${x(f.desde)},${cy(i) + FILA * 0.8} C${x(f.desde)},${cy(i) + FILA * 0.35} ${x(f.rama)},${cy(i) + FILA * 0.45} ${x(f.rama)},${cy(i) + 7}`} className={`mp-linea flecha${f.futuro ? ' futuro' : ''}`} style={{ stroke: colorMapa(f.desde), opacity: atenuada(f) ? 0.28 : 1 }} />
          ) : null))}
          {/* commits, hitos grandes (rombo) y hitos de main */}
          {filas.map((f, i) => {
            if (f.tipo === 'gap') return null;
            const cx = x(f.rama);
            const c = f.rama === 'main' ? 'var(--tinta)' : colorMapa(f.rama);
            const cls = `mp-commit${sel === f.id ? ' sel' : ''}${f.futuro || f.estado === 'vencido' ? ' futuro' : ''}${f.standby ? ' standby' : ''}${f.estado === 'vencido' ? ' vencido' : ''}`;
            if (f.hitoTipo === 'grande') {
              const s = 13;
              return <rect key={f.id} x={cx - s / 2} y={cy(i) - s / 2} width={s} height={s} transform={`rotate(45 ${cx} ${cy(i)})`} className={`${cls} rombo`} style={{ ['--c' as string]: c, opacity: atenuada(f) ? 0.28 : 1 }} />;
            }
            const s = f.tipo === 'head' ? 14 : f.tipo === 'hito' ? 13 : 10;
            return (
              <g key={f.id}>
                {f.tipo === 'head' && <circle cx={cx} cy={cy(i)} r={15} className="mp-halo" />}
                <rect x={cx - s / 2} y={cy(i) - s / 2} width={s} height={s} rx={3} className={cls} style={{ ['--c' as string]: c, opacity: atenuada(f) ? 0.28 : 1 }} />
              </g>
            );
          })}
          {filas.map((f, i) => (sel === f.id && f.tipo !== 'gap' ? <circle key={`s-${f.id}`} cx={x(f.rama)} cy={cy(i)} r={12} className="mp-sel" style={{ ['--c' as string]: f.rama === 'main' ? 'var(--tinta)' : colorMapa(f.rama) }} /> : null))}
          {headI < 0 && <circle cx={MAIN} cy={bottom} r={15} className="mp-halo" />}
        </svg>
        <ol className="mapa-filas">
          {filas.map((f) => {
            const c = f.rama === 'main' ? 'var(--tinta)' : colorMapa(f.rama);
            const resaltar = f.tipo === 'head' || (f.hitoTipo === 'grande' && f.estado !== 'vencido');
            const cuerpo = (
              <>
                <span className="mono mf-et">{etiqueta(f)}{f.desde ? <span className="sub"> ← {RAMA_NOMBRE[f.desde].toLowerCase()}</span> : null}</span>
                <span className={resaltar ? 'mf-t resaltado' : 'mf-t'} style={resaltar ? { ['--c' as string]: f.tipo === 'head' ? 'var(--ing)' : c } : undefined}>{f.estado === 'hecho' ? '✓ ' : ''}{f.texto}</span>
              </>
            );
            return (
              <li key={f.id} className={`mf-${f.tipo}${f.standby ? ' standby' : ''}${f.estado === 'vencido' ? ' vencido' : ''}${sel === f.id ? ' sel' : ''}${atenuada(f) ? ' atenuada' : ''}`} style={{ ['--c' as string]: c }}>
                {f.tipo === 'gap' ? cuerpo : (
                  <button className="mf-boton" aria-pressed={sel === f.id} onClick={() => setSel(sel === f.id ? null : f.id)}>{cuerpo}</button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <section className="mapa-ley-caja" aria-label="Leyenda y filtro por rama">
        <span className="etiqueta">Ramas · tocá una para resaltarla</span>
        <div className="mapa-ley mono">
          <button type="button" aria-pressed={ramaF === null} onClick={() => setRamaF(null)} style={{ ['--c' as string]: 'var(--tinta)' }}><i />todas</button>
          {COLUMNAS.map((r) => (
            <button key={r} type="button" aria-pressed={ramaF === r} className={enPausa.has(r) ? 'standby' : undefined} onClick={() => setRamaF(ramaF === r ? null : r)} style={{ ['--c' as string]: colorMapa(r) }}>
              <i />{r}{enPausa.has(r) ? ' · stand-by' : ''}
            </button>
          ))}
        </div>
        <ul className="mapa-simbolos sub">
          <li><svg width="14" height="14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="3" className="mp-commit" style={{ ['--c' as string]: 'var(--tinta)' }} /></svg>commit: un paso de la rama</li>
          <li><svg width="16" height="16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" transform="rotate(45 8 8)" className="mp-commit" style={{ ['--c' as string]: 'var(--tinta)' }} /></svg>rombo: un hito grande</li>
          <li><svg width="14" height="14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="3" className="mp-commit" style={{ ['--c' as string]: 'var(--tinta)' }} /></svg>T+0, T+2…: hitos de main</li>
          <li><svg width="22" height="8" aria-hidden="true"><line x1="1" x2="21" y1="4" y2="4" className="mp-linea" style={{ stroke: 'var(--tinta)' }} /></svg>trazo lleno: ya pasó o está hecho</li>
          <li><svg width="22" height="8" aria-hidden="true"><line x1="1" x2="21" y1="4" y2="4" className="mp-linea futuro" style={{ stroke: 'var(--tinta)' }} /></svg>punteado: lo que viene</li>
        </ul>
      </section>
      {foco && <p className="sub nota-izq"><a className="subrayado" href="#/metas/impacto">Qué cambia en la ruta →</a> · <a className="subrayado" href="#/metas/sprint">El sprint de búsqueda →</a></p>}
      {fSel && fSel.tipo !== 'gap' && (
        <aside className="mapa-detalle" style={{ ['--c' as string]: fSel.rama === 'main' ? 'var(--tinta)' : colorMapa(fSel.rama) }} aria-live="polite">
          <div className="md-cab">
            <span className="mono md-et">{etiqueta(fSel)}</span>
            <button type="button" className="md-x" aria-label="Cerrar detalle" onClick={() => setSel(null)}>×</button>
          </div>
          <b className="md-t">{fSel.texto}</b>
          <span className="mono sub md-meta">
            {fSel.rama === 'clipping' ? 'Clipping' : RAMA_NOMBRE[fSel.rama]}
            {fSel.desde ? ` · entrega ${RAMA_NOMBRE[fSel.desde].toLowerCase()}` : ''}
            {fSel.estado === 'hecho' ? ' · hecho' : fSel.estado === 'vencido' ? ' · vencido' : fSel.tipo === 'head' ? ' · hoy' : fSel.futuro ? ' · por venir' : ''}
            {fSel.original && fSel.original !== fSel.fecha ? ` · planeado para el ${fechaCorta(fSel.original)}` : ''}
            {fSel.standby ? ' · rama en stand-by' : ''}
          </span>
          {fSel.hitoId && (
            <div className="md-acc">
              <button type="button" className={fSel.estado === 'hecho' ? 'btn-borde' : 'btn-principal'} onClick={() => marcarHito(fSel.hitoId!, fSel.estado === 'hecho' ? null : day.date)}>
                {fSel.estado === 'hecho' ? 'Desmarcar' : 'Marcar hecho'}
              </button>
              {fSel.estado === 'vencido' && fSel.propuesta && (
                <button type="button" className="btn-borde" onClick={() => moverHito(fSel.hitoId!, fSel.propuesta!)}>Mover al {fechaCorta(fSel.propuesta)}</button>
              )}
            </div>
          )}
        </aside>
      )}
      <TablaSR caption="Mapa en ramas, de lo más nuevo a lo más viejo" head={['Cuándo', 'Rama', 'Qué']} rows={filas.filter((f) => f.tipo !== 'gap').map((f) => [etiqueta(f), f.rama, f.texto])} />
    </main>
  );
}
