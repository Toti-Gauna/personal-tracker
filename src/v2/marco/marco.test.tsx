import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { abrirCorrida, abrirPeso, hojaAbierta } from '../../ui/checkins';
import { limpiarCapas } from '../kit/capas';
import AjustesV2 from '../pantallas/AjustesV2';
import DespertarV2 from '../pantallas/DespertarV2';
import { PANTALLAS_V2 } from '../registro';
import { BarraV2 } from './BarraV2';
import GlobalV2 from './Global';
import { Marco } from './Marco';
import SplashV2 from './SplashV2';
import { temaV2 } from './tema';

const HOY = '2026-11-23';
function sistema(claro: boolean) {
  window.matchMedia = ((q: string) => ({ matches: q.includes('light') ? claro : false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}
beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; sistema(false); document.documentElement.dataset.theme = 'dark'; });
afterEach(() => { act(() => limpiarCapas()); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('2.0 · la barra', () => {
  it('5 destinos en el teléfono (Metas se llama Plan) y Avance solo en ancho; el trazo sabe dónde está', () => {
    const { container } = render(<BarraV2 activa="metas" pendientes={3} />);
    const nav = screen.getByRole('navigation', { name: 'Secciones' });
    expect(within(nav).getByRole('link', { name: 'Plan', current: 'page' })).toHaveAttribute('href', '#/metas');
    expect(within(nav).getAllByRole('link').filter((a) => !a.closest('.solo-ancho') && !a.classList.contains('b2-logo'))).toHaveLength(5);
    expect(container.querySelector('.solo-ancho a')).toHaveAttribute('href', '#/avance');
    expect((nav as HTMLElement).style.getPropertyValue('--i')).toBe('2');
    expect((nav as HTMLElement).style.getPropertyValue('--j')).toBe('3');
    expect(screen.getByLabelText('3 tarjetas pendientes')).toBeInTheDocument();
    expect(nav).toHaveAttribute('data-v2-nav');
  });

  it('en Avance, el teléfono marca Perfil', () => {
    const { container } = render(<BarraV2 activa="avance" />);
    expect((container.querySelector('.b2') as HTMLElement).style.getPropertyValue('--i')).toBe('4');
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveClass('activa');
  });
});

describe('2.0 · el marco de pantalla', () => {
  it('título, volver con nombre, acciones a la derecha, ⓘ y camino', () => {
    render(<Marco titulo="PetrIA" volver={{ href: '#/metas', nombre: 'Plan' }} acciones={<button>Editar</button>} info={<p>Cómo funciona.</p>} migas={[{ nombre: 'Etapa 1', href: '#/metas/periodos/E1' }, { nombre: 'Fase 1', href: '#/metas/periodos/F1' }, { nombre: 'PetrIA' }]}><p>cuerpo</p></Marco>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PetrIA');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('data-transicion', 'atras');
    const camino = screen.getByRole('navigation', { name: 'Camino' });
    expect(within(camino).getAllByRole('link')).toHaveLength(2);
    expect(within(camino).getByText('PetrIA')).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Cómo funciona: PetrIA' }));
    expect(screen.getByRole('dialog', { name: 'PetrIA' })).toHaveTextContent('Cómo funciona.');
  });

  it('avisa en desarrollo si el título o la intro pasan el presupuesto de palabras', () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Marco titulo="Diferencia contra el roadmap" intro="uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece">x</Marco>);
    expect(w).toHaveBeenCalledTimes(2);
  });
});

describe('2.0 · Ajustes', () => {
  const ajustes = (hash = '#/ajustes') => render(<AjustesV2 ruta={leerRuta(hash)} day={getState().days[HOY]} today={HOY} />);

  it('está registrada', () => {
    expect(PANTALLAS_V2.ajustes).toMatchObject({ nombre: 'Ajustes' });
    expect(PANTALLAS_V2.ajustes!.taller).toBeFalsy();
  });

  it('el tema sin elegir es "Sistema"; elegir uno lo guarda', () => {
    ajustes();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(temaV2()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    // Se guarda en su clave; la de la 1.0 queda como estaba.
    expect(localStorage.getItem('trazo.theme.v2')).toBe('light');
  });

  it('ya no hay cambio de interfaz: la 2.0 es la única', () => {
    ajustes();
    expect(screen.queryByRole('radiogroup', { name: 'Interfaz' })).toBeNull();
    expect(screen.queryByText(/1\.0/)).toBeNull();
  });

  it('las áreas son filas con lápiz: se renombran en una hoja y vacío vuelve al nombre de fábrica', () => {
    ajustes();
    fireEvent.click(within(screen.getByRole('region', { name: 'Áreas' })).getByRole('button', { name: /Ingeniería/ }));
    const hoja = screen.getByRole('dialog', { name: 'Renombrar área' });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Nombre' }), { target: { value: 'Código' } });
    fireEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(getState().settings!.areaNames).toEqual({ ing: 'Código' });
    expect(within(screen.getByRole('region', { name: 'Áreas' })).getByRole('button', { name: /Código/ })).toHaveTextContent('Antes: Ingeniería');
  });

  it('las subpáginas: bimestres con su hoja, y el plan como página 2.0 aparte (chunk propio)', async () => {
    const { unmount } = ajustes('#/ajustes/bimestres');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bimestres');
    fireEvent.click(screen.getAllByRole('button').find((b) => /01$/.test(b.textContent ?? ''))!);
    const hoja = screen.getByRole('dialog', { name: 'Bimestre 1' });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Nombre' }), { target: { value: 'Arranque' } });
    fireEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(getState().goals.bimesterNames[1]).toBe('Arranque');
    unmount();
    ajustes('#/ajustes/plan');
    // El plan T+18 se carga aparte (lazy): primero la carga, después la página.
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Plan y rutina');
    expect(screen.getByRole('link', { name: 'Ajustes' })).toHaveAttribute('href', '#/ajustes');
    expect(screen.queryByText('1.0')).toBeNull();
  });
});

describe('2.0 · lo global', () => {
  const global = (activa: 'hoy' | 'perfil' | 'entreno' = 'hoy') => render(<GlobalV2 activa={activa} pendientes={0} conBarra conMini />);

  it('sigue al teléfono aunque la 1.0 haya grabado "oscuro" al abrir (lo grababa siempre), y lo sigue si cambia', () => {
    localStorage.setItem('trazo.theme', 'dark'); // lo que la 1.0 grababa sola
    sistema(true);
    global();
    expect(temaV2()).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('trazo.theme')).toBe('dark');
  });

  it('si en la 1.0 habías elegido Claro, la 2.0 arranca en claro; y lo elegido en la 2.0 manda', () => {
    localStorage.setItem('trazo.theme', 'light');
    expect(temaV2()).toBe('light');
    localStorage.setItem('trazo.theme.v2', 'dark');
    sistema(true);
    global();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('la corrida se carga en su hoja: tiempo, distancia con el ritmo, tipo y sensación', () => {
    global('entreno');
    act(() => abrirCorrida(HOY));
    const hoja = screen.getByRole('dialog', { name: '¿Cuánto corriste?' });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Distancia · km, opcional' }), { target: { value: '5' } });
    expect(within(hoja).getByText('Ritmo 6:00 /km')).toBeInTheDocument();
    fireEvent.click(within(hoja).getByRole('radio', { name: 'Fondo' }));
    fireEvent.click(within(hoja).getByRole('button', { name: 'Guardar corrida' }));
    expect(getState().train.runs.find((r) => r.date === HOY)).toMatchObject({ min: 30, km: 5, kind: 'fondo', feel: 3 });
    expect(hojaAbierta()).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Corrida guardada · 30 min · 5 km');
  });

  it('el pesaje no persigue: en vez de la hoja, un aviso con "Cargar", y no vuelve a preguntar hoy', () => {
    global('entreno');
    act(() => abrirPeso(HOY));
    expect(hojaAbierta()).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('¿Te pesaste hoy?');
    expect(getState().train.pesoPreguntado).toContain(HOY);
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('2.0 · carga y Buen día', () => {
  it('la carga avisa que está cargando y termina sola', () => {
    vi.useFakeTimers();
    const fin = vi.fn();
    render(<SplashV2 onFin={fin} />);
    expect(screen.getByRole('status', { name: 'Cargando Trazo' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1200); });
    expect(fin).toHaveBeenCalledOnce();
  });

  it('Buen día: saluda con el día 1 (no "día 00"), elige rutina y empieza el día con esa hora', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T04:10:00'));
    render(<DespertarV2 date="2026-11-24" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Buen día, Toti');
    expect(screen.getByText(/día 2 ·/)).toBeInTheDocument();
    const opciones = within(screen.getByRole('radiogroup', { name: 'Rutina del día' })).getAllByRole('radio');
    expect(opciones[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(opciones[1]);
    const empezar = screen.getByRole('button', { name: /^Empezar · / });
    const hora = empezar.textContent!.replace('Empezar · ', '');
    fireEvent.click(empezar);
    expect(getState().days['2026-11-24'].wake).toBe(hora);
    expect(getState().days['2026-11-24'].routine).toBe('corto');
  });

  it('Buen día: "Otra hora" se mueve de a 10 minutos y la mañana se ve en una hoja', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T04:10:00'));
    render(<DespertarV2 date="2026-11-24" />);
    const otra = screen.getByRole('radio', { name: /^Otra hora: / });
    const antes = otra.getAttribute('aria-label')!;
    fireEvent.click(screen.getByRole('button', { name: '10 minutos después' }));
    expect(screen.getByRole('radio', { name: /^Otra hora: / })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Otra hora: / }).getAttribute('aria-label')).not.toBe(antes);
    fireEvent.click(screen.getByRole('button', { name: /Así queda tu mañana/ }));
    expect(within(screen.getByRole('dialog', { name: 'Tu mañana' })).getAllByRole('listitem').length).toBeGreaterThan(1);
  });
});
