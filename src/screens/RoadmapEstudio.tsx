import { AREAS } from '../data/defaults';
import {
  dondeEstas, estadoFases, mesesRestantes, paraActivar, porRol, progresoVacio, roadmapPorId, STUDY_ROADMAPS,
  type EstadoFase, type Fase, type Material, type MotivoActivar, type RoadmapEstudio,
} from '../data/study-roadmap';
import { fechaCorta } from '../data/plan';
import type { DayLog } from '../data/types';
import { cerrarFase, reabrirFase, toggleCriterio } from '../state/estudio-ruta';
import { useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { Casilla } from '../ui/Casilla';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';

const colorDe = (r: RoadmapEstudio) => AREAS[r.color as keyof typeof AREAS]?.css ?? 'var(--tinta)';
const meses = (f: Fase) => (f.meses[0] === f.meses[1] ? `${f.meses[0]} ${f.meses[0] === 1 ? 'mes' : 'meses'}` : `${f.meses[0]} a ${f.meses[1]} meses`);
const nucleos = (f: Fase) => f.materiales.filter((m) => m.rol === 'nucleo');

/** Hook: progreso guardado de un roadmap y el estado de sus fases. */
function useRoadmap(r: RoadmapEstudio) {
  const p = useStore((s) => s.estudioRuta[r.id]) ?? progresoVacio();
  const study = useStore((s) => s.study);
  return { p, fases: estadoFases(r, p, study), donde: dondeEstas(r, p) };
}

/** La tira de fases: cerradas llenas, la actual resaltada, las próximas vacías. */
export function TiraFases({ fases }: { fases: EstadoFase[] }) {
  return (
    <span className="re-tira" aria-hidden="true">
      {fases.map((e) => <i key={e.fase.id} className={e.estado} />)}
    </span>
  );
}

/** Card de un roadmap para la pantalla de Estudio. */
export function CardRoadmap({ r }: { r: RoadmapEstudio }) {
  const { fases, donde, p } = useRoadmap(r);
  const actual = fases.find((e) => e.estado === 'actual');
  const [a, b] = mesesRestantes(r, p);
  return (
    <a className="re-card" href={`#/estudio/ruta/${r.id}`} style={{ ['--c' as string]: colorDe(r) }}>
      <span className="re-card-cab">
        <b>{r.nombre}</b>
        <span className="mono sub">fase {Math.min(donde.cerradas + 1, donde.total)} de {donde.total}</span>
      </span>
      <TiraFases fases={fases} />
      {actual ? (
        <span className="re-card-ahora">
          <small className="etiqueta">Estás acá</small>
          <span><span className="mono">{actual.fase.id}</span> · {actual.fase.nombre}</span>
        </span>
      ) : <span className="re-card-ahora"><small className="etiqueta">Roadmap terminado</small></span>}
      <span className="re-card-perfil">
        <span className="sub">{donde.perfil ? <>Hoy sos <b>{donde.perfil}</b></> : 'Recién empezás'}</span>
        {donde.proximo && <span className="sub">→ vas a ser <b className="resaltado">{donde.proximo}</b></span>}
      </span>
      <span className="mono sub re-card-pie">{actual ? `${actual.criterios.hechos}/${actual.criterios.total} criterios para pasar · quedan ${a} a ${b} meses` : 'Todas las fases cerradas'}</span>
    </a>
  );
}

/** Router de #/estudio/ruta/:id(/:fase). */
export function RoadmapPantalla({ day, param }: { day: DayLog; param: string }) {
  const [, id, faseId] = param.split('/');
  const r = id ? roadmapPorId(id) : undefined;
  if (!r) return <ListaRoadmaps />;
  const f = faseId ? r.fases.find((x) => x.id === faseId) : undefined;
  return f ? <FasePantalla key={f.id} r={r} f={f} day={day} /> : <RoadmapVista r={r} />;
}

function ListaRoadmaps() {
  return (
    <main className="pantalla re">
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <header><h1 className="titulo">Roadmaps</h1><p>Elegí uno para ver sus fases.</p></header>
      <div className="re-cards">{STUDY_ROADMAPS.map((r) => <CardRoadmap key={r.id} r={r} />)}</div>
    </main>
  );
}

/** Vista de un roadmap: dónde estás, la línea de tiempo de fases y cómo se usa. */
function RoadmapVista({ r }: { r: RoadmapEstudio }) {
  const { fases, donde, p } = useRoadmap(r);
  const actual = fases.find((e) => e.estado === 'actual');
  const [a, b] = mesesRestantes(r, p);
  // Cada fase va en el primer año que la nombra (M3 y M6 cruzan de un año al otro).
  const anioDe = new Map<string, number>();
  for (const x of r.anios) for (const id of x.fases) if (!anioDe.has(id)) anioDe.set(id, x.anio);
  return (
    <main className="pantalla re" style={{ ['--c' as string]: colorDe(r) }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a><span className="mono sub">{donde.total} fases</span></div>
      <div className="kicker">Roadmap</div>
      <header><h1 className="titulo">{r.nombre}</h1><p>{r.descripcion}</p></header>

      <section className="re-aca" aria-labelledby="re-aca-t">
        <span className="etiqueta" id="re-aca-t">{actual ? 'Estás acá' : 'Terminaste'}</span>
        <div className="re-perfiles">
          <span><small className="sub">Hoy sos</small><b>{donde.perfil ?? 'Recién empezás'}</b></span>
          {donde.proximo && <><span className="re-flecha" aria-hidden="true">→</span><span><small className="sub">Vas a ser</small><b className="resaltado">{donde.proximo}</b></span></>}
        </div>
        {actual && (
          <>
            <a className="re-aca-fase" href={`#/estudio/ruta/${r.id}/${actual.fase.id}`}>
              <span className="mono">{actual.fase.id} · {meses(actual.fase)}</span>
              <b>{actual.fase.nombre}</b>
              <span className="sub">Manda: {nucleos(actual.fase).map((m) => m.titulo).join(' → ')}</span>
            </a>
            <div className="re-avance">
              <span className="mono sub">{actual.criterios.hechos}/{actual.criterios.total} criterios para pasar</span>
              <span className="re-barra"><span style={{ width: `${(actual.criterios.hechos / actual.criterios.total) * 100}%` }} /></span>
              {actual.evidencia && <span className="mono sub">{actual.evidencia.hechos}/{actual.evidencia.total} capítulos aprobados en Estudio</span>}
            </div>
            <a className="btn-principal re-btn" href={`#/estudio/ruta/${r.id}/${actual.fase.id}`}>Ver la fase {actual.fase.id}</a>
          </>
        )}
        <p className="mono sub re-quedan">{actual ? `Quedan ${a} a ${b} meses estimados` : `Cerraste las ${donde.total} fases`}</p>
      </section>

      <section aria-labelledby="re-tl-t">
        <span className="etiqueta" id="re-tl-t">La escalera · tocá una fase para ver todo lo que tiene</span>
        <ol className="re-tl">
          {fases.map((e, i) => {
            const anio = anioDe.get(e.fase.id);
            const nuevoAnio = anio != null && (i === 0 || anioDe.get(fases[i - 1].fase.id) !== anio);
            const obj = r.anios.find((x) => x.anio === anio)?.objetivo;
            return (
              <li key={e.fase.id} className={e.estado}>
                {nuevoAnio && <div className="re-anio"><b>Año {anio}</b>{obj && <span className="sub"> · {obj}</span>}</div>}
                <a href={`#/estudio/ruta/${r.id}/${e.fase.id}`} aria-current={e.estado === 'actual' ? 'step' : undefined}>
                  <span className="re-nodo" aria-hidden="true">{e.estado === 'cerrada' ? '✓' : ''}</span>
                  <span className="re-tl-cuerpo">
                    <span className="mono re-tl-et">{e.fase.id} · {meses(e.fase)}{e.estado === 'actual' ? ' · estás acá' : e.cerrada ? ` · cerrada el ${fechaCorta(e.cerrada)}` : ''}</span>
                    <b>{e.fase.nombre}</b>
                    <span className="re-tl-perfil"><span className={e.estado === 'actual' ? 'resaltado' : ''}>{e.fase.perfil}</span></span>
                    <span className="sub re-tl-libros">{nucleos(e.fase).map((m) => m.titulo).join(' → ')}</span>
                  </span>
                  <span className="re-tl-ir" aria-hidden="true">→</span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      <ComoSeUsa r={r} />
    </main>
  );
}

/** La regla, el protocolo, los roles y el semáforo, plegados. */
function ComoSeUsa({ r }: { r: RoadmapEstudio }) {
  return (
    <details className="re-como">
      <summary>Cómo se usa este roadmap</summary>
      <p><b>{r.regla}</b></p>
      {r.lema && <p className="sub">{r.lema}</p>}
      <span className="etiqueta">Cada tema, en este orden</span>
      <ol className="re-protocolo">
        {r.protocolo.map((x) => <li key={x.paso}><b>{x.paso}.</b> {x.detalle}</li>)}
      </ol>
      <span className="etiqueta">Los cinco tipos de material</span>
      <ul className="re-roles">
        {Object.entries(r.roles).map(([k, v]) => <li key={k}><b>{v.nombre}.</b> {v.uso}</li>)}
      </ul>
      <Semaforo r={r} />
    </details>
  );
}

function Semaforo({ r }: { r: RoadmapEstudio }) {
  const pct = (n: number) => `${Math.round(n * 100)} %`;
  return (
    <ul className="re-semaforo">
      <li className="verde"><i /><b>{pct(r.semaforo.verde)} o más</b> {r.semaforo.textos.verde}</li>
      <li className="amarillo"><i /><b>{pct(r.semaforo.amarillo)} a {pct(r.semaforo.verde - 0.01)}</b> {r.semaforo.textos.amarillo}</li>
      <li className="rojo"><i /><b>Menos de {pct(r.semaforo.amarillo)}</b> {r.semaforo.textos.rojo}</li>
    </ul>
  );
}

function MaterialFila({ m }: { m: Material }) {
  return (
    <li className="re-mat">
      <b>{m.titulo}{m.parte ? <span className="sub"> · {m.parte}</span> : null}</b>
      {m.autor && <small className="sub">{m.autor}</small>}
      <span>{m.uso}</span>
      {m.cuando && <small className="re-cuando">Cuándo: {m.cuando}</small>}
    </li>
  );
}

const MOTIVOS: [MotivoActivar, string][] = [
  ['concepto', 'Fallás por concepto'], ['tecnica', 'Fallás por técnica'], ['enunciado', 'No entendés el enunciado'],
  ['descuido', 'Fallás por descuido'], ['profundidad', 'Querés más profundidad'],
];

/** Detalle de una fase: qué manda, los bloques, qué activar, el proyecto y cómo se pasa. */
function FasePantalla({ r, f, day }: { r: RoadmapEstudio; f: Fase; day: DayLog }) {
  const { fases, p } = useRoadmap(r);
  const e = fases.find((x) => x.fase.id === f.id)!;
  const i = r.fases.indexOf(f);
  const prev = r.fases[i - 1];
  const next = r.fases[i + 1];
  const ultimaCerrada = [...fases].reverse().find((x) => x.estado === 'cerrada');
  const hechos = new Set(p.salida[f.id] ?? []);
  const editable = e.estado === 'actual';
  const titulo = (id: string) => f.materiales.find((m) => m.id === id)?.titulo ?? id;
  const cerrar = () => {
    if (cerrarFase(r.id, f.id, day.date)) {
      toast({ title: `Fase ${f.id} cerrada`, sub: `Ahora sos ${f.perfil}${next ? `. Sigue ${next.id}: ${next.nombre}` : ''}`, color: colorDe(r), evento: 'sello' });
    }
  };
  return (
    <main className="pantalla re re-fase" style={{ ['--c' as string]: colorDe(r) }}>
      <div className="topbar"><a className="volver" href={`#/estudio/ruta/${r.id}`}>{r.nombre}</a><span className="mono sub">{f.id} · {meses(f)}</span></div>
      <div className="kicker">{e.estado === 'actual' ? 'Estás acá' : e.estado === 'cerrada' ? `Cerrada el ${fechaCorta(e.cerrada!)}` : 'Todavía no'}</div>
      <header><h1 className="titulo">{f.nombre}</h1><p>{f.objetivo}</p></header>
      <p className="re-al-cerrar">Al cerrarla sos <b className="resaltado">{f.perfil}</b></p>

      <section className="re-sec">
        <span className="etiqueta">Qué libro manda</span>
        <ul className="re-mats re-nucleo">{nucleos(f).map((m) => <MaterialFila key={m.id} m={m} />)}</ul>
      </section>

      {f.bloques?.length ? (
        <section className="re-sec">
          <span className="etiqueta">Bloques</span>
          <ol className="re-bloques">
            {f.bloques.map((b) => (
              <li key={b.titulo}>
                <details>
                  <summary>
                    <b>{b.titulo}</b>
                    {(titulo(b.nucleo) !== b.titulo || b.complementos?.length) && (
                      <small className="sub">{titulo(b.nucleo) !== b.titulo ? titulo(b.nucleo) : 'Con'}{b.complementos?.length ? `${titulo(b.nucleo) !== b.titulo ? ' +' : ''} ${b.complementos.map(titulo).join(', ')}` : ''}</small>
                    )}
                  </summary>
                  {b.temas?.length ? <ul className="re-temas">{b.temas.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="sub">Los temas del capítulo en el libro núcleo.</p>}
                </details>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="re-sec">
        <span className="etiqueta">Si un test sale mal</span>
        <Semaforo r={r} />
        <ul className="re-activar">
          {MOTIVOS.map(([k, t]) => {
            const ms = paraActivar(r, f, k);
            return (
              <li key={k}>
                <b>{t}</b>
                <span className="sub">{ms.length ? ms.map((m) => m.titulo).join(' · ') : r.activar[k].texto}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {porRol(f).filter(([rol]) => rol !== 'nucleo').map(([rol, ms]) => (
        <section key={rol} className="re-sec">
          <span className="etiqueta">{r.roles[rol].nombre}</span>
          <p className="sub re-rol-uso">{r.roles[rol].uso}</p>
          <ul className="re-mats">{ms.map((m) => <MaterialFila key={m.id} m={m} />)}</ul>
        </section>
      ))}

      {f.descartados?.length ? (
        <section className="re-sec">
          <span className="etiqueta">No entra</span>
          <ul className="re-descartados">{f.descartados.map((d) => <li key={d}>{d}</li>)}</ul>
        </section>
      ) : null}

      <section className="re-sec">
        <span className="etiqueta">Proyecto · se arma por módulos, a medida que dominás cada bloque</span>
        <h2 className="re-proy">{f.proyecto.nombre}</h2>
        <ol className="re-modulos">{f.proyecto.modulos.map((m) => <li key={m}>{m}</li>)}</ol>
      </section>

      <section className="re-sec re-salida" aria-labelledby="re-salida-t">
        <div className="re-salida-cab">
          <span className="etiqueta" id="re-salida-t">Para pasar tenés que poder</span>
          <span className="mono sub">{e.criterios.hechos}/{e.criterios.total}</span>
        </div>
        {e.evidencia && <p className="mono sub">Evidencia: {e.evidencia.hechos}/{e.evidencia.total} capítulos aprobados en Estudio</p>}
        <ul className="tareas">
          {f.salida.map((c, k) => {
            const on = e.estado === 'cerrada' || hechos.has(k);
            return (
              <li key={c}>
                <Casilla id={`sal-${f.id}-${k}`} checked={on} label={c} onChange={() => editable && toggleCriterio(r.id, f.id, k)} />
                <label htmlFor={`sal-${f.id}-${k}`} className={editable ? '' : 'sub'}><span className={`trazo${on ? ' on' : ''}`}>{c}</span></label>
              </li>
            );
          })}
        </ul>
        {e.estado === 'actual' && (
          <button className="btn-principal" disabled={!e.lista} onClick={cerrar}>
            {e.lista ? `Cerrar ${f.id} · pasás a ser ${f.perfil}` : `Faltan ${e.criterios.total - e.criterios.hechos} para cerrar ${f.id}`}
          </button>
        )}
        {e.estado === 'proxima' && <p className="sub">Se habilita cuando cerrás las fases anteriores.</p>}
        {e.estado === 'cerrada' && ultimaCerrada?.fase.id === f.id && (
          <button className="btn-borde" onClick={() => reabrirFase(r.id)}>Reabrir {f.id}</button>
        )}
      </section>

      <nav className="re-nav" aria-label="Otras fases">
        {prev ? <a href={`#/estudio/ruta/${r.id}/${prev.id}`}>← {prev.id} · {prev.perfil}</a> : <span />}
        {next ? <a href={`#/estudio/ruta/${r.id}/${next.id}`}>{next.id} · {next.perfil} →</a> : <span />}
      </nav>
    </main>
  );
}
