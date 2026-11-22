import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Rutinas } from './Rutinas';

const D = '2026-11-23';
beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-16'); startDay('completo', '04:00', D); location.hash = ''; });
const dia = () => getState().days[D];

describe('ola 34 · pantallas del motor de rutinas', () => {
  it('inicio: sin rutinas propias rige la del plan; las plantillas de v12.1 primero; "Usar como base" copia y abre el editor', () => {
    render(<Rutinas day={dia()} />);
    expect(screen.getByText('Todavía no tenés: rige la rutina del plan.')).toBeInTheDocument();
    const v12 = screen.getByRole('region', { name: 'Plantillas del plan v12.1' });
    expect(within(v12).getAllByText(/plan v12\.1/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('region', { name: 'Plantillas archivadas' })).toBeInTheDocument();
    fireEvent.click(within(v12).getAllByRole('button', { name: 'Usar como base' })[0]);
    const r = getState().plan.rutinasPropias![0];
    expect(r).toMatchObject({ nombre: 'Lunes a viernes · plan v12.1 (copia)', origen: 'plantilla:busqueda-intensiva' });
    expect(location.hash).toBe(`#/ajustes-rutinas/${r.id}`);
  });

  it('generar: la vista previa se arma con las restricciones, avisa lo que no entra, se guarda y se asigna a días de la semana', () => {
    const { unmount } = render(<Rutinas day={dia()} param="nueva" />);
    expect(screen.getByRole('region', { name: 'Vista previa' }).textContent).toMatch(/04:30–08:30Foco.*08:30–10:00Abi \+ correr.*10:00–14:00Foco.*14:00–16:00Foco/);
    fireEvent.change(screen.getByRole('textbox', { name: 'Necesidad 1: horas' }), { target: { value: '16' } });
    expect(screen.getByText(/No entra: Foco \(1 h\)/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Necesidad 1: horas' }), { target: { value: '8' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre de la rutina' }), { target: { value: 'Mañanas largas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar la rutina' }));
    const r = getState().plan.rutinasPropias![0];
    expect(r.nombre).toBe('Mañanas largas');
    unmount();
    render(<Rutinas day={dia()} param={r.id} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'sáb' }));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-24' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usarla esos días' }));
    expect(getState().plan.asignacionesRutina).toEqual([expect.objectContaining({ rutina: r.id, tipo: 'semana', dias: [1, 2, 3, 4, 5, 6], desde: '2026-11-24' })]);
    expect(screen.getByText(/lun, mar, mié, jue, vie, sáb desde el 24 nov/)).toBeInTheDocument();
  });

  it('un fijo que se pisa se avisa y no deja guardar', () => {
    render(<Rutinas day={dia()} param="nueva" />);
    fireEvent.click(screen.getByRole('button', { name: '+ Algo fijo' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Fijo 2: nombre' }), { target: { value: 'Dentista' } });
    fireEvent.change(screen.getByLabelText('Fijo 2: desde'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Fijo 2: hasta'), { target: { value: '09:30' } });
    expect(screen.getByRole('alert').textContent).toBe('Dentista se pisa con Abi + correr');
    expect(screen.getByRole('button', { name: 'Guardar la rutina' })).toBeDisabled();
  });

  it('adaptar hoy: un compromiso nuevo, sin Abi hoy; "Usar hoy" rearma el día', () => {
    render(<Rutinas day={dia()} param="hoy" />);
    fireEvent.click(screen.getByRole('button', { name: '+ Algo fijo' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Fijo 1: nombre' }), { target: { value: 'Dentista' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hoy no va: Abi + correr' }));
    expect(screen.getByRole('region', { name: 'Vista previa' }).textContent).toMatch(/13:00–14:00Dentista/);
    expect(screen.getByRole('region', { name: 'Vista previa' }).textContent).not.toMatch(/Abi \+ correr/);
    fireEvent.click(screen.getByRole('button', { name: 'Usar hoy' }));
    expect(screen.getByRole('status').textContent).toMatch(/hoy usa la rutina adaptada/);
    expect(dia().rutinaPropia).toBe(`Adaptada · ${D}`);
    expect(dia().blocks.map((b) => b.title)).toContain('Dentista');
    expect(dia().blocks.map((b) => b.title)).not.toContain('Abi + correr');
  });
});
