/**
 * Ola 8b: 10.2 Búsqueda intensiva (el sprint de 14 días) y 10.3 Qué cambia en la ruta.
 * Los números salen de lo registrado; las metas del embudo son supuestos editables.
 */
import { useState } from 'react';
import { MOTIVO_INTENSIVA } from '../data/busqueda';
import { PLAN, T0_PLAN, TRAMOS, fechaCorta, finSemana, inicioSemana, nombreTramo, semanaDelPlan } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import { DIAS_SPRINT, EMBUDO_DEFAULT, acompanaSprint, embudoSprint, escenariosHandyx, horasSemana, sprintActual, type FilaHoras } from '../data/sprint';
import { addDays } from '../data/time';
import type { DayLog } from '../data/types';
import { setMetaEmbudo, toggleSprintCheck } from '../state/plan';
import { planSettings, useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import '../styles/plan.css';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const dm = (d: string) => fechaCorta(d);

function Top({ volver, lado }: { volver: string; lado: string }) {
  return <div className="topbar"><a className="volver" href={volver}>Metas</a><span className="mono" style={{ color: RAMA_COLOR.trabajo }}>{lado}</span></div>;
}

// ——— 10.2 ———

const FILAS_EMBUDO: [keyof typeof EMBUDO_DEFAULT, string][] = [
  ['aMedida', 'A medida'], ['mensajes', 'Mensajes'], ['respuestas', 'Respuestas'], ['recruiter', 'Con recruiter'], ['tecnica', 'Etapa técnica'], ['oferta', 'Oferta'],
];

export function SprintBusqueda({ day }: { day: DayLog }) {
  const date = day.date;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const sp = sprintActual(date, plan, t0);
  const metas = { ...EMBUDO_DEFAULT, ...(plan.sprint?.metas ?? {}) };
  const real = embudoSprint(plan, sp.desde, sp.hasta);
  const ac = acompanaSprint(plan, days, sp.desde, sp.hasta, plan.sprint?.checks);
  const [editar, setEditar] = useState(false);
  const pausas = (plan.pausas ?? []).filter((p) => !p.hasta);
  const lunes0 = (new Date(sp.desde + 'T12:00').getDay() + 6) % 7;
  const acompana: { id: string; t: string; tag: string; color: string; v: number; meta: number }[] = [
    { id: 'ingles', t: 'Inglés · sesiones', tag: 'inglés', color: RAMA_COLOR.ingles, v: ac.ingles, meta: DIAS_SPRINT },
    { id: 'simulacros', t: 'Simulacros completos', tag: 'inglés', color: RAMA_COLOR.ingles, v: ac.simulacros, meta: 2 },
    { id: 'cv', t: 'CV en inglés, LinkedIn y caso', tag: 'P0', color: RAMA_COLOR.programacion, v: ac.cv, meta: 3 },
    { id: 'clips', t: 'Clips publicados', tag: 'clipping', color: 'var(--eclipse)', v: ac.clips, meta: 50 },
    { id: 'mate', t: 'Matemática · horas', tag: 'CONAMAT', color: RAMA_COLOR.matematica, v: ac.mate, meta: 28 },
  ];

  return (
    <main className="pantalla plan-rama sprint" style={{ ['--c' as string]: RAMA_COLOR.trabajo }}>
      <Top volver="#/metas/semana" lado={`${dm(sp.desde)} al ${dm(sp.hasta)}${sp.numero > 1 ? ` · sprint ${sp.numero}` : ''}`} />
      <h1 className="titulo">Búsqueda intensiva</h1>
      <p className="pp-que">Dos semanas para llenar el embudo. Un proceso remoto suele tardar de 3 a 6 semanas hasta la oferta: si el día 14 no hay oferta, la rutina sigue igual y se ajusta el mensaje, no el esfuerzo.</p>

      <div className="sp-dias" aria-label={`Día ${sp.dia} de ${DIAS_SPRINT}`}>
        {sp.dias.map((d, i) => {
          const dow = (lunes0 + i) % 7;
          const cls = [d < date ? 'pas' : '', d === date ? 'hoy' : '', dow >= 5 ? 'finde' : ''].filter(Boolean).join(' ');
          return <span key={d} className={cls}><small className="mono">{DIAS[dow]}</small><b className="mono">{Number(d.slice(8))}</b></span>;
        })}
      </div>

      <div className="fila-t pp-sec"><span className="etiqueta">Embudo · meta de las 2 semanas</span><button className="subrayado mono" onClick={() => setEditar((x) => !x)}>{editar ? 'listo' : 'cambiar metas'}</button></div>
      <ul className="pb-embudo">
        {FILAS_EMBUDO.map(([k, n]) => (
          <li key={k}>
            <span>{n}</span>
            <span className="pb-barra"><i style={{ width: `${Math.min(1, real[k] / Math.max(1, metas[k])) * 100}%` }} /></span>
            {editar ? (
              <input className="campo-texto mono sp-meta" inputMode="numeric" defaultValue={metas[k]} aria-label={`Meta de ${n}`} onBlur={(e) => { const v = Number(e.target.value); if (v >= 0) setMetaEmbudo(k, v); }} />
            ) : <b className="mono">{k === 'oferta' ? real[k] : `${real[k]}/${metas[k]}`}</b>}
          </li>
        ))}
      </ul>

      <div className="etiqueta pp-sec">Lo que la hace funcionar</div>
      <ul className="sp-acomp">
        {acompana.map((x) => (
          <li key={x.id} style={{ ['--c' as string]: x.color }}>
            <div className="fila-t">
              <span>{x.id === 'cv' ? (
                <span className="sp-checks">
                  {(['cv', 'linkedin', 'caso'] as const).map((k) => <Casilla key={k} checked={!!plan.sprint?.checks?.[k]} label={`${k === 'cv' ? 'CV en inglés' : k === 'linkedin' ? 'LinkedIn' : 'Caso'}: marcar`} onChange={() => toggleSprintCheck(k)} />)}
                </span>
              ) : null}{x.t} <small className="mono" style={{ color: x.color }}>{x.tag}</small></span>
              <b className="mono">{fmt(x.v)}/{x.meta}</b>
            </div>
            <span className="mg-barra"><span style={{ width: `${Math.min(1, x.v / x.meta) * 100}%` }} /></span>
          </li>
        ))}
      </ul>

      {pausas.length > 0 && (
        <section className="sp-pausas">
          <span className="etiqueta">En pausa · sin borrar</span>
          {pausas.map((p) => (
            <div key={p.id} className="sp-pausa">
              <div>
                <b>{p.objetivo === 'ventas' ? 'Ventas · Eclipse' : 'Handyx'}</b>
                <p className="sub">{p.objetivo === 'ventas' ? 'Prospectos, guiones y objeciones guardados. El sprint de ventas arranca cuando haya trabajo.' : 'Roadmap, cortes y backlog quedan congelados. El lanzamiento se corre lo mismo que dure la pausa.'}</p>
              </div>
              <a className="mono sp-tag" href={p.objetivo === 'handyx' ? '#/metas/handyx' : '#/metas/impacto'}>pausa</a>
            </div>
          ))}
        </section>
      )}

      <div className="pr-card sp-revision">
        <span className="etiqueta" style={{ color: RAMA_COLOR.trabajo }}>{dm(sp.hasta)} · revisión</span>
        <h2 className="titulo">Qué mirar el día 14</h2>
        <p>1 · Si hay 0 respuestas: el problema es el CV o el mensaje. Se reescriben con el prompt 3; el volumen no se toca.</p>
        <p>2 · Si hay respuestas pero no entrevistas: el problema es el primer contacto. Más mensajes a quien decide.</p>
        <p>3 · Si hay entrevistas: inglés y caso pasan adelante. La rutina sigue hasta que entre la oferta.</p>
      </div>
      <p className="sub nota-izq">Las metas del embudo son supuestos para medir tus tasas reales. <a className="subrayado" href="#/metas/impacto">Qué cambia en la ruta →</a></p>
    </main>
  );
}

// ——— 10.3 ———

const FILAS_HORAS: [FilaHoras, string][] = [
  ['Programación', RAMA_COLOR.programacion], ['Matemática', RAMA_COLOR.matematica], ['Inglés', RAMA_COLOR.ingles], ['Búsqueda', RAMA_COLOR.trabajo],
  ['Clipping', 'var(--eclipse)'], ['Entrenamiento', RAMA_COLOR.salud], ['Handyx', RAMA_COLOR.handyx], ['Ventas', 'var(--eclipse)'],
];

export function RutaImpacto({ day }: { day: DayLog }) {
  const date = day.date;
  const plan = useStore((s) => s.plan);
  const settings = useStore((s) => s.settings);
  const t0 = settings?.startDate ?? T0_PLAN;
  const cfg = planSettings(settings);
  const antes = horasSemana(cfg.previo?.rutina === 'con-trabajo' ? 'con-trabajo' : 'weekday', 'weekend');
  const ahora = horasSemana('busqueda-intensiva', 'busqueda-intensiva-finde');
  const desdePausa = (plan.pausas ?? []).find((p) => p.objetivo === 'handyx' && p.motivo === MOTIVO_INTENSIVA)?.desde ?? t0;
  const esc = escenariosHandyx(desdePausa, t0);
  const fin = addDays(t0, 90);
  const semanas = 13;

  return (
    <main className="pantalla plan-rama impacto" style={{ ['--c' as string]: RAMA_COLOR.trabajo }}>
      <Top volver="#/metas/mapa" lado={`ruta · ${semanas} semanas`} />
      <h1 className="titulo">Qué cambia en la ruta</h1>
      <p className="pp-que">Dos semanas de búsqueda intensiva, inglés todos los días y Handyx y Eclipse en stand-by. Los proyectos y la matemática siguen en su fecha.</p>

      <div className="etiqueta pp-sec">Las ramas · {dm(t0)} a {dm(fin)}</div>
      <Linea t0={t0} />

      <div className="fila-t pp-sec ri-cab mono"><span>Horas / semana</span><span>antes</span><span>ahora</span><span>Δ</span></div>
      <table className="ri-horas">
        <caption className="sr-only">Horas por semana antes y ahora</caption>
        <tbody>
          {FILAS_HORAS.map(([n, c]) => {
            const d = Math.round((ahora[n] - antes[n]) * 10) / 10;
            return (
              <tr key={n}>
                <th scope="row" style={{ color: c }}>{n}</th>
                <td className="mono sub">{fmt(antes[n])}</td>
                <td className="mono"><b>{fmt(ahora[n])}</b></td>
                <td className="mono" style={{ color: d > 0 ? 'var(--salud)' : d < 0 ? 'var(--rutina)' : 'var(--sub)' }}>{d > 0 ? '+' : ''}{fmt(d)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="pr-card ri-card">
        <span className="etiqueta">Matemática a demanda · cada tramo abre un proyecto</span>
        <ul className="ri-mate">
          {PLAN.matematica.tramos.slice(0, 4).map((m) => {
            const desde = inicioSemana(m.desde, t0);
            const cuando = semanaDelPlan(date, t0) >= m.desde && semanaDelPlan(date, t0) <= m.hasta ? 'ahora' : m.desdeT && m.desdeT !== 'T+0' ? m.desdeT : dm(desde);
            const p = TRAMOS.find((t) => t.id === m.habilita);
            return (
              <li key={m.id}>
                <span className="mono" style={{ color: RAMA_COLOR.matematica }}>{cuando}</span>
                <span>{m.libros.map((l) => l.replace('CONAMAT · ', '')).join(' y ')} <span className="sub">→ {p ? nombreTramo(p) : m.habilita.toLowerCase()}</span></span>
              </li>
            );
          })}
        </ul>
        <p className="sub">Si un proyecto pide un tema antes de tiempo, se abre una ventana: el bloque de programación de la mañana pasa a ese tema hasta aprobar su test.</p>
      </section>

      <section className="pr-card ri-card" style={{ borderColor: RAMA_COLOR.handyx }}>
        <span className="etiqueta" style={{ color: RAMA_COLOR.handyx }}>Handyx · cuánto se corre</span>
        <p>El lanzamiento se corre, como mínimo, lo que dure el stand-by. Depende de cuándo entre el trabajo:</p>
        <ul className="ri-esc">
          {esc.map((e) => <li key={e.nombre}><span>Trabajo el {dm(e.fecha)} ({e.nombre})</span><b className="mono">lanza ≥ {dm(e.lanza)}</b></li>)}
        </ul>
        <p className="sub">La decisión de seguir o no con Handyx (T+12) se corre igual: el año de prueba cuenta desde que vuelve.</p>
      </section>

      <section className="pr-card ri-card">
        <span className="etiqueta">Ingresos a 90 días</span>
        <p>Con Eclipse en stand-by, la fuente principal pasa a ser el sueldo. Cuanto antes entre el trabajo, antes se cobra; el clipping suma mientras tanto.</p>
      </section>
      <p className="sub nota-izq">"Antes" es la rutina del plan T+18 sin la búsqueda intensiva (data/routines.json). Fechas de trabajo: escenarios, no promesas.</p>
    </main>
  );
}

/** La línea de tiempo de las ramas en las 13 semanas: segmentos por rama, stand-by punteado. */
function Linea({ t0 }: { t0: string }) {
  const W = 358;
  const X0 = 82;
  const dx = (W - X0 - 4) / 91;
  const xd = (d: string) => X0 + Math.max(0, Math.min(91, (new Date(d + 'T12:00').getTime() - new Date(t0 + 'T12:00').getTime()) / 864e5)) * dx;
  const t2 = inicioSemana(PLAN.hitos.find((h) => h.id === 'T+2')!.semana, t0);
  const fin = addDays(t0, 91);
  const prog = TRAMOS.filter((t) => inicioSemana(t.desde, t0) < fin && t.tipo !== 'pausa');
  const filas: { n: string; c: string; segs: { a: string; b: string; t?: string; sb?: boolean; ancho?: number }[] }[] = [
    { n: 'trabajo', c: RAMA_COLOR.trabajo, segs: [{ a: t0, b: addDays(t0, 13), t: 'sprint', ancho: 5 }, { a: addDays(t0, 14), b: fin, t: 'sigue hasta la oferta' }] },
    { n: 'inglés', c: RAMA_COLOR.ingles, segs: [{ a: t0, b: fin, t: 'ahora: 1 h 30 por día', ancho: 3 }] },
    { n: 'programación', c: RAMA_COLOR.programacion, segs: prog.map((t) => ({ a: inicioSemana(t.desde, t0), b: finSemana(t.hasta, t0) < fin ? finSemana(t.hasta, t0) : fin, t: t.tipo === 'ventana' ? t.id : t.id === 'P0' ? 'P0' : nombreTramo(t, false) })) },
    { n: 'matemática', c: RAMA_COLOR.matematica, segs: [{ a: t0, b: fin, t: 'Aritmética → Álgebra · 2 h por día' }] },
    { n: 'handyx', c: RAMA_COLOR.handyx, segs: [{ a: t0, b: t2, t: 'stand-by hasta el trabajo', sb: true }, { a: t2, b: fin, sb: true }] },
    { n: 'eclipse', c: 'var(--eclipse)', segs: [{ a: t0, b: fin, t: 'clipping 1 h 30 por día' }] },
  ];
  const FH = 34;
  return (
    <svg className="ri-linea" viewBox={`0 0 ${W} ${filas.length * FH + 18}`} role="img" aria-label="Las ramas en las 13 semanas: intensiva las dos primeras, inglés todos los días, Handyx en stand-by hasta el trabajo.">
      <rect x={xd(t0)} y={14} width={xd(addDays(t0, 14)) - xd(t0)} height={filas.length * FH} className="ri-intensiva" />
      <line x1={xd(t2)} x2={xd(t2)} y1={14} y2={filas.length * FH + 14} className="ri-t2" />
      <text x={xd(t0)} y={10} className="ri-eje">{dm(t0)}</text>
      <text x={xd(t2) - 22} y={10} className="ri-eje"><tspan fontWeight="700">T+2</tspan> · {dm(t2)}</text>
      <text x={W - 34} y={10} className="ri-eje">{dm(addDays(fin, -1))}</text>
      {filas.map((f, i) => {
        const y = 14 + i * FH + FH / 2 + 4;
        return (
          <g key={f.n} style={{ stroke: f.c, fill: f.c }}>
            <text x={0} y={y + 4} className="ri-n" style={{ stroke: 'none' }}>{f.n}</text>
            {f.segs.map((s, k) => (
              <g key={k}>
                <line x1={xd(s.a) + 1} x2={xd(s.b) - 1} y1={y} y2={y} strokeWidth={s.ancho ?? 2.5} strokeDasharray={s.sb ? '3 5' : undefined} opacity={s.sb ? 0.6 : 1} strokeLinecap="round" />
                {s.t && <text x={xd(s.a) + 2} y={y - 6} className="ri-t" style={{ stroke: 'none' }}>{s.t}</text>}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
