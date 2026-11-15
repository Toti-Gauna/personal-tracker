import { beforeEach, describe, expect, it } from 'vitest';
import { activarIntensiva, desactivarIntensiva, retomar, sumarHandyx } from '../state/plan';
import { getState, planSettings, register, resetState, startDay } from '../state/store';
import { diasEnPausa } from './busqueda';
import { enPausa } from './plan-state';
import { metasOf, planRoutine, routineFor } from './routines';

describe('búsqueda intensiva', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', '2026-11-16');
  });

  it('arranca activa: rutinas del modo y Handyx y ventas en pausa desde T0', () => {
    const cfg = planSettings(getState().settings);
    expect(cfg.modo).toBe('busqueda-intensiva');
    expect(routineFor('2026-11-16', cfg)).toBe('busqueda-intensiva');
    expect(enPausa(getState().plan, 'handyx', '2026-11-20')).toBe(true);
    expect(enPausa(getState().plan, 'ventas', '2026-11-20')).toBe(true);
  });

  it('las dos rutinas: 10 metas de lunes a viernes y 8 el finde, con las horas de la tabla', () => {
    // Las 10 de la tabla, más la rutina de la mañana (04:00) y dormir a las 21:00.
    expect(metasOf('busqueda-intensiva').map((b) => b.start)).toEqual(['04:00', '04:30', '06:30', '08:30', '10:00', '12:00', '13:30', '15:00', '16:30', '18:00', '20:00', '21:00']);
    expect(metasOf('busqueda-intensiva-finde')).toHaveLength(10);
    const horas = (rama: string) => {
      const m = (t: 'busqueda-intensiva' | 'busqueda-intensiva-finde') => planRoutine(t, 'completo').filter((p) => p.block.rama === rama || (rama === 'clipping' && p.block.id === 'clipping')).reduce((s, p) => s + p.min, 0);
      return (m('busqueda-intensiva') * 5 + m('busqueda-intensiva-finde') * 2) / 60;
    };
    expect(horas('matematica')).toBe(14);
    expect(horas('programacion')).toBe(25.5);
    expect(horas('ingles')).toBe(11.5);
    expect(horas('trabajo')).toBe(10.5);
    expect(horas('clipping')).toBe(10.5);
  });

  it('el día corto y "Otra hora" recorren solo la mañana (rutina, matemática y programación)', () => {
    const p = planRoutine('busqueda-intensiva', 'corto');
    expect(p.slice(0, 4).map((x) => [x.start, x.min])).toEqual([['05:00', 20], ['05:20', 100], ['07:00', 90], ['08:30', 90]]);
    expect(p[4].start).toBe('10:00');
  });

  it('el sábado Hoy arma la rutina de fin de semana', () => {
    startDay('completo', '04:30', '2026-11-21');
    const d = getState().days['2026-11-21'];
    expect(d.dayType).toBe('busqueda-intensiva-finde');
    expect(d.blocks.map((b) => b.key)).toEqual(['rutina', 'math', 'prog', 'abi', 'caso', 'ingles', 'busqueda', 'clipping', 'cierre', 'sueno']);
  });

  it('con una entrevista a 3 días, inglés pasa a simulacro de esa entrevista', () => {
    getState().plan.entrevistas.push({ id: 'e1', fecha: '2026-11-19', rol: 'AI Engineer', empresa: 'Acme', prep: {} });
    startDay('completo', '04:30', '2026-11-17');
    const ing = getState().days['2026-11-17'].blocks.find((b) => b.key === 'ingles')!;
    expect(ing.title).toBe('Inglés · simulacro de AI Engineer en Acme');
    expect(getState().days['2026-11-17'].blocks.find((b) => b.key === 'busqueda')!.min).toBe(90);
  });

  it('desactivar vuelve exactamente a la rutina anterior y no borra nada de Handyx', () => {
    sumarHandyx('2026-11-17', { operaciones: 3, horas: 2 });
    const handyx = structuredClone(getState().plan.handyx);
    desactivarIntensiva('2026-11-30');
    const cfg = planSettings(getState().settings);
    expect(cfg).toMatchObject({ modo: null, rutina: 'busqueda', diaLibre: 2 });
    expect(cfg.previo).toBeUndefined();
    expect(routineFor('2026-12-01', cfg)).toBe('libre');
    expect(routineFor('2026-12-02', cfg)).toBe('weekday');
    expect(getState().plan.handyx).toEqual(handyx);
    expect(getState().plan.pausas.every((p) => p.hasta === '2026-11-30')).toBe(true);
    expect(diasEnPausa(getState().plan, 'handyx', '2027-01-01')).toBe(14);
    // Volver a activarlo guarda otra vez el martes y abre pausas nuevas sin tocar las viejas.
    activarIntensiva('2026-12-10');
    expect(planSettings(getState().settings).previo).toEqual({ rutina: 'busqueda', diaLibre: 2 });
    expect(getState().plan.pausas).toHaveLength(4);
  });

  it('retomar Handyx cierra solo su pausa y vuelve a la rutina anterior; ventas sigue en pausa', () => {
    retomar('handyx', '2026-12-20');
    expect(enPausa(getState().plan, 'handyx', '2026-12-21')).toBe(false);
    expect(enPausa(getState().plan, 'ventas', '2026-12-21')).toBe(true);
    expect(routineFor('2026-12-22', planSettings(getState().settings))).toBe('libre');
    expect(routineFor('2026-12-23', planSettings(getState().settings))).toBe('weekday');
    expect(getState().plan.pausas.find((p) => p.objetivo === 'handyx')!.guardado).toEqual({ handyx: {} });
  });
});

describe('pausas en metas, cortes y avisos', () => {
  const pausa = { pausas: [{ id: 'p', objetivo: 'handyx', desde: '2026-11-16', motivo: 'búsqueda intensiva', guardado: {} }] };

  it('la semana de la intensiva no genera metas de Handyx y suma clipping', async () => {
    const { metasSemanaGeneradas, metasMesGeneradas } = await import('./metas-plan');
    const s = metasSemanaGeneradas('2026-11-23', '2026-11-16', { intensiva: true, pausa });
    expect(s.some((m) => m.rama === 'handyx')).toBe(false);
    expect(s.find((m) => m.clave === 'horas-prog')?.meta).toBe(25.5);
    expect(s.find((m) => m.clave === 'horas-clipping')?.meta).toBe(10.5);
    const normal = metasSemanaGeneradas('2026-11-23', '2026-11-16');
    expect(normal.some((m) => m.rama === 'handyx')).toBe(true);
    const ene = metasMesGeneradas('2027-02-01', '2026-11-16', undefined, { intensiva: true, pausa });
    expect(ene.some((m) => m.rama === 'handyx')).toBe(false);
  });

  it('los cortes de Handyx se corren lo que dura la pausa y guardan la fecha original', async () => {
    const { cortesCorridos } = await import('./busqueda');
    const c = cortesCorridos([{ id: 'lanzar', fin: '2027-02-14' }], pausa, '2026-12-14');
    expect(c[0]).toMatchObject({ original: '2027-02-14', fecha: '2027-03-14', corrido: 28 });
    const cerrada = { pausas: [{ ...pausa.pausas[0], hasta: '2026-12-14' }] };
    expect(cortesCorridos([{ id: 'lanzar', fin: '2027-02-14' }], cerrada, '2027-06-01')[0].fecha).toBe('2027-03-14');
  });

  it('si el foco se pasa de hora, Hoy avisa y el siguiente se acorta', async () => {
    const { avisoPasado } = await import('./avisos');
    const day = { date: '2026-11-17', wake: '04:30', routine: 'completo' as const, notes: [], focus: [], blocks: [
      { key: 'math', n: 1, title: 'Matemática', short: 'm', area: 'ing' as const, kind: 'estudio' as const, start: '04:30', min: 120, fixed: false, rama: 'matematica' as const, tasks: [] },
      { key: 'prog', n: 2, title: 'Programación', short: 'p', area: 'ing' as const, kind: 'pomodoro' as const, start: '06:30', min: 120, fixed: false, rama: 'programacion' as const, tasks: [] },
    ] };
    expect(avisoPasado(day, 'math', 6 * 60 + 20)).toBeNull();
    const a = avisoPasado(day, 'math', 6 * 60 + 50)!;
    expect(a.titulo).toBe('Matemática se pasó 20 min');
    expect(a.texto).toBe('Programación se acorta a 100 min; el resto del día no se corre.');
  });
});

describe('sprint e impacto', () => {
  it('el sprint dura 14 días y se renueva si no hay oferta', async () => {
    const { sprintActual } = await import('./sprint');
    const p = { pausas: [{ id: 'p', objetivo: 'handyx', desde: '2026-11-16', motivo: 'búsqueda intensiva', guardado: {} }] };
    expect(sprintActual('2026-11-18', p)).toMatchObject({ numero: 1, desde: '2026-11-16', hasta: '2026-11-29', dia: 3 });
    expect(sprintActual('2026-11-30', p)).toMatchObject({ numero: 2, desde: '2026-11-30', dia: 1 });
  });

  it('horas por semana de la intensiva y el lanzamiento de Handyx según cuándo entre el trabajo', async () => {
    const { horasSemana, escenariosHandyx } = await import('./sprint');
    expect(horasSemana('busqueda-intensiva', 'busqueda-intensiva-finde')).toMatchObject({ Programación: 25.5, Matemática: 14, Inglés: 11.5, Búsqueda: 10.5, Clipping: 10.5, Entrenamiento: 10, Handyx: 0 });
    expect(escenariosHandyx('2026-11-16', '2026-11-16').map((e) => e.lanza)).toEqual(['2027-03-14', '2027-04-11', '2027-05-09']);
  });
});
