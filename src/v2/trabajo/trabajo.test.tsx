import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lunesDeFecha } from '../../data/revision';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2 } from '../registro';
import { entradaDe } from '../Resolutor';
import { EXTRAS_V2 } from '../extras';
import BusquedaV2 from './BusquedaV2';
import CalibracionV2 from './CalibracionV2';
import ComprasV2 from './ComprasV2';
import { diasTxt, dm, dma, f2, fh, n1 } from './comun';
import DiferenciaV2 from './DiferenciaV2';
import HandyxV2 from './HandyxV2';
import ImpactoV2 from './ImpactoV2';
import InglesV2 from './InglesV2';
import ProyectoCursoV2 from './ProyectoCursoV2';
import RevisionV2 from './RevisionV2';
import SprintV2 from './SprintV2';

// Lunes: el plan está en P1 (PetrIA); la semana del plan arranca ese día.
const HOY = '2026-11-23';
const LUNES = lunesDeFecha(HOY);
const plan = () => getState().plan;
const props = (hash: string, today = HOY) => ({ ruta: leerRuta(hash), day: getState().days[HOY], today });
// Un día con una app secundaria y un showcase corriendo de fondo (el 23 nov todavía no hay).
const CON_FONDO = '2026-12-15';
const LUNES_FONDO = lunesDeFecha(CON_FONDO);
const global = <GlobalV2 activa="metas" pantalla="metas" pendientes={0} conBarra={false} conCheckins={false} />;
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const fila = (nombre: RegExp | string) => screen.getByRole('button', { name: nombre });
const escribir = (etiqueta: string | RegExp, v: string, salir = false) => {
  const c = screen.getAllByRole('textbox', { name: etiqueta }).pop()!;
  fireEvent.change(c, { target: { value: v } });
  if (salir) fireEvent.blur(c);
};
const mostrar = (ui: React.ReactElement) => render(<>{ui}{global}</>);

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Trabajo 2.0 · qué cubre', () => {
  const nombre = (h: string) => entradaDe(leerRuta(h), PANTALLAS_V2, EXTRAS_V2)?.nombre;

  it('cada ruta de la familia tiene su pantalla y nada más: lo demás de Metas sigue como estaba', () => {
    expect(nombre('#/metas/trabajo')).toBe('Búsqueda de trabajo');
    expect(nombre('#/metas/ingles')).toBe('Idiomas');
    expect(nombre('#/metas/handyx')).toBe('Handyx');
    expect(nombre('#/metas/sprint')).toBe('Búsqueda intensiva');
    expect(nombre('#/metas/impacto')).toBe('Impacto');
    expect(nombre('#/metas/calibracion')).toBe('Calibración');
    expect(nombre('#/metas/diferencia')).toBe('Diferencia');
    expect(nombre('#/metas/revision')).toBe('Revisión semanal');
    expect(nombre('#/metas/compras')).toBe('Compras y trámites');
    expect(nombre('#/metas/proyecto')).toBe('Proyecto en curso y P0');
    expect(nombre('#/metas/proyecto/P0')).toBe('Proyecto en curso y P0');
  });

  it('los bloques con id siguen en la entrada principal; el resto de Metas (semana, mapa, clipping…) no es de esta familia', () => {
    expect(nombre('#/metas/proyecto/P1')).toBe('Plan');
    const mias = ['Búsqueda de trabajo', 'Idiomas', 'Handyx', 'Búsqueda intensiva', 'Impacto', 'Calibración', 'Diferencia', 'Revisión semanal', 'Compras y trámites', 'Proyecto en curso y P0'];
    for (const h of ['#/metas/semana', '#/metas/mes', '#/metas/ruta', '#/metas/mapa', '#/metas/etapas', '#/metas/roadmap', '#/metas/evolucion', '#/metas/clipping', '#/metas/proyecto/P0/x', '#/metas/trabajo/x', '#/metas/proyecto/P1/x']) {
      expect(mias.includes(nombre(h) ?? ''), h).toBe(false);
    }
  });
});

describe('Trabajo 2.0 · cómo se escriben las cosas', () => {
  it('fechas, números y factores', () => {
    expect(dm('2026-11-23')).toBe('23 nov');
    expect(dma('2027-01-05')).toBe('5 ene 2027');
    expect(fh('2026-12-26', HOY)).toBe('26 dic');
    expect(fh('2027-03-18', HOY)).toBe('18 mar 2027');
    expect(n1(6482.54)).toBe('6.482,5');
    expect(n1(12)).toBe('12');
    expect(f2(0.85)).toBe('0,85');
    expect(f2(1)).toBe('1,00');
    expect(diasTxt(0)).toBe('en fecha');
    expect(diasTxt(3)).toBe('+3 d');
    expect(diasTxt(-2)).toBe('−2 d');
  });
});

describe('Compras 2.0', () => {
  it('una fila por fase; marcar una compra la guarda con su fecha y desmarcarla la borra', () => {
    mostrar(<ComprasV2 {...props('#/metas/compras')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hardware y trámites');
    expect(screen.getByRole('link', { name: /Análisis/ })).toHaveAttribute('href', '#/metas/analisis');
    fireEvent.click(fila(/^Fase 1/));
    const kit = within(dialogo()).getByRole('checkbox', { name: /Kit ESP32/ });
    fireEvent.click(kit);
    expect(plan().compras?.['kit-esp32']).toEqual({ fecha: HOY });
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: /Kit ESP32/ }));
    expect(plan().compras?.['kit-esp32']).toBeUndefined();
  });

  it('lo diferido y lo opcional se ven pero no cuentan como pendiente', () => {
    mostrar(<ComprasV2 {...props('#/metas/compras')} />);
    fireEvent.click(fila(/^Fase 1/));
    const d = dialogo();
    expect(within(d).getByText(/Diferido: PetrIA va solo con Wokwi/)).toBeTruthy();
    expect(within(d).getByText('Lo diferido y lo opcional no cuentan como pendiente.')).toBeTruthy();
  });
});

describe('Revisión semanal 2.0', () => {
  it('los cinco puntos se tildan, el contador suma y "Revisión hecha" guarda la nota y la fecha, con deshacer', () => {
    mostrar(<RevisionV2 {...props('#/metas/revision')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Revisión semanal');
    fireEvent.click(screen.getByRole('checkbox', { name: /^english\.md/ }));
    expect(plan().revisionesSemanales?.[LUNES]?.checks).toEqual([2]);
    const pub = screen.getByRole('group', { name: 'Publicaciones' });
    fireEvent.click(within(pub).getByRole('button', { name: /Sumar/ }));
    expect(plan().contadores[LUNES]?.posts).toBe(1);
    fireEvent.click(within(pub).getByRole('button', { name: /Restar/ }));
    expect(plan().contadores[LUNES]?.posts).toBe(0);
    escribir('Nota de la semana', 'Salió bien', true);
    fireEvent.click(screen.getByRole('button', { name: 'Revisión hecha' }));
    expect(plan().revisionesSemanales?.[LUNES]).toMatchObject({ hecha: HOY, nota: 'Salió bien' });
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(plan().revisionesSemanales?.[LUNES]?.hecha).toBeUndefined();
  });

  it('una revisión hecha se puede desmarcar desde el botón, y se vuelve a marcar desde el aviso', () => {
    act(() => { getState().plan.revisionesSemanales = { [LUNES]: { checks: [0], hecha: '2026-11-22' } }; });
    mostrar(<RevisionV2 {...props('#/metas/revision')} />);
    expect(screen.getByText('Hecha')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Deshacer “hecha”/ }));
    expect(plan().revisionesSemanales?.[LUNES]?.hecha).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(plan().revisionesSemanales?.[LUNES]?.hecha).toBe('2026-11-22');
  });

  it('el uso de Claude se guarda al salir y, pasado el umbral, sugiere pausas que se confirman a mano (y se deshacen)', () => {
    mostrar(<RevisionV2 {...props('#/metas/revision', CON_FONDO)} />);
    fireEvent.click(fila(/^Uso de Claude/));
    escribir('Uso de Claude esta semana (%)', '90', true);
    expect(plan().usoClaude?.[LUNES_FONDO]).toBe(90);
    const pausar = within(dialogo()).getAllByRole('button', { name: /^Pausar/ })[0];
    expect(Object.values(plan().fondo ?? {}).some((x) => x.pausado)).toBe(false);
    fireEvent.click(pausar);
    expect(Object.values(plan().fondo ?? {}).some((x) => x.pausado)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(Object.values(plan().fondo ?? {}).some((x) => x.pausado)).toBe(false);
  });

  it('el tiempo de revisión de fondo se anota, se ve en la semana y se borra con deshacer', () => {
    mostrar(<RevisionV2 {...props('#/metas/revision', CON_FONDO)} />);
    fireEvent.click(fila(/^Tiempo de revisión/));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Anotar revisión' }));
    expect(plan().revisionFondo).toHaveLength(1);
    expect(plan().revisionFondo![0]).toMatchObject({ fecha: CON_FONDO, tipo: 'walkthrough', min: 60 });
    fireEvent.click(within(dialogo()).getByRole('button', { name: /^Borrar/ }));
    expect(plan().revisionFondo).toHaveLength(0);
    fireEvent.click(within(screen.getByText('Revisión borrada').closest('[role="status"]') as HTMLElement).getByRole('button', { name: 'Deshacer' }));
    expect(plan().revisionFondo).toHaveLength(1);
  });
});

describe('Calibración 2.0', () => {
  it('sin PetrIA publicada, el factor todavía no está; los últimos 7 días se cargan a mano y vuelven al foco', () => {
    mostrar(<CalibracionV2 {...props('#/metas/calibracion')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calibración');
    expect(screen.getByText(/^Se calcula al publicar PetrIA 1\.0/)).toBeTruthy();
    fireEvent.click(fila(/^23 nov/));
    const prog = within(dialogo()).getByRole('textbox', { name: 'Horas de programación del 23 nov' });
    fireEvent.change(prog, { target: { value: '3,5' } });
    fireEvent.blur(prog);
    expect(plan().horasManuales?.[HOY]?.programacion).toBe(3.5);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Volver al foco' }));
    expect(plan().horasManuales?.[HOY]).toBeUndefined();
  });

  it('los tres escenarios van con su factor de dos decimales', () => {
    mostrar(<CalibracionV2 {...props('#/metas/calibracion')} />);
    for (const n of [/^Rápido · 0,85/, /^En plan · 1,00/, /^Lento · 1,15/]) expect(fila(n)).toBeTruthy();
  });
});

describe('Diferencia 2.0', () => {
  it('arriba cuándo termina el plan; cada etapa abre sus bloques, que llevan a su página', () => {
    mostrar(<DiferenciaV2 {...props('#/metas/diferencia')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Diferencia');
    expect(screen.getByText('El plan termina')).toBeTruthy();
    fireEvent.click(fila(/^Etapa 1/));
    expect(within(dialogo()).getByRole('link', { name: /^P1 · PetrIA/ })).toHaveAttribute('href', '#/metas/proyecto/P1');
  });
});

describe('Búsqueda 2.0', () => {
  it('una postulación nueva se guarda con su rol y suma al contador; el estado se cambia desde su hoja', () => {
    mostrar(<BusquedaV2 {...props('#/metas/trabajo')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Búsqueda|Trabajo/);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva postulación' }));
    const guardar = within(dialogo()).getByRole('button', { name: 'Guardar' });
    expect(guardar.getAttribute('aria-disabled') === 'true' || (guardar as HTMLButtonElement).disabled).toBe(true);
    escribir('Rol', 'Backend Python');
    escribir('Empresa', 'Acme');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar' }));
    expect(plan().postulaciones).toHaveLength(1);
    expect(plan().postulaciones[0]).toMatchObject({ rol: 'Backend Python', empresa: 'Acme', estado: 'enviada', fecha: HOY });
    expect(plan().contadores[LUNES]?.postulaciones).toBe(1);
    fireEvent.click(fila(/^Backend Python · Acme/));
    fireEvent.click(within(dialogo()).getByRole('button', { name: /Estado/ }));
    fireEvent.click(screen.getAllByRole('radio', { name: 'Entrevista' }).pop()!);
    expect(plan().postulaciones[0].estado).toBe('entrevista');
  });

  it('una entrevista nueva aparece como la próxima, con su preparación en una hoja', () => {
    mostrar(<BusquedaV2 {...props('#/metas/trabajo')} />);
    expect(screen.getByText('Sin entrevistas cargadas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar entrevista' }));
    escribir('Rol', 'AI Engineer');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar' }));
    expect(plan().entrevistas).toHaveLength(1);
    expect(plan().entrevistas[0]).toMatchObject({ rol: 'AI Engineer', fecha: '2026-11-26', modalidad: 'remoto · entrevista técnica en inglés' });
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('AI Engineer');
    fireEvent.click(fila(/^Preparación/));
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: /Investigar la empresa/ }));
    expect(plan().entrevistas[0].prep.empresa).toBe(true);
  });

  it('lo que falló en una entrevista que pasó queda en ella y es tarjeta', () => {
    act(() => { getState().plan.entrevistas = [{ id: 'e0', fecha: '2026-11-19', rol: 'Backend', empresa: 'Initech', prep: {} }]; });
    mostrar(<BusquedaV2 {...props('#/metas/trabajo')} />);
    fireEvent.click(fila(/^Backend · Initech/));
    escribir('Qué preguntaron o qué falló', 'Explicar RAG');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar' }));
    expect(plan().entrevistas[0].fallas).toEqual(['Explicar RAG']);
  });

  it('la revisión de mercado: ofertas, porcentajes con su veredicto y "Confirmar el orden" (se deshace)', () => {
    mostrar(<BusquedaV2 {...props('#/metas/trabajo')} />);
    fireEvent.click(fila(/^Revisión de mercado/));
    const confirmar = () => within(dialogo()).getByRole('button', { name: 'Confirmar el orden' });
    expect(confirmar().getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Sumar 1' }));
    expect(plan().mercado?.ofertas).toBe(1);
    escribir('% de ofertas que piden VitalIA', '45', true);
    expect(plan().mercado?.pct?.P2).toBe(45);
    expect(within(dialogo()).getByText('Sube')).toBeTruthy();
    fireEvent.click(confirmar());
    expect(plan().mercado?.decidido).toBe(HOY);
    expect(plan().hitos['trabajo-6']?.hecho).toBe(HOY);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(plan().mercado?.decidido).toBeUndefined();
    expect(plan().hitos['trabajo-6']?.hecho).toBeUndefined();
  });
});

describe('Idiomas 2.0', () => {
  it('"Ensayar en voz alta" suma un ensayo a la menos ensayada; tildar una del kit suma otro', () => {
    mostrar(<InglesV2 {...props('#/metas/ingles')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Idiomas');
    fireEvent.click(screen.getByRole('button', { name: 'Ensayar en voz alta' }));
    expect(plan().respuestas.filter((r) => r.veces > 0)).toHaveLength(1);
    expect(plan().contadores[LUNES]?.respuestas).toBe(1);
    fireEvent.click(fila(/^Kit de entrevista/));
    fireEvent.click(within(dialogo()).getAllByRole('checkbox')[3]);
    expect(plan().respuestas[3].veces).toBe(1);
  });

  it('lo que falló al hablar entra al plan y al repaso', () => {
    mostrar(<InglesV2 {...props('#/metas/ingles')} />);
    fireEvent.click(fila(/^Fallas al hablar/));
    escribir('Qué falló al hablar', 'Confundo since y for');
    fireEvent.click(within(dialogo()).getByRole('radio', { name: 'Gramática' }));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar' }));
    expect(plan().fallasIngles).toEqual([{ fecha: HOY, texto: 'Confundo since y for', tipo: 'gramática' }]);
    expect(getState().study.cards.some((c) => c.front.includes('Confundo since y for'))).toBe(true);
  });
});

describe('Handyx 2.0', () => {
  beforeEach(() => { act(() => { getState().plan.pausas = []; }); });

  it('"Sumar 1 hora" y las operaciones suman en la semana; los usuarios se cargan desde su hoja', () => {
    mostrar(<HandyxV2 {...props('#/metas/handyx')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Handyx');
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 1 hora' }));
    expect(plan().handyx[LUNES]?.horas).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Sumar una operación' }));
    expect(plan().handyx[LUNES]?.operaciones).toBe(1);
    fireEvent.click(fila(/^Usuarios activos/));
    escribir('Usuarios activos hoy', '12');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar' }));
    expect(plan().handyx[LUNES]?.clientes).toBe(12);
  });

  it('los cuatro cortes se leen con su fecha y el estado de ahora', () => {
    const { container } = mostrar(<HandyxV2 {...props('#/metas/handyx')} />);
    expect(container.querySelectorAll('.tr-cortes > li')).toHaveLength(4);
    expect(container.querySelectorAll('.tr-cortes > li.on')).toHaveLength(1);
  });

  it('en pausa es de lectura y se retoma con confirmación', async () => {
    act(() => { getState().plan.pausas = [{ id: 'z1', objetivo: 'handyx', desde: '2026-11-20', motivo: 'búsqueda intensiva' } as never]; });
    mostrar(<HandyxV2 {...props('#/metas/handyx')} />);
    expect(screen.queryByRole('button', { name: 'Sumar 1 hora' })).toBeNull();
    expect(screen.getByText(/En pausa desde el 20 nov/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retomar Handyx' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar' }));
    await screen.findByText('Handyx retomado');
  });
});

describe('Búsqueda intensiva 2.0', () => {
  it('los 14 días, el embudo con sus metas editables y las casillas de CV, LinkedIn y caso', () => {
    mostrar(<SprintV2 {...props('#/metas/sprint')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Búsqueda intensiva');
    expect(screen.getByRole('img', { name: 'Día 1 de 14' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar metas' }));
    const meta = within(dialogo()).getByRole('textbox', { name: 'Meta de A medida' });
    fireEvent.change(meta, { target: { value: '50' } });
    fireEvent.blur(meta);
    expect(plan().sprint?.metas?.aMedida).toBe(50);
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Listo' }));
    fireEvent.click(fila(/^CV en inglés, LinkedIn y caso/));
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: 'LinkedIn' }));
    expect(plan().sprint?.checks?.linkedin).toBe(true);
  });
});

describe('Impacto 2.0', () => {
  it('la línea de las ramas, las horas antes y ahora y lo que se corre Handyx', () => {
    const { container } = mostrar(<ImpactoV2 {...props('#/metas/impacto')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Impacto');
    expect(screen.getByRole('img', { name: /Las ramas en las 13 semanas/ })).toBeTruthy();
    expect(container.querySelector('svg[data-grafico]')).toBeTruthy();
    const tabla = screen.getByRole('table', { name: 'Horas por semana antes y ahora' });
    expect(within(tabla).getAllByRole('row').length).toBeGreaterThanOrEqual(9);
    expect(screen.getByText('Lanza desde')).toBeTruthy();
  });
});

describe('P0 y el proyecto en curso 2.0', () => {
  it('P0 es Constelación v1: arriba qué es y cómo va, y tres pestañas', () => {
    const { container } = mostrar(<ProyectoCursoV2 {...props('#/metas/proyecto/P0')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Constelación v1');
    expect(container.querySelector('.pt-portada svg')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Plan/ })).toHaveAttribute('href', '#/metas');
    expect(within(screen.getByRole('radiogroup', { name: 'Qué ver' })).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Resumen', 'Ficha', 'Stack']);
    fireEvent.click(screen.getByRole('radio', { name: 'Stack' }));
    expect(screen.getByText('Perfil al cerrar')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Ficha' }));
    expect(screen.getByText('Puesto')).toBeTruthy();
  });

  it('las metas de P0 se arman, se tildan y se borran igual que antes: mismos datos, misma forma', async () => {
    mostrar(<ProyectoCursoV2 {...props('#/metas/proyecto/P0')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar la primera meta' }));
    escribir('Qué querés lograr', 'Subir el mapa 3D');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Agregar y cerrar' }));
    const metas = plan().metasBloque?.P0 ?? [];
    expect(metas).toHaveLength(1);
    expect(metas[0]).toMatchObject({ texto: 'Subir el mapa 3D' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Subir el mapa 3D' }));
    expect(plan().metasBloque?.P0[0].hecho).toBe(HOY);
  });

  it('para cerrar: evidencia, portfolio agéntico, revisiones, examen y horas, sin lo que la 1.0 tampoco le mostraba a P0', () => {
    mostrar(<ProyectoCursoV2 {...props('#/metas/proyecto/P0')} />);
    for (const n of [/^Puerta de evidencia/, /^Portfolio agéntico/, /^Revisiones/, /^Examen/, /^Horas y fechas/]) expect(fila(n)).toBeTruthy();
    for (const n of [/Estándar de alto valor/, /Entrevista técnica/, /Tiempo real/]) expect(screen.queryByRole('button', { name: n })).toBeNull();
    expect(screen.queryByText('Versiones')).toBeNull();
    fireEvent.click(fila(/^Puerta de evidencia/));
    fireEvent.click(within(dialogo()).getAllByRole('checkbox')[0]);
    expect(plan().proyectos.P0?.evidencia?.medido).toBe(true);
    fireEvent.keyDown(dialogo(), { key: 'Escape' });
    fireEvent.click(fila(/^Examen/));
    escribir('Puntaje (0 a 100)', '90');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar' }));
    expect(plan().proyectos.P0?.examen?.puntaje).toBe(90);
  });

  it('sin id es el bloque en curso: hoy, PetrIA', () => {
    mostrar(<ProyectoCursoV2 {...props('#/metas/proyecto')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PetrIA');
  });
});
