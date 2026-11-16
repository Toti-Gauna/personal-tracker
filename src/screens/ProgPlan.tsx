/**
 * Ola 20 · el roadmap de programación por proyectos (#/estudio/prog): se aprende haciendo, un proyecto
 * a la vez. Misma estructura que el de matemática: "Estás acá", "Hoy sos → Vas a ser" y la escalera de
 * P0 a A7. Cada proyecto tiene subpáginas: Resumen, Stack, Metas, Evidencia, Pieza matemática y Entrega.
 */
import { PLAN, T0_PLAN, tramoPorId, type Capa } from '../data/plan';
import { proyectoVacio } from '../data/plan-state';
import { avanceSalida, calendarioCompleto, estadoEn, hoySos, salidaDe } from '../data/plan-vistas';
import { avanceBloque } from '../data/metas-bloque';
import { cierreProyecto } from '../data/puertas';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { marcarCapa } from '../state/plan';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { EvidenciaProyecto, FichaBloque, NivelSalida } from '../ui/FichaBloque';
import { MetasBloque } from '../ui/MetasBloque';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';
import '../styles/etapas.css';
import '../styles/metas.css';

const ETAPA = ['', 'Etapa 1 · núcleo', 'Etapa 2 · ciberseguridad', 'Etapa 3 · quant', 'Etapa 4 · aeroespacial'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;
const TIPO: Record<string, string> = { proyecto: 'proyecto', ventana: 'ventana de matemática', cert: 'certificación', colchon: 'colchón', cierre: 'cierre', descanso: 'descanso' };

export const SUBPAGINAS = [
  ['resumen', 'Resumen'], ['stack', 'Stack y tecnología nueva'], ['metas', 'Metas'], ['evidencia', 'Evidencia'], ['pieza', 'Pieza matemática'], ['entrega', 'Entrega'],
] as const;
type Sub = (typeof SUBPAGINAS)[number][0];

const COLOR = RAMA_COLOR.programacion;

function useProg(day: DayLog) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  useStore((s) => s.plan.extrasApagados);
  const cal = calendarioCompleto(t0).filter((b) => b.semanas > 0);
  const actual = cal.find((b) => estadoEn(b, day.date) === 'actual') ?? cal.find((b) => estadoEn(b, day.date) === 'proximo') ?? cal[cal.length - 1];
  return { t0, plan, cal, actual, perfil: hoySos(day.date, plan, t0) };
}

/** La card de Estudio. */
export function CardProg({ day }: { day: DayLog }) {
  const { plan, cal, actual, perfil } = useProg(day);
  const proys = cal.filter((b) => b.tipo === 'proyecto');
  const cerrados = proys.filter((b) => cierreProyecto(plan, b.id)).length;
  const av = avanceBloque(plan.metasBloque?.[actual.id]);
  return (
    <a className="re-card" href="#/estudio/prog" style={{ ['--c' as string]: COLOR }}>
      <span className="re-card-cab"><b>Programación</b><span className="mono sub">{cerrados} de {proys.length} proyectos</span></span>
      <span className="re-tira" aria-hidden="true">{proys.map((x) => <i key={x.id} className={cierreProyecto(plan, x.id) ? 'cerrada' : x.id === actual.id ? 'actual' : ''} />)}</span>
      <span className="re-card-ahora"><small className="etiqueta">Estás acá</small><span><span className="mono">{actual.id}</span> · {actual.nombre}{av.total ? ` · metas ${av.hechas} de ${av.total}` : ''}</span></span>
      <span className="re-card-perfil">
        <span className="sub">{perfil.sos ? <>Hoy sos <b>{perfil.sos.perfil}</b></> : 'Recién empezás'}</span>
        {perfil.vasASer && <span className="sub">→ vas a ser <b className="resaltado">{perfil.vasASer.perfil}</b></span>}
      </span>
      <span className="mono sub re-card-pie">Se aprende haciendo: un proyecto a la vez, de P0 a A7</span>
    </a>
  );
}

/** #/estudio/prog, #/estudio/prog/:id y #/estudio/prog/:id/:sub */
export function ProgPlan({ day, param }: { day: DayLog; param: string }) {
  const [, id, sub] = param.split('/');
  const p = useProg(day);
  const b = id ? p.cal.find((x) => x.id === id) : undefined;
  if (b) return <ProyectoProg day={day} id={b.id} sub={(SUBPAGINAS.find(([k]) => k === sub)?.[0] ?? 'resumen') as Sub} />;
  const { plan, cal, actual, perfil } = p;
  const porEtapa = [1, 2, 3, 4].map((e) => cal.filter((x) => x.etapa === e && x.tipo !== 'descanso'));
  return (
    <main className="pantalla re" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a><span className="mono sub">{cal.filter((x) => x.tipo === 'proyecto').length} proyectos</span></div>
      <div className="kicker">Roadmap · Plan T+18 extendido</div>
      <header><h1 className="titulo">Programación</h1><p>Se aprende haciendo: un proyecto a la vez, con una tecnología nueva como máximo. Cada proyecto cierra con examen, evidencia y su entrega.</p></header>

      <section className="re-aca" aria-labelledby="pg-aca">
        <span className="etiqueta" id="pg-aca">Estás acá</span>
        <div className="re-perfiles">
          <span><small className="sub">Hoy sos</small><b>{perfil.sos?.perfil ?? 'Recién empezás'}</b></span>
          {perfil.vasASer && <><span className="re-flecha" aria-hidden="true">→</span><span><small className="sub">Vas a ser</small><b className="resaltado">{perfil.vasASer.perfil}</b></span></>}
        </div>
        <a className="re-aca-fase" href={`#/estudio/prog/${actual.id}`}>
          <span className="mono">{actual.id} · {f(actual.inicio)} a {f(actual.fin)} · {TIPO[actual.tipo]}</span>
          <b>{actual.nombre}</b>
          <span className="sub">{actual.ficha?.feature ?? actual.ficha?.tecnologiaNueva ?? tramoPorId(actual.id)?.que ?? ''}</span>
        </a>
      </section>

      <span className="etiqueta">La escalera · de P0 a A7</span>
      <ol className="re-tl">
        {porEtapa.flatMap((xs) => xs.map((x, i) => {
          const est = x.tipo === 'proyecto' && cierreProyecto(plan, x.id) ? 'hecho' : estadoEn(x, day.date);
          const av = avanceBloque(plan.metasBloque?.[x.id]);
          const sal = x.tipo === 'ventana' ? avanceSalida(plan, x.id) : null;
          return (
            <li key={x.id} className={est === 'hecho' ? 'cerrada' : est}>
              {i === 0 && <div className="re-anio"><b>{ETAPA[x.etapa]}</b></div>}
              <a href={`#/estudio/prog/${x.id}`} aria-current={x.id === actual.id ? 'step' : undefined}>
                <span className="re-nodo" aria-hidden="true">{est === 'hecho' ? '✓' : ''}</span>
                <span className="re-tl-cuerpo">
                  <span className="mono re-tl-et">{x.id} · {f(x.inicio)} a {f(x.fin)} · {x.semanas} sem{x.id === actual.id ? ' · estás acá' : ''}</span>
                  <b>{x.nombre}</b>
                  <span className="re-tl-perfil"><span className={x.id === actual.id ? 'resaltado' : ''}>{x.ficha?.perfil ?? x.mate?.perfil ?? TIPO[x.tipo]}</span></span>
                  {(av.total > 0 || sal) && <span className="sub re-tl-libros">{[av.total ? `metas ${av.hechas} de ${av.total}` : '', sal ? `salida ${sal.hechos} de ${sal.total}` : ''].filter(Boolean).join(' · ')}</span>}
                </span>
                <span className="re-tl-ir" aria-hidden="true">→</span>
              </a>
            </li>
          );
        }))}
      </ol>
    </main>
  );
}

function ProyectoProg({ day, id, sub }: { day: DayLog; id: string; sub: Sub }) {
  const { plan, cal, actual } = useProg(day);
  const i = cal.findIndex((x) => x.id === id);
  const b = cal[i];
  const t = tramoPorId(id);
  const est = b.tipo === 'proyecto' && cierreProyecto(plan, id) ? 'hecho' : estadoEn(b, day.date);
  const semana = est === 'actual' ? Math.floor((Date.parse(day.date) - Date.parse(b.inicio)) / (7 * 864e5)) + 1 : null;
  const p = plan.proyectos[id] ?? proyectoVacio();
  const capas = PLAN.programacion.estandar;
  const ventana = b.dependeDe?.[0];
  const subs = SUBPAGINAS.filter(([k]) => b.tipo === 'proyecto' || k === 'resumen' || k === 'metas' || (b.tipo === 'ventana' && k === 'pieza'));
  const ant = cal.slice(0, i).reverse().find((x) => x.tipo !== 'descanso');
  const sig = cal.slice(i + 1).find((x) => x.tipo !== 'descanso');

  return (
    <main className="pantalla re re-fase prog-proy" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href={sub === 'resumen' ? '#/estudio/prog' : `#/estudio/prog/${id}`}>{sub === 'resumen' ? 'Programación' : id}</a><span className="mono sub">{id} · {b.semanas} sem</span></div>
      <div className="kicker">{id === actual.id ? 'Estás acá' : est === 'hecho' ? 'Cerrado' : est === 'actual' ? 'En curso' : 'Todavía no'} · {f(b.inicio)} a {f(b.fin)}{semana ? ` · semana ${semana} de ${b.semanas}` : ''}</div>
      <header>
        <h1 className="titulo">{sub === 'resumen' ? b.nombre : SUBPAGINAS.find(([k]) => k === sub)![1]}</h1>
        <p>{sub === 'resumen' ? `${id} · ${TIPO[b.tipo]} · ${b.semanas} ${b.semanas === 1 ? 'semana' : 'semanas'}` : `${id} · ${b.nombre}`}</p>
      </header>

      {sub === 'resumen' && (
        <>
          {b.ficha?.perfil && <p className="re-al-cerrar">Al cerrarlo sos <b className="resaltado">{b.ficha.perfil}</b></p>}
          {t?.que && <p className="pp-que">{t.que}.</p>}
          {b.ficha?.feature && <section className="re-sec"><span className="etiqueta">Feature diferencial</span><p>{b.ficha.feature}</p></section>}
          {b.ficha?.visual && <section className="re-sec"><span className="etiqueta">Visual</span><p>{b.ficha.visual}</p></section>}
          {ventana && <p className="sub">Antes va la ventana <a className="subrayado" href={`#/estudio/prog/${ventana}`}>{ventana}</a>: sin la puerta aprobada (85 %), {id} no arranca.</p>}
          {b.tipo !== 'proyecto' && <FichaBloque id={id} />}
          <nav className="prog-subs" aria-label={`Secciones de ${id}`}>
            {subs.filter(([k]) => k !== 'resumen').map(([k, n]) => <a key={k} className="btn-borde" href={`#/estudio/prog/${id}/${k}`}>{n}{k === 'metas' && avanceBloque(plan.metasBloque?.[id]).total ? ` · ${avanceBloque(plan.metasBloque?.[id]).hechas}/${avanceBloque(plan.metasBloque?.[id]).total}` : ''}</a>)}
          </nav>
          <a className="fila-link" href={`#/metas/proyecto/${id}`}>Revisiones, tiempo y examen en Metas <span aria-hidden="true">→</span></a>
        </>
      )}

      {sub === 'stack' && (
        <>
          {b.ficha?.tecnologiaNueva && <section className="re-sec"><span className="etiqueta">Tecnología nueva</span><p><b>{b.ficha.tecnologiaNueva}</b></p><p className="sub">Una tecnología nueva por proyecto como máximo, y ninguna en bloques con certificación.</p></section>}
          {t?.stack?.length ? <section className="re-sec"><span className="etiqueta">Stack</span><div className="pp-chips">{t.stack.map((x) => <span key={x} className="mono">{x}</span>)}</div></section> : null}
          {!b.ficha?.tecnologiaNueva && !t?.stack?.length && <p className="sub">Este bloque no suma tecnología nueva.</p>}
        </>
      )}

      {sub === 'metas' && <MetasBloque bloque={id} date={day.date} titulo={`Metas de ${id}`} vacio={id === 'P0' ? 'En P0 se arman las metas: cargalas a mano o pegá el JSON que te pase Claude.' : undefined} />}

      {sub === 'evidencia' && (
        <>
          {(b.ficha?.referencia || b.ficha?.validador) && (
            <section className="re-sec">
              {b.ficha?.referencia && <><span className="etiqueta">Referencia externa</span><p>{b.ficha.referencia}</p></>}
              {b.ficha?.validador && <><span className="etiqueta">Quién lo valida</span><p>{b.ficha.validador}</p></>}
            </section>
          )}
          <EvidenciaProyecto id={id} />
        </>
      )}

      {sub === 'pieza' && (
        <>
          {b.ficha?.pieza && <section className="re-sec"><span className="etiqueta">Pieza matemática hecha a mano</span><p><b>{b.ficha.pieza}</b></p><p className="sub">Se hace a mano y se contrasta con una referencia.</p></section>}
          {b.tipo === 'ventana' ? <NivelSalida id={id} /> : ventana && salidaDe(ventana).length > 0 ? (
            <>
              <p className="sub">Sale de la ventana {ventana}: su nivel de salida es la base de la pieza.</p>
              <NivelSalida id={ventana} />
            </>
          ) : !b.ficha?.pieza && <p className="sub">Sin pieza matemática en este bloque.</p>}
          {(b.tipo === 'ventana' || ventana) && <a className="fila-link" href={`#/estudio/mate/${b.tipo === 'ventana' ? id : ventana}`}>Libros y refuerzo de {b.tipo === 'ventana' ? id : ventana} <span aria-hidden="true">→</span></a>}
        </>
      )}

      {sub === 'entrega' && (
        <>
          <div className="fila-t pp-sec"><span className="etiqueta">Estándar de entrega</span><span className="mono sub">{capas.filter((c) => p.estandar[c.id as Capa]).length} de {capas.length}</span></div>
          <ul className="pp-capas">
            {capas.map((c) => (
              <li key={c.id}>
                <Casilla checked={!!p.estandar[c.id as Capa]} label={`${c.nombre}: marcar`} onChange={() => marcarCapa(id, c.id as Capa)} />
                <div><b className={p.estandar[c.id as Capa] ? 'resaltado' : ''}>{c.nombre}</b><p className="sub">{c.texto}</p></div>
              </li>
            ))}
          </ul>
          <p className="sub">{p.examen ? `Examen: ${p.examen.puntaje} % el ${f(p.examen.fecha)}.` : 'El proyecto cierra con examen de 85 % o más, la entrevista técnica y la evidencia.'} {cierreProyecto(plan, id) ? 'Proyecto cerrado.' : ''}</p>
        </>
      )}

      {sub === 'resumen' && (
        <nav className="re-nav" aria-label="Otros bloques">
          {ant ? <a href={`#/estudio/prog/${ant.id}`}>← {ant.id}</a> : <span />}
          {sig ? <a href={`#/estudio/prog/${sig.id}`}>{sig.id} →</a> : <span />}
        </nav>
      )}
    </main>
  );
}
