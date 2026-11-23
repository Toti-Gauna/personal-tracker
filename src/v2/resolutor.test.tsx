import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leerRuta } from '../lib/routes';
import { register, resetState, startDay } from '../state/store';
import { LimiteV2, PantallaV2 } from './Resolutor';
import type { RegistroV2 } from './registro';

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-23'); startDay('completo', '04:00', '2026-11-23'); location.hash = ''; });
afterEach(() => vi.restoreAllMocks());

const props = { ruta: leerRuta('#/hoy'), day: undefined as never, today: '2026-11-23' };
const Nueva = () => <p>pantalla nueva</p>;
const Rota = () => { throw new Error('boom'); };

describe('el resolutor', () => {
  it('la pantalla de la ruta se ve; una ruta sin entrada dice que no la encontró (sin ninguna marca de 1.0)', () => {
    const registro: RegistroV2 = { hoy: { nombre: 'Hoy', Componente: Nueva } };
    const { unmount } = render(<PantallaV2 {...props} registro={registro} extras={{}} />);
    expect(screen.getByText('pantalla nueva')).toBeInTheDocument();
    unmount();
    render(<PantallaV2 {...props} ruta={leerRuta('#/estudio')} registro={registro} extras={{}} />);
    expect(screen.getByText('No encontré esa pantalla')).toBeInTheDocument();
    expect(document.querySelector('.v2-marca')).toBeNull();
  });

  it('si una pantalla falla se ve un aviso con salida (tus datos no se tocan) y "Probar de nuevo" la vuelve a montar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let romper = true;
    const AVeces = () => { if (romper) throw new Error('boom'); return <p>ya anda</p>; };
    render(<PantallaV2 {...props} registro={{ hoy: { nombre: 'Hoy', Componente: AVeces } }} extras={{}} />);
    expect(screen.getByText('Esta pantalla no cargó')).toBeInTheDocument();
    expect(screen.getByText('Tus datos están bien.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Hoy' })).toHaveAttribute('href', '#/hoy');
    romper = false;
    fireEvent.click(screen.getByRole('button', { name: 'Probar de nuevo' }));
    expect(screen.getByText('ya anda')).toBeInTheDocument();
  });

  it('si no bajó el archivo de la pantalla (después de publicar otra versión), "Probar de nuevo" recarga la página', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const recargar = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: recargar });
    const NoBaja = () => { throw new TypeError('Failed to fetch dynamically imported module: /assets/HoyV2-viejo.js'); };
    render(<PantallaV2 {...props} registro={{ hoy: { nombre: 'Hoy', Componente: NoBaja } }} extras={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Probar de nuevo' }));
    expect(recargar).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('el límite se reinicia solo al cambiar de pantalla (la key)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<LimiteV2 key="a"><Rota /></LimiteV2>);
    expect(screen.getByText('Esta pantalla no cargó')).toBeInTheDocument();
    rerender(<LimiteV2 key="b"><p>bien</p></LimiteV2>);
    expect(screen.getByText('bien')).toBeInTheDocument();
  });
});
