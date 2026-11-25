import { describe, expect, it } from 'vitest';
import { HERRAMIENTAS, conArranque, fechasVersion, herramienta, herramientaNuevaDe, herramientasDe, presetsAlawys, puedePublicarHerramienta } from './herramientas';
import { arbolPlan } from './periodos-plan';
import { recorrer } from './periodos';
import { calendarioCompleto } from './plan-vistas';

const v = (id: string, ver: string) => herramienta(id)!.versiones.find((x) => x.id === ver)!;
const todo = (h: string, ver: string) => Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`v12:tool:${h}:${ver}:${i}`, { hecho: '2027-01-01' }]));

describe('§14 · herramientas open source', () => {
  it('22 herramientas: 12 propias, 9 extraídas y el escrow interno; como máximo UNA nueva por ítem', () => {
    expect(HERRAMIENTAS).toHaveLength(22);
    expect(HERRAMIENTAS.filter((h) => h.kind === 'standalone')).toHaveLength(12);
    expect(HERRAMIENTAS.filter((h) => h.kind === 'extracted').map((h) => h.id)).toEqual(['notify', 'llm-router', 'evals-action', 'usage-meter', 'showcase-kit', 'seat-picker', 'voice-agent', 'captions', 'tour3d']);
    const nuevas: Record<string, number> = {};
    for (const h of HERRAMIENTAS) { const o = h.versiones.find((x) => x.origen)!.origen!; nuevas[o] = (nuevas[o] ?? 0) + 1; }
    expect(Math.max(...Object.values(nuevas))).toBe(1);
    // Antena saca sgp4-wasm y además suma satélites a mcp-ar (no cuenta como nueva).
    expect(herramientaNuevaDe('P4')!.id).toBe('sgp4-wasm');
    expect(herramientasDe('P4').map(({ h, v: x }) => `${h.id} ${x.id}`)).toEqual(['mcp-ar +satélites', 'sgp4-wasm 1.0']);
    expect(herramientaNuevaDe('P0B')!.id).toBe('ask-widget');
    expect(herramientasDe('P0B').map(({ h }) => h.id)).toEqual(['alawys', 'ask-widget']);
  });

  it('las fechas salen del origen: Alawys v0.1 el 5–11 dic y v1.0 el 6–8 ene (cierre de VitalIA); v2.0 todo Constelación; mcp-ar v2 en el cierre de Ticker; captions en Clip Studio v2.0', () => {
    expect(fechasVersion(v('alawys', '1.0'))).toEqual({ inicio: '2027-01-06', fin: '2027-01-08' }); // v12.4: la 3.0 de VitalIA, 6–8 ene 2027
    expect(fechasVersion(v('alawys', '2.0'))).toEqual({ inicio: '2027-05-16', fin: '2027-05-21' }); // Constelación 2.0 + 2.1, 16–21 may 2027
    expect(fechasVersion(v('mcp-ar', 'v2'))).toEqual({ inicio: '2028-05-12', fin: '2028-05-14' }); // la 3.0 de Ticker
    expect(fechasVersion(v('captions', '1.0'))).toEqual({ inicio: '2027-01-14', fin: '2027-01-20' }); // Clip Studio v2.0
    // Pendiente en el motor: fechasVersion ignora `hasta` (Alawys v0.1 se arma del 5 al 11 dic con la PC nueva) y, para un slot comercial, devuelve
    // todo el slot (28 ene–21 feb) en vez de la fase de build: el doc (§3) fecha seat-picker el 3 feb 2027, el fin del build del slot #3 (28 ene–3 feb).
    expect(fechasVersion(v('alawys', '0.1'))).toEqual({ inicio: '2026-12-05', fin: '2026-12-11' });
    expect(fechasVersion(v('seat-picker', '1.0'))).toEqual({ inicio: '2027-01-28', fin: '2027-02-03' });
  });

  it('gates: la extraída no se publica sin "la necesita"; las dos de lanzamiento piden el Imán; la interna nunca', () => {
    const notify = herramienta('notify')!;
    expect(puedePublicarHerramienta(notify, notify.versiones[0], { hitos: todo('notify', '1.0') }).faltan).toEqual(['La necesita: el segundo ítem que la usa']);
    expect(puedePublicarHerramienta(notify, notify.versiones[0], { hitos: todo('notify', '1.0'), fondo: { notify: { necesitadoPor: 'P10' } } }).ok).toBe(true);
    const sgp4 = herramienta('sgp4-wasm')!;
    expect(puedePublicarHerramienta(sgp4, sgp4.versiones[0], { hitos: {} }).faltan).toEqual(['Tests', 'README', 'Ejemplo', 'Semver', 'Publicada con provenance']);
    expect(puedePublicarHerramienta(sgp4, sgp4.versiones[0], { hitos: todo('sgp4-wasm', '1.0') }).ok).toBe(true); // propia: sin "la necesita"
    const alawys = herramienta('alawys')!;
    expect(puedePublicarHerramienta(alawys, v('alawys', '1.0'), { hitos: todo('alawys', '1.0') }).faltan).toEqual(['El Imán (es un lanzamiento)']);
    expect(puedePublicarHerramienta(alawys, v('alawys', '0.1'), { hitos: todo('alawys', '0.1') }).ok).toBe(true);
    expect(puedePublicarHerramienta(herramienta('mcp-ar')!, v('mcp-ar', 'v2'), { hitos: todo('mcp-ar', 'v2') }).ok).toBe(false);
    expect(puedePublicarHerramienta(herramienta('mp-escrow')!, herramienta('mp-escrow')!.versiones[0], { hitos: todo('mp-escrow', '1.0') })).toEqual({ ok: false, faltan: ['Es interna: no se publica'] });
  });

  it('0.1 · Arranque con el preset de Alawys en la primera versión de cada proyecto desde VitalIA (no en PetrIA)', () => {
    expect(conArranque()[0].id).toBe('P2');
    expect(conArranque().some((b) => b.id === 'P1')).toBe(false);
    const arbol = arbolPlan(calendarioCompleto(), { plan: { hitos: { 'v12:P3:preset-alawys': { hecho: '2027-02-19' } }, versiones: {} } });
    const v10 = (id: string) => [...recorrer(arbol)].find((p) => p.id === `${id}:v1.0`)!;
    expect(v10('P2').checklist!.slice(0, 2).map((c) => c.texto)).toEqual(['Alawys v0.1 + scaffold VitalIA with it', 'Preset agregado a Alawys']);
    expect(v10('P3').checklist!.slice(0, 2).map((c) => [c.texto, c.hecho])).toEqual([['0.1 · Arranque', false], ['Preset agregado a Alawys', true]]);
    expect(v10('P1').checklist![0].texto).not.toBe('0.1 · Arranque');
    expect(presetsAlawys({ hitos: { 'v12:P3:preset-alawys': { hecho: '2027-02-19' } } })).toEqual({ total: conArranque().length, hechos: 1 });
  });
});
