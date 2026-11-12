import { AREAS } from '../data/defaults';
import { appliesTo, valueOf } from '../data/goals';
import { addProgress, stepOf } from '../state/goals';
import { useStore } from '../state/store';

/** "Sumar a la semana" en Hoy: lo que no está en el día (ventas, CV, usuarios) se suma a mano. */
export function SumarSemana({ date }: { date: string }) {
  const goals = useStore((s) => s.goals.goals);
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const train = useStore((s) => s.train);
  const quick = goals.filter((g) => g.quick && !g.auto && (appliesTo(g, 'semana', date) || appliesTo(g, 'dia', date)));
  if (!quick.length) return null;
  return (
    <section className="sumar-sem" aria-label="Sumar a la semana">
      <span className="etiqueta">Sumar a la semana</span>
      <div className="sumar-grid">
        {quick.map((g) => {
          const v = valueOf(g, date, { study, days, train });
          return (
            <button key={g.id} style={{ ['--c' as string]: AREAS[g.area].css }} onClick={() => addProgress(g.id, date, stepOf(g))} aria-label={`Sumar ${stepOf(g)}: ${g.quickLabel ?? g.title}, van ${v} de ${g.target}`}>
              <b>+{stepOf(g)} {g.quickLabel ?? g.title}</b>
              <span className="mono">{String(v).replace('.', ',')} / {g.target}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
