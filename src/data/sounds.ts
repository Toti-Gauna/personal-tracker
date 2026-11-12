import type { Alarm, SoundEvent, SoundId, SoundSettings } from './types';

export const SOUNDS: Record<SoundId, { name: string; desc: string }> = {
  campana: { name: 'Campana de bronce', desc: 'Campana de bronce' },
  madera: { name: 'Madera, suave', desc: 'Madera, suave' },
  pitidos: { name: '3 pitidos al final', desc: '3 pitidos al final' },
  marcador: { name: 'Trazo de marcador', desc: 'Trazo de marcador' },
  goma: { name: 'Sello de goma', desc: 'Sello de goma' },
};
export const SOUND_ORDER: SoundId[] = ['campana', 'madera', 'pitidos', 'marcador', 'goma'];

export const EVENT_LABEL: Record<SoundEvent, string> = {
  pomodoro: 'Termina un pomodoro',
  descanso: 'Termina un descanso',
  entreno: 'Descanso de entreno',
  tarea: 'Marcás una tarea',
  sello: 'Sello nuevo',
};
export const EVENT_ORDER: SoundEvent[] = ['pomodoro', 'descanso', 'entreno', 'tarea', 'sello'];

export const DEFAULT_SOUNDS: SoundSettings = {
  events: { pomodoro: 'campana', descanso: 'madera', entreno: 'pitidos', tarea: 'marcador', sello: 'goma' },
  volume: 70,
  vibrate: true,
};

/** Las alarmas que se pasan al calendario del teléfono. */
export const DEFAULT_ALARMS: Alarm[] = [
  { id: 'despertar', time: '04:00', title: 'Despertar · día nuevo', on: true },
  { id: 'matematica', time: '04:30', title: 'Empieza matemática', on: true },
  { id: 'entreno', time: '18:00', title: 'Entrenamiento · caminata', on: true },
  { id: 'cierre', time: '21:00', title: 'Cerrar el día', on: true },
];
