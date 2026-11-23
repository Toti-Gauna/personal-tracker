/**
 * Trazo 2.0 · las metas del mes (#/metas/mes): el calendario de calor del mes, lo que cierra, y las metas que arma el plan
 * (se confirman, se cambian o se borran) con las tuyas al lado. El clipping tiene su propia tarjeta.
 */
import { useMemo } from 'react';
import { AREAS } from '../../data/defaults';
import { appliesTo, dayPct, monthLabel, periodRange } from '../../data/goals';
import { cierraEnMes, claveMes, metasMesGeneradas, rangoMes, resumenMes } from '../../data/metas-plan';
import { SEMANAS, finSemana, semanaDelPlan } from '../../data/plan';
import { RAMA_COLOR, RAMA_NOMBRE } from '../../data/ramas';
import { weekday } from '../../data/study';
import { addDays, daysBetween } from '../../data/time';
import { Boton } from '../kit/controles';
import { Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { Mes } from '../perfil/Calor';
import { nivelDe, type CeldaDia } from '../perfil/datos';
import { colorArea, dm, rangoCorto, useCtx, visibles } from './datos';
import { Confirmar, EnStandBy, FilaMetaPlan, FilaMetaPropia, HitosPeriodo, Pestanas, Plegable } from './piezas';
import { colorV2 } from '../hoy/datos';
import './metas.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Las metas del mes salen del plan.</p>
    <p className="t-cuerpo">Trazo las arma desde el plan y vos las confirmás al empezar el mes. Hasta entonces se recalculan solas.</p>
    <p className="t-cuerpo">Tocá una meta para cambiar cuánto pide o borrarla. Las tuyas se suman al lado, con su casilla o su «+».</p>
    <p className="t-cuerpo">El calendario se llena según las tareas que cumpliste cada día: de menos a 85 % o más.</p>
  </>
);

export default function MesV2({ day }: PropsV2) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const [a, b] = rangoMes(date);
  const key = claveMes(date);
  const guardado = ctx.plan.meses[key];
  const generadas = useMemo(() => metasMesGeneradas(date, t0, ctx.study, { intensiva: ctx.intensiva && date < ctx.inicioTrabajo, pausa: ctx.plan }), [date, t0, ctx.study, ctx.intensiva, ctx.inicioTrabajo, ctx.plan]);
  const metas = guardado?.metas ?? generadas;
  const confirmado = guardado?.confirmado ?? (t0 >= a && t0 <= b ? t0 : undefined);
  const cierra = cierraEnMes(date, ctx.plan.entrevistas, t0);
  const personales = visibles(ctx.goals.filter((g) => appliesTo(g, 'mes', date)), ctx.plan, date);
  const s1 = Math.max(1, semanaDelPlan(a, t0));
  const s2 = Math.min(SEMANAS, semanaDelPlan(b, t0));
  const sig = addDays(b, 1);
  const finPlan = finSemana(SEMANAS, t0);
  const resumen = sig <= finPlan ? resumenMes(sig, t0, ctx.study) : [];
  const mesNombre = monthLabel(date).toLowerCase();
  const [desde, hasta] = periodRange('mes', date);
  const celdas: CeldaDia[] = Array.from({ length: daysBetween(desde, hasta) + 1 }, (_, i) => {
    const f = addDays(desde, i);
    const p = f <= date ? dayPct(ctx.days[f]) : null;
    return { fecha: f, dia: Number(f.slice(8)), nivel: nivelDe(p), pct: p, hoy: f === date, futuro: f > date };
  });
  const cargados = celdas.filter((c) => c.pct != null).length;
  const clipping = metas.filter((m) => m.area === 'eclipse');
  const delPlan = metas.filter((m) => m.area !== 'eclipse');
  const enPlan = s2 >= 1 && semanaDelPlan(b, t0) >= 1 && s1 <= SEMANAS;

  return (
    <Marco className="mt" titulo="Metas" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}
      acciones={<Boton soloIcono variante="fantasma" icono="mas" etiqueta="Nueva meta del mes" href="#/meta-nueva/mes" />}>
      <Pestanas actual="mes" />

      <Tarjeta heroe etiqueta={monthLabel(date)} className="mt-heroe">
        <p className="t-rotulo">{enPlan ? `Semanas ${s1} a ${s2} del plan` : rangoCorto(a, b)}</p>
        <h2 className="t-seccion">{monthLabel(date)}</h2>
        <Mes celdas={celdas} desplazamiento={weekday(desde)} nombre={`Calendario de ${monthLabel(date)}: ${cargados} ${cargados === 1 ? 'día cargado' : 'días cargados'}`} />
        <div className="mt-leyenda" data-grafico aria-hidden="true"><span>menos</span><i className="ca-n1" /><i className="ca-n2" /><i className="ca-n3" /><i className="ca-n4" /><span>85 % o más</span></div>
        <Confirmar tipo="meses" clave={key} metas={metas} date={date} confirmado={confirmado} que="el mes" />
      </Tarjeta>

      {cierra.length > 0 && (
        <Grupo titulo={`Cierra en ${mesNombre}`}>
          <ul className="capa-1 mt-cierra">
            {cierra.map((c, i) => (
              <li key={i}>
                <span className="t-rotulo">{dm(c.fecha)}</span>
                <i className={c.rama ? 'area-punto' : 'area-punto sin-rama'} style={c.rama ? { ['--area' as string]: colorV2(RAMA_COLOR[c.rama]) } : undefined} aria-hidden="true" />
                <span className="t-cuerpo">{c.texto}</span>
              </li>
            ))}
          </ul>
        </Grupo>
      )}

      <Grupo titulo={`Metas de ${mesNombre}`}>
        {delPlan.length > 0 || personales.length > 0 ? (
          <div className="capa-1 mt-lista">
            {delPlan.map((m) => <FilaMetaPlan key={m.id} m={m} tipo="meses" clave={key} base={metas} desde={a} hasta={b} date={date} ctx={ctx} conOrigen />)}
            {personales.map((g) => <FilaMetaPropia key={g.id} g={g} date={date} nota={`${g.rama ? RAMA_NOMBRE[g.rama] : g.group ?? AREAS[g.area].name} · tuya`} />)}
          </div>
        ) : (
          <Vacio ilustracion="metas" titulo="Sin metas este mes" texto="Agregá una propia y suma a tu mes." accion={<Boton variante="secundario" icono="mas" href="#/meta-nueva/mes">Meta del mes</Boton>} />
        )}
        {clipping.length > 0 && (
          <Plegable titulo="Clipping" nota="Roadmap" valor={`${clipping.length} ${clipping.length === 1 ? 'meta' : 'metas'}`} area={colorArea('eclipse')}>
            <div className="mt-lista-plana">
              {clipping.map((m) => <FilaMetaPlan key={m.id} m={m} tipo="meses" clave={key} base={metas} desde={a} hasta={b} date={date} ctx={ctx} conOrigen />)}
            </div>
            <Fila icono="grafico" titulo="El tablero del clipping" href="#/metas/clipping" />
          </Plegable>
        )}
      </Grupo>

      <Grupo titulo="Más del mes">
        <div className="capa-1 s-lista">
          <HitosPeriodo desde={a} hasta={b} date={date} />
          <EnStandBy date={date} />
          {resumen.length > 0 && <Fila icono="calendario" titulo={`${monthLabel(sig)} se arma el ${dm(sig)}`} nota={`Trazo propone ${resumen.join(', ')}`} />}
          <Fila icono="mas" titulo="Meta del mes" nota="Agregar una propia" href="#/meta-nueva/mes" />
        </div>
      </Grupo>
    </Marco>
  );
}
