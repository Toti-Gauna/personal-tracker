import { describe, expect, it } from 'vitest';
import { CAPACIDAD_SEMANA, avisoRevision, faltaForeground, fondoEn, metaRevisionSemana, periodosComerciales, periodosSecundarias, recordatoriosFondo, revisionSemana, solapes, sugerenciaPausas } from './fondo';
import { capacidadSemana } from './capacidad';
import { PASOS_ANTES, imanCompleto, puedePublicar, puntosIman, type Iman } from './iman';
import { MIN_ABSORBEDOR, corrimientoDeFondo, medir, reiniciarDesde, sugerirCorrimiento, type Tramo } from './periodos';
import { secuenciaPlan } from './periodos-plan';
import { calendarioCompleto } from './plan-vistas';
import { horasEntre } from './plan';
import { DIAS_LIBRES, V122 } from './v12-2';

const cal = calendarioCompleto();
const seq = secuenciaPlan(cal);
// v12.4: los tres días libres fijos (20–26 dic 2027, 31 dic 2027–6 ene 2028 y 9–15 jun 2028): no se usan nunca.
const fijas = DIAS_LIBRES.map(({ inicio, fin }) => ({ inicio, fin }));
const fila = (cs: { id: string; nuevoInicio: string; nuevoFin: string }[]) => cs.map((c) => `${c.id} ${c.nuevoInicio}→${c.nuevoFin}`);

describe('v12.4 · los absorbedores frenan el corrimiento (3 días como mínimo; los descansos no se usan)', () => {
  // Una secuencia a mano: A, un absorbedor de 8 días y B.
  const sec: Tramo[] = [
    { id: 'A', inicio: '2027-06-01', fin: '2027-06-05' },
    { id: 'ABS', inicio: '2027-06-06', fin: '2027-06-13', absorbe: true },
    { id: 'B', inicio: '2027-06-14', fin: '2027-06-20' },
  ];

  it('un absorbedor con lugar absorbe el atraso: empieza más tarde y termina igual, y lo que sigue no se mueve', () => {
    const s = sugerirCorrimiento(sec, 'A', '2027-06-07');
    expect(fila(s)).toEqual(['A 2027-06-01→2027-06-07', 'ABS 2027-06-08→2027-06-13']);
    expect(s.at(-1)).toMatchObject({ absorbe: true });
  });

  it('si el absorbedor quedaría con menos de 3 días, queda en 3 y el atraso sigue hasta el próximo bloque', () => {
    expect(MIN_ABSORBEDOR).toBe(3);
    const s = sugerirCorrimiento(sec, 'A', '2027-06-11');
    expect(fila(s)).toEqual(['A 2027-06-01→2027-06-11', 'ABS 2027-06-12→2027-06-14', 'B 2027-06-15→2027-06-21']);
  });

  it('un día libre fijo no cuenta como día del bloque ni se usa: el atrasado y lo que sigue lo saltean', () => {
    const libres = [{ inicio: '2027-06-08', fin: '2027-06-09' }];
    const s = sugerirCorrimiento(sec, 'A', '2027-06-07', libres);
    // Los 2 días que le faltan a A caen el 6 y el 7 (el 8 y el 9 son libres); el absorbedor arranca el 10 y conserva su fin.
    expect(fila(s)).toEqual(['A 2027-06-01→2027-06-07', 'ABS 2027-06-10→2027-06-13']);
    // Adelantarse (empezar de nuevo antes) agranda al absorbedor: conserva su fin.
    expect(fila(reiniciarDesde(sec, 'A', '2027-05-28'))).toEqual(['A 2027-05-28→2027-06-01', 'ABS 2027-06-02→2027-06-13']);
  });

  it('el plan real: Consolidación y los cierres ya miden 3 días, así que ninguno absorbe: el atraso llega al cierre final', () => {
    const abs = seq.filter((t) => t.absorbe);
    expect(abs.map((t) => `${t.id} ${t.inicio}→${t.fin}`)).toEqual(['COL 2027-11-01→2027-11-03', 'CIE2 2028-01-19→2028-01-21', 'CIE3 2028-05-29→2028-05-31', 'CIE4 2028-12-12→2028-12-14']);
    // Antena Ops (14–27 oct 2027) 2 días tarde: corre la búsqueda corta y la Consolidación queda en 3 días (3–5 nov).
    const s = sugerirCorrimiento(seq, 'P10', '2027-10-29', fijas);
    expect(fila(s).slice(0, 4)).toEqual(['P10 2027-10-14→2027-10-29', 'JP6 2027-10-30→2027-11-02', 'COL 2027-11-03→2027-11-05', 'W4 2027-11-06→2027-11-11']);
    expect(s.find((c) => c.id === 'COL')).toMatchObject({ absorbe: true });
    // Zero buffer: el plan se corre entero y el cierre final termina más tarde que el 14 dic 2028 (también saltea los descansos).
    expect(s.at(-1)).toMatchObject({ id: 'CIE4', absorbe: true });
    expect(s.at(-1)!.nuevoFin > '2028-12-14').toBe(true);
  });

  it('un examen reservado y los días libres fijos no se mueven', () => {
    const cw10 = cal.find((b) => b.id === 'CW10')!;
    const fuera = secuenciaPlan(cal, [{ inicio: '2027-12-01', fin: '2027-12-01' }]);
    expect(fuera.find((b) => b.id === 'CW10')!.fija).toBeUndefined(); // esa reserva no es de CKS
    const conCKS = secuenciaPlan(cal, [{ inicio: cw10.fin, fin: cw10.fin }]);
    expect(conCKS.find((b) => b.id === 'CW10')).toMatchObject({ fija: true });
    // Vigía (30 nov–12 dic 2027) 3 días tarde: el PNPT salta la pausa y los dos descansos; ningún bloque empieza ni termina en un día libre.
    const s = sugerirCorrimiento(seq, 'S3', '2027-12-15', fijas);
    expect(s.find((c) => c.id === 'CW9')).toMatchObject({ nuevoInicio: '2027-12-16', nuevoFin: '2028-01-16' });
    for (const f of fijas) for (const c of s) {
      expect(c.nuevoInicio >= f.inicio && c.nuevoInicio <= f.fin, `${c.id} empieza en un día libre`).toBe(false);
      expect(c.nuevoFin >= f.inicio && c.nuevoFin <= f.fin, `${c.id} termina en un día libre`).toBe(false);
    }
  });

  it('lo de fondo dentro de una ventana corrida se corre con ella (sugerencia)', () => {
    const s = sugerirCorrimiento(seq, 'P10', '2027-10-29', fijas);
    const c12 = V122.comerciales.find((c) => c.n === 12)!;
    expect(fila(corrimientoDeFondo([c12], seq, s))).toEqual(['com-12 2027-10-30→2027-11-05']);
    expect(fila(corrimientoDeFondo([V122.comerciales.find((c) => c.n === 13)!], seq, s))).toEqual(['com-13 2027-11-06→2027-11-11']);
    // Un slot que no toca los bloques corridos no se mueve.
    expect(corrimientoDeFondo([V122.comerciales.find((c) => c.n === 1)!], seq, s)).toEqual([]);
  });
});

describe('v12.4 · pistas de fondo', () => {
  it('las 10 apps secundarias van una por vez, seguidas, del 26 nov 2026 al 4 ago 2027, y los 23 slots no se pisan', () => {
    expect(V122.secundarias.map((s) => `${s.nombre} ${s.inicio}→${s.fin}`)).toEqual([
      'JulIA 2026-11-26→2026-12-16', 'HandyX 2026-12-17→2027-01-06', 'Clip Studio 2027-01-07→2027-01-27', 'Roofy 2027-01-28→2027-02-17', 'Amazon v2 2027-02-18→2027-03-17',
      'Stripe v2 2027-03-18→2027-04-14', 'Uber v2 2027-04-15→2027-05-12', 'Notion v2 2027-05-13→2027-06-09', 'Spotify v2 2027-06-10→2027-07-07', 'Cursor v2 2027-07-08→2027-08-04',
    ]);
    expect(solapes(V122.secundarias)).toEqual([]);
    // Las apps "v2" pesadas llevan 4 semanas (v3.0 dura dos).
    expect(V122.secundarias.filter((s) => /v2$/.test(s.nombre)).every((s) => s.versiones.length === 3)).toBe(true);
    expect(solapes(V122.comerciales)).toEqual([]);
    expect(V122.comerciales).toHaveLength(23);
    expect(V122.comerciales.filter((c) => !c.marca).map((c) => c.n)).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23]);
  });

  it('qué corre de fondo: JulIA v1.0 sola el 1 dic; JulIA v3.0 y Aquasol el 14 dic; nada en el PNPT ni en los días libres', () => {
    expect(fondoEn('2026-12-01')).toMatchObject({ secundaria: [{ version: '1.0' }], comercial: null, pausa: null });
    expect(fondoEn('2026-12-14').comercial?.marca).toBe('Aquasol and water parks');
    expect(fondoEn('2026-12-14').secundaria.map((s) => `${s.app.nombre} v${s.version}`)).toEqual(['JulIA v3.0']);
    // Después del 4 ago 2027 no hay secundaria hasta el próximo ciclo: esa hora vuelve a la principal.
    expect(fondoEn('2027-08-10')).toMatchObject({ secundaria: [], comercial: null, pausa: null });
    expect(fondoEn('2028-01-10')).toMatchObject({ secundaria: [], comercial: null, pausa: { nombre: 'PNPT' } });
    expect(fondoEn('2027-12-22').pausa?.nombre).toBe('Pausa de fin de año'); // adentro del PNPT, gana el día libre
    expect(fondoEn('2028-01-02').pausa?.nombre).toBe('Descanso');
    expect(fondoEn('2028-06-10')).toMatchObject({ secundaria: [], comercial: null, pausa: { nombre: 'Descanso' } });
    // Una app a la vez: el 15 abr 2027 corre solo Uber v2 v1.0.
    expect(fondoEn('2027-04-15').secundaria.map((s) => `${s.app.nombre} v${s.version}`)).toEqual(['Uber v2 v1.0']);
  });

  it('en una pausa fija lo de fondo se ve en pausa, no atrasado; fuera de ella, el estado normal', () => {
    const com = periodosComerciales({ hitos: {} });
    // El slot #19 (1–18 jun 2028) pasa por el descanso del 9 al 15 jun: pausa su venta y sigue después.
    const c19 = com.find((c) => c.id === 'com-19')!;
    expect(c19.pausas?.some((p) => p.inicio === '2028-06-09' && p.fin === '2028-06-15')).toBe(true);
    expect(medir(c19, '2028-06-10').estado).toBe('pausado');
    expect(medir(c19, '2028-06-16').estado).not.toBe('pausado');
    expect(medir(c19, '2028-06-20').estado).toBe('vencido'); // pasó el fin y falta trabajo
    const sec = periodosSecundarias({ hitos: {} });
    expect(sec.map((s) => s.hijos!.length)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('capacidad: 72 h de foco por semana; la hora de cada pista activa sale de ahí y su revisión se anota aparte', () => {
    expect(CAPACIDAD_SEMANA).toBe(72);
    // La capacidad de la principal, día por día: 10 h × 5 + 11 h × 2, menos 1 h por día de JulIA y 1 h de Alawys v0.1 (5 y 6 dic).
    expect(horasEntre('2026-11-30', '2026-12-06')).toBe(63);
    expect(capacidadSemana('2026-11-30')).toMatchObject({ foco: 72, principal: 63, secundaria: 7, comercial: 0, extras: 2 });
    const log = [
      { id: '1', fecha: '2026-11-29', min: 60, item: 'julia', tipo: 'walkthrough' as const },
      { id: '2', fecha: '2026-12-01', min: 30, item: 'julia', tipo: 'diseño' as const },
      { id: '3', fecha: '2026-12-14', min: 45, item: 'com-1', tipo: 'comercial' as const },
    ];
    expect(revisionSemana(log, '2026-11-23')).toMatchObject({ min: 60, walkthrough: 60 });
    expect(revisionSemana(log, '2026-11-30')).toMatchObject({ min: 30, diseno: 30 });
    // La meta es 1 h por día activo de la pista: 7 h de secundaria; con un slot comercial, otras 7 h.
    expect(metaRevisionSemana('2026-11-30')).toMatchObject({ walkthroughMin: 420, comercialMin: 0, apps: ['julia'] });
    expect(metaRevisionSemana('2026-12-14')).toMatchObject({ walkthroughMin: 420, comercialMin: 420 });
    expect(metaRevisionSemana('2027-08-09')).toMatchObject({ walkthroughMin: 0, comercialMin: 0, apps: [] });
  });

  it('el tiempo comercial en un bloque de foco avisa (de simulacros en una cert window); en el cierre, no', () => {
    expect(avisoRevision({ fecha: '2026-12-11', inicio: '05:00', min: 30, tipo: 'comercial' }, 'cert')).toMatch(/de simulacros/);
    expect(avisoRevision({ fecha: '2026-12-15', inicio: '13:00', min: 30, tipo: 'comercial' })).toMatch(/bloque de estudio/);
    expect(avisoRevision({ fecha: '2026-12-15', inicio: '17:30', min: 30, tipo: 'comercial' })).toBeNull();
    expect(avisoRevision({ fecha: '2026-12-15', inicio: '05:00', min: 30, tipo: 'walkthrough' })).toBeNull();
  });

  it('uso de Claude sobre el umbral: sugiere pausar lo comercial primero y después lo secundario', () => {
    expect(sugerenciaPausas(80, 85, fondoEn('2026-12-14'))).toEqual([]);
    expect(sugerenciaPausas(90, 85, fondoEn('2026-12-14')).map((x) => x.pista)).toEqual(['comercial', 'secundaria']);
    expect(sugerenciaPausas(86, 90, fondoEn('2026-12-14'))).toEqual([]);
  });

  it('recordatorios: arrancar JulIA el 26 nov, el brief 7 días antes de cada slot (menos el #1) y la marca 14 días antes de todos', () => {
    expect(recordatoriosFondo({ hitos: {} }, '2026-11-26').map((r) => r.texto)).toContain('Start JulIA v1.0 in the background (separate repo).');
    // Slot #1 (13 dic): el brief es el recordatorio del 3 dic; no hay uno automático. La pregunta de la marca sí va (14 días antes: 29 nov).
    const a = recordatoriosFondo({ hitos: {} }, '2026-12-06').map((r) => r.id);
    expect(a).toContain('v124-2026-12-03');
    expect(a).not.toContain('brief-com-1');
    expect(a).toContain('marca-com-1');
    // Slot #2 (9 ene 2027): brief desde el 2 ene, marca desde el 26 dic.
    expect(recordatoriosFondo({ hitos: {} }, '2027-01-03').map((r) => r.id)).toEqual(expect.arrayContaining(['brief-com-2', 'marca-com-2']));
    // Slot #15 (22 ene 2028) sin marca: se la elige 14 días antes (8 ene 2028).
    expect(recordatoriosFondo({ hitos: {} }, '2028-01-07').map((r) => r.id)).not.toContain('marca-com-15');
    const m = recordatoriosFondo({ hitos: {} }, '2028-01-08').find((r) => r.id === 'marca-com-15')!;
    expect(m.texto).toMatch(/¿marca regional para clientes o marca grande para ruido\?/);
    // Contestada (queda guardada) o marcada como hecha, deja de aparecer.
    expect(recordatoriosFondo({ hitos: {}, fondo: { 'com-15': { perfilMarca: 'grande', marca: 'Mercado Libre' } } }, '2028-01-08').map((r) => r.id)).not.toContain('marca-com-15');
    expect(recordatoriosFondo({ hitos: { 'v12:recordatorio:marca-com-15': { hecho: true, fecha: '2028-01-08' } } as never }, '2028-01-08').map((r) => r.id)).not.toContain('marca-com-15');
  });
});

describe('v12.2 · Imán y revisión en primer plano', () => {
  const completo: Iman = {
    hook: 'Mirá los mejores pozos de Vaca Muerta en 3 s', video: 'https://x.com/v', demo: 'https://petria.app', metrica: { valor: '4 min → 20 s por parte', como: '20 partes cronometrados' },
    noticia: { link: 'https://news', linea: 'récord de producción' }, readme: true, adrs: true, tests: true, empresas: ['YPF'],
    posts: { teaser: 'p1', build: 'p2', launch: 'p3' },
  };
  it('los 8 puntos: solo con teaser, build y launch (deep dive y result van después)', () => {
    expect(puntosIman(undefined).filter((p) => p.ok)).toEqual([]);
    expect(imanCompleto(completo)).toBe(true);
    expect(PASOS_ANTES).toEqual(['teaser', 'build', 'launch']);
    expect(imanCompleto({ ...completo, demo: 'petria.app' })).toBe(false); // tiene que ser un link
    expect(imanCompleto({ ...completo, posts: { teaser: 'p1', build: 'p2' } })).toBe(false);
  });

  it('el lanzamiento no se publica sin el Imán; las versiones de antes, sí; el comercial pide además la seguridad', () => {
    expect(puedePublicar({ version: '1.0', lanzamiento: '3.0' })).toEqual({ ok: true, faltan: [] });
    const r = puedePublicar({ version: '3.0', lanzamiento: '3.0', iman: { ...completo, empresas: [] } });
    expect(r).toEqual({ ok: false, faltan: ['Imán 7 · Empresas objetivo'] });
    expect(puedePublicar({ version: '3.0', lanzamiento: '3.0', iman: completo }).ok).toBe(true);
    expect(puedePublicar({ version: '1.0', lanzamiento: '1.0', iman: completo, comercial: true, seguridad: [true, true, true, true] }).faltan).toEqual(['Checklist de seguridad del showcase']);
    expect(puedePublicar({ version: '1.0', lanzamiento: '1.0', iman: completo, comercial: true, seguridad: [true, true, true, true, true] }).ok).toBe(true);
  });

  it('una versión que toca plata o smart contracts no se cierra sin la revisión en primer plano', () => {
    const v3 = V122.secundarias[1].versiones[2]; // HandyX v3.0: escrow interno, datos y contratos
    expect(v3.revisionForeground).toEqual(['dinero', 'seguridad', 'smart contracts']);
    expect(faltaForeground(v3.revisionForeground, undefined)).toBe(true);
    expect(faltaForeground(v3.revisionForeground, '2027-01-06')).toBe(false);
    // JulIA v3.0 solo toca contratos; su v1.0 no toca nada.
    expect(V122.secundarias[0].versiones[2].revisionForeground).toEqual(['smart contracts']);
    expect(faltaForeground(V122.secundarias[0].versiones[0].revisionForeground, undefined)).toBe(false);
    expect(puedePublicar({ version: '1.0', lanzamiento: '3.0', faltaForeground: true }).ok).toBe(false);
  });
});
