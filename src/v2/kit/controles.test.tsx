import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Boton, CampoFecha, CampoHora, CampoTexto, Casilla, Chip, Contador, Interruptor, Segmentado, Selector, fechaLarga, grillaMes } from './controles';

function Con<T>({ inicial, children }: { inicial: T; children: (v: T, set: (x: T) => void) => React.ReactNode }) {
  const [v, set] = useState(inicial);
  return <>{children(v, set)}</>;
}

describe('2.0 · Botón', () => {
  it('deshabilitado con motivo: no dispara, sigue enfocable y el motivo se lee con el botón', () => {
    const f = vi.fn();
    render(<Boton variante="primario" deshabilitado="Cargá el peso para guardarlo." onClick={f}>Guardar peso</Boton>);
    const b = screen.getByRole('button', { name: 'Guardar peso' });
    fireEvent.click(b);
    expect(f).not.toHaveBeenCalled();
    expect(b).toHaveAttribute('aria-disabled', 'true');
    expect(b).not.toBeDisabled();
    expect(b).toHaveAccessibleDescription('Cargá el peso para guardarlo.');
  });

  it('cargando: avisa que trabaja y no se puede tocar dos veces', () => {
    const f = vi.fn();
    render(<Boton cargando onClick={f}>Guardar</Boton>);
    const b = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(b);
    expect(f).not.toHaveBeenCalled();
    expect(b).toHaveAttribute('aria-busy', 'true');
  });

  it('solo ícono: el nombre va en la etiqueta; con href es un link', () => {
    render(<><Boton soloIcono icono="ajustes" etiqueta="Ajustes" /><Boton href="#/ajustes">Ir</Boton></>);
    expect(screen.getByRole('button', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir' })).toHaveAttribute('href', '#/ajustes');
  });
});

describe('2.0 · Casilla, interruptor, segmentado y chip', () => {
  it('la casilla es un checkbox de fila entera; deshabilitada no cambia', () => {
    render(<Con inicial={false}>{(v, set) => <><Casilla marcada={v} onCambio={set} etiqueta="Lote 1.1" nota="2 h" /><Casilla marcada={false} onCambio={set} etiqueta="Examen" deshabilitada /></>}</Con>);
    const c = screen.getByRole('checkbox', { name: /Lote 1\.1/ });
    fireEvent.click(c);
    expect(c).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: /Examen/ }));
    expect(screen.getByRole('checkbox', { name: /Examen/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('el interruptor es un switch', () => {
    render(<Con inicial={false}>{(v, set) => <Interruptor prendido={v} onCambio={set} etiqueta="Sonidos" />}</Con>);
    fireEvent.click(screen.getByRole('switch', { name: /Sonidos/ }));
    expect(screen.getByRole('switch', { name: /Sonidos/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('segmentado: radios con flechas, y el indicador sabe dónde está', () => {
    render(<Con inicial={'semana' as 'semana' | 'mes' | 'anio'}>{(v, set) => <Segmentado etiqueta="Vista" valor={v} onCambio={set} opciones={[['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']]} />}</Con>);
    const g = screen.getByRole('radiogroup', { name: 'Vista' });
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Mes' })).toHaveAttribute('aria-checked', 'true');
    expect(g.style.getPropertyValue('--i')).toBe('1');
    fireEvent.keyDown(g, { key: 'ArrowLeft' });
    fireEvent.keyDown(g, { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: 'Año' })).toHaveAttribute('aria-checked', 'true');
  });

  it('el chip es un botón que se aprieta', () => {
    render(<Con inicial={false}>{(v, set) => <Chip activo={v} onCambio={set}>Inglés</Chip>}</Con>);
    fireEvent.click(screen.getByRole('button', { name: 'Inglés' }));
    expect(screen.getByRole('button', { name: 'Inglés' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('2.0 · Contador', () => {
  it('vacío arranca del valor inicial; respeta mínimo, máximo y decimales con coma', () => {
    render(<Con inicial={null as number | null}>{(v, set) => <><Contador etiqueta="Peso" valor={v} onCambio={set} paso={0.1} decimales={1} min={30} max={88.5} inicial={88.4} unidad="kg" /><output>{String(v)}</output></>}</Con>);
    const sumar = screen.getByRole('button', { name: 'Sumar 0,1' });
    fireEvent.click(sumar);
    expect(screen.getByText('88.4')).toBeInTheDocument();
    fireEvent.click(sumar);
    fireEvent.click(sumar);
    expect(screen.getByText('88.5')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Peso' })).toHaveValue('88,5');
    const input = screen.getByRole('textbox', { name: 'Peso' });
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});

describe('2.0 · Campos', () => {
  it('texto: el error reemplaza a la nota, se anuncia y marca el campo', () => {
    render(<CampoTexto etiqueta="Link" valor="x" onCambio={() => {}} nota="Se muestra en Open source." error="No parece un link." maximo={30} />);
    const i = screen.getByRole('textbox', { name: 'Link' });
    expect(i).toHaveAttribute('aria-invalid', 'true');
    expect(i).toHaveAccessibleDescription('No parece un link.');
    expect(screen.getByText('1/30')).toBeInTheDocument();
  });

  it('hora en 24 h: se escribe y salta a los minutos; las flechas dan la vuelta al día', () => {
    render(<Con inicial="04:00">{(v, set) => <><CampoHora etiqueta="Me levanto" valor={v} onCambio={set} /><output>{v}</output></>}</Con>);
    const h = screen.getByRole('textbox', { name: 'Me levanto: hora' });
    fireEvent.change(h, { target: { value: '21' } });
    expect(screen.getByText('21:00')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Me levanto: minutos' }));
    fireEvent.keyDown(h, { key: 'ArrowUp' });
    fireEvent.keyDown(h, { key: 'ArrowUp' });
    fireEvent.keyDown(h, { key: 'ArrowUp' });
    expect(screen.getByText('00:00')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Me levanto: minutos' }), { key: 'ArrowDown' });
    expect(screen.getByText('23:55')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/AM|PM/);
  });

  it('hora: escribir "16" de a un dígito, con el foco en la casilla, deja 16 (y no el primer dígito)', () => {
    render(<Con inicial="04:00">{(v, set) => <><CampoHora etiqueta="Me levanto" valor={v} onCambio={set} /><output>{v}</output></>}</Con>);
    const h = screen.getByRole('textbox', { name: 'Me levanto: hora' }) as HTMLInputElement;
    act(() => h.focus());
    fireEvent.change(h, { target: { value: '1' } });
    fireEvent.change(h, { target: { value: '16' } }); // completa la hora: el foco pasa a los minutos y la casilla "sale"
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Me levanto: minutos' }));
    expect(screen.getByText('16:00')).toBeInTheDocument();
    const m = screen.getByRole('textbox', { name: 'Me levanto: minutos' }) as HTMLInputElement;
    fireEvent.change(m, { target: { value: '4' } });
    fireEvent.blur(m); // un solo dígito y salir: 16:04
    expect(screen.getByText('16:04')).toBeInTheDocument();
  });

  it('fecha: "23 nov 2026", calendario de lunes a domingo, hoy marcado y lo anterior al mínimo apagado', () => {
    expect(fechaLarga('2026-11-23')).toBe('23 nov 2026');
    // Noviembre 2026 empieza en domingo: 6 huecos antes.
    expect(grillaMes(2026, 10).slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    render(<Con inicial={null as string | null}>{(v, set) => <CampoFecha etiqueta="Examen" valor={v} onCambio={set} hoy="2026-11-23" min="2026-11-23" />}</Con>);
    // El nombre del campo es la etiqueta y lo que muestra (quien usa la voz dice lo que ve).
    fireEvent.click(screen.getByRole('button', { name: 'Examen Elegir fecha' }));
    const cal = screen.getByRole('dialog', { name: 'Examen: calendario' });
    expect(within(cal).getByText('noviembre 2026')).toBeInTheDocument();
    expect(within(cal).getByRole('gridcell', { name: '22 nov 2026' })).toBeDisabled();
    expect(within(cal).getByRole('gridcell', { name: '23 nov 2026' })).toHaveAttribute('aria-current', 'date');
    fireEvent.click(within(cal).getByRole('button', { name: 'Mes siguiente' }));
    fireEvent.click(within(cal).getByRole('gridcell', { name: '12 dic 2026' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Examen 12 dic 2026' })).toHaveTextContent('12 dic 2026');
  });

  it('selector: abre la lista desde abajo, elige y cierra; Escape cierra sin cambiar', () => {
    render(<Con inicial={'completo' as string | null}>{(v, set) => <Selector etiqueta="Rutina" valor={v} onCambio={set} opciones={[{ valor: 'completo', etiqueta: 'Día completo' }, { valor: 'corto', etiqueta: 'Día corto', nota: '05:00' }]} />}</Con>);
    fireEvent.click(screen.getByRole('button', { name: 'Rutina Día completo' }));
    const hoja = screen.getByRole('dialog', { name: 'Rutina' });
    expect(within(hoja).getByRole('radio', { name: /Día completo/ })).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(within(hoja).getByRole('radio', { name: /Día completo/ }));
    fireEvent.click(within(hoja).getByRole('radio', { name: /Día corto/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /^Rutina / })).toHaveTextContent('Día corto');
    // El foco vuelve al campo, no al cuerpo de la página.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Rutina / }));
    fireEvent.click(screen.getByRole('button', { name: /^Rutina / }));
    // Escape se atiende en la lista y no sigue (dentro de una hoja, no la cierra).
    const fuera = vi.fn();
    document.addEventListener('keydown', fuera);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Rutina' }), { key: 'Escape' });
    document.removeEventListener('keydown', fuera);
    expect(fuera).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /^Rutina / })).toHaveTextContent('Día corto');
  });

  it('segmentado: las flechas eligen y llevan el foco a la elegida; Inicio y Fin van a las puntas', () => {
    render(<Con inicial="a">{(v, set) => <Segmentado etiqueta="Vista" valor={v} onCambio={set} opciones={[['a', 'Uno'], ['b', 'Dos'], ['c', 'Tres']]} />}</Con>);
    const uno = screen.getByRole('radio', { name: 'Uno' });
    uno.focus();
    fireEvent.keyDown(uno, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Dos' })).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Dos' }));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Tres' }));
  });

  it('contador: lo escrito fuera del tope vuelve a mostrar el tope aunque el valor no cambie', () => {
    render(<Con inicial={10 as number | null}>{(v, set) => <Contador etiqueta="Horas" valor={v} onCambio={set} min={0} max={10} />}</Con>);
    const campo = screen.getByRole('textbox', { name: 'Horas' });
    fireEvent.change(campo, { target: { value: '50' } });
    fireEvent.blur(campo);
    expect(campo).toHaveValue('10');
  });
});
