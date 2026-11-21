/** v12.1 · el árbol de períodos medido hoy, con las horas reales de cada bloque (las del foco o las cargadas a mano). */
import { useMemo } from 'react';
import { horasDeRama } from '../data/metas-plan';
import { medir, type PeriodoMedido } from '../data/periodos';
import { arbolPlan } from '../data/periodos-plan';
import { T0_PLAN } from '../data/plan';
import { calendarioCompleto } from '../data/plan-vistas';
import type { Rama } from '../data/types';
import { useStore } from '../state/store';

const RAMA_DE: Record<string, Rama> = { proyecto: 'programacion', cert: 'programacion', ventana: 'matematica', ingles: 'ingles', busqueda: 'trabajo' };

export function usePeriodos(hoy: string) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  return useMemo(() => {
    const cal = calendarioCompleto(t0);
    const horasReal = (id: string) => {
      const b = cal.find((x) => x.id === id);
      const r = b && RAMA_DE[b.tipo];
      if (!b || !r || b.inicio > hoy) return undefined;
      return horasDeRama(days, r, b.inicio, b.fin < hoy ? b.fin : hoy, plan.horasManuales);
    };
    const arbol: PeriodoMedido[] = arbolPlan(cal, { plan, horasReal }).map((p) => medir(p, hoy));
    return { cal, arbol, plan, t0 };
  }, [t0, plan, days, hoy]);
}
