/**
 * Trazo 2.0 · las metas de la semana (#/metas/semana): lo que el plan T+18 pide esta semana, rama por rama, y tus metas al lado.
 * Se confirman, se cambian o se borran (tocando cada una); las tuyas tienen casilla, "+", submetas o la tira de los siete días.
 */
import { useMemo } from 'react';
import { AREAS } from '../../data/defaults';
import { appliesTo, dayPct, ratio, valueOf } from '../../data/goals';
import type { Goal } from '../../data/goals-types';
import { avanceMeta, metasSemanaGeneradas, PASOS_MAPA, tituloSemana } from '../../data/metas-plan';
import { PLAN, SEMANAS, diaSemanaCorto, faseTrabajo, semanaDelPlan } from '../../data/plan';
import { RAMAS, RAMA_NOMBRE } from '../../data/ramas';
import { addDays, parseDate } from '../../data/time';
import type { Rama } from '../../data/types';
import { lunesDe } from '../../state/plan';
import { usePlanVista } from '../../ui/usePlan';
import { Barras } from '../estudio/Barras';
import { Boton } from '../kit/controles';
import { Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import type { PropsV2 } from '../registro';
import { colorArea, colorRama, dm, fmt, rangoCorto, useCtx, visibles } from './datos';
import { Confirmar, EnStandBy, FilaMetaPlan, FilaMetaPropia, HitosPeriodo, MapaPortfolio, Pestanas, Plegable } from './piezas';
import './metas.css';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
/** Las ramas en el orden en que se muestran en la semana. */
const ORDEN: Rama[] = ['trabajo', 'programacion', 'matematica', 'ingles', 'handyx', 'salud'];

export const INFO_SUMAR = (
  <>
    <p className="t-cuerpo-l">Cada meta se suma a su manera.</p>
    <ul className="mt-info-lista t-cuerpo">
      <li><b>Casilla</b>: una tarea, la tildás una vez.</li>
      <li><b>+</b>: un contador, tocás cada vez que lo hacés.</li>
      <li><b>L M X J V S D</b>: una meta diaria, tocás cada día que la cumplís.</li>
      <li><b>Submetas</b>: pasos dentro de la meta, tildás los que hiciste.</li>
      <li><b>auto</b>: se suma sola desde Estudio, Entreno o el plan.</li>
    </ul>
    <p className="t-cuerpo">Tocá una meta para cambiar cuánto pide o borrarla; si la borrás podés deshacerlo.</p>
    <p className="t-cuerpo">¿La usás seguido? En «Meta de la semana», «Mostrar en Hoy» pone un botón para sumar rápido.</p>
  </>
);

export default function SemanaV2({ day }: PropsV2) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const v = usePlanVista(date);
  const l = lunesDe(date);
  const d7 = addDays(l, 6);
  const s = semanaDelPlan(date, t0);
  const enPlan = s >= 1 && s <= SEMANAS;
  const guardadas = ctx.plan.semanas[l];
  const generadas = useMemo(() => metasSemanaGeneradas(date, t0, { intensiva: ctx.intensiva && date < ctx.inicioTrabajo, pausa: ctx.plan }), [date, t0, ctx.intensiva, ctx.inicioTrabajo, ctx.plan]);
  const metas = guardadas?.metas ?? generadas;
  const personales = visibles(ctx.goals.filter((g) => appliesTo(g, 'semana', date)), ctx.plan, date);
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
  // Lo que más falta, para decirlo en una línea.
  const porRama = RAMAS.map((r) => {
    const ms = metas.filter((m) => m.rama === r && m.meta);
    return [RAMA_NOMBRE[r], ms.length ? ms.reduce((a, m) => a + ratio(avanceMeta(m, l, d7, ctx).v, m.meta!), 0) / ms.length : 1] as const;
  }).sort((a, b) => a[1] - b[1]);
  const falta = porRama[0][1] < 1 ? `${porRama[0][0]} y ${porRama[1][0]}` : 'Todas las ramas al día';

  const sinRama = personales.filter((g) => !g.rama);
  const grupos = new Map<string, Goal[]>();
  for (const g of sinRama) { const k = g.group ?? AREAS[g.area].name; grupos.set(k, [...(grupos.get(k) ?? []), g]); }
  const hechasDe = (ms: typeof metas, gs: Goal[]) => ms.filter((m) => avanceMeta(m, l, d7, ctx).v >= (m.meta ?? 1)).length + gs.filter((g) => valueOf(g, date, vctx) >= g.target).length;

  let primero = true;
  const abierta = () => { const a = primero; primero = false; return a; };
  const faseTxt = ctx.intensiva ? 'Búsqueda intensiva: sigue hasta que entre el trabajo.' : fase.id === 'busqueda' ? 'Fase de búsqueda: los contadores cambian solos en T+2.' : 'Fase con trabajo nuevo.';
  const sinMapa = !(ctx.plan.mapaPortfolio && PASOS_MAPA.every(([k]) => ctx.plan.mapaPortfolio![k]));
  const hayMetas = metas.length > 0 || personales.length > 0;

  return (
    <Marco className="mt" titulo="Metas" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO_SUMAR}
      acciones={<Boton soloIcono variante="fantasma" icono="mas" etiqueta="Nueva meta de la semana" href="#/meta-nueva/semana" />}>
      <Pestanas actual="semana" />

      <Tarjeta heroe etiqueta="Esta semana" className="mt-heroe">
        <p className="t-rotulo">{rangoCorto(l, d7)}{enPlan ? ` · semana ${s} de ${SEMANAS}` : ''}</p>
        <div className="mt-heroe-fila">
          <h2 className="t-seccion">{enPlan ? tituloSemana(date, ctx.plan.entrevistas, t0) : s < 1 ? 'Antes del plan' : 'Después del plan'}</h2>
          <p className="mt-heroe-numero"><b className="t-heroe t-dato"><Numero valor={Math.round(avg * 100)} /></b><span className="t-rotulo">% cumplido</span></p>
        </div>
        <div data-grafico>
          <Barras alto={56} nombre={`Cumplimiento por día: ${por.map((d, i) => `${DIAS[i]} ${d.p == null ? 'sin datos' : `${Math.round(d.p * 100)} %`}`).join(', ')}`}
            barras={por.map((d, i) => ({ etiqueta: DIAS[i], valor: (d.p ?? 0) * 100, hoy: i === hoy, texto: d.p == null ? '–' : String(Math.round(d.p * 100)) }))} meta={85} />
        </div>
        {enPlan ? (
          <>
            <Confirmar tipo="semanas" clave={l} metas={metas} date={date} confirmado={guardadas?.confirmado} que="la semana" />
          </>
        ) : (
          <p className="t-nota">{s < 1 ? `El plan arranca el ${dm(t0)}: ahí aparecen los contadores de cada rama.` : 'El plan T+18 terminó; quedan tus metas.'}</p>
        )}
      </Tarjeta>

      {ORDEN.map((r) => {
        const ms = metas.filter((m) => m.rama === r);
        const gs = personales.filter((g) => g.rama === r);
        if (!ms.length && !gs.length) return null;
        const etapa = v.ramas.find((x) => x.rama === r);
        return (
          <Plegable key={r} titulo={RAMA_NOMBRE[r]} nota={lado[r] || undefined} intro={etapa?.titulo} valor={`${hechasDe(ms, gs)}/${ms.length + gs.length}`} area={colorRama(r)} abierta={abierta()}>
            <div className="mt-lista-plana">
              {ms.map((m) => <FilaMetaPlan key={m.id} m={m} tipo="semanas" clave={l} base={metas} desde={l} hasta={d7} date={date} ctx={ctx} sinNota />)}
              {gs.map((g) => <FilaMetaPropia key={g.id} g={g} date={date} />)}
            </div>
          </Plegable>
        );
      })}
      {metas.some((m) => !m.rama) && (
        <Plegable titulo="Clipping" nota="Fuera del plan" valor={`${hechasDe(metas.filter((m) => !m.rama), [])}/${metas.filter((m) => !m.rama).length}`} area={colorArea('eclipse')} abierta={abierta()}>
          <div className="mt-lista-plana">
            {metas.filter((m) => !m.rama).map((m) => <FilaMetaPlan key={m.id} m={m} tipo="semanas" clave={l} base={metas} desde={l} hasta={d7} date={date} ctx={ctx} sinNota />)}
          </div>
        </Plegable>
      )}
      {[...grupos.entries()].map(([nombre, gs]) => (
        <Plegable key={nombre} titulo={nombre} nota="Área · tuyas, fuera del plan" valor={`${hechasDe([], gs)}/${gs.length}`} area={colorArea(gs[0].area)} abierta={abierta()}>
          <div className="mt-lista-plana">{gs.map((g) => <FilaMetaPropia key={g.id} g={g} date={date} />)}</div>
        </Plegable>
      ))}
      {!hayMetas && <Vacio ilustracion="metas" titulo="Sin metas esta semana" texto="Agregá una propia y suma a tu semana." accion={<Boton variante="secundario" icono="mas" href="#/meta-nueva/semana">Meta de la semana</Boton>} />}

      <Grupo titulo="Más de la semana">
        <div className="capa-1 s-lista">
          {enPlan && <Fila icono="ritmo" titulo="Lo que más falta" nota={falta} />}
          {enPlan && <Fila icono="calendario" titulo="Fase de la semana" nota={faseTxt} />}
          {sinMapa && <MapaPortfolio />}
          <HitosPeriodo desde={l} hasta={d7} date={date} />
          <EnStandBy date={date} />
          <Fila icono="mas" titulo="Meta de la semana" nota="Agregar una propia" href="#/meta-nueva/semana" />
        </div>
      </Grupo>
    </Marco>
  );
}
