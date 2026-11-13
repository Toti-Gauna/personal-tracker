import { describe, expect, it } from 'vitest';
import raw from '../../data/routines.json';
import { blockDone, mejoraDia, valorMeta } from './mejora';
import { DAY_ROUTINES, dateKeyIn, dayTypeOf, metasOf, planRoutine, routineErrors, validateRoutines, wakeRange } from './routines';
import { buildBlocks, planDay } from './schedule';
import { toMin } from './time';

// Semana del 9 al 15 de noviembre de 2026: lunes a domingo.
const VIERNES = '2026-11-13';
const SABADO = '2026-11-14';
const DOMINGO = '2026-11-15';

const horario = (p: ReturnType<typeof planRoutine>) => Object.fromEntries(p.map((x) => [x.block.id, `${x.start}+${x.min}`]));

describe('data/routines.json', () => {
  it('es válido y tiene una rutina para cada día de la semana', () => {
    expect(routineErrors(raw)).toEqual([]);
    expect(DAY_ROUTINES.weekday.days).toEqual([1, 2, 3, 4, 5]);
    expect(DAY_ROUTINES.weekend.days).toEqual([6, 7]);
  });

  it('cada bloque lleva id, label, start, end, area, kind y focus', () => {
    for (const t of ['weekday', 'weekend'] as const) {
      for (const b of DAY_ROUTINES[t].blocks) {
        expect(Object.keys(b)).toEqual(expect.arrayContaining(['id', 'label', 'start', 'end', 'area', 'kind', 'focus']));
      }
    }
  });

  it('rechaza un JSON roto: superposición, área desconocida, hora mal escrita y días sin rutina', () => {
    const malo = structuredClone(raw) as typeof raw;
    malo.dayRoutines.weekday.blocks[2].start = '06:00';
    (malo.dayRoutines.weekday.blocks[3] as { area: string }).area = 'pileta';
    malo.dayRoutines.weekend.blocks[1].end = '8:30';
    malo.dayRoutines.weekend.days = [6];
    const e = routineErrors(malo);
    expect(e).toEqual(expect.arrayContaining([
      'weekday.prog: se superpone con math',
      'weekday.abi: área "pileta" desconocida',
      'weekend.math: start y end tienen que ser HH:MM',
      'el día 7 no tiene rutina',
    ]));
    expect(() => validateRoutines(malo)).toThrow(/no es válido/);
  });
});

describe('qué rutina toca', () => {
  it('lunes a viernes, la de la semana; sábado y domingo, la del fin de semana', () => {
    expect(dayTypeOf(VIERNES)).toBe('weekday');
    expect(dayTypeOf(SABADO)).toBe('weekend');
    expect(dayTypeOf(DOMINGO)).toBe('weekend');
    expect(dayTypeOf('2026-11-09')).toBe('weekday'); // lunes
  });

  it('con la fecha inyectada, el día se cuenta en la hora de Buenos Aires', () => {
    // 02:30 UTC del sábado son las 23:30 del viernes en Buenos Aires (UTC−3).
    const k = dateKeyIn(new Date('2026-11-14T02:30:00Z'));
    expect(k).toBe(VIERNES);
    expect(dayTypeOf(k)).toBe('weekday');
    // 04:00 de Buenos Aires del sábado: ya es fin de semana.
    expect(dayTypeOf(dateKeyIn(new Date('2026-11-14T07:00:00Z')))).toBe('weekend');
    expect(dayTypeOf(dateKeyIn(new Date('2026-11-15T12:00:00Z')))).toBe('weekend');
  });

  it('el viernes arma 8 metas y el sábado y el domingo, 5, numeradas desde 1', () => {
    const viernes = buildBlocks(planDay(VIERNES, 'completo'));
    expect(viernes.map((b) => b.title)).toEqual(['Matemática', 'Programación', 'Correr y acompañar a Abi', 'Trabajo', 'Búsqueda laboral', 'Handyx', 'Eclipse', 'Entrenamiento']);
    for (const d of [SABADO, DOMINGO]) {
      const finde = buildBlocks(planDay(d, 'completo'));
      expect(finde.map((b) => [b.n, b.title, b.start])).toEqual([
        [1, 'Matemática', '04:30'], [2, 'Correr y acompañar a Abi', '08:30'], [3, 'Programación', '10:00'], [4, 'Handyx', '12:00'], [5, 'Programación', '17:00'],
      ]);
    }
  });

  it('en el finde no hay Eclipse, búsqueda laboral, trabajo ni entrenamiento', () => {
    const ids = metasOf('weekend').map((b) => b.id);
    for (const no of ['eclipse', 'busqueda', 'trabajo', 'entreno']) expect(ids).not.toContain(no);
  });
});

describe('el 1 % del día, en partes iguales entre las metas', () => {
  it('8 metas valen 0,125 % cada una y 5 metas, 0,2 %', () => {
    const viernes = { blocks: buildBlocks(planDay(VIERNES, 'completo')) };
    const sabado = { blocks: buildBlocks(planDay(SABADO, 'completo')) };
    expect(valorMeta(viernes)).toBe(0.125);
    expect(valorMeta(sabado)).toBe(0.2);
  });

  it('cumplir todas da 1 %; cumplir una, su parte', () => {
    const hecha = (b: ReturnType<typeof buildBlocks>[number]) => ({ ...b, tasks: b.tasks.map((t) => ({ ...t, done: true })) });
    const sabado = buildBlocks(planDay(SABADO, 'completo'));
    expect(mejoraDia({ blocks: sabado.map(hecha) })).toBe(1);
    expect(mejoraDia({ blocks: [hecha(sabado[0]), ...sabado.slice(1)] })).toBe(0.2);
    const viernes = buildBlocks(planDay(VIERNES, 'completo'));
    expect(mejoraDia({ blocks: [hecha(viernes[0]), ...viernes.slice(1)] })).toBe(0.125);
    expect(blockDone(hecha(viernes[0]))).toBe(true);
  });
});

describe('04:00, 05:00 y otra hora', () => {
  it('04:00 arma el día completo con los horarios del JSON', () => {
    expect(horario(planRoutine('weekday', 'completo'))).toMatchObject({ despertar: '04:00+30', math: '04:30+120', prog: '06:30+120', abi: '08:30+90' });
    expect(horario(planRoutine('weekend', 'completo'))).toMatchObject({ math: '04:30+240', abi: '08:30+90' });
  });

  it('05:00 acorta las metas flexibles de la mañana para llegar justo al primer fijo', () => {
    expect(horario(planRoutine('weekday', 'corto'))).toMatchObject({ despertar: '05:00+30', math: '05:30+90', prog: '07:00+90', abi: '08:30+90' });
    expect(horario(planRoutine('weekend', 'corto'))).toMatchObject({ despertar: '05:00+30', math: '05:30+180', abi: '08:30+90' });
  });

  it('"Otra hora" corre los bloques y acorta los flexibles; nunca menos de 15 min', () => {
    expect(horario(planRoutine('weekday', 'otra', '04:40'))).toMatchObject({ despertar: '04:40+30', math: '05:10+100', prog: '06:50+100', abi: '08:30+90' });
    for (const t of ['weekday', 'weekend'] as const) {
      const { min, max } = wakeRange(t);
      for (let w = toMin('04:00'); w <= max; w += 10) {
        const p = planRoutine(t, 'otra', `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`);
        const abi = p.find((x) => x.block.id === 'abi')!;
        const antes = p.slice(0, p.indexOf(abi));
        expect(toMin(antes[0].start)).toBe(w);
        expect(toMin(antes.at(-1)!.start) + antes.at(-1)!.min).toBe(toMin('08:30'));
        for (const x of antes) expect(x.min).toBeGreaterThanOrEqual(15);
      }
      expect(min).toBe(toMin('03:00'));
    }
  });

  it('los bloques fijos y lo que viene después del primero no se mueven en ningún modo', () => {
    for (const t of ['weekday', 'weekend'] as const) {
      const base = planRoutine(t, 'completo');
      const tarde = base.slice(base.findIndex((x) => x.block.kind === 'fixed'));
      for (const p of [planRoutine(t, 'corto'), planRoutine(t, 'otra', '06:00')]) {
        const resto = p.slice(p.findIndex((x) => x.block.kind === 'fixed'));
        expect(horario(resto)).toEqual(horario(tarde));
      }
      for (const b of DAY_ROUTINES[t].blocks.filter((x) => x.kind === 'fixed')) {
        expect(planRoutine(t, 'corto').find((x) => x.block.id === b.id)!.start).toBe(b.start);
      }
    }
  });
});
