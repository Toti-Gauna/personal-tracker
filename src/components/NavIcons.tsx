import type { Seccion } from '../lib/routes';

const P: Record<Seccion, React.ReactNode> = {
  hoy: (<><path d="M3 18h18" /><path d="M6.5 18a5.5 5.5 0 0 1 11 0" /><path d="M12 5v3M4.6 9.6l1.8 1.8M19.4 9.6l-1.8 1.8" /></>),
  estudio: (<><path d="M12 6.5v12" /><path d="M12 6.5C10.5 5 7.5 4.5 3.5 5v12.5c4-.5 7 0 8.5 1.5" /><path d="M12 6.5c1.5-1.5 4.5-2 8.5-1.5v12.5c-4-.5-7 0-8.5 1.5" /></>),
  metas: (<><path d="M5 21V3.5" /><path d="M5 4.5h12l-2.5 3.5L17 11.5H5" /></>),
  entreno: (<><path d="M2.5 12h2M19.5 12h2M6.5 8v8M17.5 8v8M4.5 10v4M19.5 10v4M6.5 12h11" /></>),
  perfil: (<><circle cx="12" cy="9.5" r="5" /><path d="M9 14l-1.5 7L12 18.5 16.5 21 15 14" /></>),
};

export function NavIcon({ id }: { id: Seccion }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{P[id]}</svg>;
}
