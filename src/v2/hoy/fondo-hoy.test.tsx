import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import HoyV2 from './HoyV2';

function dia(fecha: string, hhmm = '09:30') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${fecha}T${hhmm}:00`));
  startDay('completo', '04:00', fecha);
  const Pantalla = () => <><HoyV2 ruta={leerRuta('#/hoy')} day={getState().days[fecha]} today={fecha} /><GlobalV2 activa="hoy" pendientes={0} conBarra={false} conMini={false} /></>;
  const r = render(<Pantalla />);
  return { ...r, otra: () => r.rerender(<Pantalla />) };
}

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-16'); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); vi.useRealTimers(); });

describe('Hoy · lo que corre en el fondo (v12.4)', () => {
  it('la tira "En el fondo" dice la app secundaria con su versión, el slot comercial con su fase y la revisión de hoy', () => {
    dia('2026-12-14'); // lunes: JulIA v3.0 y el slot #1 (build)
    const tira = within(screen.getByLabelText('En el fondo'));
    expect(tira.getByRole('link', { name: /JulIA v3\.0/ })).toHaveAttribute('href', '#/metas/fondo/julia');
    expect(tira.getByRole('link', { name: /#1 Aquasol and water parks · build/ })).toHaveAttribute('href', '#/metas/fondo/com-1');
    expect(tira.getByRole('link', { name: /Revisión de hoy 0 de 2 h/ })).toBeInTheDocument();
  });

  it('en la venta del slot (día 8) la fase cambia a venta; en un día libre fijo se ve la pausa', () => {
    dia('2026-12-21');
    expect(within(screen.getByLabelText('En el fondo')).getByRole('link', { name: /#1 .*· venta/ })).toBeInTheDocument();
  });

  it('tildar la hora de la secundaria suma 60 min a la revisión de hoy', () => {
    const { otra } = dia('2026-12-14');
    const b = getState().days['2026-12-14'].blocks.find((x) => x.key === 'fondo-sec')!;
    fireEvent.click(screen.getByRole('button', { name: /^16:00, Secundaria/ }));
    const hoja = within(screen.getByRole('dialog'));
    for (const c of hoja.getAllByRole('checkbox')) { fireEvent.click(c); otra(); }
    expect(getState().days['2026-12-14'].blocks.find((x) => x.key === 'fondo-sec')!.tasks.every((t) => t.done)).toBe(true);
    expect(b.tasks.length).toBeGreaterThan(0);
    expect(getState().plan.revisionFondo).toEqual([expect.objectContaining({ item: 'julia', min: 60 })]);
    otra();
    expect(within(screen.getByLabelText('En el fondo')).getByRole('link', { name: /Revisión de hoy 1 de 2 h/ })).toBeInTheDocument();
  });
});

describe('Hoy · la alerta de atraso de la principal (más de 7 días)', () => {
  it('al día no hay alerta', () => {
    dia('2026-11-23');
    expect(screen.queryByText(/días atrasado/)).toBeNull();
  });

  it('con PetrIA sin avanzar el 20 dic pasa de 7 días: lo dice con el nuevo fin estimado y qué pausar primero', () => {
    dia('2026-12-20');
    const plan = within(screen.getByRole('region', { name: 'Plan' }));
    const fila = plan.getByRole('link', { name: /Vas \d+ días atrasado/ });
    expect(fila).toHaveTextContent(/termina el .* en vez del 14 dic 2028/);
    expect(fila).toHaveTextContent(/Pausá primero lo comercial \(devuelve 1 h por día: unos \d+ días hasta el final\)/);
    expect(fila).toHaveTextContent(/lo secundario/);
    // También va en la campana de avisos.
    fireEvent.click(screen.getByRole('button', { name: /^Avisos: \d+$/ }));
    expect(within(screen.getByRole('dialog', { name: 'Avisos' })).getByText(/Vas \d+ días atrasado/)).toBeInTheDocument();
  });
});
