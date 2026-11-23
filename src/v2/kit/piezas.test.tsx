import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CapasV2, { aviso, confirmar, limpiarCapas } from './capas';
import { Hoja, Info, Termino } from './hoja';
import { Anillo, Barra, ConCarga, Dato, Estado, Fila, Pista, Ritmo, Tarjeta, Vacio } from './superficies';

afterEach(() => { act(() => limpiarCapas()); vi.useRealTimers(); });

describe('2.0 · avisos', () => {
  it('se apilan hasta 3, se van solos a los 4 s y los de deshacer duran 6 s', () => {
    vi.useFakeTimers();
    render(<CapasV2 />);
    act(() => { aviso({ titulo: 'Uno' }); aviso({ titulo: 'Dos' }); aviso({ titulo: 'Tres' }); aviso({ titulo: 'Cuatro', deshacer: () => {} }); });
    expect(screen.getAllByRole('status').map((x) => x.querySelector('b')!.textContent)).toEqual(['Dos', 'Tres', 'Cuatro']);
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.getAllByRole('status').map((x) => x.querySelector('b')!.textContent)).toEqual(['Cuatro']);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('deshacer corre la acción y saca el aviso; los errores se anuncian como alerta', () => {
    const f = vi.fn();
    render(<CapasV2 />);
    act(() => { aviso({ titulo: 'Borrado', deshacer: f }); aviso({ titulo: 'No se pudo', tono: 'error' }); });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo');
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(f).toHaveBeenCalledOnce();
    expect(screen.queryByText('Borrado')).toBeNull();
  });

  it('confirmar devuelve la respuesta; con peligro el foco arranca en Cancelar y Escape dice que no', async () => {
    render(<CapasV2 />);
    let r!: Promise<boolean>;
    act(() => { r = confirmar({ titulo: '¿Borrar?', texto: 'No se deshace.', accion: 'Borrar', peligro: true }); });
    const d = screen.getByRole('alertdialog', { name: '¿Borrar?' });
    expect(d).toHaveAccessibleDescription('No se deshace.');
    expect(document.activeElement).toBe(within(d).getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(d, { key: 'Escape' });
    await expect(r).resolves.toBe(false);
    act(() => { r = confirmar({ titulo: '¿Guardar?', accion: 'Guardar' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await expect(r).resolves.toBe(true);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('2.0 · hoja e ⓘ', () => {
  function ConHoja() {
    const [a, setA] = useState(false);
    return <><button onClick={() => setA(true)}>Abrir</button><Hoja abierta={a} onCerrar={() => setA(false)} titulo="Hoy"><button>Pomodoros</button><button>JSON</button></Hoja></>;
  }

  it('abre con nombre, guarda el foco adentro, Escape cierra y el foco vuelve', () => {
    vi.useFakeTimers();
    render(<ConHoja />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    abrir.focus();
    fireEvent.click(abrir);
    const h = screen.getByRole('dialog', { name: 'Hoy' });
    expect(h).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    // Tab desde el último vuelve al primero (Cerrar).
    within(h).getByRole('button', { name: 'JSON' }).focus();
    fireEvent.keyDown(h, { key: 'Tab' });
    expect(document.activeElement).toBe(within(h).getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(h, { key: 'Escape' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(abrir);
    expect(document.body.style.overflow).toBe('');
  });

  it('la ⓘ abre la explicación; un término del glosario trae la suya', () => {
    render(<><Info titulo="Períodos"><p>Cada meta es un período.</p></Info><Termino termino="Ritmo" /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Cómo funciona: Períodos' }));
    expect(within(screen.getByRole('dialog', { name: 'Períodos' })).getByText('Cada meta es un período.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cómo funciona: Ritmo' }));
    expect(within(screen.getByRole('dialog', { name: 'Ritmo' })).getByText(/Compara cuánto tiempo pasó/)).toBeInTheDocument();
  });
});

describe('2.0 · el foco con hojas', () => {
  function Dos() {
    const [a, setA] = useState(false);
    const [b, setB] = useState(false);
    const [vista, setVista] = useState(1);
    return (
      <>
        <button onClick={() => setA(true)}>Abrir A</button>
        <Hoja abierta={a} onCerrar={() => setA(false)} titulo="A">
          <button onClick={() => setB(true)}>Abrir B</button>
          {vista === 1 ? <button onClick={() => setVista(2)}>Cambiar de vista</button> : <p>Otra vista</p>}
        </Hoja>
        <Hoja abierta={b} onCerrar={() => setB(false)} titulo="B"><p>Adentro de B</p></Hoja>
      </>
    );
  }

  it('al cerrar una hoja encima de otra, el foco vuelve a lo que la abrió adentro de la de abajo', () => {
    vi.useFakeTimers();
    render(<Dos />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir A' }));
    const abrirB = screen.getByRole('button', { name: 'Abrir B' });
    abrirB.focus();
    fireEvent.click(abrirB);
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'B' }));
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'B' }), { key: 'Escape' });
    act(() => { vi.advanceTimersByTime(400); });
    expect(document.activeElement).toBe(abrirB);
    vi.useRealTimers();
  });

  it('si lo que tenía el foco desaparece adentro de la hoja, el foco vuelve a la hoja (no a la página)', async () => {
    render(<Dos />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir A' }));
    const cambiar = screen.getByRole('button', { name: 'Cambiar de vista' });
    cambiar.focus();
    fireEvent.click(cambiar);
    await act(async () => {});
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'A' }));
  });
});

describe('2.0 · lectura del avance', () => {
  it('el anillo y el ritmo se leen en voz alta; el ritmo marca "atrás" si el trabajo va 10 puntos detrás del tiempo', () => {
    const { container } = render(<><Anillo nombre="PetrIA" valor={0.62} /><Ritmo nombre="Ritmo" tiempo={0.74} trabajo={0.62} frase="Vas 1 día atrás." /><Ritmo nombre="Otro" tiempo={0.5} trabajo={0.45} /></>);
    expect(screen.getByRole('img', { name: 'PetrIA: 62 %' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ritmo: trabajo 62 %, tiempo 74 %' })).toBeInTheDocument();
    const ritmos = container.querySelectorAll('.s-ritmo');
    expect(ritmos[0]).toHaveClass('atras');
    expect(ritmos[1]).not.toHaveClass('atras');
  });

  it('completo = el trazo: anillo, ritmo y barra al 100 % cambian de clase', () => {
    const { container } = render(<><Anillo nombre="A" valor={1} /><Ritmo nombre="R" tiempo={1} trabajo={1} /><Barra nombre="B" valor={11} max={11} /></>);
    expect(container.querySelector('.s-anillo')).toHaveClass('completo');
    expect(container.querySelector('.s-ritmo')).toHaveClass('completo');
    expect(screen.getByRole('progressbar', { name: 'B' })).toHaveClass('completo');
  });

  it('el estado lleva ícono y palabra; el dato siempre su rótulo, y el cambio va con flecha', () => {
    const { container } = render(<><Estado estado="vencido" /><Dato valor="12" etiqueta="Racha" delta={{ valor: '+3', sentido: 'sube' }} /></>);
    expect(screen.getByText('Vencido').closest('.s-estado')).toHaveClass('critico');
    expect(container.querySelector('.s-estado svg[data-icono="alerta"]')).toBeInTheDocument();
    expect(screen.getByText('Racha')).toBeInTheDocument();
    expect(container.querySelector('.s-delta svg[data-icono="arriba"]')).toBeInTheDocument();
  });
});

describe('2.0 · tarjeta, fila, carga, vacío y pista', () => {
  it('tarjeta y fila con href son links enteros; sin acción, la fila no muestra chevron', () => {
    const { container } = render(<><Tarjeta href="#/metas" etiqueta="Plan">x</Tarjeta><Fila titulo="Ajustes" href="#/ajustes" /><Fila titulo="Límite" valor="1 dic" /></>);
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '#/metas');
    expect(screen.getByRole('link', { name: /Ajustes/ })).toHaveAttribute('href', '#/ajustes');
    expect(container.querySelectorAll('.s-chevron')).toHaveLength(1);
  });

  it('con carga: esqueleto y aria-busy hasta que llega el contenido', () => {
    const { rerender, container } = render(<ConCarga cargando nombre="el plan" esqueleto={<i data-esq />}><p>listo</p></ConCarga>);
    expect(container.querySelector('[aria-busy="true"]')).toHaveAccessibleName('Cargando el plan');
    expect(screen.queryByText('listo')).toBeNull();
    rerender(<ConCarga cargando={false} nombre="el plan" esqueleto={<i data-esq />}><p>listo</p></ConCarga>);
    expect(screen.getByText('listo')).toBeInTheDocument();
    expect(container.querySelector('[data-esq]')).toBeNull();
  });

  it('el vacío trae ilustración, título y acción; la pista se muestra al enfocar', () => {
    render(<><Vacio ilustracion="plan" titulo="Sin metas" accion={<button>Agregar meta</button>} /><Pista texto="Semana 1 de 52"><button>1/52</button></Pista></>);
    expect(screen.getByRole('button', { name: 'Agregar meta' })).toBeInTheDocument();
    const t = screen.getByRole('tooltip', { hidden: true });
    expect(t).not.toHaveClass('ver');
    fireEvent.focus(screen.getByRole('button', { name: '1/52' }));
    expect(t).toHaveClass('ver');
  });

  it('el vacío compacto va en una fila: el dibujo a un lado y el título, el texto y la acción juntos al otro', () => {
    const { container } = render(<Vacio compacto ilustracion="peso" titulo="Sin pesajes" texto="Con dos ya se dibuja la curva." accion={<button>Cargar</button>} />);
    const caja = container.querySelector('.s-vacio')!;
    expect(caja).toHaveClass('compacto');
    expect(caja.children).toHaveLength(2); // el dibujo y el bloque de texto
    const texto = container.querySelector('.s-vacio-texto')!;
    expect(texto.textContent).toBe('Sin pesajesCon dos ya se dibuja la curva.Cargar');
    expect(caja.querySelector('svg.ilustracion')).toBeInTheDocument();
  });
});
