import { useEffect, useState } from 'react';

export const SECCIONES = ['hoy', 'estudio', 'metas', 'entreno', 'perfil'] as const;
export type Seccion = (typeof SECCIONES)[number];

export const ETIQUETAS: Record<Seccion, string> = {
  hoy: 'Hoy', estudio: 'Estudio', metas: 'Metas', entreno: 'Entreno', perfil: 'Perfil',
};

export type Pantalla = Seccion | 'elegir' | 'foco' | 'pomodoros' | 'json' | 'sesion' | 'como' | 'actividad' | 'test' | 'tesis' | 'unidades'
  | 'repaso' | 'recall' | 'tarjetas' | 'tarjeta-nueva' | 'motor';

export interface Ruta {
  pantalla: Pantalla;
  /** Sección que queda marcada en la barra. */
  seccion: Seccion;
  param?: string;
}

const SUB: Record<string, Seccion> = {
  elegir: 'hoy', foco: 'hoy', pomodoros: 'hoy', json: 'hoy',
  sesion: 'estudio', como: 'estudio', actividad: 'estudio', test: 'estudio', tesis: 'estudio', unidades: 'estudio',
  repaso: 'estudio', recall: 'estudio', tarjetas: 'estudio', 'tarjeta-nueva': 'estudio', motor: 'estudio',
};

export function leerRuta(hash: string): Ruta {
  const [a, ...rest] = hash.replace(/^#\/?/, '').split('/');
  const b = rest.join('/');
  if ((SECCIONES as readonly string[]).includes(a)) return { pantalla: a as Seccion, seccion: a as Seccion };
  if (a in SUB) return { pantalla: a as Pantalla, seccion: SUB[a], param: b ? decodeURIComponent(b) : undefined };
  return { pantalla: 'hoy', seccion: 'hoy' };
}

/** Compatibilidad: sección de la barra para un hash. */
export const leerHash = (hash: string): Seccion => leerRuta(hash).seccion;

export const ir = (path: string) => {
  window.location.hash = `#/${path}`;
};

/** Ruteo por hash: funciona en GitHub Pages sin 404 al recargar. */
export function useRuta(): Ruta {
  const [r, setR] = useState<Ruta>(() => leerRuta(window.location.hash));
  useEffect(() => {
    const on = () => {
      setR(leerRuta(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
