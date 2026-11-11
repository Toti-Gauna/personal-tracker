import { useEffect, useState } from 'react';

export const SECCIONES = ['hoy', 'estudio', 'metas', 'entreno', 'perfil'] as const;
export type Seccion = (typeof SECCIONES)[number];

export const ETIQUETAS: Record<Seccion, string> = {
  hoy: 'Hoy', estudio: 'Estudio', metas: 'Metas', entreno: 'Entreno', perfil: 'Perfil',
};

export function leerHash(hash: string): Seccion {
  const s = hash.replace(/^#\/?/, '') as Seccion;
  return SECCIONES.includes(s) ? s : 'hoy';
}

/** Ruteo por hash: funciona en GitHub Pages sin 404 al recargar. */
export function useSeccion(): Seccion {
  const [s, setS] = useState<Seccion>(() => leerHash(window.location.hash));
  useEffect(() => {
    const on = () => setS(leerHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return s;
}
