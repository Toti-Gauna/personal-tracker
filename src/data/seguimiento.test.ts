import { beforeEach, describe, expect, it } from 'vitest';
import { marcarCompra, marcarRevisionHecha, publicarVersion, registrarSpot, sumarContador, sumarProblemas, tildarRevision } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { FASES_COMPRA, ITEMS_COMPRA, alertasCompras, estadoCompras } from './compras';
import { metasSemanaGeneradas } from './metas-plan';
import { PUNTOS_REVISION, resumenSemana, revisionHecha } from './revision';

beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

describe('ola 32 · hardware, cuentas y trámites', () => {
  it('las fases del plan v12.1 con su fecha límite; lo diferido y lo opcional no cuentan', () => {
    expect(FASES_COMPRA.map((f) => [f.id, f.antes])).toEqual([['fase1', '2026-12-26'], ['apple', '2027-03-18'], ['fase2', '2027-03-18'], ['fase3', '2027-07-31'], ['fase4', '2027-09-25'], ['fase5', null], ['tramites', null]]);
    expect(ITEMS_COMPRA.find((i) => i.id === 'presion-caudal')!.diferido).toMatch(/solo con Wokwi/);
    const e = estadoCompras(getState().plan, '2026-11-21');
    expect(e.find((f) => f.id === 'fase1')).toMatchObject({ total: 4, pendientes: 4, dias: 35 });
    expect(e.find((f) => f.id === 'fase3')).toMatchObject({ total: 1 }); // la impresora 3D es opcional
  });

  it('avisa los trámites desde ya y cada fase 30 días antes (y vencida después); marcar lo saca', () => {
    expect(alertasCompras(getState().plan, '2026-11-21').map((a) => a.titulo)).toEqual(['Trámites: 3 sin hacer']);
    const dic = alertasCompras(getState().plan, '2026-11-26');
    // La fase 1 (26 dic) avisa desde el 26 nov; el Apple Developer Program (18 mar) recién desde el 16 feb.
    expect(dic.map((a) => a.titulo)).toEqual(['Fase 1: antes del 26 dic 2026', 'Trámites: 3 sin hacer']);
    expect(alertasCompras(getState().plan, '2027-02-15').map((a) => a.titulo)).not.toContain('Apple Developer Program: antes del 18 mar 2027');
    expect(alertasCompras(getState().plan, '2027-02-16').map((a) => a.titulo)).toContain('Apple Developer Program: antes del 18 mar 2027');
    expect(dic[0].texto).toBe('Para VitalIA 3.0 y AgrIA. Falta: Kit ESP32 con 37 sensores, ESP32 extra, MAX30102 y 1 más.');
    expect(alertasCompras(getState().plan, '2026-12-27')[0].titulo).toBe('Fase 1: venció el 26 dic 2026');
    for (const id of ['whatsapp-business', 'ses-produccion', 'spf-dkim-dmarc']) marcarCompra(id, { fecha: '2026-11-21' });
    expect(alertasCompras(getState().plan, '2026-11-21')).toEqual([]);
    marcarCompra('ses-produccion', null);
    expect(alertasCompras(getState().plan, '2026-11-21').map((a) => a.titulo)).toEqual(['Trámites: 1 sin hacer']);
  });
});

describe('ola 32 · revisión semanal y contadores', () => {
  it('la semana en números: horas, publicaciones y simuladas contra su meta, versiones, spots y problemas', () => {
    sumarContador('2026-11-18', 'posts', 2);
    sumarContador('2026-11-21', 'simulada', 1);
    publicarVersion('P1', '1.0', '2026-11-20');
    registrarSpot('hash-maps', { fecha: '2026-11-19', proyecto: 'P1' });
    sumarProblemas('2026-11-19', 3);
    const p = getState();
    const r = resumenSemana('2026-11-16', '2026-11-22', { plan: p.plan, days: p.days, t0: '2026-11-16', inicioTrabajo: '2027-01-04', intensiva: true });
    expect(r.contadores).toEqual([
      { id: 'posts', nombre: 'Publicaciones', v: 2, meta: 2, total: 2 },
      { id: 'simulada', nombre: 'Entrevistas simuladas', v: 1, meta: 1, total: 1 },
    ]);
    expect(r.versiones).toEqual([{ proyecto: 'P1', version: '1.0', fecha: '2026-11-20' }]);
    expect(r.spots).toEqual([{ tema: 'hash-maps', fecha: '2026-11-19' }]);
    expect(r.problemas).toBe(3);
    // Planificadas: la capacidad del plan v12.1, 10 h entre semana y 11 el finde (5 × 10 + 2 × 11).
    expect(r.horas.prog).toEqual({ real: 0, plan: 72 });
  });

  it('con trabajo, la semana trae las cadencias de la v5: 2 publicaciones y 1 entrevista simulada', () => {
    const m = metasSemanaGeneradas('2027-02-01', '2026-11-16');
    expect(m.find((x) => x.clave === 'posts')).toMatchObject({ texto: 'Publicaciones', meta: 2 });
    expect(m.find((x) => x.clave === 'simulada')).toMatchObject({ meta: 1 });
  });

  it('los cinco puntos del roadmap; hecha la revisión, el domingo no avisa', () => {
    expect(PUNTOS_REVISION).toHaveLength(5);
    tildarRevision('2026-11-16', 0);
    tildarRevision('2026-11-16', 3);
    tildarRevision('2026-11-16', 0);
    expect(getState().plan.revisionesSemanales!['2026-11-16'].checks).toEqual([3]);
    expect(revisionHecha(getState().plan, '2026-11-22')).toBe(false);
    marcarRevisionHecha('2026-11-16', '2026-11-22');
    expect(revisionHecha(getState().plan, '2026-11-22')).toBe(true);
    expect(revisionHecha(getState().plan, '2026-11-29')).toBe(false);
    startDay('completo', '04:00', '2026-11-22');
  });
});
