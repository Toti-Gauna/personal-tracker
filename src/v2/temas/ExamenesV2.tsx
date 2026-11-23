/**
 * Trazo 2.0 · Exámenes (#/flojo/examenes): cuán listo estás para el examen final, cómo te va en los tests (puntaje y errores por
 * capítulo), lo que fallás seguido, los re-tests pendientes y el simulacro dirigido. Mismos datos que la 1.0; el gráfico de errores
 * pasa a una grilla de números (tipo por capítulo) que no depende del color.
 */
import { BANDA_COLOR, ERR_NOMBRE, ERR_ORDEN, banda, examenes, qFalla, repetidos, simulacro } from '../../data/debiles';
import { ir } from '../../lib/routes';
import { useStore } from '../../state/store';
import { colorV2 } from '../hoy/datos';
import { Boton, Segmentado } from '../kit/controles';
import { Anillo, Barra, Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { fch, lista, useListo } from './datos';
import '../estudio/estudio.css';
import './temas.css';

const FILTROS: ['' | 'recall' | 'examenes', string][] = [['', 'Todo'], ['recall', 'Recall'], ['examenes', 'Exámenes']];

export default function ExamenesV2({ day }: PropsV2) {
  const st = useStore((s) => s.study);
  const { a, f, listo, faltan, sinEstudiar, dias } = useListo(st);
  const ex = a ? examenes(st, a) : null;
  const rep = repetidos(st);
  const sim = a?.units ? simulacro(f).sort((x, y) => y.n - x.n || (x.fuerza ?? 101) - (y.fuerza ?? 101)) : [];
  const top = sim.filter((x) => x.fuerza != null).slice(0, 5);
  const resto = sim.filter((x) => !top.includes(x)).reduce((t, x) => t + x.n, 0);
  const maxSim = Math.max(1, ...sim.map((x) => x.n), resto);
  const nombreCap = (n: number) => { const u = a!.units!.find((x) => x.n === n)!; return u.corto ?? u.title; };
  const final = a?.final?.title;
  return (
    <Marco className="tm" titulo="Exámenes" volver={{ href: '#/flojo', nombre: 'Puntos débiles' }}
      info={(
        <>
          <p className="t-cuerpo-l">Cómo te va en los tests y qué te falta para el {final?.toLowerCase() ?? 'examen final'}.</p>
          <p className="t-cuerpo">"Listo" promedia la fuerza de cada capítulo, con más peso en los que tienen más ejercicios en el examen. Lo que no estudiaste cuenta cero.</p>
          <p className="t-cuerpo">El simulacro arma el examen de 40 ejercicios con más de lo flojo y menos de lo que ya dominás. Se aprueba con 85 %.</p>
        </>
      )}>
      <div className="tm-filtro">
        <Segmentado etiqueta="Qué mirar" opciones={FILTROS} valor="examenes" onCambio={(v) => ir(v ? `flojo/${v}` : 'flojo')} />
      </div>

      {a?.final && (
        <Tarjeta heroe area="var(--a-economia)" className="tm-listo">
          <Anillo valor={listo / 100} tamano={88} grosor={9} etiqueta={String(listo)} sub="listo" area={colorV2(BANDA_COLOR[banda(listo)])} nombre="Listo para el examen final" />
          <div className="tm-listo-texto">
            <b className="t-encabezado">{a.final.title}</b>
            {faltan.length > 0 && <span className="t-nota">Te faltan {lista(faltan).replace(/\.$/, '')}.</span>}
            {sinEstudiar > 0 && <span className="t-nota">{sinEstudiar === 1 ? 'Queda 1 capítulo' : `Quedan ${sinEstudiar} capítulos`} por estudiar.</span>}
            <span className="t-dato t-nota">{dias ? `Recomendado: en ${dias} días` : 'Recomendado: cuando quieras'}</span>
          </div>
        </Tarjeta>
      )}

      {ex && ex.filas.length > 0 && (
        <div className="tm-datos tres">
          <Dato valor={ex.prom == null ? '—' : `${ex.prom} %`} etiqueta="Promedio de tests" />
          <Dato valor={`${ex.primero} de ${ex.filas.length}`} etiqueta="Al primer intento" />
          <Dato valor={ex.retests.length} etiqueta={ex.retests.length === 1 ? 'Re-test pendiente' : 'Re-tests pendientes'} />
        </div>
      )}

      {!ex || !ex.filas.length ? (
        <Vacio ilustracion="datos" titulo="Todavía no hay tests" texto="Cada test que cargues arma el puntaje, los errores y el simulacro."
          accion={a ? <Boton variante="secundario" href={`#/estudio/mate/libro/${a.id}`}>Ir a {a.title.split(' · ').pop()}</Boton> : <Boton variante="secundario" href="#/estudio">Ir a Estudio</Boton>} />
      ) : (
        <>
          <Grupo titulo="Puntaje de cada test" extremo={<span className="t-rotulo">Corte {ex.corte} %</span>}>
            <div className="capa-1 tm-grafico" data-grafico>
              <figure className="tm-barras" style={{ ['--corte' as string]: ex.corte / 100 }} role="img"
                aria-label={`Puntaje del último test de cada capítulo: ${ex.filas.map((x) => `cap. ${x.n} ${Math.round((x.t.score / x.t.total) * 100)} %${x.t.approved ? ', aprobado' : ''}`).join('; ')}; corte ${ex.corte} %`}>
                <i className="tm-corte" aria-hidden="true" />
                {ex.filas.map((x) => {
                  const v = Math.round((x.t.score / x.t.total) * 100);
                  return (
                    <span key={x.n} className={`tm-barra${x.t.approved ? ' ok' : ''}`}>
                      <span className="t-dato">{v}</span>
                      <span className="tm-col"><span style={{ height: `${v}%` }} /></span>
                      <span className="t-rotulo">C{x.n}</span>
                    </span>
                  );
                })}
              </figure>
            </div>
            <p className="t-nota tm-leyenda">Amarillo: aprobado. La línea punteada es el corte.</p>
          </Grupo>

          <Grupo titulo="Errores por tipo" extremo={<span className="t-rotulo">Por test</span>}>
            <div className="capa-1 tm-grafico tm-scroll" data-grafico>
              <table className="tm-errores">
                <caption className="tm-sr">Cantidad de errores de cada tipo en el último test de cada capítulo</caption>
                <thead><tr><th scope="col"><span className="tm-sr">Tipo</span></th>{ex.filas.map((x) => <th scope="col" key={x.n}>C{x.n}</th>)}</tr></thead>
                <tbody>
                  {ERR_ORDEN.map((k) => (
                    <tr key={k}>
                      <th scope="row">{ERR_NOMBRE[k]}</th>
                      {ex.filas.map((x) => <td key={x.n} style={{ ['--i' as string]: `${Math.round(Math.min(1, x.t.errors[k] / 4) * 44)}%` }}>{x.t.errors[k] || '·'}</td>)}
                    </tr>
                  ))}
                  <tr className="total">
                    <th scope="row">Total</th>
                    {ex.filas.map((x) => <td key={x.n}>{ERR_ORDEN.reduce((s, k) => s + x.t.errors[k], 0)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Grupo>

          <Grupo titulo="Lo que fallás seguido" extremo={<span className="t-rotulo">Se repite</span>}>
            <div className="capa-1 s-lista">
              {rep.length
                ? rep.slice(0, 5).map((x) => <Fila key={x.tema} titulo={x.tema} nota={`${x.caps.length > 1 ? `caps. ${x.caps.slice(0, -1).join(', ')} y ${x.caps.at(-1)}` : `cap. ${x.caps[0]}`} · ${ERR_NOMBRE[x.tipo].toLowerCase()}`} valor={`×${x.n}`} />)
                : <Fila titulo="Nada se repite todavía" nota="Aparece si fallás lo mismo en 2 tests en papel." />}
            </div>
          </Grupo>

          {ex.retests.length > 0 && (
            <Grupo titulo={ex.retests.length === 1 ? 'Re-test pendiente' : 'Re-tests pendientes'}>
              <div className="capa-1 s-lista">
                {ex.retests.map((r) => {
                  const fila = ex.filas.find((x) => x.n === r.unit);
                  return <Fila key={r.id} icono="repaso" titulo={`Cap. ${r.unit}`}
                    nota={fila ? `Sacaste ${Math.round((fila.t.score / fila.t.total) * 100)} %. Releé ${qFalla(st, `${a!.id}:${r.unit}`)} y repetí el test ${r.due <= day.date ? 'hoy' : `el ${fch(r.due)}`}.` : undefined}
                    valor={r.due <= day.date ? 'hoy' : fch(r.due)} href={`#/estudio/mate/libro/${a!.id}/${r.unit}`} />;
                })}
              </div>
            </Grupo>
          )}
        </>
      )}

      {a?.units && sim.length > 0 && (
        <Grupo titulo="Simulacro dirigido" extremo={<span className="t-rotulo">40 ejercicios · 90 min</span>}>
          <ul className="capa-1 tm-simul">
            {top.map((x) => (
              <li key={x.unit}><span className="t-cuerpo">{nombreCap(x.unit)}</span><Barra valor={x.n} max={maxSim * 1.3} nombre={`${nombreCap(x.unit)}: ${x.n} ejercicios`} /><span className="t-dato">{x.n}</span></li>
            ))}
            {resto > 0 && <li><span className="t-cuerpo">El resto</span><Barra valor={resto} max={maxSim * 1.3} nombre={`El resto: ${resto} ejercicios`} /><span className="t-dato">{resto}</span></li>}
          </ul>
          <div className="pt-acciones"><Boton variante="primario" ancho icono="documento" href="#/flojo/simulacro">Armar simulacro</Boton></div>
        </Grupo>
      )}
    </Marco>
  );
}
