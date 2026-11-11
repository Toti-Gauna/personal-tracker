import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ETIQUETAS, SECCIONES, type Seccion } from '../lib/routes';
import { DUR, reducedMotion } from '../lib/motion';
import { NavIcon } from './NavIcons';
import '../styles/bar.css';

gsap.registerPlugin(Flip);

interface Props {
  activa: Seccion;
  /** Tarjetas de repaso pendientes; 0 oculta el contador. */
  pendientes?: number;
}

export function BottomBar({ activa, pendientes = 0 }: Props) {
  const nav = useRef<HTMLElement>(null);
  const estado = useRef<Flip.FlipState | null>(null);
  const anterior = useRef<Seccion>(activa);

  // Captura la posición de la marca antes de que React la mueva.
  if (anterior.current !== activa) {
    const marca = nav.current?.querySelector('.marca');
    if (marca) estado.current = Flip.getState(marca);
    anterior.current = activa;
  }

  useLayoutEffect(() => {
    const marca = nav.current?.querySelector('.marca');
    if (!marca || !estado.current) return;
    const st = estado.current;
    estado.current = null;
    if (reducedMotion()) {
      gsap.fromTo(marca, { opacity: 0 }, { opacity: 1, duration: DUR.fade });
    } else {
      Flip.from(st, { duration: DUR.flip, ease: 'power2.inOut' });
    }
  }, [activa]);

  return (
    <nav className="barra" aria-label="Secciones" ref={nav}>
      <ul>
        {SECCIONES.map((id) => {
          const esActiva = id === activa;
          const mostrarContador = id === 'estudio' && pendientes > 0 && !esActiva;
          return (
            <li key={id}>
              <a href={`#/${id}`} aria-current={esActiva ? 'page' : undefined}>
                {esActiva && <span className="marca" data-flip-id="marca" />}
                <NavIcon id={id} />
                <span className="txt">{ETIQUETAS[id]}</span>
                {mostrarContador && (
                  <span className="contador" aria-label={`${pendientes} tarjetas pendientes`}>{pendientes}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
