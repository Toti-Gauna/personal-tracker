/**
 * Ola 26 · #/estudio/prog/demanda: qué tecnologías piden las vacantes que cargaste y qué proyecto del plan las
 * cubre. No hay datos de mercado: la tabla arranca vacía y solo cuenta lo que pegás.
 */
import { useMemo, useState } from 'react';
import { leerVacantes, tablaDemanda, type FilaDemanda } from '../data/demanda';
import { T0_PLAN } from '../data/plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { calendarioCompleto } from '../data/plan-vistas';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { borrarVacantes, cargarVacantes, restaurarVacantes } from '../state/plan';
import { useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { Plegable } from '../ui/Plegable';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';
import '../styles/etapas.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const COLOR = RAMA_COLOR.programacion;

const EJEMPLO = `AI Engineer · Empresa X
Stack: Python, LangGraph, RabbitMQ
Buscamos experiencia con agentes y Kubernetes.
---
Backend Java · Empresa Y
Spring Boot, Docker, Azure`;

function Fila({ f }: { f: FilaDemanda }) {
  return (
    <tr className={f.proyecto ? '' : 'sin-proyecto'}>
      <th scope="row">{f.tecnologia}</th>
      <td className="mono">{f.vacantes}</td>
      <td className="mono">{f.proyecto ? <a className="subrayado" href={`#/estudio/prog/${f.proyecto}/stack`}>{f.proyecto}</a> : <span className="sub">sin proyecto</span>}</td>
      <td className="mono sub">{f.fecha ? `${fecha(f.fecha)}${f.cubierta ? ' · lista' : ''}` : '—'}</td>
    </tr>
  );
}

export function Demanda({ day }: { day: DayLog }) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const vacantes = useStore((s) => s.plan.vacantes) ?? [];
  useStore((s) => s.plan.extrasApagados);
  useStore((s) => s.plan.pausaFinDeAnio);
  const [texto, setTexto] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const t = useMemo(() => tablaDemanda(vacantes, calendarioCompleto(t0), day.date), [vacantes, t0, day.date]);

  const cargar = () => {
    const r = leerVacantes(texto, day.date);
    if (!r.ok) { setErrores(r.errores); setAvisos([]); return; }
    if (!r.vacantes.length) { setErrores(['No encontré ninguna vacante.']); return; }
    const ids = cargarVacantes(r.vacantes);
    setTexto('');
    setErrores([]);
    setAvisos(r.avisos);
    toast({ title: `${ids.length} ${ids.length === 1 ? 'vacante cargada' : 'vacantes cargadas'}`, sub: 'La tabla se actualizó', color: COLOR, action: { label: 'Deshacer', run: () => borrarVacantes(ids) } }, false);
  };

  return (
    <main className="pantalla re demanda" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio/prog">Programación</a><span className="mono sub">{t.vacantes} {t.vacantes === 1 ? 'vacante' : 'vacantes'}</span></div>
      <div className="kicker">Programación · tecnologías</div>
      <header><h1 className="titulo">Demanda</h1><p>Qué tecnologías piden las vacantes que cargás y qué proyecto del plan las cubre. No hay datos de mercado: solo cuenta lo que vos pegues.</p></header>

      <section className="re-sec">
        <span className="etiqueta">Cargar vacantes</span>
        <label className="sub" htmlFor="dem-texto">Pegá el texto de una vacante (una por bloque, separadas por una línea ---) o un JSON.</label>
        <textarea id="dem-texto" className="campo-texto dem-texto" rows={5} value={texto} onChange={(e) => { setTexto(e.target.value); setErrores([]); }} placeholder={EJEMPLO} />
        <Plegable id="dem:formato" titulo="Formatos aceptados" resumen="texto o JSON" color={COLOR}>
          <p className="sub">Texto: la primera línea es el rol; una línea <span className="mono">Stack: a, b, c</span> suma lo que diga; el resto se busca entre las tecnologías del plan.</p>
          <pre className="dem-json">{`{ "tipo": "vacantes", "lista": [\n  { "rol": "AI Engineer", "empresa": "X",\n    "stack": ["Python", "LangGraph", "Kubernetes"] }\n] }`}</pre>
        </Plegable>
        {errores.length > 0 && <ul className="dem-errores" role="alert">{errores.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>}
        {avisos.length > 0 && <ul className="dem-avisos sub">{avisos.map((e) => <li key={e}>{e}</li>)}</ul>}
        <button className="btn-principal" disabled={!texto.trim()} onClick={cargar}>Cargar</button>
      </section>

      {t.vacantes === 0 ? (
        <p className="sub dem-vacio">Todavía no cargaste ninguna vacante, así que no hay nada que contar. Cargá una arriba y la tabla se arma sola.</p>
      ) : (
        <section>
          <div className="fila-t"><span className="etiqueta">Lo que piden</span><span className="mono sub">{t.filas.length} tecnologías{t.fueraDelPlan ? ` · ${t.fueraDelPlan} sin proyecto` : ''}</span></div>
          <div className="dem-tabla">
            <table>
              <caption className="sr-only">Tecnologías pedidas por las vacantes, con el proyecto que las cubre y su fecha estimada</caption>
              <thead><tr><th scope="col">Tecnología</th><th scope="col">Vacantes</th><th scope="col">Proyecto</th><th scope="col">Fecha estimada</th></tr></thead>
              <tbody>{t.filas.map((f) => <Fila key={f.clave} f={f} />)}</tbody>
            </table>
          </div>
          <p className="sub">La fecha es el cierre estimado del proyecto con tus semanas extra. "Sin proyecto": una tecnología que piden y el plan no cubre.</p>
        </section>
      )}

      {t.vacantes > 0 && t.sinPedir.length > 0 && (
        <Plegable id="dem:sin-pedir" titulo="Del plan, sin vacantes" resumen={`${t.sinPedir.length} tecnologías`} color={COLOR}>
          <div className="dem-tabla"><table><caption className="sr-only">Tecnologías del plan que ninguna vacante pidió</caption><tbody>{t.sinPedir.map((f) => <Fila key={f.clave} f={f} />)}</tbody></table></div>
        </Plegable>
      )}

      {vacantes.length > 0 && (
        <Plegable id="dem:cargadas" titulo="Vacantes cargadas" resumen={`${vacantes.length}`} color={COLOR}>
          <ul className="dem-lista">
            {vacantes.map((v) => (
              <li key={v.id}>
                <span><b>{v.rol}</b>{v.empresa ? <span className="sub"> · {v.empresa}</span> : null}<small className="mono sub">{v.stack.length ? v.stack.join(' · ') : 'sin tecnologías'}</small></span>
                <button type="button" className="subrayado" aria-label={`Borrar la vacante ${v.rol}`} onClick={() => { borrarVacantes([v.id]); toast({ title: 'Vacante borrada', sub: v.rol, color: COLOR, action: { label: 'Deshacer', run: () => restaurarVacantes([v]) } }, false); }}>Borrar</button>
              </li>
            ))}
          </ul>
        </Plegable>
      )}

      {(PLAN_EXT.backlog?.length ?? 0) > 0 && (
        <Plegable id="dem:backlog" titulo="Backlog sin fecha" resumen={`${PLAN_EXT.backlog!.length}`} color={COLOR}>
          <ul className="dem-lista">
            {PLAN_EXT.backlog!.map((d) => <li key={d.nombre}><span><b>{d.nombre}</b><small className="sub">{d.motivo} · {fecha(d.fecha)}</small></span></li>)}
          </ul>
        </Plegable>
      )}

      {(PLAN_EXT.descartadas?.length ?? 0) > 0 && (
        <Plegable id="dem:descartadas" titulo="Descartado por ahora" resumen={`${PLAN_EXT.descartadas!.length}`} color={COLOR}>
          <ul className="dem-lista">
            {PLAN_EXT.descartadas!.map((d) => <li key={d.nombre}><span><b>{d.nombre}</b><small className="sub">{d.motivo} · {fecha(d.fecha)}</small></span></li>)}
          </ul>
        </Plegable>
      )}
    </main>
  );
}
