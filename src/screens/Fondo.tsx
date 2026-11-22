/**
 * v12.2 · las pistas de fondo y el Imán.
 *  - #/metas/pista/secundaria: las 4 apps en secuencia con sus versiones, y el backlog "Ver a futuro".
 *  - #/metas/pista/comercial: los 23 slots como pipeline (planificado → en construcción → en revisión → publicado → ofrecido).
 *  - #/metas/fondo/<id>: una app secundaria, un slot comercial o un proyecto principal (repo, demo, lanzamiento, versiones,
 *    revisión en primer plano, seguridad, leads).
 *  - #/metas/iman/<id>: los 8 puntos del Imán y la serie de posts.
 *  - #/metas/roadmap: el plan entero en una página, con la línea de fondo de cada bloque.
 */
import { useMemo, useState } from 'react';
import { AVANCE_ESTADO, ESTADOS_COMERCIAL, ESTADO_COMERCIAL_TXT, faltaForeground, lanzamientoDe, periodosSecundarias, type EstadoComercial, type Lead } from '../data/fondo';
import { PASOS_ANTES, PASOS_SERIE, PASO_TXT, REGLAS_EXTRA, SEGURIDAD, puedePublicar, puntosIman, type Canal, type PasoSerie } from '../data/iman';
import { medir } from '../data/periodos';
import { PLAN_EXT } from '../data/plan-extendido';
import { fichaV7 } from '../data/proyectos-v7';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { V122, comercial, secundaria } from '../data/v12-2';
import { agregarLead, agregarPost, estadoLead, marcarForeground, marcarSeguridad, publicarVersionFondo, setIman, setItem } from '../state/fondo';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { DetalleProyecto } from '../ui/DetalleProyecto';
import { HerramientasDelItem } from './OpenSource';
import { Plegable } from '../ui/Plegable';
import { PeriodoTarjeta, fp } from '../ui/PeriodoTarjeta';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/periodos.css';

const AREA_TXT: Record<string, string> = { dinero: 'plata', 'datos personales': 'datos personales', seguridad: 'seguridad', 'smart contracts': 'smart contracts' };

/** Un campo de texto que guarda al salir. */
function Campo({ label, valor, guardar, placeholder }: { label: string; valor?: string; guardar: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(valor ?? '');
  return (
    <label className="ru-campo"><span className="sub">{label}</span>
      <input className="campo-texto" aria-label={label} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (valor ?? '') && guardar(v.trim())} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
    </label>
  );
}

export function Pista({ day, tipo }: { day: DayLog; tipo: string }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const esSec = tipo === 'secundaria';
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a><a className="mono sub" href={`#/metas/pista/${esSec ? 'comercial' : 'secundaria'}`}>{esSec ? 'Comercial →' : 'Secundaria →'}</a></div>
      <header>
        <h1 className="titulo">{esSec ? 'Pista secundaria' : 'Pista comercial'}</h1>
        <p>{esSec
          ? 'Tus apps, hechas por Claude Code de fondo, una por vez (con un relevo corto). No usan horas de foco ni suman a las 72 h: se revisan 1 h por semana en la revisión del domingo.'
          : 'Showcases premium para marcas reales, uno por ventana que no es proyecto principal. Se revisan solo en el cierre del día y en la sesión del fin de semana.'}</p>
      </header>
      {esSec ? <Secundarias hoy={hoy} /> : (
        <div className="pd-pipe">
          {ESTADOS_COMERCIAL.map((e) => {
            const xs = V122.comerciales.filter((c) => (plan.fondo?.[c.id]?.estado ?? 'planned') === e);
            return (
              <section key={e} aria-label={ESTADO_COMERCIAL_TXT[e]}>
                <h3>{ESTADO_COMERCIAL_TXT[e]} · {xs.length}</h3>
                <ul className="pd-semana">
                  {xs.map((c) => {
                    const marca = c.marca ?? plan.fondo?.[c.id]?.marca;
                    const leads = plan.fondo?.[c.id]?.leads?.length ?? 0;
                    return <li key={c.id}><b className="mono">#{c.n}</b><a href={`#/metas/fondo/${c.id}`}>{marca ?? 'A definir: elegí la marca'}<small>{fp(c.inicio)} – {fp(c.fin)} · {c.ventana}{leads ? ` · ${leads} leads` : ''}{plan.fondo?.[c.id]?.pausado ? ' · en pausa' : ''}</small></a></li>;
                  })}
                  {!xs.length && <li><span className="sub">—</span></li>}
                </ul>
              </section>
            );
          })}
          <p className="sub">Leads en total: {V122.comerciales.reduce((s, c) => s + (plan.fondo?.[c.id]?.leads?.length ?? 0), 0)}. Ningún slot cae en el PNPT ni dentro de un proyecto principal.</p>
        </div>
      )}
    </main>
  );
}

function Secundarias({ hoy }: { hoy: string }) {
  const plan = useStore((s) => s.plan);
  const apps = useMemo(() => periodosSecundarias(plan).map((p) => medir(p, hoy)), [plan, hoy]);
  return (
    <>
      <ul className="pd-lista">
        {apps.map((a) => (
          <li key={a.id}>
            <PeriodoTarjeta p={a} hoy={hoy} enlace={false} compacta />
            <a className="fila-link" href={`#/metas/fondo/${a.id}`}>{a.nombre}: versiones, repo e Imán <span aria-hidden="true">→</span></a>
          </li>
        ))}
      </ul>
      <span className="etiqueta">Ver a futuro · desde el 7 sep 2027 la pista queda libre (se elige el 29 ago)</span>
      <ul className="cp-lista">{V122.backlog.map((b) => <li key={b.nombre}>{b.nombre}{b.destacado ? ' ⭐' : ''}</li>)}</ul>
    </>
  );
}

/** Una app secundaria, un slot comercial o un proyecto principal. */
export function FondoItem({ day, id }: { day: DayLog; id: string }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const sec = secundaria(id);
  const com = comercial(id);
  const principal = !sec && !com ? PLAN_EXT.bloques.find((b) => b.id === id && b.tipo === 'proyecto') : undefined;
  const e = plan.fondo?.[id] ?? {};
  const versiones = sec ? sec.versiones : com ? [{ id: '1.0' }] : fichaV7(id)?.versiones ?? [];
  const lanz = lanzamientoDe(versiones, e.lanzamiento);
  const iman = puntosIman(plan.iman?.[id]);
  if (!sec && !com && !principal) return <main className="pantalla et-pag"><div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a></div><p className="sub">No hay un ítem con ese id.</p></main>;
  const nombre = sec?.nombre ?? (com ? `#${com.n} · ${com.marca ?? e.marca ?? 'A definir'}` : principal!.nombre);
  const volver = sec ? '#/metas/pista/secundaria' : com ? '#/metas/pista/comercial' : `#/metas/periodos/${id}`;
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href={volver}>{sec ? 'Secundaria' : com ? 'Comercial' : principal!.nombre}</a><a className="mono sub" href={`#/metas/iman/${id}`}>Imán {iman.filter((p) => p.ok).length}/8 →</a></div>
      <header>
        <h1 className="titulo">{nombre}</h1>
        {sec && <p>{sec.descripcion}</p>}
        {com && <p>{com.queSeHace ?? 'Elegí la marca y qué se construye.'}</p>}
      </header>
      {sec && (
        <div className="pp-ficha"><dl>
          <div><dt>Fechas</dt><dd>{fp(sec.inicio)} – {fp(sec.fin)}</dd></div>
          <div><dt>Valor</dt><dd>{sec.valor}</dd></div>
          <div><dt>Diferencial</dt><dd>{sec.diferencial}</dd></div>
          <div><dt>Rol</dt><dd>{sec.rol} · peso en entrevistas: {sec.peso}</dd></div>
          <div><dt>Empresas</dt><dd>{sec.empresas.join(', ')}</dd></div>
          <div><dt>Stack</dt><dd>dev: {sec.stack.dev} · staging: {sec.stack.staging} · prod: {sec.stack.prod}</dd></div>
        </dl></div>
      )}
      {com && (
        <div className="pp-ficha"><dl>
          <div><dt>Fechas</dt><dd>{fp(com.inicio)} – {fp(com.fin)} · {com.ventana}</dd></div>
          {com.wow && <div><dt>Momento wow</dt><dd>{com.wow}</dd></div>}
          {com.reusa && <div><dt>Reusa</dt><dd>{com.reusa}</dd></div>}
        </dl></div>
      )}
      {principal && <DetalleProyecto id={id} />}
      {com && !com.marca && <Campo label="Marca o rubro" valor={e.marca} guardar={(v) => setItem(id, { marca: v || undefined })} placeholder="Elegí la marca" />}
      <Campo label="Repo" valor={e.repo} guardar={(v) => setItem(id, { repo: v || undefined })} placeholder="https://github.com/…" />
      <Campo label="Demo" valor={e.demo} guardar={(v) => setItem(id, { demo: v || undefined })} placeholder="https://…" />
      {!com && (
        <label className="ru-campo"><span className="sub">Lanzamiento público (lleva el Imán)</span>
          <select className="select-plano" aria-label="Versión de lanzamiento" value={lanz} onChange={(x) => setItem(id, { lanzamiento: x.target.value })}>
            {versiones.map((v) => <option key={v.id} value={v.id}>v{v.id}</option>)}
          </select>
        </label>
      )}
      {sec && <VersionesSecundaria id={id} hoy={hoy} lanzamiento={lanz} />}
      {(sec || com) && <HerramientasDelItem id={id} />}
      {com && <Comercial id={id} hoy={hoy} />}
    </main>
  );
}

function VersionesSecundaria({ id, hoy, lanzamiento }: { id: string; hoy: string; lanzamiento: string }) {
  const plan = useStore((s) => s.plan);
  const app = secundaria(id)!;
  const periodo = medir(periodosSecundarias(plan).find((p) => p.id === id)!, hoy);
  return (
    <section aria-label="Versiones">
      <span className="etiqueta">Versiones</span>
      <ul className="pd-lista">
        {app.versiones.map((v, i) => {
          const r = plan.fondo?.[id]?.versiones?.[v.id] ?? {};
          const g = puedePublicar({ version: v.id, lanzamiento, iman: plan.iman?.[id], faltaForeground: faltaForeground(v.revisionForeground, r.foreground) });
          return (
            <li key={v.id}>
              <PeriodoTarjeta p={periodo.hijos![i]} hoy={hoy} enlace={false} />
              {v.revisionForeground?.length ? (
                <div className="cp-mocks"><Casilla checked={!!r.foreground} label={`v${v.id}: revisión en primer plano hecha`} onChange={() => marcarForeground(id, v.id, r.foreground ? null : hoy)} /><span>Revisión en primer plano hecha <span className="sub">(toca {v.revisionForeground.map((a) => AREA_TXT[a]).join(', ')})</span></span></div>
              ) : null}
              {r.publicada
                ? <p className="sub">Publicada el {fp(r.publicada)} · <button className="subrayado" onClick={() => publicarVersionFondo(id, v.id, null)}>Deshacer</button></p>
                : g.ok ? <button className="btn-borde" onClick={() => publicarVersionFondo(id, v.id, hoy)}>v{v.id} publicada hoy</button>
                  : <p className="pd-aviso" role="alert">Para publicar la v{v.id} falta: {g.faltan.join(' · ')}</p>}
            </li>
          );
        })}
      </ul>
      {app.id === 'handyx' && <p className="sub">{REGLAS_EXTRA.cripto} · {REGLAS_EXTRA.pagos} · {REGLAS_EXTRA.voz}</p>}
      {app.id === 'clip-studio' && <p className="sub">{REGLAS_EXTRA.clip}</p>}
    </section>
  );
}

function Comercial({ id, hoy }: { id: string; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const c = comercial(id)!;
  const e = plan.fondo?.[id] ?? {};
  const seg = plan.seguridadShowcase?.[id];
  const [lead, setLead] = useState('');
  const estado = e.estado ?? 'planned';
  const g = puedePublicar({ version: '1.0', lanzamiento: '1.0', iman: plan.iman?.[id], comercial: true, seguridad: seg });
  const cambiar = (x: EstadoComercial) => {
    if ((x === 'published' || x === 'pitched') && !g.ok) return;
    setItem(id, { estado: x });
  };
  const texto = `${c.queSeHace ?? ''} ${c.wow ?? ''}`.toLowerCase();
  return (
    <>
      <section aria-label="Estado">
        <span className="etiqueta">Estado · avance {Math.round(AVANCE_ESTADO[estado] * 100)} %</span>
        <div className="chips" role="radiogroup" aria-label="Estado del showcase">
          {ESTADOS_COMERCIAL.map((x) => <button key={x} role="radio" aria-checked={estado === x} className="chip" disabled={(x === 'published' || x === 'pitched') && !g.ok && estado !== x} onClick={() => cambiar(x)}>{ESTADO_COMERCIAL_TXT[x]}</button>)}
        </div>
        {!g.ok && <p className="pd-aviso">Para publicarlo falta: {g.faltan.join(' · ')}</p>}
      </section>
      <section aria-label="Seguridad del showcase">
        <span className="etiqueta">Seguridad (antes de publicar)</span>
        <ul className="pd-check">{SEGURIDAD.map((s, i) => <li key={s}><Casilla checked={!!seg?.[i]} label={s} onChange={() => marcarSeguridad(id, i, !seg?.[i])} /><span>{s}</span></li>)}</ul>
        {/voz|voice|talking/.test(texto) && <p className="sub">{REGLAS_EXTRA.voz}</p>}
        {/pago|payment|ticket|booking|reserv/.test(texto) && <p className="sub">{REGLAS_EXTRA.pagos}</p>}
        {/clip/.test(texto) && <p className="sub">{REGLAS_EXTRA.clip}</p>}
      </section>
      <section aria-label="Leads">
        <span className="etiqueta">Leads freelance · {e.leads?.length ?? 0}</span>
        <ul className="cp-lista">
          {(e.leads ?? []).map((l) => (
            <li key={l.id} className="cp-mocks">{l.nombre} <span className="mono sub">{fp(l.contactado)}</span>
              <select className="select-plano" aria-label={`Estado de ${l.nombre}`} value={l.estado} onChange={(x) => estadoLead(id, l.id, x.target.value as Lead['estado'])}>
                {(['contactado', 'respondió', 'reunión', 'propuesta', 'ganado', 'perdido'] as const).map((s) => <option key={s}>{s}</option>)}
              </select>
            </li>
          ))}
        </ul>
        <div className="cp-mocks">
          <input className="campo-texto" aria-label="Nuevo lead" placeholder="Nombre o empresa" value={lead} onChange={(x) => setLead(x.target.value)} />
          <button className="btn-borde" disabled={!lead.trim()} onClick={() => { agregarLead(id, { nombre: lead.trim(), contactado: hoy, estado: 'contactado' }); setLead(''); }}>Sumar lead</button>
        </div>
      </section>
    </>
  );
}

/** Los 8 puntos del Imán y la serie de posts. */
export function ImanPagina({ day, id }: { day: DayLog; id: string }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const i = plan.iman?.[id] ?? {};
  const puntos = puntosIman(i);
  const sec = secundaria(id);
  const com = comercial(id);
  const pista = sec ? 'secundaria' : com ? 'comercial' : 'principal';
  const nombre = sec?.nombre ?? (com ? `#${com.n} · ${com.marca ?? plan.fondo?.[id]?.marca ?? 'A definir'}` : PLAN_EXT.bloques.find((b) => b.id === id)?.nombre ?? id);
  const [link, setLink] = useState<Record<string, string>>({});
  const post = (paso: PasoSerie) => plan.posts?.find((p) => p.id === i.posts?.[paso]);
  const crear = (paso: PasoSerie) => agregarPost({ fecha: hoy, canales: ['linkedin-en', 'linkedin-es', 'x'] as Canal[], pista, item: id, paso, ...(link[paso]?.trim() ? { link: link[paso].trim() } : {}) });
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href={`#/metas/fondo/${id}`}>{nombre}</a><span className="mono sub">{puntos.filter((p) => p.ok).length} de 8</span></div>
      <header><h1 className="titulo">🧲 Imán</h1><p>El lanzamiento público no se marca publicado hasta tener los 8 puntos. De la serie de posts alcanzan teaser, build y launch; deep dive y result van después.</p></header>
      <ol className="pd-check" aria-label="Los 8 puntos">{puntos.map((p) => <li key={p.n}><span aria-hidden="true">{p.ok ? '✓' : '○'}</span><span className={p.ok ? '' : 'sub'}>{p.n} · {p.nombre}{p.ok ? '' : ' · falta'}</span></li>)}</ol>
      <Campo label="1 · Gancho de una línea" valor={i.hook} guardar={(v) => setIman(id, { hook: v })} />
      <Campo label="2 · Video de 30 s (wow en los primeros 3 s)" valor={i.video} guardar={(v) => setIman(id, { video: v })} placeholder="https://…" />
      <Campo label="3 · Demo pública sin registro" valor={i.demo} guardar={(v) => setIman(id, { demo: v })} placeholder="https://…" />
      <Campo label="4 · Métrica: el valor" valor={i.metrica?.valor} guardar={(v) => setIman(id, { metrica: { ...i.metrica, valor: v } })} />
      <Campo label="4 · Métrica: cómo se midió" valor={i.metrica?.como} guardar={(v) => setIman(id, { metrica: { ...i.metrica, como: v } })} />
      <Campo label="5 · Noticia: link" valor={i.noticia?.link} guardar={(v) => setIman(id, { noticia: { ...i.noticia, link: v } })} placeholder="https://…" />
      <Campo label="5 · Noticia: una línea" valor={i.noticia?.linea} guardar={(v) => setIman(id, { noticia: { ...i.noticia, linea: v } })} />
      <ul className="pd-check" aria-label="6 · Listo para una prueba técnica">
        {([['readme', 'README'], ['adrs', 'ADRs'], ['tests', 'Tests']] as const).map(([k, n]) => <li key={k}><Casilla checked={!!i[k]} label={`6 · ${n}`} onChange={() => setIman(id, { [k]: !i[k] })} /><span>6 · {n}</span></li>)}
      </ul>
      <Campo label="7 · Empresas objetivo (separadas por coma)" valor={(i.empresas ?? []).join(', ')} guardar={(v) => setIman(id, { empresas: v.split(',').map((x) => x.trim()).filter(Boolean) })} />
      <span className="etiqueta">8 · Serie de posts</span>
      <ul className="pd-lista">
        {PASOS_SERIE.map((paso) => {
          const p = post(paso);
          return (
            <li key={paso} className="pd-card compacta">
              <b>{PASO_TXT[paso]}{PASOS_ANTES.includes(paso) ? '' : ' · después del lanzamiento'}</b>
              {p ? <span className="sub">{fp(p.fecha)} · LinkedIn (EN + ES) + X{p.link ? <> · <a href={p.link}>link</a></> : ''}</span> : (
                <div className="cp-mocks">
                  <input className="campo-texto" aria-label={`Link del post ${PASO_TXT[paso]}`} placeholder="https://… (opcional)" value={link[paso] ?? ''} onChange={(x) => setLink({ ...link, [paso]: x.target.value })} />
                  <button className="btn-borde" onClick={() => crear(paso)}>Post {PASO_TXT[paso]} hecho hoy</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

/** El plan entero en una página: etapa › fase › bloque, con fechas, horas, versiones o plan del día, y lo que corre de fondo. */
export function Roadmap({ day }: { day: DayLog }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const fondoTxt = (id: string) => {
    const f = V122.fondo[id];
    if (!f) return null;
    if (f.pausa) return 'Fondo: en pausa (PNPT)';
    const s = f.secundaria === 'libre' ? 'secundaria libre (elegí de "Ver a futuro")' : f.secundaria?.map((x) => `${x.app} v${x.version}`).join(', ');
    const c = f.comercial ? (() => { const x = V122.comerciales.find((y) => y.n === f.comercial)!; return `#${x.n} ${x.marca ?? plan.fondo?.[x.id]?.marca ?? 'a definir'}`; })() : '—';
    return `Fondo: ${s} · comercial: ${c}`;
  };
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a><span className="mono sub">v12.2</span></div>
      <header><h1 className="titulo">El plan entero</h1><p>Etapa › fase › bloque, con fechas, horas, versiones o plan del día, y lo que corre de fondo en cada ventana.</p></header>
      {PLAN_EXT.etapas.map((e) => (
        <section key={e.n} aria-label={`Etapa ${e.n}`}>
          <span className="etiqueta">Etapa {e.n} · {e.nombre} · {fp(e.inicio!)} – {fp(e.fin!)}</span>
          {(PLAN_EXT.fases ?? []).filter((f) => f.etapa === e.n).map((f) => (
            <Plegable key={f.id} id={`roadmap:${f.id}`} titulo={`Fase ${f.id.slice(1)} · ${f.nombre}`} resumen={`${fp(f.inicio)} – ${fp(f.fin)}`} abierto={f.inicio <= hoy && hoy <= f.fin}>
              {PLAN_EXT.bloques.filter((b) => b.fase === f.id && b.fechas).map((b) => {
                const det = V122.detalle[b.id];
                return (
                  <div key={b.id} className={`rm-bloque ${b.tipo}`}>
                    <b><a href={`#/metas/periodos/${b.id}`}>{b.nombre}</a> <span className="mono sub">{b.id}</span></b>
                    <small className="mono">{fp(b.fechas!.inicio)} – {fp(b.fechas!.fin)}{b.horas ? ` · ${String(b.horas).replace('.', ',')} h` : ''}{b.horasLim ? ` (lím ${b.horasLim})` : ''}</small>
                    {det?.versiones.map((v) => <small key={v.id}>v{v.id}{v.inicio ? ` · ${fp(v.inicio)} – ${fp(v.fin!)}` : ''}: {v.linea}</small>)}
                    {b.certs?.map((c) => <small key={c.id}>{c.nombre} · {c.horas} h · {c.plan.map((p) => `${fp(p.fecha)} ${p.texto}`).join(' · ')}</small>)}
                    {b.hitos?.map((h, i) => <small key={i}>d{h.dias[0]}–{h.dias[1]} {h.tema} → {h.hito}</small>)}
                    {fondoTxt(b.id) && <small>{fondoTxt(b.id)}</small>}
                  </div>
                );
              })}
            </Plegable>
          ))}
        </section>
      ))}
    </main>
  );
}
