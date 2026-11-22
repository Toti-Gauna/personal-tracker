/**
 * Trazo 2.0 · la pantalla de carga: los cuatro palotes caen, el trazo los cruza y una línea avanza, para que nunca
 * parezca colgada. 0,9 s; con movimiento reducido, 0,3 s sin movimiento.
 */
import { useEffect, useState } from 'react';
import { reducido } from '../movimiento/movimiento';
import '../tokens.css';
import './marco.css';

export default function SplashV2({ onFin }: { onFin: () => void }) {
  const [saliendo, setSaliendo] = useState(false);
  useEffect(() => {
    const dura = reducido() ? 300 : 900;
    const a = window.setTimeout(() => setSaliendo(true), dura);
    const b = window.setTimeout(onFin, dura + 220);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [onFin]);
  return (
    <div className={`sp2${saliendo ? ' saliendo' : ''}`} role="status" aria-label="Cargando Trazo">
      <svg viewBox="80 130 360 250" aria-hidden="true">
        <g>
          <polygon points="168,158 202,158 186,354 152,354" /><polygon points="220,150 254,150 238,362 204,362" />
          <polygon points="272,152 306,152 290,358 256,358" /><polygon points="324,148 358,148 342,350 308,350" />
        </g>
        <polygon className="sp2-trazo" points="96,330 372,150 424,186 150,372" />
      </svg>
      <div className="sp2-nombre">trazo</div>
      <div className="sp2-linea" aria-hidden="true"><i /></div>
    </div>
  );
}
