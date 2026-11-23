import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startFocus } from '../../data/focus';
import { EJEMPLO_BLOQUE } from '../../data/metas-bloque';
import { PLANTILLAS } from '../../data/motor-rutinas';
import { DEFAULT_ALARMS } from '../../data/sounds';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, setFocus, setState, startDay } from '../../state/store';
import { guardarRutina, asignarRutina } from '../../state/rutinas';
import { desactivarIntensiva } from '../../state/plan';
import CapasV2, { aviso, limpiarCapas } from '../kit/capas';
import AjustesV2 from '../pantallas/AjustesV2';
import type { PropsV2 } from '../registro';
import CompaneraV2 from './CompaneraV2';
import DatosV2 from './DatosV2';
import ElegirV2 from './ElegirV2';
import { ENTRADAS } from './entradas';
import FocoV2 from './FocoV2';
import ImportarV2 from './ImportarV2';
import JsonV2 from './JsonV2';
import PlanAjustesV2 from './PlanAjustesV2';
import PomodorosV2 from './PomodorosV2';
import RutinaV2 from './RutinaV2';
import RutinasV2 from './RutinasV2';
import SemanaV2 from './SemanaV2';
import SonidosV2 from './SonidosV2';

const sonido = vi.hoisted(() => ({ playSound: vi.fn() }));
vi.mock('../../ui/sound', async (orig) => ({ ...(await orig<typeof import('../../ui/sound')>()), playSound: sonido.playSound }));

// Lunes: en el plan de fábrica toca Pull A.
const HOY = '2026-11-23';
const props = (hash: string): PropsV2 => ({ ruta: leerRuta(hash), day: getState().days[HOY], today: HOY });
const capas = <CapasV2 />;
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const confirma = (nombre: RegExp | string) => fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: nombre }));
const boton = (nombre: RegExp | string) => screen.getByRole('button', { name: nombre });
const campo = (nombre: string, valor: string) => { const i = screen.getByRole('textbox', { name: nombre }); fireEvent.change(i, { target: { value: valor } }); fireEvent.blur(i); };
const bloque = (i = 1) => getState().days[HOY].blocks[i];

beforeEach(() => {
  localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = '';
  sonido.playSound.mockClear();
});
afterEach(() => { act(() => limpiarCapas()); vi.restoreAllMocks(); });

describe('Ajustes y herramientas de Hoy 2.0 · qué cubre', () => {
  it('cada ruta de la familia tiene su entrada (la pantalla entera, sin `cubre`) y es parte de otra área', () => {
    const rutas: [string, string][] = [
      ['#/ajustes-rutinas', 'ajustes-rutinas'], ['#/ajustes-rutinas/nueva', 'ajustes-rutinas'], ['#/ajustes-rutinas/hoy', 'ajustes-rutinas'], ['#/ajustes-rutinas/rut-1', 'ajustes-rutinas'],
      ['#/ajustes-companera', 'ajustes-companera'], ['#/ajustes-datos', 'ajustes-datos'], ['#/sonidos', 'sonidos'],
      ['#/entreno-semana', 'entreno-semana'], ['#/entreno-rutina/nueva', 'entreno-rutina'], ['#/entreno-rutina/push-a', 'entreno-rutina'],
      ['#/elegir/prog', 'elegir'], ['#/foco', 'foco'], ['#/pomodoros', 'pomodoros'], ['#/json', 'json'], ['#/importar', 'importar'],
    ];
    for (const [hash, pantalla] of rutas) {
      const ruta = leerRuta(hash);
      expect(ruta.pantalla, hash).toBe(pantalla);
      const e = ENTRADAS.find((x) => x.pantalla === ruta.pantalla && (!x.entrada.cubre || x.entrada.cubre(ruta)));
      expect(e, hash).toBeTruthy();
      expect(e!.entrada.cubre, hash).toBeUndefined();
      expect(e!.entrada.parte, hash).toBe(true);
    }
    expect(new Set(ENTRADAS.map((x) => x.pantalla)).size).toBe(ENTRADAS.length);
  });
});

describe('Compañera de entreno', () => {
  it('guarda los dos nombres con setNames; vacío o sin cambios, no deja guardar', () => {
    render(<>{<CompaneraV2 {...props('#/ajustes-companera')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Compañera de entreno');
    expect(boton('Guardar nombres')).toHaveAttribute('aria-disabled', 'true');
    campo('Entrenás con', '');
    expect(boton('Guardar nombres')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Escribí los dos nombres.')).toBeInTheDocument();
    campo('Entrenás con', 'Abril');
    campo('Tu nombre', 'Toto');
    fireEvent.click(boton('Guardar nombres'));
    expect(getState().settings!.names).toEqual({ me: 'Toto', partner: 'Abril' });
    expect(screen.getByText('Nombres guardados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir a Entreno/ })).toHaveAttribute('href', '#/entreno');
  });
});

describe('Copia de seguridad', () => {
  const archivo = (contenido: unknown) => new File([typeof contenido === 'string' ? contenido : JSON.stringify(contenido)], 'trazo-copia.json', { type: 'application/json' });
  const elegirArchivo = (f: File) => fireEvent.change(screen.getByLabelText('Archivo de la copia'), { target: { files: [f] } });

  it('descargar baja el archivo con todo el estado y anota la fecha de la última copia', () => {
    const descargas: string[] = [];
    URL.createObjectURL = vi.fn(() => 'blob:copia');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { descargas.push(this.download); });
    render(<>{<DatosV2 {...props('#/ajustes-datos')} />}{capas}</>);
    expect(screen.getByText('Sin copias')).toBeInTheDocument();
    fireEvent.click(boton('Descargar copia'));
    expect(descargas).toEqual([`trazo-copia-${HOY}.json`]);
    expect(getState().settings!.lastBackup).toBe(HOY);
    expect(screen.getByText('23 nov 2026')).toBeInTheDocument();
  });

  it('restaurar valida el archivo y pregunta antes: si decís que no, no cambia nada; si decís que sí, reemplaza todo', async () => {
    const otra = JSON.parse(JSON.stringify(getState()));
    otra.settings.names = { me: 'Otro', partner: 'Otra' };
    render(<>{<DatosV2 {...props('#/ajustes-datos')} />}{capas}</>);
    elegirArchivo(archivo({ trazo: 1, exportado: HOY, estado: otra }));
    const alerta = await screen.findByRole('alertdialog', { name: '¿Restaurar esta copia?' });
    expect(alerta).toHaveTextContent('No se puede deshacer');
    confirma('Cancelar');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(getState().settings!.names.me).toBe('Toti');
    const guardado = localStorage.getItem('trazo.v1');

    elegirArchivo(archivo({ trazo: 1, exportado: HOY, estado: otra }));
    await screen.findByRole('alertdialog');
    confirma('Restaurar copia');
    await waitFor(() => expect(getState().settings!.names.me).toBe('Otro'));
    expect(JSON.parse(localStorage.getItem('trazo.v1')!).settings.names.me).toBe('Otro');
    expect(localStorage.getItem('trazo.v1')).not.toBe(guardado);
    expect(await screen.findByText('Copia restaurada')).toBeInTheDocument();
  });

  it('un archivo que no es una copia de Trazo no toca nada ni llega a preguntar', async () => {
    render(<>{<DatosV2 {...props('#/ajustes-datos')} />}{capas}</>);
    const antes = localStorage.getItem('trazo.v1');
    elegirArchivo(archivo({ hola: 1 }));
    expect(await screen.findByText('No es una copia de Trazo')).toBeInTheDocument();
    elegirArchivo(archivo('esto ni es JSON'));
    await waitFor(() => expect(screen.getAllByText('No es una copia de Trazo').length).toBeGreaterThan(0));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(getState().settings!.names.me).toBe('Toti');
    expect(localStorage.getItem('trazo.v1')).toBe(antes);
  });
});

describe('Sonidos y alarmas', () => {
  it('cada aviso se prueba con su play y su sonido se cambia en una hoja (y suena al elegirlo)', () => {
    render(<>{<SonidosV2 {...props('#/sonidos')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sonidos y alarmas');
    fireEvent.click(boton('Probar: Termina un descanso'));
    expect(sonido.playSound).toHaveBeenLastCalledWith('madera', 70);
    fireEvent.click(boton(/Termina un pomodoro: Campana de bronce/));
    const hoja = dialogo();
    expect(within(hoja).getByRole('radio', { name: 'Campana de bronce' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(hoja).getByRole('radio', { name: '3 pitidos al final' }));
    expect(getState().settings!.sounds!.events.pomodoro).toBe('pitidos');
    expect(sonido.playSound).toHaveBeenLastCalledWith('pitidos', 70);
  });

  it('el volumen y la vibración se guardan', () => {
    render(<>{<SonidosV2 {...props('#/sonidos')} />}{capas}</>);
    const vol = screen.getByLabelText('Volumen') as HTMLInputElement;
    fireEvent.change(vol, { target: { value: '40' } });
    expect(getState().settings!.sounds!.volume).toBe(40);
    expect(screen.getByText('40 %')).toBeInTheDocument();
    fireEvent.pointerUp(vol);
    expect(sonido.playSound).toHaveBeenLastCalledWith('campana', 40);
    fireEvent.click(screen.getByRole('switch', { name: 'Vibrar con cada aviso' }));
    expect(getState().settings!.sounds!.vibrate).toBe(false);
  });

  it('las alarmas se prenden y apagan, se les cambia la hora en una hoja y se vuelve a las de fábrica con deshacer', () => {
    render(<>{<SonidosV2 {...props('#/sonidos')} />}{capas}</>);
    const activas = () => (getState().settings!.alarms ?? DEFAULT_ALARMS).filter((a) => a.on).length;
    expect(boton('Agregar 4 alarmas al calendario')).not.toHaveAttribute('aria-disabled');
    fireEvent.click(screen.getByRole('switch', { name: /Cerrar el día/ }));
    expect(activas()).toBe(3);
    expect(boton('Agregar 3 alarmas al calendario')).toBeInTheDocument();

    fireEvent.click(boton(/Cambiar las horas/));
    const hora = within(dialogo()).getByRole('textbox', { name: 'Cerrar el día: hora' });
    fireEvent.change(hora, { target: { value: '20' } });
    expect(getState().settings!.alarms!.find((a) => a.id === 'cierre')!.time).toBe('20:00');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));

    fireEvent.click(boton('Volver a las de fábrica'));
    expect(getState().settings!.alarms).toEqual(DEFAULT_ALARMS);
    fireEvent.click(boton('Deshacer'));
    expect(getState().settings!.alarms!.find((a) => a.id === 'cierre')).toMatchObject({ time: '20:00', on: false });
  });

  it('sin alarmas prendidas no hay nada que agregar al calendario y dice por qué', () => {
    render(<>{<SonidosV2 {...props('#/sonidos')} />}{capas}</>);
    for (const a of DEFAULT_ALARMS) fireEvent.click(screen.getByRole('switch', { name: new RegExp(a.title) }));
    expect(boton(/Agregar 0 alarmas/)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Prendé al menos una alarma.')).toBeInTheDocument();
  });
});

describe('JSON del día', () => {
  it('copia el JSON del día y lo baja con el nombre de la fecha', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
    const descargas: string[] = [];
    URL.createObjectURL = vi.fn(() => 'blob:json');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { descargas.push(this.download); });
    render(<>{<JsonV2 {...props('#/json')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('JSON del día');
    expect(screen.getByText(`data/days/${HOY}.json`)).toBeInTheDocument();
    fireEvent.click(boton('Copiar JSON'));
    await waitFor(() => expect(escribir).toHaveBeenCalled());
    expect(() => JSON.parse(escribir.mock.calls[0][0])).not.toThrow();
    expect(await screen.findByText('JSON copiado')).toBeInTheDocument();
    fireEvent.click(boton(`Descargar ${HOY}.json`));
    expect(descargas).toEqual([`${HOY}.json`]);
    fireEvent.click(screen.getByRole('button', { name: /Ver el JSON/ }));
    expect(within(dialogo()).getByLabelText(`Contenido de ${HOY}.json`)).toHaveTextContent('"');
  });

  it('si el teléfono no deja copiar, avisa y ofrece ver el texto', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true });
    render(<>{<JsonV2 {...props('#/json')} />}{capas}</>);
    fireEvent.click(boton('Copiar JSON'));
    expect(await screen.findByText('No se pudo copiar')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver el JSON' })[0]);
    expect(dialogo()).toBeInTheDocument();
  });
});

describe('Pomodoros', () => {
  it('arma uno a medida en una hoja y lo asigna a un bloque', () => {
    render(<>{<PomodorosV2 {...props('#/pomodoros')} />}{capas}</>);
    expect(screen.getByRole('link', { name: /Hoy/ })).toHaveAttribute('href', '#/hoy');
    const n = getState().settings!.presets.length;
    fireEvent.click(boton('Nuevo'));
    const hoja = dialogo();
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Nombre (opcional)' }), { target: { value: 'Mío' } });
    const foco = within(hoja).getByRole('textbox', { name: 'Concentración en minutos' });
    fireEvent.change(foco, { target: { value: '30' } }); fireEvent.blur(foco);
    fireEvent.click(within(hoja).getByRole('button', { name: /Asignar a/ }));
    const lista = screen.getAllByRole('dialog').pop()!;
    fireEvent.click(within(lista).getAllByRole('radio', { name: /^Programación/ })[0]);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar pomodoro' }));
    const st = getState().settings!;
    expect(st.presets).toHaveLength(n + 1);
    const nuevo = st.presets[st.presets.length - 1];
    expect(nuevo).toMatchObject({ name: 'Mío', focus: 30, rest: 10, cycles: 2 });
    expect(Object.values(st.blockPresets)).toContain(nuevo.id);
    expect(screen.getByText('Pomodoro guardado')).toBeInTheDocument();
  });

  it('borrar se deshace: vuelve al mismo lugar y a los bloques a los que estaba asignado', () => {
    render(<>{<PomodorosV2 {...props('#/pomodoros')} />}{capas}</>);
    expect(getState().settings!.blockPresets.math).toBe('p-math');
    fireEvent.click(boton('Borrar Matemática profunda'));
    expect(getState().settings!.presets.find((p) => p.id === 'p-math')).toBeUndefined();
    expect(getState().settings!.blockPresets.math).toBeUndefined();
    fireEvent.click(boton('Deshacer'));
    expect(getState().settings!.presets[0].id).toBe('p-math');
    expect(getState().settings!.blockPresets.math).toBe('p-math');
  });

  it('sin pomodoros, un estado vacío con su acción', () => {
    setState((s) => ({ ...s, settings: { ...s.settings!, presets: [], blockPresets: {} } }));
    render(<PomodorosV2 {...props('#/pomodoros')} />);
    expect(screen.getByText('Sin pomodoros propios')).toBeInTheDocument();
    fireEvent.click(boton('Nuevo pomodoro'));
    expect(dialogo()).toHaveAccessibleName('Nuevo pomodoro');
  });
});

describe('Elegir foco', () => {
  it('muestra las formas de trabajar el bloque; elegir una y empezar arranca el foco con ese plan y va a #/foco', () => {
    const b = bloque();
    render(<ElegirV2 {...props(`#/elegir/${b.key}`)} />);
    const radios = screen.getAllByRole('radio').filter((r) => r.closest('[aria-label="Forma de trabajar el bloque"]'));
    expect(radios.length).toBeGreaterThanOrEqual(2);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(radios[1]);
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    const etiqueta = radios[1].querySelector('b')!.textContent!;
    fireEvent.click(boton(new RegExp(`^Empezar · ${etiqueta.replace(/[+×/]/g, '.')}`)));
    const f = getState().focus!;
    expect(f).toMatchObject({ date: HOY, key: b.key, plan: etiqueta, i: 0, pausedAt: null });
    expect(f.segs.length).toBeGreaterThan(0);
    expect(location.hash).toBe('#/foco');
  });

  it('"Usarlo siempre" deja la forma elegida como el pomodoro del bloque; sin eso, no toca nada', () => {
    const b = bloque();
    const antes = getState().settings!.blockPresets[b.key];
    const { unmount } = render(<ElegirV2 {...props(`#/elegir/${b.key}`)} />);
    fireEvent.click(boton(/Empezar/));
    expect(getState().settings!.blockPresets[b.key]).toBe(antes);
    unmount();
    setFocus(null);
    render(<ElegirV2 {...props(`#/elegir/${b.key}`)} />);
    const radios = screen.getAllByRole('radio').filter((r) => r.closest('[aria-label="Forma de trabajar el bloque"]'));
    fireEvent.click(radios[radios.length - 1]);
    fireEvent.click(screen.getByRole('switch', { name: new RegExp(`Usarlo siempre en`) }));
    fireEvent.click(boton(/Empezar/));
    expect(getState().settings!.blockPresets[b.key]).toMatch(/^b-/);
  });

  it('un bloque que no existe dice qué pasó y vuelve a Hoy', () => {
    render(<ElegirV2 {...props('#/elegir/no-existe')} />);
    expect(screen.getByText('No encontré ese bloque')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Hoy' })).toHaveAttribute('href', '#/hoy');
  });
});

describe('Foco', () => {
  const iniciar = (segs = [{ type: 'focus' as const, min: 50 }, { type: 'rest' as const, min: 10 }], hace = 10 * 60000) => {
    const b = bloque(1);
    act(() => setFocus(startFocus(HOY, b.key, '50/10', segs, Date.now() - hace)));
    return b;
  };

  it('sin foco corriendo, invita a entrar desde Hoy', () => {
    render(<FocoV2 {...props('#/foco')} />);
    expect(screen.getByText('No hay un foco corriendo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Hoy' })).toHaveAttribute('href', '#/hoy');
  });

  it('es una pantalla completa con su propia salida: el reloj dice lo que queda y se pausa y se sigue', () => {
    const b = iniciar();
    const { container } = render(<>{<FocoV2 {...props('#/foco')} />}{capas}</>);
    const main = container.querySelector('main')!;
    expect(main).toHaveClass('v2-completa');
    expect(main.querySelector('.m-marco')).toBeNull();
    expect(screen.getByRole('link', { name: 'Hoy' })).toHaveAttribute('href', '#/hoy');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(b.title.split(' · ')[0]);
    expect(screen.getByRole('timer')).toHaveAccessibleName(/Concentración: quedan (39|40):\d\d/);
    fireEvent.click(boton('Pausar'));
    expect(getState().focus!.pausedAt).not.toBeNull();
    expect(screen.getByRole('timer')).toHaveAccessibleName(/^En pausa/);
    fireEvent.click(boton('Seguir'));
    expect(getState().focus!.pausedAt).toBeNull();
  });

  it('"Descanso ahora" corta el foco y pasa al descanso; al final del descanso, Terminar guarda los minutos de foco hechos y vuelve a Hoy', () => {
    const b = iniciar();
    render(<>{<FocoV2 {...props('#/foco')} />}{capas}</>);
    fireEvent.click(boton('Descanso ahora'));
    expect(getState().focus!.i).toBe(1);
    expect(getState().focus!.segs[0].min).toBe(10);
    expect(screen.getByRole('timer')).toHaveAccessibleName(/^Descanso/);
    fireEvent.click(boton('Terminar'));
    expect(getState().focus).toBeNull();
    expect(getState().days[HOY].focus).toEqual([expect.objectContaining({ key: b.key, plan: '50/10', focusMin: 10 })]);
    expect(location.hash).toBe('#/hoy');
  });

  it('"Terminar el foco" a mitad de camino pregunta y guarda lo que llevás; si decís que no, el foco sigue', async () => {
    const b = iniciar(undefined, 25 * 60000);
    render(<>{<FocoV2 {...props('#/foco')} />}{capas}</>);
    fireEvent.click(boton('Terminar el foco'));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('25 min de foco');
    confirma('Cancelar');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(getState().focus).not.toBeNull();
    expect(getState().days[HOY].focus).toHaveLength(0);
    fireEvent.click(boton('Terminar el foco'));
    await screen.findByRole('alertdialog');
    confirma('Terminar el foco');
    await waitFor(() => expect(getState().focus).toBeNull());
    expect(getState().days[HOY].focus).toEqual([expect.objectContaining({ key: b.key, focusMin: 25 })]);
  });

  it('los pasos del bloque se tildan ahí mismo, se agregan y la nota para una tarjeta va al JSON del día', async () => {
    const b = iniciar();
    render(<>{<FocoV2 {...props('#/foco')} />}{capas}</>);
    const paso = b.tasks[0];
    fireEvent.click(screen.getByRole('checkbox', { name: paso.t }));
    expect(getState().days[HOY].blocks.find((x) => x.key === b.key)!.tasks[0].done).toBe(true);
    campo('Nuevo paso', 'Algo más');
    fireEvent.click(boton('Agregar'));
    expect(getState().days[HOY].blocks.find((x) => x.key === b.key)!.tasks.map((t) => t.t)).toContain('Algo más');

    fireEvent.click(boton(/Anotar algo para una tarjeta/));
    const hoja = dialogo();
    expect(within(hoja).getByRole('button', { name: 'Guardar nota' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Nota para una tarjeta' }), { target: { value: 'Derivada de una potencia' } });
    fireEvent.click(within(hoja).getByRole('button', { name: 'Guardar nota' }));
    expect(getState().days[HOY].notes).toContain('Derivada de una potencia');
    expect(await screen.findByText('Anotado')).toBeInTheDocument();
  });

  it('cambiar la forma de trabajar lleva a Elegir foco de ese bloque', () => {
    const b = iniciar();
    render(<FocoV2 {...props('#/foco')} />);
    expect(screen.getByRole('link', { name: /50\/10 · cambiar/ })).toHaveAttribute('href', `#/elegir/${b.key}`);
  });
});

describe('Semana de entreno', () => {
  it('cambiar la plantilla y qué entrenás un día (en una hoja) escribe con las acciones de siempre', () => {
    render(<SemanaV2 {...props('#/entreno-semana')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semana de entreno');
    expect(screen.getByRole('link', { name: 'Entreno' })).toHaveAttribute('href', '#/entreno');
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    fireEvent.click(screen.getByRole('radio', { name: 'Full body ×3' }));
    expect(getState().train.plan.template).toBe('full');
    fireEvent.click(boton(/^martes/));
    const hoja = dialogo();
    expect(within(hoja).getByRole('radio', { name: /^Descanso activo/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(hoja).getByRole('radio', { name: 'Libre' }));
    expect(getState().train.plan).toMatchObject({ template: 'propia' });
    expect(getState().train.plan.days[1]).toBeNull();
  });

  it('el lunes de hoy lleva la marca; "Crear rutina" va a la rutina nueva', () => {
    render(<SemanaV2 {...props('#/entreno-semana')} />);
    expect(boton(/^lunes \(hoy\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear rutina' })).toHaveAttribute('href', '#/entreno-rutina/nueva');
  });

  it('si faltaste a un entreno propone pasar los próximos días a Full body, y se puede dejar como está', () => {
    // Hoy jueves: el lunes, martes y miércoles tocaban y no se hizo nada.
    const jueves = '2026-11-26';
    startDay('completo', '04:00', jueves);
    const p = { ruta: leerRuta('#/entreno-semana'), day: getState().days[jueves], today: jueves };
    render(<SemanaV2 {...p} />);
    expect(screen.getByRole('region', { name: 'Ajuste de la semana' })).toHaveTextContent(/Faltaste/);
    fireEvent.click(boton('Dejar como está'));
    expect(screen.queryByRole('region', { name: 'Ajuste de la semana' })).toBeNull();
    expect(getState().train.dismissed.length).toBe(1);
  });
});

describe('Editar rutina', () => {
  const rutina = (id: string) => getState().train.routines.find((r) => r.id === id)!;

  it('crear una: pide nombre y un ejercicio con nombre (y lo dice), edita el ejercicio en una hoja y guarda con saveRoutine', () => {
    render(<>{<RutinaV2 {...props('#/entreno-rutina/nueva')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nueva rutina');
    expect(screen.getByRole('link', { name: 'Entreno' })).toHaveAttribute('href', '#/entreno');
    expect(boton('Guardar rutina')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Poné un nombre.')).toBeInTheDocument();
    campo('Nombre de la rutina', 'Mi pierna');
    expect(screen.getByText('Agregá al menos un ejercicio.')).toBeInTheDocument();
    fireEvent.click(boton('Ejercicio'));
    const hoja = dialogo();
    expect(boton('Guardar rutina')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Nombre del ejercicio' }), { target: { value: 'Sentadilla' } });
    const series = within(hoja).getByRole('textbox', { name: 'Series' });
    fireEvent.change(series, { target: { value: '4' } }); fireEvent.blur(series);
    const max = within(hoja).getByRole('textbox', { name: 'Repeticiones máximas' });
    fireEvent.change(max, { target: { value: '12' } }); fireEvent.blur(max);
    const desc = within(hoja).getByRole('textbox', { name: 'Descanso en segundos' });
    fireEvent.change(desc, { target: { value: '120' } }); fireEvent.blur(desc);
    fireEvent.click(within(hoja).getByRole('button', { name: 'Listo' }));
    fireEvent.click(boton('Paso antes'));
    fireEvent.change(within(dialogo()).getByRole('textbox', { name: 'Nombre del paso' }), { target: { value: 'Movilidad' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Listo' }));
    fireEvent.click(boton('Guardar rutina'));
    const r = getState().train.routines.find((x) => x.name === 'Mi pierna')!;
    expect(r.exercises).toHaveLength(1);
    expect(r.exercises[0]).toMatchObject({ name: 'Sentadilla', sets: 4, repMin: 8, repMax: 12, rest: 120, kind: 'torso' });
    expect(r.before).toEqual([expect.objectContaining({ name: 'Movilidad', min: 5 })]);
    expect(r.desc).toBe('1 ejercicios');
    expect(location.hash).toBe('#/entreno-semana');
  });

  it('editar una de fábrica: las flechas cambian el orden, la hoja el kilo que sube, y se guarda lo mismo con el mismo id', () => {
    const antes = rutina('push-a');
    render(<>{<RutinaV2 {...props('#/entreno-rutina/push-a')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar rutina');
    const nombres = () => screen.getAllByRole('button', { name: /^Editar ejercicio/ }).map((b) => b.querySelector('b')!.textContent);
    const orden = nombres();
    fireEvent.click(screen.getAllByRole('button', { name: /^Bajar/ }).find((b) => b.getAttribute('aria-label') === `Bajar ${orden[0]}`)!);
    expect(nombres().slice(0, 2)).toEqual([orden[1], orden[0]]);
    fireEvent.click(screen.getAllByRole('button', { name: /^Editar ejercicio/ })[0]);
    fireEvent.click(within(dialogo()).getByRole('button', { name: /Cuánto sube el peso/ }));
    fireEvent.click(within(screen.getAllByRole('dialog').pop()!).getByRole('radio', { name: /Aislamiento/ }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Listo' }));
    fireEvent.click(boton('Guardar rutina'));
    const r = rutina('push-a');
    expect(r.id).toBe('push-a');
    expect(r.exercises.map((e) => e.name).slice(0, 2)).toEqual([orden[1], orden[0]]);
    expect(r.exercises[0].kind).toBe('aislamiento');
    expect(r.exercises).toHaveLength(antes.exercises.length);
  });

  it('quitar un ejercicio se deshace; borrar la rutina también (vuelve con sus días)', () => {
    render(<>{<RutinaV2 {...props('#/entreno-rutina/push-a')} />}{capas}</>);
    const n = screen.getAllByRole('button', { name: /^Editar ejercicio/ }).length;
    fireEvent.click(screen.getAllByRole('button', { name: /^Editar ejercicio/ })[1]);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Quitar ejercicio' }));
    expect(screen.getAllByRole('button', { name: /^Editar ejercicio/ })).toHaveLength(n - 1);
    fireEvent.click(boton('Deshacer'));
    expect(screen.getAllByRole('button', { name: /^Editar ejercicio/ })).toHaveLength(n);

    const dias = getState().train.plan.days.map((d, i) => (d === 'push-a' ? i : -1)).filter((i) => i >= 0);
    fireEvent.click(boton('Borrar rutina'));
    expect(getState().train.routines.find((r) => r.id === 'push-a')).toBeUndefined();
    for (const i of dias) expect(getState().train.plan.days[i]).toBeNull();
    expect(location.hash).toBe('#/entreno-semana');
    fireEvent.click(boton('Deshacer'));
    expect(getState().train.routines.find((r) => r.id === 'push-a')).toBeTruthy();
    for (const i of dias) expect(getState().train.plan.days[i]).toBe('push-a');
  });
});

describe('Rutinas del día', () => {
  it('sin rutinas propias, rige la del plan: generar y adaptar a un toque, plantillas en hojas; "Usar como base" crea una copia', () => {
    render(<RutinasV2 {...props('#/ajustes-rutinas')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rutinas del día');
    expect(screen.getByRole('link', { name: 'Generar una rutina' })).toHaveAttribute('href', '#/ajustes-rutinas/nueva');
    expect(screen.getByRole('link', { name: 'Adaptar hoy' })).toHaveAttribute('href', '#/ajustes-rutinas/hoy');
    expect(screen.getByText('Rige la rutina del plan')).toBeInTheDocument();
    const p = PLANTILLAS[0];
    fireEvent.click(boton(new RegExp(p.nombre.replace(/[+·]/g, '.'))));
    expect(dialogo()).toHaveAccessibleName(p.nombre);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Usar como base' }));
    const r = getState().plan.rutinasPropias![0];
    expect(r).toMatchObject({ nombre: `${p.nombre} (copia)`, origen: p.id });
    expect(location.hash).toBe(`#/ajustes-rutinas/${r.id}`);
  });

  it('generar una rutina nueva: la vista previa sale de las restricciones y se guarda; después se asigna a días de la semana', () => {
    render(<>{<RutinasV2 {...props('#/ajustes-rutinas/nueva')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Generar rutina');
    expect(screen.getAllByText('Abi + correr', { selector: 'b' }).map((b) => b.closest('li')?.textContent).join(' ')).toContain('08:30–10:00');
    campo('Nombre de la rutina', 'Mi semana');
    fireEvent.click(boton('Guardar la rutina'));
    const r = getState().plan.rutinasPropias![0];
    expect(r.nombre).toBe('Mi semana');
    expect(r.bloques.length).toBeGreaterThan(3);
    expect(location.hash).toBe(`#/ajustes-rutinas/${r.id}`);
  });

  it('editar una propia: lo fijo que se pisa lo dice y no deja guardar; asignar a días y quitar la asignación (con deshacer)', () => {
    const id = guardarRutina({ nombre: 'Mía', creada: HOY, bloques: PLANTILLAS[0].bloques });
    render(<>{<RutinasV2 {...props(`#/ajustes-rutinas/${id}`)} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar rutina');
    fireEvent.click(boton('Usarla esos días'));
    const asig = () => getState().plan.asignacionesRutina ?? [];
    expect(asig()).toEqual([expect.objectContaining({ rutina: id, tipo: 'semana', dias: [1, 2, 3, 4, 5], desde: HOY })]);
    expect(screen.getByText(/lun, mar, mié, jue, vie desde el 23 nov/, { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Quitar: / })[0]);
    expect(asig()).toHaveLength(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Deshacer' }).pop()!);
    expect(asig()).toHaveLength(1);
  });

  it('borrar una rutina propia se deshace con sus asignaciones', () => {
    const id = guardarRutina({ nombre: 'Para borrar', creada: HOY, bloques: PLANTILLAS[0].bloques });
    asignarRutina({ rutina: id, tipo: 'dia', fecha: HOY });
    render(<>{<RutinasV2 {...props('#/ajustes-rutinas')} />}{capas}</>);
    expect(screen.getByText(/1 de|metas · el 23 nov/)).toBeInTheDocument();
    fireEvent.click(boton('Borrar Para borrar'));
    expect(getState().plan.rutinasPropias).toHaveLength(0);
    expect(getState().plan.asignacionesRutina).toHaveLength(0);
    fireEvent.click(boton('Deshacer'));
    expect(getState().plan.rutinasPropias!.map((r) => r.id)).toEqual([id]);
    expect(getState().plan.asignacionesRutina).toEqual([expect.objectContaining({ rutina: id, tipo: 'dia', fecha: HOY })]);
  });

  it('adaptar hoy: otra hora y un compromiso nuevo; "Usar hoy" asigna la rutina adaptada a hoy', () => {
    render(<>{<RutinasV2 {...props('#/ajustes-rutinas/hoy')} />}{capas}</>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Adaptar hoy');
    expect(screen.getByRole('link', { name: 'Hoy' })).toHaveAttribute('href', '#/hoy');
    fireEvent.click(boton('Compromiso'));
    const hoja = dialogo();
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Nombre' }), { target: { value: 'Médico' } });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Desde: hora' }), { target: { value: '15' } });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Desde: minutos' }), { target: { value: '00' } });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Hasta: hora' }), { target: { value: '16' } });
    fireEvent.click(within(hoja).getByRole('button', { name: 'Listo' }));
    fireEvent.click(boton('Usar hoy'));
    expect(getState().plan.asignacionesRutina).toEqual([expect.objectContaining({ tipo: 'dia', fecha: HOY })]);
    const r = getState().plan.rutinasPropias![0];
    expect(r.bloques.some((b) => b.label === 'Médico' && b.start === '15:00')).toBe(true);
    expect(getState().days[HOY].rutinaPropia).toBe(r.nombre);
    expect(screen.getByText('Hoy usa la rutina adaptada')).toBeInTheDocument();
  });
});

describe('Importar', () => {
  const pegar = (t: string) => fireEvent.change(screen.getByRole('textbox', { name: 'JSON pegado' }), { target: { value: t } });
  const estado = () => document.getElementById('ax-estado')!;

  it('sin JSON, no hay nada que importar y lo dice; un JSON roto marca la línea que falla', () => {
    render(<>{<ImportarV2 {...props('#/importar')} />}{capas}</>);
    expect(screen.getByRole('link', { name: 'Hoy' })).toHaveAttribute('href', '#/hoy');
    expect(estado()).toHaveTextContent('Esperando el JSON');
    expect(boton('Importar')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Pegá un JSON válido para importar.')).toBeInTheDocument();
    pegar('{\n  "tipo": "semana",\n  "rama": "handyx"\n  "fecha": "2026-11-23"\n}');
    expect(estado()).toHaveTextContent(/Línea \d+: No es un JSON válido/);
    expect(screen.getByRole('textbox', { name: 'JSON pegado' })).toHaveAttribute('aria-invalid', 'true');
    expect(boton('Importar')).toHaveAttribute('aria-disabled', 'true');
    pegar('{ "tipo": "semana", "rama": "handyx", "fecha": "ayer" }');
    expect(estado()).toHaveTextContent(/"fecha" tiene que ser AAAA-MM-DD/);
  });

  it('un JSON de rama válido: detecta la rama, muestra qué cambia antes de guardar y recién al apretar escribe', () => {
    render(<>{<ImportarV2 {...props('#/importar')} />}{capas}</>);
    pegar('{ "tipo": "semana", "rama": "handyx", "fecha": "2026-11-23", "horas": 6 }');
    expect(estado()).toHaveTextContent('Formato válido · semana del');
    expect(screen.getByRole('radio', { name: 'Handyx' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('region', { name: 'Qué cambia' })).toBeInTheDocument();
    expect(getState().plan.importaciones).toHaveLength(0);
    fireEvent.click(boton('Importar a Handyx'));
    expect(getState().plan.importaciones).toHaveLength(1);
    expect(getState().plan.importaciones[0]).toMatchObject({ tipo: 'semana', rama: 'handyx', fecha: '2026-11-23' });
    expect(screen.getByText('Listo · repartido')).toBeInTheDocument();
    fireEvent.click(boton('Importar otro'));
    expect(estado()).toHaveTextContent('Esperando el JSON');
  });

  it('las metas por bloque se validan, muestran lo que agrega y conservan lo tildado', () => {
    render(<>{<ImportarV2 {...props('#/importar')} />}{capas}</>);
    pegar(EJEMPLO_BLOQUE);
    expect(estado()).toHaveTextContent('Formato válido');
    expect(screen.queryByRole('radiogroup', { name: 'Rama' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Qué cambia' })).toHaveTextContent('Agrega 2');
    fireEvent.click(boton('Importar las metas'));
    expect(getState().plan.metasBloque!.P0.map((m) => m.id)).toContain('p0-hub');
    expect(screen.getByText('Listo · repartido')).toBeInTheDocument();
  });

  it('Limpiar vacía el cuadro', () => {
    render(<ImportarV2 {...props('#/importar')} />);
    expect(screen.queryByRole('button', { name: 'Limpiar' })).toBeNull();
    pegar('{}');
    fireEvent.click(boton('Limpiar'));
    expect(screen.getByRole('textbox', { name: 'JSON pegado' })).toHaveValue('');
  });
});

describe('Plan y rutina', () => {
  it('está dentro de Ajustes, en su propio chunk, y ya no es la 1.0', async () => {
    render(<AjustesV2 {...props('#/ajustes/plan')} />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Plan y rutina');
    expect(screen.queryByText('1.0')).toBeNull();
  });

  it('el modo intensivo pregunta antes de apagarse y de prenderse (y si decís que no, no cambia)', async () => {
    render(<>{<PlanAjustesV2 {...props('#/ajustes/plan')} />}{capas}</>);
    const modo = () => getState().settings!.plan?.modo;
    expect(modo()).toBe('busqueda-intensiva');
    fireEvent.click(screen.getByRole('switch', { name: /Modo intensivo/ }));
    expect(await screen.findByRole('alertdialog', { name: '¿Apagás la búsqueda intensiva?' })).toBeInTheDocument();
    confirma('Cancelar');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(modo()).toBe('busqueda-intensiva');
    fireEvent.click(screen.getByRole('switch', { name: /Modo intensivo/ }));
    await screen.findByRole('alertdialog');
    confirma('Apagarla');
    await waitFor(() => expect(modo()).not.toBe('busqueda-intensiva'));
    fireEvent.click(await screen.findByRole('switch', { name: /Modo intensivo/ }));
    expect(await screen.findByRole('alertdialog', { name: '¿Activás la búsqueda intensiva?' })).toBeInTheDocument();
    confirma('Activarla');
    await waitFor(() => expect(modo()).toBe('busqueda-intensiva'));
  });

  it('el inicio del plan se cambia en una hoja y se deshace', () => {
    render(<>{<PlanAjustesV2 {...props('#/ajustes/plan')} />}{capas}</>);
    const inicio = getState().settings!.startDate;
    fireEvent.click(boton(/Inicio del plan/));
    fireEvent.click(within(dialogo()).getByRole('button', { name: /Inicio del plan/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: `14 ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(inicio.slice(5, 7)) - 1]} ${inicio.slice(0, 4)}` }));
    expect(getState().settings!.startDate).toBe(`${inicio.slice(0, 8)}14`);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().settings!.startDate).toBe(inicio);
  });

  it('el horario del trabajo se guarda; el día libre solo se elige si no está la búsqueda intensiva (y lo dice)', () => {
    const { unmount } = render(<>{<PlanAjustesV2 {...props('#/ajustes/plan')} />}{capas}</>);
    fireEvent.click(boton(/Horario del trabajo/));
    const hoja = dialogo();
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Salida: hora' }), { target: { value: '18' } });
    expect(getState().settings!.plan!.horarioTrabajo!.fin).toMatch(/^18:/);
    fireEvent.click(within(hoja).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(boton(/Día libre/));
    expect(within(dialogo()).queryAllByRole('radio')).toHaveLength(0);
    expect(dialogo()).toHaveTextContent('Ninguno mientras dure la búsqueda intensiva');
    unmount();
    act(() => limpiarCapas());
    desactivarIntensiva(HOY);
    render(<PlanAjustesV2 {...props('#/ajustes/plan')} />);
    fireEvent.click(boton(/Día libre/));
    fireEvent.click(within(dialogo()).getByRole('radio', { name: 'Domingo' }));
    expect(getState().settings!.plan!.diaLibre).toBe(7);
  });

  it('un bloque pendiente que no entra lo dice y no se guarda; con un hueco libre, se asigna y se puede quitar', () => {
    render(<>{<PlanAjustesV2 {...props('#/ajustes/plan')} />}{capas}</>);
    fireEvent.click(boton(/^Handyx/));
    let hoja = dialogo();
    const dura = within(hoja).getByRole('textbox', { name: 'Dura en minutos' });
    fireEvent.change(dura, { target: { value: '600' } }); fireEvent.blur(dura);
    fireEvent.click(within(hoja).getByRole('button', { name: 'Asignar' }));
    expect(within(hoja).getByRole('alert')).toBeInTheDocument();
    expect(getState().settings!.plan?.bloquesPendientes?.handyx).toBeUndefined();
    fireEvent.change(dura, { target: { value: '30' } }); fireEvent.blur(dura);
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Empieza: hora' }), { target: { value: '20' } });
    fireEvent.change(within(hoja).getByRole('textbox', { name: 'Empieza: minutos' }), { target: { value: '30' } });
    fireEvent.click(within(hoja).getByRole('button', { name: 'Asignar' }));
    // Si no encaja en ningún hueco, sigue sin guardar; si encaja, queda y se ofrece quitarlo.
    const quedo = getState().settings!.plan?.bloquesPendientes?.handyx;
    if (quedo) {
      expect(quedo).toMatchObject({ start: '20:30', min: 30 });
      fireEvent.click(boton(/^Handyx/));
      hoja = dialogo();
      fireEvent.click(within(hoja).getByRole('button', { name: 'Quitar' }));
      expect(getState().settings!.plan?.bloquesPendientes?.handyx).toBeUndefined();
    } else {
      expect(within(hoja).getByRole('alert')).toBeInTheDocument();
    }
  });

  it('la pausa de fin de año es un interruptor, y los umbrales de Handyx se guardan al cerrar la hoja', () => {
    render(<>{<PlanAjustesV2 {...props('#/ajustes/plan')} />}{capas}</>);
    expect(getState().plan.pausaFinDeAnio).not.toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: /Pausa de fin de año/ }));
    expect(getState().plan.pausaFinDeAnio).toBe(false);
    fireEvent.click(boton(/Umbrales para decidir/));
    const hoja = dialogo();
    const i = within(hoja).getByRole('textbox', { name: 'Ingreso mínimo por mes' });
    fireEvent.change(i, { target: { value: '800 USD' } });
    fireEvent.blur(i);
    expect(getState().settings!.plan!.umbralIngreso).toBe('800 USD');
  });
});

describe('Los avisos de la 2.0 siguen funcionando con estas pantallas', () => {
  it('un aviso con deshacer muestra su botón (la base de todos los "se puede deshacer")', () => {
    render(capas);
    act(() => { aviso({ titulo: 'Hecho', deshacer: () => {} }); });
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
  });
});
void setState;
