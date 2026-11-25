import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PeriodoMedido } from '../../data/periodos';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PantallaV2 } from '../Resolutor';
import { PANTALLAS_V2 } from '../registro';
import { camino, datosDe, enHorizonte, frase, heroeDe, partesNombre, rango, semana } from './datos';
import PlanV2 from './PlanV2';
import { renderHook } from '@testing-library/react';
import { usePeriodos } from '../../ui/usePeriodos';
import { activoAhora } from '../../data/periodos';

const HOY = '2026-11-23'; // lunes; PetrIA (P1) corre del 21 nov al 12 dic (v12.4), límite 5 ene
// Miércoles 25 nov: con el trabajo en 0, PetrIA (22 días) va atrasado desde el 24 (el lunes 23 lleva 9 % del tiempo: dentro del 10 % de tolerancia).
const ATRASADO = '2026-11-25';
const plan = () => getState().plan;
const Pantalla = ({ hash, hoy = HOY }: { hash: string; hoy?: string }) => (
  <><PlanV2 ruta={leerRuta(hash)} day={getState().days[HOY]} today={hoy} /><GlobalV2 activa="metas" pendientes={0} conBarra={false} conMini={false} /></>
);
function abrir(hash: string, hoy?: string) {
  const r = render(<Pantalla hash={hash} hoy={hoy} />);
  return { ...r, otra: () => r.rerender(<Pantalla hash={hash} hoy={hoy} />) };
}
const arbol = () => renderHook(() => usePeriodos(HOY)).result.current.arbol;

/** Un período de prueba con lo mínimo. */
const per = (x: Partial<PeriodoMedido>): PeriodoMedido => ({ id: 'X', nombre: 'X', nivel: 'bloque', inicio: '2026-11-21', fin: '2026-12-12', tiempo: 0.1, trabajo: 0, estado: 'en-plan', marcas: { hoy: 0.1 }, ...x });

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Plan 2.0 · las frases y los datos', () => {
  it('cada estado se dice en una frase calma, con la fecha que importa', () => {
    expect(frase(per({ estado: 'hecho', trabajo: 1 }), HOY)).toBe('Hecho.');
    expect(frase(per({ estado: 'proximo', inicio: '2026-12-10' }), HOY)).toBe('Empieza el 10 dic (en 17 días).');
    expect(frase(per({ estado: 'proximo', inicio: '2026-11-24' }), HOY)).toBe('Empieza el 24 nov (mañana).');
    expect(frase(per({ estado: 'en-plan' }), HOY)).toBe('Vas en plan: termina el 12 dic.');
    expect(frase(per({ estado: 'adelantado' }), HOY)).toBe('Vas adelantado: termina el 12 dic o antes.');
    // Atrasado: al ritmo del plan, lo que falta (todo) por los 22 días, desde hoy.
    expect(frase(per({ estado: 'atrasado', tiempo: 0.105, trabajo: 0 }), HOY)).toBe('Vas 2 días atrás: termina el 14 dic.');
    expect(frase(per({ estado: 'atrasado', fin: '2026-11-20', deadline: '2027-01-05' }), HOY)).toBe('Pasó el estimado (20 nov). El límite es el 5 ene 2027.');
    expect(frase(per({ estado: 'vencido', fin: '2026-11-20' }), HOY)).toBe('Venció el 20 nov.');
    expect(frase(per({ estado: 'pausado', pausas: [{ inicio: '2026-11-20', fin: '2026-11-30' }] }), HOY)).toBe('En pausa hasta el 30 nov.');
  });

  it('los datos llevan su rótulo: estimado y límite si difieren, horas con unidad', () => {
    // El fin ya está en el rótulo de arriba: acá van el límite, las horas o lo que queda.
    expect(datosDe(per({ deadline: '2027-01-05', horasPlan: 193.5, horasReal: 12.25 }), HOY)).toEqual([
      { etiqueta: 'Límite', valor: '5 ene 2027' }, { etiqueta: 'Horas', valor: '12,3 de 193,5 h' },
    ]);
    expect(datosDe(per({ fin: '2026-11-25' }), HOY)).toEqual([{ etiqueta: 'Quedan', valor: '3 días' }]);
    expect([rango('2026-11-21', '2026-11-25', HOY), rango('2026-11-21', '2026-12-12', HOY), rango('2026-12-31', '2027-01-07', HOY)]).toEqual(['21 – 25 nov', '21 nov – 12 dic', '31 dic – 7 ene 2027']);
    expect(partesNombre({ nombre: 'Fase 1 · AI Full-stack Engineer', nivel: 'fase' })).toEqual({ titulo: 'AI Full-stack Engineer', prefijo: 'Fase 1' });
    expect(partesNombre({ nombre: 'Lote 1.3 · Features & baseline', nivel: 'lote' })).toEqual({ titulo: 'Features & baseline', prefijo: 'Lote 1.3' });
    expect(partesNombre({ nombre: 'Programación · PetrIA', nivel: 'bloque' })).toEqual({ titulo: 'Programación · PetrIA', prefijo: 'Bloque' });
  });

  it('el héroe es el bloque activo; el camino va de la etapa al período', () => {
    const a = arbol();
    const cadena = activoAhora(a, HOY).filter((p) => p.nivel !== 'etapa');
    expect(heroeDe(cadena)?.id).toBe('P1');
    expect(camino(a, 'P1:v1.0').map((p) => p.id)).toEqual(['etapa-1', 'F1', 'P1', 'P1:v1.0']);
    expect(camino(a, 'nada')).toEqual([]);
  });

  it('el zoom por horizonte: el mes trae versiones y exámenes, el bimestre bloques, el año fases', () => {
    const a = arbol();
    const mes = enHorizonte(a, HOY, 'mes');
    expect(new Set(mes.map((p) => p.nivel))).toEqual(new Set(['version', 'cert']));
    expect(mes[0].id).toBe('P1:v1.0');
    expect(mes.map((p) => p.fin)).toEqual([...mes.map((p) => p.fin)].sort());
    expect(enHorizonte(a, HOY, 'bimestre').map((p) => p.id).slice(0, 4)).toEqual(['P1', 'CW1', 'E1', 'P2']);
    expect(enHorizonte(a, HOY, 'anio').every((p) => p.nivel === 'fase')).toBe(true);
  });

  it('la semana: siete días, con el bloque de cada uno y lo que vence', () => {
    const s = semana(arbol(), HOY);
    expect(s.map((d) => d.fecha)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
    expect(s[0].bloque?.id).toBe('P1');
    expect(s[2].vence.map((p) => p.id)).toContain('P1:v1.0');
  });
});

describe('Plan 2.0 · qué cubre', () => {
  it('el centro, los períodos, el análisis, la línea y el mapa son de la entrada principal; lo demás lo reparten las familias de la 3.3', async () => {
    const cubre = PANTALLAS_V2.metas!.cubre!;
    for (const h of ['#/metas', '#/metas/periodos', '#/metas/periodos/P1', '#/metas/analisis', '#/metas/linea', '#/metas/constelacion']) expect(cubre(leerRuta(h)), h).toBe(true);
    for (const h of ['#/metas/semana', '#/metas/mapa', '#/metas/clipping', '#/metas/proyecto/P0', '#/metas/proyecto', '#/metas/ruta', '#/metas/roadmap']) expect(cubre(leerRuta(h)), h).toBe(false);
    // La semana la cubre la familia «metas» (3.3, `metas/entradas.ts`).
    const { unmount } = render(<PantallaV2 ruta={leerRuta('#/metas/semana')} day={getState().days[HOY]} today={HOY} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Metas' })).toBeInTheDocument();
    unmount();
    // Una ruta que ninguna entrada cubre dice que no la encontró.
    render(<PantallaV2 ruta={leerRuta('#/metas/nada-que-cubra')} day={getState().days[HOY]} today={HOY} />);
    expect(screen.getByText('No encontré esa pantalla')).toBeInTheDocument();
  });
});

describe('Plan 2.0 · el centro', () => {
  it('arriba el bloque que corre, y por dónde vas adentro', () => {
    abrir('#/metas');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Plan');
    // 61 semanas: del lunes 23 nov 2026 (el día que arranca Toti) al cierre de la etapa 2 (21 ene 2028 = T+18).
    expect(screen.getByText('Semana 1 de 61')).toBeInTheDocument();
    // El héroe es el primero; "PetrIA" también aparece en la semana, día por día.
    // El link se llama como el bloque y se estira sobre la tarjeta; lo demás se lee aparte.
    const heroe = screen.getAllByRole('link', { name: 'PetrIA' })[0];
    expect(heroe).toHaveClass('s-tarjeta-enlace');
    expect(heroe).toHaveAttribute('href', '#/metas/periodos/P1');
    const tarjeta = heroe.closest('.tp-heroe-tarjeta') as HTMLElement;
    expect(within(tarjeta).getByRole('img', { name: 'PetrIA: trabajo hecho: 0 %' })).toBeInTheDocument();
    const adentro = within(screen.getByRole('region', { name: 'Adentro de PetrIA' }));
    expect(adentro.getByRole('link', { name: /v1\.0 MVP/ })).toHaveAttribute('href', '#/metas/periodos/P1%3Av1.0');
    expect(adentro.getByRole('link', { name: /Lote 1\.3/ })).toBeInTheDocument();
  });

  it('el zoom: la semana día por día; después mes, bimestre y año', () => {
    abrir('#/metas');
    const viene = () => within(screen.getByRole('region', { name: 'Lo que viene' }));
    expect(viene().getAllByRole('listitem')).toHaveLength(7);
    fireEvent.click(viene().getByRole('radio', { name: 'Año' }));
    expect(viene().getAllByRole('link').map((a) => a.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Fase 1')]));
    // De hoy al 22 nov 2027 corren 7 fases (F1 a F7): una más que el tope de la lista, el resto se abre con "Ver 1 más".
    expect(viene().getAllByRole('link')).toHaveLength(6);
    fireEvent.click(viene().getByRole('button', { name: 'Ver 1 más' }));
    expect(viene().getAllByRole('link')).toHaveLength(7);
    fireEvent.click(viene().getByRole('radio', { name: 'Bimestre' }));
    expect(viene().getByRole('link', { name: /^Cert window 1/ })).toBeInTheDocument();
    fireEvent.click(viene().getByRole('radio', { name: 'Mes' }));
    // El mes trae las 4 versiones de PetrIA (hasta el 12 dic) y los 2 exámenes de la Cert window 1 (13–18 dic): justo el tope, sin "Ver más".
    expect(viene().getAllByRole('link')).toHaveLength(6);
    expect(viene().getByRole('link', { name: /^GitHub Foundations/ })).toBeInTheDocument();
    expect(viene().queryByRole('button', { name: /^Ver \d+ más$/ })).toBeNull();
  });

  it('las 4 etapas, lo de fondo, tus metas y lo demás del plan, a un toque', () => {
    abrir('#/metas');
    expect(within(screen.getByRole('region', { name: 'Las 4 etapas' })).getAllByRole('link')).toHaveLength(4);
    expect(within(screen.getByRole('region', { name: 'Tus metas' })).getByRole('link', { name: /P0 · Constelación v1/ })).toHaveAttribute('href', '#/metas/proyecto/P0');
    expect(within(screen.getByRole('region', { name: 'Más del plan' })).getByRole('link', { name: /Análisis/ })).toHaveAttribute('href', '#/metas/analisis');
    expect(screen.getByRole('navigation', { name: 'Cómo ver el plan' })).toHaveTextContent('AhoraLíneaMapa');
  });
});

describe('Plan 2.0 · un período', () => {
  it('PetrIA: volver a su fase, el camino arriba, sus 4 versiones y lo del bloque', () => {
    abrir('#/metas/periodos/P1');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PetrIA');
    expect(screen.getByRole('link', { name: 'Fase 1' })).toHaveAttribute('data-transicion', 'zoom-out');
    expect(within(screen.getByRole('navigation', { name: 'Camino' })).getByRole('link', { name: 'Etapa 1' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '4 versiones' })).getAllByRole('link')).toHaveLength(4);
    expect(within(screen.getByRole('region', { name: 'Más de PetrIA' })).getByRole('link', { name: /La ficha/ })).toHaveAttribute('href', '#/metas/proyecto/P1');
  });

  it('atrasado: sugiere correr lo que sigue; confirmar guarda las fechas y "Deshacer" las vuelve', () => {
    // Al cuarto día de 22 sin nada cargado: 25 nov (el lunes 23 todavía es "en plan", dentro del 10 % de tolerancia).
    const { otra } = abrir('#/metas/periodos/P1', ATRASADO);
    fireEvent.click(screen.getByRole('button', { name: /^Correr lo que sigue \d+ cambios$/ }));
    const sug = within(screen.getByRole('dialog', { name: 'Correr lo que sigue' }));
    expect(sug.getByText(/A este ritmo, PetrIA termina el 16 dic \(4 días más\)\./)).toBeInTheDocument();
    const cambios = sug.getAllByRole('checkbox');
    expect(cambios.length).toBeGreaterThan(1);
    fireEvent.click(cambios[1]); // dejar uno afuera
    const boton = sug.getByRole('button', { name: /^Confirmar \d+ cambios?$/ });
    fireEvent.click(boton);
    otra();
    expect(plan().corrimientos?.P1).toMatchObject({ fin: '2026-12-16', confirmado: ATRASADO });
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(plan().corrimientos?.P1).toBeUndefined();
  });

  it('una versión: sus entregables se tildan, se publica desde el héroe y sus lotes se marcan desde la fila', () => {
    const { otra } = abrir(`#/metas/periodos/${encodeURIComponent('P1:v1.0')}`);
    const entregables = within(screen.getByRole('region', { name: 'Entregables' }));
    expect(entregables.getAllByRole('checkbox')).toHaveLength(7);
    fireEvent.click(entregables.getAllByRole('checkbox')[0]);
    otra();
    expect(Object.entries(plan().hitos).filter(([k, v]) => k.startsWith('v12:P1:v1.0:e') && v.hecho)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar publicada' }));
    otra();
    expect(plan().versiones?.P1?.['1.0']?.publicada).toBe(HOY);
    const lotes = within(screen.getByRole('region', { name: '11 lotes' }));
    fireEvent.click(lotes.getByRole('checkbox', { name: /^Lote 1\.3 · Features & baseline: marcar hecho$/ }));
    expect(plan().hitos['v12:P1:lote:1.3']?.hecho).toBe(HOY);
  });

  it('el lanzamiento no se publica sin el Imán: el héroe lleva a completarlo', () => {
    abrir(`#/metas/periodos/${encodeURIComponent('P1:v3.0')}`);
    expect(screen.getByText(/Es el lanzamiento: se publica con el Imán completo\. Faltan 8 puntos\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar el Imán' })).toHaveAttribute('href', '#/metas/iman/P1');
    expect(screen.queryByRole('button', { name: 'Marcar publicada' })).toBeNull();
  });

  it('una fase: lo que la cierra se tilda, y muestra con qué salís al mercado', () => {
    const { otra } = abrir('#/metas/periodos/F1');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI Full-stack Engineer');
    expect(screen.getByText(/^Fase 1 · 21 nov – 27 ene 2027$/)).toBeInTheDocument();
    const cierre = within(screen.getByRole('region', { name: 'Para cerrarla' }));
    expect(cierre.getAllByRole('checkbox')).toHaveLength(5);
    fireEvent.click(cierre.getAllByRole('checkbox')[2]);
    otra();
    expect(plan().hitos['v12:F1:salida:3']?.hecho).toBe(HOY);
    expect(screen.getByRole('region', { name: /^Salís al mercado con/ })).toHaveTextContent('Claude Architect');
  });

  it('una fase y una etapa muestran lo que corre de fondo en sus fechas: las apps secundarias y los slots comerciales', () => {
    const { unmount } = abrir('#/metas/periodos/F1');
    const sec = within(screen.getByRole('region', { name: /^Apps secundarias/ }));
    expect(sec.getByRole('link', { name: /^handyx|^HandyX/i })).toHaveAttribute('href', '#/metas/fondo/handyx');
    // Solo lo que se pisa con la fase (21 nov 2026 – 27 ene 2027): JulIA (26 nov – 16 dic), HandyX y Clip Studio; Roofy arranca el 28 de enero.
    expect(sec.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/metas/fondo/julia', '#/metas/fondo/handyx', '#/metas/fondo/clip-studio']);
    expect(sec.queryByText(/Roofy/)).toBeNull();
    const com = within(screen.getByRole('region', { name: /^Slots comerciales/ }));
    expect(com.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/metas/fondo/com-1', '#/metas/fondo/com-2']);
    expect(com.getByText(/#1 · Aquasol and water parks/)).toBeInTheDocument();
    // La etapa 1 lo junta todo (21 nov 2026 – 3 nov 2027): las diez apps secundarias (la última, Cursor v2, termina el 4 ago 2027) y los primeros 12 slots.
    unmount();
    abrir('#/metas/periodos/etapa-1');
    expect(within(screen.getByRole('region', { name: /^Apps secundarias/ })).getAllByRole('link')).toHaveLength(10);
    expect(within(screen.getByRole('region', { name: /^Slots comerciales/ })).getAllByRole('link')).toHaveLength(12);
  });

  it('una fase sin nada de fondo no muestra esos grupos', () => {
    abrir('#/metas/periodos/F11');
    expect(screen.queryByRole('region', { name: /^Apps secundarias/ })).toBeNull();
  });

  it('empezar el plan de nuevo: la hoja muestra qué cambia, confirma desde el día elegido y se deshace', () => {
    abrir('#/metas');
    expect(plan().corrimientos).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: /^Empezar el plan de nuevo/ }));
    const hoja = within(screen.getByRole('dialog', { name: 'Empezar de nuevo' }));
    expect(hoja.getByText(/PetrIA/, { selector: 'b' })).toBeInTheDocument();
    expect(hoja.getByText(/pasa a/)).toBeInTheDocument();
    expect(hoja.queryByRole('button', { name: /Volver todo a las fechas del plan/ })).toBeNull(); // todavía no hay corrimientos
    fireEvent.click(hoja.getByRole('button', { name: 'Empezar el 23 nov' }));
    expect(plan().corrimientos?.P1).toMatchObject({ inicio: HOY, fin: '2026-12-14' }); // sus 22 días, desde hoy
    expect(screen.getByText('Plan empezado de nuevo')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Deshacer' }).pop()!);
    expect(plan().corrimientos?.P1).toBeUndefined();
  });

  it('con el plan ya empezado desde ese día no hay nada que cambiar, y se puede volver a las fechas del plan', () => {
    abrir('#/metas');
    fireEvent.click(screen.getByRole('button', { name: /^Empezar el plan de nuevo/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Empezar de nuevo' })).getByRole('button', { name: 'Empezar el 23 nov' }));
    fireEvent.click(screen.getByRole('button', { name: /^Empezar el plan de nuevo/ }));
    const hoja = within(screen.getByRole('dialog', { name: 'Empezar de nuevo' }));
    expect(hoja.getByRole('button', { name: 'Empezar el 23 nov' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(hoja.getByRole('button', { name: 'Volver todo a las fechas del plan' }));
    expect(plan().corrimientos).toEqual({});
  });

  it('un período que no existe dice qué pasó y lleva al plan', () => {
    abrir('#/metas/periodos/NADA');
    expect(screen.getByText('No hay un período con ese nombre')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al plan' })).toHaveAttribute('href', '#/metas');
  });

  it('el análisis junta las pantallas que miran el plan desde afuera', () => {
    abrir('#/metas/analisis');
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(expect.arrayContaining(['#/metas/calibracion', '#/metas/diferencia', '#/metas/impacto', '#/metas/evolucion', '#/metas/revision', '#/metas/compras']));
  });
});
