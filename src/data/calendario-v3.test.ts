import { describe, expect, it } from 'vitest';
import { horasDelDia, horasPorSemana } from './capacidad';
import { fecharDiarios, horasMateDelDia } from './mate-horas';
import { PLAN_EXT, calendario, calendarioHoras } from './plan-extendido';

const T0 = '2026-11-16';
const cal = (inicioTrabajo: string, o: Parameters<typeof calendario>[1] = {}) => {
  const cfg = { t0: T0, inicioTrabajo };
  return calendario(PLAN_EXT, { ...o, horas: { capacidad: (f) => horasDelDia(f, cfg) } });
};
const fechas = (c: ReturnType<typeof cal>) => Object.fromEntries(c.map((b) => [b.id, [b.inicio, b.fin]]));

const SIN_TRABAJO = '2126-10-23'; // v12.1: sin fecha de trabajo nuevo, el corte queda a 100 años

describe('v12.1 · calendario con fechas explícitas y capacidad 10/11 h', () => {
  it('horas por semana de cada rutina: 60,2 de proyecto en la del plan y 29 con trabajo (archivada)', () => {
    expect(horasPorSemana('busqueda-intensiva')).toBeCloseTo(60.17, 2);
    expect(horasPorSemana('con-trabajo')).toBe(29);
  });

  it('capacidad por día: 10 h de lunes a viernes y 11 h el fin de semana, con o sin trabajo cargado; la pausa del 20 al 26 dic 2027', () => {
    const cfg = { t0: T0, inicioTrabajo: SIN_TRABAJO };
    expect(horasDelDia('2026-11-19', cfg)).toBe(10);
    expect(horasDelDia('2026-11-21', cfg)).toBe(11); // sábado
    expect(horasDelDia('2026-12-21', cfg)).toBe(10); // 2026 no tiene pausa
    expect(horasDelDia('2027-01-04', { ...cfg, inicioTrabajo: '2027-01-04' })).toBe(10);
    expect(horasDelDia('2027-01-09', cfg)).toBe(11);
    // La pausa fija de 2027 (20 al 26 dic).
    expect(horasDelDia('2027-12-21', cfg)).toBe(0);
    expect(horasDelDia('2027-12-21', { ...cfg, pausas: false })).toBe(10);
    expect(horasDelDia('2027-12-27', cfg)).toBe(10);
    expect(horasDelDia('2028-12-21', cfg)).toBe(10); // solo 2027 tiene pausa
    // Sin horas por día (calendario viejo): la semana de arranque a 3,5 h y la rutina del plan (8,7 h de lunes a viernes y 8,4 el fin de semana).
    const viejo = { ...cfg, antesTrabajo: null, aniosPausa: undefined };
    expect(horasDelDia('2026-11-18', viejo)).toBe(3.5);
    expect(horasDelDia('2026-11-25', viejo)).toBeCloseTo(8.67, 2);
    expect(horasDelDia('2026-11-28', viejo)).toBeCloseTo(8.42, 2);
    expect(horasDelDia('2026-11-29', viejo)).toBeCloseTo(8.42, 2);
  });

  it('cada bloque cae en su fecha del plan: P0 del 16 al 18 nov, PetrIA v0 (archivada) 19–20 nov, PetrIA 193,5 h del 21 nov al 9 dic', () => {
    const c = cal(SIN_TRABAJO);
    expect(c.find((b) => b.id === 'P0')).toMatchObject({ inicio: '2026-11-16', fin: '2026-11-18', horas: 0 });
    expect(c.find((b) => b.id === 'P1V0')).toMatchObject({ inicio: '2026-11-19', fin: '2026-11-20', horas: 0 });
    expect(c.find((b) => b.id === 'P1')).toMatchObject({ inicio: '2026-11-21', fin: '2026-12-09', horas: 193.5, roadmap: { fin: '2026-12-09' } });
    // Con fechas explícitas, Trazo y el plan coinciden día por día.
    for (const b of c.filter((x) => x.roadmap)) expect(b.fin, b.id).toBe(b.roadmap!.fin);
    // El plan termina con el cierre de la etapa 4, el 27 oct 2028.
    expect(c[c.length - 1]).toMatchObject({ id: 'CIE4', fin: '2028-10-27' });
  });

  it('ventanas, certificaciones y descansos tienen sus días; la pausa fija de 2027 cae dentro de Q2 sin sumarle horas', () => {
    const c = cal(SIN_TRABAJO);
    const dias = (id: string) => { const b = c.find((x) => x.id === id)!; return (Date.parse(b.fin) - Date.parse(b.inicio)) / 864e5 + 1; };
    expect(dias('W1')).toBe(20);
    expect(c.find((b) => b.id === 'W1')).toMatchObject({ inicio: '2027-01-15', fin: '2027-02-03', horas: 206 });
    expect(dias('CW1')).toBe(4);
    expect(dias('DES3')).toBe(7);
    expect(c.find((b) => b.id === 'DES3')!.horas).toBe(0);
    expect(c.find((b) => b.id === 'PAUSA-2027')).toMatchObject({ inicio: '2027-12-20', fin: '2027-12-26', pausa: true });
    expect(c.find((b) => b.id === 'Q2')).toMatchObject({ inicio: '2027-12-13', fin: '2027-12-30', horas: 105 });
    expect(c.find((b) => b.id === 'Q2')!.pausasDentro.length).toBe(1);
    expect(c.some((b) => b.id === 'PAUSA-2026')).toBe(false);
    expect(c.some((b) => b.id === 'PAUSA-2028')).toBe(false);
  });

  it('cargar el inicio del trabajo no mueve las fechas: son las del plan', () => {
    expect(fechas(cal('2027-06-01'))).toEqual(fechas(cal(SIN_TRABAJO)));
  });

  it('un factor de calibración no corre las fechas por su cuenta (los atrasos se sugieren y se confirman)', () => {
    const cfg = { t0: T0, inicioTrabajo: SIN_TRABAJO };
    const base = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, cfg) } });
    const lento = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, cfg), factor: 1.15, cerrados: ['P0', 'P1', 'P2'] } });
    expect(lento.find((b) => b.id === 'P2')).toMatchObject({ inicio: base.find((b) => b.id === 'P2')!.inicio, horas: 100 });
    expect(lento.find((b) => b.id === 'P3')).toMatchObject({ inicio: '2027-02-19', fin: '2027-03-02' });
    expect(lento[lento.length - 1].fin).toBe(base[base.length - 1].fin);
  });

  it('con menos horas reales en los días que pasaron, el calendario no se corre solo', () => {
    const reales: Record<string, number> = {};
    for (let d = new Date('2026-11-23T12:00'); d < new Date('2026-12-05T12:00'); d.setDate(d.getDate() + 1)) reales[d.toISOString().slice(0, 10)] = 3;
    const base = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, { t0: T0, inicioTrabajo: SIN_TRABAJO }) } });
    const real = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, { t0: T0, inicioTrabajo: SIN_TRABAJO, hoy: '2026-12-05', reales }) } });
    expect(real.find((b) => b.id === 'P1')!.fin).toBe(base.find((b) => b.id === 'P1')!.fin);
  });
});

describe('matemática por horas (v12.1: sin tramos diarios; la del cierre y cero dentro de una ventana)', () => {
  const ventanas = [{ inicio: '2027-01-15', fin: '2027-02-03' }];
  const o = { inicioTrabajo: SIN_TRABAJO, ventanas };

  it('fuera de las ventanas, la rutina del plan da 15 min por día a matemática; dentro de una ventana, cero', () => {
    expect(horasMateDelDia('2026-11-25', o)).toBe(0.25);
    expect(horasMateDelDia('2027-01-20', o)).toBe(0);
    expect(horasMateDelDia('2027-02-06', o)).toBe(0.25);
  });

  it('fechar tramos diarios sigue andando (para el plan archivado): las ventanas pausan el diario', () => {
    const d = fecharDiarios([{ id: 'x', horas: 20 }], T0, '2028-07-25', o);
    expect(d[0]).toMatchObject({ id: 'x', inicio: T0 });
    const sinVentana = fecharDiarios([{ id: 'x', horas: 20 }], T0, '2028-07-25', { ...o, ventanas: [] });
    expect(sinVentana[0].fin < d[0].fin).toBe(true);
  });
});
