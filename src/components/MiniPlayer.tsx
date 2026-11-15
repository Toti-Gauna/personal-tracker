import '../styles/bar.css';

export interface FocoActivo {
  bloque: string;
  detalle: string; // p. ej. "50/10 + 30 · 1 de 2"
  restante: string; // mm:ss
  avance: number; // 0..1
  color?: string; // variable CSS del área
  pausado?: boolean;
  /** Qué está pasando: "Concentración", "Descanso" o "En pausa". */
  estado?: string;
}

interface Props {
  foco: FocoActivo;
  onVolver: () => void;
  onPausar: () => void;
}

/** Mini reproductor: aparece sobre la barra mientras corre un foco. */
export function MiniPlayer({ foco, onVolver, onPausar }: Props) {
  return (
    <div className={`mini${foco.pausado ? ' en-pausa' : ''}`} style={{ ['--c' as string]: foco.color ?? 'var(--ing)' }}>
      <button className="mini-ir" onClick={onVolver} aria-label={`Volver al foco: ${foco.bloque}, quedan ${foco.restante}`}>
        <span className="mini-t">
          <small className="mini-estado">
            <i aria-hidden="true" />
            {foco.estado ?? 'En foco'}
          </small>
          <b>{foco.bloque}</b>
          <small className="mini-det">{foco.detalle}</small>
        </span>
        <span className="mini-tiempo" aria-hidden="true">{foco.restante}</span>
      </button>
      <button className="mini-pausa" onClick={onPausar} aria-label={foco.pausado ? 'Seguir' : 'Pausar'}>
        {foco.pausado ? (
          <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><path d="M5 3l10 6-10 6z" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="3.2" height="12" /><rect x="10.8" y="3" width="3.2" height="12" /></svg>
        )}
      </button>
      <span className="mini-barra" aria-hidden="true"><span style={{ width: `${Math.round(foco.avance * 100)}%` }} /></span>
    </div>
  );
}
