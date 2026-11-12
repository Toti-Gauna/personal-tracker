import { useStore } from '../state/store';
import { racha } from '../data/derive';

/** "trazo" con resaltador + racha, arriba de Hoy. */
export function Marca({ date }: { date: string }) {
  const n = useStore((s) => racha(s.days, date));
  return (
    <div className="marca-top">
      <span className="logo titulo resaltado" style={{ ['--c' as string]: 'var(--economia)' }}>trazo</span>
      <span className="mono">racha <b>{n}</b></span>
    </div>
  );
}
