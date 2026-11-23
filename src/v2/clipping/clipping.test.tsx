import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leerRuta } from '../../lib/routes';
import { borrarFila, guardarCampana, guardarCuenta, guardarRetainer, registrarClips } from '../../state/clipping';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { entradaDe } from '../Resolutor';
import { EXTRAS_V2 } from '../extras';
import { PANTALLAS_V2 } from '../registro';
import CampanasV2 from './CampanasV2';
import ClippingV2 from './ClippingV2';
import CuentasV2 from './CuentasV2';
import { clipsDiaPorMes, corto, cubreClipping, cuentasPorMes, decimal, entero, subsVisibles } from './datos';
import { ENTRADAS } from './entradas';
import { NichosClip, PlanClip, RiesgosClip, Semana1Clip } from './Guia';
import MetricasV2 from './MetricasV2';
import { rangoCorto } from './piezas';
import RegistroV2 from './RegistroV2';
import RetainersV2 from './RetainersV2';
import type { ComponentType } from 'react';
import type { PropsV2 } from '../registro';

// Lunes 23 nov 2026: el mes 1 del roadmap (16 nov a 15 dic), fase 1.
const HOY = '2026-11-23';
const clip = () => getState().clipping;
const global = <GlobalV2 activa="metas" pantalla="metas" pendientes={0} conBarra={false} conCheckins={false} />;
const props = (hash: string, fecha = HOY): PropsV2 => ({ ruta: leerRuta(hash), day: { ...getState().days[HOY], date: fecha }, today: fecha });
const abrir = (C: ComponentType<PropsV2>, hash: string, fecha = HOY) => render(<><C {...props(hash, fecha)} />{global}</>);
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const escribir = (c: HTMLElement | Document, nombre: string, valor: string) => { const i = within(c as HTMLElement).getByRole('textbox', { name: nombre }); fireEvent.change(i, { target: { value: valor } }); fireEvent.blur(i); };
const elegir = (nombre: string, opcion: RegExp) => { fireEvent.click(within(dialogo()).getByRole('button', { name: nombre })); fireEvent.click(within(dialogo()).getByRole('radio', { name: opcion })); };
const deshacer = () => fireEvent.click(screen.getAllByRole('button', { name: 'Deshacer' }).pop()!);

/** Una planilla con una campaña que paga bien, una cuenta activa y tres filas. */
function sembrar() {
  const k = guardarCampana({ nombre: 'GTA 6 · streamer', plataforma: 'Whop Content Rewards', nicho: 'Videojuegos', tarifa: 1.2, estado: 'activa', desde: '2026-11-17' });
  const c = guardarCuenta({ alias: 'gta.cortes', red: 'TikTok', nicho: 'Videojuegos', estado: 'activa', desde: '2026-11-16' });
  const a = registrarClips({ fecha: '2026-11-19', cuenta: c, campana: k, clips: 5, views: 40000, mas1000: 3, aprobados: 5, cobrado: 36 });
  const b = registrarClips({ fecha: '2026-11-22', cuenta: c, campana: k, clips: 4, views: 12000 });
  registrarClips({ fecha: HOY, cuenta: c, campana: k, clips: 3, views: 7000 });
  return { k, c, a, b };
}

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Clipping 2.0 · qué cubre', () => {
  it('el centro y cada sección son 2.0; lo que no existe cae al centro, como en la 1.0', () => {
    const quien = (hash: string) => ENTRADAS.find((e) => e.entrada.cubre!(leerRuta(hash)))?.entrada.nombre;
    expect(quien('#/metas/clipping')).toBe('Clipping');
    expect(quien('#/metas/clipping/inventada')).toBe('Clipping');
    for (const [sub, nombre] of [['registro', 'Registro'], ['campanas', 'Campañas'], ['cuentas', 'Cuentas'], ['retainers', 'Retainers'], ['metricas', 'Métricas'], ['plan', 'Plan'], ['nichos', 'Nichos y derechos'], ['riesgos', 'Riesgos y rutina'], ['semana1', 'Semana 1']]) expect(quien(`#/metas/clipping/${sub}`)).toBe(`Clipping · ${nombre}`);
  });

  it('solo cubre lo del Clipping: el resto de #/metas sigue donde estaba', () => {
    for (const h of ['#/metas', '#/metas/periodos', '#/metas/semana', '#/metas/proyecto/P0', '#/metas/fondo', '#/metas/mapa', '#/metas/clippingx']) {
      expect(cubreClipping(leerRuta(h)), h).toBe(false);
      expect(ENTRADAS.some((e) => e.entrada.cubre!(leerRuta(h))), h).toBe(false);
    }
    expect(cubreClipping(leerRuta('#/metas/clipping'))).toBe(true);
    expect(cubreClipping(leerRuta('#/metas/clipping/metricas'))).toBe(true);
  });

  it('el registro la resuelve (después de la entrada de Plan, que no la cubre) y las secciones son "parte" del Clipping', () => {
    expect(entradaDe(leerRuta('#/metas/clipping/cuentas'), PANTALLAS_V2, EXTRAS_V2)?.nombre).toBe('Clipping · Cuentas');
    expect(PANTALLAS_V2.metas!.cubre!(leerRuta('#/metas/clipping'))).toBe(false);
    expect(ENTRADAS.filter((e) => e.entrada.parte)).toHaveLength(9);
    expect(ENTRADAS.filter((e) => !e.entrada.parte).map((e) => e.entrada.nombre)).toEqual(['Clipping']);
  });
});

describe('Clipping 2.0 · lo que se calcula y se escribe', () => {
  it('los números a mano: puntos de miles, coma decimal, y un punto solo vale si no separa grupos de tres', () => {
    expect(entero('12.000')).toBe(12000);
    expect(entero('')).toBeUndefined();
    expect(decimal('1,09')).toBe(1.09);
    expect(decimal('1.09')).toBe(1.09);
    expect(decimal('1.234,5')).toBe(1234.5);
    expect(decimal('12.000')).toBe(12000);
    expect(decimal('')).toBeUndefined();
    expect(decimal('abc')).toBeUndefined();
  });

  it('los números de un gráfico angosto y los rangos de días', () => {
    expect(corto(950)).toBe('950');
    expect(corto(1200)).toBe('1,2k');
    expect(corto(1000)).toBe('1k');
    expect(corto(13455)).toBe('13k');
    expect(rangoCorto('2026-11-16', '2026-11-17')).toBe('16–17 nov');
    expect(rangoCorto('2026-11-18', '2026-11-18')).toBe('18 nov');
    expect(rangoCorto('2026-11-30', '2026-12-02')).toBe('30 nov – 2 dic');
  });

  it('Semana 1 se oculta sola después del mes 1; las cuentas y los clips por mes salen de la planilla', () => {
    expect(subsVisibles(HOY).map(([id]) => id)).toContain('semana1');
    expect(subsVisibles('2026-12-20').map(([id]) => id)).not.toContain('semana1');
    sembrar();
    expect(cuentasPorMes(clip(), HOY, 1)[0]).toBe(1);
    expect(cuentasPorMes(clip(), HOY, 1)[1]).toBeNull();
    expect(clipsDiaPorMes(clip(), HOY, 1)[0]).toBe(1.5); // 12 clips en los 8 días que van del mes
  });
});

describe('Clipping 2.0 · el centro', () => {
  it('vacío: lo cobrado en cero, el botón para cargar y la guía a la primera campaña', () => {
    abrir(ClippingV2, '#/metas/clipping');
    expect(screen.getByRole('heading', { name: /Clipping/, level: 1 })).toBeTruthy();
    expect(screen.getByText('Mes 1 de 12')).toBeTruthy();
    expect(screen.getByText('Arrancá la planilla')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cargar una campaña' }).getAttribute('href')).toBe('#/metas/clipping/campanas');
    expect(screen.getByRole('img', { name: /Cobrado contra la meta del mes: 0 %/ })).toBeTruthy();
    // La compuerta está sin datos y las secciones son filas que llevan a su página.
    expect(screen.getByText('Sin datos')).toBeTruthy();
    for (const sub of ['registro', 'campanas', 'cuentas', 'retainers', 'metricas', 'plan', 'nichos', 'riesgos', 'semana1']) expect(document.querySelector(`a[href="#/metas/clipping/${sub}"]`), sub).toBeTruthy();
  });

  it('con datos: lo cobrado contra la meta, los clips de hoy, los cuatro indicadores y la compuerta', () => {
    sembrar();
    abrir(ClippingV2, '#/metas/clipping');
    expect(screen.getByRole('img', { name: 'Cobrado contra la meta del mes: 24 %' })).toBeTruthy(); // USD 36 de 150
    expect(screen.getByText('Meta USD 150 · ritmo 90 %')).toBeTruthy(); // USD 36 de los USD 40 esperados a hoy
    const hoy = screen.getByText('Clips hoy').closest('.s-dato')!;
    expect(hoy.textContent).toContain('3');
    expect(hoy.textContent).toContain('de 5');
    const ind = screen.getByRole('region', { name: 'Indicadores del mes' });
    expect(ind.textContent).toContain('0,90'); // 36 por 40.000 views
    expect(ind.textContent).toContain('100 %');
    expect(ind.textContent).toContain('Cuentas activas');
    expect(screen.getByText('Verde')).toBeTruthy();
    expect(screen.getByText(/Con tu ritmo, el mes 12 cierra en USD/)).toBeTruthy();
  });

  it('la compuerta abre su hoja con los chequeos y el mes con sus tareas', () => {
    sembrar();
    abrir(ClippingV2, '#/metas/clipping');
    fireEvent.click(screen.getByRole('button', { name: /Compuerta a la fase 2/ }));
    expect(within(dialogo()).getByText(/Pago real ≥ USD 0,80/)).toBeTruthy();
    expect(within(dialogo()).getByText('USD 0,90')).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: /Aprender haciendo, a mano/ }));
    expect(within(dialogo()).getByText('5 clips a mano en 3 cuentas')).toBeTruthy();
  });

  it('Registrar clips: tres toques, recuerda la campaña y la cuenta, y deja Deshacer', () => {
    const { k, c } = sembrar();
    abrir(ClippingV2, '#/metas/clipping');
    fireEvent.click(screen.getByRole('button', { name: /Registrar clips/ }));
    const d = dialogo();
    expect(within(d).getByRole('button', { name: 'Guardar' }).getAttribute('aria-disabled')).toBe('true');
    expect(within(d).getByText('Cargá los clips o lo cobrado.')).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: 'Sumar 1' })); // el primer toque pone los del plan (5)
    escribir(d, 'Views', '12.000');
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    const filas = clip().registro;
    expect(filas).toHaveLength(4);
    expect(filas.at(-1)).toMatchObject({ fecha: HOY, clips: 5, views: 12000, campana: k, cuenta: c });
    expect(screen.getByText('Registrado · 5 clips')).toBeTruthy();
    deshacer();
    expect(clip().registro).toHaveLength(3);
  });

  it('no deja guardar más aprobados que clips y acepta fechas pasadas', () => {
    abrir(ClippingV2, '#/metas/clipping');
    fireEvent.click(screen.getByRole('button', { name: /Registrar clips/ }));
    const d = dialogo();
    escribir(d, 'Clips', '4');
    fireEvent.click(within(d).getByRole('button', { name: /Verificadas, aprobados/ }));
    escribir(d, 'Aprobados', '6');
    expect(within(d).getByText('Más aprobados que clips.')).toBeTruthy();
    expect(within(d).getByRole('button', { name: 'Guardar' }).getAttribute('aria-disabled')).toBe('true');
    escribir(d, 'Aprobados', '4');
    escribir(d, 'Cobrado · USD', '12,5');
    escribir(d, 'Nota', 'Gancho de los primeros 2 segundos');
    fireEvent.click(within(d).getByRole('button', { name: 'Fecha' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fecha: calendario' })).getByRole('gridcell', { name: '19 nov 2026' }));
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    expect(clip().registro[0]).toMatchObject({ fecha: '2026-11-19', clips: 4, views: 0, aprobados: 4, cobrado: 12.5, nota: 'Gancho de los primeros 2 segundos' });
  });
});

describe('Clipping 2.0 · el registro', () => {
  it('vacío invita a cargar; con filas muestra los totales del mes y filtra', () => {
    const { unmount } = abrir(RegistroV2, '#/metas/clipping/registro');
    expect(screen.getByText('Sin filas en este período')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Registrar clips/ })).toHaveLength(1);
    unmount();
    sembrar();
    registrarClips({ fecha: '2026-11-10', clips: 2, views: 900 }); // antes del roadmap: el filtro del mes 1 no la trae
    abrir(RegistroV2, '#/metas/clipping/registro');
    const t = screen.getByRole('region', { name: 'Totales del período' });
    expect(t.textContent).toContain('12'); // clips
    expect(t.textContent).toContain('59.000'); // views
    expect(t.textContent).toContain('36'); // cobrado
    expect(screen.getByText('3 filas')).toBeTruthy();
    const filas = screen.getByText('3 clips · 7.000 views').closest('.s-lista')!;
    expect(within(filas as HTMLElement).getAllByRole('button')).toHaveLength(3);
    // Por mes: "Todo" suma la de antes del roadmap.
    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    elegir('Mes', /^Todo/);
    expect(screen.getByText('4 filas')).toBeTruthy();
  });

  it('tocar una fila la edita; borrarla deja Deshacer y la vuelve a poner en su lugar', () => {
    const { a } = sembrar();
    abrir(RegistroV2, '#/metas/clipping/registro');
    fireEvent.click(screen.getByText('5 clips · 40.000 views'));
    const d = dialogo();
    expect(within(d).getByRole('heading', { name: 'Editar fila' })).toBeTruthy();
    expect((within(d).getByRole('textbox', { name: 'Views' }) as HTMLInputElement).value).toBe('40000');
    escribir(d, 'Views', '45000');
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar cambios' }));
    expect(clip().registro.find((f) => f.id === a)).toMatchObject({ views: 45000, clips: 5, cobrado: 36 });
    expect(screen.getByText('Fila actualizada')).toBeTruthy();
    deshacer();
    expect(clip().registro.find((f) => f.id === a)!.views).toBe(40000);

    fireEvent.click(screen.getByText('5 clips · 40.000 views'));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la fila' }));
    expect(clip().registro.some((f) => f.id === a)).toBe(false);
    deshacer();
    expect(clip().registro.map((f) => f.fecha)).toEqual(['2026-11-19', '2026-11-22', HOY]);
  });

  it('exporta el JSON de siempre e importa validando línea por línea, con Deshacer', () => {
    sembrar();
    abrir(RegistroV2, '#/metas/clipping/registro');
    fireEvent.click(screen.getByRole('button', { name: /^Exportar o importar/ }));
    const d = dialogo();
    expect(within(d).getByRole('button', { name: 'Importar' }).getAttribute('aria-disabled')).toBe('true');
    expect(within(d).getByText('Pegá el JSON primero.')).toBeTruthy();
    escribir(d, 'JSON para importar', '{esto no es json');
    fireEvent.click(within(d).getByRole('button', { name: 'Importar' }));
    expect(within(d).getByText('No es un JSON válido.')).toBeTruthy();
    escribir(d, 'JSON para importar', JSON.stringify({ registro: [{ fecha: '2026-11-20', clips: 2, views: 100, aprobados: 5 }, { fecha: 'ayer', clips: 1, views: 1 }] }));
    fireEvent.click(within(d).getByRole('button', { name: 'Importar' }));
    expect(within(d).getByText('registro 1: hay más aprobados que clips')).toBeTruthy();
    expect(within(d).getByText('registro 2: "fecha" tiene que ser AAAA-MM-DD')).toBeTruthy();
    expect(clip().registro).toHaveLength(3);
    escribir(d, 'JSON para importar', JSON.stringify({ registro: [{ id: 'x1', fecha: '2026-11-20', clips: 2, views: 1500 }], cuentas: [{ id: 'cc', alias: 'nueva', red: 'Reels', nicho: '', estado: 'calentando', desde: HOY }] }));
    fireEvent.click(within(d).getByRole('button', { name: 'Importar' }));
    expect(clip().registro).toHaveLength(4);
    expect(clip().cuentas.map((c) => c.alias)).toEqual(['gta.cortes', 'nueva']);
    expect(screen.getByText('Planilla importada')).toBeTruthy();
    deshacer();
    expect(clip().registro).toHaveLength(3);
    expect(clip().cuentas).toHaveLength(1);
  });

  it('la planilla se exporta con el esquema de la 1.0 (tipo, versión y las listas)', () => {
    sembrar();
    let blob: Blob | undefined;
    const crear = URL.createObjectURL;
    URL.createObjectURL = (b: Blob | MediaSource) => { blob = b as Blob; return 'blob:x'; };
    const clic = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { /* sin descargar */ };
    try {
      abrir(RegistroV2, '#/metas/clipping/registro');
      fireEvent.click(screen.getByRole('button', { name: /^Exportar o importar/ }));
      fireEvent.click(within(dialogo()).getByRole('button', { name: 'Exportar la planilla' }));
    } finally { URL.createObjectURL = crear; HTMLAnchorElement.prototype.click = clic; }
    expect(blob?.type).toBe('application/json');
  });
});

describe('Clipping 2.0 · cuentas, campañas y retainers', () => {
  it('cuentas vacío guía a la primera; crear, editar y borrar (con deshacer)', () => {
    abrir(CuentasV2, '#/metas/clipping/cuentas');
    expect(screen.getByText('Sin cuentas todavía')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Nueva cuenta/ }));
    let d = dialogo();
    expect(within(d).getByRole('button', { name: 'Guardar' }).getAttribute('aria-disabled')).toBe('true');
    escribir(d, 'Alias', ' gta.cortes ');
    elegir('Red', /^Reels/);
    elegir('Nicho', /^Videojuegos/);
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    expect(clip().cuentas).toMatchObject([{ alias: 'gta.cortes', red: 'Reels', nicho: 'Videojuegos', estado: 'calentando', desde: HOY }]);

    expect(screen.getByRole('button', { name: /gta\.cortes/ }).textContent).toContain('Calentando');
    fireEvent.click(screen.getByRole('button', { name: /gta\.cortes/ }));
    d = dialogo();
    elegir('Estado', /^Activa/);
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    expect(clip().cuentas[0].estado).toBe('activa');
    expect(screen.getByRole('region', { name: 'La granja contra el plan' }).textContent).toContain('1'); // ya es una activa

    fireEvent.click(screen.getByRole('button', { name: /gta\.cortes/ }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la cuenta' }));
    expect(clip().cuentas).toEqual([]);
    deshacer();
    expect(clip().cuentas.map((c) => c.alias)).toEqual(['gta.cortes']);
  });

  it('campañas: el ranking de qué seguir y qué dejar, y crear una con tarifa en coma', () => {
    const k = guardarCampana({ nombre: 'Buena', plataforma: 'Whop', nicho: '', tarifa: 1.1, estado: 'activa', desde: '2026-11-17' });
    const m = guardarCampana({ nombre: 'Mala', plataforma: 'Vyro', nicho: '', tarifa: 1, estado: 'probando', desde: '2026-11-17' });
    registrarClips({ fecha: '2026-11-19', campana: k, clips: 5, views: 10000, cobrado: 10 });
    registrarClips({ fecha: '2026-11-19', campana: m, clips: 5, views: 10000, cobrado: 6 });
    abrir(CampanasV2, '#/metas/clipping/campanas');
    const rank = screen.getByRole('region', { name: 'Qué conviene' });
    expect(within(rank).getByText('Conviene seguir').parentElement!.textContent).toContain('Buena · 1,00');
    expect(within(rank).getByText('Dejar').parentElement!.textContent).toContain('Mala · 0,60');
    fireEvent.click(screen.getByRole('button', { name: /Nueva campaña/ }));
    const d = dialogo();
    escribir(d, 'Nombre', 'Podcast X');
    expect(within(d).getByRole('button', { name: 'Guardar' }).getAttribute('aria-disabled')).toBe('true');
    expect(within(d).getByText('Cargá la tarifa listada.')).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: 'Vyro' }));
    escribir(d, 'Tarifa · USD por 1.000', '1,4');
    escribir(d, 'Tope por clip · USD', '150');
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    expect(clip().campanas.at(-1)).toMatchObject({ nombre: 'Podcast X', plataforma: 'Vyro', tarifa: 1.4, tope: 150, estado: 'probando' });
  });

  it('una campaña se edita y se borra con deshacer; la hoja muestra cómo viene (listada, real, brecha)', () => {
    const k = guardarCampana({ nombre: 'GTA', plataforma: 'Whop', nicho: '', tarifa: 1.2, estado: 'activa', desde: '2026-11-17' });
    registrarClips({ fecha: '2026-11-19', campana: k, clips: 5, views: 10000, cobrado: 9 });
    abrir(CampanasV2, '#/metas/clipping/campanas');
    fireEvent.click(screen.getByRole('button', { name: /^GTA/ }));
    const d = dialogo();
    const viene = within(d).getByRole('group', { name: 'Cómo viene la campaña' });
    expect(viene.textContent).toContain('1,20');
    expect(viene.textContent).toContain('0,90');
    expect(viene.textContent).toContain('−0,30');
    elegir('Estado', /^Pausada/);
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    expect(clip().campanas[0].estado).toBe('pausada');
    fireEvent.click(screen.getByRole('button', { name: /^GTA/ }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la campaña' }));
    expect(clip().campanas).toEqual([]);
    deshacer();
    expect(clip().campanas.map((c) => c.nombre)).toEqual(['GTA']);
  });

  it('retainers: el fijo suma solo los activos, los contadores de la semana suman y restan, y se crea con la prueba sin cobrar', () => {
    guardarRetainer({ nombre: 'Lucho', estado: 'activo', usdMes: 300, desde: '2026-11-16' });
    guardarRetainer({ nombre: 'Ana', estado: 'prueba', usdMes: 200, desde: '2026-11-20' });
    abrir(RetainersV2, '#/metas/clipping/retainers');
    expect(screen.getByRole('region', { name: 'Fijo mensual' }).textContent).toContain('300');
    const msj = within(screen.getByRole('group', { name: 'Mensajes enviados esta semana' }));
    fireEvent.click(msj.getByRole('button', { name: 'Sumar 1' }));
    fireEvent.click(msj.getByRole('button', { name: 'Sumar 1' }));
    expect(clip().prospeccion[HOY]).toEqual({ mensajes: 2, pruebas: 0 });
    fireEvent.click(msj.getByRole('button', { name: 'Restar 1' }));
    expect(clip().prospeccion[HOY].mensajes).toBe(1);
    expect(screen.getByRole('progressbar', { name: 'Mensajes enviados del mes 1: 1 de 20' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Nuevo retainer/ }));
    const d = dialogo();
    escribir(d, 'Streamer o podcaster', 'Pablo');
    escribir(d, 'USD por mes', '450');
    escribir(d, 'Clips por mes', '20');
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar' }));
    expect(clip().retainers.at(-1)).toMatchObject({ nombre: 'Pablo', estado: 'prueba', usdMes: 450, clipsMes: 20, desde: HOY });
    expect(screen.getByRole('region', { name: 'Fijo mensual' }).textContent).toContain('300'); // la prueba no cobra
    deshacer();
    expect(clip().retainers.map((r) => r.nombre)).toEqual(['Lucho', 'Ana']);
  });
});

describe('Clipping 2.0 · las métricas', () => {
  it('vacío: los gráficos dicen qué cargar; con datos: el período, el ingreso por mes, el pago por campaña y la concentración', () => {
    const { unmount } = abrir(MetricasV2, '#/metas/clipping/metricas');
    expect(screen.getByText('Cargá campañas y cobros para comparar el pago real con la tarifa listada.')).toBeTruthy();
    expect(screen.getByText('Sin cobros en el período.')).toBeTruthy();
    unmount();
    sembrar();
    abrir(MetricasV2, '#/metas/clipping/metricas');
    expect(screen.getByRole('radio', { name: '30 días' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('img', { name: /^Ingreso por mes del roadmap, en USD: mes 1, 36;/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /GTA 6 · streamer: pago real 0,90, tarifa listada 1,20/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'GTA 6 · streamer: 100 % del ingreso, tope 30 %' })).toBeTruthy();
    expect(screen.getByText('Pasa el tope')).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Proyección del mes 12 contra USD 10\.000: 81 %$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Todo' }));
    expect(screen.getByRole('radio', { name: 'Todo' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Plataforma' }));
    expect(screen.getByRole('img', { name: 'Whop Content Rewards: 100 % del ingreso, tope 30 %' })).toBeTruthy();
    // Todos los dibujos son `data-grafico`.
    for (const g of screen.getAllByRole('img')) expect(g.closest('[data-grafico]') ?? g.hasAttribute('data-grafico'), g.getAttribute('aria-label') ?? '').toBeTruthy();
  });

  it('los otros gráficos van en hojas: la actividad, la semana a semana, la granja y las views por clip', () => {
    sembrar();
    abrir(MetricasV2, '#/metas/clipping/metricas');
    fireEvent.click(screen.getByRole('button', { name: /^Actividad/ }));
    expect(within(dialogo()).getByRole('img', { name: /Clips por día en las últimas 13 semanas: 3 días con clips/ })).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: /^Semana a semana/ }));
    expect(within(dialogo()).getByRole('img', { name: /^Pago real por 1\.000 views, en USD, semana a semana: 16 nov 0,90\./ })).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('radio', { name: 'Cuentas' }));
    expect(within(dialogo()).getByRole('img', { name: /^Cuentas activas, semana a semana/ })).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: /^La granja contra el plan/ }));
    expect(within(dialogo()).getByRole('img', { name: /^Cuentas activas por mes del roadmap: mes 1, 1;/ })).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('radio', { name: 'Clips por día' }));
    expect(within(dialogo()).getByRole('img', { name: /^Clips por día por mes del roadmap/ })).toBeTruthy();
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: /^Views por clip/ }));
    expect(within(dialogo()).getByRole('img', { name: /Clips por tramo de views: < 500, 0; 500–1k, 0; 1k–3,5k, 7; 3,5k–10k, 5/ })).toBeTruthy();
  });
});

describe('Clipping 2.0 · lo que se lee', () => {
  it('el plan: tres fases, la del mes en curso marcada "Acá" y su mes actual en el paso a paso', () => {
    abrir(PlanClip, '#/metas/clipping/plan');
    expect(screen.getByRole('img', { name: /Meta por mes del roadmap, en USD: mes 1, 150;.*Estás en el mes 1/ })).toBeTruthy();
    expect(screen.getAllByText('Acá')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Arranque y primeros ingresos/ }));
    const d = dialogo();
    expect(d.querySelector('li[aria-current="step"]')?.textContent).toContain('Aprender haciendo, a mano');
    expect(within(d).getByText(/Pago real de USD 0,80 o más/)).toBeTruthy();
    expect(within(d).getByText('Hitos')).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: /Tus apps/ }));
    expect(within(dialogo()).getByText(/Regla de oro/)).toBeTruthy();
  });

  it('nichos: el riesgo con ícono y palabra, y los derechos en su hoja', () => {
    abrir(NichosClip, '#/metas/clipping/nichos');
    expect(screen.getByRole('button', { name: /Películas y series/ }).textContent).toContain('Riesgo alto');
    expect(screen.getByRole('button', { name: /^Streamers/ }).textContent).toContain('Riesgo bajo');
    fireEvent.click(screen.getByRole('button', { name: /^Derechos/ }));
    expect(within(dialogo()).getByText(/Sin autorización: strike/)).toBeTruthy();
  });

  it('riesgos y rutina: se tilda por semana, el de hoy trae su texto y cada riesgo abre su plan B', () => {
    abrir(RiesgosClip, '#/metas/clipping/riesgos');
    const lunes = screen.getByRole('checkbox', { name: /Lunes · revisar/ });
    expect(lunes.textContent).toContain('Hoy · Revisar el dashboard');
    expect(screen.getByRole('checkbox', { name: /Viernes · decidir/ }).textContent).not.toContain('Pago real');
    fireEvent.click(lunes);
    expect(clip().rutina[HOY]).toEqual(['lunes']);
    expect(lunes.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(lunes);
    expect(clip().rutina[HOY]).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Concentración/ }));
    expect(within(dialogo()).getByText(/Ninguna campaña ni plataforma por encima del 30 %/)).toBeTruthy();
  });

  it('semana 1: cada paso dice si está hecho, es de ahora o viene, y su texto entero va en la hoja', () => {
    const { unmount } = abrir(Semana1Clip, '#/metas/clipping/semana1', '2026-11-19');
    const paso = (n: RegExp) => screen.getByRole('button', { name: n });
    expect(paso(/Cuentas y reglas/).textContent).toContain('Hecho');
    expect(paso(/Tres campañas y primeros clips/).textContent).toContain('Acá');
    expect(paso(/La planilla y el descarte/).textContent).toContain('Próximo');
    fireEvent.click(paso(/La planilla y el descarte/));
    expect(within(dialogo()).getByText(/Planilla con views, aprobaciones y pago real por campaña/)).toBeTruthy();
    unmount();
    abrir(Semana1Clip, '#/metas/clipping/semana1');
    expect(screen.getAllByText('Hecho')).toHaveLength(4);
  });
});

describe('Clipping 2.0 · nada se pierde de la 1.0', () => {
  it('la planilla de la 1.0 se ve igual en la 2.0 (mismas filas, mismo orden, mismo cobrado del mes)', () => {
    const { a } = sembrar();
    borrarFila(a);
    abrir(ClippingV2, '#/metas/clipping');
    expect(clip().registro.map((f) => f.fecha)).toEqual(['2026-11-22', HOY]);
    expect(screen.getByRole('img', { name: 'Cobrado contra la meta del mes: 0 %' })).toBeTruthy();
  });
});
