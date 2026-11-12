import { useMemo, useState } from 'react';
import { AREAS } from '../data/defaults';
import { BIMESTERS, WEEK_KINDS, WEEK_KIND_LABEL, bimesterAt } from '../data/bimesters';
import { bimester } from '../data/derive';
import { appliesTo, averagePct, dayPct, monthLabel, periodKey, periodRange, ratio, valueOf, yearMonths } from '../data/goals';
import type { Goal, Horizon } from '../data/goals-types';
import { addDays, daysBetween, parseDate } from '../data/time';
import { activitiesFor, focusUnit, unitName, weekday } from '../data/study';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { addProgress, deleteGoal, renameBimester, stepOf } from '../state/goals';
import { Calendario } from '../ui/Calendario';
import { GoalRow } from '../ui/GoalRow';
import '../styles/metas.css';

const TABS = [['semana', 'Semana'], ['mes', 'Mes'], ['bimestre', 'Bimestre'], ['anio', 'Año']] as const;
type Tab = (typeof TABS)[number][0];
const HORIZON: Record<Tab, Horizon> = { semana: 'semana', mes: 'mes', bimestre: 'bim', anio: 'anio' };
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${parseDate(d).getDate()} ${MES_CORTO[parseDate(d).getMonth()]}`;
const pct = (n: number) => `${Math.round(n * 100)} %`;

function groupGoals(goals: Goal[]) {
  const map = new Map<string, Goal[]>();
  for (const g of goals) {
    const k = g.group ?? AREAS[g.area].name;
    map.set(k, [...(map.get(k) ?? []), g]);
  }
  return [...map.entries()];
}

/** 4 · Metas: semana, mes, bimestre y año. */
export function Metas({ day, tab }: { day: DayLog; tab?: string }) {
  const actual: Tab = TABS.some(([t]) => t === tab) ? (tab as Tab) : 'semana';
  const settings = useStore((s) => s.settings)!;
  const names = useStore((s) => s.goals.bimesterNames);
  const days = useStore((s) => s.days);
  const study = useStore((s) => s.study);
  const goals = useStore((s) => s.goals.goals);
  const train = useStore((s) => s.train);
  const date = day.date;
  const bim = bimester(settings.startDate, date, names);
  const list = useMemo(() => goals.filter((g) => appliesTo(g, HORIZON[actual], date)), [goals, actual, date]);
  const ctx = { study, days, train };
  const [editar, setEditar] = useState(false);

  // Línea de resumen de cada pestaña.
  let linea = '';
  if (actual === 'semana') {
    const gs = groupGoals(list).map(([n, xs]) => [n, xs.reduce((s, g) => s + ratio(valueOf(g, date, ctx), g.target), 0) / xs.length] as const).sort((a, b) => a[1] - b[1]);
    const avg = list.length ? list.reduce((s, g) => s + ratio(valueOf(g, date, ctx), g.target), 0) / list.length : 0;
    linea = `Semana ${bim.week} de ${bim.name}: vas ${pct(avg)}.${gs.length > 1 && avg < 1 ? ` Lo que más falta es ${gs[0][0]} y ${gs[1][0]}.` : ''}`;
  } else if (actual === 'mes') {
    const [from, to] = periodRange('mes', date);
    const { loaded, avg } = averagePct(days, from, to);
    linea = `${monthLabel(date)}: ${loaded} ${loaded === 1 ? 'día cargado' : 'días cargados'}${loaded ? ` y un promedio de ${pct(avg)}` : ''}. Cada casilla es un día; cuanto más lleno, mejor.`;
  } else if (actual === 'bimestre') {
    linea = 'El bimestre en curso: estudio, programación y el producto que se vende desde Eclipse.';
  } else {
    linea = 'Año 1, de noviembre 2026 a octubre 2027: seis bimestres y las metas grandes que los ordenan.';
  }

  return (
    <main className="pantalla metas-pag">
      <header>
        <h1 className="titulo">Metas</h1>
        <p>{linea}</p>
      </header>
      <div className="pestanas" role="tablist" aria-label="Horizonte" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {TABS.map(([id, nombre]) => (
          <a key={id} role="tab" aria-selected={actual === id} href={`#/metas/${id}`}>{nombre}</a>
        ))}
      </div>

      {actual === 'semana' && <Semana date={date} list={list} days={days} week={bim.week} editar={editar} />}
      {actual === 'mes' && <Mes date={date} list={list} days={days} editar={editar} />}
      {actual === 'bimestre' && <Bimestre day={day} list={list} name={bim.name} editar={editar} />}
      {actual === 'anio' && <Anio date={date} list={list} editar={editar} />}

      {list.length > 0 && (
        <button className="subrayado editar-metas" aria-pressed={editar} onClick={() => setEditar((v) => !v)}>{editar ? 'Listo' : 'Borrar metas'}</button>
      )}
      <a className="nueva-meta-btn" href={`#/meta-nueva/${HORIZON[actual]}`}>+ {actual === 'mes' ? 'Meta del mes' : actual === 'anio' ? 'Meta del año' : actual === 'bimestre' ? 'Meta del bimestre' : 'Nueva meta'}</a>
    </main>
  );
}

function Lista({ list, date, plano, editar }: { list: Goal[]; date: string; plano?: boolean; editar?: boolean }) {
  if (!list.length) return <p className="sub vacio">Todavía no hay metas acá.</p>;
  if (plano) return <ul className="mg-lista">{list.map((g) => <GoalRow key={g.id} g={g} date={date} editar={editar} />)}</ul>;
  return (
    <>
      {groupGoals(list).map(([nombre, xs]) => (
        <section key={nombre} className="mg-grupo" style={{ ['--c' as string]: AREAS[xs[0].area].css }}>
          <div className="mg-grupo-cab"><h2 className="resaltado">{nombre}</h2></div>
          <ul className="mg-lista">{xs.map((g) => <GoalRow key={g.id} g={g} date={date} editar={editar} />)}</ul>
        </section>
      ))}
    </>
  );
}

function Semana({ date, list, days, week, editar }: { date: string; list: Goal[]; days: Record<string, DayLog>; week: number; editar: boolean }) {
  const lunes = periodKey('semana', date);
  const domingo = addDays(lunes, 6);
  const study = useStore((s) => s.study);
  const train = useStore((s) => s.train);
  const ctx = { study, days, train };
  const avg = list.length ? list.reduce((s, g) => s + ratio(valueOf(g, date, ctx), g.target), 0) / list.length : 0;
  const por = DIAS.map((_, i) => ({ key: addDays(lunes, i), p: dayPct(days[addDays(lunes, i)]) }));
  const mejor = Math.max(0, ...por.map((d) => d.p ?? 0));
  const hoy = weekday(date);
  return (
    <>
      <div className="sem-cab">
        <div>
          <span className="etiqueta">{dm(lunes)} — {dm(domingo)} · semana {week}</span>
          <h2 className="sem-t">Esta semana</h2>
        </div>
        <span className="sem-pct">{Math.round(avg * 100)}<small>%</small></span>
      </div>
      <div className="sem-dias" role="img" aria-label={`Cumplimiento por día: ${por.map((d, i) => `${DIAS[i]} ${d.p == null ? 'sin datos' : Math.round(d.p * 100)}`).join(', ')}`}>
        {por.map((d, i) => (
          <div key={d.key} className={i === hoy ? 'hoy' : ''}>
            <span className="mono">{DIAS[i]}{d.p != null ? ` ${Math.round(d.p * 100)}` : ''}</span>
            <span className="sem-barra" style={{ height: `${(d.p ?? 0) * 100}%`, background: d.p != null && d.p === mejor && mejor > 0 ? 'var(--economia)' : 'var(--tinta)' }} />
          </div>
        ))}
      </div>
      <Lista list={list} date={date} editar={editar} />
    </>
  );
}

function Mes({ date, list, days, editar }: { date: string; list: Goal[]; days: Record<string, DayLog>; editar: boolean }) {
  const [from, to] = periodRange('mes', date);
  const total = daysBetween(from, to) + 1;
  const offset = weekday(from);
  const semana = Math.floor((parseDate(date).getDate() - 1 + offset) / 7) + 1;
  const semanas = Math.ceil((total + offset) / 7);
  return (
    <>
      <div className="fila-t mes-cab">
        <h2>{monthLabel(date)}</h2>
        <span className="mono sub">semana {semana} de {semanas}</span>
      </div>
      <Calendario date={date} days={days} />
      <div className="etiqueta mg-t">Metas de {monthLabel(date).toLowerCase()}</div>
      <Lista list={list} date={date} plano editar={editar} />
    </>
  );
}

function Bimestre({ day, list, name, editar }: { day: DayLog; list: Goal[]; name: string; editar: boolean }) {
  const date = day.date;
  const study = useStore((s) => s.study);
  const info = bimesterAt(date);
  const [editando, setEditando] = useState<string | null>(null);
  const d = Math.max(0, daysBetween(info.start, date));
  const semana = Math.min(9, Math.floor(d / 7) + 1);
  const quedan = Math.max(0, daysBetween(date, info.end));
  const antes = date < info.start;
  const nombreDe = (id: string) => study.activities.find((a) => a.id === id);
  const conUnidades = study.activities.filter((a) => a.units?.length);
  const hoy = activitiesFor(study, date);
  const empiezaProducto = addDays(info.start, 4 * 7);
  const productoSemana = semana >= 5 ? Math.min(8, semana - 4) : null;
  void nombreDe;

  return (
    <>
      <div className="etiqueta">Bimestre {info.n} de 9 · {dm(info.start)} — {dm(info.end)}</div>
      <div className="bim-nombre">
        {editando == null ? (
          <>
            <h2 className="titulo">{name}</h2>
            <button className="btn-lapiz" aria-label="Cambiar el nombre del bimestre" onClick={() => setEditando(name)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z M14.5 6.5l3 3" /></svg>
            </button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); renameBimester(info.n, editando); setEditando(null); }}>
            <input className="campo-grande" autoFocus value={editando} onChange={(e) => setEditando(e.target.value)} aria-label="Nombre del bimestre" maxLength={30} />
            <div className="dos-botones">
              <button type="button" className="btn-borde" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="submit" className="btn-principal">Guardar nombre</button>
            </div>
            <p className="sub nota-izq">Vacío vuelve a «{info.name}».</p>
          </form>
        )}
      </div>
      <p className="sub bim-sub">Industria: {info.industry} · {antes ? `empieza el ${dm(info.start)}` : `quedan ${quedan} ${quedan === 1 ? 'día' : 'días'}`}</p>
      <div className="semanas-9" aria-label="Las 9 semanas del bimestre">
        {WEEK_KINDS.map((k, i) => <span key={i} className={i + 1 === semana && !antes ? 'on' : i + 1 < semana ? 'pas' : ''} aria-label={`Semana ${i + 1}: ${WEEK_KIND_LABEL[k]}`}>{k}</span>)}
      </div>
      <div className="sub semanas-leyenda mono">E estudio · P producto · C cierre</div>

      <div className="carriles">
        {conUnidades.map((a) => {
          const ok = a.units!.filter((u) => study.units[a.id]?.[u.n]?.approvedOn).length;
          const front = study.fronts.find((f) => f.id === a.front);
          const u = focusUnit(a, study, date);
          const hoyAct = hoy.find((x) => x.id === a.id);
          return (
            <section key={a.id} className="carril" style={{ ['--c' as string]: front ? AREAS[front.color].css : 'var(--ing)' }}>
              <div className="carril-cab"><span className="etiqueta">{front?.name}</span><span className="mono">{ok}/{a.units!.length} unidades</span></div>
              <h3>{a.title}</h3>
              <div className="mg-barra"><span style={{ width: `${ratio(ok, a.units!.length) * 100}%` }} /></div>
              <p className="sub">{ok === a.units!.length ? 'Todas las unidades aprobadas.' : u && hoyAct ? `Hoy: ${unitName(a, u)}` : u ? `Sigue: ${unitName(a, u)}` : 'Sin unidades pendientes.'}</p>
            </section>
          );
        })}
        <section className="carril" style={{ ['--c' as string]: 'var(--economia)' }}>
          <div className="carril-cab"><span className="etiqueta">Producto</span><span className="mono">{productoSemana ? `semana ${productoSemana}` : '—'}</span></div>
          <h3>{info.product}</h3>
          <div className="mg-barra"><span style={{ width: `${productoSemana ? (productoSemana / 4) * 100 : 0}%` }} /></div>
          <p className="sub">{semana < 5 && !antes ? `Empieza el ${dm(empiezaProducto)} · se vende desde Eclipse` : semana >= 9 ? 'Cierre: README en inglés, demo de 2 minutos y one-pager de venta' : productoSemana ? 'Construcción del producto · se vende desde Eclipse' : `Empieza el ${dm(empiezaProducto)}`}</p>
        </section>
      </div>

      <div className="etiqueta mg-t">También en este bimestre</div>
      <Lista list={list} date={date} plano editar={editar} />
    </>
  );
}

function Anio({ date, list, editar }: { date: string; list: Goal[]; editar: boolean }) {
  const days = useStore((s) => s.days);
  const names = useStore((s) => s.goals.bimesterNames);
  const actual = bimesterAt(date);
  const año = BIMESTERS.slice(0, 6);
  const meses = yearMonths(1);
  const prom = meses.map((m) => ({ ...m, ...averagePct(days, `${m.key}-01`, `${m.key}-31`) }));
  const max = 1;
  return (
    <>
      <div className="bims-6">
        {año.map((b) => (
          <a key={b.n} href="#/metas/bimestre" className={b.n === actual.n ? 'on' : ''} aria-label={`Bimestre ${b.n}: ${names[b.n] ?? b.name}`}>
            <span className="mono">B{b.n}</span>
            <span>{names[b.n] ?? b.name}</span>
          </a>
        ))}
      </div>
      <div className="bims-fechas mono sub"><span>nov 26</span><span>may 27</span><span>oct 27</span></div>

      <div className="fila-t mg-t"><span className="etiqueta">Promedio por mes</span><span className="mono sub">objetivo 85 %</span></div>
      <div className="meses" role="img" aria-label={`Promedio por mes: ${prom.map((m) => `${m.name} ${m.loaded ? Math.round(m.avg * 100) + ' %' : 'sin datos'}`).join(', ')}`}>
        <div className="meses-meta" />
        {prom.map((m) => (
          <div key={m.key}>
            <span className="meses-barra" style={{ height: `${Math.max(m.loaded ? 3 : 0, (m.avg / max) * 100)}%` }} />
            <span className="mono sub">{m.letter}</span>
          </div>
        ))}
      </div>

      <div className="etiqueta mg-t">Las metas del año</div>
      <ul className="anio-lista">
        {list.map((g) => <AnioMeta key={g.id} g={g} date={date} editar={editar} />)}
      </ul>
      {!list.length && <p className="sub vacio">Todavía no hay metas del año.</p>}
    </>
  );
}

function AnioMeta({ g, date, editar }: { g: Goal; date: string; editar: boolean }) {
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const train = useStore((s) => s.train);
  const v = valueOf(g, date, { study, days, train });
  const fmt = (n: number) => String(n).replace('.', ',');
  return (
    <li style={{ ['--c' as string]: AREAS[g.area].css }}>
      <div className="anio-cab">
        <span className="resaltado anio-grupo">{g.group ?? AREAS[g.area].name}</span>
        <span className="mono">{g.unit === 'USD' ? `USD ${fmt(v)}` : g.unit === 'kg' ? `${fmt(v)} kg` : g.unit === 'bim.' ? `${fmt(v)}/${g.target} bim.` : `${fmt(v)}/${g.target}`}</span>
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


