import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CapasV2, { limpiarCapas } from '../v2/kit/capas';
import { avisarVersionNueva } from './actualizacion';

/** Un service worker de mentira: lo justo para disparar "controllerchange". */
function falso(controller: unknown) {
  const oyentes = new Set<() => void>();
  return {
    controller,
    addEventListener: (_: 'controllerchange', f: () => void) => { oyentes.add(f); },
    removeEventListener: (_: 'controllerchange', f: () => void) => { oyentes.delete(f); },
    cambiar: () => act(() => { oyentes.forEach((f) => f()); }),
    oyentes,
  };
}

afterEach(() => limpiarCapas());

describe('Una versión nueva', () => {
  it('si ya había una versión y toma el control otra, avisa y "Actualizar" recarga', () => {
    const sw = falso({});
    const recargar = vi.fn();
    render(<CapasV2 />);
    avisarVersionNueva(sw, recargar);
    sw.cambiar();
    expect(screen.getByText('Hay una versión nueva')).toBeInTheDocument();
    expect(recargar).not.toHaveBeenCalled(); // nunca se recarga solo
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(recargar).toHaveBeenCalledOnce();
  });

  it('la primera instalación no avisa: no hay versión vieja que reemplazar', () => {
    const sw = falso(null);
    render(<CapasV2 />);
    avisarVersionNueva(sw, vi.fn());
    sw.cambiar();
    expect(screen.queryByText('Hay una versión nueva')).toBeNull();
  });

  it('avisa una sola vez aunque el cambio se repita, y se puede dejar de escuchar', () => {
    const sw = falso({});
    render(<CapasV2 />);
    const parar = avisarVersionNueva(sw, vi.fn());
    sw.cambiar();
    sw.cambiar();
    expect(screen.getAllByText('Hay una versión nueva')).toHaveLength(1);
    parar();
    expect(sw.oyentes.size).toBe(0);
  });

  it('sin service worker (un navegador viejo, los tests) no hace nada', () => {
    expect(() => avisarVersionNueva(undefined, vi.fn())()).not.toThrow();
  });
});
