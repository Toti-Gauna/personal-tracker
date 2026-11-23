import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toMin } from '../../data/time';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { saltear } from '../../state/dia';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PRESUPUESTO, contarPalabras } from '../reglas';
import { PANTALLAS_V2 } from '../registro';
import { ahoraDe, colorV2, destinoDe, etiquetaLinda, filasLinea, momento, nombreHabito, resumenDia, sinPuntoSuelto, textoPasos } from './datos';
import HoyV2 from './HoyV2';

const HOY = '2026-11-23'; // lunes
const dia = () => getState().days[HOY];
const bloque = (k: string) => dia().blocks.find((b) => b.key === k)!;
const a = (hhmm: string) => toMin(hhmm);

function reloj(hhmm: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${HOY}T${hhmm}:00`));
}
/** Hoy con lo global de la 2.0 (avisos y el puente de los avisos de la 1.0), como en la app. */
const Pantalla = () => <><HoyV2 ruta={leerRuta('#/hoy')} day={dia()} today={HOY} /><GlobalV2 activa="hoy" pendientes={0} conBarra={false} conMini={false} /></>;
/** Renderiza Hoy y lo vuelve a dibujar con el día del store después de cada acción. */
function hoy(hhmm = '09:30') {
  reloj(hhmm);
  const r = render(<Pantalla />);
  return { ...r, otra: () => r.rerender(<Pantalla />) };
}

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); vi.useRealTimers(); });

describe('Hoy 2.0 · lo que decide la pantalla', () => {
  it('el héroe: lo de ahora si no está hecho; si no, lo próximo sin hacer; sin nada por delante, el cierre', () => {
    const d = dia();
    expect(ahoraDe(d, a('05:00'))).toMatchObject({ tipo: 'ahora', bloque: { key: 'prog' }, minutos: 210, despues: { key: 'abi' } });
    expect(ahoraDe(d, a('05:00'))).toHaveProperty('avance', 30 / 240);
    const hecho = { ...d, blocks: d.blocks.map((b) => (b.key === 'prog' ? { ...b, tasks: b.tasks.map((t) => ({ ...t, done: true })) } : b)) };
    expect(ahoraDe(hecho, a('05:00'))).toMatchObject({ tipo: 'proximo', bloque: { key: 'abi' }, minutos: 210 });
    const todo = { ...d, blocks: d.blocks.map((b) => ({ ...b, tasks: b.tasks.map((t) => ({ ...t, done: true })) })) };
    expect(ahoraDe(todo, a('12:00'))).toEqual({ tipo: 'fin', pendientes: 0 });
    expect(ahoraDe({ ...d, closed: { at: '21:10', xp: 120, score: 1, victoria: '', manana: '' } }, a('12:00'))).toEqual({ tipo: 'cerrado' });
  });

  it('las salteadas no cuentan para "ahora" ni para el resumen', () => {
    act(() => saltear(HOY, 'prog', true));
    expect(ahoraDe(dia(), a('05:00'))).toMatchObject({ tipo: 'proximo', bloque: { key: 'abi' } });
    expect(resumenDia(dia())).toMatchObject({ metas: 13, hechas: 0, pasos: 24 });
  });

  it('la línea: una fila por meta con su estado, y la marca de "ahora" solo si la hora cae en un hueco', () => {
    const conAhora = filasLinea(dia(), a('09:30'));
    expect(conAhora.filter((f) => f.tipo === 'ahora')).toHaveLength(0);
    expect(conAhora.map((f) => (f.tipo === 'bloque' ? f.estado : 'marca')).slice(0, 4)).toEqual(['pasada', 'pasada', 'ahora', 'futura']);
    act(() => saltear(HOY, 'abi', true));
    const hueco = filasLinea(dia(), a('09:30'));
    expect(hueco.map((f) => (f.tipo === 'bloque' ? f.estado : `marca ${f.hora}`)).slice(2, 5)).toEqual(['salteada', 'marca 09:30', 'futura']);
  });

  it('el foco: rutina y dormir no lo abren; estudio va a su sesión; entreno, a Entreno', () => {
    const ctx = { focus: null, study: getState().study, train: getState().train };
    expect(destinoDe(bloque('rutina'), dia(), ctx)).toBeNull();
    expect(destinoDe(bloque('trabajo'), dia(), ctx)).toEqual({ ruta: 'elegir/trabajo', etiqueta: 'Entrar en foco' });
    expect(destinoDe(bloque('entreno'), dia(), ctx)).toEqual({ ruta: 'entreno', etiqueta: 'Ir a entrenar' });
    expect(destinoDe(bloque('trabajo'), dia(), { ...ctx, focus: { date: HOY, key: 'trabajo' } as never })).toEqual({ ruta: 'foco', etiqueta: 'Volver al foco' });
  });

  it('los textos: cada número con su rótulo, la rama con su nombre y sin punto suelto al empezar un renglón', () => {
    expect([textoPasos(0, 0), textoPasos(0, 1), textoPasos(1, 1), textoPasos(0, 3), textoPasos(2, 3)]).toEqual(['sin pasos', '1 paso', '1 paso hecho', '3 pasos', '2 de 3 pasos']);
    expect(momento({ start: '08:30', min: 90 }, a('09:30'))).toEqual({ rango: '08:30–10:00', texto: 'Ahora · quedan 30 min' });
    expect(momento({ start: '21:00', min: 420 }, a('12:00')).rango).toBe('21:00–04:00');
    expect(etiquetaLinda('programacion · P1 · semana 1 de 3')).toBe('Programación · P1 · semana 1 de 3');
    expect(etiquetaLinda('fuera del plan')).toBe('Fuera del plan');
    expect(sinPuntoSuelto('Programación · PetrIA')).toBe('Programación · PetrIA');
    expect(nombreHabito('Weekly review (hours, comprehension debt)')).toBe('Weekly review');
    expect(colorV2('var(--ing)')).toBe('var(--a-ing)');
    expect(colorV2('var(--tinta)')).toBe('var(--texto)');
  });
});

describe('Hoy 2.0 · la pantalla', () => {
  it('está registrada: con la 2.0 prendida, Hoy es la pantalla nueva', () => {
    expect(PANTALLAS_V2.hoy).toMatchObject({ nombre: 'Hoy' });
  });

  it('responde las tres preguntas arriba: dónde estoy, cómo voy y qué hago ahora', () => {
    hoy('09:30');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hoy');
    expect(screen.getByText('Lunes 23 nov · día 1')).toBeInTheDocument();
    const heroe = screen.getByRole('region', { name: 'Ahora' });
    expect(within(heroe).getByText('Ahora · 08:30–10:00')).toBeInTheDocument();
    expect(within(heroe).getByText('Abi + correr')).toBeInTheDocument();
    expect(within(heroe).getByRole('img', { name: 'Tiempo de Abi + correr: 67 %' })).toHaveTextContent('30 min');
    expect(within(heroe).getByRole('button', { name: /Trabajo actual/ })).toHaveTextContent('Después');
    const dia0 = screen.getByRole('region', { name: 'Tu día' });
    expect(within(dia0).getByText('0 de 14')).toBeInTheDocument();
    expect(within(dia0).getByText('Metas')).toBeInTheDocument();
    expect(contarPalabras(screen.getByRole('heading', { level: 1 }).textContent!.trim())).toBeLessThanOrEqual(PRESUPUESTO.titulo);
  });

  it('la línea del día: las 14 metas como filas que se leen enteras, con la hora, el estado y los pasos con su rótulo', () => {
    hoy('09:30');
    const linea = within(screen.getByRole('region', { name: 'El día' }));
    expect(linea.getAllByRole('listitem')).toHaveLength(14);
    expect(linea.getByRole('button', { name: /^08:30, Abi \+ correr, ahora\. 1 h 30 · 2 pasos$/ })).toBeInTheDocument();
    expect(linea.getByRole('button', { name: /^04:00, .*, sin hacer\. 30 min · 2 pasos$/ })).toBeInTheDocument();
  });

  it('tildar los pasos en el héroe cumple la meta, avisa cuánto suma y el héroe pasa a lo próximo', () => {
    const { otra } = hoy('09:30');
    const heroe = () => screen.getByRole('region', { name: /Ahora|Lo próximo/ });
    for (const c of within(heroe()).getAllByRole('checkbox')) { fireEvent.click(c); otra(); }
    expect(bloque('abi').tasks.every((t) => t.done)).toBe(true);
    expect(screen.getAllByRole('status').map((x) => x.textContent).join(' ')).toMatch(/Meta 3 cumplida · \+0,071 %/);
    expect(within(heroe()).getByText('Lo próximo · 10:00')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Tu día' })).getByText('1 de 14')).toBeInTheDocument();
  });

  it('el botón del héroe lleva al foco de esa meta', () => {
    hoy('10:30');
    expect(within(screen.getByRole('region', { name: 'Ahora' })).getByRole('link', { name: 'Entrar en foco' })).toHaveAttribute('href', '#/elegir/trabajo');
  });

  it('la hoja de una meta: agregar, editar y borrar un paso (con deshacer)', () => {
    const { otra } = hoy('09:30');
    fireEvent.click(screen.getByRole('button', { name: /^10:00, Trabajo actual/ }));
    const hoja = () => screen.getByRole('dialog', { name: 'Trabajo actual' });
    fireEvent.change(within(hoja()).getByRole('textbox', { name: 'Nuevo paso' }), { target: { value: 'Responder el mail' } });
    fireEvent.click(within(hoja()).getByRole('button', { name: 'Agregar' }));
    otra();
    expect(bloque('trabajo').tasks.map((t) => t.t)).toEqual(['Tarea principal del trabajo', 'Responder el mail']);
    fireEvent.click(within(hoja()).getByRole('button', { name: 'Editar: Responder el mail' }));
    fireEvent.change(within(hoja()).getByRole('textbox', { name: 'Texto del paso' }), { target: { value: 'Responder al cliente' } });
    fireEvent.click(within(hoja()).getByRole('button', { name: 'Guardar' }));
    otra();
    expect(bloque('trabajo').tasks[1].t).toBe('Responder al cliente');
    fireEvent.click(within(hoja()).getByRole('button', { name: 'Editar: Responder al cliente' }));
    fireEvent.click(within(hoja()).getByRole('button', { name: 'Borrar el paso' }));
    otra();
    expect(bloque('trabajo').tasks).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(bloque('trabajo').tasks).toHaveLength(2);
  });

  it('dar por hecho con nota, y deshacerlo', () => {
    const { otra } = hoy('09:30');
    fireEvent.click(screen.getByRole('button', { name: /^10:00, Trabajo actual/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Dar por hecho/ }));
    const vista = screen.getByRole('dialog', { name: 'Dar por hecho' });
    expect(vista).toHaveTextContent('Queda 1 paso sin tildar: no pasa a mañana.');
    fireEvent.change(within(vista).getByRole('textbox'), { target: { value: 'La reunión no se dio' } });
    fireEvent.click(within(vista).getByRole('button', { name: 'Dar por hecho' }));
    otra();
    expect(bloque('trabajo').hecho).toMatchObject({ nota: 'La reunión no se dio' });
    expect(screen.getAllByRole('status').map((x) => x.textContent).join(' ')).toMatch(/Meta 4 cumplida/);
    fireEvent.click(screen.getByRole('button', { name: /^10:00, Trabajo actual, hecha\. 2 h · dada por hecha$/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Trabajo actual' })).getByRole('button', { name: 'Deshacer' }));
    expect(bloque('trabajo').hecho).toBeUndefined();
  });

  it('cambiar el horario: si lo que sigue pasa de la hora de dormir lo dice, y acortando se guarda', () => {
    const { otra } = hoy('09:30');
    fireEvent.click(screen.getByRole('button', { name: /^16:55, Trazo recall/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Cambiar horario/ }));
    const vista = () => screen.getByRole('dialog', { name: 'Cambiar horario' });
    expect(within(vista()).getByRole('textbox', { name: 'Empieza: hora' })).toHaveValue('16');
    fireEvent.click(within(vista()).getByRole('button', { name: 'Sumar 5' }));
    fireEvent.click(within(vista()).getByRole('button', { name: 'Guardar' }));
    expect(within(vista()).getByRole('alert')).toHaveTextContent(/pasan de dormir/);
    expect(bloque('recall').min).toBe(20);
    fireEvent.click(within(vista()).getByRole('radio', { name: 'Acortar lo que sigue' }));
    fireEvent.click(within(vista()).getByRole('button', { name: 'Guardar' }));
    otra();
    expect(bloque('recall').min).toBe(25);
    expect(bloque('sueno').start).toBe('21:00');
    expect(screen.getByRole('dialog', { name: /Trazo recall/ })).toBeInTheDocument();
  });

  it('saltear una meta la saca de la mejora y se puede volver', () => {
    const { otra } = hoy('09:30');
    fireEvent.click(screen.getByRole('button', { name: /^10:00, Trabajo actual/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Saltear hoy/ }));
    otra();
    expect(bloque('trabajo').salteado).toBe(true);
    expect(within(screen.getByRole('region', { name: 'Tu día' })).getByText('0 de 13')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver a hoy' }));
    expect(bloque('trabajo').salteado).toBeFalsy();
  });

  it('"⋯" junta las herramientas, y desde ahí se suma una meta para hoy', () => {
    const { otra } = hoy('09:30');
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    const mas = screen.getByRole('dialog', { name: 'Hoy' });
    expect(within(mas).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['#/ajustes-rutinas/hoy', '#/pomodoros', '#/json', '#/importar']);
    fireEvent.click(within(mas).getByRole('button', { name: /Meta para hoy/ }));
    otra();
    const nueva = screen.getByRole('dialog', { name: 'Meta para hoy' });
    expect(within(nueva).getByRole('button', { name: 'Sumar a hoy' })).toHaveAccessibleDescription('Ponele un nombre.');
    fireEvent.change(within(nueva).getByRole('textbox', { name: 'Qué es' }), { target: { value: 'Reunión con el cliente' } });
    otra();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Meta para hoy' })).getByRole('button', { name: 'Sumar a hoy' }));
    expect(dia().blocks.filter((b) => b.propia).map((b) => b.title)).toEqual(['Reunión con el cliente']);
    expect(dia().blocks).toHaveLength(15);
  });

  it('el plan en tres filas y los avisos juntos en la campana', () => {
    hoy('09:30');
    const plan = within(screen.getByRole('region', { name: 'Plan' }));
    expect(plan.getByRole('link', { name: /Fase 1 › PetrIA › v1\.0/ })).toHaveAttribute('href', expect.stringContaining('#/metas/periodos/'));
    expect(plan.getByRole('button', { name: /Vencen hoy/ })).toBeInTheDocument();
    expect(plan.getByRole('link', { name: /Próximo límite/ })).toHaveTextContent(/día/);
    fireEvent.click(screen.getByRole('button', { name: /^Avisos: \d+$/ }));
    const avisos = screen.getByRole('dialog', { name: 'Avisos' });
    expect(within(avisos).getAllByRole('article').length).toBeGreaterThan(0);
    expect(within(avisos).getAllByRole('link', { name: 'Ver' }).length).toBeGreaterThan(0);
  });

  it('los hábitos: se marcan con un botón de verdad (tilda los pasos de su meta) y se deshace', () => {
    const { otra } = hoy('09:30');
    const habitos = () => within(screen.getByRole('region', { name: 'Hábitos' }));
    expect(habitos().getAllByRole('listitem')).toHaveLength(5);
    expect(habitos().getByText('Hoy · 17:15 · Racha: 0')).toBeInTheDocument();
    expect(habitos().queryByRole('button', { name: 'Marcar hecho: LinkedIn post' })).toBeNull(); // hoy no toca
    fireEvent.click(habitos().getByRole('button', { name: 'Marcar hecho: Trazo recall' }));
    otra();
    expect(bloque('recall').tasks.every((t) => t.done)).toBe(true);
    expect(habitos().getByText('Hecho hoy · Racha: 1')).toBeInTheDocument();
    expect(habitos().queryByRole('button', { name: 'Marcar hecho: Trazo recall' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(bloque('recall').tasks.some((t) => t.done)).toBe(false);
  });

  it('los contadores de la semana suman con un botón con nombre', () => {
    const { otra } = hoy('09:30');
    const semana = () => within(screen.getByRole('region', { name: 'Esta semana' }));
    fireEvent.click(semana().getByRole('button', { name: /^Sumar 1: Postulación/ }));
    otra();
    expect(semana().getByText(/^1 de \d+$/)).toBeInTheDocument();
  });

  it('sin nada por delante invita a cerrar el día; cerrado, muestra el XP', () => {
    act(() => { for (const b of dia().blocks) saltear(HOY, b.key, true); });
    const { unmount } = hoy('12:00');
    expect(within(screen.getByRole('region', { name: 'Fin del día' })).getByRole('link', { name: 'Cerrar el día' })).toHaveAttribute('href', '#/cierre');
    unmount();
    vi.useRealTimers();
    reloj('21:30');
    const cerrado = { ...dia(), closed: { at: '21:10', xp: 120, score: 1, victoria: '', manana: '' } };
    render(<HoyV2 ruta={leerRuta('#/hoy')} day={cerrado} today={HOY} />);
    expect(screen.getByRole('region', { name: 'Día cerrado' })).toHaveTextContent('Día cerrado · 21:10');
    expect(screen.getAllByRole('link', { name: /Día cerrado|Ver el cierre/ }).length).toBeGreaterThan(0);
  });
});
