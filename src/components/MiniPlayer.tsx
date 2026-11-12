import '../styles/bar.css';

export interface FocoActivo {
  bloque: string;
  detalle: string; // p. ej. "50/10 + 30 · 1 de 2"
  restante: string; // mm:ss
  avance: number; // 0..1
  color?: string; // variable CSS del área
  pausado?: boolean;
}

interface Props {
  foco: FocoActivo;
  onVolver: () => void;
  onPausar: () => void;
}

/** Mini reproductor: aparece sobre la barra mientras corre un foco. */
export function MiniPlayer({ foco, onVolver, onPausar }: Props) {
  return (
    <div className="mini" style={{ ['--c' as string]: foco.color ?? 'var(--ing)' }}>
      <button className="ir" onClick={onVolver} aria-label={`Volver al foco: ${foco.bloque}`}>
        <span className="punto" />
        <span className="t"><b>{foco.bloque}</b><small>{foco.detalle}</small></span>
        <span className="tiempo">{foco.restante}</span>
      </button>
      <button className="pausa" onClick={onPausar} aria-label={foco.pausado ? 'Seguir' : 'Pausar'}>
        {foco.pausado ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M5 3l10 6-10 6z" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="4" y="3" width="3.2" height="12" /><rect x="10.8" y="3" width="3.2" height="12" /></svg>
        )}
      </button>
      <span className="avance" style={{ width: `${Math.round(foco.avance * 100)}%` }} />
    </div>
  );
}
