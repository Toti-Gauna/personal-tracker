import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BottomBar } from '../components/BottomBar';
import { SideNav } from '../components/SideNav';
import { leerRuta, NAV_ANCHA, SECCIONES } from '../lib/routes';
import { barras } from './WeekChart';

describe('navegación por tamaño', () => {
  it('la barra ancha suma Avance a los 5 destinos del teléfono', () => {
    expect(SECCIONES).toHaveLength(5);
    expect(NAV_ANCHA).toEqual(['avance', 'hoy', 'estudio', 'metas', 'entreno', 'perfil']);
    expect(leerRuta('#/avance/presentacion')).toEqual({ pantalla: 'avance', seccion: 'avance', param: 'presentacion' });
  });

  it('barra inferior: 5 enlaces; lateral y riel: 6, con aria-current en la activa', () => {
    const { unmount } = render(<BottomBar activa="metas" />);
    expect(screen.getAllByRole('link')).toHaveLength(5);
    unmount();
    render(<SideNav activa="avance" pendientes={3} />);
    const links = screen.getAllByRole('link');
    // El logo + los 6 destinos.
    expect(links).toHaveLength(7);
    expect(screen.getByRole('link', { name: /Avance/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByLabelText('3 tarjetas pendientes')).toBeInTheDocument();
  });
});

describe('períodos del gráfico de estudio', () => {
  it('semana: 7 días con la meta de 4 h', () => {
    const b = barras('semana', '2026-11-11');
    expect(b.items.map((x) => x.letra)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
    expect(b.items.find((x) => x.actual)?.desde).toBe('2026-11-11');
    expect(b.metaMin).toBe(240);
  });
  it('mes: semanas que tocan el mes, recortadas a sus días', () => {
    const b = barras('mes', '2026-11-11');
    expect(b.items[0]).toMatchObject({ letra: 'S1', desde: '2026-11-01', hasta: '2026-11-01' });
    expect(b.items[1]).toMatchObject({ desde: '2026-11-02', hasta: '2026-11-08' });
    expect(b.items[b.items.length - 1].hasta).toBe('2026-11-30');
    expect(b.items.filter((x) => x.actual)).toHaveLength(1);
  });
  it('año: 12 meses, de noviembre a octubre', () => {
    const b = barras('anio', '2026-11-11');
    expect(b.items).toHaveLength(12);
    expect(b.items[0].desde).toBe('2026-11-01');
    expect(b.items[11].desde).toBe('2027-10-01');
    expect(b.items[0].actual).toBe(true);
  });
});
