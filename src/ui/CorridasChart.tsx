import { fmtPace } from '../data/train';
import type { Run } from '../data/train-types';
import { parseDate } from '../data/time';

const DM = (d: string) => `${parseDate(d).getDate()}/${parseDate(d).getMonth() + 1}`;
const fmt = (n: number) => String(n).replace('.', ',');

/** Barras de minutos de las últimas corridas, con una lista que dice lo mismo para lectores de pantalla. */
export function CorridasChart({ runs, hoy, cuantas = 8 }: { runs: Run[]; hoy: string; cuantas?: number }) {
  const ult = [...runs].sort((a, b) => a.date.localeCompare(b.date)).slice(-cuantas);
  if (!ult.length) return <p className="sub">Todavía no hay corridas. Tocá «Registrar corrida» y la curva sale sola.</p>;
  const max = Math.max(...ult.map((r) => r.min), 1);
  return (
    <>
      <div className="corr-barras" role="img" aria-label={`Minutos de las últimas ${ult.length} corridas: ${ult.map((r) => `${DM(r.date)} ${r.min} min`).join(', ')}`}>
        {ult.map((r) => (
          <span key={r.date} className={r.date === hoy ? 'hoy' : ''} title={`${DM(r.date)}: ${r.min} min${r.km ? ` · ${fmt(r.km)} km` : ''}${fmtPace(r.min, r.km) ? ` · ${fmtPace(r.min, r.km)} /km` : ''}`}>
            <i style={{ height: Math.max(4, Math.round((r.min / max) * 84)) }} />
            <small className="mono">{DM(r.date)}</small>
          </span>
        ))}
      </div>
    </>
  );
}
