/**
 * Empezar un foco sin perder el que corre. Hay un solo foco a la vez: si ya corre otro (otro bloque, otra sesión), primero se
 * pregunta, y el que corría se cierra como con "Terminar": un foco de bloque guarda los minutos que llevaba; una sesión de estudio
 * guarda lo cerrado con "Hecho" (lo demás no suma, como al terminarla a mano).
 */
import { minutosHechos } from '../data/focus';
import { nowMin, toHHMM } from '../data/time';
import type { FocusState } from '../data/types';
import { getState, logFocus, setFocus } from '../state/store';
import { confirmar } from '../v2/kit/capas';

const nombreDe = (f: FocusState) => {
  if (f.tramos) return 'la sesión de estudio';
  const b = getState().days[f.date]?.blocks.find((x) => x.key === f.key);
  return b ? b.title.split(' · ')[0] : 'el foco';
};

/** Es el mismo foco: mismo día, mismo bloque y la misma sesión de estudio (o ninguna). */
export const esElMismo = (f: FocusState, otro: { date: string; key: string; activityId?: string }) =>
  f.date === otro.date && f.key === otro.key && (f.activityId ?? null) === (otro.activityId ?? null);

/**
 * Empieza `nuevo` y después hace `despues` (ir a la pantalla del foco). Sin otro foco corriendo, en el acto; con otro, pregunta
 * primero y, si decís que no, no cambia nada.
 */
export function empezarFoco(nuevo: FocusState, despues: () => void = () => {}): void {
  const f = getState().focus;
  if (!f) { setFocus(nuevo); despues(); return; }
  const min = f.tramos ? 0 : minutosHechos(f, Date.now());
  const que = nombreDe(f);
  void confirmar({
    titulo: 'Ya hay un foco corriendo',
    texto: f.tramos ? `Si empezás este, se cierra ${que}: lo que no cerraste con "Hecho" no suma.` : `Si empezás este, se cierra ${que}${min ? ` y se guardan los ${min} min que llevás` : ''}.`,
    accion: 'Empezar este',
  }).then((ok) => {
    if (!ok) return;
    // Pudo terminar solo mientras preguntaba: solo se guarda si sigue siendo el mismo.
    const ahora = getState().focus;
    if (ahora && !ahora.tramos && esElMismo(ahora, f)) {
      const hechos = minutosHechos(ahora, Date.now());
      if (hechos) logFocus(f.date, { key: f.key, plan: f.plan, focusMin: hechos, at: toHHMM(nowMin()) });
    }
    setFocus(nuevo);
    despues();
  });
}
