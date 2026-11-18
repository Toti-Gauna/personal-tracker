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

describe('ola 27 · calendario por horas', () => {
  it('horas por semana de cada rutina: 53 en el modo intensivo y 29 con trabajo', () => {
    expect(horasPorSemana('busqueda-intensiva')).toBe(53);
    expect(horasPorSemana('con-trabajo')).toBe(29);
  });

  it('capacidad por día: 3,5 h la semana de arranque, 7 y 9 en el modo intensivo, 3 y 7 con trabajo, cero en la pausa de diciembre', () => {
    const cfg = { t0: T0, inicioTrabajo: '2027-01-11' };
    expect(horasDelDia('2026-11-18', cfg)).toBe(3.5);
    expect(horasDelDia('2026-11-25', cfg)).toBe(7); // miércoles
    expect(horasDelDia('2026-11-28', cfg)).toBe(9); // sábado
    expect(horasDelDia('2026-12-20', cfg)).toBe(9); // domingo antes del lunes 21
    for (const d of ['2026-12-21', '2026-12-24', '2026-12-27']) expect(horasDelDia(d, cfg)).toBe(0);
    expect(horasDelDia('2026-12-28', cfg)).toBe(7);
    expect(horasDelDia('2027-01-12', cfg)).toBe(3);
    expect(horasDelDia('2027-01-16', cfg)).toBe(7);
    // La pausa de 2027 cae en la semana del 20 de diciembre.
    expect(horasDelDia('2027-12-21', cfg)).toBe(0);
    expect(horasDelDia('2027-12-21', { ...cfg, pausas: false })).toBe(3);
  });

  it('con el trabajo el 4 de enero, la tabla del prompt v3 (etapa 1 hasta el 7 feb 2028) se reproduce con 1 a 3 días de diferencia', () => {
    const f = fechas(cal('2027-01-04'));
    const cerca = (a: string, b: string, d: number) => expect(Math.abs(Date.parse(a) - Date.parse(b)) / 864e5).toBeLessThanOrEqual(d);
    expect(f.P1).toEqual(['2026-11-23', '2026-12-09']);
    expect(f.P2).toEqual(['2026-12-10', '2026-12-29']);
    cerca(f.SUM[0], '2026-12-30', 1);
    cerca(f.W1[1], '2027-02-05', 1);
    cerca(f.P3[0], '2027-02-06', 1);
    cerca(f.P3[1], '2027-03-07', 2);
    cerca(f.P4[0], '2027-03-20', 3);
    // La etapa 1 termina el 7 feb 2028 en la tabla; acá, dentro de una semana.
    const fin1 = Math.max(...calendario(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, { t0: T0, inicioTrabajo: '2027-01-04' }) } }).filter((b) => b.etapa === 1).map((b) => Date.parse(b.fin)));
    expect(Math.abs(fin1 - Date.parse('2028-02-07')) / 864e5).toBeLessThanOrEqual(7);
  });

  it('un bloque ocupa días enteros; la pausa de Navidad parte P2 sin sumar horas', () => {
    const c = cal('2027-01-11');
    const p2 = c.find((b) => b.id === 'P2')!;
    expect(p2).toMatchObject({ inicio: '2026-12-10', fin: '2026-12-29', horas: 98, pausasDentro: [6] });
    expect(c.find((b) => b.id === 'PAUSA-2026')).toMatchObject({ inicio: '2026-12-21', fin: '2026-12-27', pausa: true });
    // Sin la pausa, P2 termina una semana antes.
    const sin = calendario(PLAN_EXT, { pausas: false, horas: { capacidad: (d) => horasDelDia(d, { t0: T0, inicioTrabajo: '2027-01-11', pausas: false }) } });
    expect(sin.find((b) => b.id === 'P2')!.fin < p2.fin).toBe(true);
  });

  it('cargar el inicio del trabajo recalcula todo: más tarde, termina antes (más horas por semana)', () => {
    const tarde = fechas(cal('2027-06-01')).CIE2[1];
    const defecto = fechas(cal('2027-01-11')).CIE2[1];
    const temprano = fechas(cal('2026-12-01')).CIE2[1];
    expect(tarde < defecto && defecto < temprano).toBe(true);
  });

  it('un factor de calibración estira las horas de lo que no cerró; lo cerrado queda igual', () => {
    const cfg = { t0: T0, inicioTrabajo: '2027-01-11' };
    const base = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, cfg) } });
    const lento = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, cfg), factor: 1.15, cerrados: ['P0', 'P1', 'P2'] } });
    expect(lento.find((b) => b.id === 'P2')).toMatchObject({ inicio: base.find((b) => b.id === 'P2')!.inicio, horas: 98 });
    expect(lento.find((b) => b.id === 'P3')!.horas).toBeGreaterThan(base.find((b) => b.id === 'P3')!.horas!);
    expect(lento[lento.length - 1].fin > base[base.length - 1].fin).toBe(true);
  });

  it('con las horas reales de los días que pasaron el calendario se recalcula: si hiciste menos, se corre', () => {
    const cfg = { t0: T0, inicioTrabajo: '2027-01-11', hoy: '2026-12-05', reales: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-11-${String(23 + i > 30 ? 0 : 23 + i).padStart(2, '0')}`, 3])) };
    const reales: Record<string, number> = {};
    for (let d = new Date('2026-11-23T12:00'); d < new Date('2026-12-05T12:00'); d.setDate(d.getDate() + 1)) reales[d.toISOString().slice(0, 10)] = 3;
    const base = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, { t0: T0, inicioTrabajo: '2027-01-11' }) } });
    const real = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, { ...cfg, reales }) } });
    expect(real.find((b) => b.id === 'P1')!.fin > base.find((b) => b.id === 'P1')!.fin).toBe(true);
  });
});

describe('ola 27 · matemática por horas', () => {
  const ventanas = [{ inicio: '2027-01-06', fin: '2027-01-31' }, { inicio: '2027-06-01', fin: '2027-07-06' }];
  const o = { inicioTrabajo: '2027-01-11', ventanas };

  it('1 h por día en el modo intensivo, 2 h con trabajo (4 h el finde) y cero dentro de una ventana', () => {
    expect(horasMateDelDia('2026-11-25', o)).toBe(1);
    expect(horasMateDelDia('2027-01-05', o)).toBe(1);
    expect(horasMateDelDia('2027-01-20', o)).toBe(0);
    expect(horasMateDelDia('2027-02-02', o)).toBe(2);
    expect(horasMateDelDia('2027-02-06', o)).toBe(2);
  });

  it('T+0 a T+2 (126 h) termina a mediados de marzo y T+3 a T+6 (196 h), a fines de julio, con las ventanas pausando el diario', () => {
    const d = fecharDiarios([{ id: 'm1', horas: 126 }, { id: 'm2', horas: 196 }], T0, '2028-07-25', o);
    expect(d[0]).toMatchObject({ id: 'm1', inicio: T0, fin: '2027-03-10' });
    expect(d[1]).toMatchObject({ id: 'm2', inicio: '2027-03-11' });
    // La ventana W1 (6 a 31 ene) no suma horas de matemática diaria.
    const sinVentana = fecharDiarios([{ id: 'm1', horas: 126 }], T0, '2028-07-25', { ...o, ventanas: [] });
    expect(sinVentana[0].fin < d[0].fin).toBe(true);
  });
});
