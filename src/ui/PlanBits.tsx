import { useState } from 'react';
/** Piezas del plan T+18 que se repiten: avisos entre ramas, contadores, etiqueta de rama. */
import { avisoPasado, avisosEntreRamas, type Aviso } from '../data/avisos';
import { esDiaDePausa, horasRutinaIntensiva } from '../data/capacidad';
import { ACADEMY_HASTA } from '../data/routines';
import { alertaHorasIntensivo, alertasMatematica } from '../data/control';
import { focusStartedAt } from '../data/focus';
import { enPausa } from '../data/plan-state';
import { T0_PLAN, metasSemanaPlan } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import { addDays, nowMin } from '../data/time';
import type { DayLog, RamaOMain } from '../data/types';
import { desactivarIntensiva, lunesDe, contador, ensayarRespuesta, setPlanSettings, sumarContador, sumarHandyx } from '../state/plan';
import { inicioTrabajo, intensivaEn, planSettings, useStore } from '../state/store';
import { toast } from './avisos';
import { useNow } from './useNow';
import { HojaClip } from './HojaClip';
import { planEntre } from '../data/clipping';
import { clipsEntre } from '../data/clipping-metricas';

export const ramaColor = (r: RamaOMain) => RAMA_COLOR[r];

/** "trabajo → ingles" en mono, cada rama con su color. */
export function DeA({ de, a }: { de: RamaOMain; a: RamaOMain }) {
  return (
    <span className="de-a mono">
      <span style={{ color: ramaColor(de) }}>{de}</span><span className="sub"> → </span><span style={{ color: ramaColor(a) }}>{a}</span>
    </span>
  );
}

/** Avisos entre ramas, arriba de la lista de Hoy. */
export function AvisosRamas({ date, day }: { date: string; day?: DayLog }) {
  const plan = useStore((s) => s.plan);
  const settings = useStore((s) => s.settings);
  const focoKey = useStore((s) => s.focus?.key);
  const focoInicio = useStore((s) => (s.focus ? focusStartedAt(s.focus) : undefined));
  useNow(30000);
  const cfg = planSettings(settings);
  const pasado = day ? avisoPasado(day, focoKey, nowMin(), focoInicio != null ? nowMin(new Date(focoInicio)) : undefined) : null;
  const days = useStore((s) => s.days);
  const t0 = settings?.startDate ?? T0_PLAN;
  const inicio = inicioTrabajo(settings);
  // Ola 27: el control de horas del modo intensivo (días 10 y 20), la matemática que habilita un proyecto que ya arranca y la pausa de Navidad.
  const horas = alertaHorasIntensivo(date, days, { t0, inicioTrabajo: inicio });
  const control: Aviso[] = [
    ...(horas ? [{ id: horas.id, de: 'programacion' as const, a: 'main' as const, titulo: horas.titulo, texto: horas.texto, href: horas.href }] : []),
    ...alertasMatematica(date, t0).map((a) => ({ id: a.id, de: 'matematica' as const, a: 'programacion' as const, titulo: a.titulo, texto: a.texto, href: a.href })),
    // Ola 31 (v7): PetrIA pide ~8 h por día y la rutina no llega: hasta que elijas de dónde salen, Trazo lo dice.
    ...(() => {
      if (date >= inicio || !intensivaEn(settings, date)) return [];
      const h = horasRutinaIntensiva(cfg.extraProyecto, { academy: date <= ACADEMY_HASTA });
      return h.falta > 0 ? [{ id: 'horas-extra-petria', de: 'programacion' as const, a: 'main' as const, titulo: `Faltan ${String(h.falta).replace('.', ',')} h por semana para las 8 h por día de PetrIA`, texto: `La rutina da ${String(h.semana).replace('.', ',')} h de proyecto por semana y el roadmap pide ${h.meta}. Elegí en Ajustes qué bloques pasan a proyecto (nunca sueño, entreno ni Abi).`, href: '#/ajustes' }] : [];
    })(),
    ...(intensivaEn(settings, date) && esDiaDePausa(date) ? [{ id: 'pausa-fin-de-anio', de: 'main' as const, a: 'salud' as const, titulo: 'Pausa de fin de año', texto: 'Es el único descanso del modo intensivo: esta semana no se programa; la matemática, los idiomas y el entreno siguen.' }] : []),
  ];
  const avisos = [...(pasado ? [pasado] : []), ...control, ...avisosEntreRamas(date, plan, cfg, settings?.startDate)];
  if (!avisos.length) return null;
  const pasar = () => {
    if (!window.confirm('¿Pasás a la rutina con trabajo de lunes a viernes? Se aplica desde el próximo día que empieces.')) return;
    // Con trabajo nuevo termina la búsqueda intensiva: Handyx y ventas salen de la pausa.
    if (cfg.modo === 'busqueda-intensiva') desactivarIntensiva(date);
    setPlanSettings({ rutina: 'con-trabajo' });
    toast({ title: 'Rutina con trabajo', sub: 'Desde el próximo Buen día', color: 'var(--rutina)' }, false);
  };
  return (
    <section className="avisos-ramas" aria-label="Avisos entre ramas">
      {avisos.map((a) => {
        const cuerpo = (
          <>
            <DeA de={a.de} a={a.a} />
            <b>{a.titulo}</b>
            <span className="sub">{a.texto}</span>
          </>
        );
        return a.accion ? (
          <div key={a.id} className="aviso-rama" style={{ ['--c' as string]: ramaColor(a.de) }}>
            {cuerpo}
            <button className="btn-borde" onClick={pasar}>Pasar a la rutina con trabajo</button>
          </div>
        ) : (
          <a key={a.id} className="aviso-rama" href={a.href} style={{ ['--c' as string]: ramaColor(a.de) }}>{cuerpo}</a>
        );
      })}
    </section>
  );
}

/** Sumar a la semana con los contadores del plan: postulación, respuesta ensayada, operación de Handyx y entrenamiento. */
export function SumarPlan({ date }: { date: string }) {
  const plan = useStore((s) => s.plan);
  const t0 = useStore((s) => s.settings?.startDate);
  const sesiones = useStore((s) => s.train.sessions.filter((x) => x.date >= lunesDe(date) && x.date <= addDays(lunesDe(date), 6)).length);
  const metas = Object.fromEntries(metasSemanaPlan(date, t0).map((m) => [m.id, m.meta]));
  const ensayadas = plan.respuestas.filter((r) => r.veces > 0).length;
  const ops = plan.handyx[lunesDe(date)]?.operaciones ?? 0;
  const intensiva = useStore((s) => intensivaEn(s.settings, date));
  const clippingOn = useStore((s) => !!planSettings(s.settings).bloquesPendientes?.clipping);
  // Ola 23: los clips salen de la planilla del clipping; el botón abre la hoja Registrar.
  const clipping = useStore((s) => s.clipping);
  const [hojaClip, setHojaClip] = useState(false);
  const l = lunesDe(date);
  const clipsSem = clipsEntre(clipping, l, addDays(l, 6)) + contador(plan, date, 'clips');
  const items: { id: string; label: string; v: number; meta?: number; rama: RamaOMain; color?: string; run: () => void }[] = [
    { id: 'postulaciones', label: intensiva ? '+1 Postulación a medida' : '+1 Postulación', v: contador(plan, date, 'postulaciones'), meta: metas.postulaciones, rama: 'trabajo', run: () => sumarContador(date, 'postulaciones') },
    { id: 'respuestas', label: '+1 Respuesta ensayada', v: ensayadas, meta: plan.respuestas.length, rama: 'ingles', run: () => ensayarRespuesta(date) },
    // Una rama en pausa no genera contadores nuevos.
    ...(enPausa(plan, 'handyx', date) ? [] : [{ id: 'operaciones', label: '+1 Operación Handyx', v: ops, rama: 'handyx' as RamaOMain, run: () => sumarHandyx(date, { operaciones: 1 }) }]),
    ...(intensiva && clippingOn ? [{ id: 'clips', label: 'Registrar clips', v: clipsSem, meta: planEntre(l, addDays(l, 6)).clips, rama: 'main' as RamaOMain, color: 'var(--eclipse)', run: () => setHojaClip(true) }] : []),
    { id: 'entrenos', label: '+1 Entrené', v: sesiones + contador(plan, date, 'entrenos'), meta: metas.entrenos, rama: 'salud', run: () => sumarContador(date, 'entrenos') },
  ];
  return (
    <section className="sumar-sem" aria-label="Sumar a la semana">
      <span className="etiqueta">Sumar a la semana</span>
      <div className="sumar-grid">
        {items.map((x) => (
          <button key={x.id} style={{ ['--c' as string]: x.color ?? ramaColor(x.rama) }} onClick={x.run} aria-label={`${x.label}: van ${x.v}${x.meta ? ` de ${x.meta}` : ''}`}>
            <b>{x.label}</b>
            <span className="mono">{x.v}{x.meta ? ` / ${String(x.meta).replace('.', ',')}` : ''}</span>
          </button>
        ))}
      </div>
      {hojaClip && <HojaClip date={date} onCerrar={() => setHojaClip(false)} />}
    </section>
  );
}
