import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { medir } from '../../data/periodos';
import { periodosComerciales, periodosSecundarias } from '../../data/fondo';
import { leerRuta } from '../../lib/routes';
import { marcarHito } from '../../state/plan';
import { getState, register, resetState, startDay } from '../../state/store';
import { usePeriodos } from '../../ui/usePeriodos';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2 } from '../registro';
import { destinoDe } from './Compartido';
import { RADIO_0, caminoPlano, constelacion, puntoEn, reparto, tramo } from './constelacion-datos';
import { acotar, anchoDe, carriles, diaEn, empezados, escalaDe, limitesPpd, marcasEje, ppdDe, scrollAlEscalar, tipoDe, xDe, zoomCercano } from './linea-datos';
import PlanV2 from './PlanV2';

const HOY = '2026-11-23'; // lunes; PetrIA (P1) corre del 21 nov al 12 dic (v12.4)
const Pantalla = ({ hash, hoy = HOY }: { hash: string; hoy?: string }) => (
  <><PlanV2 ruta={leerRuta(hash)} day={getState().days[HOY]} today={hoy} /><GlobalV2 activa="metas" pendientes={0} conBarra={false} conMini={false} /></>
);
const abrir = (hash: string, hoy?: string) => render(<Pantalla hash={hash} hoy={hoy} />);
const arbol = (hoy = HOY) => renderHook(() => usePeriodos(hoy)).result.current.arbol;
const fondo = () => { const p = getState().plan; return { sec: periodosSecundarias(p).map((x) => medir(x, HOY)), com: periodosComerciales(p).map((x) => medir(x, HOY)) }; };

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Plan 2.0 · las tres vistas', () => {
  it('el registro cubre la línea y el mapa nuevo; el mapa por ramas sigue en la 1.0', () => {
    const cubre = PANTALLAS_V2.metas!.cubre!;
    expect(cubre(leerRuta('#/metas/linea'))).toBe(true);
    expect(cubre(leerRuta('#/metas/constelacion'))).toBe(true);
    expect(cubre(leerRuta('#/metas/mapa'))).toBe(false);
  });

  it('Ahora, Línea y Mapa se pasan con las mismas pestañas, y marcan dónde estás', () => {
    for (const [hash, nombre] of [['#/metas', 'Ahora'], ['#/metas/linea', 'Línea'], ['#/metas/constelacion', 'Mapa']] as const) {
      const r = abrir(hash);
      const nav = screen.getByRole('navigation', { name: 'Cómo ver el plan' });
      expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/metas', '#/metas/linea', '#/metas/constelacion']);
      expect(within(nav).getByRole('link', { current: 'page' }).textContent).toBe(nombre);
      r.unmount();
    }
  });

  it('el centro del plan deja a mano el mapa por ramas de la 1.0', () => {
    abrir('#/metas');
    expect(screen.getByRole('link', { name: /El mapa por ramas/ }).getAttribute('href')).toBe('#/metas/mapa');
  });

  it('un período de fondo abre su página de fondo; el resto, su período', () => {
    expect(destinoDe({ id: 'P1', track: undefined })).toBe('#/metas/periodos/P1');
    expect(destinoDe({ id: 'handyx:v1', track: 'secundaria' })).toBe('#/metas/fondo/handyx');
  });
});

describe('Línea 2.0 · los datos', () => {
  it('un carril por tipo de bloque, en orden, y los dos de fondo al final', () => {
    const c = carriles(arbol(), fondo());
    expect(c.map((x) => x.id)).toEqual(['proyectos', 'certs', 'mate', 'idioma', 'cierres', 'secundaria', 'comercial']);
    expect(c.slice(0, 5).reduce((n, x) => n + x.barras.length, 0)).toBe(69); // cada bloque, en un solo carril (v12.4: 69, sin los descansos)
    expect(c[0].barras[0].id).toBe('P1');
    expect(c[2].barras.every((b) => tipoDe(b.id) === 'ventana')).toBe(true);
    expect(c.filter((x) => x.fondo).map((x) => x.id)).toEqual(['secundaria', 'comercial']);
    for (const x of c) expect(x.barras.map((b) => b.inicio)).toEqual([...x.barras.map((b) => b.inicio)].sort());
  });

  it('la escala lleva de fechas a píxeles y vuelve', () => {
    const e = escalaDe('2026-11-21', '2028-12-14', 4); // del primer día del plan al último (14 dic 2028)
    expect(e.dias).toBe(755);
    expect(xDe(e, '2026-11-21')).toBe(0);
    expect(xDe(e, '2026-11-23')).toBe(8);
    expect(anchoDe(e, '2026-11-21', '2026-12-12')).toBe(22 * 4);
    expect(diaEn(e, 9)).toBe('2026-11-23');
    expect(diaEn(e, -50)).toBe('2026-11-21');
    expect(diaEn(e, 1e9)).toBe('2028-12-14');
  });

  it('los zooms con nombre, sus límites y el más cercano a una escala', () => {
    expect(ppdDe('todo', 350, 755)).toBeCloseTo(350 / 755);
    expect(ppdDe('anio', 365, 755)).toBe(1);
    expect(ppdDe('mes', 300, 755)).toBe(10);
    const l = limitesPpd(350, 755);
    expect(acotar(0.01, l)).toBe(l.min);
    expect(acotar(999, l)).toBe(25); // dos semanas, como mucho
    expect(zoomCercano(ppdDe('trimestre', 350, 755), 350, 755)).toBe('trimestre');
    expect(zoomCercano(ppdDe('mes', 350, 755) * 1.2, 350, 755)).toBe('mes');
    expect(zoomCercano(l.min, 350, 755)).toBe('todo');
  });

  it('al acercar, el día bajo el dedo no se mueve', () => {
    // A 4 px por día, el dedo a 100 px con 300 de scroll está en el día 100; a 8 px por día, ese día va en 800.
    expect(scrollAlEscalar(300, 100, 4, 8)).toBe(700);
    expect(scrollAlEscalar(0, 0, 4, 8)).toBe(0);
    expect(scrollAlEscalar(10, 200, 8, 1)).toBe(0); // nunca negativo
  });

  it('el eje marca todos los meses si entran, y si no, cada tres (enero siempre, con el año)', () => {
    const cerca = marcasEje(escalaDe('2026-11-21', '2027-03-10', 4));
    expect(cerca.map((m) => m.texto)).toEqual(['dic', 'ene 27', 'feb', 'mar']);
    expect(cerca.filter((m) => m.fuerte).map((m) => m.fecha)).toEqual(['2027-01-01']);
    const lejos = marcasEje(escalaDe('2026-11-21', '2028-12-14', 0.5));
    expect(lejos.map((m) => m.texto)).toEqual(['ene 27', 'abr', 'jul', 'oct', 'ene 28', 'abr', 'jul', 'oct']);
  });

  it('las horas: los bloques que ya empezaron, el más nuevo primero', () => {
    expect(empezados(arbol(), HOY).map((p) => p.id)).toEqual(['P1']);
    // El 21 dic ya corren las horas de inglés (E1, 19–27 dic), después de la Cert window 1 (13–18 dic) y de PetrIA (hasta el 12 dic).
    expect(empezados(arbol('2026-12-21'), '2026-12-21').map((p) => p.id)).toEqual(['E1', 'CW1', 'P1']);
  });
});

describe('Línea 2.0 · la pantalla', () => {
  it('muestra etapas, fases, un carril por tipo y hoy', () => {
    const { container } = abrir('#/metas/linea');
    expect(within(screen.getByRole('group', { name: 'Etapas' })).getAllByRole('button')).toHaveLength(4);
    expect(within(screen.getByRole('group', { name: 'Fases' })).getAllByRole('button')).toHaveLength(11);
    for (const n of ['Proyectos', 'Certificaciones', 'Matemática']) expect(screen.getByRole('group', { name: n })).toBeTruthy();
    expect(container.querySelector('.ln-hoy')).toBeTruthy();
    expect(container.querySelectorAll('.ln-barra.ahora')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^PetrIA, 21 nov – 12 dic/ }).className).toContain('ahora');
  });

  it('v12.4: los 3 días libres fijos van rayados y las herramientas open source son marcas en el carril de proyectos', () => {
    const { container } = abrir('#/metas/linea');
    // Pausa del 20–26 dic 2027 y los dos descansos (31 dic–6 ene y 9–15 jun 2028), sobre el fondo de la línea.
    expect(container.querySelectorAll('.ln-fondo .ln-pausa')).toHaveLength(3);
    const herramientas = within(screen.getByRole('group', { name: 'Herramientas open source' })).getAllByRole('link');
    expect(herramientas.length).toBeGreaterThanOrEqual(20);
    expect(herramientas.every((a) => a.getAttribute('href') === '#/metas/open-source')).toBe(true);
    expect(within(screen.getByRole('group', { name: 'Herramientas open source' })).getByRole('link', { name: /^Alawys v0\.1, 11 dic/ })).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Herramientas open source' })).getByRole('link', { name: /^Alawys v1\.0, 8 ene/ })).toBeTruthy();
    // Las dos pistas de fondo tienen su carril.
    expect(screen.getByRole('group', { name: 'Secundaria · de fondo' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Comercial · de fondo' })).toBeTruthy();
  });

  it('los botones de zoom cambian el ancho del lienzo y marcan cuál está puesto', () => {
    const { container } = abrir('#/metas/linea');
    const lienzo = () => parseFloat((container.querySelector('.ln-lienzo') as HTMLElement).style.width);
    expect(screen.getByRole('radio', { name: 'Trimestre' }).getAttribute('aria-checked')).toBe('true');
    const trimestre = lienzo();
    fireEvent.click(screen.getByRole('radio', { name: 'Mes' }));
    expect(lienzo()).toBeGreaterThan(trimestre * 2.5);
    expect(screen.getByRole('radio', { name: 'Mes' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Todo' }));
    expect(lienzo()).toBeLessThan(trimestre / 4);
  });

  it('tocar un bloque abre su hoja, con cómo va y "Abrir"', () => {
    abrir('#/metas/linea');
    fireEvent.click(screen.getByRole('button', { name: /^PetrIA, / }));
    const hoja = screen.getByRole('dialog', { name: 'PetrIA' });
    expect(within(hoja).getByText(/^Vas en plan: termina el 12 dic\.$/)).toBeTruthy(); // nada cargado al tercer día de 22: 9 % del tiempo, dentro del 10 % de tolerancia
    expect(within(hoja).getByRole('link', { name: 'Abrir' }).getAttribute('href')).toBe('#/metas/periodos/P1');
  });

  it('lo de fondo abre su página de fondo', () => {
    abrir('#/metas/linea');
    const sec = within(screen.getByRole('group', { name: /Handyx|secundaria/i })).getAllByRole('button')[0];
    fireEvent.click(sec);
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Abrir' }).getAttribute('href')).toMatch(/^#\/metas\/fondo\//);
  });

  it('fuera del plan no hay raya de hoy ni botón "Hoy"', () => {
    const { container } = abrir('#/metas/linea', '2029-01-10');
    expect(container.querySelector('.ln-hoy')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hoy' })).toBeNull();
  });
});

describe('Mapa 2.0 · la espiral', () => {
  it('una vuelta por fase y una estrella por bloque, en orden', () => {
    const c = constelacion(arbol(), HOY);
    expect(c.total).toBe(11);
    expect(c.vueltas.map((v) => v.corto)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11']);
    expect(c.vueltas.map((v) => v.etapa)).toEqual([0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3]);
    expect(c.estrellas).toHaveLength(69); // los 69 bloques del plan v12.4
    // Cada estrella cae dentro de la vuelta de su fase, y nunca antes que la anterior.
    for (const e of c.estrellas) { expect(e.t).toBeGreaterThan(e.fase); expect(e.t).toBeLessThan(e.fase + 1); expect(e.desde).toBeLessThan(e.t); expect(e.hasta).toBeGreaterThan(e.t); }
    c.estrellas.slice(1).forEach((e, i) => { expect(e.t).toBeGreaterThan(c.estrellas[i].t); expect(e.desde).toBeCloseTo(c.estrellas[i].hasta, 3); });
    expect(c.radioMax).toBeCloseTo(RADIO_0 + 0.62 * 11);
  });

  it('hoy cae sobre el tramo del bloque que corre; antes del plan está en el centro y después, al final', () => {
    const c = constelacion(arbol(), HOY);
    expect(c.enCurso).toBe(true);
    expect(c.ahora?.id).toBe('P1');
    expect(c.hoy).toBeGreaterThan(c.ahora!.desde);
    expect(c.hoy).toBeLessThan(c.ahora!.t); // el tercer día de 19: antes de la mitad del bloque
    expect(c.hechas).toBe(0);
    const antes = constelacion(arbol('2026-11-01'), '2026-11-01');
    expect([antes.enCurso, antes.hoy, antes.ahora]).toEqual([false, 0, undefined]);
    const despues = constelacion(arbol('2029-01-10'), '2029-01-10');
    expect([despues.enCurso, despues.hoy]).toEqual([false, 11]);
  });

  it('el tamaño sale de las horas y el color, del área', () => {
    const c = constelacion(arbol(), HOY);
    const de = (id: string) => c.estrellas.find((e) => e.id === id)!;
    expect(de('P1').tam).toBeGreaterThan(de('CW1').tam); // 193,5 h contra 42 h
    expect(de('P1').area).toBe('var(--a-ing)');
    expect(de('W1').area).toBe('var(--a-economia)');
    expect(de('E1').area).toBe('var(--a-idi)');
    expect(de('COL').area).toBe('var(--texto-2)');
  });

  it('la espiral sale del centro: empieza arriba, se abre y sube de a poco', () => {
    const p0 = puntoEn(0), p1 = puntoEn(1), cuarto = puntoEn(0.25);
    expect([p0.x, p0.z]).toEqual([0, -RADIO_0]); // a las doce
    expect(cuarto.x).toBeGreaterThan(0); // gira como el reloj
    expect(Math.abs(cuarto.z)).toBeLessThan(0.001);
    expect(p1.r).toBeGreaterThan(p0.r);
    expect(p1.y).toBeGreaterThan(p0.y);
    expect(tramo(0, 1, 1 / 4)).toHaveLength(5 * 3);
    expect(caminoPlano(0, 0.5)).toMatch(/^M0\.000 -1\.600L/);
  });

  it('el reparto separa los bloques cortos sin desordenarlos', () => {
    const f = reparto([0.1, 0.15, 0.9]);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    const xs = [0, 0.05, 0.1, 0.15, 0.5, 0.9, 1].map(f);
    xs.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(xs[i]));
    expect(f(0.15) - f(0.1)).toBeGreaterThan(0.15); // pegados en el tiempo (0,05), separados en la vuelta
  });

  it('un bloque hecho cuenta como hecho', () => {
    // English E#1 corre del 19 al 27 dic; VitalIA (P2) arranca el 28.
    act(() => marcarHito('v12:E1', '2026-12-27'));
    const c = constelacion(arbol('2026-12-29'), '2026-12-29');
    expect(c.hechas).toBe(1);
    expect(c.estrellas.find((e) => e.id === 'E1')!.estado).toBe('hecho');
    expect(c.ahora?.id).toBe('P2');
  });
});

describe('Mapa 2.0 · la pantalla (sin WebGL: el mapa plano)', () => {
  it('dibuja las 69 estrellas, hoy y las fases, sin lienzo ni botones de vista', () => {
    const { container } = abrir('#/metas/constelacion');
    expect(container.querySelectorAll('.cs-estrella')).toHaveLength(69);
    expect(container.querySelectorAll('.cs-estrella.ahora')).toHaveLength(1);
    expect(container.querySelector('.cs-hoy')).toBeTruthy();
    expect(container.querySelectorAll('.cs-cinta path.pasado')).toHaveLength(1); // lo que ya pasó de PetrIA
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Todo' })).toBeNull();
    expect(screen.getByRole('group', { name: /^Mapa del plan: 69 bloques en 11 fases, 0 hechos\. Ahora: PetrIA\./ })).toBeTruthy();
  });

  it('tocar una estrella abre la hoja del bloque', () => {
    const { container } = abrir('#/metas/constelacion');
    fireEvent.click(container.querySelectorAll('.cs-estrella')[3]);
    const hoja = screen.getByRole('dialog', { name: 'VitalIA' });
    expect(within(hoja).getByRole('link', { name: 'Abrir' }).getAttribute('href')).toBe('#/metas/periodos/P2');
  });

  it('abajo van los números y las once fases, para entrar', () => {
    abrir('#/metas/constelacion');
    const fases = within(screen.getByRole('region', { name: 'Fases' })).getAllByRole('link');
    expect(fases).toHaveLength(11);
    expect(fases[0].getAttribute('href')).toBe('#/metas/periodos/F1');
    expect(screen.getByText('Bloques hechos')).toBeTruthy();
    expect(screen.getByText('Llegada · 14 dic')).toBeTruthy(); // el fin estimado del plan: 14 dic 2028
  });

  it('lo hecho se pinta como hecho y se cuenta', () => {
    act(() => marcarHito('v12:E1', '2026-12-27'));
    const { container } = abrir('#/metas/constelacion', '2026-12-29');
    expect(container.querySelectorAll('.cs-estrella.hecho')).toHaveLength(1);
    expect(screen.getByRole('group', { name: /1 hechos\. Ahora: VitalIA\./ })).toBeTruthy();
  });
});
