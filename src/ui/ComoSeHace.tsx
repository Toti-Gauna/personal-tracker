import { ficha, rirLabel } from '../data/train';
import type { Calentamiento, Exercise } from '../data/train-types';
import { Hoja } from './Hoja';

/**
 * Ola 19 · "Cómo se hace": la ficha de un ejercicio o de un paso del calentamiento (tempo, RIR por serie,
 * posicionamiento, parciales, dropset, consejo, músculos y para qué sirve).
 */
export function ComoSeHace({ e, kicker, color, onCerrar }: { e: Exercise | Calentamiento; kicker?: string; color?: string; onCerrar: () => void }) {
  const filas = ficha(e);
  const pasos = 'pasos' in e ? e.pasos : undefined;
  const detalle = 'detalle' in e ? e.detalle : undefined;
  const series = 'sets' in e && e.sets ? `${e.sets} × ${'reps' in e && e.reps ? e.reps : ''}` : undefined;
  return (
    <Hoja titulo={e.name} kicker={kicker} color={color} onCerrar={onCerrar}>
      {(series || detalle) && <p className="sub ficha-resumen mono">{[series, detalle, 'rir' in e && e.rir ? rirLabel(e) : ''].filter(Boolean).join(' · ')}</p>}
      {pasos && <ul className="ficha-pasos">{pasos.map((p) => <li key={p}>{p}</li>)}</ul>}
      {filas.length > 0 ? (
        <dl className="ficha">
          {filas.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      ) : (
        <p className="sub">Este ejercicio no trae más detalle.</p>
      )}
      <button className="btn-borde" onClick={onCerrar}>Listo</button>
    </Hoja>
  );
}
