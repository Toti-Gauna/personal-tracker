import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { reducedMotion } from '../lib/motion';
import '../styles/bar.css';

/** Pantalla de carga: las 4 rayas caen una a una y el resaltador cruza (600 ms). */
export function Splash({ onFin }: { onFin: () => void }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = raiz.current!;
    if (reducedMotion()) {
      const t = setTimeout(onFin, 300);
      return () => clearTimeout(t);
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => { gsap.to(r, { opacity: 0, duration: 0.2, onComplete: onFin }); },
      });
      tl.from('.raya', { y: -50, opacity: 0, duration: 0.3, stagger: 0.08, ease: 'power3.out' })
        .from('.resaltador', { scaleX: 0, transformOrigin: '0% 100%', duration: 0.3, ease: 'power2.out' }, '-=0.05')
        .from('.nombre', { opacity: 0, y: 8, duration: 0.25 }, '-=0.3')
        .to({}, { duration: 0.25 });
    }, r);
    return () => ctx.revert();
  }, [onFin]);

  return (
    <div className="splash" ref={raiz} role="status" aria-label="Cargando Trazo">
      <svg viewBox="0 0 512 512" aria-hidden="true">
        <g fill="#EDEDE8">
          <polygon className="raya" points="168,158 202,158 186,354 152,354" />
          <polygon className="raya" points="220,150 254,150 238,362 204,362" />
          <polygon className="raya" points="272,152 306,152 290,358 256,358" />
          <polygon className="raya" points="324,148 358,148 342,350 308,350" />
        </g>
        <polygon className="resaltador" points="96,330 372,150 424,186 150,372" fill="#F0D45C" fillOpacity=".82" />
      </svg>
      <div className="nombre titulo">trazo</div>
    </div>
  );
}
