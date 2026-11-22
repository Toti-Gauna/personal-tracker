import { beforeEach, describe, expect, it } from 'vitest';
import { medir, sugerirCorrimiento, finProyectado } from '../data/periodos';
import { TRAMOS, tramoActivo } from '../data/plan';
import { calendarioCompleto } from '../data/plan-vistas';
import { confirmarCorrimiento, deshacerCorrimiento } from './plan';
import { getState, register, resetState } from './store';

describe('v12.1 · correr bloques atrasados solo con confirmación', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

  it('la sugerencia no cambia nada; al confirmarla se mueve el calendario (y Hoy); deshacer vuelve al plan', () => {
    const cal = calendarioCompleto().filter((b) => !b.pausa && b.etapa === 1 && !b.archivado && b.id !== 'P0');
    const p1 = cal.find((b) => b.id === 'P1')!;
    // PetrIA al 80 % el 9 dic (su fin): faltan 4 días al ritmo del plan.
    const fin = finProyectado({ ...medir({ id: 'P1', nombre: 'PetrIA', nivel: 'bloque', inicio: p1.inicio, fin: p1.fin, progreso: 0.8 }, '2026-12-09') }, '2026-12-09');
    expect(fin).toBe('2026-12-12');
    const s = sugerirCorrimiento(cal.map((b) => ({ id: b.id, inicio: b.inicio, fin: b.fin })), 'P1', fin);
    expect(s.slice(0, 3).map((x) => [x.id, x.nuevoInicio, x.nuevoFin])).toEqual([['P1', '2026-11-21', '2026-12-12'], ['CW1', '2026-12-13', '2026-12-16'], ['E1', '2026-12-17', '2026-12-23']]);
    expect(tramoActivo('2026-12-11').id).toBe('CW1');
    expect(getState().plan.corrimientos).toBeUndefined();

    confirmarCorrimiento(s.filter((x) => ['P1', 'CW1'].includes(x.id)), '2026-12-09');
    expect(getState().plan.corrimientos?.CW1).toEqual({ inicio: '2026-12-13', fin: '2026-12-16', confirmado: '2026-12-09' });
    expect(tramoActivo('2026-12-11').id).toBe('P1');
    expect(TRAMOS.find((t) => t.id === 'CW1')).toMatchObject({ inicio: '2026-12-13', fin: '2026-12-16' });

    deshacerCorrimiento(['P1', 'CW1']);
    expect(tramoActivo('2026-12-11').id).toBe('CW1');
  });
});
