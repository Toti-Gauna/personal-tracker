/**
 * Plan v12.4 · lo que fija docs/prompts/plan-v12.4.md. El §4 (el calendario completo de primer plano) se lee del doc y se compara
 * con los datos; la capacidad por día (las pistas de fondo salen de las horas de foco) tiene que reproducir el fin de cada bloque a
 * partir de sus horas; y las reglas de §1 a §3 (absorbedores, días libres, el PNPT partido, los slots con build y venta, el Imán y
 * "la necesita") tienen su test.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capacidadSemana, horasDelDia } from './capacidad';
import { faseComercial, fondoEn, fondoParaRutina, esDiaLibre, horasDeFondo, pistasActivas } from './pistas-dia';
import { puedePublicar, imanCompleto } from './iman';
import { HERRAMIENTAS, fechasVersion, puedePublicarHerramienta } from './herramientas';
import { sugerirCorrimiento } from './periodos';
import { secuenciaPlan } from './periodos-plan';
import { PLAN_EXT } from './plan-extendido';
import { calendarioCompleto } from './plan-vistas';
import { ajustarDia, planRoutine, type PlannedRoutineBlock } from './routines';
import { addDays } from './time';
import { DIAS_LIBRES, PAUSAS_FONDO, V122 } from './v12-2';

const DOC = readFileSync(join(__dirname, '../../docs/prompts/plan-v12.4.md'), 'utf8');
const SECCION4 = DOC.slice(DOC.indexOf('## 4. COMPLETE FOREGROUND SCHEDULE'), DOC.indexOf('## 5. SECONDARY APPS'));
const MES: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** "21 Nov–12 Dec 2026", "13–18 Dec 2026", "13 Dec–13 Jan 2028": el año es el del fin; el del inicio, el mismo o el anterior. */
function rango(t: string): { inicio: string; fin: string } | null {
  const m = /(\d{1,2})(?: ([A-Z][a-z]{2}))?\s*[–-]\s*(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})/.exec(t);
  if (!m) return null;
  const mf = MES[m[4]];
  const mi = m[2] ? MES[m[2]] : mf;
  const yf = Number(m[5]);
  return { inicio: iso(mi > mf ? yf - 1 : yf, mi, Number(m[1])), fin: iso(yf, mf, Number(m[3])) };
}

interface Entrada { tipo: string; nombre: string; inicio: string; fin: string; horas: number | null }
const ENTRADAS: Entrada[] = SECCION4.split('\n').flatMap((l) => {
  const m = /^- (PROJECT|CERT|MATH|ENGLISH|JOB SEARCH|CONSOLIDATION|STAGE CLOSE|CLOSE & RENEWALS)\b(.*)$/.exec(l);
  if (!m) return [];
  const partes = m[2].split(' · ');
  const iR = partes.findIndex((p) => rango(p));
  if (iR < 0) return [];
  const h = partes.slice(iR + 1).map((p) => /^([\d.]+) h\b/.exec(p.trim())).find(Boolean);
  return [{ tipo: m[1], nombre: partes.slice(0, iR).join(' · ').trim(), ...rango(partes[iR])!, horas: h ? Number(h[1]) : null }];
});

/** Los bloques de primer plano de los datos, en orden (sin Constelación v1 ni PetrIA v0 archivada). */
const FOREGROUND = PLAN_EXT.bloques.filter((b) => b.id !== 'P0' && b.id !== 'P1V0');
const CFG = { t0: PLAN_EXT.t0, inicioTrabajo: '2126-10-23' };

describe('v12.4 · el calendario de primer plano sale del §4 del doc', () => {
  it('el doc lista 69 bloques y los datos tienen los mismos, en el mismo orden y con las mismas fechas', () => {
    expect(ENTRADAS).toHaveLength(69);
    expect(FOREGROUND).toHaveLength(69);
    ENTRADAS.forEach((e, i) => {
      const b = FOREGROUND[i];
      expect({ id: b.id, ...b.fechas }, `${e.nombre} (${i + 1})`).toEqual({ id: b.id, inicio: e.inicio, fin: e.fin });
      if (e.horas != null) expect(b.horas, `${b.id} horas`).toBe(e.horas);
    });
    // Sin buffer: el plan termina el 14 dic 2028 y es una estimación.
    expect(FOREGROUND.at(-1)!.fechas!.fin).toBe('2028-12-14');
    expect(ENTRADAS[0]).toMatchObject({ nombre: 'PetrIA', inicio: '2026-11-21', fin: '2026-12-12', horas: 193.5 });
  });

  it('sin huecos ni solapes: cada bloque empieza al día siguiente del anterior, y no quedan descansos como bloques', () => {
    for (let i = 1; i < FOREGROUND.length; i++) expect(FOREGROUND[i].fechas!.inicio, FOREGROUND[i].id).toBe(addDays(FOREGROUND[i - 1].fechas!.fin, 1));
    expect(PLAN_EXT.bloques.some((b) => b.tipo === 'descanso')).toBe(false);
    expect(PLAN_EXT.capacidad?.fijas?.map((f) => [f.inicio, f.fin])).toEqual([['2027-12-20', '2027-12-26'], ['2027-12-31', '2028-01-06'], ['2028-06-09', '2028-06-15']]);
  });

  it('los 4 cierres de etapa: Consolidación y cierres de 3 días, y las etapas terminan el 3 nov 2027, 21 ene, 31 may y 14 dic 2028', () => {
    expect(PLAN_EXT.etapas.map((e) => e.fin)).toEqual(['2027-11-03', '2028-01-21', '2028-05-31', '2028-12-14']);
    const abs = FOREGROUND.filter((b) => b.tipo === 'colchon' || b.tipo === 'cierre');
    expect(abs.map((b) => [b.id, b.fechas!.inicio, b.fechas!.fin])).toEqual([['COL', '2027-11-01', '2027-11-03'], ['CIE2', '2028-01-19', '2028-01-21'], ['CIE3', '2028-05-29', '2028-05-31'], ['CIE4', '2028-12-12', '2028-12-14']]);
  });
});

describe('v12.4 · capacidad por día: lo de fondo sale de las 10 y 11 h de foco', () => {
  const h = (f: string, extra: Partial<typeof CFG> & { pausadas?: ('secundaria' | 'comercial')[]; sinFondo?: boolean } = {}) => horasDelDia(f, { ...CFG, ...extra });

  it('8 y 9 h con las dos pistas, 9 y 10 con una, 10 y 11 con ninguna', () => {
    // Lunes 14 dic 2026 (JulIA v3.0 y slot #1) y sábado 19 dic.
    expect(pistasActivas('2026-12-14')).toEqual(['secundaria', 'comercial']);
    expect(h('2026-12-14')).toBe(8);
    expect(h('2026-12-19')).toBe(9);
    // Solo la secundaria (martes 1 dic; sábado 28 nov: 10 h).
    expect(h('2026-12-01')).toBe(9);
    expect(h('2026-11-28')).toBe(10);
    // Ninguna (martes 10 ago 2027: ya terminaron las 10 apps y todavía no empieza el slot #11).
    expect(pistasActivas('2027-08-10')).toEqual([]);
    expect(h('2027-08-10')).toBe(10);
    expect(h('2027-08-14')).toBe(11);
    // El foco bruto (10 y 11) sigue disponible.
    expect(h('2026-12-14', { sinFondo: true })).toBe(10);
  });

  it('pausar una pista a mano le devuelve su hora a la principal (primero lo comercial)', () => {
    expect(h('2026-12-14', { pausadas: ['comercial'] })).toBe(9);
    expect(h('2026-12-14', { pausadas: ['comercial', 'secundaria'] })).toBe(10);
    expect(h('2026-12-19', { pausadas: ['secundaria'] })).toBe(10);
    expect(horasDeFondo('2026-12-14', ['comercial'])).toBe(1);
  });

  it('Alawys v0.1: 5–11 dic 2026, 1 h por día de PetrIA va a construirlo', () => {
    expect(horasDeFondo('2026-12-05')).toBe(2); // JulIA + Alawys
    expect(h('2026-12-04')).toBe(9);
    expect(h('2026-12-05')).toBe(9); // sábado: 11 − 1 (JulIA) − 1 (Alawys)
    expect(h('2026-12-07')).toBe(8);
    expect(h('2026-12-11')).toBe(8);
    expect(h('2026-12-12')).toBe(10); // último día de PetrIA, ya sin Alawys (sábado)
  });

  it('los días libres fijos valen 0 y el PNPT (sin fondo) tiene las 10 y 11 h enteras', () => {
    for (const d of DIAS_LIBRES) for (let f = d.inicio; f <= d.fin; f = addDays(f, 1)) { expect(esDiaLibre(f), f).toBe(true); expect(h(f), f).toBe(0); }
    expect(h('2027-12-19')).toBe(11); // PNPT: nada de fondo, domingo
    expect(h('2027-12-29')).toBe(10);
    expect(h('2028-01-08')).toBe(11); // el examen práctico
    expect(h('2028-01-07')).toBe(10);
    expect(esDiaLibre('2028-06-16')).toBe(false);
  });

  it('una semana: 72 h de foco, lo que se llevan las pistas y lo que queda para la principal', () => {
    expect(capacidadSemana('2026-11-23')).toMatchObject({ foco: 72, principal: 68, secundaria: 4, comercial: 0, extras: 0 });
    expect(capacidadSemana('2026-11-30')).toMatchObject({ foco: 72, principal: 63, secundaria: 7, comercial: 0, extras: 2 });
    expect(capacidadSemana('2026-12-14')).toMatchObject({ foco: 72, principal: 58, secundaria: 7, comercial: 7 });
    expect(capacidadSemana('2027-08-09')).toMatchObject({ foco: 72, principal: 72, secundaria: 0, comercial: 0 });
    // Semana del 20 al 26 dic 2027 (pausa fija): nada. La del 27 dic: solo lunes a jueves.
    expect(capacidadSemana('2027-12-20')).toMatchObject({ foco: 0, principal: 0 });
    expect(capacidadSemana('2027-12-27')).toMatchObject({ foco: 40, principal: 40, secundaria: 0, comercial: 0 });
    expect(capacidadSemana('2026-12-14', ['comercial'])).toMatchObject({ principal: 65, comercial: 0 });
  });

  it('con las horas de cada bloque y esa capacidad, el calendario del doc se reproduce: cada bloque termina el día que se juntan sus horas', () => {
    const fallan: string[] = [];
    let n = 0;
    ENTRADAS.forEach((e, i) => {
      const b = FOREGROUND[i];
      // El PNPT se arma a mano (estudio, examen práctico de 5 días y informe) y los absorbedores miden días, no horas.
      if (e.horas == null || b.id === 'CW9') return;
      let acc = 0;
      let d = e.inicio;
      for (; d <= '2029-12-31'; d = addDays(d, 1)) { acc += h(d); if (acc >= e.horas - 1e-9) break; }
      n++;
      if (d !== e.fin) fallan.push(`${b.id} ${e.inicio}→${d} (doc ${e.fin})`);
    });
    expect(n).toBe(64);
    expect(fallan).toEqual([]);
  });

  it('el PNPT (13 dic–13 ene) es de 154 h en 184 de capacidad: estudio 13–19 y 27–30 dic, examen 7–11 ene, informe 12–13 ene', () => {
    const cw9 = FOREGROUND.find((b) => b.id === 'CW9')!;
    expect(cw9).toMatchObject({ nombre: 'PNPT', horas: 154, fechas: { inicio: '2027-12-13', fin: '2028-01-13' } });
    expect(cw9.certs![0].examen).toBe('2028-01-07');
    const dias = cw9.certs![0].plan.map((p) => p.fecha);
    // Ningún día del plan de estudio cae en un día libre fijo.
    for (const f of dias) expect(esDiaLibre(f), f).toBe(false);
    let cap = 0;
    for (let d = cw9.fechas!.inicio; d <= cw9.fechas!.fin; d = addDays(d, 1)) cap += h(d);
    expect(cap).toBe(184);
    expect(PAUSAS_FONDO.find((p) => p.id === 'pnpt')).toMatchObject({ inicio: '2027-12-13', fin: '2028-01-13' });
  });
});

describe('v12.4 · absorbedores: 3 días como mínimo y los descansos no se usan', () => {
  const seq = secuenciaPlan(calendarioCompleto());
  const libres = DIAS_LIBRES.map(({ inicio, fin }) => ({ inicio, fin }));

  it('solo la Consolidación y los cierres absorben; ninguna fecha libre fija ni un examen reservado se mueve', () => {
    expect(seq.filter((t) => t.absorbe).map((t) => t.id)).toEqual(['COL', 'CIE2', 'CIE3', 'CIE4']);
    expect(seq.some((t) => /^DES/.test(t.id))).toBe(false);
    const s = sugerirCorrimiento(seq, 'S3', '2027-12-15', libres);
    for (const f of libres) for (const c of s) {
      expect(c.nuevoInicio >= f.inicio && c.nuevoInicio <= f.fin, `${c.id} empieza en un día libre`).toBe(false);
      expect(c.nuevoFin >= f.inicio && c.nuevoFin <= f.fin, `${c.id} termina en un día libre`).toBe(false);
    }
  });

  it('un atraso de 2 días corre todo el plan y cada absorbedor queda en sus 3 días: el fin se corre (sin buffer)', () => {
    const s = sugerirCorrimiento(seq, 'P10', '2027-10-29', libres);
    const abs = s.filter((c) => c.absorbe);
    expect(abs.map((c) => c.id)).toEqual(['COL', 'CIE2', 'CIE3', 'CIE4']);
    for (const c of abs) expect((Date.parse(c.nuevoFin) - Date.parse(c.nuevoInicio)) / 864e5 + 1, c.id).toBe(3);
    expect(s.at(-1)!.nuevoFin > '2028-12-14').toBe(true);
  });
});

describe('v12.4 · slots comerciales: build los días 1 a 7, venta del día 8 en adelante', () => {
  it('los 23 slots: build de 7 días, venta el resto; los de 7 días o menos, solo build', () => {
    expect(V122.comerciales).toHaveLength(23);
    for (const c of V122.comerciales) {
      const dias = (Date.parse(c.fin) - Date.parse(c.inicio)) / 864e5 + 1;
      if (dias <= 7) {
        expect(c.build, `#${c.n}`).toEqual({ inicio: c.inicio, fin: c.fin });
        expect(c.venta, `#${c.n}`).toBeNull();
      } else {
        expect(c.build, `#${c.n}`).toEqual({ inicio: c.inicio, fin: addDays(c.inicio, 6) });
        expect(c.venta, `#${c.n}`).toEqual({ inicio: addDays(c.inicio, 7), fin: c.fin });
      }
    }
    const c1 = V122.comerciales[0];
    expect(faseComercial(c1, '2026-12-19')).toBe('build');
    expect(faseComercial(c1, '2026-12-20')).toBe('venta');
    expect(faseComercial(V122.comerciales[11], '2027-11-02')).toBe('build'); // #12 dura 7 días
  });

  it('del #15 al #23 se elige el rubro (sector) y la marca; el #19 pausa su venta en el descanso del 9 al 15 jun 2028 y sigue después', () => {
    for (const c of V122.comerciales.slice(14)) { expect(c.marca, `#${c.n}`).toBeNull(); expect(c.sector, `#${c.n}`).toBeTruthy(); }
    const c19 = V122.comerciales.find((c) => c.n === 19)!;
    expect(c19.venta).toEqual({ inicio: '2028-06-08', fin: '2028-06-18' });
    expect(fondoEn('2028-06-08').comercial?.n).toBe(19);
    for (const d of ['2028-06-09', '2028-06-12', '2028-06-15']) expect(fondoEn(d)).toMatchObject({ comercial: null, secundaria: [], pausa: { nombre: 'Descanso' } });
    expect(fondoEn('2028-06-16').comercial?.n).toBe(19);
    expect(fondoEn('2028-06-16').pausa).toBeNull();
  });
});

describe('v12.4 · la rutina del día con las horas de fondo (lunes a viernes 16:00 y 17:00; fin de semana 11:30 y 12:30)', () => {
  const hhmm = (p: PlannedRoutineBlock[], id: string) => p.find((x) => x.block.id === id);

  it('entre semana: principal 12:00–13:45, cierre 13:45–16:00, secundaria 16–17 y comercial 17–18, con su nombre y su fase', () => {
    const f = fondoParaRutina('2026-12-14'); // lunes: JulIA v3.0 y el slot #1 (build)
    expect(f).toEqual({ secundaria: { nombre: 'JulIA v3.0' }, comercial: { nombre: '#1 Aquasol and water parks', fase: 'build' } });
    const dia = ajustarDia(planRoutine('busqueda-intensiva', 'completo'), { fondo: f });
    expect(hhmm(dia, 'prog-tarde')).toMatchObject({ start: '12:00', min: 105 });
    expect(hhmm(dia, 'prog-review')).toMatchObject({ start: '13:45' });
    expect(hhmm(dia, 'leer')).toMatchObject({ start: '15:45', min: 15 });
    expect(hhmm(dia, 'fondo-sec')).toMatchObject({ start: '16:00', min: 60 });
    expect(hhmm(dia, 'fondo-sec')!.block.label).toBe('Secundaria · JulIA v3.0');
    expect(hhmm(dia, 'fondo-com')).toMatchObject({ start: '17:00', min: 60 });
    expect(hhmm(dia, 'fondo-com')!.block.label).toBe('Comercial · #1 Aquasol and water parks · build');
    // La venta (día 8 del slot) cambia el trabajo del bloque.
    const venta = ajustarDia(planRoutine('busqueda-intensiva', 'completo'), { fondo: fondoParaRutina('2026-12-21') });
    expect(hhmm(venta, 'fondo-com')!.block.label).toMatch(/venta$/);
    expect(hhmm(venta, 'fondo-com')!.block.tasks![0]).toMatch(/Pitch a la marca y a 10 negocios parecidos/);
  });

  it('sin nada activo la hora vuelve a la principal; en una pausa fija vuelven las dos', () => {
    const sin = ajustarDia(planRoutine('busqueda-intensiva', 'completo'), { fondo: fondoParaRutina('2027-08-10') });
    expect(hhmm(sin, 'fondo-sec')).toBeUndefined();
    expect(hhmm(sin, 'prog-fondo-sec')).toMatchObject({ start: '16:00', min: 60 });
    expect(hhmm(sin, 'prog-fondo-sec')!.block.rama).toBe('programacion');
    expect(hhmm(sin, 'prog-fondo-com')).toMatchObject({ start: '17:00', min: 60 });
    // 20 dic 2027 es un día libre fijo: ninguna de las dos pistas corre.
    expect(fondoParaRutina('2027-12-21')).toEqual({ secundaria: false, comercial: false });
    // Lo pausado a mano (uso de Claude sobre el umbral) también devuelve la hora.
    const pausado = fondoParaRutina('2026-12-14', { 'com-1': '2026-12-14' });
    expect(pausado.comercial).toBe(false);
    expect(pausado.secundaria).toEqual({ nombre: 'JulIA v3.0' });
  });

  it('el fin de semana: principal 10:00–11:30, secundaria 11:30–12:30, comercial 12:30–13:30, cierre 13:30', () => {
    const dia = ajustarDia(planRoutine('busqueda-intensiva-finde', 'completo'), { fondo: fondoParaRutina('2026-12-19') });
    expect(hhmm(dia, 'prog-2')).toMatchObject({ start: '10:00', min: 90 });
    expect(hhmm(dia, 'fondo-sec')).toMatchObject({ start: '11:30', min: 60 });
    expect(hhmm(dia, 'fondo-com')).toMatchObject({ start: '12:30', min: 60 });
    expect(hhmm(dia, 'prog-review')).toMatchObject({ start: '13:30' });
    expect(hhmm(dia, 'demo')).toMatchObject({ start: '15:45', min: 75 });
    const dom = ajustarDia(planRoutine('busqueda-intensiva-domingo', 'completo'), { fondo: fondoParaRutina('2026-12-20') });
    expect(hhmm(dom, 'revision')).toMatchObject({ start: '15:45', min: 75 });
  });
});

describe('v12.4 · el Imán y "la necesita"', () => {
  const imanOk = {
    hook: 'x', video: 'https://v', demo: 'https://d', metrica: { valor: '4 min → 20 s', como: 'cronometrado' }, noticia: { link: 'https://n', linea: 'l' },
    readme: true, adrs: true, tests: true, empresas: ['Acme'], posts: { teaser: 'a', build: 'b', launch: 'c' },
  };

  it('v3.0 de cada app (principal y secundaria) y el único lanzamiento de cada slot comercial piden el Imán; las versiones de antes, no', () => {
    expect(puedePublicar({ version: '3.0', lanzamiento: '3.0' }).ok).toBe(false);
    expect(puedePublicar({ version: '3.0', lanzamiento: '3.0', iman: imanOk }).ok).toBe(true);
    expect(puedePublicar({ version: '2.0', lanzamiento: '3.0' }).ok).toBe(true);
    expect(imanCompleto(imanOk)).toBe(true);
    // Comercial: una sola versión, que es el lanzamiento: Imán + seguridad.
    expect(puedePublicar({ version: '1.0', lanzamiento: '1.0', comercial: true, iman: imanOk, seguridad: [true, true, true, true, true] }).ok).toBe(true);
    expect(puedePublicar({ version: '1.0', lanzamiento: '1.0', comercial: true }).ok).toBe(false);
  });

  it('una herramienta extraída no se publica sin "la necesita"; Alawys v1.0 y mcp-ar v2 piden el Imán; la interna nunca', () => {
    const todo = (h: string, v: string) => Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`v12:tool:${h}:${v}:${i + 1}`, { hecho: '2027-01-01' }]));
    const extraidas = HERRAMIENTAS.filter((h) => h.kind === 'extracted');
    expect(extraidas.map((h) => h.id)).toEqual(expect.arrayContaining(['showcase-kit', 'captions', 'seat-picker', 'voice-agent', 'tour3d']));
    for (const h of extraidas) {
      const v = h.versiones[0];
      expect(puedePublicarHerramienta(h, v, { hitos: todo(h.id, v.id) }).faltan, h.id).toContain('La necesita: el segundo ítem que la usa');
      expect(puedePublicarHerramienta(h, v, { hitos: todo(h.id, v.id), fondo: { [h.id]: { necesitadoPor: 'otro' } } }).faltan, h.id).not.toContain('La necesita: el segundo ítem que la usa');
    }
    const alawys = HERRAMIENTAS.find((h) => h.id === 'alawys')!;
    const v1 = alawys.versiones.find((v) => v.id === '1.0')!;
    expect(v1.lanzamiento).toBe(true);
    expect(puedePublicarHerramienta(alawys, v1, { hitos: todo('alawys', '1.0') }).faltan).toEqual(['El Imán (es un lanzamiento)']);
    expect(HERRAMIENTAS.flatMap((h) => h.versiones.filter((v) => v.lanzamiento).map((v) => `${h.id} ${v.id}`))).toEqual(['alawys 1.0', 'mcp-ar v2']);
  });

  it('las herramientas nacen donde dice el doc: bkt el 16 dic 2026, showcase-kit el 15 ene, captions el 20 ene, seat-picker el 3 feb, voice-agent el 28 feb y tour3d el 8 sep 2027', () => {
    const fin = (id: string) => fechasVersion(HERRAMIENTAS.find((h) => h.id === id)!.versiones[0])!.fin;
    expect(['bkt', 'showcase-kit', 'captions', 'seat-picker', 'voice-agent', 'tour3d'].map(fin)).toEqual(['2026-12-16', '2027-01-15', '2027-01-20', '2027-02-03', '2027-02-28', '2027-09-08']);
    const alawys = HERRAMIENTAS.find((h) => h.id === 'alawys')!;
    expect(fechasVersion(alawys.versiones.find((v) => v.id === '0.1')!)).toEqual({ inicio: '2026-12-05', fin: '2026-12-11' });
    expect(fechasVersion(alawys.versiones.find((v) => v.id === '0.2')!)).toEqual({ inicio: '2026-12-28', fin: '2026-12-28' });
    expect(fechasVersion(alawys.versiones.find((v) => v.id === '1.0')!)!.fin).toBe('2027-01-08');
  });
});
