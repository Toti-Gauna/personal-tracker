/**
 * Trazo 2.0 · el mapa por ramas (#/metas/mapa): el historial del plan como un `git log --graph`. Las ramas salen de main en T+0, suben
 * por su columna y vuelven en T+18; lo hecho va en trazo lleno y lo que viene, punteado. Con una rama en pausa se dibuja punteada y
 * tenue desde ahí. Tocar un momento abre su hoja: marcarlo hecho o moverlo de fecha (los hitos). Mismos datos que la 1.0.
 */
import { useState } from 'react';
import type { RamaMapa } from '../../data/hitos';
import { COLUMNAS, filasMapa, type Fila as FilaMapa, type Rango } from '../../data/mapa';
import { PLAN, fechaCorta, fechaHito } from '../../data/plan';
import { RAMA_NOMBRE } from '../../data/ramas';
import { marcarHito, moverHito } from '../../state/plan';
import { getState, useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, Chip, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { colorRama } from './datos';
import './metas.css';

const FILA = 58;
const MAIN = 16;
/** 7 columnas (con el clipping): el paso entre ramas es de 17 px. */
const PASO = 17;
const x = (r: RamaMapa | 'main') => (r === 'main' ? MAIN : MAIN + PASO * (COLUMNAS.indexOf(r) + 1));
const RANGOS: [Rango, string][] = [['mes', 'Este mes'], ['trimestre', 'Trimestre'], ['todo', '18 meses']];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const nombre = (r: RamaMapa | 'main') => (r === 'clipping' ? 'Clipping' : RAMA_NOMBRE[r as keyof typeof RAMA_NOMBRE]);
const color = (r: RamaMapa | 'main') => (r === 'main' ? 'var(--texto)' : colorRama(r));

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

export default function MapaV2({ day }: PropsV2) {
  const [rango, setRango] = useState<Rango>('mes');
  const [sel, setSel] = useState<string | null>(null);
  const [ramaF, setRamaF] = useState<RamaMapa | null>(null);
  const plan = useStore((s) => s.plan);
  const study = useStore((s) => s.study);
  const t0 = useStore((s) => s.settings?.startDate);
  const filas = filasMapa(day.date, rango, plan, study, t0);
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
  const t18 = fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!, t0);
  const fSel = filas.find((f) => f.id === sel);
  /** Con una rama elegida, lo que no es de ella (ni entrega ni recibe de ella) se atenúa. */
  const atenuada = (f: FilaMapa) => ramaF != null && f.tipo !== 'gap' && f.tipo !== 'head' && f.rama !== ramaF && f.desde !== ramaF && f.a !== ramaF && f.rama !== 'main';
  const etiqueta = (f: FilaMapa) => {
    if (f.tipo === 'hito') return `${f.hito} · ${f.hito === 'T+18' ? `${MESES[Number(f.fecha.slice(5, 7)) - 1]} ${f.fecha.slice(0, 4)}` : fechaCorta(f.fecha)}`;
    if (f.tipo === 'head') return `HEAD · hoy ${fechaCorta(f.fecha)}`;
    if (f.tipo === 'gap') return '⋮';
    return `${nombre(f.rama)}${f.standby ? ' · stand-by' : ''} · ${fechaCorta(f.fecha)}${f.estado === 'vencido' ? ' · vencido' : ''}`;
  };
  const desdeTxt = pausas[0] ? fechaCorta(pausas[0].desde) : '';
  const info = (
    <>
      <p className="t-cuerpo-l">{rango === 'trimestre' ? 'Los hitos de cada rama del trimestre.' : 'Las ramas salen de main y vuelven a juntarse en T+18.'}</p>
      <p className="t-cuerpo">{rango === 'trimestre'
        ? `El rombo marca un hito grande: cierra un proyecto, un libro o una etapa.${foco ? ' Handyx y Eclipse en stand-by; clipping tiene su propia rama.' : ''} Tocá un hito para marcarlo hecho.`
        : foco ? `Handyx y Eclipse quedan en stand-by desde el ${desdeTxt}. Las otras ramas van a fondo hasta que entre el trabajo.`
          : `Salen de main el ${fechaCorta(filas[filas.length - 1].fecha)} y vuelven en T+18 (${fechaCorta(t18)} ${t18.slice(0, 4)}).`}</p>
      <ul className="mt-simbolos t-cuerpo">
        <li><svg width="14" height="14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="3" className="mt-mp-commit" style={{ ['--c' as string]: 'var(--texto)' }} /></svg>Commit: un paso de la rama.</li>
        <li><svg width="16" height="16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" transform="rotate(45 8 8)" className="mt-mp-commit" style={{ ['--c' as string]: 'var(--texto)' }} /></svg>Rombo: un hito grande.</li>
        <li><svg width="22" height="8" aria-hidden="true"><line x1="1" x2="21" y1="4" y2="4" className="mt-mp-linea" style={{ stroke: 'var(--texto)' }} /></svg>Trazo lleno: ya pasó o está hecho.</li>
        <li><svg width="22" height="8" aria-hidden="true"><line x1="1" x2="21" y1="4" y2="4" className="mt-mp-linea futuro" style={{ stroke: 'var(--texto)' }} /></svg>Punteado: lo que viene.</li>
      </ul>
    </>
  );
  const marcar = (f: FilaMapa) => {
    const hecho = f.estado === 'hecho';
    const antes = getState().plan.hitos?.[f.hitoId!]?.hecho ?? null;
    marcarHito(f.hitoId!, hecho ? null : day.date);
    aviso({ titulo: hecho ? 'Hito sin marcar' : 'Hito hecho', sub: f.texto, tono: hecho ? 'info' : 'hecho', deshacer: () => marcarHito(f.hitoId!, antes) });
    setSel(null);
  };

  return (
    <Marco className="mt" titulo="Mapa por ramas" rotulo={foco ? `Handyx en stand-by desde el ${desdeTxt}` : undefined} volver={{ href: '#/metas', nombre: 'Plan' }} info={info}>
      <Segmentado etiqueta="Cuánto mirar" valor={rango} opciones={RANGOS} onCambio={(r) => { setRango(r); setSel(null); }} />

      <div className="mt-ramas-filtro" role="group" aria-label="Resaltar una rama">
        <Chip activo={ramaF === null} onCambio={() => setRamaF(null)}>Todas</Chip>
        {COLUMNAS.map((r) => <Chip key={r} activo={ramaF === r} area={color(r)} onCambio={() => setRamaF(ramaF === r ? null : r)}>{nombre(r)}{enPausa.has(r) ? ' · stand-by' : ''}</Chip>)}
      </div>

      <div className="mt-mapa" data-grafico style={{ ['--w' as string]: `${W + 14}px` }}>
        <svg className="mt-mapa-svg" width={W + 8} height={H} viewBox={`0 0 ${W + 8} ${H}`} role="img"
          aria-label={`Mapa en ramas: ${filas.filter((f) => f.tipo !== 'gap').length} momentos, de ${etiqueta(filas[filas.length - 1])} a ${etiqueta(filas[0])}.${foco ? ' Handyx en stand-by.' : ''}`}>
          {/* main y las ramas: pasado lleno, desde HEAD hacia arriba punteado; en pausa, punteado y tenue */}
          <line x1={MAIN} x2={MAIN} y1={headY} y2={bottom} className="mt-mp-linea" style={{ stroke: 'var(--texto)' }} />
          <line x1={MAIN} x2={MAIN} y1={top} y2={headY} className="mt-mp-linea futuro" style={{ stroke: 'var(--texto)' }} />
          {COLUMNAS.map((r) => {
            const d = camino(r, bottom, top, curvaArriba, curvaAbajo);
            const yp = yPausa(r);
            const corte = yp == null ? 0 : yp;
            return (
              <g key={r} style={{ stroke: color(r), opacity: ramaF && r !== ramaF ? 0.28 : 1 }}>
                <clipPath id={`mt-pas-${r}`}><rect x="0" y={Math.max(headY, corte)} width={W + 8} height={H} /></clipPath>
                <clipPath id={`mt-fut-${r}`}><rect x="0" y={corte} width={W + 8} height={Math.max(0, headY - corte)} /></clipPath>
                <path d={d} className="mt-mp-linea" clipPath={`url(#mt-pas-${r})`} />
                <path d={d} className="mt-mp-linea futuro" clipPath={`url(#mt-fut-${r})`} />
                {yp != null && (
                  <>
                    <clipPath id={`mt-sb-${r}`}><rect x="0" y="0" width={W + 8} height={yp} /></clipPath>
                    <path d={d} className="mt-mp-linea standby" clipPath={`url(#mt-sb-${r})`} />
                  </>
                )}
              </g>
            );
          })}
          {/* entregas entre ramas: curva S del color de la que entrega */}
          {filas.map((f, i) => (f.a && f.rama !== 'main' ? (
            <path key={`e-${f.id}`} d={`M${x(f.rama)},${cy(i)} C${x(f.rama)},${cy(i) - FILA * 0.5} ${x(f.a)},${cy(i) - FILA * 0.4} ${x(f.a)},${cy(i) - FILA * 0.85}`} className={`mt-mp-linea${f.futuro ? ' futuro' : ''}`} style={{ stroke: color(f.rama), opacity: atenuada(f) ? 0.28 : 1 }} />
          ) : null))}
          {/* flechas de hitos: la rama que entrega llega a este hito desde abajo */}
          {filas.map((f, i) => (f.desde && f.rama !== 'main' ? (
            <path key={`d-${f.id}`} d={`M${x(f.desde)},${cy(i) + FILA * 0.8} C${x(f.desde)},${cy(i) + FILA * 0.35} ${x(f.rama)},${cy(i) + FILA * 0.45} ${x(f.rama)},${cy(i) + 7}`} className={`mt-mp-linea flecha${f.futuro ? ' futuro' : ''}`} style={{ stroke: color(f.desde), opacity: atenuada(f) ? 0.28 : 1 }} />
          ) : null))}
          {/* commits, hitos grandes (rombo) y hitos de main */}
          {filas.map((f, i) => {
            if (f.tipo === 'gap') return null;
            const cx = x(f.rama);
            const c = color(f.rama);
            const cls = `mt-mp-commit${sel === f.id ? ' sel' : ''}${f.tipo === 'head' ? ' head' : ''}${f.futuro || f.estado === 'vencido' ? ' futuro' : ''}${f.standby ? ' standby' : ''}${f.estado === 'vencido' ? ' vencido' : ''}`;
            if (f.hitoTipo === 'grande') {
              const s = 13;
              return <rect key={f.id} x={cx - s / 2} y={cy(i) - s / 2} width={s} height={s} transform={`rotate(45 ${cx} ${cy(i)})`} className={`${cls} rombo`} style={{ ['--c' as string]: c, opacity: atenuada(f) ? 0.28 : 1 }} />;
            }
            const s = f.tipo === 'head' ? 14 : f.tipo === 'hito' ? 13 : 10;
            return (
              <g key={f.id}>
                {f.tipo === 'head' && <circle cx={cx} cy={cy(i)} r={15} className="mt-mp-halo" />}
                <rect x={cx - s / 2} y={cy(i) - s / 2} width={s} height={s} rx={3} className={cls} style={{ ['--c' as string]: c, opacity: atenuada(f) ? 0.28 : 1 }} />
              </g>
            );
          })}
          {filas.map((f, i) => (sel === f.id && f.tipo !== 'gap' ? <circle key={`s-${f.id}`} cx={x(f.rama)} cy={cy(i)} r={12} className="mt-mp-sel" style={{ ['--c' as string]: color(f.rama) }} /> : null))}
          {headI < 0 && <circle cx={MAIN} cy={bottom} r={15} className="mt-mp-halo" />}
        </svg>
        <ol className="mt-mapa-filas">
          {filas.map((f) => {
            const grande = f.tipo === 'head' || (f.hitoTipo === 'grande' && f.estado !== 'vencido');
            const cuerpo = (
              <>
                <span className="t-rotulo mt-mf-et">{etiqueta(f)}{f.desde ? <span> ← {RAMA_NOMBRE[f.desde].toLowerCase()}</span> : null}</span>
                <span className={`mt-mf-t${grande ? ' grande' : ''}`}>{f.estado === 'hecho' ? '✓ ' : ''}{f.texto}</span>
              </>
            );
            return (
              <li key={f.id} className={`${f.tipo}${f.standby ? ' standby' : ''}${f.estado === 'vencido' ? ' vencido' : ''}${sel === f.id ? ' sel' : ''}${atenuada(f) ? ' atenuada' : ''}`} style={{ ['--c' as string]: color(f.rama) }}>
                {f.tipo === 'gap' ? cuerpo : <button type="button" className="mt-mf-boton" aria-haspopup="dialog" onClick={() => setSel(f.id)}>{cuerpo}</button>}
              </li>
            );
          })}
        </ol>
      </div>

      {foco && (
        <Grupo titulo="Con el foco puesto">
          <div className="capa-1 s-lista">
            <Fila icono="ritmo" titulo="Qué cambia en la ruta" href="#/metas/impacto" />
            <Fila icono="cohete" titulo="El sprint de búsqueda" href="#/metas/sprint" />
          </div>
        </Grupo>
      )}

      <Hoja abierta={!!fSel && fSel.tipo !== 'gap'} onCerrar={() => setSel(null)} titulo={fSel && fSel.tipo !== 'gap' ? etiqueta(fSel) : ''}
        pie={fSel?.hitoId ? <>
          <Boton variante="primario" icono="tilde" onClick={() => marcar(fSel)}>{fSel.estado === 'hecho' ? 'Desmarcar' : 'Marcar hecho'}</Boton>
          {fSel.estado === 'vencido' && fSel.propuesta && <Boton variante="secundario" icono="calendario" onClick={() => { moverHito(fSel.hitoId!, fSel.propuesta!); aviso({ titulo: 'Hito movido', sub: `Al ${fechaCorta(fSel.propuesta!)}`, tono: 'hecho' }); setSel(null); }}>Mover al {fechaCorta(fSel.propuesta)}</Boton>}
        </> : undefined}>
        {fSel && fSel.tipo !== 'gap' && (
          <div className="mt-hoja">
            <p className="t-encabezado">{fSel.texto}</p>
            <p className="t-nota">
              {nombre(fSel.rama)}
              {fSel.desde ? ` · entrega ${RAMA_NOMBRE[fSel.desde].toLowerCase()}` : ''}
              {fSel.estado === 'hecho' ? ' · hecho' : fSel.estado === 'vencido' ? ' · vencido' : fSel.tipo === 'head' ? ' · hoy' : fSel.futuro ? ' · por venir' : ''}
              {fSel.original && fSel.original !== fSel.fecha ? ` · planeado para el ${fechaCorta(fSel.original)}` : ''}
              {fSel.standby ? ' · rama en stand-by' : ''}
            </p>
          </div>
        )}
      </Hoja>
    </Marco>
  );
}
