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

  it('las tres rutinas del modo intensivo (v12.1): lunes a viernes, sábado y domingo, con el cierre de 15:45 (13:30 el fin de semana)', () => {
    expect(metasOf('busqueda-intensiva').map((b) => b.start)).toEqual(['04:00', '04:30', '08:30', '10:00', '12:00', '15:45', '16:40', '16:55', '17:15', '17:30', '17:45', '18:00', '20:00', '21:00']);
    expect(metasOf('busqueda-intensiva-finde').map((b) => b.id)).toEqual(['rutina', 'prog', 'abi', 'prog-2', 'prog-review', 'ingles', 'recall', 'anki', 'busqueda', 'leer', 'demo', 'cierre', 'sueno']);
    expect(metasOf('busqueda-intensiva-domingo').map((b) => b.id)).toEqual(['rutina', 'prog', 'abi', 'prog-2', 'prog-review', 'ingles', 'recall', 'anki', 'busqueda', 'leer', 'revision', 'cierre', 'sueno']);
    const horas = (rama: string) => {
      const m = (t: 'busqueda-intensiva' | 'busqueda-intensiva-finde' | 'busqueda-intensiva-domingo') => planRoutine(t, 'completo').filter((p) => p.block.rama === rama || (rama === 'clipping' && p.block.id === 'clipping')).reduce((s, p) => s + p.min, 0);
      return (m('busqueda-intensiva') * 5 + m('busqueda-intensiva-finde') + m('busqueda-intensiva-domingo')) / 60;
    };
    // v12.1: la matemática diaria (m1–m4) está archivada; queda Anki 15 min por día (las ventanas W1–W4 van por el calendario).
    expect(horas('matematica')).toBe(1.75);
    // Bloque 1 (4 h) + bloque 2 (3:45) + PR review (55 min) de lunes a viernes; 4 h + 3:30 + 55 min el fin de semana.
    expect(horas('programacion')).toBeCloseTo(60.17, 2);
    expect(horas('ingles')).toBe(1.75);
    // Posts / applications (15 min por día) y la demo + simulada del sábado (1:15).
    expect(horas('trabajo')).toBe(3);
    // Clipping en pausa: la rutina del modo intensivo no tiene su bloque.
    expect(horas('clipping')).toBe(0);
  });

  it('el día corto y "Otra hora" recorren solo la mañana (rutina, matemática y programación)', () => {
    const p = planRoutine('busqueda-intensiva', 'corto');
    expect(p.slice(0, 4).map((x) => [x.start, x.min])).toEqual([['05:00', 20], ['05:20', 190], ['08:30', 90], ['10:00', 120]]);
    expect(p[4].start).toBe('12:00');
  });

  it('el sábado y el domingo Hoy arma la rutina de cada día (v12.1: demo el sábado, revisión el domingo)', () => {
    startDay('completo', '04:30', '2026-11-21');
    const d = getState().days['2026-11-21'];
    expect(d.dayType).toBe('busqueda-intensiva-finde');
    expect(d.blocks.map((b) => b.key)).toEqual(['rutina', 'prog', 'abi', 'prog-2', 'prog-review', 'ingles', 'recall', 'anki', 'busqueda', 'leer', 'demo', 'cierre', 'sueno']);
    expect(d.blocks.find((b) => b.key === 'demo')!.title).toBe('Weekly demo + mock interview');
    startDay('completo', '04:30', '2026-11-22');
    const dom = getState().days['2026-11-22'];
    expect(dom.dayType).toBe('busqueda-intensiva-domingo');
    expect(dom.blocks.map((b) => b.key)).toEqual(['rutina', 'prog', 'abi', 'prog-2', 'prog-review', 'ingles', 'recall', 'anki', 'busqueda', 'leer', 'revision', 'cierre', 'sueno']);
    expect(dom.blocks.find((b) => b.key === 'prog-2')!.title).toBe('Bloque 2 · deep focus');
    expect(dom.blocks.find((b) => b.key === 'revision')!.title).toBe('Weekly review');
  });

  it('el día anterior a una entrevista, la búsqueda suma practicarla (y en inglés); sin modo propio', () => {
    getState().plan.entrevistas.push({ id: 'e1', fecha: '2026-11-19', rol: 'AI Engineer', empresa: 'Acme', modalidad: 'remoto · entrevista técnica en inglés', prep: {} });
    startDay('completo', '04:30', '2026-11-18');
    const b = getState().days['2026-11-18'].blocks;
    expect(b.find((x) => x.key === 'ingles')!.title).not.toMatch(/simulacro/);
    expect(b.some((x) => x.key === 'ingles-entrevista')).toBe(false);
    const busq = b.find((x) => x.key === 'busqueda')!;
    expect(busq.min).toBe(15);
    expect(busq.tasks.map((t) => t.t).slice(0, 2)).toEqual(['Practicar la entrevista de mañana de AI Engineer en Acme con el pitch armado', 'Practicarla en inglés']);
    // Con la entrevista en 48 h, el último bloque de programación pasa a preparación.
    expect(b.find((x) => x.key === 'prog-tarde')!.title).toMatch(/Preparación de la entrevista/);
    expect(b.find((x) => x.key === 'prog')!.title).not.toMatch(/Preparación/);
    // Con 3 días de anticipación todavía no se practica: es solo el aviso.
    startDay('completo', '04:30', '2026-11-17');
    expect(getState().days['2026-11-17'].blocks.find((x) => x.key === 'busqueda')!.tasks.some((t) => /Practicar la entrevista/.test(t.t))).toBe(false);
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

  it('la semana del modo intensivo no genera metas de Handyx ni de clipping (pausado) y suma los clips al reactivarlo', async () => {
    const { metasSemanaGeneradas, metasMesGeneradas } = await import('./metas-plan');
    const s = metasSemanaGeneradas('2026-11-23', '2026-11-16', { intensiva: true, pausa });
    expect(s.some((m) => m.rama === 'handyx')).toBe(false);
    // v12.1: las horas de la semana salen de la rutina con el bloque activo: de las 72 (10 h × 5 + 11 × 2), 59 son de PetrIA;
    // el resto es inglés, búsqueda, Anki y recall, cada uno con su meta.
    expect(s.find((m) => m.clave === 'horas-prog')).toMatchObject({ meta: 59, texto: 'Horas de programación', nota: 'lo que da la rutina esta semana, con el bloque activo de cada día' });
    expect(s.find((m) => m.clave === 'horas-mate')?.meta).toBe(2);
    expect(s.find((m) => m.clave === 'horas-ingles')?.meta).toBe(2);
    expect(s.find((m) => m.clave === 'postulaciones')?.meta).toBe(25);
    expect(s.find((m) => m.clave === 'horas-clipping')).toBeUndefined();
    expect(s.find((m) => m.clave === 'clips')).toBeUndefined();
    // Con un bloque asignado, el clipping vuelve: los clips de la semana salen del mes 1 del roadmap (5 por día).
    const { setClippingActivo } = await import('./clipping-activo');
    setClippingActivo(true);
    const con = metasSemanaGeneradas('2026-11-23', '2026-11-16', { intensiva: true, pausa });
    expect(con.find((m) => m.clave === 'clips')).toMatchObject({ meta: 35, nota: 'mes 1 del roadmap · 5 por día' });
    setClippingActivo(false);
    const normal = metasSemanaGeneradas('2026-11-23', '2026-11-16');
    // v12.1 (respuesta 7): Handyx está en pausa también fuera del modo intensivo.
    expect(normal.some((m) => m.rama === 'handyx')).toBe(false);
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
    expect(horasSemana('con-trabajo', 'con-trabajo-finde')).toMatchObject({ Programación: 29, Matemática: 14, Inglés: 6.5 });
    expect(horasSemana('busqueda-intensiva', 'busqueda-intensiva-finde')).toMatchObject({ Programación: 60.2, Matemática: 1.8, Inglés: 1.8, Búsqueda: 3, Clipping: 0, Entrenamiento: 10, Handyx: 0 });
    expect(escenariosHandyx('2026-11-16', '2026-11-16').map((e) => e.lanza)).toEqual(['2027-03-14', '2027-04-11', '2027-05-09']);
  });
});
