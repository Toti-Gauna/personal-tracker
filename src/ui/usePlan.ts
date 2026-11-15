/** Lo que necesitan las pantallas del plan: fecha, T0, etapas con lo real y el bimestre. */
import { useMemo } from 'react';
import { bimestreDelPlan, etapas, semanaDelPlan, tramoActivo, PLAN, SEMANAS, type Etapa } from '../data/plan';
import { currentBlock } from '../data/schedule';
import { focusUnit, unitState } from '../data/study';
import { addDays, nowMin } from '../data/time';
import type { Rama } from '../data/types';
import { lunesDe } from '../state/plan';
import { useStore } from '../state/store';

export interface EtapaReal extends Etapa {
  href: string;
  riesgo?: string;
  /** En pausa (stand-by) desde esa fecha. */
  pausa?: string;
}

const HREF: Record<Rama, string> = {
  programacion: '#/metas/proyecto', matematica: '#/unidades', trabajo: '#/metas/trabajo', ingles: '#/metas/ingles', handyx: '#/metas/handyx', salud: '#/entreno',
};

export function usePlanVista(date: string) {
  const st = useStore((s) => s);
  return useMemo(() => {
    const t0 = st.settings?.startDate;
    const semana = semanaDelPlan(date, t0);
    const bim = bimestreDelPlan(date, t0);
    const nombres = st.goals.bimesterNames;
    const nombreBim = nombres[bim.n]?.trim() || PLAN.nombresBimestre[bim.n - 1] || `B${bim.n}`;
    const tramo = tramoActivo(date, t0);
    const conamat = st.study.activities.find((a) => a.id === 'conamat');
    const u = conamat ? focusUnit(conamat, st.study, date) : undefined;
    const aprobados = conamat?.units?.filter((x) => unitState(st.study, conamat.id, x.n).approvedOn).length ?? 0;
    const total = conamat?.units?.length ?? 0;
    // Un test de matemática bajo 85 % sin aprobar pone en riesgo el próximo proyecto.
    const flojo = conamat?.units?.map((x) => ({ n: x.n, t: unitState(st.study, conamat.id, x.n) })).find((x) => !x.t.approvedOn && x.t.tests.length && x.t.tests[x.t.tests.length - 1].score / x.t.tests[x.t.tests.length - 1].total < 0.85);
    const ent = st.plan.entrevistas.filter((e) => e.fecha >= date).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    const ensayadas = st.plan.respuestas.filter((r) => r.veces > 0).length;
    const sesiones = st.train.sessions.filter((s) => s.date >= lunesDe(date) && s.date <= addDays(lunesDe(date), 6)).length;
    const base = etapas(date, t0);
    const ramas: EtapaReal[] = base.map((e) => {
      const r: EtapaReal = { ...e, href: e.rama === 'programacion' ? `${HREF.programacion}/${tramo.id}` : HREF[e.rama] };
      if (e.rama === 'programacion' && flojo) r.riesgo = `En riesgo: test del cap. ${flojo.n} bajo 85 %`;
      if (e.rama === 'matematica' && conamat && u && !e.titulo.startsWith('W')) {
        r.titulo = `${conamat.title}, cap. ${u.n} de ${total}`;
        r.lado = `cap ${u.n}/${total}`;
        r.avance = total ? Math.max(0.02, aprobados / total) : 0;
      }
      if (e.rama === 'trabajo' && ent && semana < 9) r.sub = `Entrevista el ${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(ent.fecha + 'T12:00').getDay()]} ${Number(ent.fecha.slice(8))} · meta: remoto para el ${Number(addDays(t0 ?? PLAN.t0, 56).slice(8))} ene`;
      if (e.rama === 'ingles' && e.titulo === 'Modo entrevista') {
        r.sub = `${ensayadas} de ${st.plan.respuestas.length} respuestas ensayadas · después, bloque diario al C1`;
        r.lado = `${ensayadas}/${st.plan.respuestas.length}`;
        r.avance = Math.max(0.02, ensayadas / st.plan.respuestas.length);
      }
      const pa = (st.plan.pausas ?? []).find((x) => x.objetivo === e.rama && x.desde <= date && (!x.hasta || x.hasta > date));
      if (pa) {
        r.pausa = pa.desde;
        r.sub = `Stand-by desde el ${Number(pa.desde.slice(8))} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(pa.desde.slice(5, 7)) - 1]}: vuelve con la rutina con trabajo. Nada se borró.`;
        r.lado = 'stand-by';
        r.avance = 0;
      }
      if (e.rama === 'salud') {
        r.sub = PLAN.metasBimestre.salud[Math.min(8, bim.n)] ? `Después: ${PLAN.metasBimestre.salud[Math.min(8, bim.n)].toLowerCase()}` : e.sub;
        r.lado = `${sesiones}/6 ses.`;
        r.avance = Math.max(0.02, Math.min(1, sesiones / 6));
      }
      return r;
    });
    // HEAD: la rama de lo que toca ahora (o programación).
    const day = st.days[date];
    const cur = day ? currentBlock(day.blocks, nowMin()) : undefined;
    const head: Rama = cur?.rama && cur.rama !== 'main' ? cur.rama : 'programacion';
    return { t0, semana: Math.max(1, Math.min(SEMANAS, semana)), bim, nombreBim, tramo, ramas, head, ent };
  }, [st, date]);
}
