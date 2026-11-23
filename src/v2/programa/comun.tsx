/**
 * Trazo 2.0 · lo que comparten Idiomas, Programación y los libros (tanda 3.3): los formatos de fecha, el "hoy sos → vas a ser",
 * el bloque "estás acá" y una línea de estaciones donde cada una abre su hoja.
 */
import type { CSSProperties, ReactNode } from 'react';
import { T0_PLAN } from '../../data/plan';
import { useStore } from '../../state/store';
import '../estudio/estudio.css';
import '../proyecto/proyecto.css';
import './programa.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "23 nov". */
export const fch = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
/** "23 nov" y, fuera de 2026, "14 ene 2027". */
export const fp = (d: string) => (d.slice(0, 4) === '2026' ? fch(d) : `${fch(d)} ${d.slice(0, 4)}`);
/** "21 nov – 9 dic". */
export const rango = (a: string, b: string) => `${fp(a)} – ${fp(b)}`;
/** "feb 2045". */
export const mesAnio = (ym: string) => `${MES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
/** Una decimal con coma: "11,5". */
export const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
export const mayuscula = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
/** El número con su palabra, en singular cuando es uno: la misma función de todo el 2.0 (`cuantos`, en reglas.ts). */
export { cuantos as plural } from '../reglas';

/** El inicio del plan (el de los ajustes o el de fábrica). */
export function useT0() {
  return useStore((s) => s.settings?.startDate) || T0_PLAN;
}

/** "Hoy sos X → Vas a ser Y" (o, con otros rótulos, "Arrancás en A2 → Cerrás en B1"). */
export function Perfil({ sos, vasASer, rotulos = ['Hoy sos', 'Vas a ser'] }: { sos?: string | null; vasASer?: string | null; rotulos?: [string, string] }) {
  return (
    <div className="pg-perfil">
      {sos && <span><small className="t-rotulo">{rotulos[0]}</small><b className="t-encabezado">{sos}</b></span>}
      {sos && vasASer && <span className="pg-flecha" aria-hidden="true">→</span>}
      {vasASer && <span><small className="t-rotulo">{rotulos[1]}</small><b className={`t-encabezado${sos ? ' pg-resalta' : ''}`}>{vasASer}</b></span>}
    </div>
  );
}

/** El bloque "Estás acá": lleva a donde estás parado. */
export function Aca({ href, titulo, dato, nota, rotulo = 'Estás acá' }: { href: string; titulo: ReactNode; dato?: ReactNode; nota?: ReactNode; rotulo?: string }) {
  return (
    <a className="pg-aca" href={href}>
      <span className="t-rotulo">{rotulo}</span>
      <b className="t-encabezado">{titulo}</b>
      {dato && <span className="t-dato">{dato}</span>}
      {nota && <span className="t-nota">{nota}</span>}
    </a>
  );
}

export interface Parada { id: string; nombre: string; nota?: string; estado: 'hecha' | 'actual' | 'proxima' }
const PALABRA = { hecha: 'hecha', actual: 'estás acá', proxima: 'próxima' } as const;

/** Una línea de estaciones parada: cada una es un botón (abre su hoja). Lo recorrido va con el trazo; la de ahora, más grande. */
export function Paradas({ area, paradas, onElegir, etiqueta }: { area: string; paradas: Parada[]; onElegir: (id: string) => void; etiqueta: string }) {
  return (
    <ol className="pg-linea" style={{ ['--area' as string]: area } as CSSProperties} aria-label={etiqueta}>
      {paradas.map((p) => (
        <li key={p.id} className={p.estado} aria-current={p.estado === 'actual' ? 'step' : undefined}>
          <button type="button" aria-label={`${p.nombre}, ${PALABRA[p.estado]}${p.nota ? `. ${p.nota}` : ''}`} onClick={() => onElegir(p.id)}>
            <i aria-hidden="true" />
            <span className="pg-linea-texto"><b>{p.nombre}</b>{p.nota && <small>{p.nota}</small>}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
