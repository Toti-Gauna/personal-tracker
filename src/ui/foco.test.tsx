import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startFocus } from '../data/focus';
import { getState, register, resetState, setFocus, startDay } from '../state/store';
import CapasV2, { limpiarCapas } from '../v2/kit/capas';
import { empezarFoco } from './foco';

const HOY = '2026-11-23';
const M = 60000;
beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); });
afterEach(() => { act(() => limpiarCapas()); vi.useRealTimers(); });

describe('empezar un foco con otro corriendo', () => {
  const bloques = () => getState().days[HOY].blocks.filter((b) => b.tasks.length);

  it('sin otro foco, empieza en el acto', () => {
    const despues = vi.fn();
    empezarFoco(startFocus(HOY, bloques()[0].key, '50/10', [{ type: 'focus', min: 50 }], Date.now()), despues);
    expect(getState().focus?.key).toBe(bloques()[0].key);
    expect(despues).toHaveBeenCalledOnce();
  });

  it('con otro, pregunta; si seguís, guarda los minutos que llevaba y empieza el nuevo; si no, no toca nada', async () => {
    render(<CapasV2 />);
    const [a, b] = bloques();
    act(() => setFocus(startFocus(HOY, a.key, '50/10', [{ type: 'focus', min: 50 }], Date.now() - 12 * M)));
    const despues = vi.fn();
    act(() => empezarFoco(startFocus(HOY, b.key, '25/5', [{ type: 'focus', min: 25 }], Date.now()), despues));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/se guardan los 12 min que llevás/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await act(async () => {});
    expect(getState().focus?.key).toBe(a.key);
    expect(despues).not.toHaveBeenCalled();

    act(() => empezarFoco(startFocus(HOY, b.key, '25/5', [{ type: 'focus', min: 25 }], Date.now()), despues));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar este' }));
    await act(async () => {});
    expect(getState().focus?.key).toBe(b.key);
    expect(getState().days[HOY].focus).toEqual([expect.objectContaining({ key: a.key, focusMin: 12 })]);
    expect(despues).toHaveBeenCalledOnce();
  });
});
