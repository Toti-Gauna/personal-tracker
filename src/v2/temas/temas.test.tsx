import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, setState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2, type EntradaV2 } from '../registro';
import { entradaDe } from '../Resolutor';
import type { ExtrasV2 } from '../extras';
import { fuerzasDe, tramosDeTema } from './datos';
import { ENTRADAS } from './entradas';
import CapituloV2 from './CapituloV2';
import ExamenesV2 from './ExamenesV2';
import MateExtraV2 from './MateExtraV2';
import RutaV2 from './RutaV2';
import SimulacroV2 from './SimulacroV2';
import TemaV2 from './TemaV2';
import TramoV2 from './TramoV2';

const HOY = '2026-11-23';
const estudio = () => getState().study;
const dia = () => getState().days[HOY];
const global = <GlobalV2 activa="estudio" pantalla="estudio" pendientes={0} conBarra={false} conCheckins={false} />;
const props = (hash: string) => ({ ruta: leerRuta(hash), day: dia(), today: HOY });
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const err = (concepto: number, tecnica: number, descuido: number, enunciado: number) => ({ concepto, tecnica, descuido, enunciado });

/** Un par de capítulos de CONAMAT con tests, cold recalls y tarjetas: lo justo para que haya temas flojos. */
function sembrar() {
  act(() => {
    setState((s) => ({
      ...s,
      study: {
        ...s.study,
        units: {
          ...s.study.units,
          conamat: {
            1: { learnedOn: '2026-11-02', approvedOn: '2026-11-04', tests: [{ date: '2026-11-04', score: 38, total: 40, errors: err(0, 1, 1, 0), mode: 'papel', approved: true }] },
            2: { learnedOn: '2026-11-05', tests: [{ date: '2026-11-07', score: 29, total: 40, errors: err(4, 3, 2, 2), mode: 'papel', approved: false, wrong: [{ q: 'Resolvé -3 + 5 · (-2)', a: '-13', type: 'concepto', tema: 'Regla de signos' }, { q: '|3-8|', a: '5', type: 'descuido', tema: 'Valor absoluto' }] }] },
          },
        },
        attempts: [
          { tema: 'conamat:2', frontId: 'math', kind: 'cold', date: '2026-11-06', ok: 0.5, creia: 0.8, ideas: [{ idea: 'Regla de signos', ok: true }, { idea: 'Valor absoluto', ok: false }] },
          { tema: 'conamat:2', frontId: 'math', kind: 'ejercicio', date: '2026-11-20', ok: 0.8, de: [4, 5] },
        ],
        reviews: [{ id: 'rv1', activityId: 'conamat', unit: 2, kind: 'retest', due: '2026-11-24', min: 15, label: 'Re-test · cap. 2' }],
      },
    }));
  });
}

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); vi.restoreAllMocks(); });

describe('Temas 2.0 · qué cubre', () => {
  const extras: ExtrasV2 = {};
  for (const { pantalla, entrada } of ENTRADAS) (extras[pantalla] ??= []).push(entrada);
  const quien = (hash: string): EntradaV2 | undefined => entradaDe(leerRuta(hash), PANTALLAS_V2, extras);

  it('los roadmaps de estudio, sus fases, los tramos y los capítulos son de esta familia', () => {
    for (const h of ['#/estudio/ruta', '#/estudio/ruta/matematica', '#/estudio/ruta/matematica/M2']) expect(quien(h)?.nombre, h).toBe('Roadmaps de estudio');
    for (const h of ['#/estudio/mate/W1', '#/estudio/mate/libro/conamat/2']) expect(quien(h)?.nombre, h).toBe('Tramos y capítulos de Matemática');
  });

  it('el centro de Matemática y cada libro los sigue trayendo la entrada principal de Estudio', () => {
    for (const h of ['#/estudio/mate', '#/estudio/mate/libro/conamat']) expect(quien(h), h).toBe(PANTALLAS_V2.estudio);
    for (const h of ['#/estudio/idiomas', '#/estudio/prog/P1', '#/estudio/libro/x']) expect(quien(h), h).toBeUndefined();
  });

  it('en Puntos débiles: el centro, el recall y el análisis son de la entrada principal; exámenes, simulacro y cada tema, de esta', () => {
    for (const h of ['#/flojo', '#/flojo/recall', '#/flojo/analisis']) expect(quien(h), h).toBe(PANTALLAS_V2.flojo);
    expect(quien('#/flojo/examenes')?.nombre).toBe('Exámenes');
    expect(quien('#/flojo/simulacro')?.nombre).toBe('Simulacro');
    for (const h of ['#/flojo/conamat%3A2', '#/flojo/mazo%3Amath', '#/flojo/lo-que-sea']) expect(quien(h)?.nombre, h).toBe('Un tema flojo');
  });
});

describe('Roadmap de estudio', () => {
  it('la lista muestra el roadmap con su fase actual y a dónde vas', () => {
    render(<>{<RutaV2 {...props('#/estudio/ruta')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Roadmaps');
    const tarjeta = screen.getByRole('link', { name: /Matemática/ });
    expect(tarjeta.getAttribute('href')).toBe('#/estudio/ruta/matematica');
    expect(within(tarjeta).getByText('fase 1 de 11')).toBeTruthy();
  });

  it('un roadmap: dónde estás, la escalera de fases (una por año) y "Cómo se usa" en una hoja', () => {
    const { container } = render(<>{<RutaV2 {...props('#/estudio/ruta/matematica')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matemática');
    expect(screen.getByRole('link', { name: 'Abrir M0' }).getAttribute('href')).toBe('#/estudio/ruta/matematica/M0');
    expect(container.querySelectorAll('.es-vertical > li')).toHaveLength(11);
    expect(container.querySelectorAll('.es-vertical > li.actual')).toHaveLength(1);
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(expect.arrayContaining(['Año 1', 'Año 2', 'Año 3']));
    fireEvent.click(screen.getByRole('button', { name: /Cómo se usa/ }));
    const d = dialogo();
    expect(within(d).getByText('Cada tema, en este orden')).toBeTruthy();
    expect(within(d).getByText('Los cinco tipos de material')).toBeTruthy();
  });

  it('la fase actual: los criterios se tildan y guardan; cerrar espera a que estén todos y deja la fase cerrada', () => {
    render(<>{<RutaV2 {...props('#/estudio/ruta/matematica/M0')} />}{global}</>);
    const cerrar = screen.getByRole('button', { name: 'Cerrar M0' });
    expect(cerrar.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Faltan 2 para cerrar M0')).toBeTruthy();
    fireEvent.click(cerrar);
    expect(getState().estudioRuta.matematica?.cerradas?.M0).toBeUndefined();
    const casillas = screen.getAllByRole('checkbox');
    fireEvent.click(casillas[0]);
    expect(getState().estudioRuta.matematica.salida.M0).toEqual([0]);
    expect(screen.getByText('Faltan 1 para cerrar M0')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(getState().estudioRuta.matematica.salida.M0).toEqual([0, 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar M0' }));
    expect(getState().estudioRuta.matematica.cerradas.M0).toBe(HOY);
    // Cerrada: se puede reabrir (es la última).
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir M0' }));
    expect(getState().estudioRuta.matematica.cerradas.M0).toBeUndefined();
  });

  it('una fase que todavía no toca muestra sus criterios pero no deja tildarlos', () => {
    render(<>{<RutaV2 {...props('#/estudio/ruta/matematica/M2')} />}{global}</>);
    expect(screen.getByText('Se habilita al cerrar las fases anteriores.')).toBeTruthy();
    const casillas = screen.getAllByRole('checkbox');
    expect(casillas.every((c) => c.getAttribute('aria-disabled') === 'true')).toBe(true);
    fireEvent.click(casillas[0]);
    expect(getState().estudioRuta.matematica?.salida?.M2).toBeUndefined();
    expect(screen.queryByRole('button', { name: /^Cerrar/ })).toBeNull();
  });

  it('el resto de la fase (bloques, qué pasa si un test sale mal, proyecto) está en hojas', () => {
    render(<>{<RutaV2 {...props('#/estudio/ruta/matematica/M1')} />}{global}</>);
    fireEvent.click(screen.getByRole('button', { name: /^Si un test sale mal/ }));
    expect(within(dialogo()).getByText('Fallás por concepto')).toBeTruthy();
    expect(within(dialogo()).getByText(/85 % o más/)).toBeTruthy();
  });

  it('una fase o un roadmap que no existen caen en la lista', () => {
    render(<>{<RutaV2 {...props('#/estudio/ruta/nada')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Roadmaps');
  });
});

describe('Tramo de Matemática', () => {
  it('una ventana: el perfil, el libro que manda, el nivel de salida (se tilda en la hoja) y la puerta', () => {
    render(<>{<TramoV2 day={dia()} id="W1" />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Math W1');
    expect(screen.getByText('Al terminarlo sos')).toBeTruthy();
    expect(screen.getByText('Habilita: P3')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cargar el test' }).getAttribute('href')).toBe('#/metas/proyecto/W1');
    fireEvent.click(screen.getByRole('button', { name: /^Nivel de salida/ }));
    const d = dialogo();
    fireEvent.click(within(d).getAllByRole('checkbox')[0]);
    expect(getState().plan.salida?.W1).toEqual([0]);
  });

  it('las reglas y el refuerzo se abren en una hoja', () => {
    render(<>{<TramoV2 day={dia()} id="W1" />}{global}</>);
    fireEvent.click(screen.getByRole('button', { name: /^Reglas y refuerzo/ }));
    expect(within(dialogo()).getByText('Fallás por concepto')).toBeTruthy();
    expect(within(dialogo()).getByText('65 a 84 %')).toBeTruthy();
  });

  it('un tramo que no existe lo dice y ofrece volver', () => {
    render(<>{<TramoV2 day={dia()} id="ZZ" />}{global}</>);
    expect(screen.getByText('No encontré ese tramo')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver Matemática' }).getAttribute('href')).toBe('#/estudio/mate');
  });

  it('desde el enrutador de mate/…: el tramo, el capítulo y el centro', () => {
    const { unmount } = render(<>{<MateExtraV2 {...props('#/estudio/mate/W1')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Math W1');
    unmount();
    const c = render(<>{<MateExtraV2 {...props('#/estudio/mate/libro/conamat/1')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cap. 1');
    c.unmount();
    render(<>{<MateExtraV2 {...props('#/estudio/mate/libro/conamat')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aritmética');
  });
});

describe('Capítulo de un libro', () => {
  it('estudiando: "Lo terminé" lo marca estudiado y agenda lo que sigue', () => {
    render(<>{<CapituloV2 day={dia()} id="conamat" n={1} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cap. 1');
    expect(screen.getByRole('link', { name: 'Aritmética' }).getAttribute('href')).toBe('#/estudio/mate/libro/conamat');
    fireEvent.click(screen.getByRole('button', { name: 'Lo terminé' }));
    expect(estudio().units.conamat[1].learnedOn).toBe(HOY);
  });

  it('"Sigo estudiándolo" cuenta el paso de hoy pero el capítulo no avanza', () => {
    render(<>{<CapituloV2 day={dia()} id="conamat" n={1} />}{global}</>);
    fireEvent.click(screen.getByRole('button', { name: 'Sigo estudiándolo' }));
    expect(dia().studyDone).toContain('learn:conamat:1');
    expect(estudio().units.conamat?.[1]?.learnedOn).toBeUndefined();
  });

  it('con el test hecho: cargar el resultado lleva al test; los tests, repasos y el historial se leen', () => {
    sembrar();
    render(<>{<CapituloV2 day={dia()} id="conamat" n={2} />}{global}</>);
    expect(screen.getByRole('button', { name: 'Cargar el resultado' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar el resultado' }));
    expect(location.hash).toBe('#/test/conamat/2');
    const tests = screen.getByRole('region', { name: 'Tests' });
    expect(within(tests).getByText('Test · 29 de 40')).toBeTruthy();
    expect(within(tests).getByText('73 %')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Repasos agendados/ }));
    expect(within(dialogo()).getByText('Re-test')).toBeTruthy();
  });

  it('importar tarjetas: pegás una por línea y quedan en el capítulo', () => {
    render(<>{<CapituloV2 day={dia()} id="conamat" n={1} />}{global}</>);
    const antes = estudio().cards.length;
    fireEvent.click(screen.getByRole('button', { name: /^Importar tarjetas/ }));
    const d = dialogo();
    const cargar = within(d).getByRole('button', { name: 'Cargar' });
    expect(cargar.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(within(d).getByLabelText('Tarjetas'), { target: { value: '¿Qué es un racional? :: El cociente de dos enteros' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Cargar' }));
    expect(estudio().cards).toHaveLength(antes + 1);
    const nueva = estudio().cards.at(-1)!;
    expect(nueva).toMatchObject({ activityId: 'conamat', unit: 1, front: '¿Qué es un racional?' });
  });

  it('un capítulo o un libro que no existen lo dicen', () => {
    const a = render(<>{<CapituloV2 day={dia()} id="conamat" n={99} />}{global}</>);
    expect(screen.getByText('No existe ese capítulo')).toBeTruthy();
    a.unmount();
    render(<>{<CapituloV2 day={dia()} id="nada" n={1} />}{global}</>);
    expect(screen.getByText('No encontré ese libro')).toBeTruthy();
  });
});

describe('Exámenes', () => {
  it('sin tests: lo dice y manda al libro', () => {
    render(<>{<ExamenesV2 {...props('#/flojo/examenes')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Exámenes');
    expect(screen.getByText('Todavía no hay tests')).toBeTruthy();
    expect(screen.getByRole('link', { name: /^Ir a/ }).getAttribute('href')).toBe('#/estudio/mate/libro/conamat');
  });

  it('con tests: cuán listo estás, el puntaje y los errores por tipo, el re-test y el simulacro', () => {
    sembrar();
    render(<>{<ExamenesV2 {...props('#/flojo/examenes')} />}{global}</>);
    expect(screen.getByRole('img', { name: /Listo para el examen final/ })).toBeTruthy();
    const puntaje = screen.getByRole('region', { name: 'Puntaje de cada test' });
    expect(within(puntaje).getByRole('img').getAttribute('aria-label')).toMatch(/cap\. 1 95 %, aprobado; cap\. 2 73 %/);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByRole('row', { name: /^Concepto/ })).toBeTruthy();
    expect(within(tabla).getByRole('row', { name: /^Total 2 11$/ })).toBeTruthy();
    const retest = screen.getByRole('region', { name: 'Re-test pendiente' });
    expect(within(retest).getByRole('link').getAttribute('href')).toBe('#/estudio/mate/libro/conamat/2');
    expect(screen.getByRole('link', { name: 'Armar simulacro' }).getAttribute('href')).toBe('#/flojo/simulacro');
  });

  it('el filtro de arriba lleva al centro y al recall', () => {
    render(<>{<ExamenesV2 {...props('#/flojo/examenes')} />}{global}</>);
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Qué mirar' })).getByRole('radio', { name: 'Recall' }));
    expect(location.hash).toBe('#/flojo/recall');
  });
});

describe('Simulacro', () => {
  it('la hoja trae los 40 ejercicios y se imprime', () => {
    const imprimir = vi.fn();
    vi.stubGlobal('print', imprimir);
    render(<>{<SimulacroV2 />}{global}</>);
    expect(within(screen.getByRole('list', { name: 'Ejercicios del simulacro' })).getAllByRole('listitem')).toHaveLength(40);
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir hoja' }));
    expect(imprimir).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('el simulacro y la lista de fuerzas salen de los mismos capítulos', () => {
    sembrar();
    const { a, f } = fuerzasDe(estudio());
    expect(a?.id).toBe('conamat');
    expect(f[1]).not.toBeNull();
    expect(f[3]).toBeNull();
  });
});

describe('Un tema flojo', () => {
  it('la fuerza, lo que olvidás, el recuerdo con los días, cómo te fue y los errores del test', () => {
    sembrar();
    render(<>{<TemaV2 {...props('#/flojo/conamat%3A2')} />}{global}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cap. 2');
    expect(screen.getByRole('img', { name: /^Fuerza del tema: \d+ %$/ })).toBeTruthy();
    expect(screen.getByText('recall 50 % · test 73 %')).toBeTruthy();
    const ideas = screen.getByRole('region', { name: 'Lo que olvidás' });
    expect(within(ideas).getByText('Valor absoluto')).toBeTruthy();
    expect(within(ideas).getByText('Olvidada')).toBeTruthy();
    expect(within(ideas).getByRole('img', { name: /Valor absoluto: olvidada/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Recuerdo de/ })).toBeTruthy();
    const linea = screen.getByRole('region', { name: 'Cómo te fue' });
    expect(within(linea).getByText('Test completo')).toBeTruthy();
    expect(within(linea).getByText('Re-test')).toBeTruthy();
    const errores = screen.getByRole('region', { name: 'Errores del test' });
    expect(within(errores).getByText('Regla de signos')).toBeTruthy();
    expect(within(errores).getByText('Ej. 1')).toBeTruthy();
  });

  it('"Arreglar ahora" arma la sesión de refuerzo del tema y los pasos se ven en una hoja', () => {
    sembrar();
    render(<>{<TemaV2 {...props('#/flojo/conamat%3A2')} />}{global}</>);
    fireEvent.click(screen.getByRole('button', { name: /^Los pasos/ }));
    expect(within(dialogo()).getByText(/^Releer valor absoluto/)).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));
    expect(tramosDeTema(estudio(), 'conamat:2').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Arreglar ahora' }));
    expect(getState().focus?.activityId).toBe('refuerzo');
    expect(location.hash).toBe('#/sesion/refuerzo');
  });

  it('un tema que no existe lo dice y vuelve a Puntos débiles', () => {
    render(<>{<TemaV2 {...props('#/flojo/nada')} />}{global}</>);
    expect(screen.getByText('No encontré ese tema')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver puntos débiles' }).getAttribute('href')).toBe('#/flojo');
  });
});
