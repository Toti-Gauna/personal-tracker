import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { DUR, reducedMotion } from '../lib/motion';

/**
 * Entrada de cada pantalla: sube 8 px y aparece en 280 ms. Con movimiento reducido,
 * un fundido de 150 ms. La primera pantalla no se anima (ya hay una pantalla de carga).
 */
export function useEntrada(clave: string, listo: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const primera = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !listo) return;
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = reducedMotion()
      ? gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DUR.fade, clearProps: 'opacity' })
      : gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: DUR.flip, ease: 'power2.out', clearProps: 'opacity,transform' });
    return () => { t.kill(); gsap.set(el, { clearProps: 'opacity,transform' }); };
  }, [clave, listo]);
  return ref;
}
