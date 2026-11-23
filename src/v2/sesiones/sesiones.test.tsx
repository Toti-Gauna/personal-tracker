import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testExercises } from '../../data/ejercicios';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { saveTesis } from '../../state/study';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { entradaDe } from '../Resolutor';
import { EXTRAS_V2 } from '../extras';
import { PANTALLAS_V2 } from '../registro';
import { ENTRADAS } from './entradas';
import ActividadV2 from './ActividadV2';
import MotorEstudioV2 from './MotorEstudioV2';
import RecallV2 from './RecallV2';
import SesionEstudioV2 from './SesionEstudioV2';
import TarjetaNuevaV2 from './TarjetaNuevaV2';
import TesisV2 from './TesisV2';
import TestV2 from './TestV2';
import UnidadesV2 from './UnidadesV2';

// Lunes: toca Make It Stick (lunes, miércoles y viernes) y todo CONAMAT.
const HOY = '2026-11-23';
const estudio = () => getState().study;
const dia = () => getState().days[HOY];
const global = <GlobalV2 activa="estudio" pendientes={0} conBarra={false} conMini={false} />;
const props = (hash: string) => ({ ruta: leerRuta(hash), day: dia(), today: HOY });
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const mas = (grupo: string, paso = 1) => fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByRole('button', { name: `Sumar ${paso}` }));
const menos = (grupo: string, paso = 1) => fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByRole('button', { name: `Restar ${paso}` }));

/** Un capítulo estudiado ayer, con su test, y los repasos que esperan hoy. */
function sembrar() {
  act(() => {
    const st = getState().study;
    st.units.conamat = {
      1: { learnedOn: '2026-11-20', approvedOn: '2026-11-22', tests: [{ date: '2026-11-22', score: 13, total: 15, errors: { concepto: 0, tecnica: 1, descuido: 1, enunciado: 0 }, mode: 'papel', approved: true, wrong: [{ q: 'Simplificá 3/9', a: '1/3', type: 'tecnica' }] }] },
      2: { learnedOn: '2026-11-22', tests: [] },
    };
    st.reviews.push(
      { id: 'r-tesis1', activityId: 'conamat', unit: 1, kind: 'tesis', due: HOY, min: 20, label: 'Tesis · Cap. 1 · Números reales' },
      { id: 'r-cold2', activityId: 'conamat', unit: 2, kind: 'cold', due: HOY, min: 5, label: 'Cold recall · Cap. 2 · Números enteros' },
    );
  });
}

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Sesiones 2.0 · qué cubre', () => {
  it('las ocho pantallas son 2.0 con su ruta entera, y lo que no es de esta familia sigue en 1.0', () => {
    const hashes = ['#/sesion/make-it-stick', '#/test/conamat/1', '#/test/conamat/final', '#/tesis/r1', '#/recall/r1', '#/unidades', '#/actividad', '#/actividad/make-it-stick', '#/tarjeta-nueva', '#/motor', '#/motor/importar'];
    for (const h of hashes) expect(entradaDe(leerRuta(h), PANTALLAS_V2, EXTRAS_V2), h).toBeTruthy();
    // Cada una cubre la pantalla entera (sin `cubre`) y son exactamente estas ocho.
    expect(ENTRADAS.map((e) => e.pantalla).sort()).toEqual(['actividad', 'motor', 'recall', 'sesion', 'tarjeta-nueva', 'tesis', 'test', 'unidades']);
    for (const e of ENTRADAS) expect(e.entrada.cubre, e.pantalla).toBeUndefined();
  });
});

describe('Sesión de estudio 2.0', () => {
  it('antes de empezar muestra los tramos y el botón con la duración; empezar arma el foco como la 1.0', () => {
    render(<><SesionEstudioV2 {...props('#/sesion/make-it-stick')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Sesión de estudio' })).toBeTruthy();
    const empezar = screen.getByRole('button', { name: /^Empezar · / });
    expect(getState().focus).toBeFalsy();
    fireEvent.click(empezar);
    const f = getState().focus!;
    expect(f.activityId).toBe('make-it-stick');
    expect(f.tramos?.length).toBeGreaterThan(0);
    expect(location.hash).toBe('#/sesion/make-it-stick');
  });

  it('en curso: pausar y sumar 5 minutos escriben en el foco; "Hecho" cierra el tramo y marca el paso del día', () => {
    render(<><SesionEstudioV2 {...props('#/sesion/make-it-stick')} />{global}</>);
    fireEvent.click(screen.getByRole('button', { name: /^Empezar · / }));
    const { unmount } = render(<SesionEstudioV2 {...props('#/sesion/make-it-stick')} />);
    expect(screen.getAllByRole('timer').length).toBeGreaterThan(0);
    const min = getState().focus!.segs[0].min;
    fireEvent.click(screen.getAllByRole('button', { name: '5 min' }).at(-1)!);
    expect(getState().focus!.segs[0].min).toBe(min + 5);
    fireEvent.click(screen.getAllByRole('button', { name: 'Pausar' }).at(-1)!);
    expect(getState().focus!.pausedAt).not.toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Seguir' }).at(-1)!);
    expect(getState().focus!.pausedAt).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Hecho' }).at(-1)!);
    expect(dia().studyDone?.some((r) => r.startsWith('learn:make-it-stick'))).toBe(true);
    expect(getState().focus).toBeFalsy();
    unmount();
  });

  it('terminar la sesión pregunta antes y limpia el foco', async () => {
    render(<><SesionEstudioV2 {...props('#/sesion/make-it-stick')} />{global}</>);
    fireEvent.click(screen.getByRole('button', { name: /^Empezar · / }));
    render(<SesionEstudioV2 {...props('#/sesion/make-it-stick')} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Terminar la sesión/ }).at(-1)!);
    fireEvent.click(await screen.findByRole('button', { name: 'Terminar' }));
    await waitFor(() => expect(getState().focus).toBeFalsy());
  });

  it('sin sesión para ese contenido hoy: un vacío con salida', () => {
    render(<SesionEstudioV2 {...props('#/sesion/no-existe')} />);
    expect(screen.getByText('Hoy no hay sesión')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir a Estudio' }).getAttribute('href')).toBe('#/estudio');
  });
});

describe('Test 2.0', () => {
  it('en la app: cargás cuántos salieron bien y el tipo de cada error; con menos de 85 % no aprueba y agenda el re-test', () => {
    // prog-b1 es de test en la app; la unidad 3 tiene 5 ejercicios.
    render(<><TestV2 {...props('#/test/prog-b1/3')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Test' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Resultado' }).textContent).toMatch(/100\s*%/);
    menos('Ejercicios bien resueltos');
    expect(screen.getByRole('group', { name: 'Resultado' }).textContent).toMatch(/No aprobado/);
    mas('Técnica');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }));
    const u = estudio().units['prog-b1'][3];
    expect(u.tests).toHaveLength(1);
    expect(u.tests[0]).toMatchObject({ score: 4, total: 5, approved: false, mode: 'app' });
    expect(u.tests[0].errors.tecnica).toBe(1);
    expect(u.approvedOn).toBeUndefined();
    expect(estudio().reviews.some((r) => r.activityId === 'prog-b1' && r.unit === 3 && r.kind === 'retest')).toBe(true);
    expect(screen.getByRole('link', { name: 'Volver a Estudio' }).getAttribute('href')).toBe('#/estudio');
    // El resultado sigue hablando de este intento (el primero), aunque el estado ya tenga el test guardado.
    expect(screen.getByRole('heading', { level: 1, name: 'Test' })).toBeTruthy();
    expect(screen.getByText(/intento 2 de 3/)).toBeTruthy();
  });

  it('los tipos de error no suman más que los fallados, ni quedan si después subís el puntaje', () => {
    render(<><TestV2 {...props('#/test/prog-b1/3')} />{global}</>);
    menos('Ejercicios bien resueltos');
    mas('Concepto');
    // Con un solo fallado, ya no se puede sumar otro tipo.
    expect(within(screen.getByRole('group', { name: 'Técnica' })).getByRole('button', { name: 'Sumar 1' }).getAttribute('aria-disabled')).toBe('true');
    mas('Ejercicios bien resueltos');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }));
    expect(estudio().units['prog-b1'][3].tests[0]).toMatchObject({ score: 5, errors: { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 } });
  });

  it('en la app con todo bien: aprueba, agenda la tesis y festeja', () => {
    render(<><TestV2 {...props('#/test/prog-b1/3')} />{global}</>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }));
    const u = estudio().units['prog-b1'][3];
    expect(u.approvedOn).toBe(HOY);
    expect(estudio().reviews.some((r) => r.activityId === 'prog-b1' && r.unit === 3 && r.kind === 'tesis')).toBe(true);
  });

  it('en papel con banco de ejercicios: de a uno, la app corrige y guarda lo que fallaste con su tipo', () => {
    sembrar();
    act(() => { estudio().units.conamat[1].tests = []; });
    const ex = testExercises('conamat', 1, 15, 0, 0);
    expect(ex.length).toBe(15);
    render(<><TestV2 {...props('#/test/conamat/1')} />{global}</>);
    for (let i = 0; i < 15; i++) {
      expect(screen.getByText(`Ejercicio ${i + 1} de 15`)).toBeTruthy();
      // El 3.º y el 7.º salen mal; el resto, bien.
      fireEvent.change(screen.getByRole('textbox', { name: 'Tu resultado' }), { target: { value: i === 2 || i === 6 ? '12345' : ex[i].a } });
      fireEvent.click(screen.getByRole('button', { name: i === 14 ? 'Ver resultado' : 'Siguiente' }));
    }
    expect(screen.getByRole('group', { name: 'Resultado' }).textContent).toMatch(/87\s*%/);
    expect(screen.getByText(/13 de 15 bien/)).toBeTruthy();
    // Cambiar el tipo del primero que falló: descuido → técnica.
    fireEvent.click(screen.getByRole('button', { name: /^Ejercicio 3: Descuido/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar test' }));
    const t = estudio().units.conamat[1].tests[0];
    expect(t).toMatchObject({ score: 13, total: 15, mode: 'papel', approved: true });
    expect(t.errors).toMatchObject({ tecnica: 1, descuido: 1 });
    expect(t.wrong?.map((w) => w.type).sort()).toEqual(['descuido', 'tecnica']);
    expect(estudio().cards.filter((c) => c.activityId === 'conamat' && c.unit === 1 && c.kind === 'ejercicio')).toHaveLength(2);
    expect(estudio().units.conamat[1].approvedOn).toBe('2026-11-22'); // ya estaba aprobada: no se pisa
  });

  it('"Ver todos" lista los ejercicios y salta al elegido', () => {
    render(<TestV2 {...props('#/test/conamat/1')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    const d = dialogo();
    expect(within(d).getAllByRole('button').filter((b) => /^\d+\./.test(b.textContent ?? '')).length).toBe(15);
    fireEvent.click(within(d).getByRole('button', { name: /^5\./ }));
    expect(screen.getByText('Ejercicio 5 de 15')).toBeTruthy();
  });

  it('el test final de un libro: se aprueba con 85 % y deja la tesis final para mañana', () => {
    act(() => { estudio().activities.find((a) => a.id === 'conamat')!.final = { title: 'Examen de aritmética', desc: '40 ejercicios mixtos.' }; });
    render(<><TestV2 {...props('#/test/conamat/final')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Test final' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Examen de aritmética' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }));
    expect(estudio().finales!.conamat.aprobadoOn).toBe(HOY);
    expect(estudio().reviews.some((r) => r.kind === 'tesis' && r.label.startsWith('Tesis final'))).toBe(true);
  });

  it('un test que no existe: lo dice y vuelve a Estudio', () => {
    render(<TestV2 {...props('#/test/conamat/99')} />);
    expect(screen.getByText('No encontré ese test')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir a Estudio' }).getAttribute('href')).toBe('#/estudio');
  });
});

describe('Tesis 2.0', () => {
  it('tres pasos: escribir, practicar y revisar las tarjetas; guarda la tesis y las tarjetas elegidas', () => {
    sembrar();
    render(<><TesisV2 {...props('#/tesis/r-tesis1')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Tesis' })).toBeTruthy();
    expect(screen.getByText(/Empezá por lo que fallaste/i)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Explicalo con tus palabras' }), { target: { value: 'Los enteros incluyen los negativos.\nSumar con signos distintos :: se restan los valores absolutos.\nRestar es sumar su [[opuesto]].' } });
    expect(screen.getByText('2 tarjetas detectadas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir: practicar' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Problema 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Seguir: tarjetas' }));
    const cartas = within(screen.getByRole('region', { name: /2 tarjetas detectadas/ })).getAllByRole('checkbox');
    expect(cartas).toHaveLength(2);
    fireEvent.click(cartas[1]); // la deja afuera
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tesis y 1 tarjeta' }));
    const t = estudio().tesis.find((x) => x.itemId === 'r-tesis1')!;
    expect(t.mode).toBe('app');
    expect(t.practice).toEqual([true, false, false]);
    expect(t.text).toMatch(/Sumar con signos distintos/);
    expect(estudio().cards.filter((c) => c.activityId === 'conamat' && c.unit === 1)).toHaveLength(1);
    expect(estudio().reviews.find((r) => r.id === 'r-tesis1')!.doneOn).toBe(HOY);
    // Guardarla otra vez (volver a abrirla desde la sesión) no duplica la tarjeta.
    const c0 = estudio().cards.find((c) => c.activityId === 'conamat' && c.unit === 1)!;
    act(() => saveTesis(HOY, 'r-tesis1', { text: t.text, mode: 'app', practice: t.practice }, [{ front: ` ${c0.front.toUpperCase()} `, back: c0.back, kind: c0.kind }]));
    expect(estudio().cards.filter((c) => c.activityId === 'conamat' && c.unit === 1)).toHaveLength(1);
  });

  it('sin texto no se puede guardar, y dice por qué', () => {
    sembrar();
    render(<TesisV2 {...props('#/tesis/r-tesis1')} />);
    fireEvent.click(screen.getByRole('radio', { name: '3 · Tarjetas' }));
    expect(screen.getByRole('button', { name: /Guardar tesis/ }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Escribí la tesis para guardarla.')).toBeTruthy();
  });

  it('una tesis que no existe: vacío con salida', () => {
    render(<TesisV2 {...props('#/tesis/nada')} />);
    expect(screen.getByText('No encontré esa tesis')).toBeTruthy();
  });
});

describe('Cold recall 2.0', () => {
  const escribirYComparar = (texto: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Lo que recordás' }), { target: { value: texto } });
    fireEvent.click(screen.getByRole('button', { name: 'Comparar' }));
  };

  it('no deja comparar sin escribir; con texto marca los puntos que aparecen y se corrigen a mano', () => {
    sembrar();
    render(<><RecallV2 {...props('#/recall/r-cold2')} />{global}</>);
    expect(screen.getByRole('button', { name: 'Comparar' }).getAttribute('aria-disabled')).toBe('true');
    escribirYComparar('Restar es sumar el opuesto y el valor absoluto es la distancia al cero, siempre positiva.');
    const puntos = within(screen.getByRole('region', { name: 'Marcá lo que recordaste' })).getAllByRole('checkbox');
    expect(puntos.length).toBeGreaterThanOrEqual(5);
    const marcados = puntos.filter((p) => p.getAttribute('aria-checked') === 'true').length;
    expect(marcados).toBeGreaterThanOrEqual(1);
    const sin = puntos.find((p) => p.getAttribute('aria-checked') === 'false')!;
    fireEvent.click(sin);
    expect(sin.getAttribute('aria-checked')).toBe('true');
  });

  it('guarda con lo que creías y lo que recordaste, agenda lo olvidado y sigue con el test', () => {
    sembrar();
    render(<><RecallV2 {...props('#/recall/r-cold2')} />{global}</>);
    mas('Cuánto creés que recordás', 5);
    escribirYComparar('Restar es sumar el opuesto.');
    fireEvent.click(screen.getByRole('button', { name: 'Ver cómo te fue' }));
    expect(screen.getByRole('group', { name: 'Creías contra recordaste' }).textContent).toMatch(/85\s*%/);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir con el test' }));
    const r = estudio().reviews.find((x) => x.id === 'r-cold2')!;
    expect(r.doneOn).toBe(HOY);
    expect(r.score).toBeLessThan(0.7);
    const at = estudio().attempts.find((a) => a.kind === 'cold' && a.tema === 'conamat:2')!;
    expect(at.creia).toBeCloseTo(0.85);
    expect(estudio().cards.some((c) => c.activityId === 'conamat' && c.unit === 2)).toBe(true);
    expect(estudio().reviews.some((x) => x.kind === 'releer' && x.unit === 2)).toBe(true);
    expect(location.hash).toBe('#/test/conamat/2');
  });

  it('sin puntos clave: avisa y deja agregarlos en una hoja', () => {
    act(() => { estudio().reviews.push({ id: 'r-cold-x', activityId: 'make-it-stick', kind: 'cold', due: HOY, min: 5, label: 'Cold recall · Make It Stick' }); });
    render(<><RecallV2 {...props('#/recall/r-cold-x')} />{global}</>);
    escribirYComparar('algo');
    expect(screen.getByText('Sin puntos clave todavía')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver cómo te fue' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar puntos' }));
    fireEvent.change(within(dialogo()).getByRole('textbox'), { target: { value: 'Espaciar mejora la retención\nPracticar recordar :: más que releer' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar puntos' }));
    expect(within(screen.getByRole('region', { name: 'Marcá lo que recordaste' })).getAllByRole('checkbox')).toHaveLength(2);
  });
});

describe('Unidades 2.0', () => {
  it('una pestaña por libro con capítulos y una fila por unidad con lo que toca hoy; la hoja abre su test', () => {
    sembrar();
    render(<><UnidadesV2 {...props('#/unidades')} />{global}</>);
    const tabs = within(screen.getByRole('tablist', { name: 'Libro' })).getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    expect(tabs[0].textContent).toMatch(/Aritmética/);
    expect(screen.getByText('tesis hoy')).toBeTruthy();
    expect(screen.getByText('cold recall y test hoy')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Números reales/ }));
    const d = dialogo();
    expect(within(d).getByText('Qué incluye el test')).toBeTruthy();
    expect(within(d).getByRole('link', { name: 'Abrir el test' }).getAttribute('href')).toBe('#/test/conamat/1');
    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });
});

describe('Actividad 2.0', () => {
  it('una nueva: pide qué estudiás y un día, y guarda con sus datos', () => {
    render(<><ActividadV2 {...props('#/actividad')} />{global}</>);
    expect(screen.getByRole('button', { name: 'Guardar actividad' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Poné qué vas a estudiar.')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Qué vas a estudiar' }), { target: { value: 'Leer Pensar rápido y lento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Curso' }));
    mas('Por sesión');
    fireEvent.click(screen.getByRole('button', { name: /, martes$/ }));
    const antes = estudio().activities.length;
    fireEvent.click(screen.getByRole('button', { name: 'Guardar actividad' }));
    expect(estudio().activities).toHaveLength(antes + 1);
    const a = estudio().activities.at(-1)!;
    expect(a).toMatchObject({ title: 'Leer Pensar rápido y lento', type: 'curso', unit: 'lecciones', perSession: 21, days: [0, 1, 2, 4], engine: true, testMode: 'app' });
    expect(location.hash).toBe('#/estudio');
  });

  it('sin días no se guarda; el frente nuevo se crea y queda elegido', () => {
    render(<><ActividadV2 {...props('#/actividad')} />{global}</>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Qué vas a estudiar' }), { target: { value: 'Algo' } });
    for (const d of ['lunes', 'miércoles', 'viernes']) fireEvent.click(screen.getByRole('button', { name: new RegExp(`, ${d}$`) }));
    expect(screen.getByText('Elegí al menos un día.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Frente/ }));
    fireEvent.click(within(dialogo()).getByRole('radio', { name: /Nuevo frente/ }));
    fireEvent.change(within(dialogo()).getByRole('textbox', { name: 'Nombre del frente' }), { target: { value: 'Finanzas' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Crear frente' }));
    const f = estudio().fronts.find((x) => x.name === 'Finanzas')!;
    expect(f).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /, martes$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar actividad' }));
    expect(estudio().activities.at(-1)!.front).toBe(f.id);
  });

  it('editar una existente y borrarla con deshacer', async () => {
    render(<><ActividadV2 {...props('#/actividad/make-it-stick')} />{global}</>);
    const caja = screen.getByRole('textbox', { name: 'Qué vas a estudiar' }) as HTMLInputElement;
    expect(caja.value).toBe('Make It Stick');
    fireEvent.change(caja, { target: { value: 'Make It Stick 2' } });
    fireEvent.click(screen.getByRole('switch', { name: /Pasar por el motor de repaso/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar actividad' }));
    const a = estudio().activities.find((x) => x.id === 'make-it-stick')!;
    expect(a.title).toBe('Make It Stick 2');
    expect(a.engine).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Borrar actividad' }));
    expect(estudio().activities.some((x) => x.id === 'make-it-stick')).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    expect(estudio().activities.some((x) => x.id === 'make-it-stick')).toBe(true);
  });
});

describe('Nueva tarjeta 2.0', () => {
  it('pregunta con su dorso: guardar y otra deja el formulario vacío para la siguiente', () => {
    render(<><TarjetaNuevaV2 {...props('#/tarjeta-nueva')} />{global}</>);
    expect(screen.getByRole('button', { name: 'Guardar y otra' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByRole('textbox', { name: 'Frente' }), { target: { value: '¿Qué es el MCD?' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Dorso' }), { target: { value: 'El mayor divisor común' } });
    expect(within(screen.getByRole('group', { name: 'Vista previa de la tarjeta' })).getByText('¿Qué es el MCD?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y otra' }));
    const c = estudio().cards.at(-1)!;
    expect(c).toMatchObject({ front: '¿Qué es el MCD?', back: 'El mayor divisor común', kind: 'pregunta', deck: 'Matemática', frontId: 'math', createdOn: HOY });
    expect((screen.getByRole('textbox', { name: 'Frente' }) as HTMLTextAreaElement).value).toBe('');
  });

  it('completar toma lo de [[ ]] como respuesta; "también al revés" suma la inversa; el ejemplo y la fórmula se agregan al dorso', () => {
    render(<TarjetaNuevaV2 {...props('#/tarjeta-nueva')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Completar' }));
    expect(screen.queryByRole('textbox', { name: 'Dorso' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Frente' }), { target: { value: 'Restar es sumar su [[opuesto]].' } });
    const antes = estudio().cards.length;
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y otra' }));
    expect(estudio().cards).toHaveLength(antes + 1);
    expect(estudio().cards.at(-1)).toMatchObject({ front: 'Restar es sumar su ___.', back: 'opuesto', kind: 'completar' });
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ejemplo' }));
    expect((screen.getByRole('textbox', { name: 'Dorso' }) as HTMLTextAreaElement).value).toBe('Ejemplo: ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Frente' }), { target: { value: 'MCD de 12 y 18' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Dorso' }), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('switch', { name: /También al revés/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y otra' }));
    expect(estudio().cards.slice(-2).map((c) => c.kind)).toEqual(['pregunta', 'inversa']);
    expect(estudio().cards.at(-1)).toMatchObject({ front: '6', back: 'MCD de 12 y 18' });
  });
});

describe('Motor de repaso 2.0', () => {
  it('cada ajuste escribe la regla; lo que está fijo se lee en una hoja', () => {
    render(<><MotorEstudioV2 {...props('#/motor')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Motor de repaso' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Tarjetas nuevas por día' })).getByRole('radio', { name: '30' }));
    expect(estudio().rules.newPerDay).toBe(30);
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Retención buscada' })).getByRole('radio', { name: '95 %' }));
    expect(estudio().rules.retention).toBe(0.95);
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Releer cuando falla' })).getByRole('radio', { name: '80 %' }));
    expect(estudio().rules.rereadBelow).toBe(0.8);
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Tope de repaso por día, en minutos' })).getByRole('radio', { name: '30' }));
    expect(estudio().rules.cap).toBe(30);
    const antes = estudio().rules.shortenIfPerfect;
    fireEvent.click(screen.getByRole('switch', { name: /Saltear lo que ya sabés/ }));
    expect(estudio().rules.shortenIfPerfect).toBe(!antes);
    fireEvent.click(screen.getByRole('button', { name: /Reglas fijas/ }));
    expect(within(dialogo()).getByText(/Test sin aprobar/)).toBeTruthy();
  });

  it('el estado de las tarjetas por mazo, y pegar un bloque las agrega al mazo elegido', () => {
    render(<><MotorEstudioV2 {...props('#/motor')} />{global}</>);
    const base = estudio().cards.length;
    expect(screen.getByRole('heading', { level: 2, name: `Tus ${base} tarjetas` })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Pegar un bloque/ }));
    expect(screen.getByRole('button', { name: 'Agregar tarjetas' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByRole('textbox', { name: 'Bloque de tarjetas' }), { target: { value: 'Menos por menos :: da positivo.\nRestar es sumar su [[opuesto]].' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Fuente' }), { target: { value: 'Claude' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar 2 tarjetas' }));
    expect(estudio().cards).toHaveLength(base + 2);
    expect(estudio().cards[base]).toMatchObject({ front: 'Menos por menos', deck: 'Matemática', frontId: 'math', source: 'Claude' });
    expect((screen.getByRole('textbox', { name: 'Bloque de tarjetas' }) as HTMLTextAreaElement).value).toBe('');
  });

  it('importar un archivo de Anki suma sus tarjetas con el nombre del archivo como fuente; #/motor/importar abre el bloque', async () => {
    const base = estudio().cards.length;
    render(<><MotorEstudioV2 {...props('#/motor/importar')} />{global}</>);
    expect(screen.getByRole('button', { name: /Pegar un bloque/ }).getAttribute('aria-expanded')).toBe('true');
    const archivo = new File(['¿Capital de Francia?\tParís\n¿2+2?\t4\n'], 'geografia.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Importar de Anki'), { target: { files: [archivo] } });
    await waitFor(() => expect(estudio().cards).toHaveLength(base + 2));
    expect(estudio().cards.slice(base).map((c) => c.source)).toEqual(['geografia', 'geografia']);
    expect(estudio().cards[base]).toMatchObject({ front: '¿Capital de Francia?', back: 'París' });
  });
});
