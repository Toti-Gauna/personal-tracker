import { useStore } from '../state/store';
import { racha } from '../data/derive';
import { levelOf, totalXp } from '../data/profile';
import { SEMANAS, semanaDelPlan } from '../data/plan';

/** "trazo" con resaltador, la racha y el nivel (o la semana del plan T+18), arriba de Hoy. */
export function Marca({ date, plan = false }: { date: string; plan?: boolean }) {
  const n = useStore((s) => racha(s.days, date));
  const nivel = useStore((s) => levelOf(totalXp(s)).level);
  const semana = useStore((s) => semanaDelPlan(date, s.settings?.startDate));
  const enPlan = plan && semana >= 1 && semana <= SEMANAS;
  return (
    <div className="marca-top">
      <span className="logo titulo resaltado" style={{ ['--c' as string]: 'var(--economia)' }}>trazo</span>
      <span className="mono">racha <b>{n}</b> · {enPlan ? <>T+18 <b>{semana}/{SEMANAS}</b></> : <>nivel <b>{nivel}</b></>}</span>
    </div>
  );
}
