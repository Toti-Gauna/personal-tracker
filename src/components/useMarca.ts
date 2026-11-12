import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { DUR, reducedMotion } from '../lib/motion';

gsap.registerPlugin(Flip);

/**
 * El resaltador de la sección activa se desliza al nuevo destino con Flip (280 ms).
 * Con movimiento reducido, un fundido de 150 ms.
 */
export function useMarca<T extends HTMLElement>(activa: string) {
  const nav = useRef<T>(null);
  const estado = useRef<Flip.FlipState | null>(null);
  const anterior = useRef(activa);

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
    if (reducedMotion()) gsap.fromTo(marca, { opacity: 0 }, { opacity: 1, duration: DUR.fade });
    else Flip.from(st, { duration: DUR.flip, ease: 'power2.inOut' });
  }, [activa]);

  return nav;
}
