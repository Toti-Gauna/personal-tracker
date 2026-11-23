/**
 * Trazo · la pantalla de carga: los cuatro palotes caen, el trazo los cruza y una línea avanza, para que nunca parezca colgada.
 * 0,9 s; con movimiento reducido, 0,3 s sin movimiento. index.html ya la pinta con el HTML (`#sp2`), así el primer cuadro no
 * espera a los scripts: acá solo se cuenta el tiempo desde que se abrió la página y se la saca con un fundido. Si no está (los
 * tests, otra entrada), se dibuja acá igual que allá.
 */
import { useEffect, useState } from 'react';
import { reducido } from '../movimiento/movimiento';
import '../tokens.css';
import './marco.css';

const SALIDA_MS = 220;

export default function SplashV2({ onFin }: { onFin: () => void }) {
  const [estatica] = useState(() => (typeof document === 'undefined' ? null : document.getElementById('sp2')));
  const [saliendo, setSaliendo] = useState(false);
  useEffect(() => {
    const dura = reducido() ? 300 : 900;
    // La de index.html arrancó con la página: solo falta lo que no pasó todavía (en un teléfono lento, nada).
    const falta = estatica ? Math.max(0, dura - performance.now()) : dura;
    const a = window.setTimeout(() => { if (estatica) estatica.classList.add('saliendo'); else setSaliendo(true); }, falta);
    const b = window.setTimeout(() => { estatica?.remove(); onFin(); }, falta + SALIDA_MS);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [onFin, estatica]);
  if (estatica) return null;
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
