/** Lo del plan que Hoy muestra como datos: los avisos entre ramas y los contadores de la semana. */
import { avisoPasado, avisosEntreRamas, type Aviso } from '../data/avisos';
import { esDiaDePausa, horasRutinaIntensiva } from '../data/capacidad';
import { ACADEMY_HASTA } from '../data/routines';
import { revisionHecha } from '../data/revision';
import { alertaHorasIntensivo, alertasMatematica } from '../data/control';
import { focusStartedAt } from '../data/focus';
import { enPausa } from '../data/plan-state';
import { T0_PLAN, metasSemanaPlan } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import { addDays, nowMin } from '../data/time';
import type { DayLog, RamaOMain } from '../data/types';
import { desactivarIntensiva, lunesDe, contador, ensayarRespuesta, setPlanSettings, sumarContador, sumarHandyx } from '../state/plan';
import { inicioTrabajo, intensivaEn, planSettings, useStore } from '../state/store';
import { useNow } from './useNow';
import { planEntre } from '../data/clipping';
import { clipsEntre } from '../data/clipping-metricas';

export const ramaColor = (r: RamaOMain) => RAMA_COLOR[r];

/** Los avisos entre ramas como datos: Hoy los muestra en su hoja de avisos. */
export function useAvisosRamas(date: string, day?: DayLog): { avisos: Aviso[]; aplicarRutinaConTrabajo: () => void } {
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
  const horas = alertaHorasIntensivo(date, days, { t0, inicioTrabajo: inicio, manual: plan.horasManuales });
  const control: Aviso[] = [
    ...(horas ? [{ id: horas.id, de: 'programacion' as const, a: 'main' as const, titulo: horas.titulo, texto: horas.texto, href: horas.href }] : []),
    ...alertasMatematica(date, t0).map((a) => ({ id: a.id, de: 'matematica' as const, a: 'programacion' as const, titulo: a.titulo, texto: a.texto, href: a.href })),
    // Ola 31 (v7): PetrIA pide ~8 h por día y la rutina no llega: hasta que elijas de dónde salen, Trazo lo dice.
    ...(() => {
      if (date >= inicio || !intensivaEn(settings, date)) return [];
      const h = horasRutinaIntensiva(cfg.extraProyecto, { academy: date <= ACADEMY_HASTA });
      return h.falta > 0 ? [{ id: 'horas-extra-petria', de: 'programacion' as const, a: 'main' as const, titulo: `Faltan ${String(h.falta).replace('.', ',')} h por semana para las 8 h por día de PetrIA`, texto: `La rutina da ${String(h.semana).replace('.', ',')} h de proyecto por semana y el roadmap pide ${h.meta}. Elegí en Ajustes qué bloques pasan a proyecto (nunca sueño, entreno ni Abi).`, href: '#/ajustes' }] : [];
    })(),
    // Ola 32: el domingo, la revisión semanal (hasta que la marques hecha).
    ...(new Date(`${date}T12:00:00`).getDay() === 0 && !revisionHecha(plan, date) ? [{ id: 'revision-semanal', de: 'main' as const, a: 'main' as const, titulo: 'Revisión semanal', texto: 'Trazo, learning.md, english.md, hours.md y el plan: la semana en números y lo que viene.', href: '#/metas/revision' }] : []),
    ...(intensivaEn(settings, date) && esDiaDePausa(date) ? [{ id: 'pausa-fin-de-anio', de: 'main' as const, a: 'salud' as const, titulo: 'Pausa de fin de año', texto: 'Es el único descanso del modo intensivo: esta semana no se programa; la matemática, los idiomas y el entreno siguen.' }] : []),
  ];
  const avisos = [...(pasado ? [pasado] : []), ...control, ...avisosEntreRamas(date, plan, cfg, settings?.startDate)];
  const aplicarRutinaConTrabajo = () => {
    // Con trabajo nuevo termina la búsqueda intensiva: Handyx y ventas salen de la pausa.
    if (cfg.modo === 'busqueda-intensiva') desactivarIntensiva(date);
    setPlanSettings({ rutina: 'con-trabajo' });
  };
  return { avisos, aplicarRutinaConTrabajo };
}

export interface ItemSemana { id: string; label: string; v: number; meta?: number; rama: RamaOMain; color?: string; run: () => void }

/** Los contadores de la semana como datos (`abrirClips` es lo que hace el de clips). */
export function useItemsSemana(date: string, abrirClips: () => void): ItemSemana[] {
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
  const l = lunesDe(date);
  const clipsSem = clipsEntre(clipping, l, addDays(l, 6)) + contador(plan, date, 'clips');
  const items: ItemSemana[] = [
    { id: 'postulaciones', label: intensiva ? '+1 Postulación a medida' : '+1 Postulación', v: contador(plan, date, 'postulaciones'), meta: metas.postulaciones, rama: 'trabajo', run: () => sumarContador(date, 'postulaciones') },
    { id: 'respuestas', label: '+1 Respuesta ensayada', v: ensayadas, meta: plan.respuestas.length, rama: 'ingles', run: () => ensayarRespuesta(date) },
    // Una rama en pausa no genera contadores nuevos.
    ...(enPausa(plan, 'handyx', date) ? [] : [{ id: 'operaciones', label: '+1 Operación Handyx', v: ops, rama: 'handyx' as RamaOMain, run: () => sumarHandyx(date, { operaciones: 1 }) }]),
    ...(intensiva && clippingOn ? [{ id: 'clips', label: 'Registrar clips', v: clipsSem, meta: planEntre(l, addDays(l, 6)).clips, rama: 'main' as RamaOMain, color: 'var(--eclipse)', run: abrirClips }] : []),
    { id: 'entrenos', label: '+1 Entrené', v: sesiones + contador(plan, date, 'entrenos'), meta: metas.entrenos, rama: 'salud', run: () => sumarContador(date, 'entrenos') },
  ];
  return items;
}
