import { useEffect, useRef } from 'react';

/** Cuánto tapa el teclado de pantalla: el alto de la ventana menos lo que ve el visualViewport. */
export const alturaTeclado = (alto: number, vv: { height: number; offsetTop: number } | null | undefined) =>
  vv ? Math.max(0, Math.round(alto - vv.height - vv.offsetTop)) : 0;

/**
 * Deja la hoja por encima del teclado del teléfono: escribe `--teclado` (px) en el elemento. Con el
 * teclado cerrado vale 0. El CSS le suma ese margen abajo, así el campo y los botones no quedan tapados.
 */
export function useTeclado<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const poner = () => el.style.setProperty('--teclado', `${alturaTeclado(window.innerHeight, vv)}px`);
    poner();
    vv.addEventListener('resize', poner);
    vv.addEventListener('scroll', poner);
    return () => { vv.removeEventListener('resize', poner); vv.removeEventListener('scroll', poner); };
  }, []);
  return ref;
}
