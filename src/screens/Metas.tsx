import { useState } from 'react';
import { averagePct, monthLabel, periodRange, ratio } from '../data/goals';
import type { Horizon } from '../data/goals-types';
import { avanceMeta, metasSemanaGeneradas } from '../data/metas-plan';
import { BIMESTRES, PLAN, SEMANAS, SEMANAS_BIM, T0_PLAN, enPlan, faseTrabajo, fechaHito, finSemana } from '../data/plan';
import { RAMA_COLOR, RAMA_NOMBRE, RAMAS } from '../data/ramas';
import { addDays, parseDate } from '../data/time';
import type { DayLog } from '../data/types';
import { lunesDe } from '../state/plan';
import { getState, planSettings, useStore } from '../state/store';
import { usePlanVista } from '../ui/usePlan';
import { AnioPlan, BimestrePlan, MesPlan, SemanaPlan } from './MetasPlan';
import { PlanProyecto } from './PlanProyecto';
import { PlanBusqueda, PlanHandyx, PlanIngles } from './PlanRamas';
import { PlanRuta } from './PlanRuta';
import { RutaImpacto, SprintBusqueda } from './Sprint';
import { RutaEvolucion } from './RutaEvolucion';
import { RutaMapa } from './RutaMapa';
import { PlanEtapas } from './PlanEtapas';
import { Clipping } from './Clipping';
import '../styles/metas.css';

const TABS = [['ruta', 'Ruta'], ['semana', 'Semana'], ['mes', 'Mes'], ['bimestre', 'Bim.'], ['anio', 'Año']] as const;
type Tab = (typeof TABS)[number][0];
const HORIZON: Record<Tab, Horizon> = { ruta: 'semana', semana: 'semana', mes: 'mes', bimestre: 'bim', anio: 'anio' };
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const largo = (d: string) => `${parseDate(d).getDate()} ${MES_LARGO[parseDate(d).getMonth()].slice(0, 3)} ${d.slice(0, 4)}`;
const mesAnio = (d: string) => `${MES_LARGO[parseDate(d).getMonth()]} de ${d.slice(0, 4)}`;
const pct = (n: number) => `${Math.round(n * 100)} %`;

/** 4 · Metas: Ruta, semana, mes, bimestre y año. */
export function Metas({ day, tab }: { day: DayLog; tab?: string }) {
  // Las pantallas del plan que se abren desde la pestaña Ruta.
  if (tab === 'mapa') return <RutaMapa day={day} />;
  if (tab === 'etapas') return <PlanEtapas day={day} />;
  if (tab === 'evolucion') return <RutaEvolucion day={day} />;
  if (tab === 'sprint') return <SprintBusqueda day={day} />;
  if (tab === 'impacto') return <RutaImpacto day={day} />;
  if (tab === 'trabajo') return <PlanBusqueda day={day} />;
  if (tab === 'ingles') return <PlanIngles day={day} />;
  if (tab === 'handyx') return <PlanHandyx day={day} />;
  if (tab === 'clipping' || tab?.startsWith('clipping/')) return <Clipping day={day} sub={tab.split('/')[1]} />;
  if (tab === 'proyecto' || tab?.startsWith('proyecto/')) return <PlanProyecto key={tab} day={day} id={tab.split('/')[1]} />;
  return <MetasTabs day={day} tab={tab} />;
}

function MetasTabs({ day, tab }: { day: DayLog; tab?: string }) {
  const [t, sub] = (tab ?? '').split('/');
  const actual: Tab = TABS.some(([x]) => x === t) ? (t as Tab) : 'ruta';
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const plan = useStore((s) => s.plan);
  const date = day.date;
  const t0 = settings.startDate ?? T0_PLAN;
  const v = usePlanVista(date);
  const [editar, setEditar] = useState(false);

  // Línea de resumen de cada pestaña.
  let linea = '';
  if (actual === 'ruta') {
    linea = `Plan T+18: seis ramas que salen de Trazo y vuelven en ${mesAnio(fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!, t0))}, con perfil senior en ML, DevSecOps, cloud y seguridad.`;
  } else if (actual === 'semana') {
    const fase = faseTrabajo(date, t0);
    const l = lunesDe(date);
    const ctx = { plan, days, study: getState().study, train: getState().train, t0 };
    const metas = plan.semanas[l]?.metas ?? metasSemanaGeneradas(date, t0, { intensiva: planSettings(settings).modo === 'busqueda-intensiva', pausa: plan });
    const porRama = RAMAS.map((r) => {
      const ms = metas.filter((m) => m.rama === r && m.meta);
      return [RAMA_NOMBRE[r], ms.length ? ms.reduce((s, m) => s + ratio(avanceMeta(m, l, addDays(l, 6), ctx).v, m.meta!), 0) / ms.length : 1] as const;
    }).sort((a, b) => a[1] - b[1]);
    linea = enPlan(date, t0)
      ? `Semana ${v.bim.semana} de ${v.nombreBim}, ${planSettings(settings).modo === 'busqueda-intensiva' ? 'en búsqueda intensiva, con Handyx y Eclipse en stand-by' : `en fase de ${fase.nombre.toLowerCase()}`}. Los contadores salen del plan${porRama[0][1] < 1 ? `; lo que más falta es ${porRama[0][0].toLowerCase()} y ${porRama[1][0].toLowerCase()}` : ''}.`
      : `El plan T+18 arranca el ${largo(t0)}. Mientras, tus metas de la semana.`;
  } else if (actual === 'mes') {
    const [from, to] = periodRange('mes', date);
    const { loaded, avg } = averagePct(days, from, to);
    linea = `${monthLabel(date)}: ${loaded} ${loaded === 1 ? 'día cargado' : 'días cargados'}${loaded ? ` y un promedio de ${pct(avg)}` : ''}. Las metas del mes salen del plan y las confirmás al empezarlo.`;
  } else if (actual === 'bimestre') {
    linea = `El bimestre es la unidad del plan: ${BIMESTRES} bimestres de ${SEMANAS_BIM} semanas, de ${mesAnio(t0)} a ${mesAnio(finSemana(SEMANAS, t0))}.`;
  } else {
    linea = `Año 1, del ${largo(t0)} al ${largo(finSemana(6 * SEMANAS_BIM, t0))}: los bimestres B1 a B6. Termina junto con la decisión de Handyx.`;
  }

  return (
    <main className={`pantalla metas-pag${actual === 'ruta' ? ' es-ruta' : ''}`}>
      {actual === 'ruta' && <MetasTop date={date} />}
      <header>
        <h1 className="titulo">Metas</h1>
        <p>{linea}</p>
      </header>
      <div className="pestanas" role="tablist" aria-label="Horizonte" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {TABS.map(([id, nombre]) => (
          <a key={id} role="tab" aria-selected={actual === id} href={`#/metas/${id}`}>{nombre}</a>
        ))}
      </div>

      {actual === 'ruta' && <PlanRuta day={day} />}
      {actual === 'semana' && <SemanaPlan day={day} editar={editar} />}
      {actual === 'mes' && <MesPlan day={day} editar={editar} />}
      {actual === 'bimestre' && <BimestrePlan key={sub ?? ''} day={day} editar={editar} elegido={sub ? Number(sub) : undefined} />}
      {actual === 'anio' && <AnioPlan day={day} editar={editar} />}

      {actual !== 'ruta' && (
        <button className="subrayado editar-metas" aria-pressed={editar} onClick={() => setEditar((x) => !x)}>{editar ? 'Listo' : 'Editar metas'}</button>
      )}
      {actual !== 'ruta' && <a className="nueva-meta-btn" href={`#/meta-nueva/${HORIZON[actual]}`}>+ {actual === 'mes' ? 'Meta del mes' : actual === 'anio' ? 'Meta del año' : actual === 'bimestre' ? 'Meta del bimestre' : 'Meta de la semana'}</a>}
    </main>
  );
}

/** "trazo" y HEAD → la rama de lo que toca ahora, arriba de la Ruta. */
function MetasTop({ date }: { date: string }) {
  const v = usePlanVista(date);
  return (
    <div className="metas-top">
      <span className="logo titulo resaltado" style={{ ['--c' as string]: 'var(--economia)' }}>trazo</span>
      <span className="mono">HEAD → <b style={{ color: RAMA_COLOR[v.head] }}>{v.head}</b></span>
    </div>
  );
}
