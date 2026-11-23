import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Casilla } from '../kit/controles';
import { Escalonado, Numero } from './componentes';
import { CURVA, escalonar, festejar, inferirTransicion, instalarNavegacion, navegar, nombreTransicion, salidaExpo } from './movimiento';

/** jsdom no trae Web Animations: un doble que registra las llamadas. */
function conAnimate() {
  const llamadas: { el: Element; opciones: KeyframeAnimationOptions }[] = [];
  const original = (Element.prototype as unknown as { animate?: unknown }).animate;
  (Element.prototype as unknown as { animate: unknown }).animate = function (this: Element, _k: Keyframe[], opciones: KeyframeAnimationOptions) {
    llamadas.push({ el: this, opciones });
    return { finished: Promise.resolve(), cancel() {} };
  };
  return { llamadas, restaurar: () => { (Element.prototype as unknown as { animate?: unknown }).animate = original; } };
}

function reducir(si: boolean) {
  window.matchMedia = ((q: string) => ({ matches: si && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}

beforeEach(() => { reducir(false); location.hash = ''; });
afterEach(() => { vi.restoreAllMocks(); delete (document as unknown as { startViewTransition?: unknown }).startViewTransition; });

describe('2.0 · movimiento: hacia dónde va una pantalla', () => {
  it('más hondo es adelante, menos hondo es atrás, hermanos y otras secciones se funden', () => {
    expect(inferirTransicion('#/metas/periodos', '#/metas/periodos/P1')).toBe('adelante');
    expect(inferirTransicion('#/metas/periodos/P1', '#/metas/periodos')).toBe('atras');
    expect(inferirTransicion('#/metas/periodos', '#/metas/linea')).toBe('fundido');
    expect(inferirTransicion('#/hoy', '#/estudio')).toBe('fundido');
    expect(inferirTransicion('', '#/hoy')).toBe('fundido');
  });

  it('el nombre de transición sale limpio de cualquier id', () => {
    expect(nombreTransicion('P1:v1.0')).toBe('vt-P1-v1-0');
  });

  it('con View Transitions: marca la dirección, presta el elemento de origen y limpia al terminar', async () => {
    let cb: (() => Promise<void> | void) | undefined;
    const origen = document.createElement('a');
    (document as unknown as { startViewTransition: unknown }).startViewTransition = (f: () => Promise<void>) => {
      cb = f;
      expect(document.documentElement.dataset.transicion).toBe('zoom-in');
      expect(origen.style.viewTransitionName).toBe('vt-P1');
      return { finished: Promise.resolve().then(() => cb!()), ready: Promise.resolve() };
    };
    vi.useFakeTimers();
    const p = navegar('#/metas/periodos/P1', { transicion: 'zoom-in', origen, nombre: 'vt-P1' });
    await vi.advanceTimersByTimeAsync(400);
    await p;
    vi.useRealTimers();
    expect(location.hash).toBe('#/metas/periodos/P1');
    expect(origen.style.viewTransitionName).toBe('');
    expect(document.documentElement.dataset.transicion).toBeUndefined();
  });

  it('sin View Transitions, o con movimiento reducido, navega igual (fundido)', async () => {
    reducir(true);
    const vt = vi.fn();
    (document as unknown as { startViewTransition: unknown }).startViewTransition = vt;
    vi.useFakeTimers();
    const p = navegar('metas/linea');
    await vi.advanceTimersByTimeAsync(400);
    await p;
    vi.useRealTimers();
    expect(location.hash).toBe('#/metas/linea');
    expect(vt).not.toHaveBeenCalled();
  });

  it('los links de la 2.0 navegan con transición; los de afuera, con modificador o marcados, no', () => {
    const quitar = instalarNavegacion();
    render(<><div className="v2"><a href="#/metas/periodos">Plan</a><a href="#/hoy" data-sin-transicion="">Hoy</a></div><a href="#/estudio">Afuera</a></>);
    const ev = (n: string, extra: MouseEventInit = {}) => { const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...extra }); screen.getByText(n).dispatchEvent(e); return e.defaultPrevented; };
    expect(ev('Plan')).toBe(true);
    expect(ev('Plan', { metaKey: true })).toBe(false);
    expect(ev('Hoy')).toBe(false);
    expect(ev('Afuera')).toBe(false);
    quitar();
    expect(ev('Plan')).toBe(false);
  });
});

describe('2.0 · movimiento: lo que no pasa por navegar', () => {
  it('el botón atrás (un hashchange ajeno) hace entrar la pantalla con su dirección', async () => {
    const a = conAnimate();
    const env = document.createElement('div');
    env.className = 'envoltura';
    document.body.appendChild(env);
    const quitar = instalarNavegacion();
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: 'http://x/#/metas/periodos/P1', newURL: 'http://x/#/metas/periodos' }));
    await new Promise((r) => setTimeout(r, 60));
    expect(a.llamadas.some((x) => x.el === env)).toBe(true);
    quitar();
    env.remove();
    a.restaurar();
  });
});

describe('2.0 · movimiento: piezas', () => {
  it('el número cuenta con salida exponencial y el lector lee solo el final', () => {
    expect(salidaExpo(0)).toBe(0);
    expect(salidaExpo(0.5)).toBeGreaterThan(0.95);
    expect(salidaExpo(1)).toBe(1);
    reducir(true);
    const { container } = render(<Numero valor={193.5} decimales={1} sufijo=" h" />);
    expect(container.querySelector('[aria-hidden]')!.textContent).toBe('193,5 h');
    expect(container.querySelector('.v2-oculto')!.textContent).toBe('193,5 h');
  });

  it('el número llega a su valor', async () => {
    const { container } = render(<Numero valor={12} duracion={30} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    expect(container.querySelector('[aria-hidden]')!.textContent).toBe('12');
  });

  it('escalonado: cada hijo 40 ms después, tope en el octavo; con movimiento reducido, sin retraso', () => {
    const a = conAnimate();
    const padre = document.createElement('div');
    for (let i = 0; i < 10; i++) padre.appendChild(document.createElement('p'));
    expect(escalonar(padre)).toBe(10);
    expect(a.llamadas.map((x) => x.opciones.delay)).toEqual([0, 40, 80, 120, 160, 200, 240, 280, 320, 320]);
    a.llamadas.length = 0;
    reducir(true);
    escalonar(padre);
    expect(a.llamadas.every((x) => !x.opciones.delay && x.opciones.duration === 150)).toBe(true);
    a.restaurar();
  });

  it('Escalonado anima de nuevo cuando cambia su clave', () => {
    const a = conAnimate();
    const { rerender } = render(<Escalonado clave={1}><p>a</p><p>b</p></Escalonado>);
    expect(a.llamadas).toHaveLength(2);
    rerender(<Escalonado clave={2}><p>a</p><p>b</p></Escalonado>);
    expect(a.llamadas).toHaveLength(4);
    a.restaurar();
  });

  it('festejar: astillas del trazo que se van solas; con movimiento reducido, solo el pulso', async () => {
    const a = conAnimate();
    const el = document.createElement('span');
    document.body.appendChild(el);
    expect(festejar(el)).toBe(10);
    expect(document.querySelectorAll('.mv-festejo i')).toHaveLength(10);
    expect(a.llamadas[0].opciones.easing).toBe(CURVA.resorte);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(document.querySelector('.mv-festejo')).toBeNull();
    reducir(true);
    expect(festejar(el)).toBe(0);
    a.restaurar();
  });

  it('marcar una casilla festeja; desmarcarla, no', () => {
    const a = conAnimate();
    const f = vi.fn();
    const { rerender } = render(<Casilla marcada={false} onCambio={f} etiqueta="Lote 1.1" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(document.querySelectorAll('.mv-festejo')).toHaveLength(1);
    document.querySelectorAll('.mv-festejo').forEach((x) => x.remove());
    rerender(<Casilla marcada onCambio={f} etiqueta="Lote 1.1" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(document.querySelectorAll('.mv-festejo')).toHaveLength(0);
    a.restaurar();
  });
});
