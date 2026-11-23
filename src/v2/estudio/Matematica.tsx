/**
 * Trazo 2.0 · Matemática (#/estudio/mate) y sus libros (#/estudio/mate/libro/<id>). La raíz es el camino parado como una línea de
 * metro: cada tramo y cada ventana es una estación, con las etapas como cortes, y abajo tus libros. El libro tiene pestañas
 * (Aritmética, Álgebra), los números, dónde estás y un mapa de calor con un cuadrado por capítulo: de un vistazo, cuáles están
 * cerrados, en prueba o flojos. El capítulo en sí y el detalle de cada tramo siguen en la 1.0.
 */
import { useState } from 'react';
import { AREAS } from '../../data/defaults';
import { capitulos, cuando, historial, resumenLibro, type EstadoCap, type InfoCap } from '../../data/estado-capitulo';
import { PLAN, T0_PLAN } from '../../data/plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { PUERTA, estadoEn, perfilMate, rutaMate } from '../../data/plan-vistas';
import { puertaAprobada } from '../../data/puertas';
import { actShort, arranco } from '../../data/study';
import type { Activity } from '../../data/study-types';
import { ir } from '../../lib/routes';
import { reiniciarLibro, restaurarLibro } from '../../state/study';
import { useStore } from '../../state/store';
import { abrirEstadoEstudio } from '../../ui/estado-estudio';
import { colorV2 } from '../hoy/datos';
import { aviso, confirmar } from '../kit/capas';
import { Boton, Interruptor, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Dato, Estado, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { FilaHoja } from '../proyecto/piezas';
import { MetroVertical } from './Metro';
import type { Estacion } from './lineas';
import '../proyecto/proyecto.css';
import './estudio.css';
import { cuantos } from '../reglas';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fch = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const pct = (n: number) => `${Math.round(n * 100)} %`;
const ETAPA = ['', 'Etapa 1 · núcleo', 'Etapa 2 · ciberseguridad', 'Etapa 3 · quant', 'Etapa 4 · aeroespacial'];

const INFO_MATE = (
  <>
    <p className="t-cuerpo-l">{PLAN_EXT.matematica.principio}</p>
    <p className="t-cuerpo">Cada estación es un tramo del plan. Las ventanas van siempre antes del proyecto que las pide.</p>
    <p className="t-cuerpo">Regla: {pct(PUERTA.verde)} o más aprueba; de {pct(PUERTA.amarillo)} a 84 %, refuerzo y retest; con menos, vuelve al tema.</p>
  </>
);

const librosDeMate = (st: { activities: Activity[] }) => st.activities.filter((a) => a.front === 'math' && !!a.units?.length && !a.archivada);

export function MateV2({ day }: { day: PropsV2['day'] }) {
  const hoy = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const study = useStore((s) => s.study);
  useStore((s) => s.plan.extrasApagados);
  const items = rutaMate(t0);
  const perfil = perfilMate(items, hoy, plan);
  const libros = librosDeMate(study);
  const porEtapa = [1, 2, 3, 4].map((e) => items.filter((x) => x.etapa === e)).filter((x) => x.length);
  // La estación de ahora es la que corre hoy o, si ninguna corre, la próxima: ahí vas a arrancar.
  const estado = (x: (typeof items)[number]): Estacion['estado'] => { const e = estadoEn(x, hoy); return e === 'hecho' ? 'hecha' : e === 'actual' || (perfil.actual?.id === x.id) ? 'actual' : 'proxima'; };
  return (
    <Marco className="es" titulo="Matemática" info={INFO_MATE} volver={{ href: '#/estudio', nombre: 'Estudio' }}>
      <Tarjeta heroe className="es-perfil" area="var(--a-economia)">
        <div className="es-perfil-fila">
          <span><small className="t-rotulo">Hoy sos</small><b className="t-encabezado">{perfil.sos ?? 'Recién empezás'}</b></span>
          {perfil.vasASer && <><span className="es-flecha" aria-hidden="true">→</span><span><small className="t-rotulo">Vas a ser</small><b className="t-encabezado es-resalta">{perfil.vasASer}</b></span></>}
        </div>
        {perfil.actual && <a className="es-aca" href={`#/estudio/mate/${perfil.actual.id}`}><b className="t-encabezado">{perfil.actual.id} · {perfil.actual.tipo === 'ventana' ? perfil.actual.nombre : perfil.actual.principal.join(' y ')}</b></a>}
      </Tarjeta>

      {libros.length > 0 && (
        <Grupo titulo="Tus libros">
          <div className="capa-1 s-lista">
            {libros.map((a) => {
              const r = resumenLibro(study, a, hoy);
              return <Fila key={a.id} icono="matematica" titulo={actShort(a)} valor={`${r.aprobados}/${r.total}`} href={`#/estudio/mate/libro/${a.id}`} />;
            })}
          </div>
        </Grupo>
      )}

      {porEtapa.map((xs) => (
        <Grupo key={xs[0].etapa} titulo={ETAPA[xs[0].etapa]}>
          <div className="capa-1 es-metro-caja">
            <MetroVertical area="var(--a-economia)"
              estaciones={xs.map((x) => ({ id: x.id, nombre: `${x.id} · ${x.tipo === 'ventana' ? x.nombre : x.principal.join(' y ')}`, estado: estado(x) }))}
              nota={(e) => { const x = xs.find((y) => y.id === e.id)!; const gate = PLAN.programacion.puertas[x.id]; return `${fch(x.inicio)} – ${fch(x.fin)}${gate ? ` · puerta ${gate}${puertaAprobada(plan, x.id) ? ' ✓' : ''}` : ''}`; }}
              href={(e) => `#/estudio/mate/${e.id}`} />
          </div>
        </Grupo>
      ))}
    </Marco>
  );
}

// ——— El libro ———

const CELDA: Record<EstadoCap, { texto: string }> = {
  pendiente: { texto: 'pendiente' }, estudiando: { texto: 'estudiando' }, test: { texto: 'test' }, retest: { texto: 're-test' },
  tesis: { texto: 'tesis' }, repasos: { texto: 'repasos' }, cerrado: { texto: 'cerrado' }, flojo: { texto: 'flojo' },
};
/** El grupo de color de cada estado, para el mapa de calor. */
export const grupoDe = (e: EstadoCap): 'pendiente' | 'estudiando' | 'prueba' | 'cerrado' | 'flojo' =>
  e === 'pendiente' ? 'pendiente' : e === 'estudiando' ? 'estudiando' : e === 'test' || e === 'retest' || e === 'tesis' ? 'prueba' : e === 'flojo' ? 'flojo' : 'cerrado';

const INFO_LIBRO = (
  <>
    <p className="t-cuerpo-l">Un cuadrado por capítulo.</p>
    <p className="t-cuerpo">Amarillo, cerrado. El anillo, el que estás estudiando. Tono medio, en prueba: test, re-test o tesis. Rojizo, flojo. Vacío, pendiente.</p>
    <p className="t-cuerpo">Tocá un capítulo para ver cómo va y abrirlo.</p>
  </>
);

function resumenCap(x: InfoCap) {
  const p: string[] = [];
  if (x.tests.length) p.push(`${x.tests.length} ${x.tests.length === 1 ? 'test' : 'tests'} · mejor ${x.mejor} %`);
  if (x.tarjetas) p.push(cuantos(x.tarjetas, 'tarjeta', 'tarjetas'));
  return p.join(' · ') || (x.estado === 'pendiente' ? 'todavía no' : 'sin tests todavía');
}

export function LibroV2({ day, id }: { day: PropsV2['day']; id: string }) {
  const hoy = day.date;
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const a = study.activities.find((x) => x.id === id && x.units?.length);
  const [cap, setCap] = useState<number | null>(null);
  if (!a) {
    return <Marco titulo="Libro" volver={{ href: '#/estudio/mate', nombre: 'Matemática' }}><p className="t-cuerpo">No encontré ese libro.</p></Marco>;
  }
  const front = study.fronts.find((f) => f.id === a.front);
  const area = front ? colorV2(AREAS[front.color].css) : 'var(--a-economia)';
  const r = resumenLibro(study, a, hoy);
  const cs = capitulos(study, a, hoy);
  const h = historial(study, days, a);
  const empezo = arranco(study, a);
  const c = r.enCurso;
  const libros = librosDeMate(study);
  const elegido = cs.find((x) => x.n === cap) ?? null;
  const antes = actShort(study.activities.find((x) => x.id === a.despuesDe) ?? a);
  return (
    <Marco className="es" titulo={actShort(a)} info={INFO_LIBRO} volver={{ href: '#/estudio/mate', nombre: 'Matemática' }}>
      {libros.length > 1 && <div className="es-pestanas"><Segmentado etiqueta="Libro" opciones={libros.map((x) => [x.id, actShort(x)] as [string, string])} valor={a.id} onCambio={(v) => ir(`estudio/mate/libro/${v}`)} /></div>}
      <div className="es-numeros es-numeros-arriba">
        <Dato valor={`${r.aprobados}/${r.total}`} etiqueta="Aprobados" />
        <Dato valor={r.promedio == null ? '—' : `${r.promedio} %`} etiqueta="Promedio" />
        <Dato valor={r.tarjetas} etiqueta="Tarjetas" />
      </div>

      {!empezo ? (
        <p className="capa-1 pt-vacio t-cuerpo">Arranca cuando termines {antes}: hasta entonces no entra en el día.</p>
      ) : (
        <>
          {c && (
            <Tarjeta className="es-aca-tarjeta" area={area}>
              <span className="t-rotulo">Estás acá</span>
              <a className="es-aca" href={`#/estudio/mate/libro/${a.id}/${c.n}`}><b className="t-encabezado">{a.unitLabel ?? 'Cap.'} {c.n} · {c.unit.title}</b><span className="t-dato">{c.etiqueta}</span></a>
              {c.proximo && c.estado !== 'estudiando' && <p className="t-nota">Sigue: {c.proximo.que.toLowerCase()} ({cuando(c.proximo.fecha, hoy)}).</p>}
              <Boton variante="secundario" onClick={() => abrirEstadoEstudio(hoy, { actividades: [a.id] })}>Marcar dónde quedé</Boton>
            </Tarjeta>
          )}
          <Grupo titulo="Capítulos" extremo={<span className="t-rotulo">{r.total}</span>}>
            <div className="capa-1 es-calor" style={{ ['--area' as string]: area }}>
              <ol className="es-celdas" aria-label="Capítulos del libro">
                {cs.map((x) => (
                  <li key={x.n}>
                    <button type="button" className={`es-celda st-${grupoDe(x.estado)}`} onClick={() => setCap(x.n)} aria-label={`${a.unitLabel ?? 'Cap.'} ${x.n}, ${x.unit.title}, ${CELDA[x.estado].texto}`}>
                      <span className="t-dato">{x.n}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <ul className="es-leyenda" aria-hidden="true">
                {([['cerrado', 'Cerrado'], ['estudiando', 'Estudiando'], ['prueba', 'En prueba'], ['flojo', 'Flojo'], ['pendiente', 'Pendiente']] as const).map(([k, t]) => <li key={k}><i className={`es-celda es-punto st-${k}`} />{t}</li>)}
              </ul>
            </div>
          </Grupo>
        </>
      )}

      <div className="pt-acciones">
        <Boton variante="secundario" icono="tarjetas" href={`#/tarjetas/libro:${a.id}`} deshabilitado={r.tarjetas ? false : 'Todavía no hay tarjetas'}>Repasar tarjetas ({r.tarjetas})</Boton>
        {c && <Boton variante="fantasma" icono="importar" href={`#/estudio/mate/libro/${a.id}/${c.n}`}>Importar tarjetas</Boton>}
      </div>

      {r.final && (
        <Grupo titulo="Test del libro">
          <Tarjeta className="es-final">
            <b className="t-encabezado">{r.final.titulo}</b>
            <p className="t-nota">{r.final.desc}</p>
            {r.final.aprobado ? <Estado estado="hecho" texto={`Aprobado${r.final.ultimo != null ? ` · ${r.final.ultimo} %` : ''}`} />
              : r.final.disponible ? <Boton variante="secundario" onClick={() => ir(`test/${a.id}/final`)}>Registrar el examen{r.final.ultimo != null ? ` (último: ${r.final.ultimo} %)` : ''}</Boton>
                : <p className="t-nota">Se habilita con los {r.total} capítulos aprobados ({r.aprobados}/{r.total}).</p>}
          </Tarjeta>
        </Grupo>
      )}

      <div className="capa-1 s-lista">
        <FilaHoja icono="calendario" titulo="Historial de días" valor={h.length ? String(h.length) : 'vacío'}>
          {h.length === 0 ? <p className="t-cuerpo">Todavía no hay días con estudio de este libro. Se arma solo con las sesiones, los tests, las tesis y las tarjetas.</p> : (
            <ol className="capa-1 pt-revs">{h.map((d) => <li key={d.fecha}><span className="t-rotulo">{fch(d.fecha)}{d.min ? ` · ${d.min} min` : ''}</span>{d.eventos.map((e, i) => <span key={i} className="t-cuerpo">{e}</span>)}</li>)}</ol>
          )}
        </FilaHoja>
        <Reiniciar a={a} tarjetas={r.tarjetas} />
      </div>

      <HojaCap a={a} x={elegido} onCerrar={() => setCap(null)} />
    </Marco>
  );
}

function HojaCap({ a, x, onCerrar }: { a: Activity; x: InfoCap | null; onCerrar: () => void }) {
  const [ultimo, setUltimo] = useState<InfoCap | null>(null);
  if (x && x !== ultimo) setUltimo(x);
  const c = x ?? ultimo;
  if (!c) return null;
  return (
    <Hoja abierta={!!x} onCerrar={onCerrar} titulo={`${a.unitLabel ?? 'Cap.'} ${c.n}`} pie={<Boton variante="primario" icono="siguiente" href={`#/estudio/mate/libro/${a.id}/${c.n}`}>Abrir el capítulo</Boton>}>
      <div className="pt-version">
        <p className="t-cuerpo-l">{c.unit.title}</p>
        <p className="t-dato">{c.etiqueta}</p>
        <p className="t-nota">{resumenCap(c)}</p>
        {c.proximo && <p className="t-nota">Sigue: {c.proximo.que.toLowerCase()}.</p>}
      </div>
    </Hoja>
  );
}

/** Reiniciar el libro desde cero: vuelve al cap. 1 sin nada estudiado; se puede deshacer. */
function Reiniciar({ a, tarjetas }: { a: Activity; tarjetas: number }) {
  const [borrar, setBorrar] = useState(false);
  const nombre = actShort(a);
  const reiniciar = async () => {
    if (!(await confirmar({ titulo: `¿Reiniciar ${nombre}?`, texto: `Se borran los capítulos estudiados, los tests, las tesis, los repasos agendados y los minutos de este libro${borrar ? (tarjetas === 1 ? ', y su tarjeta' : `, y las ${tarjetas} tarjetas`) : ''}. Se puede deshacer.`, accion: 'Reiniciar', peligro: true }))) return;
    const foto = reiniciarLibro(a.id, { borrarTarjetas: borrar });
    if (!foto) return;
    aviso({ titulo: `${nombre}, desde cero`, sub: `Volvés al ${a.unitLabel?.toLowerCase() ?? 'cap.'} 1${borrar ? '' : '; las tarjetas quedaron'}`, tono: 'info', deshacer: () => restaurarLibro(foto) });
  };
  return (
    <FilaHoja icono="deshacer" titulo="Reiniciar desde cero" tituloHoja={`Reiniciar ${nombre}`}>
      <p className="t-cuerpo pt-pie">Vuelve al {a.unitLabel?.toLowerCase() ?? 'cap.'} 1 sin nada estudiado: se borran los capítulos marcados, los tests, las tesis, los repasos agendados, el examen del libro, los minutos y el historial de este libro.</p>
      {tarjetas > 0 && <div className="capa-1 pt-check"><Interruptor prendido={borrar} etiqueta={tarjetas === 1 ? 'Borrar también su tarjeta' : `Borrar también las ${tarjetas} tarjetas`} onCambio={setBorrar} /></div>}
      <div className="pt-campo-hoja"><Boton variante="peligro" icono="borrar" onClick={reiniciar}>Reiniciar {nombre}</Boton></div>
    </FilaHoja>
  );
}
