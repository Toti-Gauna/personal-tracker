/**
 * §14 · #/metas/open-source: las herramientas open source. Las publicadas primero (paquete, versión, proyecto de origen, descargas
 * a mano y link) y después las que vienen, cada una con sus versiones, el checklist de extracción, "la necesita" en las extraídas,
 * el Imán en los dos lanzamientos y el post del jueves. El escrow de HandyX figura como interno: nunca se publica.
 */
import { useState } from 'react';
import { HERRAMIENTAS, REGLA_HERRAMIENTAS, estadoVersion, herramientasDe, nombreOrigen, presetsAlawys, puedePublicarHerramienta } from '../data/herramientas';
import { PLAN_EXT } from '../data/plan-extendido';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { V122, type Herramienta } from '../data/v12-2';
import { agregarPost, publicarVersionFondo, setItem } from '../state/fondo';
import { marcarHito } from '../state/plan';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { Plegable } from '../ui/Plegable';
import { fp } from '../ui/PeriodoTarjeta';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/periodos.css';

const KIND: Record<Herramienta['kind'], string> = { standalone: 'producto propio', extracted: 'extraída', interna: 'interna' };

/** Los ítems que pueden necesitar una herramienta extraída (todo menos su origen). */
const ITEMS = [
  ...PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto' && b.fechas && !b.archivado).map((b) => ({ id: b.id, nombre: b.nombre })),
  ...V122.secundarias.map((s) => ({ id: s.id, nombre: s.nombre })),
  ...V122.comerciales.map((c) => ({ id: c.id, nombre: `#${c.n} ${c.marca ?? 'a definir'}` })),
];

export function OpenSource({ day }: { day: DayLog }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const publicadas = HERRAMIENTAS.filter((h) => Object.values(plan.fondo?.[h.id]?.versiones ?? {}).some((v) => v.publicada));
  const resto = HERRAMIENTAS.filter((h) => !publicadas.includes(h));
  const ps = presetsAlawys(plan);
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a><span className="mono sub">{publicadas.length} publicadas · {HERRAMIENTAS.length} en el plan</span></div>
      <header><h1 className="titulo">Open source</h1><p>{REGLA_HERRAMIENTAS}</p></header>
      <section aria-label="Publicadas">
        <span className="etiqueta">Publicadas</span>
        {publicadas.length === 0 ? <p className="sub">Todavía ninguna: la primera es Alawys v1.0, el 30 dic.</p> : (
          <ul className="pd-semana">
            {publicadas.map((h) => {
              const e = plan.fondo?.[h.id];
              const ultima = h.versiones.filter((v) => e?.versiones?.[v.id]?.publicada).pop()!;
              return <li key={h.id}><b className="mono">{ultima.id}</b><span>{e?.enlace ? <a href={e.enlace}>{h.paquete}</a> : h.paquete}<small>{nombreOrigen(ultima.origen)} · {e?.descargas != null ? `${e.descargas} descargas` : 'descargas: sin cargar'}</small></span></li>;
            })}
          </ul>
        )}
      </section>
      <span className="etiqueta">Todas · Alawys: {ps.hechos} de {ps.total} presets sumados</span>
      {[...publicadas, ...resto].map((h) => <Tarjeta key={h.id} h={h} hoy={hoy} />)}
    </main>
  );
}

function Tarjeta({ h, hoy }: { h: Herramienta; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const e = plan.fondo?.[h.id] ?? {};
  const [desc, setDesc] = useState(e.descargas != null ? String(e.descargas) : '');
  const posteada = plan.posts?.some((p) => p.item === h.id);
  return (
    <Plegable id={`oss:${h.id}`} titulo={h.nombre} resumen={`${KIND[h.kind]} · ${h.registro}`}>
      <p className="sub">{h.paquete}{h.licencia ? ` · ${h.licencia}` : ''} · origen: {[...new Set(h.versiones.map((v) => nombreOrigen(v.origen)))].join(', ')}</p>
      {h.ficha && <div className="pp-ficha"><dl>{Object.entries({ Puesto: h.ficha.puesto, Descripción: h.ficha.descripcion, Problema: h.ficha.problema, Valor: h.ficha.valor, Diferencial: h.ficha.diferencial, Stack: h.ficha.stack, 'Peso en entrevistas': h.ficha.pesoEntrevistas, 'Imán (hook)': h.ficha.hook, Métrica: h.ficha.metrica }).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>}
      {h.kind === 'extracted' && (
        <label className="ru-campo"><span className="sub">La necesita (el segundo ítem que la usa; sin él no se publica)</span>
          <select className="select-plano" aria-label={`${h.nombre}: la necesita`} value={e.necesitadoPor ?? ''} onChange={(x) => setItem(h.id, { necesitadoPor: x.target.value || undefined })}>
            <option value="">—</option>{ITEMS.filter((i) => i.id !== h.versiones[0].origen).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </label>
      )}
      <ul className="pd-lista">
        {h.versiones.filter((v) => v.donde !== 'recurrente').map((v) => {
          const st = estadoVersion(h, v, plan);
          const g = puedePublicarHerramienta(h, v, plan);
          return (
            <li key={v.id} className="pd-card compacta" aria-label={`${h.nombre} ${v.id}`}>
              <b>{h.nombre} {v.id}{v.lanzamiento ? ' · lanzamiento (Imán)' : ''}</b>
              <span className="sub">{nombreOrigen(v.origen)}{st.fechas ? ` · ${fp(st.fechas.inicio)}${st.fechas.fin !== st.fechas.inicio ? ` – ${fp(st.fechas.fin)}` : ''}` : ''} · {v.linea}</span>
              {h.kind !== 'interna' && (
                <ul className="pd-check">{st.checklist.map((c) => <li key={c.clave}><Casilla checked={c.hecho} label={`${h.nombre} ${v.id}: ${c.texto}`} onChange={() => marcarHito(c.clave, c.hecho ? null : hoy)} /><span>{c.texto}</span></li>)}</ul>
              )}
              {st.publicada ? <span className="sub">Publicada el {fp(st.publicada)} · <button className="subrayado" onClick={() => publicarVersionFondo(h.id, v.id, null)}>Deshacer</button></span>
                : g.ok ? <button className="btn-borde" onClick={() => publicarVersionFondo(h.id, v.id, hoy)}>{h.nombre} {v.id} publicada hoy</button>
                  : <span className="pd-aviso">{h.kind === 'interna' ? 'Interna: nunca se publica.' : `Para publicar falta: ${g.faltan.join(' · ')}`}{v.lanzamiento ? <> · <a href={`#/metas/iman/${h.id}`}>Imán</a></> : null}</span>}
            </li>
          );
        })}
      </ul>
      {h.versiones.some((v) => v.donde === 'recurrente') && <p className="sub">v1.x: {h.versiones.find((v) => v.donde === 'recurrente')!.linea} (la casilla "Preset agregado a Alawys" del arranque de cada proyecto).</p>}
      {h.kind !== 'interna' && (
        <div className="ru-horas">
          <label><span className="sub">Link del paquete</span><input className="campo-texto" aria-label={`${h.nombre}: link`} defaultValue={e.enlace ?? ''} onBlur={(x) => setItem(h.id, { enlace: x.target.value.trim() || undefined })} /></label>
          <label><span className="sub">Descargas (a mano)</span><input className="campo-texto mono" inputMode="numeric" aria-label={`${h.nombre}: descargas`} value={desc} onChange={(x) => setDesc(x.target.value)} onBlur={() => setItem(h.id, { descargas: desc.trim() ? Number(desc) : undefined })} /></label>
        </div>
      )}
      {h.kind !== 'interna' && (posteada ? <p className="sub">Post del jueves: hecho.</p> : <button className="subrayado" onClick={() => agregarPost({ fecha: hoy, canales: ['linkedin-en', 'linkedin-es', 'x'], pista: 'principal', item: h.id })}>Post del jueves hecho hoy</button>)}
    </Plegable>
  );
}

/** En la página de un proyecto (o de un ítem de fondo): la regla y las herramientas que nacen o crecen ahí. */
export function HerramientasDelItem({ id }: { id: string }) {
  const xs = herramientasDe(id);
  return (
    <section className="pd-fase" aria-label="Herramientas">
      <span className="etiqueta">Herramienta open source</span>
      {xs.length ? <ul className="cp-lista">{xs.map(({ h, v }) => <li key={h.id + v.id}><b>{h.nombre} {v.id}</b> · {KIND[h.kind]} · {v.linea}</li>)}</ul> : <p className="sub">Este ítem no saca una herramienta.</p>}
      <p className="sub">{REGLA_HERRAMIENTAS}</p>
      <a className="fila-link" href="#/metas/open-source">Open source <span aria-hidden="true">→</span></a>
    </section>
  );
}

