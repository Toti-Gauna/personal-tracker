/**
 * Ola 31 · #/estudio/prog/algoritmos: los algorithm spots plantados en los proyectos (roadmap v7) y el sprint sin IA. Cada tema dice
 * en qué proyecto va y si es con IA o sin IA; registrarlo guarda cuándo, en qué proyecto y la pregunta de entrevista que responde (y
 * arma la línea para `docs/learning.md`). El sprint sin IA son 14 días de 30 min antes de cada ciclo de entrevistas técnicas; los
 * problemas resueltos se cuentan contra ≈ 100.
 */
import { useState } from 'react';
import { ALG, estadoTemas, lineaLearning, problemas, sprintActivo, type EstadoTema } from '../data/algoritmos';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { agregarTemaAlgoritmo, borrarTemaAlgoritmo, cortarSprintSinIA, iniciarSprintSinIA, registrarSpot, sumarProblemas } from '../state/plan';
import { useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { Casilla } from '../ui/Casilla';
import { Plegable } from '../ui/Plegable';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';
import '../styles/etapas.css';
import '../styles/algoritmos.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const COLOR = RAMA_COLOR.programacion;
const MODO = { 'con-ia': 'con IA', 'sin-ia': 'sin IA' } as const;

function Tema({ t, hoy }: { t: EstadoTema; hoy: string }) {
  const r = t.registro;
  const [pregunta, setPregunta] = useState(r?.pregunta ?? '');
  const guardar = (cambios: Partial<NonNullable<EstadoTema['registro']>>) => registrarSpot(t.id, { fecha: r?.fecha ?? hoy, proyecto: r?.proyecto ?? t.proyectos[0], pregunta: pregunta.trim() || undefined, ...(r?.validado ? { validado: true } : {}), ...cambios });
  const copiar = () => {
    const linea = lineaLearning(t, r!);
    navigator.clipboard?.writeText(linea).then(() => toast({ title: 'Copiado para learning.md', sub: t.tema, color: COLOR }, false), () => undefined);
  };
  return (
    <li className={`alg-tema ${t.estado}`}>
      <div className="fila-t">
        <b>{t.tema}</b>
        <span className={`alg-modo ${t.modo} mono`}>{MODO[t.modo]}</span>
      </div>
      <p className="sub mono">{t.proyectos.join(', ')}{t.donde ? ` · ${t.donde}` : ''}{r ? ` · registrado el ${fecha(r.fecha)}` : ''}</p>
      <label className="alg-preg">
        <span className="sub">Pregunta de entrevista que responde</span>
        <input className="campo-texto" value={pregunta} onChange={(e) => setPregunta(e.target.value)} onBlur={() => (r || pregunta.trim()) && guardar({})} placeholder="¿Cómo implementarías un LRU en O(1)?" />
      </label>
      <div className="alg-acc">
        {r ? (
          <>
            <label><Casilla checked={!!r.validado} label={`${t.tema}: ${t.modo === 'con-ia' ? 'validado en voz alta' : 'tests en verde'}`} onChange={() => guardar({ validado: !r.validado })} /> {t.modo === 'con-ia' ? 'Validé complejidad, bordes y cambios en voz alta' : 'Lo escribí yo y pasan los tests'}</label>
            <button className="subrayado" onClick={copiar}>Copiar para learning.md</button>
            <button className="subrayado" onClick={() => registrarSpot(t.id, null)}>Deshacer</button>
          </>
        ) : <button className="btn-borde" onClick={() => guardar({})}>Lo planté hoy</button>}
        {t.propio && <button className="subrayado" onClick={() => borrarTemaAlgoritmo(t.id)}>Borrar tema</button>}
      </div>
    </li>
  );
}

function NuevoTema() {
  const [tema, setTema] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [modo, setModo] = useState<'con-ia' | 'sin-ia'>('sin-ia');
  const agregar = () => {
    agregarTemaAlgoritmo({ tema: tema.trim(), proyectos: proyecto.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean), modo });
    setTema('');
    setProyecto('');
  };
  return (
    <div className="alg-nuevo">
      <input className="campo-texto" aria-label="Tema nuevo" placeholder="Trie, union-find, segment tree…" value={tema} onChange={(e) => setTema(e.target.value)} />
      <input className="campo-texto mono" aria-label="Proyecto del tema nuevo" placeholder="P8" value={proyecto} onChange={(e) => setProyecto(e.target.value)} />
      <select className="campo-texto" aria-label="Modo del tema nuevo" value={modo} onChange={(e) => setModo(e.target.value as 'con-ia' | 'sin-ia')}>
        <option value="sin-ia">sin IA</option>
        <option value="con-ia">con IA</option>
      </select>
      <button className="btn-borde" disabled={!tema.trim()} onClick={agregar}>Agregar tema</button>
    </div>
  );
}

export function Algoritmos({ day }: { day: DayLog }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const ts = estadoTemas(plan);
  const sprint = sprintActivo(plan, hoy);
  const total = problemas(plan);
  const hoyN = plan.problemasSinIA?.[hoy] ?? 0;
  const hechos = ts.filter((t) => t.estado === 'hecho').length;
  const faltan = Math.max(0, ALG.temasRoadmap - ts.length);
  const proyectos = [...new Set(ts.flatMap((t) => t.proyectos.slice(0, 1)))];
  return (
    <main className="pantalla re alg" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio/prog">Programación</a><span className="mono sub">{hechos} de {ts.length} temas</span></div>
      <div className="kicker">Programación · entrevistas técnicas</div>
      <header><h1 className="titulo">Algoritmos</h1><p>Los algorithm spots plantados en los proyectos. Con IA: {ALG.modos['con-ia'].charAt(0).toLowerCase() + ALG.modos['con-ia'].slice(1)} Sin IA: {ALG.modos['sin-ia'].charAt(0).toLowerCase() + ALG.modos['sin-ia'].slice(1)}</p></header>

      <section className="cal-factor alg-sprint" aria-labelledby="alg-sp">
        <span className="etiqueta" id="alg-sp">Sprint sin IA</span>
        {sprint ? (
          <>
            <b className="dif-fin">Día {sprint.dia} de {ALG.sprint.dias}</b>
            <span className="sub">Hasta el {fecha(sprint.fin)}: {ALG.sprint.minPorDia} min por día al arrancar el proyecto de la mañana (en Hoy aparece como "Algoritmos sin IA").</span>
            <div className="alg-cont">
              <button className="btn-borde" aria-label="Un problema menos" disabled={!hoyN} onClick={() => sumarProblemas(hoy, -1)}>−</button>
              <span className="mono"><b>{hoyN}</b> {hoyN === 1 ? 'problema' : 'problemas'} hoy</span>
              <button className="btn-borde" aria-label="Un problema resuelto" onClick={() => sumarProblemas(hoy, 1)}>+</button>
            </div>
            <button className="subrayado" onClick={() => cortarSprintSinIA(hoy)}>Terminar el sprint</button>
          </>
        ) : (
          <>
            <span className="sub">{ALG.sprint.dias} días de {ALG.sprint.minPorDia} min. {ALG.sprint.cuando}.</span>
            <button className="btn-principal" onClick={() => { iniciarSprintSinIA(hoy); toast({ title: 'Sprint sin IA', sub: `${ALG.sprint.dias} días desde hoy`, color: COLOR }, false); }}>Arrancar el sprint hoy</button>
          </>
        )}
        <span className="sub mono">{total} de ≈ {ALG.metaProblemas} problemas sin IA · {(plan.sprintsSinIA ?? []).length} {(plan.sprintsSinIA ?? []).length === 1 ? 'sprint' : 'sprints'}</span>
      </section>

      {proyectos.map((p) => {
        const del = ts.filter((t) => t.proyectos[0] === p);
        return (
          <Plegable key={p} id={`alg:${p}`} titulo={`${p} · ${del.length} ${del.length === 1 ? 'tema' : 'temas'}`} resumen={`${del.filter((t) => t.estado !== 'pendiente').length} plantados`} color={COLOR}>
            <ul className="alg-lista">{del.map((t) => <Tema key={t.id} t={t} hoy={hoy} />)}</ul>
          </Plegable>
        );
      })}

      <section className="re-sec">
        <span className="etiqueta">Temas</span>
        <p className="sub">{faltan > 0 ? `El roadmap habla de ${ALG.temasRoadmap} temas y la tabla trae ${ALG.temas.length}: faltan ${faltan}. Sumalos acá.` : `${ts.length} temas cargados.`} {ALG.registro}</p>
        <NuevoTema />
      </section>
    </main>
  );
}
