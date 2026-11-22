import { describe, expect, it } from 'vitest';
import { CAPACIDAD_SEMANA, avisoRevision, faltaForeground, fondoEn, metaRevisionSemana, periodosComerciales, periodosSecundarias, recordatoriosFondo, revisionSemana, solapes, sugerenciaPausas } from './fondo';
import { PASOS_ANTES, imanCompleto, puedePublicar, puntosIman, type Iman } from './iman';
import { corrimientoDeFondo, medir, sugerirCorrimiento } from './periodos';
import { secuenciaPlan } from './periodos-plan';
import { calendarioCompleto } from './plan-vistas';
import { horasEntre } from './plan';
import { V122 } from './v12-2';

const cal = calendarioCompleto();
const seq = secuenciaPlan(cal);
const fijas = [{ inicio: '2027-12-20', fin: '2027-12-26' }];
const fila = (cs: { id: string; nuevoInicio: string; nuevoFin: string }[]) => cs.map((c) => `${c.id} ${c.nuevoInicio}→${c.nuevoFin}`);

describe('v12.2 · los absorbedores frenan el corrimiento', () => {
  it('Antena Ops 2 días tarde: corre la búsqueda corta y la Consolidación absorbe (empieza 2 días después, termina igual)', () => {
    const s = sugerirCorrimiento(seq, 'P10', '2027-09-08', fijas);
    expect(fila(s)).toEqual(['P10 2027-08-24→2027-09-08', 'JP6 2027-09-09→2027-09-11', 'COL 2027-09-12→2027-09-19']);
    expect(s.at(-1)).toMatchObject({ absorbe: true });
  });

  it('si la Consolidación quedaría con menos de 3 días, queda en 3 y el atraso sigue hasta el próximo absorbedor (el cierre de etapa)', () => {
    const s = sugerirCorrimiento(seq, 'P10', '2027-09-16', fijas);
    expect(s.find((c) => c.id === 'COL')).toMatchObject({ nuevoInicio: '2027-09-20', nuevoFin: '2027-09-22' });
    expect(s.at(-1)).toMatchObject({ id: 'CIE2', nuevoFin: '2027-11-21', absorbe: true });
    expect(s.some((c) => c.id === 'WQ1')).toBe(false); // la etapa 3 no se toca
  });

  it('un examen reservado y la pausa del 20–26 dic 2027 no se mueven', () => {
    const conReserva = secuenciaPlan(cal, [{ inicio: '2027-12-01', fin: '2027-12-01' }]);
    expect(conReserva.find((b) => b.id === 'CW10')!.fija).toBeUndefined(); // CKS es en feb: esa reserva no es suya
    const conCKS = secuenciaPlan(cal, [{ inicio: '2028-02-15', fin: '2028-02-15' }]);
    expect(conCKS.find((b) => b.id === 'CW10')).toMatchObject({ fija: true });
    // Paper Trail (13–30 dic) 3 días tarde: salta la pausa y el descanso de fin de año absorbe.
    const s = sugerirCorrimiento(seq, 'Q2', '2028-01-02', fijas);
    expect(s.find((c) => c.id === 'DES3')).toMatchObject({ absorbe: true, nuevoFin: '2028-01-06' });
    expect(s.every((c) => !(c.nuevoInicio <= '2027-12-26' && c.nuevoFin >= '2027-12-20') || c.id === 'Q2')).toBe(true);
  });

  it('lo de fondo dentro de una ventana achicada se corre con ella (sugerencia)', () => {
    const s = sugerirCorrimiento(seq, 'P10', '2027-09-08', fijas);
    const c12 = V122.comerciales.find((c) => c.n === 12)!;
    expect(fila(corrimientoDeFondo([c12], seq, s))).toEqual(['com-12 2027-09-09→2027-09-19']);
    // Un slot que no toca los bloques corridos no se mueve.
    expect(corrimientoDeFondo([V122.comerciales.find((c) => c.n === 13)!], seq, s)).toEqual([]);
  });
});

describe('v12.2 · pistas de fondo', () => {
  it('las 4 apps secundarias van una por vez (con el relevo de 4 días entre JulIA y Clip Studio) y los 23 slots no se pisan', () => {
    expect(V122.secundarias.map((s) => `${s.nombre} ${s.inicio}→${s.fin}`)).toEqual(['HandyX 2026-11-26→2027-02-03', 'JulIA 2027-02-04→2027-04-17', 'Clip Studio 2027-04-13→2027-06-18', 'Roofy 2027-06-19→2027-09-06']);
    expect(solapes(V122.secundarias)).toEqual([['julia', 'clip-studio']]);
    expect(solapes(V122.secundarias, 5)).toEqual([]); // un relevo de hasta 5 días es a propósito
    expect(solapes(V122.comerciales)).toEqual([]);
    expect(V122.comerciales).toHaveLength(23);
    expect(V122.comerciales.filter((c) => !c.marca).map((c) => c.n)).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23]);
  });

  it('qué corre de fondo: HandyX v1.0 sola el 1 dic; HandyX v1.0 y Aquasol el 12 dic; nada en el PNPT ni en la pausa de dic 2027', () => {
    expect(fondoEn('2026-12-01')).toMatchObject({ secundaria: [{ version: '1.0' }], comercial: null, pausa: null });
    expect(fondoEn('2026-12-12').comercial?.marca).toBe('Aquasol and water parks');
    expect(fondoEn('2027-11-01')).toMatchObject({ secundaria: [], comercial: null, pausa: { nombre: 'PNPT' } });
    expect(fondoEn('2027-12-22').pausa?.nombre).toBe('Pausa de fin de año');
    // Relevo: el 15 abr 2027 corren JulIA v3.0 y Clip Studio v1.0.
    expect(fondoEn('2027-04-15').secundaria.map((s) => `${s.app.nombre} v${s.version}`)).toEqual(['JulIA v3.0', 'Clip Studio v1.0']);
  });

  it('en una pausa fija lo de fondo se ve en pausa, no atrasado; fuera de ella, el estado normal', () => {
    const com = periodosComerciales({ hitos: {} });
    const c14 = com.find((c) => c.id === 'com-14')!;
    expect(medir({ ...c14, pausas: [{ inicio: '2027-11-12', fin: '2027-11-13' }] }, '2027-11-13').estado).toBe('pausado');
    expect(medir(c14, '2027-11-20').estado).toBe('atrasado');
    const sec = periodosSecundarias({ hitos: {} });
    expect(sec.map((s) => s.hijos!.length)).toEqual([3, 3, 3, 3]);
  });

  it('capacidad: 72 h por semana de foco; lo de fondo no suma y su revisión se anota aparte', () => {
    expect(CAPACIDAD_SEMANA).toBe(72);
    // La capacidad de foco del calendario, día por día: 10 h × 5 + 11 h × 2.
    expect(horasEntre('2026-11-30', '2026-12-06')).toBe(72);
    const log = [
      { id: '1', fecha: '2026-11-29', min: 60, item: 'handyx', tipo: 'walkthrough' as const },
      { id: '2', fecha: '2026-12-01', min: 30, item: 'handyx', tipo: 'diseño' as const },
      { id: '3', fecha: '2026-12-12', min: 45, item: 'com-1', tipo: 'comercial' as const },
    ];
    expect(revisionSemana(log, '2026-11-23')).toMatchObject({ min: 60, walkthrough: 60 });
    expect(revisionSemana(log, '2026-11-30')).toMatchObject({ min: 30, diseno: 30 });
    expect(metaRevisionSemana('2026-11-30')).toEqual({ walkthroughMin: 60, apps: ['handyx'] });
  });

  it('el tiempo comercial en un bloque de foco avisa (de simulacros en una cert window); en el cierre, no', () => {
    expect(avisoRevision({ fecha: '2026-12-11', inicio: '05:00', min: 30, tipo: 'comercial' }, 'cert')).toMatch(/de simulacros/);
    expect(avisoRevision({ fecha: '2026-12-15', inicio: '13:00', min: 30, tipo: 'comercial' })).toMatch(/bloque de estudio/);
    expect(avisoRevision({ fecha: '2026-12-15', inicio: '17:30', min: 30, tipo: 'comercial' })).toBeNull();
    expect(avisoRevision({ fecha: '2026-12-15', inicio: '05:00', min: 30, tipo: 'walkthrough' })).toBeNull();
  });

  it('uso de Claude sobre el umbral: sugiere pausar lo comercial primero y después lo secundario', () => {
    expect(sugerenciaPausas(80, 85, fondoEn('2026-12-12'))).toEqual([]);
    expect(sugerenciaPausas(90, 85, fondoEn('2026-12-12')).map((x) => x.pista)).toEqual(['comercial', 'secundaria']);
    expect(sugerenciaPausas(86, 90, fondoEn('2026-12-12'))).toEqual([]);
  });

  it('recordatorios: arrancar HandyX el 26 nov, el brief 7 días antes de cada slot y la marca 14 días antes de los que faltan definir', () => {
    expect(recordatoriosFondo({ hitos: {} }, '2026-11-26').map((r) => r.texto)).toContain('Start HandyX v1.0 in the background (separate repo).');
    expect(recordatoriosFondo({ hitos: {} }, '2026-12-03').map((r) => r.id)).toEqual(expect.arrayContaining(['brief-com-1']));
    expect(recordatoriosFondo({ hitos: {} }, '2027-11-08').map((r) => r.id)).toContain('marca-com-15');
    expect(recordatoriosFondo({ hitos: {}, fondo: { 'com-15': { marca: 'Mercado Libre' } } }, '2027-11-08').map((r) => r.id)).not.toContain('marca-com-15');
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
    const v3 = V122.secundarias[0].versiones[2];
    expect(v3.revisionForeground).toEqual(['dinero', 'seguridad', 'smart contracts']);
    expect(faltaForeground(v3.revisionForeground, undefined)).toBe(true);
    expect(faltaForeground(v3.revisionForeground, '2027-02-03')).toBe(false);
    expect(faltaForeground(V122.secundarias[0].versiones[1].revisionForeground, undefined)).toBe(false);
    expect(puedePublicar({ version: '1.0', lanzamiento: '3.0', faltaForeground: true }).ok).toBe(false);
  });
});
