import { describe, expect, it } from 'vitest';
import { reprogramar, sumarMeta } from './editar-dia';
import { blockDone, mejoraDia, valorMeta } from './mejora';
import type { Block } from './types';

const b = (key: string, start: string, min: number, extra: Partial<Block> = {}): Block => ({ key, n: 0, title: key, short: key, area: 'rutina', kind: 'pomodoro', start, min, fixed: false, tasks: [{ id: `${key}-1`, t: 'x', done: false }], ...extra });
/** Un día tipo: trabajo 10 a 12, prog 12 a 13:30, búsqueda 13:30 a 15, mate 15 a 16:30, entreno 18 a 21, cierre 21 a 22, dormir 22. */
const dia = () => [b('trabajo', '10:00', 120), b('prog', '12:00', 90), b('busqueda', '13:30', 90), b('math', '15:00', 90), b('entreno', '18:00', 180), b('cierre', '21:00', 60), b('sueno', '22:00', 360)];
const horas = (bs: Block[]) => bs.map((x) => `${x.key} ${x.start} ${x.min}`);

describe('ola 25 · reprogramar el día', () => {
  it('correr: alargar trabajo 1 h corre prog, búsqueda y mate; entreno (18:00) no se toca porque no se pisa', () => {
    const r = reprogramar(dia(), 'trabajo', '10:00', 180, 'correr');
    if (!r.ok) throw new Error(r.error);
    expect(horas(r.blocks)).toEqual(['trabajo 10:00 180', 'prog 13:00 90', 'busqueda 14:30 90', 'math 16:00 90', 'entreno 18:00 180', 'cierre 21:00 60', 'sueno 22:00 360']);
    expect(r.blocks.find((x) => x.key === 'trabajo')!.editado).toBe(true);
    expect(r.blocks.map((x) => x.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('correr no pasa de dormir: si no entra, avisa cuánto sobra', () => {
    const r = reprogramar(dia(), 'trabajo', '10:00', 300, 'correr');
    // Trabajo hasta las 15: prog, búsqueda, mate, entreno y cierre se corren y el cierre termina 23:30.
    expect(r).toMatchObject({ ok: false, exceso: 90 });
    expect(!r.ok && r.error).toMatch(/pasan de dormir \(22:00\) por 90 min/);
  });

  it('acortar: los que siguen se achican para terminar donde terminaban (22:00), mínimo 15 min', () => {
    const r = reprogramar(dia(), 'trabajo', '10:00', 300, 'acortar');
    if (!r.ok) throw new Error(r.error);
    const sig = r.blocks.filter((x) => !['trabajo', 'sueno'].includes(x.key));
    expect(sig[0].start).toBe('15:00');
    const fin = sig[sig.length - 1];
    expect(Number(fin.start.slice(0, 2)) * 60 + Number(fin.start.slice(3)) + fin.min).toBe(22 * 60);
    expect(sig.every((x) => x.min >= 15)).toBe(true);
    expect(sig.reduce((s, x) => s + x.min, 0)).toBe(7 * 60);
  });

  it('acortar sin lugar suficiente da error; dormir no se mueve; no se puede pasar de las 22', () => {
    expect(reprogramar(dia(), 'trabajo', '10:00', 690, 'acortar')).toMatchObject({ ok: false });
    expect(reprogramar(dia(), 'sueno', '23:00', 300, 'correr')).toMatchObject({ ok: false, error: 'Dormir a las 22:00 no se mueve.' });
    expect(reprogramar(dia(), 'cierre', '21:30', 60, 'correr')).toMatchObject({ ok: false });
  });

  it('meta nueva a las 11:00 por 1 h, acortando: trabajo se corta a las 11 y lo demás termina igual', () => {
    const r = sumarMeta(dia(), { titulo: 'Reunión Tsoft', rama: 'trabajo', start: '11:00', min: 60, tareas: ['Preparar demo', ''] }, 'acortar');
    if (!r.ok) throw new Error(r.error);
    const nueva = r.blocks.find((x) => x.propia)!;
    expect(nueva).toMatchObject({ title: 'Reunión Tsoft', start: '11:00', min: 60, rama: 'trabajo', area: 'rutina', n: 2 });
    expect(nueva.tasks.map((t) => t.t)).toEqual(['Preparar demo']);
    expect(r.blocks.find((x) => x.key === 'trabajo')).toMatchObject({ min: 60, editado: true });
    expect(r.blocks.find((x) => x.key === 'prog')!.start).toBe('12:00');
    expect(r.blocks.find((x) => x.key === 'cierre')).toMatchObject({ start: '21:00', min: 60 });
    expect(sumarMeta(dia(), { titulo: ' ', start: '11:00', min: 30, tareas: [] }, 'correr')).toMatchObject({ ok: false, error: 'Falta el título.' });
  });

  it('meta nueva corriendo: lo que sigue empieza después', () => {
    const r = sumarMeta(dia(), { titulo: 'Médico', start: '16:30', min: 60, tareas: [] }, 'correr');
    if (!r.ok) throw new Error(r.error);
    expect(r.blocks[4]).toMatchObject({ title: 'Médico', start: '16:30', min: 60, area: 'economia' });
    expect(horas(r.blocks).slice(5)).toEqual(['entreno 18:00 180', 'cierre 21:00 60', 'sueno 22:00 360']);
  });
});

describe('ola 25 · bloque hecho a mano y salteado', () => {
  it('hecho a mano cuenta aunque queden submetas; salteado no cuenta ni en el total', () => {
    const bs = dia();
    bs[0] = { ...bs[0], hecho: { at: '12:00', nota: 'Otra tarea de Tsoft' } };
    bs[1] = { ...bs[1], salteado: true, tasks: [{ id: 'p', t: 'x', done: true }] };
    expect(blockDone(bs[0])).toBe(true);
    expect(blockDone(bs[1])).toBe(false);
    expect(mejoraDia({ blocks: bs })).toBeCloseTo(1 / 6);
    expect(valorMeta({ blocks: bs })).toBeCloseTo(1 / 6);
  });
});
