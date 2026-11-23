import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2 } from '../registro';
import { entradaDe } from '../Resolutor';
import AlgoritmosV2 from './AlgoritmosV2';
import DemandaV2 from './DemandaV2';
import { ENTRADAS } from './entradas';
import IdiomasV2 from './IdiomasV2';
import LibroV2 from './LibroV2';
import ProgV2 from './ProgV2';

const HOY = '2026-11-23';
const dia = () => getState().days[HOY];
const global = <GlobalV2 activa="estudio" pendientes={0} conBarra={false} conMini={false} />;
const props = (hash: string) => ({ ruta: leerRuta(hash), day: dia(), today: HOY });
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const mias = { estudio: ENTRADAS.map((e) => e.entrada) };
/** Qué entrada mía cubre esta ruta (la principal de Estudio no cubre ninguna de estas). */
const cubierta = (hash: string) => { const e = entradaDe(leerRuta(hash), PANTALLAS_V2, mias); return e && mias.estudio.includes(e) ? e.nombre : undefined; };

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Programa 2.0 · qué cubre', () => {
  it('idiomas, programación y los libros son 2.0; lo demás de #/estudio sigue como estaba', () => {
    expect(cubierta('#/estudio/idiomas')).toBe('Idiomas');
    expect(cubierta('#/estudio/idiomas/ingles')).toBe('Idiomas');
    expect(cubierta('#/estudio/idiomas/biblioteca')).toBe('Idiomas');
    expect(cubierta('#/estudio/idiomas/ascenso')).toBe('Idiomas');
    expect(cubierta('#/estudio/prog')).toBe('Programación');
    expect(cubierta('#/estudio/prog/P1')).toBe('Programación');
    expect(cubierta('#/estudio/prog/P1/stack')).toBe('Programación');
    expect(cubierta('#/estudio/prog/demanda')).toBe('Demanda');
    expect(cubierta('#/estudio/prog/algoritmos')).toBe('Algoritmos');
    expect(cubierta('#/estudio/libro/mwm')).toBe('Libro');
    for (const h of ['#/estudio', '#/estudio/mate', '#/estudio/mate/W1', '#/estudio/ruta/matematica', '#/estudio/idioma', '#/estudio/programacion', '#/estudio/libros', '#/metas/prog']) expect(cubierta(h), h).toBeUndefined();
  });

  it('cada entrada cubre solo lo suyo: las tres de prog no se pisan con la de Idiomas ni la del Libro', () => {
    for (const h of ['#/estudio/prog', '#/estudio/prog/P3/pieza']) expect(cubierta(h)).toBe('Programación');
    expect(ENTRADAS.every((e) => e.pantalla === 'estudio')).toBe(true);
  });
});

describe('Idiomas 2.0', () => {
  it('el roadmap: dónde estás, los seis años como una línea y las horas por semana', () => {
    render(<>{<IdiomasV2 {...props('#/estudio/idiomas')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Idiomas y libros');
    expect(screen.getByText('Hoy sos')).toBeTruthy();
    expect(screen.getByText('Vas a ser')).toBeTruthy();
    const hrefs = [...document.querySelectorAll('.es-vertical a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['ingles', 'frances', 'italiano', 'aleman', 'japones', 'chino'].map((i) => `#/estudio/idiomas/${i}`));
    expect(document.querySelectorAll('.es-vertical > li.actual')).toHaveLength(1);
    expect(screen.getByText('Del roadmap').closest('.s-dato')).toHaveTextContent('11,5');
    expect(screen.getByRole('link', { name: /Biblioteca de libros/ }).getAttribute('href')).toBe('#/estudio/idiomas/biblioteca');
    expect(screen.getByRole('link', { name: /Ascenso a C1/ }).getAttribute('href')).toBe('#/estudio/idiomas/ascenso');
  });

  it('las reglas y las alertas siguen a un toque, en su hoja', () => {
    render(<>{<IdiomasV2 {...props('#/estudio/idiomas')} />}{global}</>);
    fireEvent.click(screen.getByRole('button', { name: /^Reglas/ }));
    expect(within(dialogo()).getAllByRole('listitem').length).toBeGreaterThan(3);
    fireEvent.click(screen.getByRole('button', { name: /^Alertas y sin verificar/ }));
    expect(within(dialogo()).getByText(/Sin verificar:/)).toBeTruthy();
  });

  it('un año: las fases en hojas; el enlace del curso queda en el teléfono y uno inválido se rechaza', () => {
    render(<>{<IdiomasV2 {...props('#/estudio/idiomas/ingles')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inglés');
    expect(screen.getByText('Cambridge C1 Advanced')).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);
    fireEvent.click(screen.getByRole('button', { name: /^Pronunciación/ }));
    const d = dialogo();
    expect(within(d).getByText(/^Hito:/)).toBeTruthy();
    fireEvent.change(within(d).getByRole('textbox', { name: 'Enlace del curso de Udemy' }), { target: { value: 'no-es-un-enlace' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar el enlace' }));
    expect(getState().idiomas.enlaces).toEqual({});
    expect(within(d).getByText(/tiene que empezar con https/)).toBeTruthy();
    fireEvent.change(within(d).getByRole('textbox', { name: 'Enlace del curso de Udemy' }), { target: { value: 'https://ejemplo.com/curso' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar el enlace' }));
    expect(getState().idiomas.enlaces).toEqual({ 'udemy-ingles': 'https://ejemplo.com/curso' });
    expect(within(dialogo()).getByRole('link', { name: /Abrir el curso de Udemy/ }).getAttribute('href')).toBe('https://ejemplo.com/curso');
  });

  it('un año tiene su examen, sus trimestres en una hoja y el paso al año de al lado', () => {
    render(<>{<IdiomasV2 {...props('#/estudio/idiomas/frances')} />}{global}</>);
    expect(screen.getByText('DELF B1')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Inglés' }).getAttribute('href')).toBe('#/estudio/idiomas/ingles');
    expect(screen.getByRole('link', { name: 'Italiano' }).getAttribute('href')).toBe('#/estudio/idiomas/italiano');
    fireEvent.click(screen.getByRole('button', { name: /^Trimestres, tesis y examen/ }));
    expect(within(dialogo()).getAllByRole('listitem').length).toBeGreaterThan(2);
  });

  it('la biblioteca: terminados, los dos libros de cada año y los bloques en hojas', () => {
    render(<>{<IdiomasV2 {...props('#/estudio/idiomas/biblioteca')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Libros');
    expect(screen.getByText('Terminados').closest('.s-dato')).toHaveTextContent('0/42');
    expect(screen.getByRole('link', { name: /Libro inicial/ }).getAttribute('href')).toBe('#/estudio/libro/mwm');
    fireEvent.click(screen.getByRole('button', { name: /^Año 1 · Inglés/ }));
    expect(within(dialogo()).getByText('Make It Stick')).toBeTruthy();
    expect(within(dialogo()).getAllByText(/sin capítulos/).length).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: /^Bloque 1/ }));
    expect(within(dialogo()).getAllByText(/sin capítulos/).length).toBeGreaterThanOrEqual(5);
  });

  it('el ascenso a C1: los hitos son estaciones y cada una abre su certificación', () => {
    render(<>{<IdiomasV2 {...props('#/estudio/idiomas/ascenso')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ascenso a C1');
    fireEvent.click(screen.getByRole('button', { name: /^Chino avanzado/ }));
    expect(within(dialogo()).getByText('feb 2045 (aprox.)')).toBeTruthy();
    expect(within(dialogo()).getByText(/HSK 6/)).toBeTruthy();
  });
});

describe('Libro 2.0', () => {
  const abrir = () => render(<>{<LibroV2 {...props('#/estudio/libro/mwm')} />}{global}</>);

  it('dónde estás, las unidades por parte como mapa de calor y el cierre de tres pasos', () => {
    abrir();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Measure What Matters');
    expect(screen.getByText('Unidad 1 de 11 · caps. 1 y 2')).toBeTruthy();
    expect(screen.getByText(/Parte 1 · OKRs in Action/i)).toBeTruthy();
    expect(screen.getByText(/Parte 2 · The New World of Work/i)).toBeTruthy();
    expect(document.querySelectorAll('.es-celda[aria-label^="Unidad"]')).toHaveLength(11);
    expect(document.querySelectorAll('.es-celdas .es-celda.st-estudiando')).toHaveLength(1);
    const cierre = screen.getByRole('region', { name: 'Cierre del libro' });
    expect(within(cierre).getByText('Test final')).toBeTruthy();
    expect(within(cierre).getByText('Tesis final')).toBeTruthy();
    expect(within(cierre).getByText('Artefacto')).toBeTruthy();
    expect(within(cierre).queryByRole('link', { name: /Test final/ })).toBeNull();
  });

  it('las micro-tesis de la unidad: una frase por capítulo, guardada como en la 1.0', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Escribir micro-tesis' }));
    const d = dialogo();
    const guardar = within(d).getByRole('button', { name: 'Guardar micro-tesis' });
    expect(guardar.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(within(d).getByRole('textbox', { name: /^Cap\. 1/ }), { target: { value: 'OKR: qué y cómo medirlo.' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar micro-tesis' }));
    expect(getState().study.microtesis!['libro-mwm:1'].texto).toBe('OKR: qué y cómo medirlo.');
    expect(getState().study.cards.some((c) => c.activityId === 'libro-mwm')).toBe(true);
    expect(within(dialogo()).getByText('1/2')).toBeTruthy();
    expect(within(dialogo()).getByRole('link', { name: 'Mini-test de la unidad' }).getAttribute('href')).toBe('#/test/libro-mwm/1');
  });

  it('una unidad del mapa abre su hoja (tocar el cuadrado)', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^Unidad 3, caps\. 5 y 6/ }));
    expect(within(dialogo()).getByRole('heading', { name: 'Unidad 3' })).toBeTruthy();
  });

  it('el artefacto: se carga, se cuenta como hecho y se puede sacar con deshacer', () => {
    abrir();
    const cierre = screen.getByRole('region', { name: 'Cierre del libro' });
    expect(within(cierre).getByText('0/3')).toBeTruthy();
    fireEvent.click(within(cierre).getByRole('button', { name: /^Artefacto/ }));
    let d = dialogo();
    expect(within(d).getByRole('button', { name: 'Guardar artefacto' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(within(d).getByRole('radio', { name: 'Análisis' }));
    fireEvent.change(within(d).getByRole('textbox', { name: 'Qué armaste' }), { target: { value: 'Mis OKR del trimestre' } });
    fireEvent.change(within(d).getByRole('textbox', { name: /^Link/ }), { target: { value: 'https://ejemplo.com/okr' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar artefacto' }));
    expect(getState().study.finales!['libro-mwm'].artefacto).toMatchObject({ tipo: 'analisis', titulo: 'Mis OKR del trimestre', link: 'https://ejemplo.com/okr' });
    expect(within(screen.getByRole('region', { name: 'Cierre del libro' })).getByText('1/3')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('region', { name: 'Cierre del libro' })).getByRole('button', { name: /^Artefacto/ }));
    d = dialogo();
    fireEvent.click(within(d).getByRole('button', { name: 'Sacar el artefacto' }));
    expect(getState().study.finales!['libro-mwm'].artefacto).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().study.finales!['libro-mwm'].artefacto).toMatchObject({ tipo: 'analisis', titulo: 'Mis OKR del trimestre' });
  });

  it('un libro cargado pero archivado ofrece empezarlo (con deshacer)', () => {
    act(() => { const s = getState(); s.study.activities = s.study.activities.map((a) => (a.id === 'libro-mwm' ? { ...a, archivada: true } : a)); });
    abrir();
    expect(screen.queryByRole('button', { name: 'Escribir micro-tesis' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar este libro' }));
    expect(getState().study.activities.find((a) => a.id === 'libro-mwm')!.archivada).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().study.activities.find((a) => a.id === 'libro-mwm')!.archivada).toBe(true);
  });

  it('un libro que no existe dice qué hacer', () => {
    render(<>{<LibroV2 {...props('#/estudio/libro/no-existe')} />}{global}</>);
    expect(screen.getByText('No encontré ese libro')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver la biblioteca' }).getAttribute('href')).toBe('#/estudio/idiomas/biblioteca');
  });

  it('las metas del libro son las de siempre (bloque libro:<id>)', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^Agregar la primera meta/ }));
    fireEvent.change(within(dialogo()).getByRole('textbox'), { target: { value: 'Leer con lápiz' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar y cerrar' }));
    expect(getState().plan.metasBloque!['libro:mwm'].map((m) => m.texto)).toEqual(['Leer con lápiz']);
  });
});

describe('Programación 2.0', () => {
  it('el centro: hoy sos → vas a ser, estás acá, la fase de ahora y la escalera por fases', () => {
    render(<>{<ProgV2 {...props('#/estudio/prog')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Programación');
    expect(screen.getByText('Recién empezás')).toBeTruthy();
    expect(screen.getByText('Estás acá')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Demanda/ }).getAttribute('href')).toBe('#/estudio/prog/demanda');
    expect(screen.getByRole('link', { name: /Algoritmos/ }).getAttribute('href')).toBe('#/estudio/prog/algoritmos');
    // La escalera: "antes del plan" más las once fases, cada una en su hoja con sus bloques como enlaces.
    const filas = screen.getAllByRole('button', { name: /^(Antes del plan|Fase \d+)/ });
    expect(filas).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /^Fase 11/ }));
    const ids = within(dialogo()).getAllByRole('link').map((a) => a.getAttribute('href')!.split('/').pop());
    expect(ids).toContain('A7');
    expect(ids.some((x) => x?.startsWith('DES'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^Antes del plan/ }));
    expect(within(dialogo()).getAllByRole('link').map((a) => a.getAttribute('href')!.split('/').pop())[0]).toBe('P0');
  });

  it('un bloque: el resumen y las secciones como filas; una ventana lleva a su pieza', () => {
    const { unmount } = render(<>{<ProgV2 {...props('#/estudio/prog/P3')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AgrIA');
    const sec = screen.getByRole('region', { name: 'Secciones' });
    expect(within(sec).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['stack', 'metas', 'evidencia', 'pieza', 'entrega'].map((k) => `#/estudio/prog/P3/${k}`).concat('#/metas/proyecto/P3'));
    expect(within(sec).getByRole('link', { name: /^Evidencia/ })).toHaveTextContent('0/3');
    expect(within(sec).getByRole('link', { name: /^Entrega/ })).toHaveTextContent('0/12');
    expect(screen.getByRole('link', { name: /Antes va la ventana W1/ }).getAttribute('href')).toBe('#/estudio/prog/W1');
    expect(screen.getByRole('link', { name: /Revisiones, tiempo y examen/ }).getAttribute('href')).toBe('#/metas/proyecto/P3');
    unmount();
    render(<>{<ProgV2 {...props('#/estudio/prog/W1')} />}{global}</>);
    const sec2 = screen.getByRole('region', { name: 'Secciones' });
    expect(within(sec2).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/estudio/prog/W1/metas', '#/estudio/prog/W1/pieza', '#/metas/proyecto/W1']);
  });

  it('un bloque que no existe vuelve al centro', () => {
    render(<>{<ProgV2 {...props('#/estudio/prog/XYZ')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Programación');
  });

  it('pieza matemática: el nivel de salida de la ventana se tilda y se guarda como siempre', () => {
    render(<>{<ProgV2 {...props('#/estudio/prog/P3/pieza')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pieza matemática');
    const salida = screen.getByRole('region', { name: /Sale de W1/ });
    fireEvent.click(within(salida).getAllByRole('checkbox')[0]);
    expect(getState().plan.salida?.W1).toEqual([0]);
    expect(screen.getByRole('link', { name: /Refuerzo de W1/ }).getAttribute('href')).toBe('#/estudio/mate/W1');
  });

  it('evidencia: las tres pruebas se tildan y la referencia queda en su hoja', () => {
    render(<>{<ProgV2 {...props('#/estudio/prog/P3/evidencia')} />}{global}</>);
    const puerta = screen.getByRole('region', { name: 'Puerta de evidencia' });
    expect(within(puerta).getAllByRole('checkbox')).toHaveLength(3);
    fireEvent.click(within(puerta).getAllByRole('checkbox')[1]);
    expect(getState().plan.proyectos.P3.evidencia).toMatchObject({ validador: true });
    expect(within(puerta).getByText('1/3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Referencia y validador/ }));
    expect(within(dialogo()).getByText('Quién lo valida')).toBeTruthy();
  });

  it('entrega: el estándar de alto valor se tilda; lo que pide cada capa va en una hoja', () => {
    render(<>{<ProgV2 {...props('#/estudio/prog/P1/entrega')} />}{global}</>);
    const est = screen.getByRole('region', { name: 'Estándar de alto valor' });
    expect(within(est).getAllByRole('checkbox')).toHaveLength(12);
    fireEvent.click(within(est).getByRole('checkbox', { name: 'En producción' }));
    expect(getState().plan.proyectos.P1.estandar.produccion).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Qué pide cada una/ }));
    expect(within(dialogo()).getByText(/con demo pública/)).toBeTruthy();
  });

  it('stack: las tecnologías con su marca; un bloque sin tecnología nueva lo dice y vuelve', () => {
    const { unmount } = render(<>{<ProgV2 {...props('#/estudio/prog/P1/stack')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Stack');
    expect(screen.getByText('LightGBM †')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Entornos/ }));
    expect([...dialogo().querySelectorAll('dt')].map((x) => x.textContent)).toEqual(['Frontend', 'Backend', 'IA por API', 'ML propio', 'DB', 'Infra', 'Cloud']);
    unmount();
    render(<>{<ProgV2 {...props('#/estudio/prog/A6/stack')} />}{global}</>);
    expect(screen.getByText('Este bloque no suma tecnología nueva.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver a A6' }).getAttribute('href')).toBe('#/estudio/prog/A6');
  });

  it('metas: las del bloque, con la pista de P0 cuando está vacío', () => {
    render(<>{<ProgV2 {...props('#/estudio/prog/P0/metas')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Metas');
    expect(screen.getByText(/En P0 se arman las metas/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Agregar la primera meta/ }));
    fireEvent.change(within(dialogo()).getByRole('textbox'), { target: { value: 'Trazo publicado' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar y cerrar' }));
    expect(getState().plan.metasBloque!.P0.map((m) => m.texto)).toEqual(['Trazo publicado']);
  });
});

describe('Demanda 2.0', () => {
  const abrir = () => render(<>{<DemandaV2 {...props('#/estudio/prog/demanda')} />}{global}</>);
  const campo = () => screen.getByRole('textbox', { name: 'Cargar vacantes' });

  it('arranca vacía: el botón dice por qué no, y cargar arma la tabla con proyecto y fecha; se deshace', () => {
    abrir();
    expect(screen.getByText('Sin vacantes cargadas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cargar vacantes' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Pegá una vacante primero')).toBeTruthy();
    fireEvent.change(campo(), { target: { value: 'AI Engineer · X\nStack: Python, LangGraph, Elixir\n---\nBackend\nLangGraph y Docker' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar vacantes' }));
    expect(getState().plan.vacantes).toHaveLength(2);
    const lang = screen.getByRole('link', { name: /^LangGraph/ });
    expect(lang.textContent).toMatch(/P1/);
    expect(lang.textContent).toMatch(/2 vacantes/);
    expect(lang.getAttribute('href')).toBe('#/estudio/prog/P1/stack');
    expect(screen.getByText('Elixir').closest('.s-fila')).toHaveTextContent('Sin proyecto en el plan');
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().plan.vacantes ?? []).toHaveLength(0);
  });

  it('un JSON con error lo dice y no carga nada; uno válido carga', () => {
    abrir();
    fireEvent.change(campo(), { target: { value: '[{"rol":"A","stack":"Python"}]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar vacantes' }));
    expect(screen.getByRole('alert').textContent).toMatch(/vacante 1: "stack" tiene que ser una lista/);
    expect(getState().plan.vacantes ?? []).toHaveLength(0);
    fireEvent.change(campo(), { target: { value: '{"tipo":"vacantes","lista":[{"rol":"ML","stack":["k8s"]}]}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar vacantes' }));
    expect(getState().plan.vacantes![0]).toMatchObject({ rol: 'ML', stack: ['Kubernetes'] });
  });

  it('las vacantes cargadas se borran con deshacer; el backlog y lo descartado están en sus hojas', () => {
    abrir();
    fireEvent.change(campo(), { target: { value: 'Backend · Y\nStack: Docker' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar vacantes' }));
    fireEvent.click(screen.getByRole('button', { name: /^Vacantes cargadas/ }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: /^Borrar la vacante Backend/ }));
    expect(getState().plan.vacantes ?? []).toHaveLength(0);
    const deshacer = screen.getAllByRole('button', { name: 'Deshacer' });
    fireEvent.click(deshacer[deshacer.length - 1]);
    expect(getState().plan.vacantes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Descartado por ahora/ }));
    for (const n of ['Django', 'Supabase', 'CRM/ERP', 'APIs de bolsa']) expect(within(dialogo()).getByText(n)).toBeTruthy();
  });

  it('los formatos aceptados están a un toque', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ver los formatos' }));
    expect(within(dialogo()).getByText(/Stack: a, b, c/)).toBeTruthy();
  });
});

describe('Algoritmos 2.0', () => {
  const abrir = () => render(<>{<AlgoritmosV2 {...props('#/estudio/prog/algoritmos')} />}{global}</>);

  it('el sprint sin IA: arrancar, contar problemas y terminar (con confirmación)', async () => {
    abrir();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Algoritmos');
    fireEvent.click(screen.getByRole('button', { name: 'Arrancar hoy' }));
    expect(screen.getByText('Día 1 de 14')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 1' }));
    expect(getState().plan.problemasSinIA).toEqual({ [HOY]: 2 });
    expect(screen.getByText('2').closest('.s-dato')).toHaveTextContent('de ≈ 100');
    fireEvent.click(screen.getByRole('button', { name: 'Restar 1' }));
    expect(getState().plan.problemasSinIA).toEqual({ [HOY]: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Terminar el sprint' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Terminar' }));
    await screen.findByRole('button', { name: 'Arrancar hoy' });
    expect(getState().plan.sprintsSinIA ?? []).toHaveLength(0);
  });

  it('plantar un spot con su pregunta, validarlo y deshacer el registro', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^LRU/ }));
    const d = dialogo();
    fireEvent.change(within(d).getByRole('textbox', { name: 'Pregunta de entrevista que responde' }), { target: { value: '¿LRU en O(1)?' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Lo planté hoy' }));
    expect(getState().plan.algoritmos!.lru).toEqual({ fecha: HOY, proyecto: 'P1', pregunta: '¿LRU en O(1)?' });
    fireEvent.click(within(dialogo()).getByRole('checkbox'));
    expect(getState().plan.algoritmos!.lru.validado).toBe(true);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Deshacer el registro' }));
    expect(getState().plan.algoritmos!.lru).toBeUndefined();
    const deshacer = screen.getAllByRole('button', { name: 'Deshacer' });
    fireEvent.click(deshacer[deshacer.length - 1]);
    expect(getState().plan.algoritmos!.lru).toMatchObject({ pregunta: '¿LRU en O(1)?', validado: true });
  });

  it('sumar un tema propio (con deshacer) y borrarlo pide confirmación', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^Agregar un tema/ }));
    const d = dialogo();
    expect(within(d).getByRole('button', { name: 'Agregar tema' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(within(d).getByRole('textbox', { name: 'Tema nuevo' }), { target: { value: 'Trie' } });
    fireEvent.change(within(d).getByRole('textbox', { name: 'Proyecto del tema nuevo' }), { target: { value: 'p8' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Agregar tema' }));
    expect(getState().plan.temasPropios![0]).toMatchObject({ tema: 'Trie', proyectos: ['P8'], modo: 'sin-ia' });
    fireEvent.click(await screen.findByRole('button', { name: /^Trie/ }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar el tema' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    await screen.findByText('Tema agregado');
    expect(getState().plan.temasPropios ?? []).toHaveLength(0);
  });
});
