import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ajustes } from '../screens/Ajustes';
import { forzadaPorUrl, interfazActiva } from '../lib/interfaz';
import { leerRuta } from '../lib/routes';
import { getState, register, resetState, startDay } from '../state/store';
import { LimiteV2, PantallaV2 } from './Resolutor';
import type { RegistroV2 } from './registro';

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-23'); startDay('completo', '04:00', '2026-11-23'); location.hash = ''; });
afterEach(() => vi.restoreAllMocks());

const props = { ruta: leerRuta('#/hoy'), day: undefined as never, today: '2026-11-23', v1: <p>pantalla 1.0</p> };
const Nueva = () => <p>pantalla 2.0</p>;
const Rota = () => { throw new Error('boom'); };

describe('UX 2.0 · el cambio de interfaz', () => {
  it('sin valor guardado es la 1.0; la dirección manda: ?ui=1 vuelve a la 1.0 y ?ui=2 prueba la 2.0', () => {
    expect(interfazActiva(undefined, '')).toBe('v1');
    expect(interfazActiva('v2', '')).toBe('v2');
    expect(interfazActiva('v2', '?ui=1')).toBe('v1');
    expect(interfazActiva('v1', '?ui=2')).toBe('v2');
    expect(forzadaPorUrl('?otra=1')).toBeNull();
    expect(forzadaPorUrl('?ui=3')).toBeNull();
  });

  it('en la 1.0 todo se ve como siempre, sin marca', () => {
    render(<PantallaV2 interfaz="v1" {...props} registro={{ hoy: { nombre: 'Hoy', Componente: Nueva } }} />);
    expect(screen.getByText('pantalla 1.0')).toBeInTheDocument();
    expect(screen.queryByText('1.0', { selector: '.v2-marca' })).toBeNull();
  });

  it('en la 2.0, la pantalla que ya existe reemplaza a la 1.0 y la que no, se ve en 1.0 con su marca', () => {
    const registro: RegistroV2 = { hoy: { nombre: 'Hoy', Componente: Nueva } };
    const { unmount } = render(<PantallaV2 interfaz="v2" {...props} registro={registro} />);
    expect(screen.getByText('pantalla 2.0')).toBeInTheDocument();
    expect(screen.queryByText('pantalla 1.0')).toBeNull();
    unmount();
    render(<PantallaV2 interfaz="v2" {...props} ruta={leerRuta('#/estudio')} registro={registro} />);
    expect(screen.getByText('pantalla 1.0')).toBeInTheDocument();
    expect(screen.getByText('1.0', { selector: '.v2-marca' })).toBeInTheDocument();
  });

  it('si la pantalla 2.0 falla, se ve la 1.0 con un aviso y no se rompe nada', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PantallaV2 interfaz="v2" {...props} registro={{ hoy: { nombre: 'Hoy', Componente: Rota } }} />);
    expect(screen.getByText('pantalla 1.0')).toBeInTheDocument();
    expect(screen.getByText('1.0 · falló la 2.0')).toBeInTheDocument();
  });

  it('el límite se reinicia solo al cambiar de pantalla (la key)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<LimiteV2 key="a" fallback={<p>plan B</p>}><Rota /></LimiteV2>);
    expect(screen.getByText('plan B')).toBeInTheDocument();
    rerender(<LimiteV2 key="b" fallback={<p>plan B</p>}><p>bien</p></LimiteV2>);
    expect(screen.getByText('bien')).toBeInTheDocument();
  });

  it('Ajustes: el cambio se guarda en los ajustes, no toca nada más y se puede deshacer', () => {
    const antes = getState();
    render(<Ajustes />);
    const v1 = screen.getByRole('radio', { name: '1.0 · actual' });
    const v2 = screen.getByRole('radio', { name: '2.0 · en construcción' });
    expect(v1).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(v2);
    expect(getState().settings!.interfaz).toBe('v2');
    expect(screen.getByRole('radio', { name: '2.0 · en construcción' })).toHaveAttribute('aria-checked', 'true');
    // Lo demás queda igual: días, tarjetas, plan, nombres.
    const ahora = getState();
    expect(ahora.days).toBe(antes.days);
    expect(ahora.study).toBe(antes.study);
    expect(ahora.plan).toBe(antes.plan);
    expect(ahora.settings!.names).toEqual(antes.settings!.names);
    fireEvent.click(screen.getByRole('radio', { name: '1.0 · actual' }));
    expect(getState().settings!.interfaz).toBe('v1');
  });

  it('la elección sobrevive al guardado: está en el mismo JSON que el resto', () => {
    render(<Ajustes />);
    act(() => { fireEvent.click(screen.getByRole('radio', { name: '2.0 · en construcción' })); });
    expect(JSON.parse(localStorage.getItem('trazo.v1')!).settings.interfaz).toBe('v2');
  });
});
