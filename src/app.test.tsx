import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { startFocus } from './data/focus';
import { leerHash, leerRuta } from './lib/routes';
import { getState, register, resetState, setFocus, startDay } from './state/store';
import { limpiarCapas } from './v2/kit/capas';
import { PantallaV2 } from './v2/Resolutor';
import { MiniFoco } from './v2/marco/MiniFoco';

const HOY = '2026-11-23';

describe('ruteo', () => {
  it('lee la sección del hash y cae en Hoy por defecto', () => {
    expect(leerHash('#/estudio')).toBe('estudio');
    expect(leerHash('#/nada')).toBe('hoy');
    expect(leerHash('')).toBe('hoy');
  });

  it('las pantallas de foco quedan bajo Hoy en la barra', () => {
    expect(leerRuta('#/elegir/prog')).toEqual({ pantalla: 'elegir', seccion: 'hoy', param: 'prog' });
    expect(leerRuta('#/foco').seccion).toBe('hoy');
  });
});

describe('la app: una sola interfaz', () => {
  beforeEach(() => {
    localStorage.clear();
    resetState();
    location.hash = '';
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date(`${HOY}T04:05:00-03:00`) });
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => { act(() => limpiarCapas()); vi.useRealTimers(); });

  it('la primera vez pide los dos nombres; después, el Buen día; con el día empezado, Hoy con su barra', async () => {
    render(<App />);
    const nombre = await screen.findByRole('textbox', { name: 'Tu nombre' });
    fireEvent.change(nombre, { target: { value: 'Toti' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Entrenás con' }), { target: { value: 'Abi' } });
    fireEvent.click(screen.getByRole('button', { name: /Empezar/ }));
    expect(getState().settings?.names).toEqual({ me: 'Toti', partner: 'Abi' });
    // Sin ningún rastro de la 1.0: ni el cambio de interfaz ni su marca.
    expect(getState().settings?.interfaz).toBeUndefined();
    await screen.findByRole('heading', { level: 1, name: /Buen día/ });
    act(() => { startDay('completo', '04:00', HOY); });
    await screen.findByRole('heading', { level: 1, name: 'Hoy' }, { timeout: 4000 });
    await screen.findByRole('navigation', { name: 'Secciones' });
    expect(document.querySelector('.v2-marca')).toBeNull();
  });

  it('una dirección desconocida cae en Hoy; una pantalla sin entrada dice que no la encontró y lleva a Hoy', async () => {
    register('Toti', 'Abi', HOY);
    startDay('completo', '04:00', HOY);
    expect(leerRuta('#/no-existe').pantalla).toBe('hoy');
    render(<PantallaV2 ruta={leerRuta('#/estudio')} day={getState().days[HOY]} today={HOY} registro={{}} extras={{}} />);
    await screen.findByText('No encontré esa pantalla');
    expect(screen.getByRole('link', { name: 'Ir a Hoy' })).toHaveAttribute('href', '#/hoy');
  });
});

describe('el foco que corre', () => {
  beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); });

  it('la tarjeta muestra el bloque, el tiempo que queda y se pausa', () => {
    const b = getState().days[HOY].blocks.find((x) => x.tasks.length)!;
    act(() => setFocus(startFocus(HOY, b.key, '50/10', [{ type: 'focus', min: 50 }, { type: 'rest', min: 10 }], Date.now())));
    render(<MiniFoco />);
    expect(screen.getByRole('button', { name: /^Volver al foco: .*, quedan 50:00$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(getState().focus?.pausedAt).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    expect(screen.getByText('En pausa')).toBeInTheDocument();
  });
});
