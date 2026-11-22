import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState } from '../state/store';
import { agregarMetaBloque, agregarSubBloque, borrarSubBloque, empezarLibro, importarJsonBloque, tildarMetaBloque, tildarSubBloque } from '../state/metas-bloque';
import { MetasBloque } from '../ui/MetasBloque';
import { PlanImportar } from '../screens/PlanImportar';
import { libroPorId } from './libros';
import { EJEMPLO_BLOQUE, avanceBloque, esJsonDeBloque, exportarBloque, nombreBloque, queCambiaBloque, validarJsonBloque, type ImportMetas } from './metas-bloque';
import { activitiesFor } from './study';

const D = '2026-11-16';
const metas = (b: string) => getState().plan.metasBloque?.[b] ?? [];
const ok = (t: string) => {
  const v = validarJsonBloque(t);
  if (!v.ok) throw new Error(`línea ${v.error.linea}: ${v.error.mensaje}`);
  return v.d;
};

beforeEach(() => {
  resetState();
  register('Toti', 'Abi', D);
});

describe('metas por bloque · JSON', () => {
  it('el ejemplo es válido y se detecta como JSON de bloque', () => {
    expect(esJsonDeBloque(EJEMPLO_BLOQUE)).toBe(true);
    expect(esJsonDeBloque('{"tipo": "sesion"}')).toBe(false);
    const d = ok(EJEMPLO_BLOQUE) as ImportMetas;
    expect(d.bloque).toBe('P0');
    expect(d.metas.map((m) => [m.id, m.subs.length])).toEqual([['p0-hub', 2], ['trazo-publicado-con-readme-en-ingles', 0]]);
    // Las metas de P0 siguen como las cargaste; el bloque se llama Constelación v1 en v12.1.
    expect(nombreBloque('P0')).toBe('P0 · Constelación v1');
    expect(nombreBloque('libro:mwm:3')).toBe('Measure What Matters · unidad 3');
    expect(nombreBloque('Z9')).toBeNull();
  });

  it('los errores dicen la línea: sintaxis, bloque desconocido, meta sin texto e id repetido', () => {
    const malo = (t: string) => { const v = validarJsonBloque(t); if (v.ok) throw new Error('debía fallar'); return v.error; };
    expect(malo('{\n  "tipo": "metas-bloque",\n  "bloque": "P0"\n  "metas": []\n}').linea).toBe(4);
    expect(malo('{\n  "tipo": "metas-bloque",\n  "bloque": "Z9",\n  "metas": ["a"]\n}')).toMatchObject({ linea: 3, mensaje: expect.stringMatching(/"bloque"/) });
    expect(malo('{\n  "tipo": "metas-bloque",\n  "bloque": "W1",\n  "metas": [\n    { "texto": "a" },\n    { "nota": "sin texto" }\n  ]\n}').mensaje).toBe('La meta 2 necesita "texto".');
    expect(malo('{ "tipo": "metas-bloque", "bloque": "W1", "metas": [{ "id": "x", "texto": "a" }, { "id": "x", "texto": "b" }] }').mensaje).toMatch(/repite el id "x"/);
    expect(malo('{ "tipo": "otra" }').mensaje).toMatch(/"tipo" tiene que ser/);
  });

  it('qué cambia y la fusión conservan lo tildado (por id de meta y texto de submeta)', () => {
    importarJsonBloque(ok(EJEMPLO_BLOQUE));
    tildarSubBloque('P0', 'p0-hub', metas('P0')[0].subs![0].id, D);
    tildarMetaBloque('P0', 'trazo-publicado-con-readme-en-ingles', D);
    const nuevo = ok(JSON.stringify({ tipo: 'metas-bloque', bloque: 'P0', metas: [
      { id: 'p0-hub', texto: 'Portfolio hub con mapa 3D', submetas: ['proyectos.json validado', 'Landing'] },
      { texto: 'RAG con evals' },
    ] })) as ImportMetas;
    expect(queCambiaBloque(nuevo, metas('P0'))).toEqual({ agrega: ['RAG con evals'], cambia: ['Portfolio hub con mapa 3D'], saca: ['Trazo publicado con README en inglés'], conserva: 1 });
    importarJsonBloque(nuevo);
    expect(metas('P0').map((m) => m.texto)).toEqual(['Portfolio hub con mapa 3D', 'RAG con evals']);
    expect(metas('P0')[0].subs!.map((s) => [s.t, !!s.hecho])).toEqual([['proyectos.json validado', true], ['Landing', false]]);
  });

  it('exportar e importar da lo mismo', () => {
    agregarMetaBloque('W1', 'Resolver ecuaciones sin ayuda');
    agregarSubBloque('W1', metas('W1')[0].id, 'Lineales');
    agregarMetaBloque('W1', 'Graficar funciones');
    const antes = metas('W1');
    const d = ok(exportarBloque('W1', antes)) as ImportMetas;
    expect(queCambiaBloque(d, antes)).toEqual({ agrega: [], cambia: [], saca: [], conserva: 0 });
    importarJsonBloque(d);
    expect(metas('W1').map((m) => [m.id, m.texto, m.subs?.map((s) => s.t)])).toEqual(antes.map((m) => [m.id, m.texto, m.subs?.map((s) => s.t)]));
  });

  it('una meta con submetas se cumple con todas; sacar la última submeta la vuelve simple', () => {
    agregarMetaBloque('libro:mwm', 'Leer la parte 1');
    const id = metas('libro:mwm')[0].id;
    agregarSubBloque('libro:mwm', id, 'Caps. 1 a 7');
    agregarSubBloque('libro:mwm', id, 'Caps. 8 a 14');
    const [a, b] = metas('libro:mwm')[0].subs!;
    tildarSubBloque('libro:mwm', id, a.id, D);
    expect(avanceBloque(metas('libro:mwm'))).toEqual({ hechas: 0, total: 1 });
    tildarSubBloque('libro:mwm', id, b.id, D);
    expect(avanceBloque(metas('libro:mwm'))).toEqual({ hechas: 1, total: 1 });
    borrarSubBloque('libro:mwm', id, a.id);
    borrarSubBloque('libro:mwm', id, b.id);
    expect(metas('libro:mwm')[0].subs).toBeUndefined();
  });

  it('un libro en JSON queda cargado con su actividad archivada hasta que lo empezás', () => {
    const t = '{\n  "tipo": "libro",\n  "id": "make-it-stick",\n  "titulo": "Make It Stick",\n  "capitulos": ["Learning Is Misunderstood", { "titulo": "To Learn, Retrieve" }, "Mix Up Your Practice"]\n}';
    const d = ok(t);
    expect(d.tipo).toBe('libro');
    importarJsonBloque(d);
    expect(libroPorId('make-it-stick')).toMatchObject({ titulo: 'Make It Stick', propio: true });
    const a = getState().study.activities.find((x) => x.id === 'libro-make-it-stick')!;
    expect(a).toMatchObject({ archivada: true, libro: 'make-it-stick' });
    expect(a.units!.map((u) => u.corto)).toEqual(['caps. 1 y 2', 'cap. 3']);
    expect(activitiesFor(getState().study, D).some((x) => x.id === a.id)).toBe(false);
    empezarLibro('make-it-stick');
    expect(activitiesFor(getState().study, D).some((x) => x.id === a.id)).toBe(true);
    // No se puede pisar un libro que viene en Trazo.
    const v = validarJsonBloque('{ "tipo": "libro", "id": "mwm", "titulo": "X", "capitulos": ["a"] }');
    expect(v.ok ? '' : v.error.mensaje).toMatch(/ya viene cargado/);
  });
});

describe('metas por bloque · pantallas', () => {
  it('agregar una meta, una submeta, tildarla y editar', () => {
    render(<MetasBloque bloque="P1" date={D} titulo="Metas de P1" />);
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar meta' }));
    const hoja = screen.getByRole('dialog');
    fireEvent.change(within(hoja).getByLabelText('Nombre de la meta'), { target: { value: 'API Spring Boot' } });
    act(() => { fireEvent.click(within(hoja).getByRole('button', { name: 'Agregar y cerrar' })); });
    expect(metas('P1').map((m) => m.texto)).toEqual(['API Spring Boot']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'API Spring Boot' }));
    expect(metas('P1')[0].hecho).toBe(D);
    expect(screen.getByText('1 de 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar submeta a API Spring Boot' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Nombre de la submeta'), { target: { value: 'Tests de integración' } });
    act(() => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar y cerrar' })); });
    expect(metas('P1')[0].subs!.map((s) => s.t)).toEqual(['Tests de integración']);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar API Spring Boot' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Texto de la meta'), { target: { value: 'API en Spring Boot' } });
    act(() => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' })); });
    expect(metas('P1')[0].texto).toBe('API en Spring Boot');
  });

  it('Importar reconoce el JSON de bloque, muestra qué cambia e importa', () => {
    const day = { date: D, wake: '04:00', routine: 'completo' as const, blocks: [], notes: [], focus: [] };
    render(<PlanImportar day={day} />);
    fireEvent.change(screen.getByLabelText('JSON pegado'), { target: { value: EJEMPLO_BLOQUE } });
    expect(screen.getByRole('status')).toHaveTextContent('✓ formato válido · P0 · Constelación');
    expect(screen.getByText('Agrega 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Importar las metas' }));
    expect(metas('P0')).toHaveLength(2);
  });
});
