/**
 * Trazo 2.0 · el análisis de puntos débiles (#/flojo/analisis): el mapa de fortaleza por capítulo, cómo fallás, el recall semana a
 * semana y cuánto creías recordar contra cuánto recordaste. Los mismos datos que la 1.0 (data/debiles), dibujados con el kit.
 * La fuerza no se dice solo con color: una celda floja va invertida, una fuerte lleva el trazo, y todas llevan su número.
 */
import { AREAS } from '../../data/defaults';
import { BIEN, ERR_CONSEJO, ERR_NOMBRE, ERR_ORDEN, FLOJO, banda, calibration, errorTypes, mapa, recallSemanal } from '../../data/debiles';
import { useStore } from '../../state/store';
import { caminoSuave } from '../entreno/Curva';
import { colorV2 } from '../hoy/datos';
import { Boton } from '../kit/controles';
import { Barra, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { cuantos } from '../reglas';
import './estudio.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Dónde estás fuerte, dónde flojo y cómo fallás.</p>
    <p className="t-cuerpo">El mapa cruza cada capítulo con sus cuatro fuentes: cold recall, tarjetas, test y el ejercicio del día 8. Menos de {FLOJO} % es flojo (celda invertida); {BIEN} % o más es fuerte (con el trazo).</p>
    <p className="t-cuerpo">La calibración compara lo que creías recordar antes de un cold recall con lo que recordaste. Si creés más de lo que recordás, la sensación de saber te engaña: seguí con el test.</p>
  </>
);
const W = 320;
const H = 132;
const TECHO = 8;
const PISO = 108;
const MINIMO = 40;

/** Una celda del mapa: el número, y la banda como forma (no solo color). */
function Celda({ v, texto, que }: { v: number | null | undefined; texto?: string; que: string }) {
  if (v == null) return <span role="cell" className="es-mc es-mc-vacia" aria-label={`${que}: sin datos`}>–</span>;
  const b = banda(v);
  return <span role="cell" className={`es-mc es-mc-${b}`} aria-label={`${que}: ${texto ?? `${v} %`}${b === 'mal' ? ', flojo' : b === 'bien' ? ', fuerte' : ''}`}>{texto ?? v}</span>;
}

export function AnalisisFlojo({ day }: { day: PropsV2['day'] }) {
  const st = useStore((s) => s.study);
  const a = st.activities.find((x) => x.id === 'conamat') ?? st.activities.find((x) => x.units?.length);
  const filas = a ? mapa(st, a) : [];
  const e = errorTypes(st);
  const { semanas, series } = recallSemanal(st, day.date);
  const cal = calibration(st.attempts, st.fronts);
  const peor = [...cal].sort((p, q) => q.diff - p.diff)[0];
  const vacio = !filas.length && !e.total && !series.length && !cal.length;
  const x = (i: number) => 6 + (i / Math.max(1, semanas.length - 1)) * (W - 12);
  const y = (v: number) => PISO - ((Math.max(MINIMO, v) - MINIMO) / (100 - MINIMO)) * (PISO - TECHO);

  return (
    <Marco className="es" titulo="Análisis" volver={{ href: '#/flojo', nombre: 'Puntos débiles' }} info={INFO}>
      {vacio ? (
        <Vacio ilustracion="datos" titulo="Todavía no hay nada que analizar" texto="El mapa se arma con tu primer capítulo: un cold recall, sus tarjetas y su test."
          accion={<Boton variante="primario" icono="estudio" href="#/estudio">Ir a Estudio</Boton>} />
      ) : (
        <>
          <Grupo titulo="Mapa de fortaleza" extremo={a ? <span className="t-rotulo">{a.title.split(' · ')[0]}</span> : undefined}>
            {filas.length === 0 ? <div className="capa-1"><Vacio compacto ilustracion="estudio" titulo="Sin capítulos todavía" texto="Aparece con el primero que estudies." accion={<Boton tamano="s" variante="secundario" href="#/estudio">Estudiar</Boton>} /></div> : (
              <div className="capa-1 es-mapa" role="table" aria-label="Fortaleza por capítulo" data-grafico>
                <div role="row" className="es-mapa-fila es-mapa-cab">
                  <span role="columnheader" className="v2-oculto">Capítulo</span><span aria-hidden="true" />
                  {['Recall', 'Tarj.', 'Test', 'Día 8'].map((c) => <span key={c} role="columnheader" className="t-rotulo">{c}</span>)}
                </div>
                {filas.map((f) => (
                  <div role="row" key={f.n} className="es-mapa-fila">
                    {/* El enlace va adentro de la celda del nombre (un rol de fila no se anuncia como enlace); su área cubre la fila entera. */}
                    <span role="rowheader" className="t-nota"><a className="es-mapa-enlace" href={`#/flojo/${encodeURIComponent(`${a!.id}:${f.n}`)}`}><b className="t-dato">{String(f.n).padStart(2, '0')}</b> {f.titulo}</a></span>
                    <Celda que="cold recall" v={f.cold} />
                    <Celda que="tarjetas" v={f.tarjetas} />
                    <Celda que="test" v={f.test} />
                    <Celda que="ejercicio del día 8" v={f.d8 ? Math.round((f.d8[0] / f.d8[1]) * 100) : null} texto={f.d8 ? `${f.d8[0]}/${f.d8[1]}` : undefined} />
                  </div>
                ))}
                <p className="es-mapa-leyenda" aria-hidden="true"><i className="es-mc es-mc-mal" />menos de {FLOJO}<i className="es-mc es-mc-medio" />{FLOJO} a {BIEN - 1}<i className="es-mc es-mc-bien" />{BIEN} o más</p>
              </div>
            )}
          </Grupo>

          <Grupo titulo="Cómo fallás" extremo={e.total ? <span className="t-rotulo">{cuantos(e.total, 'error', 'errores')} en {cuantos(e.tests, 'test', 'tests')}</span> : undefined}>
            {!e.total ? <div className="capa-1"><Vacio compacto ilustracion="escribir" titulo="Sin errores cargados" texto="Se anotan al corregir cada test." accion={<Boton tamano="s" variante="secundario" href="#/flojo/examenes">Ver los tests</Boton>} /></div> : (
              <ul className="capa-1 es-fallas">
                {ERR_ORDEN.map((k) => (
                  <li key={k}>
                    <span className="es-falla-cab"><b className="t-cuerpo">{ERR_NOMBRE[k]}</b><span className="t-dato">{e.by[k]} · {Math.round((e.by[k] / e.total) * 100)} %</span></span>
                    <Barra valor={e.by[k]} max={e.total} nombre={`${ERR_NOMBRE[k]}: ${e.by[k]} de ${e.total} errores`} area="var(--texto-2)" />
                    <small className="t-nota">{ERR_CONSEJO[k]}</small>
                  </li>
                ))}
              </ul>
            )}
          </Grupo>

          <Grupo titulo="Recall por semana" extremo={<span className="t-rotulo">Tope {BIEN} %</span>}>
            {!series.length ? <div className="capa-1"><Vacio compacto ilustracion="datos" titulo="Sin cold recalls todavía" texto="Con el primero empieza la curva." accion={<Boton tamano="s" variante="secundario" href="#/repaso">Ir a Repasar</Boton>} /></div> : (
              <figure className="capa-1 es-recall" role="img" data-grafico
                aria-label={`Cold recall por semana, de 0 a 100: ${series.map((s) => `${s.front.name} ${s.valores.map((v) => (v == null ? 'sin datos' : `${v} %`)).join(', ')}`).join('; ')}. Tope: ${BIEN} %.`}>
                <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
                  {[55, 70, 100].map((g) => <line key={g} className="es-recall-grilla" x1={6} x2={W - 6} y1={y(g)} y2={y(g)} />)}
                  <line className="es-recall-tope" x1={6} x2={W - 6} y1={y(BIEN)} y2={y(BIEN)} />
                  {series.map((s) => {
                    const pts = s.valores.flatMap((v, i) => (v == null ? [] : [[x(i), y(v)] as [number, number]]));
                    return (
                      <g key={s.front.id} style={{ ['--area' as string]: colorV2(AREAS[s.front.color].css) }}>
                        {pts.length > 1 && <path className="es-recall-linea" d={caminoSuave(pts)} pathLength={1} />}
                        {pts.map((p, i) => <circle key={i} className="es-recall-punto" cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.6 : 2.4} />)}
                      </g>
                    );
                  })}
                  {semanas.map((_, i) => <text key={i} className="es-recall-eje" x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === semanas.length - 1 ? 'end' : 'middle'}>{i === semanas.length - 1 ? 'esta' : `S${i + 1}`}</text>)}
                </svg>
                <figcaption className="es-recall-leyenda">
                  {series.map((s) => <span key={s.front.id} style={{ ['--area' as string]: colorV2(AREAS[s.front.color].css) }}><i className="area-punto" />{s.front.name} <b className="t-dato">{s.valores.filter((v) => v != null).at(-1)} %</b></span>)}
                </figcaption>
              </figure>
            )}
          </Grupo>

          <Grupo titulo="Calibración" extremo={cal.length ? <span className="t-rotulo">Creías · recordaste</span> : undefined}>
            {!cal.length ? <div className="capa-1"><Vacio compacto ilustracion="metas" titulo="Sin calibrar todavía" texto="Antes de comparar un cold recall, decí cuánto creés que recordaste." accion={<Boton tamano="s" variante="secundario" href="#/repaso">Ir a Repasar</Boton>} /></div> : (
              <>
                <ul className="capa-1 es-calib">
                  {cal.map((c) => (
                    <li key={c.front.id}>
                      <span className="es-falla-cab"><b className="t-cuerpo">{c.front.name}</b><span className="t-dato">{c.creia} · {c.recordo} %</span></span>
                      <Barra valor={c.creia} max={100} nombre={`${c.front.name}: creías ${c.creia} %`} area="var(--texto-3)" />
                      <Barra valor={c.recordo} max={100} nombre={`${c.front.name}: recordaste ${c.recordo} %`} area={colorV2(AREAS[c.front.color].css)} />
                    </li>
                  ))}
                </ul>
                <p className="t-nota pt-pie">{peor && peor.diff > 0 ? `En ${peor.front.name} creés ${cuantos(peor.diff, 'punto', 'puntos')} más de lo que recordás: seguí con el test.` : 'Por ahora te calibrás bien.'}</p>
              </>
            )}
          </Grupo>
        </>
      )}
    </Marco>
  );
}
