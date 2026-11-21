import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { saveTest, terminarEstudio } from '../state/study';
import { cerrarEstadoEstudio, estadoEstudioAbierto } from '../ui/EstadoEstudio';
import { MatePlan } from './MatePlan';
import { Tarjetas, parseFiltro } from './Tarjetas';

const D = '2026-11-18';
const day = () => getState().days[D];
const sinErrores = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', D);
});
afterEach(() => cerrarEstadoEstudio());

describe('ola 28 · Matemática: libros, capítulos, tarjetas y tests', () => {
  it('Matemática muestra tus libros con el %, y la ventana W1 manda Conamat (sin el link a M0-M10)', () => {
    const { unmount } = render(<MatePlan day={day()} param="mate" />);
    const libros = screen.getByText(/Tus libros/).closest('section')!;
    expect(within(libros).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/estudio/mate/libro/conamat', '#/estudio/mate/libro/conamat-algebra']);
    expect(within(libros).getByText(/Arranca al terminar Aritmética/)).toBeInTheDocument();
    expect(screen.queryByText(/Material de refuerzo: M0 a M10/)).toBeNull();
    unmount();
    // v12.1: los tramos diarios m1–m4 están archivados; la matemática va por ventanas (W1 con los libros de Conamat).
    render(<MatePlan day={day()} param="mate/W1" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Math W1');
    expect(screen.getByText('Conamat "Matemáticas simplificadas"')).toBeInTheDocument();
    expect(screen.queryByText(/Más material en/)).toBeNull();
    // Las reglas y el refuerzo quedan plegados.
    expect(screen.getByText('Reglas y refuerzo').closest('details')!.open).toBe(false);
  });

  it('el libro: capítulos con su estado y %, el examen del libro bloqueado y el historial', () => {
    terminarEstudio(D, 'conamat', 1);
    saveTest('2026-11-19', 'conamat', 1, { score: 13, total: 15, errors: sinErrores, mode: 'papel' });
    render(<MatePlan day={day()} param="mate/libro/conamat" />);
    expect(screen.getByRole('heading', { name: 'Aritmética' })).toBeInTheDocument();
    expect(screen.getByText('1/11').parentElement!.textContent).toMatch(/capítulos aprobados/);
    expect(screen.getByText('87 %').parentElement!.textContent).toMatch(/promedio de los tests/);
    const caps = screen.getByText('Capítulos').closest('section')!;
    const filas = within(caps).getAllByRole('link');
    expect(filas).toHaveLength(11);
    expect(filas[0].textContent).toMatch(/Números reales.*1 test · mejor 87 %.*tesis el 20 nov/);
    expect(filas[1].textContent).toMatch(/Números enteros.*estudiando/);
    expect(filas[2].textContent).toMatch(/por empezar/);
    expect(screen.getByText(/Se habilita con los 11 capítulos aprobados/)).toBeInTheDocument();
    expect(screen.getByText('Historial de días').closest('summary')!.textContent).toMatch(/2 días/);
    // "Marcar dónde quedé" abre la hoja de estado.
    fireEvent.click(screen.getByRole('button', { name: 'Marcar dónde quedé' }));
    expect(estadoEstudioAbierto()).toMatchObject({ actividades: ['conamat'] });
  });

  it('el capítulo: marcar dónde quedaste, importar tarjetas de Anki a ese capítulo y repasarlas', () => {
    render(<MatePlan day={day()} param="mate/libro/conamat/1" />);
    expect(screen.getByRole('heading', { name: 'Números reales' })).toBeInTheDocument();
    expect(screen.getByText('estudiando')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lo terminé · test mañana' }));
    expect(screen.getByText('test mañana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hice el test · cargar el resultado' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Todavía no lo terminé' }));
    expect(screen.getByText('estudiando')).toBeInTheDocument();
    // Importar: un .txt de Anki (tab) y una línea con ::
    fireEvent.change(screen.getByLabelText(/Pegá un .txt de Anki/), { target: { value: '¿Qué es un número racional?\tEl cociente de dos enteros con divisor distinto de cero.\nπ es un número {{c1::irracional}}.\t\n¿Qué forman racionales e irracionales? :: Los reales' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    const cs = getState().study.cards.filter((c) => c.activityId === 'conamat' && c.unit === 1);
    expect(cs.map((c) => [c.front, c.back, c.kind])).toEqual([
      ['¿Qué es un número racional?', 'El cociente de dos enteros con divisor distinto de cero.', 'pregunta'],
      ['π es un número ___.', 'irracional', 'completar'],
      ['¿Qué forman racionales e irracionales?', 'Los reales.', 'pregunta'],
    ]);
    expect(screen.getByText('Tarjetas · 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Repasar' })).toHaveAttribute('href', '#/tarjetas/cap:conamat:1');
  });

  it('repasar las tarjetas de un capítulo: todas, venzan o no; × vuelve al capítulo', () => {
    render(<MatePlan day={day()} param="mate/libro/conamat/1" />);
    fireEvent.change(screen.getByLabelText(/Pegá un .txt de Anki/), { target: { value: 'A :: uno\nB :: dos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(parseFiltro('cap:conamat:1')).toEqual({ act: 'conamat', n: 1 });
    expect(parseFiltro('libro:conamat')).toEqual({ act: 'conamat' });
    expect(parseFiltro('math')).toBeNull();
    render(<Tarjetas day={day()} frontId="cap:conamat:1" />);
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cerrar' })).toHaveAttribute('href', '#/estudio/mate/libro/conamat/1');
  });
});

describe('ola 28 · reiniciar un libro desde cero', () => {
  it('borra lo avanzado (también lo que avanzó solo), vuelve al cap. 1 y se puede deshacer', async () => {
    const { reiniciarLibro, restaurarLibro, addCards } = await import('../state/study');
    const { estadoCapitulo } = await import('../data/estado-capitulo');
    const a = () => getState().study.activities.find((x) => x.id === 'conamat')!;
    terminarEstudio(D, 'conamat', 1);
    saveTest('2026-11-19', 'conamat', 1, { score: 14, total: 15, errors: sinErrores, mode: 'papel' });
    terminarEstudio(D, 'conamat', 2);
    addCards(D, [{ front: 'q', back: 'r', kind: 'pregunta', deck: 'Matemática', frontId: 'math', source: 'x', activityId: 'conamat', unit: 1 }]);
    const antes = structuredClone(getState().study);
    const foto = reiniciarLibro('conamat')!;
    expect(getState().study.units.conamat).toBeUndefined();
    expect(getState().study.reviews.filter((r) => r.activityId === 'conamat')).toEqual([]);
    expect(getState().days[D].studyDone ?? []).toEqual([]);
    expect(estadoCapitulo(getState().study, a(), 1, D).estado).toBe('estudiando');
    expect(estadoCapitulo(getState().study, a(), 2, D).estado).toBe('pendiente');
    // Las tarjetas quedan salvo que se pida borrarlas.
    expect(getState().study.cards).toHaveLength(antes.cards.length);
    restaurarLibro(foto);
    expect(getState().study.units.conamat).toEqual(antes.units.conamat);
    expect(getState().study.reviews).toHaveLength(antes.reviews.length);
    expect(estadoCapitulo(getState().study, a(), 1, D).estado).toBe('tesis');
    // Con tarjetas: se borran y vuelven con Deshacer.
    const f2 = reiniciarLibro('conamat', { borrarTarjetas: true })!;
    expect(getState().study.cards.filter((c) => c.activityId === 'conamat')).toEqual([]);
    restaurarLibro(f2);
    expect(getState().study.cards.filter((c) => c.activityId === 'conamat')).toHaveLength(1);
  });

  it('desde la pantalla del libro, con confirmación', () => {
    terminarEstudio(D, 'conamat', 1);
    window.confirm = () => true;
    render(<MatePlan day={day()} param="mate/libro/conamat" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar Aritmética' }));
    expect(getState().study.units.conamat).toBeUndefined();
  });
});
