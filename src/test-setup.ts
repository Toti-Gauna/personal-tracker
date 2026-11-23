import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cerrarHojas } from './ui/checkins';
import { cerrarEstadoEstudio } from './ui/estado-estudio';

if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// Las hojas que se piden desde cualquier lado (la corrida, "¿En qué estado estás?") guardan su estado en el módulo: cada test
// arranca con las dos cerradas, para que una que quedó abierta no aparezca en el siguiente.
afterEach(() => { cerrarHojas(); cerrarEstadoEstudio(); });
