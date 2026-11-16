import { beforeEach, describe, expect, it } from 'vitest';
import { CLIP, curva, faseDe, finMes, hitosClip, inicioMes, mesCruce, mesDe, sumarMeses, validarClipping, type ClippingFile } from './clipping';
import { emptyClipping, migrarClipping, validarPlanilla, type ClippingState, type FilaClip } from './clipping-state';
import {
  aprobacion, compuerta, concentracion, distribucionViews, embudo, ingresoMes, mesContraMeta, pagoReal, pct1000, planContraReal,
  porCampana, proyeccion, rangoPeriodo, semanas, usdPorHora, viewsPorClip,
} from './clipping-metricas';
import { getState, migrate, resetState } from '../state/store';
import { borrarFila, importarPlanilla, registrarClips, restaurarFila, sumarProspeccion, tildarRutina } from '../state/clipping';
import type { DayLog } from './types';

const fila = (x: Partial<FilaClip> & { fecha: string }): FilaClip => ({ id: Math.random().toString(36).slice(2), clips: 0, views: 0, ...x });
const st = (x: Partial<ClippingState>): ClippingState => ({ ...emptyClipping(), ...x });

describe('ola 23 · el plan de clipping', () => {
  it('valida: 12 meses con metas que no bajan, fases que cubren el año y umbrales coherentes', () => {
    expect(validarClipping(CLIP)).toEqual([]);
    expect(CLIP.meses.map((m) => m.meta)).toEqual([150, 350, 700, 1200, 1900, 2800, 3800, 4800, 5800, 6800, 8000, 9000]);
    expect(CLIP.meses.map((m) => m.clipsDia)).toEqual([5, 8, 16, 24, 30, 40, 50, 50, 64, 64, 80, 80]);
    const roto = JSON.parse(JSON.stringify(CLIP)) as ClippingFile;
    roto.meses[3].meta = 100;
    roto.fases[1].meses = [5, 6];
    roto.umbrales.pagoMes6 = 0.9;
    const e = validarClipping(roto);
    expect(e.some((x) => x.includes('mes 4: la meta no puede bajar'))).toBe(true);
    expect(e.some((x) => x.includes('fase 2'))).toBe(true);
    expect(e.some((x) => x.includes('mes 6'))).toBe(true);
  });

  it('calendario: el mes n arranca el 16 (mes 1: 16 nov a 15 dic 2026; mes 12: 16 oct a 15 nov 2027)', () => {
    expect([inicioMes(1), finMes(1)]).toEqual(['2026-11-16', '2026-12-15']);
    expect(inicioMes(2)).toBe('2026-12-16');
    expect(inicioMes(3)).toBe('2027-01-16');
    expect([inicioMes(12), finMes(12)]).toEqual(['2027-10-16', '2027-11-15']);
    expect(sumarMeses('2026-11-16', 14)).toBe('2028-01-16');
    expect(mesDe('2026-11-15')).toBe(0);
    expect(mesDe('2026-11-16')).toBe(1);
    expect(mesDe('2026-12-15')).toBe(1);
    expect(mesDe('2026-12-16')).toBe(2);
    expect(mesDe('2027-11-15')).toBe(12);
    expect(mesDe('2027-11-16')).toBe(13);
    expect([faseDe(1)?.n, faseDe(3)?.n, faseDe(4)?.n, faseDe(6)?.n, faseDe(7)?.n, faseDe(12)?.n, faseDe(13)]).toEqual([1, 1, 2, 2, 3, 3, null]);
  });

  it('escenarios: base cruza USD 10k en el mes 13, optimista en el 10 y conservador no llega', () => {
    expect(curva('base', 12)).toBe(9000);
    expect(curva('optimista', 10)).toBe(10200);
    expect(curva('optimista', 2)).toBe(350);
    expect(curva('conservador', 12)).toBe(5400);
    expect(curva('conservador', 2)).toBe(350);
    expect(mesCruce('base')).toBe(13);
    expect(mesCruce('optimista')).toBe(10);
    expect(mesCruce('conservador')).toBeNull();
  });

  it('hitos con fecha propia: GTA 6 el 19 nov y la revisión del mes 6 el 15 may 2027', () => {
    const h = hitosClip();
    expect(h[0]).toMatchObject({ id: 'gta6', fechaReal: '2026-11-19' });
    expect(h.find((x) => x.id === 'revision-6')?.fechaReal).toBe('2027-05-15');
    expect(h.find((x) => x.id === 'usd-150')?.fechaReal).toBe('2026-12-15');
    expect(h.map((x) => x.fechaReal)).toEqual([...h.map((x) => x.fechaReal)].sort());
  });
});

describe('ola 23 · métricas', () => {
  it('sin views ni cobros: todo da null o cero, sin dividir por cero', () => {
    const e = emptyClipping();
    expect(pagoReal(e.registro)).toBeNull();
    expect(aprobacion(e.registro)).toBeNull();
    expect(pct1000(e.registro)).toBeNull();
    expect(viewsPorClip(e.registro)).toBeNull();
    expect(proyeccion(e, '2026-11-30')).toBeNull();
    expect(compuerta(e, '2026-11-30')?.luz).toBe('gris');
    expect(concentracion(e, { desde: '2026-11-16', hasta: '2026-12-15' }).peor).toBeNull();
    expect(embudo(e.registro).map((x) => x.v)).toEqual([0, 0, 0, 0]);
  });

  it('pago real por 1.000 views sale solo de las filas cobradas, con las verificadas si están', () => {
    const fs = [
      fila({ fecha: '2026-11-20', clips: 5, views: 10000, verificadas: 8000, cobrado: 8, aprobados: 4, mas1000: 3 }),
      fila({ fecha: '2026-11-21', clips: 5, views: 6000, aprobados: 5, mas1000: 1 }),
    ];
    expect(pagoReal(fs)).toBe(1);
    expect(aprobacion(fs)).toBe(0.9);
    expect(pct1000(fs)).toBe(0.4);
    expect(viewsPorClip(fs)).toBe(1600);
  });

  it('por campaña: la brecha contra la tarifa listada y el orden por pago real', () => {
    const s = st({
      campanas: [
        { id: 'a', nombre: 'GTA 6 · streamer', plataforma: 'Whop', nicho: 'Videojuegos', tarifa: 1.5, estado: 'activa', desde: '2026-11-18' },
        { id: 'b', nombre: 'Podcast X', plataforma: 'Vyro', nicho: 'Podcasts', tarifa: 1, estado: 'activa', desde: '2026-11-18' },
      ],
      registro: [
        fila({ fecha: '2026-11-19', campana: 'a', clips: 3, views: 10000, cobrado: 9 }),
        fila({ fecha: '2026-11-19', campana: 'b', clips: 3, views: 10000, cobrado: 11, aprobados: 2 }),
      ],
    });
    const pc = porCampana(s);
    expect(pc.map((x) => x.id)).toEqual(['b', 'a']);
    expect(pc[1]).toMatchObject({ pagoReal: 0.9, brecha: -0.6 });
    expect(pc[0].aprobacion).toBeCloseTo(2 / 3);
  });

  it('una sola campaña: concentración del 100 %, y la compuerta de la fase 3 en rojo', () => {
    const s = st({
      campanas: [{ id: 'a', nombre: 'Única', plataforma: 'Whop', nicho: 'Streamers', tarifa: 1, estado: 'activa', desde: '2027-06-01' }],
      registro: [fila({ fecha: '2027-06-20', campana: 'a', clips: 50, views: 100000, cobrado: 100 })],
    });
    const c = concentracion(s, { desde: '2027-06-01', hasta: '2027-06-30' });
    expect(c.peor).toMatchObject({ nombre: 'Única', pct: 1 });
    expect(compuerta(s, '2027-06-30')).toMatchObject({ fase: 3, luz: 'rojo' });
  });

  it('concentración: los retainers cuentan como fuente propia y bajan la parte de cada campaña', () => {
    const s = st({
      campanas: [
        { id: 'a', nombre: 'A', plataforma: 'Whop', nicho: 'Streamers', tarifa: 1, estado: 'activa', desde: '2027-06-01' },
        { id: 'b', nombre: 'B', plataforma: 'Vyro', nicho: 'Podcasts', tarifa: 1, estado: 'activa', desde: '2027-06-01' },
      ],
      registro: [fila({ fecha: '2027-06-20', campana: 'a', clips: 1, views: 1, cobrado: 250 }), fila({ fecha: '2027-06-20', campana: 'b', clips: 1, views: 1, cobrado: 250 })],
      retainers: [{ id: 't', nombre: 'Streamer Z', estado: 'activo', usdMes: 500, desde: '2027-05-01' }, { id: 'p', nombre: 'Prueba', estado: 'prueba', usdMes: 400, desde: '2027-06-01' }],
    });
    const c = concentracion(s, { desde: '2027-06-01', hasta: '2027-06-30' });
    expect(c.total).toBe(1000);
    expect(c.campana.map((x) => [x.nombre, x.pct])).toEqual([['Retainer · Streamer Z', 0.5], ['A', 0.25], ['B', 0.25]]);
  });

  it('compuertas: fase 1 en verde con 0,80 y 40 %; mes 6 en rojo por debajo de 0,70 y amarillo entre 0,70 y 0,80', () => {
    const f1 = st({ registro: [fila({ fecha: '2026-12-01', clips: 10, views: 20000, cobrado: 16, mas1000: 4 })] });
    expect(compuerta(f1, '2026-12-10')).toMatchObject({ fase: 1, luz: 'verde' });
    const f1b = st({ registro: [fila({ fecha: '2026-12-01', clips: 10, views: 20000, cobrado: 15.8, mas1000: 4 })] });
    expect(compuerta(f1b, '2026-12-10')?.luz).toBe('amarillo');
    const f1c = st({ registro: [fila({ fecha: '2026-12-01', clips: 10, views: 20000, cobrado: 10, mas1000: 1 })] });
    expect(compuerta(f1c, '2026-12-10')?.luz).toBe('rojo');
    const m6 = (cob: number) => st({ registro: [fila({ fecha: '2027-05-01', clips: 10, views: 10000, cobrado: cob })] });
    expect(compuerta(m6(6.9), '2027-05-10')).toMatchObject({ fase: 2, luz: 'rojo' });
    expect(compuerta(m6(7), '2027-05-10')?.luz).toBe('amarillo');
    expect(compuerta(m6(8), '2027-05-10')?.luz).toBe('verde');
  });

  it('USD del mes contra la meta, con lo esperado a hoy y los retainers del mes', () => {
    const s = st({
      registro: [fila({ fecha: '2026-11-20', clips: 5, views: 10000, cobrado: 30 }), fila({ fecha: '2026-12-16', clips: 5, views: 1, cobrado: 999 })],
      retainers: [{ id: 't', nombre: 'Z', estado: 'activo', usdMes: 45, desde: '2026-12-01' }],
    });
    expect(ingresoMes(s, 1)).toBe(75);
    const m = mesContraMeta(s, '2026-11-30')!;
    expect(m).toMatchObject({ n: 1, meta: 150, cobrado: 75, diasHechos: 15, diasTotal: 30 });
    expect(m.esperado).toBe(75);
    expect(m.ritmo).toBe(1);
  });

  it('proyección: con los meses cerrados al 50 % del plan, el mes 12 da USD 4.500 y faltan 5.500', () => {
    const s = st({ registro: [fila({ fecha: '2026-11-20', clips: 1, views: 1, cobrado: 75 }), fila({ fecha: '2026-12-20', clips: 1, views: 1, cobrado: 175 })] });
    const p = proyeccion(s, '2027-01-20')!;
    expect(p.ritmo).toBe(0.5);
    expect(p.mes12).toBe(4500);
    expect(p.falta).toBe(5500);
    expect(p.meses.slice(0, 3)).toEqual([75, 175, 350]);
    // Después del año (meses 13 y 14) sigue usando los dos últimos cerrados.
    expect(proyeccion(s, '2028-01-20')).toBeNull();
  });

  it('cuentas y clips por día contra el plan del mes', () => {
    const s = st({
      cuentas: [
        { id: 'c1', alias: 'gta.cortes', red: 'TikTok', nicho: 'Videojuegos', estado: 'activa', desde: '2026-11-17' },
        { id: 'c2', alias: 'pod.cortes', red: 'Reels', nicho: 'Podcasts', estado: 'calentando', desde: '2026-11-17' },
      ],
      registro: [fila({ fecha: '2026-11-16', clips: 5, views: 1 }), fila({ fecha: '2026-11-17', clips: 5, views: 1 })],
    });
    expect(planContraReal(s, '2026-11-17')).toEqual({ cuentas: 1, cuentasPlan: 3, clipsDia: 5, clipsDiaPlan: 5 });
  });

  it('USD por hora con las horas del bloque de clipping; distribución de views y semanas', () => {
    const day = (date: string, min: number) => ({ date, focus: [{ key: 'clipping', plan: '', focusMin: min, at: '' }] }) as unknown as DayLog;
    const days = { '2026-11-17': day('2026-11-17', 90), '2026-11-18': day('2026-11-18', 90) };
    const s = st({ registro: [fila({ fecha: '2026-11-17', clips: 4, views: 2000, cobrado: 6 }), fila({ fecha: '2026-11-18', clips: 2, views: 20000, cobrado: 24 })] });
    expect(usdPorHora(s, days, { desde: '2026-11-16', hasta: '2026-11-22' })).toBe(10);
    expect(distribucionViews(s.registro).map((x) => x.clips)).toEqual([0, 4, 0, 0, 2]);
    const sem = semanas(s, days, '2026-11-18', 2);
    expect(sem[1]).toMatchObject({ lunes: '2026-11-16', clips: 6, horas: 3, usdHora: 10, clipsDia: 2 });
    expect(rangoPeriodo('todo', '2026-11-18', st({ registro: [fila({ fecha: '2026-10-01' })] })).desde).toBe('2026-10-01');
  });
});

describe('ola 23 · la planilla en el estado', () => {
  beforeEach(() => { localStorage.clear(); resetState(); });

  it('un estado viejo arranca con la planilla vacía y conserva lo guardado', () => {
    const s = migrate({ days: {}, settings: null });
    expect(s.clipping).toEqual(emptyClipping());
    const s2 = migrate({ clipping: { registro: [{ id: 'x', fecha: '2026-11-19', clips: '3', views: 10 }] } });
    expect(s2.clipping.registro[0]).toMatchObject({ clips: 3, views: 10 });
    expect(s2.clipping.cuentas).toEqual([]);
    expect(migrarClipping(null)).toEqual(emptyClipping());
  });

  it('registrar acepta fechas pasadas, ordena por fecha y recuerda la última cuenta y campaña', () => {
    registrarClips({ fecha: '2026-11-20', clips: 5, views: 100, cuenta: 'c1', campana: 'k1' });
    const id = registrarClips({ fecha: '2026-11-17', clips: 3, views: 50, cobrado: undefined });
    const c = getState().clipping;
    expect(c.registro.map((f) => f.fecha)).toEqual(['2026-11-17', '2026-11-20']);
    expect('cobrado' in c.registro[0]).toBe(false);
    expect(c.ultima).toEqual({ cuenta: undefined, campana: undefined });
    const f = c.registro.find((x) => x.id === id)!;
    borrarFila(id);
    expect(getState().clipping.registro).toHaveLength(1);
    restaurarFila(f);
    expect(getState().clipping.registro).toHaveLength(2);
  });

  it('prospección y rutina por semana', () => {
    sumarProspeccion('2026-11-18', 'mensajes', 5);
    sumarProspeccion('2026-11-19', 'mensajes', -10);
    sumarProspeccion('2026-11-19', 'pruebas');
    expect(getState().clipping.prospeccion['2026-11-16']).toEqual({ mensajes: 0, pruebas: 1 });
    tildarRutina('2026-11-16', 'lunes');
    tildarRutina('2026-11-17', 'producir');
    tildarRutina('2026-11-18', 'lunes');
    expect(getState().clipping.rutina['2026-11-16']).toEqual(['producir']);
  });

  it('importar valida línea por línea y mezcla por id', () => {
    expect(validarPlanilla({ registro: [{ fecha: '19/11', clips: 2, views: 1 }, { fecha: '2026-11-19', clips: 1, views: 1, aprobados: 3 }] })).toEqual([
      'registro 1: "fecha" tiene que ser AAAA-MM-DD',
      'registro 2: hay más aprobados que clips',
    ]);
    expect(validarPlanilla({ campanas: [{ nombre: 'X', tarifa: -1, estado: 'rara' }] })).toHaveLength(2);
    registrarClips({ fecha: '2026-11-20', clips: 5, views: 100 });
    const id = getState().clipping.registro[0].id;
    importarPlanilla({ registro: [{ id, fecha: '2026-11-20', clips: 6, views: 100 }, { id: 'nuevo', fecha: '2026-11-01', clips: 1, views: 1 }] });
    const r = getState().clipping.registro;
    expect(r.map((f) => [f.fecha, f.clips])).toEqual([['2026-11-01', 1], ['2026-11-20', 6]]);
  });
});
