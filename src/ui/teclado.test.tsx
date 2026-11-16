import { render } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Hoja } from './Hoja';
import { alturaTeclado } from './useTeclado';

describe('ola 18: la hoja por encima del teclado', () => {
  it('el teclado tapa lo que el visualViewport ya no muestra', () => {
    expect(alturaTeclado(844, { height: 844, offsetTop: 0 })).toBe(0);
    expect(alturaTeclado(844, { height: 520, offsetTop: 0 })).toBe(324);
    expect(alturaTeclado(844, { height: 520, offsetTop: 40 })).toBe(284);
    expect(alturaTeclado(844, { height: 900, offsetTop: 0 })).toBe(0);
    expect(alturaTeclado(844, null)).toBe(0);
  });

  it('la hoja escribe --teclado al abrir el teclado y lo vuelve a 0 al cerrarlo', () => {
    const oyentes: Record<string, () => void> = {};
    const vv = { height: 844, offsetTop: 0, addEventListener: (n: string, f: () => void) => { oyentes[n] = f; }, removeEventListener: vi.fn() };
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
    render(<Hoja titulo="Nueva submeta" onCerrar={() => {}}><input aria-label="x" /></Hoja>);
    const fondo = document.querySelector('.modal-fondo') as HTMLElement;
    expect(fondo.style.getPropertyValue('--teclado')).toBe('0px');
    vv.height = 520;
    act(() => oyentes.resize());
    expect(fondo.style.getPropertyValue('--teclado')).toBe('324px');
    vv.height = 844;
    act(() => oyentes.resize());
    expect(fondo.style.getPropertyValue('--teclado')).toBe('0px');
  });
});
