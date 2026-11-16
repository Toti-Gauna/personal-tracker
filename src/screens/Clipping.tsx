/**
 * Ola 23 · el apartado Clipping en Metas (#/metas/clipping y #/metas/clipping/<sub>): el Roadmap Clipper
 * de 12 meses como tablero. Cada pantalla es liviana (≤ 3 pantallas de scroll); lo demás va detrás de botones.
 */
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CLIP, COLOR_CLIP, faseDe, finMes, hitosClip, inicioMes, mesDe, mesPlan, MESES_CLIP } from '../data/clipping';
import type { FilaClip } from '../data/clipping-state';
import { compuerta, mesContraMeta, planContraReal, proyeccion, semanas, totales, filas as filasDe, pagoReal, aprobacion, type Luz } from '../data/clipping-metricas';
import type { DayLog } from '../data/types';
import { DUR, reducedMotion } from '../lib/motion';
import { lunesDe } from '../state/plan';
import { tildarRutina } from '../state/clipping';
import { useStore } from '../state/store';
import { Anillo, Sparkline } from '../ui/charts/charts';
import { HojaClip } from '../ui/HojaClip';
import { Plegable } from '../ui/Plegable';
import { Campanas, Cuentas, Registro, Retainers } from './ClippingDatos';
import { MetricasClip } from './ClippingMetricas';
import '../styles/ruta.css';
import '../styles/roadmap-estudio.css';
import '../styles/estudio.css';
import '../styles/clipping.css';

gsap.registerPlugin(Flip);

export const SUBS = [
  ['resumen', 'Resumen'], ['plan', 'Plan'], ['registro', 'Registro'], ['metricas', 'Métricas'], ['cuentas', 'Cuentas'],
  ['campanas', 'Campañas'], ['retainers', 'Retainers'], ['nichos', 'Nichos y derechos'], ['riesgos', 'Riesgos y rutina'], ['semana1', 'Semana 1'],
] as const;
export type SubClip = (typeof SUBS)[number][0];

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fc = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
export const fcA = (d: string) => `${fc(d)} ${d.slice(2, 4)}`;
export const usd = (v: number) => `USD ${Math.round(v).toLocaleString('es-AR')}`;
export const usd2 = (v: number | null) => (v == null ? '—' : v.toFixed(2).replace('.', ','));
export const pc = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)} %`);
const TEXTO_LUZ: Record<Luz, string> = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo', gris: 'Sin datos' };

/** Número con cuenta animada (GSAP); con "reducir movimiento" (o en los tests) aparece directo. */
function Cuenta({ v, className }: { v: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (x: number) => Math.round(x).toLocaleString('es-AR');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || import.meta.env.MODE === 'test') return;
    const o = { x: 0 };
    const t = gsap.to(o, { x: v, duration: 0.9, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.x); }, onComplete: () => { el.textContent = fmt(v); } });
    return () => { t.kill(); el.textContent = fmt(v); };
  }, [v]);
  return <span ref={ref} className={className}>{fmt(v)}</span>;
}

/** Lo que calcula el tablero, una vez por cambio de planilla, días o fecha. */
export function useClip(date: string) {
  const clip = useStore((s) => s.clipping);
  const days = useStore((s) => s.days);
  return useMemo(() => {
    const n = mesDe(date);
    const nPlan = Math.min(Math.max(n, 1), MESES_CLIP);
    return {
      clip, days, n, nPlan, mes: mesPlan(nPlan)!, fase: faseDe(nPlan)!,
      vsMeta: mesContraMeta(clip, date), vsPlan: planContraReal(clip, date), proy: proyeccion(clip, date),
      puerta: compuerta(clip, date), sem: semanas(clip, days, date, 8), vacio: !clip.registro.length && !clip.campanas.length && !clip.cuentas.length,
    };
  }, [clip, days, date]);
}

/** Subpáginas visibles: "Semana 1" se oculta sola después del mes 1. */
export const subsVisibles = (date: string) => SUBS.filter(([id]) => id !== 'semana1' || mesDe(date) <= 1);

/** Card para la pestaña Ruta de Metas. */
export function CardClipping({ date }: { date: string }) {
  const c = useClip(date);
  const cob = c.vsMeta?.cobrado ?? 0;
  return (
    <a className="re-card clip-card" href="#/metas/clipping" style={{ ['--c' as string]: COLOR_CLIP }}>
      <span className="re-card-cab"><b>Clipping</b><span className="mono sub">{c.n >= 1 && c.n <= 12 ? `mes ${c.n} de 12 · fase ${c.fase.n}` : c.n < 1 ? 'arranca el 16 nov' : 'año cerrado'}</span></span>
      <span className="re-tira" aria-hidden="true">{CLIP.meses.map((m) => <i key={m.n} className={m.n < c.n ? 'cerrada' : m.n === c.n ? 'actual' : ''} />)}</span>
      <span className="re-card-perfil">
        <span className="sub">Este mes <b className="mono">{usd(cob)}</b> de {usd(c.mes.meta)}</span>
        <span className="sub">→ vas a ser <b className="resaltado">USD 10k por mes</b></span>
      </span>
      <span className="mono sub re-card-pie">Roadmap Clipper de 12 meses: planilla, métricas y compuertas</span>
    </a>
  );
}

/** #/metas/clipping[/sub] */
export function Clipping({ day, sub }: { day: DayLog; sub?: string }) {
  const date = day.date;
  const visibles = subsVisibles(date);
  const s = (visibles.some(([id]) => id === sub) ? sub : 'resumen') as SubClip;
  const [hoja, setHoja] = useState<FilaClip | 'nueva' | null>(null);
  const nav = useRef<HTMLElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);
  // Transición entre subpáginas: la marca de la pestaña activa se desliza con Flip.
  useLayoutEffect(() => {
    const el = nav.current?.querySelector('.clip-marca');
    if (el && flip.current && !reducedMotion()) Flip.from(flip.current, { targets: el, duration: DUR.flip, ease: 'power2.out' });
    if (el) flip.current = Flip.getState(el);
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
    const main = document.querySelector('.clip-cuerpo');
    if (main && !reducedMotion() && import.meta.env.MODE !== 'test') gsap.fromTo(main, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'all' });
  }, [s]);
  const titulo = SUBS.find(([id]) => id === s)![1];
  return (
    <main className="pantalla clip" style={{ ['--c' as string]: COLOR_CLIP }}>
      <div className="topbar">
        <a className="volver" href={s === 'resumen' ? '#/metas/ruta' : '#/metas/clipping'}>{s === 'resumen' ? 'Metas' : 'Clipping'}</a>
        <span className="mono sub">{CLIP.datosA} · sin verificar</span>
      </div>
      <nav ref={nav} className="clip-nav" aria-label="Secciones del clipping">
        {visibles.map(([id, nombre]) => (
          <a key={id} href={`#/metas/clipping${id === 'resumen' ? '' : `/${id}`}`} aria-current={id === s ? 'page' : undefined}>
            {id === s && <span className="clip-marca" aria-hidden="true" />}
            <span>{nombre}</span>
          </a>
        ))}
      </nav>
      <div className="clip-cuerpo">
        {s === 'resumen' && <Resumen date={date} />}
        {s !== 'resumen' && <h1 className="titulo clip-h1">{titulo}</h1>}
        {s === 'plan' && <PlanClip date={date} />}
        {s === 'registro' && <Registro date={date} onEditar={(f) => setHoja(f)} />}
        {s === 'metricas' && <MetricasClip date={date} />}
        {s === 'cuentas' && <Cuentas date={date} />}
        {s === 'campanas' && <Campanas date={date} />}
        {s === 'retainers' && <Retainers date={date} />}
        {s === 'nichos' && <Nichos />}
        {s === 'riesgos' && <Riesgos date={date} />}
        {s === 'semana1' && <Semana1 date={date} />}
      </div>
      <button className="clip-fab" onClick={() => setHoja('nueva')}><span aria-hidden="true">+</span> Registrar</button>
      {hoja && <HojaClip date={date} fila={hoja === 'nueva' ? undefined : hoja} onCerrar={() => setHoja(null)} />}
    </main>
  );
}

function Resumen({ date }: { date: string }) {
  const c = useClip(date);
  const cob = c.vsMeta?.cobrado ?? 0;
  const meta = c.mes.meta;
  const sp = c.sem;
  const ultimas = filasDe(c.clip, { desde: inicioMes(c.nPlan), hasta: date });
  const tot = totales(ultimas);
  const ind = [
    { k: 'Pago real · 1.000 views', v: usd2(pagoReal(ultimas)), sub: `piso USD ${usd2(CLIP.umbrales.pagoFase2)}`, serie: sp.map((x) => x.pagoReal ?? 0) },
    { k: 'Aprobación', v: pc(aprobacion(ultimas)), sub: `${tot.aprobados} de ${tot.clipsConAprobados} clips`, serie: sp.map((x) => x.aprobacion ?? 0) },
    { k: 'Clips por día', v: String(c.vsPlan?.clipsDia ?? 0).replace('.', ','), sub: `plan ${c.mes.clipsDia}`, serie: sp.map((x) => x.clipsDia) },
    { k: 'Cuentas activas', v: String(c.vsPlan?.cuentas ?? 0), sub: `plan ${c.mes.cuentas}`, serie: sp.map((x) => x.cuentas) },
  ];
  return (
    <>
      <div className="kicker">{c.n < 1 ? 'Arranca el 16 nov 2026' : c.n > 12 ? 'Año cerrado' : `Mes ${c.n} de 12 · fase ${c.fase.n} · ${fc(inicioMes(c.n))} a ${fc(finMes(c.n))}`}</div>
      <header><h1 className="titulo">Clipping</h1><p>{c.mes.titulo}. {c.fase.objetivo}</p></header>

      <section className="clip-hero" aria-labelledby="clip-aca">
        <span className="etiqueta" id="clip-aca">Estás acá</span>
        <div className="clip-hero-fila">
          <div className="clip-grande">
            <small className="sub">Cobrado este mes</small>
            <b className="mono" aria-label={`${usd(cob)} cobrados este mes`}><span className="clip-usd">USD</span> <Cuenta v={cob} /></b>
            <span className="sub mono">de {usd(meta)} · esperado a hoy {usd(c.vsMeta?.esperado ?? 0)}</span>
          </div>
          <Anillo value={meta ? cob / meta : 0} label="del mes" size={108} color={COLOR_CLIP} />
        </div>
        <div className="re-perfiles clip-perfiles">
          <span><small className="sub">Hoy sos</small><b>{usd(cob)}/mes</b></span>
          <span className="re-flecha" aria-hidden="true">→</span>
          <span><small className="sub">Vas a ser</small><b className="resaltado">USD 10k/mes</b></span>
        </div>
        {c.vsMeta?.ritmo != null && (
          <span className={`chip-ritmo${c.vsMeta.ritmo < 0.9 ? ' atrasado' : c.vsMeta.ritmo < 1 ? ' en-ritmo' : ''}`}>{c.vsMeta.ritmo >= 1 ? 'En ritmo o adelante' : `Ritmo ${pc(c.vsMeta.ritmo)}`}</span>
        )}
      </section>

      {c.vacio ? (
        <section className="clip-vacio">
          <b>Arrancá la planilla</b>
          <p className="sub">Cargá tu primera campaña y tus cuentas; después, cada día, los clips y las views. Acepta fechas pasadas: podés cargar lo que hiciste desde el 16 nov.</p>
          <a className="btn-principal clip-btn" href="#/metas/clipping/campanas">Cargá tu primera campaña</a>
        </section>
      ) : (
        <ul className="clip-ind" aria-label="Indicadores del mes">
          {ind.map((x) => (
            <li key={x.k}>
              <small className="sub">{x.k}</small>
              <b className="mono">{x.v}</b>
              <Sparkline values={x.serie} color={COLOR_CLIP} label={`${x.k}: últimas 8 semanas`} h={26} />
              <small className="mono sub">{x.sub}</small>
            </li>
          ))}
        </ul>
      )}

      {c.puerta && (
        <section className={`clip-puerta luz-${c.puerta.luz}`}>
          <div className="clip-puerta-cab"><i aria-hidden="true" /><b>{c.puerta.titulo}</b><span className="mono sub">{TEXTO_LUZ[c.puerta.luz]}</span></div>
          <ul>{c.puerta.chequeos.map((q) => <li key={q.texto} className={q.ok == null ? '' : q.ok ? 'ok' : 'no'}><span>{q.texto}</span><b className="mono">{q.valor}</b></li>)}</ul>
          <p className="sub">{c.puerta.texto}</p>
        </section>
      )}

      <a className="clip-proy" href="#/metas/clipping/metricas">
        <span className="etiqueta">Camino a USD 10k</span>
        {c.proy ? <span>Con tu ritmo, el mes 12 cierra en <b className="mono">{usd(c.proy.mes12)}</b>{c.proy.falta ? <> · faltan <b className="mono">{usd(c.proy.falta)}</b></> : ' · pasa los USD 10k'}</span>
          : <span className="sub">La proyección aparece con el primer cobro. Base: USD 9.000 en el mes 12; optimista cruza USD 10k en el mes 10.</span>}
        <span aria-hidden="true" className="clip-ir">→</span>
      </a>

      <nav className="clip-botones" aria-label="Más del clipping">
        {subsVisibles(date).filter(([id]) => id !== 'resumen').map(([id, nombre]) => <a key={id} href={`#/metas/clipping/${id}`}>{nombre}<span aria-hidden="true">→</span></a>)}
      </nav>
    </>
  );
}

function PlanClip({ date }: { date: string }) {
  const n = mesDe(date);
  const hitos = hitosClip();
  return (
    <>
      <p className="sub clip-lead">{CLIP.resumen}</p>
      {CLIP.fases.map((f) => {
        const meses = CLIP.meses.filter((m) => m.n >= f.meses[0] && m.n <= f.meses[1]);
        const hs = hitos.filter((h) => { const k = mesDe(h.fechaReal); return k >= f.meses[0] && k <= f.meses[1]; });
        const actual = n >= f.meses[0] && n <= f.meses[1];
        return (
          <Plegable key={f.n} id={`clip:fase:${f.n}`} kicker={`fase ${f.n} · meses ${f.meses[0]} a ${f.meses[1]}`} titulo={f.nombre} resumen={`USD ${meses[0].meta.toLocaleString('es-AR')} → ${meses[meses.length - 1].meta.toLocaleString('es-AR')}`} color={COLOR_CLIP} abierto={actual || (n < 1 && f.n === 1)}>
            <p className="clip-obj">{f.objetivo}</p>
            <ol className="clip-meses">
              {meses.map((m) => (
                <li key={m.n} className={m.n < n ? 'hecho' : m.n === n ? 'actual' : ''} aria-current={m.n === n ? 'step' : undefined}>
                  <span className="mono clip-mes-n">{m.n}</span>
                  <span className="clip-mes-t">
                    <b>{m.titulo}</b>
                    <small className="mono sub">{fc(inicioMes(m.n))} a {fcA(finMes(m.n))} · {m.cuentas} cuentas · {m.clipsDia} clips/día</small>
                    {m.n === n && <small className="sub">{m.foco}</small>}
                  </span>
                  <b className="mono clip-mes-usd">{m.meta.toLocaleString('es-AR')}</b>
                </li>
              ))}
            </ol>
            <span className="etiqueta">Criterio de paso</span>
            <ul className="re-semaforo">{f.criterios.map((t) => <li key={t} className="verde"><i /><span>{t}</span></li>)}<li className="amarillo"><i /><span>{f.siNo}</span></li></ul>
            {hs.length > 0 && <><span className="etiqueta">Hitos</span><ul className="clip-hitos">{hs.map((h) => <li key={h.id} className={h.fechaReal < date ? 'hecho' : ''}><span className="mono sub">{fc(h.fechaReal)}</span><span>{h.tipo === 'grande' ? <b>{h.texto}</b> : h.texto}</span></li>)}</ul></>}
          </Plegable>
        );
      })}
      <Plegable id="clip:plan:stack" titulo="Tus apps · stack técnico" resumen="Next.js, Node, TypeScript" color={COLOR_CLIP}>
        <p className="sub">Trazo es la planilla y el tablero: no publica ni entra a las plataformas. El pipeline y el dashboard son tus apps aparte; esta planilla se exporta en JSON para sembrarlos.</p>
        <ol className="clip-lista">{CLIP.stack.map((t) => <li key={t}>{t}</li>)}</ol>
        <p><b>Regla de oro:</b> {CLIP.reglaDeOro}</p>
      </Plegable>
    </>
  );
}

const RIESGO: Record<string, string> = { bajo: 'luz-ok', medio: 'luz-medio', alto: 'luz-mal' };

function Nichos() {
  return (
    <>
      <p className="sub clip-lead">{CLIP.derechos}</p>
      <ul className="clip-nichos">
        {CLIP.nichos.map((x) => (
          <li key={x.nombre} className={RIESGO[x.riesgo]}>
            <div className="clip-nicho-cab"><i aria-hidden="true" /><b>{x.nombre}</b><span className="mono sub">riesgo {x.riesgo}</span></div>
            <span className="sub">{x.fuente}</span>
            <span>{x.como}</span>
          </li>
        ))}
      </ul>
      <Plegable id="clip:nichos:cuentas" titulo="Reglas de la granja" resumen={`${CLIP.reglasCuentas.length} reglas`} color={COLOR_CLIP}>
        <ul className="clip-lista">{CLIP.reglasCuentas.map((t) => <li key={t}>{t}</li>)}</ul>
      </Plegable>
    </>
  );
}

function Riesgos({ date }: { date: string }) {
  const l = lunesDe(date);
  const hechos = useStore((s) => s.clipping.rutina[l]) ?? [];
  const hoy = new Date(`${date}T12:00:00`).getDay();
  return (
    <>
      <span className="etiqueta">Rutina de esta semana · desde el lunes {fc(l)}</span>
      <ul className="clip-rutina">
        {CLIP.rutina.map((r) => {
          const ok = hechos.includes(r.id);
          return (
            <li key={r.id} className={`${r.dias.includes(hoy) ? 'hoy' : ''}${ok ? ' ok' : ''}`}>
              <button role="checkbox" aria-checked={ok} onClick={() => tildarRutina(date, r.id)}>
                <span className="clip-check" aria-hidden="true">{ok ? '✓' : ''}</span>
                <span><b>{r.titulo}</b><small className="sub">{r.texto}</small></span>
                {r.dias.includes(hoy) && <span className="mono clip-hoy">hoy</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <span className="etiqueta">Riesgos y plan B</span>
      <ul className="clip-riesgos">
        {CLIP.riesgos.map((r) => <li key={r.riesgo}><b>{r.riesgo}</b><span className="sub">{r.planB}</span></li>)}
      </ul>
      <Plegable id="clip:riesgos:fuentes" titulo="Fuentes" resumen={CLIP.datosA} color={COLOR_CLIP}>
        <ul className="clip-lista">{CLIP.fuentes.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="sub">Proyección propia basada en las tarifas de las fuentes: no son cifras garantizadas. Sin verificar por Trazo.</p>
      </Plegable>
    </>
  );
}

function Semana1({ date }: { date: string }) {
  return (
    <>
      <section className="clip-gta">
        <span className="etiqueta">GTA 6 · jueves 19 nov</span>
        <p>{CLIP.gta6}</p>
      </section>
      <ol className="clip-sem1">
        {CLIP.semana1.map((x) => {
          const est = date > x.hasta ? 'hecho' : date >= x.desde ? 'actual' : '';
          return (
            <li key={x.desde + x.texto} className={est} aria-current={est === 'actual' ? 'step' : undefined}>
              <span className="mono sub">{x.desde === x.hasta ? fc(x.desde) : `${fc(x.desde)} a ${fc(x.hasta)}`}</span>
              <span>{x.texto}</span>
            </li>
          );
        })}
      </ol>
      <Plegable id="clip:sem1:plataformas" titulo="Plataformas para probar" resumen="sin verificar" color={COLOR_CLIP}>
        <ul className="clip-plataformas">{CLIP.plataformas.map((p) => <li key={p.nombre}><b>{p.nombre}</b><span className="mono">{p.tarifa}</span><small className="sub">{p.nota}</small></li>)}</ul>
        <p className="sub">{CLIP.datosA}. Las tarifas cambian por campaña y se agotan: revisalas cada semana.</p>
      </Plegable>
    </>
  );
}
