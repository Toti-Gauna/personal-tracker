import { DEFAULT_SOUNDS } from '../data/sounds';
import type { SoundEvent, SoundId, SoundSettings } from '../data/types';

let ctx: AudioContext | null = null;
let conf: SoundSettings = DEFAULT_SOUNDS;

/** Lo llama el estado cuando cambian los ajustes. */
export function configureSound(s?: SoundSettings) {
  conf = s ?? DEFAULT_SOUNDS;
}

const audio = () => {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/** Un parcial: oscilador con ataque corto y caída exponencial. */
function tone(c: AudioContext, out: AudioNode, t: number, f: number, g: number, dur: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const v = c.createGain();
  o.type = type;
  o.frequency.value = f;
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(g, t + 0.008);
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(v).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(c: AudioContext, out: AudioNode, t: number, dur: number, g: number, freq: number) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const v = c.createGain();
  v.gain.value = g;
  src.connect(f).connect(v).connect(out);
  src.start(t);
}

/** Cada sonido se sintetiza: no hay archivos de audio. */
const VOICES: Record<SoundId, (c: AudioContext, out: AudioNode, t: number) => void> = {
  campana: (c, o, t) => [[523.25, 0.25, 1.6], [1046.5, 0.12, 1.4], [1568, 0.06, 1.1]].forEach(([f, g, d]) => tone(c, o, t, f, g, d)),
  madera: (c, o, t) => { tone(c, o, t, 330, 0.35, 0.18); tone(c, o, t, 660, 0.12, 0.1); },
  pitidos: (c, o, t) => [0, 0.22, 0.44].forEach((d) => tone(c, o, t + d, 880, 0.2, 0.14, 'square')),
  marcador: (c, o, t) => noise(c, o, t, 0.22, 0.5, 2400),
  goma: (c, o, t) => { tone(c, o, t, 120, 0.5, 0.2); noise(c, o, t, 0.08, 0.4, 700); },
};

/** Reproduce un sonido con el volumen de los ajustes. */
export function playSound(id: SoundId, volume = conf.volume) {
  try {
    const c = audio();
    if (!c || volume <= 0) return;
    const master = c.createGain();
    master.gain.value = Math.min(1, volume / 100);
    master.connect(c.destination);
    VOICES[id](c, master, c.currentTime);
  } catch { /* sin audio */ }
}

/** El sonido de un aviso, según lo que eligió para ese evento, y la vibración. */
export function play(event: SoundEvent) {
  playSound(conf.events[event]);
  if (conf.vibrate) try { navigator.vibrate?.(event === 'tarea' ? 20 : 120); } catch { /* sin vibración */ }
}

/** Compatibilidad: el sonido de fin de pomodoro. */
export const bell = () => play('pomodoro');
