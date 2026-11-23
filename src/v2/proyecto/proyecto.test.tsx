import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { certV12, estadoCert } from '../../data/certs-v12';
import { HERRAMIENTAS } from '../../data/herramientas';
import { claveHito } from '../../data/periodos-plan';
import { PLAN, tramoPorId } from '../../data/plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import PlanV2 from '../plan/PlanV2';
import { cubreMetas } from '../registro';
import { diaMes, fichaFilas, mayuscula, primeraFrase, rotuloBloque, tituloCorto, vecinos } from './datos';
import { ANCHO, ALTO, MOTIVOS, motivoDe, portada, semilla } from './portada-datos';
import Rutas from './Rutas';

const HOY = '2026-11-23';
const plan = () => getState().plan;
const abrir = (param: string, hoy = HOY) => render(<><Rutas param={param} hoy={hoy} /><GlobalV2 activa="metas" pendientes={0} conBarra={false} conMini={false} /></>);
const fila = (nombre: RegExp | string) => screen.getByRole('button', { name: nombre });
/** La hoja de arriba (una que se está cerrando todavía puede estar en pantalla). */
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const escribir = (etiqueta: string | RegExp, v: string, salir = false) => {
  const c = screen.getByRole('textbox', { name: etiqueta });
  fireEvent.change(c, { target: { value: v } });
  if (salir) fireEvent.blur(c);
};

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Portada · el dibujo generado', () => {
  it('es siempre el mismo para el mismo bloque y distinto entre bloques', () => {
    expect(portada('P1')).toEqual(portada('P1'));
    const ids = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
    const firmas = new Set(ids.map((id) => JSON.stringify(portada(id).trazos)));
    expect(firmas.size).toBe(ids.length);
    expect(semilla('P1')).toBe(semilla('P1'));
    expect(semilla('P1')).not.toBe(semilla('P2'));
  });

  it('usa los cuatro motivos y cada tipo de bloque tiene el suyo', () => {
    const motivos = new Set(Array.from({ length: 40 }, (_, i) => motivoDe(`id-${i}`)));
    expect([...motivos].sort()).toEqual([...MOTIVOS].sort());
    expect(motivoDe('CW1', 'cert')).toBe('malla');
    expect(motivoDe('W1', 'ventana')).toBe('isobandas');
    expect(motivoDe('E1', 'ingles')).toBe('ondas');
    expect(portada('W1', 'ventana').motivo).toBe('isobandas');
  });

  it('todo cae cerca del lienzo y tiene algo que dibujar', () => {
    for (const id of ['P1', 'P2', 'P3', 'P4', 'handyx', 'julia', 'com-1', 'CW1', 'W1']) {
      const a = portada(id, id === 'CW1' ? 'cert' : id === 'W1' ? 'ventana' : undefined);
      expect(a.trazos.length).toBeGreaterThan(4);
      expect(a.puntos.length).toBeGreaterThan(2);
      for (const p of a.puntos) { expect(p.x).toBeGreaterThan(-80); expect(p.x).toBeLessThan(ANCHO + 100); expect(p.y).toBeGreaterThan(-80); expect(p.y).toBeLessThan(ALTO + 80); }
      for (const t of a.trazos) { expect(t.d.startsWith('M')).toBe(true); expect(t.o).toBeGreaterThan(0); expect(t.o).toBeLessThanOrEqual(1); expect(Number.isNaN(Number(t.d.replace(/[^0-9.-]+/g, ' ').trim().split(' ')[0]))).toBe(false); }
    }
  });
});

describe('Bloque 2.0 · los datos', () => {
  it('qué rutas de #/metas son 2.0: los bloques y lo de fondo sí; P0 y el resto, no', () => {
    for (const p of ['proyecto/P1', 'proyecto/CW1', 'cert/claude-architect', 'ventana/W1', 'pista/secundaria', 'pista/comercial', 'fondo', 'fondo/handyx', 'iman/handyx', 'open-source']) expect(cubreMetas(p), p).toBe(true);
    for (const p of ['proyecto', 'proyecto/P0', 'proyecto/P1/x', 'roadmap', 'clipping', 'clipping/x', 'semana', 'mapa', 'fondo/a/b']) expect(cubreMetas(p), p).toBe(false);
  });

  it('la ficha se arma en grupos: qué es, cómo se construye, para el mercado', () => {
    const g = fichaFilas('P1');
    expect(g.map((x) => x.grupo)).toEqual(['Qué es', 'Cómo se construye', 'Para el mercado']);
    expect(g[0].filas[0].etiqueta).toBe('Puesto');
    expect(g.flatMap((x) => x.filas).every((f) => f.texto || f.lista?.length)).toBe(true);
    // Una ventana trae lo suyo.
    expect(fichaFilas('W1').flatMap((x) => x.filas).map((f) => f.etiqueta)).toContain('Libro principal');
    expect(fichaFilas('E1')).toEqual([]); // inglés no tiene ficha
  });

  it('textos: primera frase, título corto, mayúscula y día y mes', () => {
    expect(primeraFrase('Mapa de pozos. Lector de partes. Asistente.')).toBe('Mapa de pozos.');
    expect(primeraFrase('Sin punto')).toBe('Sin punto');
    expect(tituloCorto('Claude Certified Architect – Foundations')).toBe('Claude Certified Architect');
    expect(tituloCorto('AWS SAA: examen')).toBe('AWS SAA');
    expect(tituloCorto('PetrIA')).toBe('PetrIA');
    expect(mayuscula('on-demand')).toBe('On-demand');
    expect(diaMes('2027-01-12')).toBe('12 ene');
    expect(diaMes('2026-12-05')).toBe('5 dic');
  });

  it('el bloque anterior y el siguiente saltean descansos; el rótulo cuenta el proyecto', () => {
    expect(vecinos('P1').sig?.id).toBe('CW1');
    expect(vecinos('nada')).toEqual({});
    expect(rotuloBloque(tramoPorId('P1'), undefined)).toMatch(/^Proyecto 1 de \d+ · petróleo$/);
    expect(rotuloBloque(tramoPorId('CW1'), undefined)).toBe('Certificación');
    expect(rotuloBloque(tramoPorId('W1'), undefined)).toBe('Matemática');
  });
});

describe('Página de un bloque', () => {
  it('arriba, la portada, lo que es y cómo va; tres pestañas', () => {
    const { container } = abrir('proyecto/P1');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PetrIA');
    expect(container.querySelector('.pt-portada svg')).toBeTruthy();
    expect(screen.getByText(/^Proyecto 1 de \d+ · petróleo$/i)).toBeTruthy();
    expect(screen.getByText('Hecho')).toBeTruthy();
    expect(within(screen.getByRole('radiogroup', { name: 'Qué ver' })).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Resumen', 'Ficha', 'Stack']);
    expect(screen.getByRole('link', { name: /Período/ }).getAttribute('href')).toBe('#/metas/periodos/P1');
  });

  it('Ficha y Stack muestran lo que dice el plan', () => {
    abrir('proyecto/P1');
    fireEvent.click(screen.getByRole('radio', { name: 'Ficha' }));
    expect(screen.getByText('Puesto')).toBeTruthy();
    expect(screen.getByText('Qué es')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Stack' }));
    expect(screen.getByText('Perfil al cerrar')).toBeTruthy();
    expect(screen.getByText('Entornos')).toBeTruthy();
  });

  it('las versiones son un paso a paso: cada una abre su hoja, se tildan los entregables y se publica', () => {
    abrir('proyecto/P1');
    const pasos = screen.getAllByRole('button', { name: /^Versión \d/ });
    expect(pasos.map((p) => p.textContent)).toEqual(['1.0MVP', '1.1Producto', '2.0Plataforma', '3.0Producción']);
    fireEvent.click(pasos[0]);
    const d = dialogo();
    expect(within(d).getByText('1.0 · MVP')).toBeTruthy();
    fireEvent.click(within(d).getByRole('checkbox', { name: /Notas de versión/ }));
    expect(plan().versiones?.P1?.['1.0']?.notas).toBe(true);
    fireEvent.click(within(d).getByRole('button', { name: 'Publicada hoy' }));
    expect(plan().versiones?.P1?.['1.0']?.publicada).toBe(HOY);
    expect(within(d).getByRole('button', { name: /Sacar de publicadas/ })).toBeTruthy();
    // El lanzamiento (3.0) no se publica sin el Imán.
    fireEvent.keyDown(d, { key: 'Escape' });
  });

  it('la 3.0 es el lanzamiento: pide el Imán completo antes de publicarse', () => {
    abrir('proyecto/P1');
    fireEvent.click(screen.getByRole('button', { name: /^Versión 3\.0/ }));
    expect(within(dialogo()).getByRole('link', { name: /Faltan 8 puntos del Imán/ }).getAttribute('href')).toBe('#/metas/iman/P1');
  });

  it('Para cerrar: estándar, evidencia, técnica, agéntico, tiempo, revisiones, examen y horas, cada uno con su hoja', () => {
    abrir('proyecto/P1');
    const capas = PLAN.programacion.estandar;
    // Estándar de alto valor
    expect(fila(/Estándar de alto valor/).textContent).toContain(`0 de ${capas.length}`);
    fireEvent.click(fila(/Estándar de alto valor/));
    fireEvent.click(within(dialogo()).getAllByRole('checkbox')[0]);
    expect(plan().proyectos.P1.estandar[capas[0].id]).toBe(true);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    // Evidencia
    fireEvent.click(fila(/Puerta de evidencia/));
    fireEvent.click(within(dialogo()).getAllByRole('checkbox')[0]);
    expect(plan().proyectos.P1.evidencia?.medido).toBe(true);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    // Tiempo
    fireEvent.click(fila(/Tiempo real/));
    fireEvent.click(within(dialogo()).getAllByRole('button', { name: '30 min' })[0]);
    expect(plan().proyectos.P1.tiempo.nucleo).toBe(30);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    // Examen
    fireEvent.click(fila(/^Examen/));
    escribir('Puntaje (0 a 100)', '90');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar' }));
    expect(plan().proyectos.P1.examen).toEqual({ fecha: HOY, puntaje: 90 });
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
  });

  it('entrevista técnica, portfolio agéntico y revisiones guardan lo que cargás', () => {
    abrir('proyecto/P1');
    fireEvent.click(fila(/Entrevista técnica/));
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: /Documento de diseño/ }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Sumar 1' }));
    expect(plan().proyectos.P1.tecnica).toMatchObject({ diseno: true, ejercicios: 1 });
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    fireEvent.click(fila(/Portfolio agéntico/));
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: /Servidor MCP/ }));
    expect(plan().proyectos.P1.mcp).toBe(true);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    fireEvent.click(fila(/Revisiones/));
    escribir('Qué falló en la revisión', 'Faltó un test');
    fireEvent.click(within(dialogo()).getByRole('radio', { name: 'Descuido' }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar revisión' }));
    expect(plan().proyectos.P1.revisiones[0]).toMatchObject({ texto: 'Faltó un test', tipo: 'descuido', fecha: HOY });
  });

  it('las metas del bloque se arman, se tildan, tienen submetas y se borran (con confirmación)', async () => {
    abrir('proyecto/P1');
    fireEvent.click(fila(/Agregar la primera meta/));
    escribir('Qué querés lograr', 'Terminar el MVP');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar y cerrar' }));
    expect(plan().metasBloque?.P1?.[0].texto).toBe('Terminar el MVP');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Terminar el MVP' }));
    expect(plan().metasBloque?.P1?.[0].hecho).toBe(HOY);
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de Terminar el MVP' }));
    escribir('Nueva submeta', 'Escribir el README');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar submeta' }));
    expect(plan().metasBloque?.P1?.[0].subs?.map((s) => s.t)).toEqual(['Escribir el README']);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Borrar la meta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(plan().metasBloque?.P1 ?? []).toEqual([]));
  });

  it('una certificación muestra sus exámenes con cuenta regresiva; una ventana, sus hitos y la puerta', () => {
    abrir('proyecto/CW1');
    const ex = screen.getByRole('link', { name: /Claude Certified Architect/ });
    expect(ex.getAttribute('href')).toBe('#/metas/cert/claude-architect');
    expect(ex.textContent).toContain('en 19 d');
    expect(fila(/Horas y fechas/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Estándar de alto valor/ })).toBeNull();
  });

  it('una ventana: hitos, nivel de salida y la puerta que abre el proyecto siguiente', () => {
    abrir('proyecto/W1');
    expect(screen.getByRole('link', { name: /Hitos de la ventana/ }).getAttribute('href')).toBe('#/metas/ventana/W1');
    expect(screen.getByText(/^Puerta W1 · abre /)).toBeTruthy();
    fireEvent.click(fila(/^Examen/));
    escribir('Puntaje (0 a 100)', '90');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar' }));
    expect(plan().proyectos.W1.examen?.puntaje).toBe(90);
  });

  it('un bloque que no existe dice que no existe; P0 no se muestra acá', () => {
    abrir('proyecto/nada');
    expect(screen.getByText('No hay un bloque con ese nombre')).toBeTruthy();
  });

  it('por el Plan, la ruta carga aparte y muestra la página', async () => {
    render(<PlanV2 ruta={leerRuta('#/metas/proyecto/P1')} day={getState().days[HOY]} today={HOY} />);
    expect(await screen.findByRole('heading', { level: 1, name: /PetrIA/ })).toBeTruthy();
  });
});

describe('Certificación 2.0', () => {
  const ID = 'claude-architect';
  it('arriba, la fecha del examen con la cuenta regresiva; el título es corto y el nombre entero va abajo', () => {
    const c = certV12(ID)!;
    expect(estadoCert(c, plan(), HOY).diasAlExamen).toBe(19);
    abrir(`cert/${ID}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Claude Certified Architect');
    expect(screen.getByText('Claude Certified Architect – Foundations')).toBeTruthy();
    expect(screen.getByText(/^Examen · 12 dic$/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cert window 1/ }).getAttribute('href')).toBe('#/metas/proyecto/CW1');
  });

  it('se cargan simulacros: el anillo mide contra la meta y se puede borrar el último', () => {
    abrir(`cert/${ID}`);
    expect(screen.getByText('Todavía sin simulacros.')).toBeTruthy();
    escribir('Puntaje del simulacro (%)', '60');
    fireEvent.click(screen.getByRole('button', { name: 'Cargar simulacro' }));
    expect(plan().mocks?.[ID]).toEqual([{ fecha: HOY, pct: 60 }]);
    expect(screen.getByText('Faltan 25 puntos.')).toBeTruthy();
    escribir('Puntaje del simulacro (%)', '90');
    fireEvent.click(screen.getByRole('button', { name: 'Cargar simulacro' }));
    expect(screen.getByText('Llegaste al puntaje.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar el último' }));
    expect(plan().mocks?.[ID]).toHaveLength(1);
  });

  it('reservar el examen lo deja como fecha fija; se deshace', () => {
    abrir(`cert/${ID}`);
    fireEvent.click(screen.getByRole('button', { name: 'Reservé para esa fecha' }));
    expect(plan().reservas?.[ID]?.examen).toBe('2026-12-12');
    expect(screen.getByText('Reservado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(plan().reservas?.[ID]).toBeUndefined();
  });

  it('aprobada se marca a mano y el plan día por día se abre aparte', () => {
    abrir(`cert/${ID}`);
    fireEvent.click(screen.getByRole('checkbox', { name: /^Aprobada/ }));
    expect(plan().hitos[claveHito.cert(ID)]?.hecho).toBe(HOY);
    expect(screen.getByText('Aprobada', { selector: '.t-rotulo' })).toBeTruthy();
    fireEvent.click(fila(/El plan día por día/));
    expect(within(dialogo()).getAllByRole('listitem').length).toBe(certV12(ID)!.plan.length);
  });

  it('una certificación que no existe lo dice', () => {
    abrir('cert/no-existe');
    expect(screen.getByText('No hay una certificación con ese nombre')).toBeTruthy();
  });
});

describe('Ventana 2.0', () => {
  it('los hitos se tildan de a uno y la ventana no se cierra con hitos sin tildar', () => {
    abrir('ventana/W1');
    const b = PLAN_EXT.bloques.find((x) => x.id === 'W1')!;
    const cerrar = () => screen.getByRole('button', { name: 'Cerrar la ventana' });
    expect(screen.getByText(`0 de ${b.hitos!.length}`)).toBeTruthy();
    expect(cerrar().getAttribute('aria-disabled') === 'true' || (cerrar() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(plan().hitos[claveHito.mate('W1', 0)]?.hecho).toBe(HOY);
    for (const c of screen.getAllByRole('checkbox').slice(1)) fireEvent.click(c);
    expect(cerrar().getAttribute('aria-disabled')).not.toBe('true');
    fireEvent.click(cerrar());
    expect(plan().hitos[claveHito.bloque('W1')]?.hecho).toBe(HOY);
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeTruthy();
  });
});

describe('De fondo 2.0', () => {
  it('el hub: lo que corre ahora, las dos pistas, el Imán de lo que viene, open source y clipping', () => {
    abrir('fondo');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('De fondo');
    expect(screen.getByRole('link', { name: 'Pista secundaria' }).getAttribute('href')).toBe('#/metas/pista/secundaria');
    expect(screen.getByRole('link', { name: 'Pista comercial' }).getAttribute('href')).toBe('#/metas/pista/comercial');
    expect(screen.getAllByRole('link', { name: /HandyX/ })[0].getAttribute('href')).toBe('#/metas/fondo/handyx');
    expect(screen.getAllByRole('link', { name: /0 de 8 puntos/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: /Open source/ }).getAttribute('href')).toBe('#/metas/open-source');
    expect(screen.getByRole('link', { name: /Clipping/ }).getAttribute('href')).toBe('#/metas/clipping');
  });

  it('la pista secundaria: una tarjeta por app, cada una con su portada; la comercial, un pipeline por estado', () => {
    const { container, unmount } = abrir('pista/secundaria');
    expect(screen.getAllByRole('link', { name: /^(HandyX|JulIA|Clip Studio|Roofy),/ })).toHaveLength(4);
    expect(container.querySelectorAll('.pt-app .pt-portada')).toHaveLength(4);
    unmount();
    abrir('pista/comercial');
    expect(screen.getByRole('button', { name: 'planificado · 23', pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^publicado · 0/ }));
    expect(screen.getByText('Ninguno por ahora.')).toBeTruthy();
  });

  it('una app secundaria: versiones como pasos, repo y demo que guardan al salir', () => {
    abrir('fondo/handyx');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('HandyX');
    expect(screen.getAllByRole('button', { name: /^Versión \d/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /^Versión 1\.0/ }));
    expect(within(dialogo()).getByText('v1.0')).toBeTruthy();
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    escribir('Repo', 'https://github.com/yo/handyx', true);
    expect(plan().fondo?.handyx?.repo).toBe('https://github.com/yo/handyx');
    expect(screen.getByRole('link', { name: 'Imán: 0 de 8 puntos' }).getAttribute('href')).toBe('#/metas/iman/handyx');
  });

  it('un showcase comercial: publicarlo pide el Imán y la seguridad; los leads se suman y cambian de estado', () => {
    abrir('fondo/com-1');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Aquasol|Showcase 1/i);
    fireEvent.click(screen.getByRole('button', { name: 'publicado' }));
    expect(plan().fondo?.['com-1']?.estado).toBeUndefined(); // sin Imán ni seguridad, no se publica
    expect(screen.getByRole('alert')).toHaveTextContent(/Para publicarlo falta/);
    fireEvent.click(screen.getByRole('button', { name: 'en construcción' }));
    expect(plan().fondo?.['com-1']?.estado).toBe('building');
    fireEvent.click(fila(/Seguridad antes de publicar/));
    fireEvent.click(within(dialogo()).getAllByRole('checkbox')[0]);
    expect(plan().seguridadShowcase?.['com-1']?.[0]).toBe(true);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    escribir('Nuevo lead', 'Acme');
    fireEvent.click(screen.getByRole('button', { name: 'Sumar lead' }));
    expect(plan().fondo?.['com-1']?.leads?.[0]).toMatchObject({ nombre: 'Acme', estado: 'contactado', contactado: HOY });
  });

  it('un ítem que no existe lo dice', () => {
    abrir('fondo/no-existe');
    expect(screen.getByText('No hay un ítem con ese nombre')).toBeTruthy();
  });
});

describe('Imán 2.0', () => {
  it('un anillo de 8 tramos que se enciende con cada punto; cada punto abre su hoja', () => {
    const { container } = abrir('iman/handyx');
    expect(container.querySelectorAll('.pt-iman path')).toHaveLength(8);
    expect(container.querySelectorAll('.pt-iman path.on')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'Imán: 0 de 8 puntos' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^\d · / })).toHaveLength(8);
    fireEvent.click(fila(/^1 · Gancho/));
    escribir('Gancho de una línea', 'Tu oficio, a un toque', true);
    expect(plan().iman?.handyx?.hook).toBe('Tu oficio, a un toque');
    expect(container.querySelectorAll('.pt-iman path.on')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Imán: 1 de 8 puntos', hidden: true })).toBeTruthy();
  });

  it('la lista separada por comas no se parte al escribir; el README, ADRs y tests se tildan; la serie de posts se registra', () => {
    abrir('iman/handyx');
    fireEvent.click(fila(/^7 · Empresas/));
    escribir('Empresas objetivo', 'Mercado Libre, ', false);
    expect((screen.getByRole('textbox', { name: 'Empresas objetivo' }) as HTMLInputElement).value).toBe('Mercado Libre, ');
    escribir('Empresas objetivo', 'Mercado Libre, Despegar', true);
    expect(plan().iman?.handyx?.empresas).toEqual(['Mercado Libre', 'Despegar']);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    fireEvent.click(fila(/^6 · README/));
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: 'README' }));
    expect(plan().iman?.handyx?.readme).toBe(true);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    fireEvent.click(fila(/^8 · Serie/));
    fireEvent.click(within(dialogo()).getAllByRole('button', { name: 'Post hecho hoy' })[0]);
    expect(plan().iman?.handyx?.posts?.teaser).toBeTruthy();
  });

  it('lo que escribís se guarda aunque cierres la hoja sin salir del campo', () => {
    abrir('iman/handyx');
    fireEvent.click(fila(/^1 · Gancho/));
    escribir('Gancho de una línea', 'Sin salir del campo');
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    return new Promise<void>((r) => setTimeout(() => { expect(plan().iman?.handyx?.hook).toBe('Sin salir del campo'); r(); }, 600));
  });
});

describe('Open source 2.0', () => {
  it('una tarjeta de paquete por herramienta, con su versión y registro', () => {
    abrir('open-source');
    const tarjetas = screen.getAllByRole('button', { name: /sin publicar$|publicada$/ });
    expect(tarjetas).toHaveLength(HERRAMIENTAS.length);
    expect(screen.getByRole('button', { name: 'Alawys, sin publicar' }).textContent).toContain('npm');
    expect(screen.getByText('Presets de Alawys')).toBeTruthy();
  });

  it('la hoja de una herramienta: qué falta para publicar, el link y las descargas se guardan', () => {
    abrir('open-source');
    fireEvent.click(screen.getByRole('button', { name: 'Alawys, sin publicar' }));
    const d = dialogo();
    expect(within(d).getAllByText(/Para publicar falta/).length).toBeGreaterThanOrEqual(1);
    escribir('Link del paquete', 'https://npmjs.com/package/create-alawys', true);
    expect(plan().fondo?.alawys?.enlace).toBe('https://npmjs.com/package/create-alawys');
    escribir('Descargas (a mano)', '120', true);
    expect(plan().fondo?.alawys?.descargas).toBe(120);
  });
});
