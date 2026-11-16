import { describe, expect, it } from 'vitest';
import { avisoPasado } from './avisos';
import { focusStartedAt, pause, startFocus, tick } from './focus';
import { toMin } from './time';
import type { DayLog, FocusState } from './types';

const day: DayLog = {
  date: '2026-11-17', wake: '04:30', routine: 'completo', notes: [], focus: [], blocks: [
    { key: 'math', n: 1, title: 'Matemática', short: 'm', area: 'ing', kind: 'estudio', start: '04:30', min: 120, fixed: false, tasks: [] },
    { key: 'prog', n: 2, title: 'Programación', short: 'p', area: 'ing', kind: 'pomodoro', start: '06:30', min: 120, fixed: false, tasks: [] },
  ],
};

describe('aviso de bloque pasado (ola 14)', () => {
  it('avisa cuando el foco empezó a tiempo y siguió después del fin', () => {
    const a = avisoPasado(day, 'math', toMin('06:50'), toMin('05:00'))!;
    expect(a.titulo).toBe('Matemática se pasó 20 min');
    expect(a.texto).toBe('Programación se acorta a 100 min; el resto del día no se corre.');
  });

  it('no avisa si entraste en foco cuando el bloque ya había terminado (antes decía "se pasó 644 min")', () => {
    // Matemática terminó a las 06:30; entrás a las 14:41: no te pasaste, llegaste tarde.
    expect(avisoPasado(day, 'math', toMin('14:41'), toMin('14:40'))).toBeNull();
    expect(avisoPasado(day, 'math', toMin('14:41'), toMin('06:30'))).toBeNull();
  });

  it('un foco que arrancó un minuto antes del fin sí cuenta', () => {
    expect(avisoPasado(day, 'math', toMin('06:40'), toMin('06:29'))!.titulo).toBe('Matemática se pasó 10 min');
  });

  it('sin la hora de inicio se comporta como antes', () => {
    expect(avisoPasado(day, 'math', toMin('06:20'))).toBeNull();
    expect(avisoPasado(day, 'math', toMin('06:50'))!.titulo).toBe('Matemática se pasó 20 min');
  });

  it('el siguiente nunca baja de 0 min', () => {
    const a = avisoPasado(day, 'math', toMin('08:50'), toMin('06:00'))!;
    expect(a.texto).toContain('se acorta a 0 min');
  });
});

describe('cuándo empezó el foco', () => {
  const t0 = Date.parse('2026-11-17T05:00:00');
  const segs = [{ type: 'focus' as const, min: 50 }, { type: 'rest' as const, min: 10 }, { type: 'focus' as const, min: 50 }];

  it('el foco nuevo guarda startedAt', () => {
    expect(startFocus('2026-11-17', 'math', '50/10', segs, t0).startedAt).toBe(t0);
  });

  it('sigue valiendo después de avanzar tramos y pausar', () => {
    let f = startFocus('2026-11-17', 'math', '50/10', segs, t0);
    f = tick(f, t0 + 65 * 60000).state;
    f = pause(f, t0 + 66 * 60000);
    expect(f.i).toBe(2);
    expect(focusStartedAt(f)).toBe(t0);
  });

  it('un foco guardado antes de la ola 14 se estima desde el tramo actual', () => {
    const viejo: FocusState = { date: '2026-11-17', key: 'math', plan: '50/10', segs, i: 2, segStart: t0 + 60 * 60000, pausedAt: null };
    expect(focusStartedAt(viejo)).toBe(t0);
  });
});
