/**
 * 4.1 a 4.4 · Metas con el plan T+18: Semana y Mes se generan desde el plan (y se confirman,
 * cambian o borran); Bimestre y Año vienen del plan y se pueden editar. Las metas personales
 * (Eclipse, Make It Stick, meditar, deudas, 95 kg…) siguen al lado, con su rama si la tienen.
 */
import { useMemo, useState } from 'react';
import { AREAS } from '../data/defaults';
import { appliesTo, averagePct, dayPct, monthLabel, ratio, valueOf, yearMonths } from '../data/goals';
import type { Goal } from '../data/goals-types';
import {
  accionMeta, alCerrar, avanceMeta, cierraEnMes, claveMes, esTarea, filasAnio, filasBimestre, metasMesGeneradas, metasSemanaGeneradas,
  nombreBimestre, pasoMeta, rangoMes, resumenMes, semanasDelBimestre, tituloSemana, type CtxPlan,
} from '../data/metas-plan';
import { BIMESTRES, PLAN, SEMANAS, T0_PLAN, diaSemanaCorto, faseTrabajo, fechaHito, finSemana, semanaDelPlan, type MetaGenerada } from '../data/plan';
import { RAMA_COLOR, RAMAS } from '../data/ramas';
import { addDays, parseDate } from '../data/time';
import type { DayLog, Rama } from '../data/types';
import { addProgress, deleteGoal, renameBimester, stepOf } from '../state/goals';
import { confirmarMetas, editarMeta, editarMetaFija, ensayarRespuesta, lunesDe, sumarContador, sumarHandyx, sumarHechoMeta } from '../state/plan';
import { planSettings, useStore } from '../state/store';
import { Calendario } from '../ui/Calendario';
import { Casilla } from '../ui/Casilla';
import { GoalRow } from '../ui/GoalRow';
import { usePlanVista } from '../ui/usePlan';

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${parseDate(d).getDate()} ${MES_CORTO[parseDate(d).getMonth()]}`;
const dmy = (d: string) => `${dm(d)} ${d.slice(2, 4)}`;
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const ORDEN: Rama[] = ['trabajo', 'programacion', 'matematica', 'ingles', 'handyx', 'salud'];
const ORIGEN: Record<MetaGenerada['origen'], string> = { plan: 'del plan', propia: 'tuya', chequeo: 'chequeo mensual' };

/** El contexto que necesitan los cálculos del plan. */
function useCtx(): CtxPlan & { goals: Goal[] } {
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const study = useStore((s) => s.study);
  const train = useStore((s) => s.train);
  const settings = useStore((s) => s.settings);
  const goals = useStore((s) => s.goals.goals);
  return { plan, days, study, train, goals, t0: settings?.startDate ?? T0_PLAN, t2: planSettings(settings).t2 };
}

const colorDe = (m: { rama?: Rama; area?: keyof typeof AREAS }) => (m.rama ? RAMA_COLOR[m.rama] : m.area ? AREAS[m.area].css : 'var(--sub)');

/** Una meta de mes o semana generada por el plan: avance, barra y + (o casilla si es una tarea). */
function MetaPlanFila({ m, tipo, clave, base, desde, hasta, date, ctx, editar, conOrigen }: {
  m: MetaGenerada; tipo: 'meses' | 'semanas'; clave: string; base: MetaGenerada[]; desde: string; hasta: string; date: string; ctx: CtxPlan; editar: boolean; conOrigen?: boolean;
}) {
  const { v, auto } = avanceMeta(m, desde, hasta, ctx);
  const tarea = esTarea(m);
  const meta = m.meta ?? 1;
  const hecha = v >= meta;
  const accion = accionMeta(m);
  const mas = () => {
    const n = pasoMeta(m);
    if (accion === 'contador') sumarContador(date, m.clave!, n);
    else if (accion === 'kit') ensayarRespuesta(date);
    else if (accion === 'operaciones') sumarHandyx(date, { operaciones: 1 });
    else sumarHechoMeta(tipo, clave, m, n, base);
  };
  const sub = conOrigen ? [m.rama ?? (m.area ? AREAS[m.area].name : ''), ORIGEN[m.origen], m.nota].filter(Boolean).join(' · ') : m.nota;
  return (
    <li className={`meta-fila-g mp-fila${conOrigen ? ' con-cuadro' : ''}`} style={{ ['--c' as string]: colorDe(m) }}>
      <div className="mg-cuerpo">
        <div className="mg-cab">
          <span className={`mg-t${tarea && hecha ? ' trazo on' : ''}`}>{conOrigen && <i className="mp-cuadro" aria-hidden="true" />}{m.texto}</span>
          {!tarea && <span className="mono mg-n" aria-label={`${fmt(v)} de ${fmt(meta)}${m.unidad ? ` ${m.unidad}` : ''}`}>{fmt(v)}/{fmt(meta)}</span>}
        </div>
        {sub && <small className="mg-sub mono">{sub}</small>}
        {!tarea && <div className="mg-barra" aria-hidden="true"><span style={{ width: `${ratio(v, meta) * 100}%` }} /></div>}
      </div>
      {editar ? (
        <div className="mp-editar">
          {!tarea && (
            <input className="campo-texto mono" inputMode="decimal" aria-label={`Meta de ${m.texto}`} defaultValue={fmt(meta)}
              onBlur={(e) => { const n = Number(e.target.value.replace(',', '.')); if (n > 0 && n !== meta) editarMeta(tipo, clave, m.id, { meta: n }, base); }} />
          )}
          <button className="borrar" onClick={() => editarMeta(tipo, clave, m.id, null, base)} aria-label={`Borrar ${m.texto}`}>Borrar</button>
        </div>
      ) : tarea ? (
        <Casilla checked={hecha} label={`${m.texto}: marcar`} onChange={() => sumarHechoMeta(tipo, clave, m, hecha ? -1 : 1, base)} />
      ) : auto ? (
        <span className="mg-auto mono" title="Se suma solo">auto</span>
      ) : (
        <button className="mg-mas" aria-label={`Sumar ${fmt(pasoMeta(m))} a ${m.texto}`} onClick={mas}>+</button>
      )}
    </li>
  );
}

/** Confirmar las metas generadas de un período (o cuándo se confirmaron). */
function Confirmar({ tipo, clave, metas, date, confirmado, que }: { tipo: 'meses' | 'semanas'; clave: string; metas: MetaGenerada[]; date: string; confirmado?: string; que: string }) {
  if (confirmado) return <span className="mono sub">confirmadas el {dm(confirmado)}</span>;
  if (!metas.length) return null;
  return <button className="mp-confirmar" onClick={() => confirmarMetas(tipo, clave, metas, date)}>Confirmar {que}</button>;
}

// ——— 4.1 Semana ———

export function SemanaPlan({ day, editar }: { day: DayLog; editar: boolean }) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const v = usePlanVista(date);
  const l = lunesDe(date);
  const d7 = addDays(l, 6);
  const s = semanaDelPlan(date, t0);
  const guardadas = ctx.plan.semanas[l];
  const generadas = useMemo(() => metasSemanaGeneradas(date, t0), [date, t0]);
  const metas = guardadas?.metas ?? generadas;
  const personales = ctx.goals.filter((g) => appliesTo(g, 'semana', date));
  const vctx = { study: ctx.study, days: ctx.days, train: ctx.train };
  const ratios = [...metas.map((m) => ratio(avanceMeta(m, l, d7, ctx).v, m.meta ?? 1)), ...personales.map((g) => ratio(valueOf(g, date, vctx), g.target))];
  const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  const por = DIAS.map((_, i) => ({ key: addDays(l, i), p: dayPct(ctx.days[addDays(l, i)]) }));
  const hoy = (parseDate(date).getDay() + 6) % 7;
  const fase = faseTrabajo(date, t0);
  const kg = ctx.goals.find((g) => g.horizon === 'anio' && g.rama === 'salud');
  const entSemana = ctx.plan.entrevistas.find((e) => e.fecha >= l && e.fecha <= d7);
  const lado: Record<Rama, string> = {
    trabajo: fase.id === 'busqueda' ? `${PLAN.trabajo.porDia.postulaciones} + ${PLAN.trabajo.porDia.mensajes} por día` : '',
    programacion: '', matematica: '', handyx: '',
    ingles: entSemana ? `${diaSemanaCorto(entSemana.fecha)} ${parseDate(entSemana.fecha).getDate()}` : '',
    salud: kg ? `meta ${fmt(kg.target)} ${kg.unit ?? ''}`.trim() : '',
  };
  for (const r of ['programacion', 'matematica', 'handyx'] as Rama[]) {
    const h = metas.find((m) => m.rama === r && m.unidad === 'h' && m.clave?.startsWith('horas'));
    if (h) lado[r] = `${fmt(h.meta ?? 0)} h`;
  }
  const sinRama = personales.filter((g) => !g.rama);
  const grupos = new Map<string, Goal[]>();
  for (const g of sinRama) { const k = g.group ?? AREAS[g.area].name; grupos.set(k, [...(grupos.get(k) ?? []), g]); }

  return (
    <>
      <div className="sem-cab">
        <div>
          <span className="etiqueta">{dm(l)} — {dm(d7)}{s >= 1 && s <= SEMANAS ? ` · semana ${s} de ${SEMANAS}` : ''}</span>
          <h2 className="sem-t titulo">{s >= 1 && s <= SEMANAS ? tituloSemana(date, ctx.plan.entrevistas, t0) : s < 1 ? 'Antes del plan' : 'Después del plan'}</h2>
        </div>
        <span className="sem-pct">{Math.round(avg * 100)}<small>%</small></span>
      </div>
      <div className="sem-dias" role="img" aria-label={`Cumplimiento por día: ${por.map((d, i) => `${DIAS[i]} ${d.p == null ? 'sin datos' : Math.round(d.p * 100)}`).join(', ')}`}>
        {por.map((d, i) => (
          <div key={d.key} className={i === hoy ? 'hoy' : ''}>
            <span className="mono">{DIAS[i]}{d.p != null ? ` ${Math.round(d.p * 100)}` : ''}</span>
            <span className="sem-barra" style={{ height: `${(d.p ?? 0) * 100}%`, background: 'var(--tinta)' }} />
          </div>
        ))}
      </div>
      {s >= 1 && s <= SEMANAS ? (
        <div className="mp-fase">
          <span className="mono sub">contadores de la fase {fase.id === 'busqueda' ? 'búsqueda · cambian solos en T+2' : 'con trabajo nuevo'}</span>
          <Confirmar tipo="semanas" clave={l} metas={metas} date={date} confirmado={guardadas?.confirmado} que="la semana" />
        </div>
      ) : (
        <p className="sub">{s < 1 ? `El plan arranca el ${dm(t0)}: ahí aparecen los contadores de cada rama.` : 'El plan T+18 terminó; quedan tus metas.'}</p>
      )}

      {ORDEN.map((r) => {
        const ms = metas.filter((m) => m.rama === r);
        const gs = personales.filter((g) => g.rama === r);
        if (!ms.length && !gs.length) return null;
        const etapa = v.ramas.find((x) => x.rama === r);
        return (
          <section key={r} className="mg-grupo mp-grupo" style={{ ['--c' as string]: RAMA_COLOR[r] }}>
            <div className="mp-rama-cab"><span className="mono mp-rama">{r}</span><span className="mono sub">{lado[r]}</span></div>
            <div className="mg-grupo-cab"><h2 className="resaltado">{etapa?.titulo ?? r}</h2></div>
            <ul className="mg-lista">
              {ms.map((m) => <MetaPlanFila key={m.id} m={m} tipo="semanas" clave={l} base={metas} desde={l} hasta={d7} date={date} ctx={ctx} editar={editar} />)}
              {gs.map((g) => <GoalRow key={g.id} g={g} date={date} editar={editar} />)}
            </ul>
          </section>
        );
      })}
      {[...grupos.entries()].map(([nombre, gs]) => (
        <section key={nombre} className="mg-grupo mp-grupo" style={{ ['--c' as string]: AREAS[gs[0].area].css }}>
          <div className="mp-rama-cab"><span className="mono mp-rama">área · fuera del plan</span></div>
          <div className="mg-grupo-cab"><h2 className="resaltado">{nombre}</h2></div>
          <ul className="mg-lista">{gs.map((g) => <GoalRow key={g.id} g={g} date={date} editar={editar} />)}</ul>
        </section>
      ))}
    </>
  );
}

// ——— 4.2 Mes ———

export function MesPlan({ day, editar }: { day: DayLog; editar: boolean }) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const [a, b] = rangoMes(date);
  const key = claveMes(date);
  const guardado = ctx.plan.meses[key];
  const generadas = useMemo(() => metasMesGeneradas(date, t0, ctx.study), [date, t0, ctx.study]);
  const metas = guardado?.metas ?? generadas;
  const confirmado = guardado?.confirmado ?? (t0 >= a && t0 <= b ? t0 : undefined);
  const cierra = cierraEnMes(date, ctx.plan.entrevistas, t0);
  const personales = ctx.goals.filter((g) => appliesTo(g, 'mes', date));
  const s1 = Math.max(1, semanaDelPlan(a, t0));
  const s2 = Math.min(SEMANAS, semanaDelPlan(b, t0));
  const sig = addDays(b, 1);
  const finPlan = finSemana(SEMANAS, t0);
  const resumen = sig <= finPlan ? resumenMes(sig, t0, ctx.study) : [];
  const mesNombre = monthLabel(date).toLowerCase();

  return (
    <>
      <div className="fila-t mes-cab">
        <h2>{monthLabel(date)}</h2>
        {s2 >= 1 && semanaDelPlan(b, t0) >= 1 && s1 <= SEMANAS && <span className="mono sub">semanas {s1} a {s2} del plan</span>}
      </div>
      <Calendario date={date} days={ctx.days} />

      {cierra.length > 0 && (
        <>
          <div className="etiqueta mg-t">Lo que cierra en {mesNombre}</div>
          <ul className="mp-cierra">
            {cierra.map((c, i) => (
              <li key={i}>
                <span className="mono sub">{dm(c.fecha)}</span>
                <i className={c.rama ? '' : 'sin-rama'} style={{ background: c.rama ? RAMA_COLOR[c.rama] : undefined }} aria-hidden="true" />
                <span>{c.texto}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="fila-t mg-t mp-mes-cab">
        <span className="etiqueta">Metas de {mesNombre}</span>
        <Confirmar tipo="meses" clave={key} metas={metas} date={date} confirmado={confirmado} que="el mes" />
      </div>
      {!confirmado && metas.length > 0 && (
        <p className="sub mp-nota">Trazo armó estas metas desde el plan. Confirmalas, cambialas o borralas con «Editar metas».</p>
      )}
      <ul className="mg-lista">
        {metas.map((m) => <MetaPlanFila key={m.id} m={m} tipo="meses" clave={key} base={metas} desde={a} hasta={b} date={date} ctx={ctx} editar={editar} conOrigen />)}
        {personales.map((g) => <GoalRow key={g.id} g={g} date={date} editar={editar} sub={`${g.rama ?? (g.group ?? AREAS[g.area].name)} · tuya`} />)}
      </ul>
      {!metas.length && !personales.length && <p className="sub vacio">Este mes no hay metas del plan.</p>}

      {resumen.length > 0 && (
        <div className="pr-card mp-sig">
          <span className="etiqueta">{monthLabel(sig)} se arma el {dm(sig)}</span>
          <p>Trazo propone las metas desde el plan ({resumen.join(', ')}) y vos las confirmás o las cambiás. Nada se carga 18 meses antes.</p>
        </div>
      )}
    </>
  );
}

// ——— 4.3 Bimestre ———

export function BimestrePlan({ day, editar, elegido }: { day: DayLog; editar: boolean; elegido?: number }) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const nombres = useStore((s) => s.goals.bimesterNames);
  const actual = Math.min(BIMESTRES, Math.max(1, Math.ceil(Math.max(1, semanaDelPlan(date, t0)) / PLAN.semanasPorBimestre)));
  const [n, setN] = useState(elegido && elegido >= 1 && elegido <= BIMESTRES ? elegido : actual);
  const [editando, setEditando] = useState<string | null>(null);
  const b = semanasDelBimestre(n, t0);
  const nombre = nombreBimestre(n, nombres);
  const filas = filasBimestre(n, date, ctx, ctx.plan.editadas);
  const cierre = alCerrar(n, t0);
  const sHoy = semanaDelPlan(date, t0);
  const hito = PLAN.hitos.find((h) => h.id !== 'T+0' && h.semana >= b.desde && h.semana <= b.hasta);
  const quedan = Math.round((parseDate(b.fin).getTime() - parseDate(date).getTime()) / 864e5);
  const estado = date < b.inicio ? `empieza el ${dm(b.inicio)}` : date > b.fin ? `cerró el ${dm(b.fin)}` : `quedan ${quedan} ${quedan === 1 ? 'día' : 'días'}`;
  const personales = ctx.goals.filter((g) => appliesTo(g, 'bim', date));

  return (
    <>
      <div className="mp-bims" role="tablist" aria-label="Bimestres del plan">
        {Array.from({ length: BIMESTRES }, (_, i) => i + 1).map((x) => (
          <button key={x} role="tab" aria-selected={x === n} className={x === actual ? 'actual' : ''} onClick={() => { setN(x); setEditando(null); }}>B{x}</button>
        ))}
      </div>
      <div className="etiqueta mg-t">Bimestre {n} de {BIMESTRES} · {dm(b.inicio)} — {dm(b.fin)}</div>
      <div className="bim-nombre">
        {editando == null ? (
          <>
            <h2 className="titulo">{nombre}</h2>
            <button className="btn-lapiz" aria-label="Cambiar el nombre del bimestre" onClick={() => setEditando(nombre)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z M14.5 6.5l3 3" /></svg>
            </button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); renameBimester(n, editando); setEditando(null); }}>
            <input className="campo-grande" autoFocus value={editando} onChange={(e) => setEditando(e.target.value)} aria-label="Nombre del bimestre" maxLength={30} />
            <div className="dos-botones">
              <button type="button" className="btn-borde" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="submit" className="btn-principal">Guardar nombre</button>
            </div>
            <p className="sub nota-izq">Vacío vuelve a «{PLAN.nombresBimestre[n - 1] || `B${n}`}».</p>
          </form>
        )}
      </div>
      <p className="sub bim-sub">{hito ? `Cierra con ${hito.id}: ${hito.titulo[0].toLowerCase()}${hito.titulo.slice(1)}` : `Programación: ${PLAN.metasBimestre.programacion[n - 1]}`} · {estado}</p>
      <div className="semanas-9 mp-semanas" style={{ gridTemplateColumns: `repeat(${b.semanas.length}, 1fr)` }} aria-label={`Las ${b.semanas.length} semanas del bimestre`}>
        {b.semanas.map((x) => <span key={x.s} className={x.s === sHoy ? 'on' : x.s < sHoy ? 'pas' : ''} aria-label={`Semana ${x.s}: ${x.tramo.nombre}`}>{x.letra}</span>)}
      </div>
      <div className="sub semanas-leyenda mono">{b.leyenda.join(' · ')}</div>

      <div className="carriles">
        {filas.map((f) => (
          <section key={f.rama} className="carril" style={{ ['--c' as string]: RAMA_COLOR[f.rama] }}>
            <div className="carril-cab"><span className="mono mp-rama">{f.rama}</span><span className="mono">{f.lado}</span></div>
            {editar ? (
              <input className="campo-texto mp-fija" aria-label={`Meta de ${f.rama} en B${n}`} defaultValue={f.titulo} onBlur={(e) => { if (e.target.value.trim() !== f.titulo) editarMetaFija(f.clave, e.target.value); }} />
            ) : (
              <h3>{f.titulo}</h3>
            )}
            <div className="mg-barra"><span style={{ width: `${f.avance * 100}%` }} /></div>
            <p className="sub">{f.sub}</p>
          </section>
        ))}
      </div>
      {editar && <p className="sub nota-izq">Vacío vuelve al texto del plan.</p>}

      <div className="pr-card mp-sig">
        <span className="etiqueta">Al cerrar B{n} · {dm(cierre.fecha)}</span>
        <p>{cierre.texto}</p>
      </div>

      <div className="etiqueta mg-t">También en este bimestre</div>
      {personales.length ? <ul className="mg-lista">{personales.map((g) => <GoalRow key={g.id} g={g} date={date} editar={editar} />)}</ul> : <p className="sub vacio">Todavía no hay metas tuyas acá.</p>}
    </>
  );
}

// ——— 4.4 Año ———

export function AnioPlan({ day, editar }: { day: DayLog; editar: boolean }) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const nombres = useStore((s) => s.goals.bimesterNames);
  const vctx = { study: ctx.study, days: ctx.days, train: ctx.train };
  const anuales = ctx.goals.filter((g) => appliesTo(g, 'anio', date));
  const personal: Partial<Record<Rama, { v: number; target: number; unit?: string }>> = {};
  for (const g of anuales) if (g.rama && !personal[g.rama]) personal[g.rama] = { v: valueOf(g, date, vctx), target: g.target, unit: g.unit };
  const filas = filasAnio(date, ctx, ctx.plan.editadas, personal);
  // Las metas personales del año que ya se muestran dentro de una rama no se repiten.
  const usadas = new Set(RAMAS.filter((r) => personal[r]));
  const resto = anuales.filter((g) => !(g.rama && usadas.has(g.rama) && anuales.find((x) => x.rama === g.rama) === g));
  const eclipsePlan = PLAN.metasAnio.anio1.find((m) => m.area === 'eclipse');
  const actual = Math.min(BIMESTRES, Math.max(1, Math.ceil(Math.max(1, semanaDelPlan(date, t0)) / PLAN.semanasPorBimestre)));
  const finB6 = finSemana(6 * PLAN.semanasPorBimestre, t0);
  const t12 = fechaHito(PLAN.hitos.find((h) => h.id === 'T+12')!, t0);
  const meses = yearMonths(Number(t0.slice(0, 4)) - 2025);
  const prom = meses.map((m) => ({ ...m, ...averagePct(ctx.days, `${m.key}-01`, `${m.key}-31`) }));
  const fin = finSemana(SEMANAS, t0);
  const [finalTrabajo, ...finalResto] = PLAN.metasAnio.tramoFinal;

  return (
    <>
      <div className="bims-6 mp-bims6">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <a key={n} href={`#/metas/bimestre/${n}`} className={n === actual ? 'on' : ''} aria-label={`Bimestre ${n}: ${nombreBimestre(n, nombres)}`}>
            <span className="mono">B{n}</span>
            <span>{nombreBimestre(n, nombres)}</span>
          </a>
        ))}
      </div>
      <div className="bims-fechas mono sub"><span>{dmy(t0)}</span><span>T+12 · {dmy(t12)}</span><span>{dmy(finB6)}</span></div>

      <div className="fila-t mg-t"><span className="etiqueta">Promedio por mes</span><span className="mono sub">objetivo 85 %</span></div>
      <div className="meses" role="img" aria-label={`Promedio por mes: ${prom.map((m) => `${m.name} ${m.loaded ? Math.round(m.avg * 100) + ' %' : 'sin datos'}`).join(', ')}`}>
        <div className="meses-meta" />
        {prom.map((m) => (
          <div key={m.key}>
            <span className="meses-barra" style={{ height: `${Math.max(m.loaded ? 3 : 0, m.avg * 100)}%`, background: m.avg >= 0.85 ? 'var(--economia)' : 'var(--tinta)' }} />
            <span className="mono sub">{m.letter}</span>
          </div>
        ))}
      </div>

      <div className="etiqueta mg-t">Las metas del año 1</div>
      <ul className="anio-lista">
        {filas.map((f) => (
          <li key={f.clave} style={{ ['--c' as string]: RAMA_COLOR[f.rama!] }}>
            <div className="anio-cab">
              <span className="resaltado anio-grupo mono">{f.rama}</span>
              <span className="mono">{f.lado}</span>
            </div>
            {editar ? (
              <input className="campo-texto mp-fija" aria-label={`Meta del año de ${f.rama}`} defaultValue={f.titulo} onBlur={(e) => { if (e.target.value.trim() !== f.titulo) editarMetaFija(f.clave, e.target.value); }} />
            ) : (
              <h3>{f.titulo}</h3>
            )}
            <div className="mg-barra"><span style={{ width: `${f.avance * 100}%` }} /></div>
            <p className="sub">{f.nota}</p>
          </li>
        ))}
        {resto.map((g) => <AnioPersonal key={g.id} g={g} date={date} editar={editar} />)}
        {eclipsePlan && !anuales.some((g) => g.area === 'eclipse') && (
          <li style={{ ['--c' as string]: AREAS.eclipse.css }}>
            <div className="anio-cab"><span className="resaltado anio-grupo mono">Eclipse · área</span></div>
            <h3>{eclipsePlan.texto}</h3>
          </li>
        )}
      </ul>

      <div className="pr-card mp-final">
        <span className="etiqueta">Tramo final · B7 a B9 · hasta {dm(fin)} {fin.slice(0, 4)}</span>
        <h3 className="titulo">{finalTrabajo.texto}</h3>
        <p className="sub">{finalResto.map((m) => m.texto).join(' · ')} · rol senior.</p>
      </div>
    </>
  );
}

function AnioPersonal({ g, date, editar }: { g: Goal; date: string; editar: boolean }) {
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const train = useStore((s) => s.train);
  const v = valueOf(g, date, { study, days, train });
  const etiqueta = g.rama ?? `${g.group ?? AREAS[g.area].name} · área`;
  return (
    <li style={{ ['--c' as string]: g.rama ? RAMA_COLOR[g.rama] : AREAS[g.area].css }}>
      <div className="anio-cab">
        <span className="resaltado anio-grupo mono">{etiqueta}</span>
        <span className="mono">{g.unit === 'USD' ? `USD ${fmt(v)}` : g.unit === 'kg' ? `${fmt(v)} kg` : `${fmt(v)}/${g.target}`}</span>
      </div>
      <h3>{g.title}</h3>
      <div className="mg-barra"><span style={{ width: `${ratio(v, g.target) * 100}%` }} /></div>
      {g.note && <p className="sub">{g.note}</p>}
      {(editar || !g.auto) && (
        <div className="anio-acc">
          {editar ? (
            <button className="borrar" onClick={() => deleteGoal(g.id)} aria-label={`Borrar ${g.title}`}>Borrar</button>
          ) : (
            <button className="mg-mas chico" aria-label={`Sumar ${stepOf(g)} a ${g.title}`} onClick={() => addProgress(g.id, date, stepOf(g))}>+ {stepOf(g)}</button>
          )}
        </div>
      )}
    </li>
  );
}
