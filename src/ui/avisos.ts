/**
 * Los avisos que piden las acciones del estado (una meta cumplida, un horario cambiado, un sello nuevo) y el freno del fin de
 * un bloque o de una sesión. Se muestran con las capas de la 2.0 (`aviso` y `elegir`) y suenan con el evento que corresponda.
 */
import type { SoundEvent } from '../data/types';
import { aviso, elegir } from '../v2/kit/capas';
import { play } from './sound';

export interface Toast {
  title: string;
  sub?: string;
  /** Ya no se usa para pintar: queda para no tocar a quienes lo pasan. */
  color?: string;
  /** "Deshacer" da el aviso largo con deshacer; cualquier otra, un botón con esa acción. */
  action?: { label: string; run: () => void };
  /** Qué sonido suena; sin valor, el de fin de pomodoro. `tarea` lo marca como hecho. */
  evento?: SoundEvent;
}

export interface ModalSpec {
  kicker: string;
  color?: string;
  title: string;
  body: string;
  primary: { label: string; run: () => void };
  secondary: { label: string; run: () => void };
}

/** Un aviso arriba, con sonido. */
export function toast(t: Toast, sound = true) {
  const deshacer = t.action?.label === 'Deshacer' ? t.action.run : undefined;
  aviso({ titulo: t.title, sub: t.sub, tono: t.evento === 'tarea' ? 'hecho' : 'info', deshacer, accion: !deshacer && t.action ? { etiqueta: t.action.label, run: t.action.run } : undefined });
  if (sound) play(t.evento ?? 'pomodoro');
}

/** El freno de los límites del día: dos caminos y ninguno se elige solo. */
export function showModal(m: ModalSpec, sound = true) {
  void elegir({ rotulo: m.kicker, titulo: m.title, texto: m.body, primaria: m.primary.label, secundaria: m.secondary.label })
    .then((r) => { if (r === 'primaria') m.primary.run(); else if (r === 'secundaria') m.secondary.run(); });
  if (sound) play('pomodoro');
}
