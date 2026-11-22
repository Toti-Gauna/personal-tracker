import { describe, expect, it } from 'vitest';
import {
  TOLERANCIA, activoAhora, aplicarCorrimientos, estadoDe, finProyectado, medir, proximaFechaLimite, recorrer, sugerirCorrimiento,
  tiempoTranscurrido, vencenHoy, type Periodo,
} from './periodos';
import { arbolPlan, claveHito } from './periodos-plan';
import { calendarioCompleto } from './plan-vistas';
import { T0_PLAN } from './plan';

const P = (id: string, inicio: string, fin: string, extra: Partial<Periodo> = {}): Periodo => ({ id, nombre: id, nivel: 'bloque', inicio, fin, ...extra });

describe('v12.1 · fechas de un período', () => {
  it('el tiempo se mide al empezar el día: 0 el primero, 1 el día después del fin', () => {
    const p = { inicio: '2026-11-21', fin: '2026-11-30' }; // 10 días
    expect(tiempoTranscurrido(p, '2026-11-20')).toBe(0);
    expect(tiempoTranscurrido(p, '2026-11-21')).toBe(0);
    expect(tiempoTranscurrido(p, '2026-11-26')).toBe(0.5);
    expect(tiempoTranscurrido(p, '2026-11-30')).toBe(0.9);
    expect(tiempoTranscurrido(p, '2026-12-01')).toBe(1);
  });

  it('cruza meses y años sin correrse un día (fechas locales, sin horario de verano)', () => {
    const p = { inicio: '2027-12-27', fin: '2028-01-05' }; // 10 días
    expect(tiempoTranscurrido(p, '2028-01-01')).toBe(0.5);
    expect(tiempoTranscurrido({ inicio: '2028-02-28', fin: '2028-03-01' }, '2028-03-01')).toBe(0.667); // 2028 es bisiesto
  });
});

describe('v12.1 · estado y progreso de un período', () => {
  const p = { inicio: '2026-12-01', fin: '2026-12-10' };
  it('próximo, en plan, adelantado, atrasado, vencido y hecho', () => {
    expect(estadoDe(0, 0, p, '2026-11-30')).toBe('proximo');
    expect(estadoDe(0.5, 0.5, p, '2026-12-06')).toBe('en-plan');
    expect(estadoDe(0.5, 0.5 - TOLERANCIA, p, '2026-12-06')).toBe('en-plan');
    expect(estadoDe(0.5, 0.35, p, '2026-12-06')).toBe('atrasado');
    expect(estadoDe(0.5, 0.65, p, '2026-12-06')).toBe('adelantado');
    expect(estadoDe(1, 0.9, p, '2026-12-11')).toBe('vencido');
    expect(estadoDe(1, 1, p, '2026-12-11')).toBe('hecho');
    // Con fecha límite, pasado el estimado está atrasado, no vencido.
    expect(estadoDe(1, 0.9, { ...p, deadline: '2026-12-20' }, '2026-12-15')).toBe('atrasado');
    expect(estadoDe(1, 0.9, { ...p, deadline: '2026-12-20' }, '2026-12-21')).toBe('vencido');
  });

  it('el trabajo del padre pondera a los hijos: lotes por horas, versiones por días', () => {
    const v = P('v1.0', '2026-11-21', '2026-11-25', {
      nivel: 'version',
      hijos: [P('a', '2026-11-21', '2026-11-22', { peso: 7, progreso: 1, horasPlan: 7 }), P('b', '2026-11-22', '2026-11-25', { peso: 3, progreso: 0, horasPlan: 3 })],
    });
    const m = medir(v, '2026-11-23');
    expect(m.trabajo).toBe(0.7);
    expect(m.horasPlan).toBe(10);
    expect(m.tiempo).toBe(0.4);
    expect(m.estado).toBe('adelantado');
    // Sin peso, por días: 5 días hechos de 15.
    const fase = medir(P('F', '2026-11-21', '2026-12-05', { hijos: [P('x', '2026-11-21', '2026-11-25', { progreso: 1 }), P('y', '2026-11-26', '2026-12-05', { progreso: 0 })] }), '2026-11-26');
    expect(fase.trabajo).toBe(0.333);
    expect(fase.estado).toBe('en-plan');
  });

  it('marcada como hecha arriba (versión publicada) manda sobre sus lotes', () => {
    const m = medir(P('v', '2026-11-21', '2026-11-25', { progreso: 1, hijos: [P('a', '2026-11-21', '2026-11-25', { progreso: 0 })] }), '2026-11-24');
    expect(m.trabajo).toBe(1);
    expect(m.estado).toBe('hecho');
  });

  it('marcas de estimado y fecha límite sobre la barra (del inicio al deadline)', () => {
    const m = medir(P('P1', '2026-11-21', '2026-11-30', { deadline: '2026-12-09' }), '2026-11-21');
    expect(m.marcas).toEqual({ hoy: 0, estimado: 0.526, deadline: 1 });
  });

  it('fin proyectado: lo que falta al ritmo planificado, desde hoy', () => {
    expect(finProyectado({ inicio: '2026-12-01', fin: '2026-12-10', trabajo: 0.5 }, '2026-12-11')).toBe('2026-12-15');
    expect(finProyectado({ inicio: '2026-12-01', fin: '2026-12-10', trabajo: 0.9 }, '2026-12-03')).toBe('2026-12-10');
    expect(finProyectado({ inicio: '2026-12-01', fin: '2026-12-10', trabajo: 1 }, '2026-12-20')).toBe('2026-12-10');
  });
});

describe('v12.1 · sugerir correr lo que sigue', () => {
  const seq = [P('A', '2027-12-01', '2027-12-10'), P('B', '2027-12-11', '2027-12-17'), P('C', '2027-12-18', '2027-12-31'), P('D', '2028-01-01', '2028-01-07')];
  const pausa = [{ inicio: '2027-12-20', fin: '2027-12-26' }];

  it('corre los siguientes lo mismo que se atrasa el bloque; C ya tenía la pausa adentro y no la cuenta dos veces', () => {
    const s = sugerirCorrimiento(seq, 'A', '2027-12-13', pausa);
    expect(s.map((x) => [x.id, x.nuevoInicio, x.nuevoFin, x.dias])).toEqual([
      ['A', '2027-12-01', '2027-12-13', 3],
      ['B', '2027-12-14', '2027-12-27', 3], // 7 días hábiles: salta la pausa del 20 al 26
      ['C', '2027-12-28', '2028-01-03', 10], // tenía 7 hábiles (18, 19 y 27 a 31)
      ['D', '2028-01-04', '2028-01-10', 3],
    ]);
  });

  it('un examen reservado (fijo) no se mueve: lo que se atrasa lo saltea', () => {
    const conExamen = [P('A', '2027-03-01', '2027-03-10'), P('X', '2027-03-11', '2027-03-12', { fija: true }), P('B', '2027-03-13', '2027-03-20')];
    const s = sugerirCorrimiento(conExamen, 'A', '2027-03-12');
    expect(s.map((x) => [x.id, x.nuevoInicio, x.nuevoFin, x.dias])).toEqual([['A', '2027-03-01', '2027-03-14', 4], ['B', '2027-03-15', '2027-03-22', 2]]);
  });

  it('se frena cuando un hueco absorbe el atraso, y no sugiere nada si no hay atraso', () => {
    const conHueco = [P('A', '2027-01-01', '2027-01-10'), P('B', '2027-01-20', '2027-01-25'), P('C', '2027-01-26', '2027-01-30')];
    expect(sugerirCorrimiento(conHueco, 'A', '2027-01-15').map((x) => x.id)).toEqual(['A']);
    expect(sugerirCorrimiento(conHueco, 'A', '2027-01-10')).toEqual([]);
  });

  it('solo cambia con lo confirmado, y nunca lo fijo', () => {
    const s = sugerirCorrimiento(seq, 'A', '2027-12-13', pausa);
    const conf = Object.fromEntries(s.filter((x) => x.id === 'B').map((x) => [x.id, { inicio: x.nuevoInicio, fin: x.nuevoFin }]));
    const r = aplicarCorrimientos([...seq, P('Z', '2027-12-20', '2027-12-26', { fija: true })], { ...conf, Z: { inicio: '2028-01-01', fin: '2028-01-07' } });
    expect(r.map((x) => `${x.id}:${x.inicio}`)).toEqual(['A:2027-12-01', 'B:2027-12-14', 'C:2027-12-18', 'D:2028-01-01', 'Z:2027-12-20']);
  });
});

describe('v12.1 · el plan como períodos', () => {
  const cal = calendarioCompleto(T0_PLAN);
  const plan = { hitos: {}, versiones: {} };

  it('4 etapas y 11 fases; P0 (sus metas de siempre) y PetrIA v0 archivado quedan fuera', () => {
    const a = arbolPlan(cal, { plan });
    expect(a.map((e) => e.nombre)).toEqual(['Etapa 1 · Núcleo', 'Etapa 2 · Ciberseguridad', 'Etapa 3 · Quant', 'Etapa 4 · Aeroespacial']);
    expect(a.flatMap((e) => e.hijos!.map((f) => f.id))).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11']);
    const ids = [...recorrer(a)].map((p) => p.id);
    expect(ids).not.toContain('P0');
    expect(ids).not.toContain('P1V0');
    expect(ids).toContain('P1:lote:1.3');
    expect(ids).toContain('CW1:claude-architect');
    expect(ids).toContain('W1:hito:1');
  });

  it('activo el 23 nov: Fase 1 › PetrIA › v1.0 › lote 1.3; con 1.1 y 1.2 hechos vence hoy el 1.3', () => {
    const hitos = { [claveHito.lote('P1', '0.0')]: { hecho: '2026-11-21' }, [claveHito.lote('P1', '0.1')]: { hecho: '2026-11-21' }, [claveHito.lote('P1', '0.2')]: { hecho: '2026-11-21' }, [claveHito.lote('P1', '1.1')]: { hecho: '2026-11-22' }, [claveHito.lote('P1', '1.2')]: { hecho: '2026-11-22' } };
    const a = arbolPlan(cal, { plan: { hitos, versiones: {} } }).map((p) => medir(p, '2026-11-23'));
    expect(activoAhora(a, '2026-11-23').map((p) => p.id)).toEqual(['etapa-1', 'F1', 'P1', 'P1:v1.0', 'P1:lote:1.3']);
    expect(vencenHoy(a, '2026-11-23').map((p) => p.id)).toContain('P1:lote:1.3');
    expect(proximaFechaLimite(a, '2026-11-23', ['version'])).toMatchObject({ periodo: { id: 'P1:v1.0' }, fecha: '2026-12-01' });
  });

  it('PetrIA: estimado al fin del bloque, fecha límite de la 3.0; publicar la 1.0 suma por días', () => {
    const a = arbolPlan(cal, { plan });
    const p1 = [...recorrer(a)].find((p) => p.id === 'P1')!;
    expect(p1).toMatchObject({ inicio: '2026-11-21', fin: '2026-12-09', deadline: '2027-01-05', horasPlan: 193.5 });
    expect(p1.hijos!.map((v) => v.id)).toEqual(['P1:v1.0', 'P1:v1.1', 'P1:v2.0', 'P1:v3.0']);
    const pub = arbolPlan(cal, { plan: { hitos: {}, versiones: { P1: { '1.0': { publicada: '2026-11-25' } } } } });
    const m = medir([...recorrer(pub)].find((p) => p.id === 'P1')!, '2026-11-26');
    const dias = p1.hijos!.map((v) => (new Date(`${v.fin}T12:00`).getTime() - new Date(`${v.inicio}T12:00`).getTime()) / 864e5 + 1);
    expect(m.trabajo).toBeCloseTo(dias[0] / dias.reduce((s, d) => s + d, 0), 3);
  });
});
