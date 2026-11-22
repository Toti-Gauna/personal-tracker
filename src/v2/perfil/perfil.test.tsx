import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEALS } from '../../data/profile';
import { addDays } from '../../data/time';
import type { DayLog } from '../../data/types';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, setState, startDay, updateDay } from '../../state/store';
import { claimSeal, syncSeals } from '../../state/profile';
import { addWeight } from '../../state/train';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2 } from '../registro';
import AvanceV2 from './AvanceV2';
import { Calor } from './Calor';
import CierreV2 from './CierreV2';
import { mapaDelAnio, nivelDe, resumen, ultimosDias } from './datos';
import LogroV2 from './LogroV2';
import PerfilV2 from './PerfilV2';
import { SelloDe, SelloInclinable, SelloV2 } from './Sello';
import { CONTORNO, FORMA_DE_GRUPO } from './formas';

const HOY = '2026-11-23';
const dia = () => getState().days[HOY];
const global = <GlobalV2 activa="perfil" pantalla="perfil" pendientes={0} conBarra={false} conCheckins={false} />;
const props = (hash: string) => ({ ruta: leerRuta(hash), day: dia(), today: HOY });
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };

/** Tilda las tareas de los primeros `n` bloques de un día. */
const hacer = (d: DayLog, n: number): DayLog => ({ ...d, blocks: d.blocks.map((b, i) => (i < n ? { ...b, tasks: b.tasks.map((t) => ({ ...t, done: true })) } : b)) });
/** Carga días pasados cerrados (copias del de hoy), cada uno con `n` metas cumplidas. */
function historia(dias: number, n = 2) {
  act(() => setState((s) => {
    const days = { ...s.days };
    for (let k = 1; k <= dias; k++) {
      const fecha = addDays(HOY, -k);
      const d = hacer({ ...s.days[HOY], date: fecha }, n);
      const hechas = d.blocks.flatMap((b) => b.tasks).filter((t) => t.done).length;
      days[fecha] = { ...d, closed: { at: '21:40', xp: hechas * 4 + n * 10, score: hechas / d.blocks.flatMap((b) => b.tasks).length, victoria: '', manana: '' }, study: [{ front: s.study.fronts[0].id, activityId: '', min: 60 }] };
    }
    return { ...s, days };
  }));
}

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); vi.restoreAllMocks(); });

describe('Perfil 2.0 · qué cubre', () => {
  it('Perfil, Avance, el cierre y el sello nuevo son 2.0; el cierre y el sello son parte de otras', () => {
    for (const k of ['perfil', 'avance', 'cierre', 'logro'] as const) expect(PANTALLAS_V2[k], k).toBeTruthy();
    expect(PANTALLAS_V2.cierre!.parte).toBe(true);
    expect(PANTALLAS_V2.logro!.parte).toBe(true);
    expect(PANTALLAS_V2.perfil!.parte).toBeUndefined();
    expect(PANTALLAS_V2.avance!.cubre).toBeUndefined(); // la presentación también es 2.0
  });
});

describe('Perfil 2.0 · los datos', () => {
  it('el nivel de un día: sin datos, nada, algo, la mitad o más y casi todo', () => {
    expect([null, 0, 0.3, 0.5, 0.84, 0.85, 1].map(nivelDe)).toEqual([0, 1, 2, 3, 3, 4, 4]);
  });

  it('el año son doce meses desde el mes en que empezaste, con hoy marcado una vez y lo que viene como futuro', () => {
    historia(3);
    const m = mapaDelAnio(getState().days, HOY, '2026-10-12');
    expect(m.filas.map((f) => f.clave)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09']);
    expect(m.filas.map((f) => f.celdas.length)).toEqual([31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30]);
    expect(m.filas.map((f) => f.letra).join('')).toBe('ONDEFMAMJJAS');
    const todas = m.filas.flatMap((f) => f.celdas);
    expect(todas.filter((c) => c.hoy).map((c) => c.fecha)).toEqual([HOY]);
    expect(todas.find((c) => c.fecha === '2026-11-24')!.futuro).toBe(true);
    expect(todas.find((c) => c.fecha === '2026-11-22')!.nivel).toBeGreaterThan(1);
    expect(todas.find((c) => c.fecha === '2026-11-10')!.nivel).toBe(0);
    expect(m.cargados).toBe(4);
    expect(m.promedio).toBeGreaterThan(0);
    expect([m.desde, m.hasta]).toEqual(['2026-10-01', '2027-09-30']);
  });

  it('pasado el primer año, el mapa muestra el año en el que estás', () => {
    const m = mapaDelAnio({}, '2027-12-05', '2026-10-12');
    expect(m.filas[0].clave).toBe('2027-10');
    expect(m.filas[11].clave).toBe('2028-09');
    expect(m.filas[4].celdas).toHaveLength(29); // febrero de 2028, bisiesto
    expect(m.cargados).toBe(0);
    expect(m.promedio).toBeNull();
  });

  it('los últimos días con su mejora, y el resumen sin nada privado', () => {
    historia(2, 1);
    const u = ultimosDias(getState().days, HOY, 4);
    expect(u.map((d) => d.fecha)).toEqual(['2026-11-20', '2026-11-21', '2026-11-22', HOY]);
    expect(u.map((d) => d.cargado)).toEqual([false, true, true, true]);
    expect(u[1].mejora).toBeGreaterThan(0);
    act(() => { syncSeals(HOY); addWeight(HOY, 82.8); });
    const r = resumen(getState(), HOY);
    expect(r).toMatchObject({ dias: 3, racha: 2, mejorRacha: 2, nivel: 1, sellosTotal: 24, entrenos: 0, minutosEstudio: 120 });
    expect(r.sellos).toBeGreaterThan(0);
    expect(r.xp).toBe(r.haciaElProximo);
    expect(JSON.stringify(r)).not.toContain('82.8');
  });
});

describe('Perfil 2.0 · las siluetas de los sellos', () => {
  it('cada grupo tiene la suya, y las cuatro son distintas', () => {
    expect(FORMA_DE_GRUPO).toEqual({ constancia: 'moneda', cuerpo: 'hexagono', estudio: 'escudo', trabajo: 'roseton' });
    expect(new Set(Object.values(CONTORNO)).size).toBe(4);
    for (const d of Object.values(CONTORNO)) expect(d).toMatch(/^M[\d. ]+[A-Za-z]/); // arranca arriba al centro
  });

  it('el sello de una definición toma el grupo: un hexágono para Cuerpo, un escudo para Estudio', () => {
    const def = (id: string) => SEALS.find((d) => d.id === id)!;
    const { container } = render(<><SelloDe def={def('primer-entreno')} ganado nombre="Primer entreno" /><SelloDe def={def('primer-capitulo')} ganado nombre="Primer capítulo" /><SelloDe def={def('mvp')} ganado={false} nombre="MVP" /></>);
    expect(screen.getByRole('img', { name: 'Primer entreno' }).getAttribute('data-forma')).toBe('hexagono');
    expect(screen.getByRole('img', { name: 'Primer capítulo' }).getAttribute('data-forma')).toBe('escudo');
    expect(screen.getByRole('img', { name: 'MVP (bloqueado)' }).getAttribute('data-forma')).toBe('roseton');
    expect(container.querySelectorAll('.sl-canto')).toHaveLength(2);
  });

  it('bloqueado con camino dibuja el anillo de avance sobre el contorno (de 0 a 1); sin camino, no', () => {
    const { container, rerender } = render(<SelloV2 marca="30" color="var(--ing)" grupo="constancia" ganado={false} progreso={0.6} />);
    const anillo = container.querySelector<SVGPathElement>('.sl-avance')!;
    expect(anillo.getAttribute('pathLength')).toBe('1');
    expect(anillo.style.strokeDashoffset).toBe('0.4');
    rerender(<SelloV2 marca="30" color="var(--ing)" ganado={false} progreso={0} />);
    expect(container.querySelector('.sl-avance')).toBeNull();
    rerender(<SelloV2 marca="30" color="var(--ing)" ganado={false} />);
    expect(container.querySelector('.sl-avance')).toBeNull();
    rerender(<SelloV2 marca="30" color="var(--ing)" ganado progreso={0.6} />);
    expect(container.querySelector('.sl-avance')).toBeNull(); // un sello ganado ya no mide nada
  });

  it('el sello grande se inclina hacia el puntero y vuelve a su lugar al soltarlo', () => {
    const { container } = render(<SelloInclinable marca="7" color="var(--ing)" ganado lado={176} nombre="7 seguidos" />);
    const caja = container.querySelector<HTMLElement>('.sl-inclinable')!;
    caja.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(caja, { clientX: 200, clientY: 100 });
    expect(caja.classList.contains('sl-vivo')).toBe(true);
    expect(caja.style.getPropertyValue('--ry')).toBe('17.0deg'); // la derecha: gira hacia ese lado
    expect(caja.style.getPropertyValue('--rx')).toBe('0.0deg');
    expect(caja.style.getPropertyValue('--fx')).toBe('150'); // el brillo, hasta el borde
    fireEvent.pointerMove(caja, { clientX: 100, clientY: 0 });
    expect(caja.style.getPropertyValue('--rx')).toBe('17.0deg');
    fireEvent.pointerLeave(caja);
    expect(caja.classList.contains('sl-vivo')).toBe(false);
    expect(caja.style.getPropertyValue('--ry')).toBe('');
  });
});

describe('Perfil 2.0 · el sello y el año', () => {
  it('ganado tiene metal y brillo; bloqueado, solo el contorno', () => {
    const { container, rerender } = render(<SelloV2 marca="7" color="var(--ing)" ganado nombre="7 seguidos" />);
    const sello = screen.getByRole('img', { name: '7 seguidos' });
    expect(sello.classList.contains('sl-ganado')).toBe(true);
    expect(sello.style.getPropertyValue('--sl-c')).toBe('var(--a-ing)');
    expect(container.querySelector('.sl-brillo')).toBeTruthy();
    expect(container.querySelector('radialGradient')).toBeTruthy();
    rerender(<SelloV2 marca="30" color="var(--ing)" ganado={false} nombre="30 seguidos" />);
    expect(screen.getByRole('img', { name: '30 seguidos (bloqueado)' }).classList.contains('sl-bloqueado')).toBe(true);
    expect(container.querySelector('.sl-brillo')).toBeNull();
    expect(container.querySelector('.sl-hueco')).toBeTruthy();
  });

  it('el año dibuja una celda por día, con hoy una sola vez', () => {
    historia(5);
    const { container } = render(<Calor mapa={mapaDelAnio(getState().days, HOY, HOY)} nombre="El año" />);
    expect(screen.getByRole('img', { name: 'El año' })).toBeTruthy();
    expect(container.querySelectorAll('.ca-mes')).toHaveLength(12);
    expect(container.querySelectorAll('.ca-dias > i')).toHaveLength(365);
    expect(container.querySelectorAll('.ca-hoy')).toHaveLength(1);
    expect(container.querySelectorAll('.ca-dias > .ca-n2, .ca-dias > .ca-n3, .ca-dias > .ca-n4').length).toBe(5);
  });
});

describe('Perfil 2.0 · la pantalla', () => {
  const abrir = () => render(<><PerfilV2 {...props('#/perfil')} />{global}</>);

  it('la identidad: nombre, anillo del nivel, XP y los cuatro números', () => {
    historia(3);
    act(() => { syncSeals(HOY); });
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: /Perfil/ })).toBeTruthy();
    const tarjeta = screen.getByRole('region', { name: 'Tu nivel' });
    expect(within(tarjeta).getByRole('heading', { level: 2, name: 'Toti' })).toBeTruthy();
    const r = resumen(getState(), HOY);
    expect(within(tarjeta).getByRole('img', { name: new RegExp(`^Nivel ${r.nivel}, `) })).toBeTruthy();
    expect(within(tarjeta).getByText(`${r.xp.toLocaleString('es-AR')} XP`)).toBeTruthy();
    expect(within(tarjeta).getByText(`${r.sellos}/24`)).toBeTruthy();
    expect(within(tarjeta).getByText('4')).toBeTruthy(); // días cargados
    expect(screen.getByRole('link', { name: 'Ajustes' }).getAttribute('href')).toBe('#/ajustes');
  });

  it('el año, los hitos más cercanos y los 24 sellos en sus cuatro grupos', () => {
    historia(3);
    act(() => { syncSeals(HOY); });
    abrir();
    expect(within(screen.getByRole('region', { name: 'El año' })).getByRole('img', { name: /^El año, día por día: 4 días cargados/ })).toBeTruthy();
    const hitos = within(screen.getByRole('region', { name: 'Próximos hitos' })).getAllByRole('button');
    expect(hitos.length).toBeGreaterThan(0);
    expect(hitos.length).toBeLessThanOrEqual(3);
    expect(hitos.some((h) => /^7 seguidos: /.test(h.getAttribute('aria-label') ?? ''))).toBe(true);
    const sellos = screen.getByRole('region', { name: 'Sellos' });
    for (const g of ['Constancia', 'Cuerpo', 'Estudio', 'Trabajo']) expect(within(within(sellos).getByRole('region', { name: g })).getAllByRole('button')).toHaveLength(6);
    expect(within(sellos).getByRole('button', { name: 'Hombre nuevo: ganado' })).toBeTruthy();
    expect(within(sellos).getByRole('button', { name: /^100 días: bloqueado, 3 %$/ })).toBeTruthy(); // lleva el 3 % del camino
    expect(within(sellos).getByRole('button', { name: 'Mitad del camino: bloqueado' })).toBeTruthy(); // sin pesajes no hay camino que medir
  });

  it('un sello abre su hoja: cómo se gana, cuánto falta o cuándo lo ganaste', () => {
    historia(3);
    act(() => { syncSeals(HOY); });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Hombre nuevo: ganado' }));
    expect(within(dialogo()).getByText('Empezar el día 0 de la ruta.')).toBeTruthy();
    expect(within(dialogo()).getByText(/^Ganado el .* · \+50 XP$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^100 días: bloqueado/ }));
    expect(within(dialogo()).getByText('3 días cerrados')).toBeTruthy();
    expect(within(dialogo()).getByRole('progressbar', { name: '100 días: avance' })).toBeTruthy();
  });

  it('los sellos que marcás vos se marcan y se quitan desde la hoja, con deshacer', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'MVP de Handyx: bloqueado' }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Marcar como logrado' }));
    expect(getState().profile.seals.mvp).toBe(HOY);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Quitar el sello' }));
    expect(getState().profile.seals.mvp).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getState().profile.seals.mvp).toBe(HOY);
  });

  it('el historial en su hoja, y Avance y el portfolio a un toque', () => {
    historia(2);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^Historial/ }));
    expect(within(dialogo()).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /^Avance/ }).getAttribute('href')).toBe('#/avance');
    expect(screen.getByRole('link', { name: /^Portfolio agéntico/ }).getAttribute('href')).toBe('#/metas/proyecto');
  });

  it('la vitrina muestra lo último que ganaste: el más nuevo al centro y más grande', () => {
    act(() => { claimSeal('hombre-nuevo', '2026-11-01'); claimSeal('siete', '2026-11-10'); claimSeal('madrugador', '2026-11-20'); claimSeal('primer-entreno', '2026-11-22'); });
    abrir();
    const vitrina = within(screen.getByRole('region', { name: 'Lo último' }));
    const botones = vitrina.getAllByRole('button');
    expect(botones.map((b) => b.getAttribute('aria-label')?.split(':')[0])).toEqual(['Madrugador', 'Primer entreno', '7 seguidos']); // los tres últimos; el más nuevo, al medio
    expect(botones[1].closest('li')!.classList.contains('pf-vitrina-primero')).toBe(true);
    expect(botones[1].querySelector('svg')!.getAttribute('width')).toBe('112');
    expect(botones[0].querySelector('svg')!.getAttribute('width')).toBe('84');
    expect(botones[1].getAttribute('aria-label')).toMatch(/^Primer entreno: ganado el /);
    fireEvent.click(botones[1]);
    expect(within(dialogo()).getByText('Terminar tu primer entrenamiento.')).toBeTruthy();
  });

  it('sin sellos ganados no hay vitrina; con uno o dos, se acomodan sin hueco', () => {
    abrir();
    expect(screen.queryByRole('region', { name: 'Lo último' })).toBeNull();
    act(() => { claimSeal('hombre-nuevo', '2026-11-01'); });
    const { unmount } = abrir();
    expect(within(screen.getAllByRole('region', { name: 'Lo último' })[0]).getAllByRole('button')).toHaveLength(1);
    unmount();
  });

  it('el muro dibuja una silueta por grupo y un anillo de avance en los bloqueados con camino', () => {
    historia(3);
    act(() => { syncSeals(HOY); });
    abrir();
    const sellos = screen.getByRole('region', { name: 'Sellos' });
    const forma = (g: string) => [...new Set([...within(within(sellos).getByRole('region', { name: g })).getAllByRole('button')].map((b) => b.querySelector('svg')!.getAttribute('data-forma')))];
    expect(forma('Constancia')).toEqual(['moneda']);
    expect(forma('Cuerpo')).toEqual(['hexagono']);
    expect(forma('Estudio')).toEqual(['escudo']);
    expect(forma('Trabajo')).toEqual(['roseton']);
    const cien = within(sellos).getByRole('button', { name: /^100 días: bloqueado/ });
    expect(cien.querySelector('.sl-avance')).toBeTruthy();
    expect(within(sellos).getByRole('button', { name: 'Hombre nuevo: ganado' }).querySelector('.sl-avance')).toBeNull();
  });

  it('el primer día ya tiene un hito a la vista (madrugar) y un historial que dice cómo se llena', () => {
    abrir();
    expect(within(screen.getByRole('region', { name: 'Próximos hitos' })).getByRole('button', { name: /^Madrugador: / })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'El año' })).getByText('1 día · promedio 0 %')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Historial/ }));
    expect(within(dialogo()).getByText(/Todavía no hay días cerrados/)).toBeTruthy();
  });
});

describe('Avance 2.0', () => {
  const abrir = (hash = '#/avance') => render(<><AvanceV2 {...props(hash)} />{global}</>);

  it('los números, el estudio por período, las metas del año, el mes y los frentes', () => {
    historia(6);
    act(() => { syncSeals(HOY); addWeight('2026-11-15', 82); addWeight(HOY, 82.8); });
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: /Avance/ })).toBeTruthy();
    expect(screen.getByText('Racha')).toBeTruthy();
    expect(screen.getAllByText('82,8').length).toBeGreaterThan(0); // en Avance el peso sí se ve
    const estudio = screen.getByRole('region', { name: 'Estudio' });
    expect(within(estudio).getByRole('img', { name: /^Esta semana, minutos de estudio/ })).toBeTruthy();
    fireEvent.click(within(estudio).getByRole('radio', { name: 'Mes' }));
    expect(within(estudio).getByRole('img', { name: /^Este mes, minutos de estudio: Semana 1 / })).toBeTruthy();
    fireEvent.click(within(estudio).getByRole('radio', { name: 'Año' }));
    expect(within(estudio).getByRole('img', { name: /^Este año, minutos de estudio: Noviembre 360/ })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Metas del año' })).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Noviembre' })).getByRole('img', { name: /^Noviembre: 7 días cargados/ })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Frentes de estudio' })).getAllByRole('progressbar').length).toBeGreaterThan(1);
    expect(within(screen.getByRole('region', { name: 'Peso' })).getByRole('img', { name: /^Curva de peso: 15 nov 82 kg, 23 nov 82,8 kg/ })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Sellos' })).getByRole('img', { name: 'Hombre nuevo' })).toBeTruthy();
  });

  it('"Presentar" lleva a la presentación, y vuelve a Perfil', () => {
    abrir();
    expect(screen.getByRole('link', { name: 'Presentar' }).getAttribute('href')).toBe('#/avance/presentacion');
    expect(screen.getByRole('link', { name: 'Perfil' }).getAttribute('href')).toBe('#/perfil');
  });

  describe('la presentación', () => {
    const lamina = () => screen.getByRole('region', { name: /^\d de 8: / }).getAttribute('aria-label');

    it('ocho láminas: se avanza y se vuelve con los botones y con las flechas', () => {
      historia(4);
      abrir('#/avance/presentacion');
      expect(screen.getByRole('main', { name: 'Presentación del avance' })).toBeTruthy();
      expect(lamina()).toBe('1 de 8: Portada');
      expect(screen.getByRole('button', { name: 'Lámina anterior' })).toHaveProperty('disabled', true);
      fireEvent.click(screen.getByRole('button', { name: 'Lámina siguiente' }));
      expect(lamina()).toBe('2 de 8: Constancia');
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(lamina()).toBe('3 de 8: Mejora');
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      fireEvent.click(screen.getByRole('button', { name: 'Lámina anterior' }));
      expect(lamina()).toBe('1 de 8: Portada');
    });

    it('avanza sola cuando termina la barra de la lámina, y se puede pausar', () => {
      const { container } = abrir('#/avance/presentacion');
      // jsdom no tiene AnimationEvent: React escucha el nombre con prefijo. Se mandan los dos; el segundo cae en un nodo que ya no está.
      const barra = container.querySelector('.wr-actual > i')!;
      act(() => { for (const tipo of ['animationend', 'webkitAnimationEnd']) barra.dispatchEvent(new Event(tipo, { bubbles: true })); });
      expect(lamina()).toBe('2 de 8: Constancia');
      expect(container.querySelectorAll('.wr-vista')).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
      expect(container.querySelector('.wr')!.classList.contains('wr-pausa')).toBe(true);
      fireEvent.keyDown(window, { key: ' ' });
      expect(screen.getByRole('button', { name: 'Pausar' })).toBeTruthy();
    });

    it('la última lámina deja volver a empezar o salir; Esc sale desde cualquiera', () => {
      abrir('#/avance/presentacion');
      for (let k = 0; k < 9; k++) fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(lamina()).toBe('8 de 8: Cierre');
      expect(screen.getByRole('button', { name: 'Lámina siguiente' })).toHaveProperty('disabled', true);
      expect(screen.getByRole('link', { name: 'Salir' }).getAttribute('href')).toBe('#/avance');
      fireEvent.click(screen.getByRole('button', { name: 'Ver de nuevo' }));
      expect(lamina()).toBe('1 de 8: Portada');
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(location.hash).toBe('#/avance');
    });

    it('no muestra lo privado: ni el peso ni la plata', () => {
      act(() => { addWeight(HOY, 82.8); });
      const { container } = abrir('#/avance/presentacion');
      const textos: string[] = [];
      for (let k = 0; k < 8; k++) { textos.push(container.textContent ?? ''); fireEvent.keyDown(window, { key: 'ArrowRight' }); }
      expect(textos.join(' ')).not.toContain('82,8');
      // Las metas en plata o en kilos dicen su nombre, pero el valor va tapado.
      const privadas = getState().goals.goals.filter((g) => g.horizon === 'anio' && (g.unit === 'USD' || g.unit === 'kg')).slice(0, 4);
      expect(privadas.length).toBeGreaterThan(0);
      for (const g of privadas) expect(textos[4]).toContain(`${g.title}•••`);
    });
  });
});

describe('Cierre 2.0', () => {
  const abrir = () => render(<><CierreV2 {...props('#/cierre')} />{global}</>);
  const copiar = () => { const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true }); return writeText; };

  it('tres pasos: la mejora de hoy, lo de mañana y cerrar', () => {
    act(() => updateDay(HOY, (d) => hacer(d, 2)));
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: /Cierre/ })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['1Hoy', '2Mañana', '3Cerrar']);
    expect(screen.getByRole('tab', { name: /Hoy/ }).getAttribute('aria-selected')).toBe('true');
    const n = dia().blocks.length;
    expect(screen.getByRole('img', { name: `2 de ${n} metas del día cumplidas` })).toBeTruthy();
    expect(screen.getByText('Es tu primer día registrado.')).toBeTruthy();
    expect(document.getElementById('ci-panel-0')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('ci-panel-1')!.hasAttribute('inert')).toBe(true);
    fireEvent.click(within(document.getElementById('ci-panel-0')!).getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('tab', { name: /Mañana/ }).getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('ci-panel-1')!.hasAttribute('inert')).toBe(false);
    fireEvent.click(screen.getByRole('tab', { name: /Cerrar/ }));
    expect(document.getElementById('ci-panel-2')!.hasAttribute('inert')).toBe(false);
  });

  it('cerrar copia el JSON, guarda el cierre, pasa a mañana lo tildado y muestra el sello nuevo', async () => {
    const writeText = copiar();
    act(() => updateDay(HOY, (d) => hacer(d, 2)));
    abrir();
    const pendientes = dia().blocks.slice(2).flatMap((b) => b.tasks);
    const panel = within(document.getElementById('ci-panel-1')!);
    fireEvent.click(panel.getAllByRole('checkbox')[0]); // la primera pendiente se queda en hoy
    fireEvent.change(panel.getByRole('textbox', { name: 'Pequeña victoria' }), { target: { value: 'Cerré el cap. 3' } });
    fireEvent.change(panel.getByRole('textbox', { name: 'Mañana, lo primero' }), { target: { value: 'Cold recall' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar el JSON y cerrar' })); });
    const cierre = dia().closed!;
    expect(cierre).toMatchObject({ victoria: 'Cerré el cap. 3', manana: 'Cold recall' });
    expect(cierre.xp).toBeGreaterThan(0);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(JSON.parse(writeText.mock.calls[0][0]).date).toBe(HOY);
    const manana = Object.values(getState().carry[addDays(HOY, 1)] ?? {}).flat();
    expect(manana).toHaveLength(pendientes.length - 1);
    expect(dia().blocks.flatMap((b) => b.tasks).filter((t) => !t.done).map((t) => t.id)).toEqual([pendientes[0].id]);
    expect(location.hash).toBe('#/logro/hombre-nuevo');
  });

  it('un día cerrado muestra lo anotado, deja copiar otra vez y reabrir', async () => {
    const writeText = copiar();
    act(() => updateDay(HOY, (d) => ({ ...hacer(d, 1), closed: { at: '21:40', xp: 30, score: 0.2, victoria: 'Entrené', manana: '' } })));
    abrir();
    expect(screen.getByText('Cerrado a las 21:40')).toBeTruthy();
    expect(screen.getByText('Entrené')).toBeTruthy();
    expect(screen.getByText('Sin anotar')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Pequeña victoria' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar el JSON otra vez' })); });
    expect(writeText).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir el día' }));
    expect(dia().closed).toBeUndefined();
  });

  it('el JSON del día se ve en su hoja', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^JSON del día/ }));
    expect(within(dialogo()).getByText(new RegExp(`"date": "${HOY}"`))).toBeTruthy();
  });
});

describe('Sello nuevo 2.0', () => {
  it('muestra el sello, lo marca como visto y, si hay otro sin ver, sigue con ese', () => {
    act(() => { claimSeal('siete', HOY); claimSeal('madrugador', HOY); });
    const { unmount } = render(<><LogroV2 {...props('#/logro/siete')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: '7 seguidos' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Sello 7 seguidos' })).toBeTruthy();
    expect(screen.getByText('Una semana sin cortar la racha.')).toBeTruthy();
    expect(screen.getByText('+50 XP')).toBeTruthy();
    expect(getState().profile.seen).toContain('siete');
    expect(screen.getByRole('link', { name: 'Siguiente sello' }).getAttribute('href')).toBe('#/logro/madrugador');
    unmount();
    render(<><LogroV2 {...props('#/logro/madrugador')} />{global}</>);
    expect(screen.getByRole('link', { name: 'Ver mis sellos' }).getAttribute('href')).toBe('#/perfil');
  });

  it('un sello que no existe lo dice', () => {
    render(<><LogroV2 {...props('#/logro/nada')} />{global}</>);
    expect(screen.getByText('No encontré ese sello')).toBeTruthy();
    expect(SEALS.some((d) => d.id === 'nada')).toBe(false);
  });
});
