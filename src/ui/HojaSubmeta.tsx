import { useState } from 'react';
import { Hoja } from './Hoja';

/**
 * La hoja para agregar submetas (los pasos que se tildan dentro de una meta). La usan Nueva meta,
 * las metas de Metas y las metas numeradas de Hoy. Cada llamada a `onAgregar` recibe un texto limpio.
 */
export function HojaSubmeta({ kicker, color, onAgregar, onCerrar }: {
  kicker: string; color?: string; onAgregar: (texto: string) => void; onCerrar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const agregar = () => {
    const t = texto.trim();
    if (!t) return false;
    onAgregar(t);
    setTexto('');
    return true;
  };
  return (
    <Hoja titulo="Nueva submeta" kicker={kicker} color={color} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); agregar(); }}>
        <input className="campo-texto" autoFocus enterKeyHint="done" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: Cocinar en casa" aria-label="Nombre de la submeta" />
        <button className="btn-principal" type="submit" style={{ marginTop: 14 }} disabled={!texto.trim()}>Agregar y otra</button>
        <button className="btn-borde" type="button" onClick={() => { agregar(); onCerrar(); }}>{texto.trim() ? 'Agregar y cerrar' : 'Listo'}</button>
      </form>
    </Hoja>
  );
}
