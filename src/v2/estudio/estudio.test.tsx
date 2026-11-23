import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, setState, startDay } from '../../state/store';
import { addCards } from '../../state/study';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2, cubreEstudio } from '../registro';
import { Como, Flojo, Repaso, Tarjetas } from './Pantallas';
import { ComoV2 } from './Como';
import EstudioV2 from './EstudioV2';
import { useLineas } from './lineas';
import { grupoDe } from './Matematica';
import { Metro } from './Metro';

const HOY = '2026-11-23';
const estudio = () => getState().study;
const dia = () => getState().days[HOY];
const global = <GlobalV2 activa="estudio" pendientes={0} conBarra={false} conMini={false} />;
const pantalla = (hash: string) => { const ruta = leerRuta(hash); return { ruta, day: dia(), today: HOY }; };
const abrir = (hash: string) => render(<><EstudioV2 {...pantalla(hash)} />{global}</>);
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Estudio 2.0 · qué cubre', () => {
  it('el centro, Matemática y cada libro son 2.0; el resto de #/estudio sigue en 1.0', () => {
    for (const p of [undefined, 'mate', 'mate/libro/conamat']) expect(cubreEstudio(p), String(p)).toBe(true);
    for (const p of ['mate/W1', 'mate/libro/conamat/2', 'idiomas', 'idiomas/biblioteca', 'prog', 'prog/P1', 'libro/x', 'ruta/matematica']) expect(cubreEstudio(p), p).toBe(false);
  });

  it('Repasar, Puntos débiles, Tarjetas y Cómo funciona tienen su pantalla; de Puntos débiles, la raíz, el recall y el análisis', () => {
    for (const k of ['repaso', 'flojo', 'tarjetas', 'como']) expect(PANTALLAS_V2[k as 'repaso'], k).toBeTruthy();
    const cubre = PANTALLAS_V2.flojo!.cubre!;
    for (const h of ['#/flojo', '#/flojo/recall', '#/flojo/analisis']) expect(cubre(leerRuta(h)), h).toBe(true);
    for (const h of ['#/flojo/examenes', '#/flojo/simulacro', '#/flojo/conamat%3A2']) expect(cubre(leerRuta(h)), h).toBe(false);
  });
});

describe('Estudio 2.0 · el metro', () => {
  it('tres líneas con estaciones, una sola marcada como "estás acá" y lo hecho contado', () => {
    const ls = renderHook(() => useLineas(HOY)).result.current;
    expect(ls.map((l) => l.id)).toEqual(['mate', 'idiomas', 'prog']);
    expect(ls.map((l) => l.href)).toEqual(['#/estudio/mate', '#/estudio/idiomas', '#/estudio/prog']);
    for (const l of ls) {
      expect(l.estaciones.length).toBeGreaterThan(3);
      expect(l.estaciones.filter((e) => e.estado === 'actual')).toHaveLength(1);
      expect(l.hechas).toBe(l.estaciones.filter((e) => e.estado === 'hecha').length);
      expect(l.ahora.length).toBeGreaterThan(2);
    }
    expect(ls[1].estaciones).toHaveLength(6); // un idioma por año, seis años
  });

  it('una estación por tramo, con el resumen para el lector de pantalla', () => {
    const ls = renderHook(() => useLineas(HOY)).result.current;
    const { container } = render(<Metro linea={ls[0]} />);
    expect(container.querySelectorAll('.es-metro > li')).toHaveLength(ls[0].estaciones.length);
    expect(screen.getByRole('list', { name: new RegExp(`^Matemática: 0 de ${ls[0].estaciones.length} tramos hechos$`) })).toBeTruthy();
    expect(container.querySelectorAll('.es-metro > li.actual')).toHaveLength(1);
    expect(container.querySelector('.es-metro > li.actual')!.getAttribute('aria-current')).toBe('step');
  });
});

describe('Estudio 2.0 · el centro', () => {
  it('arriba lo de hoy; abajo los caminos, los pasos, la semana y el repaso', () => {
    abrir('#/estudio');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Estudio');
    expect(screen.getByRole('link', { name: /^Matemática:/ }).getAttribute('href')).toBe('#/estudio/mate');
    expect(screen.getByRole('link', { name: /^Idiomas:/ }).getAttribute('href')).toBe('#/estudio/idiomas');
    expect(screen.getByRole('link', { name: /^Programación:/ }).getAttribute('href')).toBe('#/estudio/prog');
    for (const t of ['Tus caminos', 'Esta semana', 'Repasar', 'Más']) expect(screen.getByRole('region', { name: t })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Minutos de estudio por día:/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Minutos de repaso que vienen:.*tope 20/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cómo funciona/ }).getAttribute('href')).toBe('#/como');
  });

  it('el botón de arriba entra en foco con lo primero que falta', () => {
    abrir('#/estudio');
    fireEvent.click(screen.getByRole('button', { name: /^Entrar en foco/ }));
    expect(getState().focus?.date).toBe(HOY);
    expect(getState().focus?.activityId).toBeTruthy();
    expect(location.hash).toMatch(/^#\/sesion\//);
  });

  it('los pasos de hoy se tildan desde la casilla (mismo comportamiento que la 1.0)', () => {
    abrir('#/estudio');
    const caja = screen.getByRole('region', { name: 'Lo de hoy' });
    const antes = dia().studyDone?.length ?? 0;
    const paso = within(caja).getAllByRole('checkbox')[0];
    fireEvent.click(paso);
    // Un paso "capítulo nuevo" se completa; uno de tarjetas, tesis o test navega a su pantalla.
    expect((getState().days[HOY].studyDone?.length ?? 0) > antes || location.hash.length > 1).toBe(true);
  });
});

describe('Matemática y el libro', () => {
  it('Matemática: dónde estás, tus libros y el camino por etapas como metro vertical', () => {
    const { container } = abrir('#/estudio/mate');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matemática');
    expect(screen.getByText('Hoy sos')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Tus libros' })).getByRole('link', { name: /^Aritmética/ }).getAttribute('href')).toBe('#/estudio/mate/libro/conamat');
    expect(container.querySelectorAll('.es-vertical').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll('.es-vertical > li.actual')).toHaveLength(1);
    expect(container.querySelector('.es-vertical a')!.getAttribute('href')).toMatch(/^#\/estudio\/mate\/[A-Za-z0-9]+$/);
  });

  it('el libro: pestañas, números y un cuadrado por capítulo', () => {
    const { container } = abrir('#/estudio/mate/libro/conamat');
    const unidades = estudio().activities.find((a) => a.id === 'conamat')!.units!.length;
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aritmética');
    expect(within(screen.getByRole('radiogroup', { name: 'Libro' })).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Aritmética', 'Álgebra']);
    expect(container.querySelectorAll('.es-celda:not(.es-punto)')).toHaveLength(unidades);
    expect(container.querySelectorAll('.es-celda:not(.es-punto).st-estudiando')).toHaveLength(1); // el primero, el que estás estudiando
    expect(container.querySelectorAll('.es-celda:not(.es-punto).st-pendiente')).toHaveLength(unidades - 1);
    expect(screen.getByText(`0/${unidades}`)).toBeTruthy();
  });

  it('tocar un capítulo abre su hoja con "Abrir el capítulo"', () => {
    abrir('#/estudio/mate/libro/conamat');
    fireEvent.click(screen.getByRole('button', { name: /^Cap\. 1, .*estudiando$/ }));
    const d = dialogo();
    expect(within(d).getByRole('link', { name: 'Abrir el capítulo' }).getAttribute('href')).toBe('#/estudio/mate/libro/conamat/1');
  });

  it('los estados se agrupan en cinco colores', () => {
    expect(['pendiente', 'estudiando', 'test', 'retest', 'tesis', 'repasos', 'cerrado', 'flojo'].map((e) => grupoDe(e as never))).toEqual(['pendiente', 'estudiando', 'prueba', 'prueba', 'prueba', 'cerrado', 'cerrado', 'flojo']);
  });

  it('un libro que no existe lo dice', () => {
    abrir('#/estudio/mate/libro/nada');
    expect(screen.getByText('No encontré ese libro.')).toBeTruthy();
  });
});

describe('Cómo funciona', () => {
  it('cuatro pasos, cada uno con su dibujo, y las reglas en una hoja', () => {
    const { container } = render(<ComoV2 />);
    expect(within(screen.getByRole('list', { name: 'Los cuatro pasos de cada capítulo' })).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['1Estudiar', '2Test', '3Tesis', '4Repetir']);
    expect(container.querySelectorAll('.es-ilus')).toHaveLength(4);
    fireEvent.click(within(screen.getByRole('region', { name: '2. Test' })).getByRole('button', { name: /Las reglas/ }));
    expect(within(dialogo()).getByText('Cold recall')).toBeTruthy();
    expect(within(dialogo()).getByText('Con 85 % o más')).toBeTruthy();
  });

  it('los ejemplos salen del catálogo del motor', () => {
    render(<Como />);
    fireEvent.click(screen.getByRole('button', { name: /Un capítulo, dos meses/ }));
    expect(within(dialogo()).getByText('Examen corto')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ajustar el motor/ }).getAttribute('href')).toBe('#/motor');
  });
});

describe('Repasar', () => {
  it('sin nada que vencer: anillo en cero, el pronóstico y "Hoy no hay repaso"', () => {
    render(<>{<Repaso {...pantalla('#/repaso')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Repasar');
    expect(screen.getByText('Nada hoy')).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Minutos de repaso: Hoy 0/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Puntos débiles' }).getAttribute('href')).toBe('#/flojo');
    expect(screen.getByRole('link', { name: 'Hoy', current: 'page' })).toBeTruthy();
  });

  it('con tarjetas que vencen: el grupo, los minutos y el botón para empezar', () => {
    act(() => { addCards(HOY, [{ front: 'Máximo común divisor', back: 'El mayor número que divide a todos.', kind: 'explicar', deck: 'Aritmética', frontId: 'math', source: 'prueba' }]); });
    render(<>{<Repaso {...pantalla('#/repaso')} />}{global}</>);
    const caja = screen.getByRole('region', { name: 'Tarjetas' });
    expect(within(caja).getByRole('link').getAttribute('href')).toBe('#/tarjetas/math');
    expect(screen.queryByText('Nada hoy')).toBeNull();
  });
});

describe('Puntos débiles', () => {
  it('los tres números, lo más flojo (vacío sin uso) y el refuerzo', () => {
    render(<>{<Flojo {...pantalla('#/flojo')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Puntos débiles');
    expect(screen.getByText('Temas flojos')).toBeTruthy();
    expect(screen.getByText('Sin temas flojos todavía')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Estudiar' }).getAttribute('href')).toBe('#/estudio'); // el vacío siempre trae una acción
    expect(screen.getByRole('link', { name: 'Todo', current: 'page' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Exámenes' }).getAttribute('href')).toBe('#/flojo/examenes');
  });

  it('"Priorizar lo flojo" se prende y se apaga y guarda la regla', () => {
    render(<>{<Flojo {...pantalla('#/flojo')} />}{global}</>);
    const sw = screen.getByRole('switch', { name: /Priorizar lo flojo/ });
    const antes = estudio().rules.priorizarFlojo;
    fireEvent.click(sw);
    expect(getState().study.rules.priorizarFlojo).toBe(!antes);
  });

  it('el análisis sin datos invita a estudiar, en vez de cuatro gráficos vacíos', async () => {
    render(<>{<Flojo {...pantalla('#/flojo/analisis')} />}{global}</>);
    expect(await screen.findByRole('heading', { level: 1, name: /Análisis/ })).toBeTruthy();
    expect(screen.getByText('Todavía no hay nada que analizar')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir a Estudio' }).getAttribute('href')).toBe('#/estudio');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('el análisis con datos: el mapa por capítulo (la banda es una forma, no solo color), los errores, el recall y la calibración', async () => {
    act(() => setState((s) => {
      const a = s.study.activities.find((x) => x.id === 'conamat')!;
      const frente = a.front;
      const test = (score: number, errors: Record<'descuido' | 'tecnica' | 'concepto' | 'enunciado', number>) => ({ date: '2026-11-20', score, total: 10, errors, mode: 'app' as const, approved: score >= 8 });
      return { ...s, study: { ...s.study,
        units: { ...s.study.units, conamat: { 1: { learnedOn: '2026-11-18', approvedOn: '2026-11-20', tests: [test(9, { descuido: 1, tecnica: 0, concepto: 0, enunciado: 0 })] }, 2: { learnedOn: '2026-11-19', tests: [test(5, { descuido: 1, tecnica: 2, concepto: 1, enunciado: 1 })] } } },
        attempts: [
          { tema: 'conamat:1', frontId: frente, kind: 'cold' as const, date: '2026-11-19', ok: 0.9, creia: 0.9 },
          { tema: 'conamat:2', frontId: frente, kind: 'cold' as const, date: '2026-11-20', ok: 0.5, creia: 0.8 },
          { tema: 'conamat:2', frontId: frente, kind: 'cold' as const, date: '2026-11-10', ok: 0.7, creia: 0.7 },
          { tema: 'conamat:1', frontId: frente, kind: 'ejercicio' as const, date: '2026-11-22', ok: 0.8, de: [4, 5] as [number, number] },
        ],
      } };
    }));
    render(<>{<Flojo {...pantalla('#/flojo/analisis')} />}{global}</>);
    const mapa = within(await screen.findByRole('table', { name: 'Fortaleza por capítulo' }));
    const filas = mapa.getAllByRole('row');
    expect(filas).toHaveLength(3); // el encabezado y dos capítulos
    expect(within(filas[1]).getByRole('link', { name: /^01 /}).getAttribute('href')).toBe('#/flojo/conamat%3A1');
    expect(within(filas[1]).getByRole('cell', { name: 'cold recall: 90 %, fuerte' })).toHaveClass('es-mc-bien');
    expect(within(filas[1]).getByRole('cell', { name: 'ejercicio del día 8: 4/5' })).toBeTruthy();
    expect(within(filas[2]).getByRole('cell', { name: /^cold recall: (50|60) %, flojo$/ })).toHaveClass('es-mc-mal');
    expect(within(filas[2]).getByRole('cell', { name: 'test: 50 %, flojo' })).toBeTruthy();
    expect(within(filas[2]).getByRole('cell', { name: 'ejercicio del día 8: sin datos' })).toBeTruthy();

    const fallas = within(screen.getByRole('region', { name: 'Cómo fallás' }));
    expect(fallas.getByText('6 errores en 2 tests')).toBeTruthy();
    expect(fallas.getByRole('progressbar', { name: 'Técnica: 2 de 6 errores' })).toBeTruthy();
    expect(fallas.getAllByRole('listitem')).toHaveLength(4);

    expect(within(screen.getByRole('region', { name: 'Recall por semana' })).getByRole('img', { name: /^Cold recall por semana, de 0 a 100: .* Tope: 85 %\.$/ })).toBeTruthy();

    const cal = within(screen.getByRole('region', { name: 'Calibración' }));
    expect(cal.getByRole('progressbar', { name: /: creías 80 %$/ })).toBeTruthy();
    expect(cal.getByRole('progressbar', { name: /: recordaste 70 %$/ })).toBeTruthy();
    expect(cal.getByText(/creés 10 puntos más de lo que recordás/)).toBeTruthy();
  });
});

describe('Tarjetas que giran', () => {
  const cargar = (n = 2) => act(() => { addCards(HOY, Array.from({ length: n }, (_, i) => ({ front: `Pregunta ${i + 1}`, back: `La respuesta ${i + 1} es larga y clara.`, kind: 'explicar' as const, deck: 'Aritmética', frontId: 'math', source: 'prueba' }))); });

  it('sin tarjetas hoy: lo dice y ofrece volver o crear una', () => {
    render(<>{<Tarjetas {...pantalla('#/tarjetas')} />}{global}</>);
    expect(screen.getByText('No hay tarjetas para hoy')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver al repaso' }).getAttribute('href')).toBe('#/repaso');
    expect(screen.getByRole('link', { name: /Nueva tarjeta/ }).getAttribute('href')).toBe('#/tarjeta-nueva');
  });

  it('la tarjeta tiene dos caras: respondés, das vuelta y calificás; la cola avanza y se reprograma', () => {
    cargar(2);
    const { container } = render(<>{<Tarjetas {...pantalla('#/tarjetas')} />}{global}</>);
    expect(container.querySelectorAll('.es-cara')).toHaveLength(2);
    const frente = container.querySelector('.es-cara.frente')!;
    expect(frente.querySelector('.es-pregunta')!.textContent).toBe('Pregunta 1');
    expect(container.querySelector('.es-escena')!.classList.contains('vuelta')).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: /Tu respuesta/ }), { target: { value: 'la respuesta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dar vuelta' }));
    expect(container.querySelector('.es-escena')!.classList.contains('vuelta')).toBe(true);
    expect(container.querySelector('.es-cara.dorso')!.textContent).toContain('respuesta');
    const botones = screen.getAllByRole('button').filter((b) => /^(Otra vez|Difícil|Bien|Fácil)/.test(b.textContent ?? ''));
    expect(botones.map((b) => b.querySelector('b')!.textContent)).toEqual(['Otra vez', 'Difícil', 'Bien', 'Fácil']);
    fireEvent.click(screen.getByRole('button', { name: /^Bien/ }));
    expect(estudio().cards.find((c) => c.front === 'Pregunta 1')!.srs?.reps).toBe(1);
    expect(container.querySelector('.es-cara.frente .es-pregunta')!.textContent).toBe('Pregunta 2');
    expect(container.querySelector('.es-escena')!.classList.contains('vuelta')).toBe(false);
  });

  it('"Otra vez" manda la tarjeta al final; al terminar todas, aparece el cierre', async () => {
    cargar(2);
    const { container } = render(<>{<Tarjetas {...pantalla('#/tarjetas')} />}{global}</>);
    const dar = () => { fireEvent.click(screen.getByRole('button', { name: 'Dar vuelta' })); };
    dar(); fireEvent.click(screen.getByRole('button', { name: /^Otra vez/ }));
    expect(container.querySelector('.es-cara.frente .es-pregunta')!.textContent).toBe('Pregunta 2');
    dar(); fireEvent.click(screen.getByRole('button', { name: /^Bien/ }));
    expect(container.querySelector('.es-cara.frente .es-pregunta')!.textContent).toBe('Pregunta 1'); // volvió
    dar(); fireEvent.click(screen.getByRole('button', { name: /^Fácil/ }));
    await waitFor(() => expect(screen.getByText('Tarjetas de hoy, listas')).toBeTruthy());
    expect(screen.getByText('Repasaste 2 tarjetas. El motor ya las reprogramó.')).toBeTruthy();
  });

  it('cada botón dice cuándo vuelve la tarjeta; el modo se recuerda', () => {
    cargar(1);
    render(<>{<Tarjetas {...pantalla('#/tarjetas')} />}{global}</>);
    fireEvent.click(screen.getByRole('radio', { name: 'Pensar' }));
    expect(localStorage.getItem('trazo.modoTarjetas')).toBe('pensar');
    expect(screen.queryByRole('textbox', { name: /Tu respuesta/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dar vuelta' }));
    expect(screen.getByRole('button', { name: /^Otra vez/ }).textContent).toMatch(/10 min/);
  });

  it('se puede editar el dorso y queda guardado', () => {
    cargar(1);
    render(<>{<Tarjetas {...pantalla('#/tarjetas')} />}{global}</>);
    fireEvent.click(screen.getByRole('button', { name: 'Dar vuelta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Editar la respuesta' }), { target: { value: 'Otra respuesta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(estudio().cards.find((c) => c.front === 'Pregunta 1')!.back).toBe('Otra respuesta');
  });
});
