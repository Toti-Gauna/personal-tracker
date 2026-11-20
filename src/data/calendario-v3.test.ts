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

describe('ola 27 y 29 · calendario por horas (roadmap v7)', () => {
  it('horas por semana de cada rutina: 53 en el modo intensivo y 29 con trabajo', () => {
    expect(horasPorSemana('busqueda-intensiva')).toBe(53);
    expect(horasPorSemana('con-trabajo')).toBe(29);
  });

  it('capacidad por día (v7): 8 h antes del trabajo nuevo, 3 y 7 con trabajo; sin pausa en 2026 y con pausa de 2027 a 2030', () => {
    const cfg = { t0: T0, inicioTrabajo: '2027-01-04' };
    expect(horasDelDia('2026-11-19', cfg)).toBe(8); // jueves de la primera semana: ya no hay caso especial
    expect(horasDelDia('2026-11-28', cfg)).toBe(8); // sábado
    expect(horasDelDia('2026-12-21', cfg)).toBe(8); // 2026 no tiene pausa
    expect(horasDelDia('2027-01-04', cfg)).toBe(3);
    expect(horasDelDia('2027-01-09', cfg)).toBe(7);
    // La pausa de 2027 cae en la semana del 20 de diciembre.
    expect(horasDelDia('2027-12-21', cfg)).toBe(0);
    expect(horasDelDia('2027-12-21', { ...cfg, pausas: false })).toBe(3);
    expect(horasDelDia('2031-12-23', cfg)).toBe(3); // 2031 tampoco
    // Sin horas por día (calendario viejo): la semana de arranque a 3,5 h y el modo intensivo a 7 y 9.
    const viejo = { ...cfg, antesTrabajo: null, aniosPausa: undefined };
    expect(horasDelDia('2026-11-18', viejo)).toBe(3.5);
    expect(horasDelDia('2026-11-25', viejo)).toBe(7);
    expect(horasDelDia('2026-11-28', viejo)).toBe(9);
  });

  it('roadmap v7: PetrIA (304 h) a 8 h por día termina el 26 dic, 10 días antes del 5 ene que estima el roadmap', () => {
    const c = cal('2027-01-04');
    expect(c.find((b) => b.id === 'P0')).toMatchObject({ inicio: '2026-11-16', fin: '2026-11-18', horas: 0 });
    expect(c.find((b) => b.id === 'P1')).toMatchObject({ inicio: '2026-11-19', fin: '2026-12-26', horas: 304, roadmap: { fin: '2027-01-05' } });
    // Cada bloque cae cerca de su fecha del roadmap: a lo sumo 10 días antes o después.
    for (const b of c.filter((x) => x.roadmap)) expect(Math.abs(Date.parse(b.fin) - Date.parse(b.roadmap!.fin)) / 864e5, b.id).toBeLessThanOrEqual(10);
    // El plan termina el 4 jun 2031: 8 días después del 27 may del roadmap (las fechas de la etapa 4 suponen algo más de 29 h por semana).
    expect(c[c.length - 1]).toMatchObject({ id: 'CIE4', fin: '2031-06-04' });
  });

  it('ventanas a 43 h por semana; certificaciones, descansos y cierres son días fijos y la pausa adentro los alarga', () => {
    const c = cal('2027-01-04');
    const dias = (id: string) => { const b = c.find((x) => x.id === id)!; return (Date.parse(b.fin) - Date.parse(b.inicio)) / 864e5 + 1; };
    expect(dias('W1')).toBe(20); // 122 h / (43/7)
    expect(dias('C8')).toBe(7);
    expect(dias('DES3')).toBe(7);
    expect(c.find((b) => b.id === 'C8')!.horas).toBe(0);
    // AWS Security Specialty: 18 días más la pausa de 2029, como en el roadmap (14 dic – 7 ene).
    expect(c.find((b) => b.id === 'C7')).toMatchObject({ inicio: '2029-12-14', fin: '2030-01-07' });
    expect(c.find((b) => b.id === 'PAUSA-2029')).toMatchObject({ inicio: '2029-12-24', fin: '2029-12-30', pausa: true });
    // La pausa de 2027 parte AgrIA Sat sin sumarle horas.
    expect(c.find((b) => b.id === 'P7')!.pausasDentro.length).toBe(1);
    expect(c.some((b) => b.id === 'PAUSA-2026')).toBe(false);
  });

  it('cargar el inicio del trabajo recalcula todo: más tarde, termina antes (más horas por semana)', () => {
    const tarde = fechas(cal('2027-06-01')).CIE2[1];
    const defecto = fechas(cal('2027-01-11')).CIE2[1];
    const temprano = fechas(cal('2026-12-01')).CIE2[1];
    expect(tarde < defecto && defecto < temprano).toBe(true);
  });

  it('un factor de calibración estira las horas de lo que no cerró; lo cerrado queda igual', () => {
    const cfg = { t0: T0, inicioTrabajo: '2027-01-04' };
    const base = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, cfg) } });
    const lento = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, cfg), factor: 1.15, cerrados: ['P0', 'P1', 'P2'] } });
    expect(lento.find((b) => b.id === 'P2')).toMatchObject({ inicio: base.find((b) => b.id === 'P2')!.inicio, horas: 155 });
    expect(lento.find((b) => b.id === 'P3')!.horas).toBe(207);
    expect(lento[lento.length - 1].fin > base[base.length - 1].fin).toBe(true);
  });

  it('con las horas reales de los días que pasaron el calendario se recalcula: si hiciste menos, se corre', () => {
    const cfg = { t0: T0, inicioTrabajo: '2027-01-04', hoy: '2026-12-05', reales: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-11-${String(23 + i > 30 ? 0 : 23 + i).padStart(2, '0')}`, 3])) };
    const reales: Record<string, number> = {};
    for (let d = new Date('2026-11-23T12:00'); d < new Date('2026-12-05T12:00'); d.setDate(d.getDate() + 1)) reales[d.toISOString().slice(0, 10)] = 3;
    const base = calendarioHoras(PLAN_EXT, { horas: { capacidad: (d) => horasDelDia(d, { t0: T0, inicioTrabajo: '2027-01-04' }) } });
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
