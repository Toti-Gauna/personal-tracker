import { useStore } from '../state/store';
import { racha } from '../data/derive';
import { levelOf, totalXp } from '../data/profile';

/** "trazo" con resaltador, la racha y el nivel, arriba de Hoy. */
export function Marca({ date }: { date: string }) {
  const n = useStore((s) => racha(s.days, date));
  const nivel = useStore((s) => levelOf(totalXp(s)).level);
  return (
    <div className="marca-top">
      <span className="logo titulo resaltado" style={{ ['--c' as string]: 'var(--economia)' }}>trazo</span>
      <span className="mono">racha <b>{n}</b> · nivel <b>{nivel}</b></span>
    </div>
  );
}
