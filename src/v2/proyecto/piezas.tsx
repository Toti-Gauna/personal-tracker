/**
 * Trazo 2.0 · las piezas que repiten las páginas de bloque, de pista y de fondo: una fila que abre una hoja (con "cómo va" a
 * la derecha) y una lista de casillas dentro de una tarjeta.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { NombreIcono } from '../iconos';
import { Casilla, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';

/** Una fila que abre una hoja. El valor dice cómo va ("2 de 6", "sin cargar"); `hecho` lo pinta con el trazo. */
export function FilaHoja({ icono, titulo, valor, nota, tituloHoja, pie, hecho, children }: { icono?: NombreIcono; titulo: string; valor?: ReactNode; nota?: ReactNode; tituloHoja?: string; pie?: ReactNode; hecho?: boolean; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Fila icono={icono} titulo={titulo} nota={nota} valor={valor != null ? <span className={hecho ? 'pt-valor hecho' : 'pt-valor'}>{valor}</span> : undefined} onClick={() => setAbierta(true)} />
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo={tituloHoja ?? titulo} pie={pie}>{children}</Hoja>
    </>
  );
}

export interface ItemLista { clave: string; etiqueta: string; nota?: ReactNode; marcada: boolean }

/** Casillas en una tarjeta: se marcan una por una. */
export function Lista({ items, onCambio, area, festejo = true }: { items: ItemLista[]; onCambio: (clave: string) => void; area?: string; festejo?: boolean }) {
  return (
    <div className="capa-1 pt-check">
      {items.map((i) => <Casilla key={i.clave} marcada={i.marcada} etiqueta={i.etiqueta} nota={i.nota} area={area} festejo={festejo} onCambio={() => onCambio(i.clave)} />)}
    </div>
  );
}

/** "3 de 6", y si están todas, "listo". */
export const hechasDe = (hechas: number, total: number) => (hechas >= total && total > 0 ? 'Listo' : `${hechas} de ${total}`);

/**
 * Un campo de texto que guarda al salir (no en cada letra): lo que escribís no se parte mientras tipeás (una lista separada por
 * comas, un link a medio escribir) y tampoco se pierde si cerrás la hoja con el campo todavía en foco.
 */
export function CampoAlSalir({ etiqueta, valor, guardar, placeholder, nota, modo, multilinea }: { etiqueta: string; valor?: string; guardar: (v: string) => void; placeholder?: string; nota?: string; modo?: 'text' | 'numeric' | 'decimal' | 'url'; multilinea?: boolean }) {
  const [v, setV] = useState(valor ?? '');
  const ref = useRef({ v, valor, guardar });
  ref.current = { v, valor, guardar };
  useEffect(() => { setV(valor ?? ''); }, [valor]);
  useEffect(() => () => { const r = ref.current; if (r.v !== (r.valor ?? '')) r.guardar(r.v.trim()); }, []);
  return (
    <div onBlur={() => { if (v !== (valor ?? '')) guardar(v.trim()); }}>
      <CampoTexto etiqueta={etiqueta} valor={v} onCambio={setV} placeholder={placeholder} nota={nota} modo={modo} multilinea={multilinea} />
    </div>
  );
}
