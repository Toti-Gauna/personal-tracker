import { render, screen } from '@testing-library/react';
import { BottomBar } from './components/BottomBar';
import { MiniPlayer } from './components/MiniPlayer';
import { leerHash } from './lib/routes';

describe('ruteo', () => {
  it('lee la sección del hash y cae en Hoy por defecto', () => {
    expect(leerHash('#/estudio')).toBe('estudio');
    expect(leerHash('#/nada')).toBe('hoy');
    expect(leerHash('')).toBe('hoy');
  });
});

describe('barra inferior', () => {
  it('marca la sección activa con aria-current', () => {
    render(<BottomBar activa="metas" />);
    expect(screen.getByRole('link', { name: /metas/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /hoy/i })).not.toHaveAttribute('aria-current');
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('muestra el contador de Estudio solo si hay pendientes y no estás ahí', () => {
    const { rerender } = render(<BottomBar activa="hoy" pendientes={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    rerender(<BottomBar activa="estudio" pendientes={12} />);
    expect(screen.queryByText('12')).toBeNull();
    rerender(<BottomBar activa="hoy" pendientes={0} />);
    expect(screen.queryByText('12')).toBeNull();
  });
});

describe('mini reproductor', () => {
  it('muestra bloque, tiempo y avance', () => {
    render(
      <MiniPlayer
        foco={{ bloque: 'Programación', detalle: '50/10 + 30 · 1 de 2', restante: '38:12', avance: 0.25 }}
        onVolver={() => {}}
        onPausar={() => {}}
      />,
    );
    expect(screen.getByText('38:12')).toBeInTheDocument();
    expect(screen.getByLabelText('Pausar')).toBeInTheDocument();
  });
});
