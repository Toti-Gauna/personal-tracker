/**
 * 7.3 · Proyecto de la rama programación: qué es, qué aprendés, el estándar de entrega de 6
 * capas, el tiempo real contra 55/30/15, las revisiones conmigo (con tipo de error) y qué pasa
 * al cerrar. También sirve para certificaciones y ventanas, con lo que les toca.
 */
import { useState } from 'react';
import { PLAN, TRAMOS, diaSemanaCorto, fechaCorta, fechas, nombreTramo, proyectos, semanaDelPlan, semanasDeTramo, siguienteTramo, T0_PLAN, tramoActivo, tramoPorId, type Capa } from '../data/plan';
import { EVIDENCIAS, proyectoVacio, type TipoError } from '../data/plan-state';
import { Plegable } from '../ui/Plegable';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { guardarExamen, marcarCapa, setTecnica, sumarRevision, sumarTiempo, toggleAgentico } from '../state/plan';
import { atrasoPuerta, puertaAprobada } from '../data/puertas';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { ArquitecturaProyecto, EvidenciaProyecto, ExtrasProyecto, FichaBloque, NivelSalida, VersionExamen, avanceArquitectura } from '../ui/FichaBloque';
import { bloqueExtPorId } from '../data/plan-extendido';
import { bloqueConFechas } from '../data/plan-vistas';
import { MetasBloque } from '../ui/MetasBloque';
import '../styles/etapas.css';
import '../styles/metas.css';

const TIPOS: [TipoError, string, string][] = [
  ['concepto', 'concepto', 'var(--rutina)'],
  ['tecnica', 'técnica', 'var(--economia)'],
  ['descuido', 'descuido', 'var(--sub)'],
];
const CATS: ['nucleo' | 'producto' | 'lanzamiento', string, string][] = [
  ['nucleo', 'Núcleo técnico', 'var(--ing)'],
  ['producto', 'Producto: UX/UI y 3D', 'var(--handyx)'],
  ['lanzamiento', 'Lanzamiento', 'var(--eclipse)'],
];

export function PlanProyecto({ day, id }: { day: DayLog; id?: string }) {
  const date = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const estado = useStore((s) => s.plan.proyectos);
  const arqs = useStore((s) => s.plan.arquitectura);
  const activo = tramoActivo(date, t0);
  // Ola 16c: los bloques de las etapas 3 y 4 no están en el calendario vivo: tienen su ficha propia.
  if (id && !tramoPorId(id) && bloqueConFechas(id, t0)) return <FichaExtendida id={id} t0={t0} />;
  const t = (id && tramoPorId(id)) || activo;
  const p = estado[t.id] ?? proyectoVacio();
  const { inicio, fin } = fechas(t.desde, t.hasta, t0);
  // Ola 24: las semanas de pausa que parten el tramo no cuentan.
  const semanas = semanasDeTramo(t);
  const sHoy = semanaDelPlan(date, t0);
  const enPausa = (t.pausas ?? []).includes(sHoy);
  const semana = Math.max(0, Math.min(semanas, sHoy - t.desde + 1 - (t.pausas ?? []).filter((w) => w < sHoy).length));
  const arq = arqs?.[t.id];
  const conArq = !!bloqueExtPorId(t.id)?.ficha?.entregablesArquitectura;
  const sig = siguienteTramo(t.id);
  const numerados = proyectos().filter((x) => x.id !== 'P0');
  const n = numerados.findIndex((x) => x.id === t.id);
  const i = TRAMOS.findIndex((x) => x.id === t.id);
  const ant = TRAMOS.slice(0, i).reverse().find((x) => x.tipo !== 'descanso' && x.tipo !== 'colchon');
  const desp = TRAMOS.slice(i + 1).find((x) => x.tipo !== 'descanso');
  const par = PLAN.programacion.pares.find((x) => x.includes(t.id));
  const otro = par ? tramoPorId(par[0] === t.id ? par[1] : par[0]) : undefined;
  const conEstandar = t.tipo === 'proyecto' && t.id !== 'P0';
  // TODO(ola 9): textos del estándar por proyecto (el visor 3D de Faro, el de Escudo…); hoy son los generales del plan.
  const capas = PLAN.programacion.estandar;
  const hechas = capas.filter((c) => p.estandar[c.id]).length;
  const titulo = t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'ventana' ? `Ventana ${t.id}` : t.nombre;

  return (
    <main className="pantalla plan-proy">
      <div className="topbar">
        <a className="volver" href="#/metas">Ruta</a>
        <span className="mono" style={{ color: RAMA_COLOR.programacion }}>programacion · {n >= 0 ? `${t.id} de ${numerados.length}` : t.id}</span>
      </div>

      <span className="etiqueta">{[t.industria, t.version, t.tipo === 'cert' ? 'certificación' : t.tipo === 'ventana' ? 'matemática' : null].filter(Boolean).join(' · ') || t.nombre}</span>
      <h1 className="titulo pp-titulo"><span className="resaltado" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>{titulo}</span>{t.tipo === 'proyecto' && t.version ? <small> {t.version}</small> : null}</h1>
      <p className="pp-que">{t.tipo === 'cert' ? t.nombre + '. ' : ''}{t.que}.</p>

      <div className="pp-segs" aria-hidden="true">
        {Array.from({ length: semanas }, (_, k) => <span key={k} className={k + 1 < semana ? 'pas' : k + 1 === semana ? 'on' : ''} />)}
      </div>
      <div className="pp-cuando mono">
        <span><b>{enPausa ? 'pausa de fin de año' : semana >= 1 && sHoy <= t.hasta ? `semana ${semana} de ${semanas}` : sHoy < t.desde ? `empieza el ${fechaCorta(inicio)}` : 'cerrado'}</b> · {fechaCorta(inicio)} — {fechaCorta(fin)}{t.pausas?.length ? ' · con la pausa adentro' : ''}</span>
        {(t.tipo === 'proyecto' || t.tipo === 'cert') && <span className="sub">examen {diaSemanaCorto(fin)} {Number(fin.slice(8))}</span>}
      </div>
      {otro && <p className="sub pp-par">{t.version === 'v1' ? `Vuelve como ${nombreTramo(otro, false)} en ${otro.id}, desde el ${fechaCorta(fechas(otro.desde, otro.hasta, t0).inicio)}.` : `Crece desde ${nombreTramo(otro, false)} (${otro.id}).`}</p>}

      {t.stack && t.stack.length > 0 && (
        <>
          <div className="etiqueta pp-sec">Qué aprendés</div>
          <div className="pp-chips">{t.stack.map((x) => <span key={x} className="mono">{x}</span>)}</div>
          {t.perfil && <p className="pp-perfil">Perfil al cerrar: <b>{t.perfil}</b></p>}
        </>
      )}

      <MetasBloque bloque={t.id} date={date} titulo={`Metas de ${t.id}`} />
      <Plegable id={`proy:${t.id}:ficha`} titulo="Ficha" resumen={t.tipo === 'cert' ? 'costo y versión' : 'feature, tecnología, validador'} color={RAMA_COLOR.programacion}><FichaBloque id={t.id} /></Plegable>
      {t.tipo === 'proyecto' && <Plegable id={`proy:${t.id}:evidencia`} titulo="Puerta de evidencia" resumen={`${EVIDENCIAS.filter(([k]) => p.evidencia?.[k]).length} de 3`}><EvidenciaProyecto id={t.id} /></Plegable>}
      {t.tipo === 'proyecto' && <Plegable id={`proy:${t.id}:extras`} titulo="Semanas extra" resumen={`${semanas} semanas`}><ExtrasProyecto id={t.id} t0={t0} /></Plegable>}
      {conArq && <Plegable id={`proy:${t.id}:arquitectura`} titulo="Arquitectura" resumen={`${avanceArquitectura(arq)} de 4`} color={RAMA_COLOR.programacion}><ArquitecturaProyecto id={t.id} /></Plegable>}
      {t.tipo === 'cert' && <VersionExamen id={t.id} date={date} t0={t0} />}

      {t.tipo === 'ventana' && (
        <>
          <p className="sub">Los bloques de programación pasan a matemática: el avance se registra en <a className="subrayado" href="#/unidades">Unidades</a>.</p>
          <NivelSalida id={t.id} />
          <Puerta id={t.id} date={date} />
        </>
      )}
      {(t.tipo === 'descanso' || t.tipo === 'colchon') && <p className="sub">Sin entrega en esta etapa.</p>}

      {conEstandar && (
        <>
          <Plegable id={`proy:${t.id}:estandar`} titulo="Estándar de entrega" resumen={`${hechas} de ${capas.length}`} color={RAMA_COLOR.programacion}>
          <ul className="pp-capas">
            {capas.map((c) => (
              <li key={c.id}>
                <Casilla checked={!!p.estandar[c.id as Capa]} label={`${c.nombre}: marcar`} onChange={() => marcarCapa(t.id, c.id as Capa)} />
                <div>
                  <b className={p.estandar[c.id as Capa] ? 'resaltado' : ''} style={{ ['--c' as string]: RAMA_COLOR.programacion }}>{c.nombre}</b>
                  <p className="sub">{c.texto}</p>
                </div>
              </li>
            ))}
          </ul>
          </Plegable>
          <Tiempo id={t.id} tiempo={p.tiempo} />
        </>
      )}

      {(t.tipo === 'proyecto' || t.tipo === 'cert') && <Revisiones id={t.id} date={date} revisiones={p.revisiones} />}
      {(t.tipo === 'proyecto' || t.tipo === 'cert') && <Examen id={t.id} date={date} examen={p.examen} />}
      {t.tipo === 'proyecto' && t.id !== 'P0' && <Tecnica id={t.id} date={date} />}
      {t.tipo === 'proyecto' && <Agentico id={t.id} />}
      {PLAN.programacion.creditos[t.id] != null && (
        <p className="sub pp-creditos mono">créditos de la API de Claude: US$ {PLAN.programacion.creditos[t.id]} de {PLAN.programacion.creditos.total} · tope por agente y evals con un modelo chico</p>
      )}

      {(t.tipo === 'proyecto' || t.tipo === 'cert') && (
        <div className="pr-card pp-cerrar">
          <span className="etiqueta">Al cerrar · {diaSemanaCorto(fin)} {fechaCorta(fin)}</span>
          {t.tipo === 'proyecto' && t.id !== 'P0' ? (
            <p>Examen de programación conmigo; el resultado entra como JSON. {nombreTramo(t, false)} se entrega a <b style={{ color: RAMA_COLOR.trabajo }}>trabajo</b> (portfolio y demo) y a <b style={{ color: 'var(--eclipse)' }}>Eclipse</b> (producto vendible).</p>
          ) : t.tipo === 'cert' ? (
            <p>El examen de {t.corto ?? t.nombre}: con la certificación aprobada entra al CV y al perfil de LinkedIn (<b style={{ color: RAMA_COLOR.trabajo }}>trabajo</b>).</p>
          ) : (
            <p>La base queda lista para los proyectos del plan.</p>
          )}
          {sig && <span className="mono sub">Sigue: {sig.id} · {sig.tipo === 'cert' ? sig.corto ?? sig.nombre : sig.nombre}{sig.industria ? ` · ${sig.industria}` : ''} · {fechaCorta(fechas(sig.desde, sig.hasta, t0).inicio)}</span>}
        </div>
      )}

      <nav className="pp-nav">
        {ant ? <a className="subrayado" href={`#/metas/proyecto/${ant.id}`}>← {ant.id}</a> : <span />}
        {t.id !== activo.id && <a className="subrayado" href="#/metas/proyecto">En curso</a>}
        {desp ? <a className="subrayado" href={`#/metas/proyecto/${desp.id}`}>{desp.id} →</a> : <span />}
      </nav>
    </main>
  );
}

function Tiempo({ id, tiempo }: { id: string; tiempo: { nucleo: number; producto: number; lanzamiento: number } }) {
  const total = tiempo.nucleo + tiempo.producto + tiempo.lanzamiento;
  const plan = PLAN.programacion.presupuesto;
  return (
    <Plegable id={`proy:${id}:tiempo`} titulo={`Tiempo real contra ${plan.nucleo} / ${plan.producto} / ${plan.lanzamiento}`} resumen={`${Math.round((total / 60) * 10) / 10} h`}>
      <ul className="pp-tiempo">
        {CATS.map(([k, nombre, color]) => {
          const pct = total ? Math.round((tiempo[k] / total) * 100) : 0;
          return (
            <li key={k} style={{ ['--c' as string]: color }}>
              <div className="pp-tiempo-cab">
                <span>{nombre}</span>
                <span className="mono sub">{total ? `${pct} %` : '—'} · plan {plan[k]} %</span>
                <button className="mg-mas chico" aria-label={`Sumar 30 minutos a ${nombre}`} onClick={() => sumarTiempo(id, k, 30)}>+30</button>
              </div>
              <div className="pp-barra"><span style={{ width: `${pct}%` }} /><i style={{ left: `${plan[k]}%` }} /></div>
            </li>
          );
        })}
      </ul>
      <p className="sub">La línea punteada es el plan. Si el tiempo no alcanza, se recorta producto, nunca tests ni seguridad.</p>
    </Plegable>
  );
}

function Revisiones({ id, date, revisiones }: { id: string; date: string; revisiones: { fecha: string; texto: string; tipo: TipoError }[] }) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<TipoError>('concepto');
  const lista = [...revisiones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    sumarRevision(id, date, texto.trim(), tipo);
    setTexto('');
  };
  return (
    <Plegable id={`proy:${id}:revisiones`} titulo="Revisiones conmigo" resumen={lista.length ? `${lista.length} cargada${lista.length === 1 ? '' : 's'}` : 'ninguna'}>
      <a className="subrayado" href="#/flojo">Puntos débiles →</a>
      <ul className="pp-revs">
        {lista.map((r, k) => {
          const tp = TIPOS.find((x) => x[0] === r.tipo)!;
          return (
            <li key={k}>
              <span className="mono sub">{fechaCorta(r.fecha)}</span>
              <span>{r.texto}</span>
              <span className="mono" style={{ color: tp[2] }}>{tp[1]}</span>
            </li>
          );
        })}
      </ul>
      {!lista.length && <p className="sub">Todavía no hay revisiones. Cuando reviso tu código, cargá acá lo que falló y de qué tipo fue.</p>}
      <form className="pp-rev-form" onSubmit={agregar}>
        <input className="campo-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Qué falló en la revisión" aria-label="Qué falló en la revisión" />
        <div className="segmentado" role="radiogroup" aria-label="Tipo de error">
          {TIPOS.map(([k, nombre]) => <button key={k} type="button" role="radio" aria-checked={tipo === k} onClick={() => setTipo(k)}>{nombre}</button>)}
        </div>
        <button type="submit" className="btn-borde" disabled={!texto.trim()}>Agregar revisión</button>
      </form>
    </Plegable>
  );
}

function Examen({ id, date, examen }: { id: string; date: string; examen?: { fecha: string; puntaje: number } }) {
  const [v, setV] = useState('');
  const n = Number(v);
  return (
    <Plegable id={`proy:${id}:examen`} titulo="Examen" resumen={examen ? `${examen.puntaje} % · ${fechaCorta(examen.fecha)}` : 'sin cargar'} abierto>
      <form className="pp-examen" onSubmit={(e) => { e.preventDefault(); if (n >= 0 && n <= 100 && v !== '') { guardarExamen(id, date, n); setV(''); } }}>
        <input className="campo-texto mono" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Puntaje" aria-label="Puntaje del examen (0 a 100)" />
        <button type="submit" className="btn-borde" disabled={v === '' || n > 100}>{examen ? 'Cambiar' : 'Guardar'}</button>
      </form>
      <p className="sub">{id.startsWith('W') ? 'Con 85 % o más la puerta queda aprobada.' : 'Con 85 % o más y la entrevista técnica completa, el proyecto queda cerrado.'} También entra con el JSON del examen (Importar JSON).</p>
    </Plegable>
  );
}

/** La puerta de matemática de una ventana: qué proyecto abre y cuánto atraso suma. */
function Puerta({ id, date }: { id: string; date: string }) {
  const plan = useStore((s) => s.plan);
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const abre = PLAN.programacion.puertas[id];
  const ok = puertaAprobada(plan, id);
  const atraso = atrasoPuerta(plan, id, date, t0);
  return (
    <>
      <div className="pr-card pp-puerta" style={{ borderColor: ok ? 'var(--salud)' : RAMA_COLOR.matematica }}>
        <span className="etiqueta" style={{ color: RAMA_COLOR.matematica }}>Puerta {id} · abre {abre}</span>
        <p>{ok ? `Aprobada el ${fechaCorta(ok)}: ${abre} puede arrancar.` : `${abre} no arranca hasta aprobar los tests del tema (85 % o más). Mientras, los bloques de programación son de matemática pura.`}</p>
        {atraso > 0 && <p className="sub">+{atraso} {atraso === 1 ? 'semana' : 'semanas'} de atraso: corren las fechas siguientes y se descuentan del colchón.</p>}
      </div>
      <Examen id={id} date={date} examen={plan.proyectos[id]?.examen} />
    </>
  );
}

/** Entrevista técnica dentro del proyecto: diseño de 2 páginas, 6 a 8 ejercicios con tests y defensa de 45 min. */
function Tecnica({ id, date }: { id: string; date: string }) {
  const t = useStore((s) => s.plan.proyectos[id]?.tecnica) ?? {};
  const cfg = PLAN.programacion.tecnica;
  const n = t.ejercicios ?? 0;
  const completa = !!(t.diseno && n >= cfg.ejercicios[0] && t.defensa);
  return (
    <Plegable id={`proy:${id}:tecnica`} titulo="Entrevista técnica del proyecto" resumen={completa ? 'completa' : `${[t.diseno, n >= cfg.ejercicios[0], t.defensa].filter(Boolean).length} de 3`}>
      <ul className="pp-capas">
        <li>
          <Casilla checked={!!t.diseno} label="Documento de diseño: marcar" onChange={() => setTecnica(id, { diseno: !t.diseno })} />
          <div><b>Documento de diseño</b><p className="sub">{cfg.paginasDiseno} páginas: requisitos, carga, componentes, API, trade-offs, fallas, costos y seguridad (prompt 21).</p></div>
        </li>
        <li>
          <span className="pp-num mono">{n}/{cfg.ejercicios[1]}</span>
          <div>
            <b>Set de algoritmos con tests</b>
            <p className="sub">{cfg.ejercicios[0]} a {cfg.ejercicios[1]} ejercicios atados al código del proyecto (prompt 20). {cfg.sesionesPorSemana} sesiones de 45 min por semana: 2 de algoritmos y 1 de diseño.</p>
            <span className="pp-mas"><button className="mg-mas chico" onClick={() => setTecnica(id, { ejercicios: Math.max(0, n - 1) })} aria-label="Restar un ejercicio">−</button><button className="mg-mas chico" onClick={() => setTecnica(id, { ejercicios: Math.min(cfg.ejercicios[1], n + 1) })} aria-label="Sumar un ejercicio">+1</button></span>
          </div>
        </li>
        <li>
          <Casilla checked={!!t.defensa} label="Defensa simulada aprobada: marcar" onChange={() => setTecnica(id, { defensa: t.defensa ? null : date })} />
          <div><b>Defensa simulada de {cfg.defensaMin} min</b><p className="sub">{t.defensa ? `Aprobada el ${fechaCorta(t.defensa)}.` : 'Con la rúbrica del prompt 21: requisitos, estimación, trade-offs, fallas y comunicación.'}</p></div>
        </li>
      </ul>
      <p className="sub">El proyecto no se marca como cerrado sin estos tres.</p>
    </Plegable>
  );
}

/** Un servidor MCP y un agente con trazas por proyecto (prompt 22). */
function Agentico({ id }: { id: string }) {
  const p = useStore((s) => s.plan.proyectos[id]);
  return (
    <Plegable id={`proy:${id}:agentico`} titulo="Portfolio agéntico" resumen={`${[p?.mcp, p?.agente].filter(Boolean).length} de 2`}>
      <ul className="pp-capas">
        <li><Casilla checked={!!p?.mcp} label="Servidor MCP publicado: marcar" onChange={() => toggleAgentico(id, 'mcp')} /><div><b>Servidor MCP publicado</b><p className="sub">Herramientas tipadas, 5 tests, 10 evals y README con instalación en una línea (prompt 22).</p></div></li>
        <li><Casilla checked={!!p?.agente} label="Agente con trazas: marcar" onChange={() => toggleAgentico(id, 'agente')} /><div><b>Agente con trazas</b><p className="sub">Con tokens, latencia y costo a la vista; suma a "Preguntale a mis proyectos".</p></div></li>
      </ul>
    </Plegable>
  );
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fl = (d: string) => `${Number(d.slice(8))} ${MESES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/** Ficha de un bloque de las etapas 3 y 4 (quant y aeroespacial). */
function FichaExtendida({ id, t0 }: { id: string; t0: string }) {
  const b = bloqueConFechas(id, t0)!;
  const ETAPA = ['', 'núcleo', 'ciberseguridad', 'quant trading', 'ingeniería aeroespacial'];
  return (
    <main className="pantalla plan-proy">
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono" style={{ color: RAMA_COLOR.programacion }}>etapa {b.etapa} · {b.id}</span></div>
      <span className="etiqueta">{[b.ficha?.rubro && !ETAPA[b.etapa].includes(b.ficha.rubro) ? b.ficha.rubro : null, `etapa ${b.etapa} · ${ETAPA[b.etapa]}`].filter(Boolean).join(' · ')}</span>
      <h1 className="titulo pp-titulo"><span className="resaltado" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>{b.nombre}</span></h1>
      <div className="pp-cuando mono"><span><b>{b.semanas} semanas{b.semanas > b.base ? ` (${b.base} + ${b.semanas - b.base} extra)` : ''}</b> · {fl(b.inicio)} — {fl(b.fin)}</span></div>
      {b.dependeDe?.length ? <p className="sub">Va después de la ventana {b.dependeDe.join(' y ')}: sin aprobarla con 85 %, no arranca.</p> : null}
      <FichaBloque id={b.id} />
      {b.tipo === 'proyecto' && <EvidenciaProyecto id={b.id} />}
      {b.tipo === 'proyecto' && <Plegable id={`proy:${b.id}:extras`} titulo="Semanas extra" resumen={`${b.semanas} semanas`}><ExtrasProyecto id={b.id} t0={t0} /></Plegable>}
      {b.ficha?.entregablesArquitectura && <Plegable id={`proy:${b.id}:arquitectura`} titulo="Arquitectura" resumen="contrato, trazas, mTLS y ADR"><ArquitecturaProyecto id={b.id} /></Plegable>}
      {b.etapa === 3 && <p className="sub">Plan de estudio e ingeniería, no asesoramiento financiero. Capital real: nada hasta cumplir la puerta escrita (12 semanas o más de paper trading, kill-switch probado y límite de pérdida fijado antes).</p>}
      {b.etapa === 4 && <p className="sub">Modelos educativos y datos públicos o sintéticos; ningún modelo controla hardware real.</p>}
    </main>
  );
}

