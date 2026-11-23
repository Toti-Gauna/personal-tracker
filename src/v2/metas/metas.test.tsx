import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { periodKey } from '../../data/goals';
import { filasMapa } from '../../data/mapa';
import { BIMESTRES } from '../../data/plan';
import { leerRuta } from '../../lib/routes';
import { lunesDe } from '../../state/plan';
import { addGoal } from '../../state/goals';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { EXTRAS_V2 } from '../extras';
import { entradaDe } from '../Resolutor';
import { PANTALLAS_V2, type PropsV2 } from '../registro';
import AnioV2 from './AnioV2';
import BimestreV2 from './BimestreV2';
import { Columnas } from './Columnas';
import EtapasV2 from './EtapasV2';
import EvolucionV2 from './EvolucionV2';
import MapaV2 from './MapaV2';
import MesV2 from './MesV2';
import NuevaMetaV2 from './NuevaMetaV2';
import RoadmapV2 from './RoadmapV2';
import RutaV2 from './RutaV2';
import SemanaV2 from './SemanaV2';
import { devolverPeriodo, instantanea, rangoCorto, titular } from './datos';

const HOY = '2026-11-23'; // lunes: la semana 1 del plan (PetrIA corre del 21 nov al 9 dic)
const LUNES = lunesDe(HOY);
const global = <GlobalV2 activa="metas" pantalla="metas" pendientes={0} conBarra={false} conCheckins={false} />;
const props = (hash: string): PropsV2 => ({ ruta: leerRuta(hash), day: getState().days[HOY], today: HOY });
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const abrir = (Pantalla: ComponentType<PropsV2>, hash: string) => render(<>{<Pantalla {...props(hash)} />}{global}</>);
const metas = () => getState().goals.goals;
const propia = (titulo: string) => metas().find((g) => g.title === titulo)!;

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Metas 2.0 · qué cubre', () => {
  it('cada ruta convertida llega a su pantalla; lo demás de Metas no es de esta familia', () => {
    const de = (h: string) => entradaDe(leerRuta(h), PANTALLAS_V2, EXTRAS_V2)?.nombre;
    expect(de('#/metas/ruta')).toBe('Ruta');
    expect(de('#/metas/semana')).toBe('Metas de la semana');
    expect(de('#/metas/mes')).toBe('Metas del mes');
    expect(de('#/metas/bimestre')).toBe('Metas del bimestre');
    expect(de('#/metas/bimestre/3')).toBe('Metas del bimestre');
    expect(de('#/metas/anio')).toBe('Metas del año');
    expect(de('#/metas/mapa')).toBe('Mapa por ramas');
    expect(de('#/metas/etapas')).toBe('Etapas');
    expect(de('#/metas/evolucion')).toBe('Evolución');
    expect(de('#/metas/roadmap')).toBe('El plan entero');
    expect(de('#/meta-nueva/semana')).toBe('Meta nueva');
    expect(de('#/meta-nueva')).toBe('Meta nueva');
    // El centro sigue siendo del Plan; lo que no es de esta familia no se cuela.
    expect(de('#/metas')).toBe('Plan');
    for (const h of ['#/metas/ruta/x', '#/metas/bimestre/x', '#/metas/semana/x', '#/metas/mapax']) expect(de(h), h).toBeUndefined();
  });
});

describe('Metas 2.0 · lo que comparten', () => {
  it('el titular corta en el «;» o a las ocho palabras, y las fechas se dicen cortas', () => {
    expect(titular('Remoto y postular a AI/ML Engineer')).toBe('Remoto y postular a AI/ML Engineer');
    expect(titular('PetrIA, VitalIA; certificaciones 1 a 3')).toBe('PetrIA, VitalIA…');
    expect(titular('uno dos tres cuatro cinco seis siete ocho nueve diez')).toBe('uno dos tres cuatro cinco seis siete ocho…');
    expect([rangoCorto('2026-11-23', '2026-11-29'), rangoCorto('2026-11-30', '2026-12-06')]).toEqual(['23 – 29 nov', '30 nov – 6 dic']);
  });

  it('un período de metas vuelve a como estaba (o desaparece si no estaba guardado)', () => {
    const antes = instantanea(getState().plan, 'semanas', LUNES);
    expect(antes).toBeUndefined();
    act(() => { const s = getState(); s.plan.semanas[LUNES] = { confirmado: HOY, metas: [] }; });
    const guardado = instantanea(getState().plan, 'semanas', LUNES)!;
    act(() => devolverPeriodo('semanas', LUNES, undefined));
    expect(getState().plan.semanas[LUNES]).toBeUndefined();
    act(() => devolverPeriodo('semanas', LUNES, guardado));
    expect(getState().plan.semanas[LUNES]?.confirmado).toBe(HOY);
  });

  it('las columnas se leen enteras y la de hoy lleva el trazo', () => {
    const { container } = render(<Columnas nombre="Mejora: tres días" max={1} linea={[0.2, 0.4, 0.6]} columnas={[{ etiqueta: 'a', partes: [{ valor: 0.2 }] }, { partes: [{ valor: 0.4 }] }, { etiqueta: 'hoy', hoy: true, partes: [{ valor: 0.6 }] }]} />);
    expect(screen.getByRole('img', { name: 'Mejora: tres días' })).toHaveAttribute('data-grafico');
    expect(container.querySelectorAll('.mt-col')).toHaveLength(3);
    expect(container.querySelectorAll('.mt-col.hoy')).toHaveLength(1);
    expect(container.querySelector('.mt-cols-linea polyline')).toHaveAttribute('points');
  });
});

describe('Metas 2.0 · la semana', () => {
  it('el marco, las cinco pestañas y el botón de confirmar', () => {
    abrir(SemanaV2, '#/metas/semana');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Metas');
    const pestanas = within(screen.getByRole('navigation', { name: 'Horizonte' }));
    expect(pestanas.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/metas/ruta', '#/metas/semana', '#/metas/mes', '#/metas/bimestre', '#/metas/anio']);
    expect(pestanas.getByRole('link', { name: 'Semana' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Nueva meta de la semana' })).toHaveAttribute('href', '#/meta-nueva/semana');
    expect(screen.getByRole('button', { name: /Confirmar la semana/ })).toBeInTheDocument();
  });

  it('confirmar guarda las metas del plan en la semana y se puede deshacer', () => {
    abrir(SemanaV2, '#/metas/semana');
    expect(getState().plan.semanas[LUNES]).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar la semana/ }));
    expect(getState().plan.semanas[LUNES]?.confirmado).toBe(HOY);
    expect(getState().plan.semanas[LUNES]!.metas.length).toBeGreaterThan(3);
    expect(screen.getByText(/Confirmadas el 23 nov/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().plan.semanas[LUNES]).toBeUndefined();
  });

  it('el «+» de un contador suma lo mismo que en la 1.0 (el contador de la semana)', () => {
    abrir(SemanaV2, '#/metas/semana');
    const antes = JSON.stringify(getState().plan.contadores[LUNES] ?? {});
    fireEvent.click(screen.getAllByRole('button', { name: /^Sumar / })[0]);
    expect(JSON.stringify(getState().plan.contadores[LUNES] ?? {})).not.toBe(antes);
    expect(Object.values(getState().plan.contadores[LUNES]!).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('tocar una meta del plan abre su hoja: cambiar cuánto pide y borrarla (con deshacer)', () => {
    abrir(SemanaV2, '#/metas/semana');
    const fila = screen.getAllByRole('button', { name: /Opciones$/ }).find((b) => /^Postulaciones/.test(b.getAttribute('aria-label') ?? ''))!;
    fireEvent.click(fila);
    const campo = within(dialogo()).getByRole('textbox', { name: /Llegar a/ });
    fireEvent.change(campo, { target: { value: '30' } });
    fireEvent.blur(campo);
    const guardada = () => getState().plan.semanas[LUNES]!.metas.find((m) => /^Postulaciones/.test(m.texto));
    expect(guardada()?.meta).toBe(30);
    const total = getState().plan.semanas[LUNES]!.metas.length;
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la meta' }));
    expect(getState().plan.semanas[LUNES]!.metas.length).toBe(total - 1);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().plan.semanas[LUNES]?.metas.length ?? 0).not.toBe(total - 1);
  });

  it('tus metas: casilla de una tarea, submetas que se tildan y la tira de los siete días', () => {
    act(() => {
      addGoal({ title: 'Pagar el alquiler', area: 'rutina', horizon: 'semana', type: 'tarea', target: 1 }, HOY);
      addGoal({ title: 'Armar el CV', area: 'ing', horizon: 'semana', type: 'contador', target: 2, subs: [{ id: 'a', t: 'Borrador' }, { id: 'b', t: 'Revisión' }] }, HOY);
      addGoal({ title: 'Meditar', area: 'salud', horizon: 'semana', type: 'contador', target: 5, daily: true }, HOY);
    });
    abrir(SemanaV2, '#/metas/semana');
    // Cada rama y cada área son una tarjeta que se abre: se abren todas.
    for (const b of screen.getAllByRole('button').filter((x) => x.getAttribute('aria-expanded') === 'false')) fireEvent.click(b);
    const clave = periodKey('semana', HOY);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pagar el alquiler' }));
    expect(propia('Pagar el alquiler').progress[clave]).toBe(1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Borrador' }));
    expect(propia('Armar el CV').subDone?.[clave]).toEqual(['a']);
    expect(propia('Armar el CV').progress[clave]).toBe(1);
    const lunes = screen.getByRole('button', { name: /^L 23: sin marcar/ });
    fireEvent.click(lunes);
    expect(propia('Meditar').marks).toEqual([HOY]);
    expect(screen.getByRole('button', { name: /^L 23: hecho/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^X 25/ })).toBeDisabled();
  });

  it('borrar una meta tuya se puede deshacer: vuelve en el mismo lugar y con lo que tenía', () => {
    act(() => {
      addGoal({ title: 'Armar el CV', area: 'ing', horizon: 'semana', type: 'contador', target: 2, subs: [{ id: 'a', t: 'Borrador' }, { id: 'b', t: 'Revisión' }] }, HOY);
      addGoal({ title: 'Meditar', area: 'salud', horizon: 'semana', type: 'contador', target: 5 }, HOY);
    });
    const antes = JSON.parse(JSON.stringify(propia('Armar el CV')));
    const posicion = metas().findIndex((g) => g.title === 'Armar el CV');
    abrir(SemanaV2, '#/metas/semana');
    for (const b of screen.getAllByRole('button').filter((x) => x.getAttribute('aria-expanded') === 'false')) fireEvent.click(b);
    fireEvent.click(screen.getByRole('button', { name: /^Armar el CV: 0 de 2.*Opciones$/ }));
    // Una submeta se quita (y vuelve) y después se agrega otra.
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Quitar la submeta Revisión' }));
    expect(propia('Armar el CV').subs).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(propia('Armar el CV')).toEqual(antes);
    fireEvent.change(within(dialogo()).getByRole('textbox', { name: 'Otra submeta' }), { target: { value: 'Subirlo' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar submeta' }));
    expect(propia('Armar el CV').subs?.map((x) => x.t)).toEqual(['Borrador', 'Revisión', 'Subirlo']);
    // Borrarla entera.
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la meta' }));
    expect(metas().some((g) => g.title === 'Armar el CV')).toBe(false);
    const toasts = screen.getAllByRole('button', { name: 'Deshacer' });
    fireEvent.click(toasts[toasts.length - 1]);
    expect(metas().findIndex((g) => g.title === 'Armar el CV')).toBe(posicion);
    expect(propia('Armar el CV').subs).toHaveLength(3);
  });
});

describe('Metas 2.0 · el mes', () => {
  it('el calendario del mes, lo que cierra y las metas del plan con su origen', () => {
    abrir(MesV2, '#/metas/mes');
    expect(screen.getByRole('img', { name: /^Calendario de/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Horizonte' }).querySelector('[aria-current="page"]')).toHaveTextContent('Mes');
    // El plan arranca este mes: sus metas ya figuran confirmadas desde T0.
    expect(screen.getByText(/Confirmadas el 23 nov/)).toBeInTheDocument();
    expect(screen.getAllByText(/del plan/).length).toBeGreaterThan(2);
    expect(screen.getByRole('link', { name: 'Nueva meta del mes' })).toHaveAttribute('href', '#/meta-nueva/mes');
  });

  it('una meta del mes se cambia o se borra desde su hoja, y volver atrás la devuelve', () => {
    abrir(MesV2, '#/metas/mes');
    const total = () => getState().plan.meses['2026-11']?.metas.length ?? 0;
    expect(total()).toBe(0);
    // La primera es de las que armó el plan: al borrarla el mes queda guardado con las demás.
    fireEvent.click(screen.getAllByRole('button', { name: /^Opciones de/ })[0]);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la meta' }));
    expect(total()).toBeGreaterThan(2);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().plan.meses['2026-11']).toBeUndefined();
  });
});

describe('Metas 2.0 · el bimestre', () => {
  it('un botón por bimestre: se elige uno y el de #/metas/bimestre/<n> viene elegido', () => {
    const { unmount } = abrir(BimestreV2, '#/metas/bimestre');
    const tabs = within(screen.getByRole('tablist', { name: 'Bimestres del plan' })).getAllByRole('tab');
    expect(tabs).toHaveLength(BIMESTRES);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    unmount();
    abrir(BimestreV2, '#/metas/bimestre/3');
    expect(within(screen.getByRole('tablist', { name: 'Bimestres del plan' })).getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('el nombre del bimestre se cambia desde el lápiz y se guarda como en la 1.0', () => {
    abrir(BimestreV2, '#/metas/bimestre');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar el nombre del bimestre' }));
    fireEvent.change(within(dialogo()).getByRole('textbox', { name: 'Nombre de B1' }), { target: { value: 'Arranque' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: /Guardar nombre/ }));
    expect(getState().goals.bimesterNames[1]).toBe('Arranque');
    expect(screen.getByRole('heading', { level: 2, name: 'Arranque' })).toBeInTheDocument();
  });

  it('la meta de una rama se reescribe en su hoja y «volver al texto del plan» se puede deshacer', () => {
    abrir(BimestreV2, '#/metas/bimestre');
    fireEvent.click(screen.getByRole('button', { name: /^Salud: .*Cambiar$/ }));
    const campo = within(dialogo()).getByRole('textbox', { name: 'Meta del bimestre' });
    fireEvent.change(campo, { target: { value: 'Correr 10 km' } });
    fireEvent.blur(campo);
    expect(Object.values(getState().plan.editadas)).toEqual(['Correr 10 km']);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Volver al texto del plan' }));
    expect(getState().plan.editadas).toEqual({});
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(Object.values(getState().plan.editadas)).toEqual(['Correr 10 km']);
  });

  it('los hitos del período se marcan desde su hoja', () => {
    abrir(BimestreV2, '#/metas/bimestre');
    fireEvent.click(screen.getByRole('button', { name: /^Hitos del período/ }));
    const casillas = within(dialogo()).getAllByRole('checkbox');
    expect(casillas.length).toBeGreaterThan(0);
    fireEvent.click(casillas[0]);
    expect(Object.values(getState().plan.hitos).some((h) => h.hecho === HOY)).toBe(true);
  });
});

describe('Metas 2.0 · el año', () => {
  it('los seis bimestres, el promedio por mes y una meta por rama que se reescribe', () => {
    abrir(AnioV2, '#/metas/anio');
    const bims = within(screen.getByRole('navigation', { name: 'Bimestres del año 1' })).getAllByRole('link');
    expect(bims.map((a) => a.getAttribute('href'))).toEqual([1, 2, 3, 4, 5, 6].map((n) => `#/metas/bimestre/${n}`));
    expect(screen.getByRole('img', { name: /^Promedio de metas cumplidas por mes/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Salud: .*Cambiar$/ }));
    const campo = within(dialogo()).getByRole('textbox', { name: 'Meta del año' });
    fireEvent.change(campo, { target: { value: 'Llegar a 90 kg' } });
    fireEvent.blur(campo);
    expect(getState().plan.editadas['anio1-salud']).toBe('Llegar a 90 kg');
  });

  it('una meta tuya del año suma con su paso y se muestra con su unidad', () => {
    act(() => { addGoal({ title: 'Ahorrar', area: 'economia', horizon: 'anio', type: 'numero', target: 2000, unit: 'USD', step: 100 }, HOY); });
    abrir(AnioV2, '#/metas/anio');
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 100 a Ahorrar' }));
    expect(propia('Ahorrar').progress[periodKey('anio', HOY)]).toBe(100);
    expect(screen.getByText('USD 100')).toBeInTheDocument();
  });
});

describe('Metas 2.0 · meta nueva', () => {
  it('no guarda sin título y dice por qué; guarda lo mismo que la 1.0 y vuelve a la semana', () => {
    abrir(NuevaMetaV2, '#/meta-nueva/semana');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nueva meta');
    const guardar = screen.getByRole('button', { name: /Guardar meta/ });
    expect(guardar).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Escribí qué querés lograr.')).toBeInTheDocument();
    const antes = metas().length;
    fireEvent.click(guardar);
    expect(metas()).toHaveLength(antes);
    fireEvent.change(screen.getByRole('textbox', { name: '¿Qué querés lograr?' }), { target: { value: 'Ventas de Roofy' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Llegar a' }), { target: { value: '23' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Unidad' }), { target: { value: 'ventas' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Contador' }));
    fireEvent.click(screen.getByRole('switch', { name: /Marcar día por día/ }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar meta/ }));
    const g = propia('Ventas de Roofy');
    expect(g).toMatchObject({ area: 'salud', horizon: 'semana', type: 'contador', target: 7, unit: 'ventas', daily: true, repeat: true, from: periodKey('semana', HOY), progress: {} });
    expect(g.rama).toBeUndefined();
    expect(location.hash).toBe('#/metas/semana');
  });

  it('el horizonte de la ruta viene elegido, y la rama, el área y las submetas se guardan', () => {
    abrir(NuevaMetaV2, '#/meta-nueva/anio');
    expect(screen.getByRole('radio', { name: 'Año' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.change(screen.getByRole('textbox', { name: '¿Qué querés lograr?' }), { target: { value: 'Portfolio' } });
    fireEvent.click(screen.getByRole('button', { name: /^Rama del plan/ }));
    fireEvent.click(within(dialogo()).getByRole('radio', { name: 'Programación' }));
    // Con submetas, la meta se cumple al hacer todas y el tipo ya no se elige.
    fireEvent.click(screen.getByRole('button', { name: /^Agregar submeta/ }));
    fireEvent.change(within(dialogo()).getByRole('textbox', { name: /^Submeta de/ }), { target: { value: 'Diseño' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar y otra' }));
    fireEvent.change(within(dialogo()).getByRole('textbox', { name: /^Submeta de/ }), { target: { value: 'Publicado' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar y cerrar' }));
    expect(screen.queryByRole('radio', { name: 'Tarea' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Guardar meta/ }));
    const g = propia('Portfolio');
    expect(g).toMatchObject({ horizon: 'anio', type: 'contador', target: 2, unit: 'pasos', rama: 'programacion', repeat: false });
    expect(g.subs?.map((x) => x.t)).toEqual(['Diseño', 'Publicado']);
    expect(location.hash).toBe('#/metas/anio');
  });
});

describe('Metas 2.0 · la ruta', () => {
  it('las seis ramas son links a lo suyo; el detalle y los hitos están a un toque', () => {
    abrir(RutaV2, '#/metas/ruta');
    const ramas = within(screen.getByRole('region', { name: 'Las seis ramas' }));
    expect(ramas.getAllByRole('link')).toHaveLength(6);
    expect(ramas.getAllByRole('progressbar')).toHaveLength(6);
    expect(ramas.queryByText(/^Entrega el/)).toBeNull();
    fireEvent.click(ramas.getByRole('button', { name: 'Ver el detalle' }));
    expect(ramas.getAllByText(/Entrega el|Termina el/).length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Los hitos' })).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
    const mas = within(screen.getByRole('region', { name: 'Más de la ruta' }));
    expect(mas.getByRole('link', { name: /Las 4 etapas/ })).toHaveAttribute('href', '#/metas/etapas');
    expect(mas.getByRole('link', { name: /El mapa por ramas/ })).toHaveAttribute('href', '#/metas/mapa');
    expect(screen.getByRole('link', { name: /Cobrado este mes/ })).toHaveAttribute('href', '#/metas/clipping');
    expect(screen.getByRole('img', { name: /^Semana 1 de/ })).toBeInTheDocument();
  });
});

describe('Metas 2.0 · el mapa por ramas', () => {
  it('el mapa y su lista de momentos; elegir un rango y resaltar una rama', () => {
    abrir(MapaV2, '#/metas/mapa');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mapa por ramas');
    expect(screen.getByRole('img', { name: /^Mapa en ramas:/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /HEAD/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '18 meses' }));
    expect(screen.getByRole('radio', { name: '18 meses' })).toHaveAttribute('aria-checked', 'true');
    const chip = screen.getByRole('button', { name: /Idiomas/ });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Todas/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('tocar un hito abre su hoja: se marca hecho (con deshacer)', () => {
    const { plan, study, settings } = getState();
    const f = filasMapa(HOY, 'trimestre', plan, study, settings?.startDate).find((x) => x.hitoId && x.estado !== 'hecho')!;
    expect(f).toBeTruthy();
    abrir(MapaV2, '#/metas/mapa');
    fireEvent.click(screen.getByRole('radio', { name: 'Trimestre' }));
    fireEvent.click(screen.getAllByRole('button').find((b) => b.className.includes('mt-mf-boton') && b.textContent?.includes(f.texto))!);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Marcar hecho' }));
    expect(getState().plan.hitos[f.hitoId!]?.hecho).toBe(HOY);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().plan.hitos[f.hitoId!]?.hecho).toBeUndefined();
  });
});

describe('Metas 2.0 · las etapas y el plan entero', () => {
  it('quién sos hoy, las cuatro etapas con sus bloques y las decisiones', () => {
    abrir(EtapasV2, '#/metas/etapas');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Las 4 etapas');
    expect(screen.getByText('Hoy sos')).toBeInTheDocument();
    for (const n of [1, 2, 3, 4]) expect(screen.getByRole('region', { name: new RegExp(`^Etapa ${n} ·`) })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('region', { name: /^Etapa 1 ·/ })).getByRole('button', { name: /^Los \d+ bloques/ }));
    expect(within(dialogo()).getByRole('link', { name: /^P1 · / })).toHaveAttribute('href', '#/metas/proyecto/P1');
    expect(within(screen.getByRole('region', { name: /^Etapa 1 ·/ })).getByRole('group', { name: /^Etapa 1:/ })).toBeInTheDocument();
  });

  it('el plan entero: cada etapa se abre en sus fases y cada fase en sus bloques', () => {
    abrir(RoadmapV2, '#/metas/roadmap');
    const etapas = screen.getAllByRole('button').filter((b) => /^Etapa \d/.test(b.textContent ?? ''));
    expect(etapas).toHaveLength(4);
    fireEvent.click(etapas[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Fase 1 · / }));
    const d = within(dialogo());
    expect(d.getByRole('link', { name: /PetrIA/ })).toHaveAttribute('href', '#/metas/periodos/P1');
    expect(d.getAllByRole('link').length).toBeGreaterThanOrEqual(4);
  });
});

describe('Metas 2.0 · tu evolución', () => {
  it('la mejora, la constancia, las horas, la ruta y las competencias; el rango cambia el gráfico', () => {
    abrir(EvolucionV2, '#/metas/evolucion');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu evolución');
    expect(screen.getByRole('img', { name: /^Mejora, .*días/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Semana' }));
    expect(screen.getByRole('img', { name: /^Mejora, últimas 12 semanas/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Constancia de las últimas 15 semanas/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Horas por mes/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Avance acumulado por bimestre/ })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /: hoy \d+ de 100; meta del año 1/ })).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Análisis' })).toHaveAttribute('href', '#/metas/analisis');
  });
});
