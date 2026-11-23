import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PRESUPUESTO, contarPalabras } from '../reglas';
import { PANTALLAS_V2 } from '../registro';
import { leerRuta } from '../../lib/routes';
import Taller from './Taller';
const Lenguaje = () => <Taller ruta={leerRuta('#/v2')} day={undefined as never} today="2026-11-23" />;

describe('2.0 · la página del lenguaje', () => {
  it('cumple sus propias reglas: título e intro dentro del presupuesto', () => {
    render(<Lenguaje />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(contarPalabras(h1.textContent!)).toBeLessThanOrEqual(PRESUPUESTO.titulo);
    expect(contarPalabras(h1.parentElement!.querySelector('.m-intro')!.textContent!)).toBeLessThanOrEqual(PRESUPUESTO.intro);
  });

  it('muestra los 7 estados con su palabra, las 7 áreas y los 8 roles de texto', () => {
    render(<Lenguaje />);
    const estados = within(screen.getByRole('region', { name: 'Estados' }));
    for (const p of ['Próximo', 'En plan', 'Adelantado', 'En pausa', 'Atrasado', 'Vencido', 'Hecho']) expect(estados.getByText(p)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Áreas' })).getAllByRole('listitem')).toHaveLength(7);
    expect(within(screen.getByRole('region', { name: 'Tipografía' })).getAllByRole('listitem')).toHaveLength(8);
  });

  it('está registrada como pantalla de taller: no cuenta como pantalla convertida', () => {
    expect(PANTALLAS_V2.v2).toMatchObject({ nombre: 'Taller de diseño', taller: true });
  });
});
