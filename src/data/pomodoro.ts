import type { Preset, Seg } from './types';

/** Tramos de descanso de menos de esto se suman al descanso anterior en vez de ser un foco. */
const MIN_TAIL = 10;

/**
 * Ajusta un preset a los minutos que quedan: repite el patrón mientras entra
 * y el sobrante va como foco corto (o se suma al descanso si es muy poco).
 */
export function fitPreset(p: Preset, total: number): Seg[] {
  if (total <= 0) return [];
  if (p.straight || p.focus >= total) return [{ type: 'focus', min: total }];
  const pattern: Seg[] = [];
  for (let c = 0; c < Math.max(1, p.cycles); c++) {
    pattern.push({ type: 'focus', min: p.focus });
    const last = c === Math.max(1, p.cycles) - 1;
    const rest = last && p.longRest ? p.longRest : p.rest;
    if (rest > 0) pattern.push({ type: 'rest', min: rest });
  }
  const segs: Seg[] = [];
  let left = total;
  outer: while (left > 0) {
    for (const s of pattern) {
      if (s.min <= left) {
        segs.push({ ...s });
        left -= s.min;
      } else break outer;
    }
  }
  if (left > 0) {
    const last = segs[segs.length - 1];
    if (left >= MIN_TAIL && last?.type === 'rest') segs.push({ type: 'focus', min: left });
    else if (last) last.min += left;
    else segs.push({ type: 'focus', min: left });
  }
  return segs;
}

export const focusMinutes = (segs: Seg[]) => segs.filter((s) => s.type === 'focus').reduce((a, s) => a + s.min, 0);
export const totalMinutes = (segs: Seg[]) => segs.reduce((a, s) => a + s.min, 0);

/** Nombre corto del plan: "50/10 + 30", "25/5 × 3", "80/10", "90 corrido". */
export function planLabel(segs: Seg[]): string {
  if (!segs.length) return '';
  if (segs.length === 1) return `${segs[0].min} corrido`;
  const f = segs[0].min;
  const r = segs[1]?.type === 'rest' ? segs[1].min : 0;
  let k = 0;
  let i = 0;
  while (segs[i]?.type === 'focus' && segs[i].min === f && segs[i + 1]?.type === 'rest' && segs[i + 1].min === r) {
    k++;
    i += 2;
  }
  const rest = segs.slice(i);
  let label = k > 1 ? `${f}/${r} × ${k}` : `${f}/${r}`;
  for (const s of rest) label += s.type === 'focus' ? ` + ${s.min}` : ` · ${s.min}`;
  return label;
}

/** Etiqueta del preset en sí (para la lista de Pomodoros a medida). */
export function presetLabel(p: Preset) {
  if (p.straight) return 'corrido';
  const f = p.focus % 60 === 0 && p.focus >= 120 ? `${p.focus / 60}h` : p.focus >= 60 && p.focus % 60 ? `${Math.floor(p.focus / 60)}h${p.focus % 60}` : `${p.focus}`;
  let s = `${f} / ${p.rest}`;
  if (p.cycles > 1) s += ` × ${p.cycles}`;
  if (p.longRest) s += ` + ${p.longRest}`;
  return s;
}

/** Patrón de un ciclo completo del preset, para dibujar su barra. */
export function presetPattern(p: Preset): Seg[] {
  if (p.straight) return [{ type: 'focus', min: 90 }];
  const out: Seg[] = [];
  for (let c = 0; c < p.cycles; c++) {
    out.push({ type: 'focus', min: p.focus });
    const last = c === p.cycles - 1;
    out.push({ type: 'rest', min: last && p.longRest ? p.longRest : p.rest });
  }
  return out;
}
