import { describe, expect, it } from 'vitest';
import raw from '../../data/routines.json';
import { blockDone, mejoraDia, valorMeta } from './mejora';
import { DAY_ROUTINES, ajustarDia, dateKeyIn, dayTypeOf, metasOf, planRoutine, routineErrors, routineFor, validateRoutines, wakeRange } from './routines';
import { buildBlocks, planDay } from './schedule';
import { toMin } from './time';

// Semana del 9 al 15 de noviembre de 2026: lunes a domingo.
const MARTES = '2026-11-10';
const VIERNES = '2026-11-13';
const SABADO = '2026-11-14';
const DOMINGO = '2026-11-15';

const horario = (p: ReturnType<typeof planRoutine>) => Object.fromEntries(p.map((x) => [x.block.id, `${x.start}+${x.min}`]));

describe('data/routines.json', () => {
  it('es válido: lunes a viernes, fin de semana, con trabajo y día libre', () => {
    expect(routineErrors(raw)).toEqual([]);
    expect(DAY_ROUTINES.weekday.days).toEqual([1, 2, 3, 4, 5]);
    expect(DAY_ROUTINES.weekend.days).toEqual([6, 7]);
    expect(DAY_ROUTINES['con-trabajo'].reemplaza).toBe('weekday');
    expect(DAY_ROUTINES.libre.libre).toBe(true);
  });

  it('cada bloque lleva id, label, start, end, area, kind y focus; las metas, su rama (o ninguna: fuera del plan)', () => {
    for (const r of Object.values(DAY_ROUTINES)) {
      for (const b of r.blocks) expect(Object.keys(b)).toEqual(expect.arrayContaining(['id', 'label', 'start', 'end', 'area', 'kind', 'focus']));
    }
    expect(metasOf('weekday').filter((b) => !b.rama).map((b) => b.id)).toEqual(['trabajo']);
  });

  it('rechaza un JSON roto: superposición, área o rama desconocida, hora mal escrita y días sin rutina', () => {
    const malo = structuredClone(raw) as typeof raw;
    malo.dayRoutines.weekday.blocks[2].start = '06:00';
    (malo.dayRoutines.weekday.blocks[3] as { area: string }).area = 'pileta';
    (malo.dayRoutines.weekday.blocks[4] as { rama?: string }).rama = 'cocina';
    malo.dayRoutines.weekend.blocks[1].end = '8:30';
    malo.dayRoutines.weekend.days = [6];
    expect(routineErrors(malo)).toEqual(expect.arrayContaining([
      'weekday.prog: se superpone con math',
      'weekday.abi: área "pileta" desconocida',
      'weekday.trabajo: rama "cocina" desconocida',
      'weekend.math: start y end tienen que ser HH:MM',
      'el día 7 no tiene rutina',
    ]));
    expect(() => validateRoutines(malo)).toThrow(/no es válido/);
  });
});

describe('qué rutina toca', () => {
  it('lunes a viernes, la de búsqueda; sábado y domingo, la del finde; el martes, el día libre', () => {
    expect([VIERNES, SABADO, DOMINGO, MARTES].map((d) => routineFor(d))).toEqual(['weekday', 'weekend', 'weekend', 'libre']);
    expect(dayTypeOf(MARTES)).toBe('weekday');
  });

  it('el día libre se cambia o se saca; con trabajo, reemplaza a lunes a viernes', () => {
    expect(routineFor(MARTES, { diaLibre: null })).toBe('weekday');
    expect(routineFor(VIERNES, { diaLibre: 5 })).toBe('libre');
    expect(routineFor(VIERNES, { rutina: 'con-trabajo' })).toBe('con-trabajo');
    expect(routineFor(SABADO, { rutina: 'con-trabajo' })).toBe('weekend');
  });

  it('con la fecha inyectada, el día se cuenta en la hora de Buenos Aires', () => {
    // 02:30 UTC del sábado son las 23:30 del viernes en Buenos Aires (UTC−3).
    expect(dayTypeOf(dateKeyIn(new Date('2026-11-14T02:30:00Z')))).toBe('weekday');
    expect(dayTypeOf(dateKeyIn(new Date('2026-11-14T07:00:00Z')))).toBe('weekend');
  });

  it('el viernes arma 10 metas y el finde 6, numeradas desde 1', () => {
    const viernes = buildBlocks(planDay(VIERNES, 'completo'));
    expect(viernes.map((b) => [b.n, b.start, b.title, b.rama ?? '—'])).toEqual([
      [1, '04:00', 'Rutina de la mañana', 'main'], [2, '04:30', 'Matemática · CONAMAT', 'matematica'], [3, '06:30', 'Programación', 'programacion'],
      [4, '08:30', 'Acompañar a Abi y correr', 'salud'], [5, '10:00', 'Trabajo actual', '—'], [6, '12:00', 'Búsqueda laboral', 'trabajo'],
      [7, '13:30', 'Handyx', 'handyx'], [8, '16:30', 'Programación · tarde', 'programacion'], [9, '19:00', 'Entrenamiento', 'salud'], [10, '20:30', 'Cerrar y preparar mañana', 'main'],
    ]);
    const sabado = buildBlocks(planDay(SABADO, 'completo'));
    expect(sabado.map((b) => [b.n, b.start, b.key])).toEqual([[1, '04:30', 'math'], [2, '06:30', 'prog'], [3, '08:30', 'abi'], [4, '10:00', 'prog-2'], [5, '12:00', 'handyx'], [6, '15:00', 'busqueda']]);
    expect(buildBlocks(planDay(MARTES, 'completo', undefined, 'libre')).map((b) => b.title)).toEqual(['Repasos · 20 min', 'Entrenamiento suave']);
  });
});

describe('el 1 % del día, en partes iguales entre las metas', () => {
  it('10 metas valen 0,1 % cada una; 6, un sexto; el día libre, 0,5', () => {
    expect(valorMeta({ blocks: buildBlocks(planDay(VIERNES, 'completo')) })).toBe(0.1);
    expect(valorMeta({ blocks: buildBlocks(planDay(SABADO, 'completo')) })).toBeCloseTo(1 / 6);
    expect(valorMeta({ blocks: buildBlocks(planDay(MARTES, 'completo', undefined, 'libre')) })).toBe(0.5);
  });

  it('cumplir todas da 1 %; cumplir una, su parte', () => {
    const hecha = (b: ReturnType<typeof buildBlocks>[number]) => ({ ...b, tasks: b.tasks.map((t) => ({ ...t, done: true })) });
    const viernes = buildBlocks(planDay(VIERNES, 'completo'));
    expect(mejoraDia({ blocks: viernes.map(hecha) })).toBe(1);
    expect(mejoraDia({ blocks: [hecha(viernes[0]), ...viernes.slice(1)] })).toBe(0.1);
    expect(blockDone(hecha(viernes[0]))).toBe(true);
  });
});

describe('04:00, 05:00 y otra hora', () => {
  it('04:00 arma el día completo con los horarios del JSON', () => {
    expect(horario(planRoutine('weekday', 'completo'))).toMatchObject({ rutina: '04:00+30', math: '04:30+120', prog: '06:30+120', abi: '08:30+90' });
    expect(horario(planRoutine('weekend', 'completo'))).toMatchObject({ despertar: '04:00+30', math: '04:30+120', prog: '06:30+120', abi: '08:30+90' });
  });

  it('05:00 acorta las metas flexibles de la mañana para llegar justo al primer fijo', () => {
    expect(horario(planRoutine('weekday', 'corto'))).toMatchObject({ rutina: '05:00+20', math: '05:20+100', prog: '07:00+90', abi: '08:30+90' });
    expect(horario(planRoutine('weekend', 'corto'))).toMatchObject({ despertar: '05:00+30', math: '05:30+90', prog: '07:00+90', abi: '08:30+90' });
  });

  it('"Otra hora" corre los bloques y acorta los flexibles; nunca menos de 15 min', () => {
    for (const t of ['weekday', 'weekend', 'con-trabajo'] as const) {
      const { max } = wakeRange(t);
      for (let w = toMin('04:00'); w <= max; w += 10) {
        const p = planRoutine(t, 'otra', `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`);
        const abi = p.find((x) => x.block.id === 'abi')!;
        const antes = p.slice(0, p.indexOf(abi));
        expect(toMin(antes[0].start)).toBe(w);
        expect(toMin(antes.at(-1)!.start) + antes.at(-1)!.min).toBeLessThanOrEqual(toMin('08:30'));
        for (const x of antes) expect(x.min).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('los bloques fijos y lo que viene después del primero no se mueven en ningún modo', () => {
    for (const t of ['weekday', 'weekend', 'con-trabajo'] as const) {
      const base = planRoutine(t, 'completo');
      const tarde = base.slice(base.findIndex((x) => x.block.kind === 'fixed'));
      for (const p of [planRoutine(t, 'corto'), planRoutine(t, 'otra', '06:00')]) {
        expect(horario(p.slice(p.findIndex((x) => x.block.kind === 'fixed')))).toEqual(horario(tarde));
      }
    }
  });
});

describe('ventana W y entrevista cercana', () => {
  it('en una ventana W, los bloques de programación pasan a matemática', () => {
    const p = ajustarDia(planRoutine('weekday', 'completo'), { ventana: 'W1' });
    expect(p.filter((x) => x.block.rama === 'matematica').map((x) => [x.block.id, x.block.label])).toEqual([
      ['math', 'Matemática · CONAMAT'], ['prog', 'Matemática · ventana W1'], ['prog-tarde', 'Matemática · ventana W1'],
    ]);
    expect(p.some((x) => x.block.rama === 'programacion')).toBe(false);
  });

  it('con una entrevista a 3 días o menos, la búsqueda se parte en 45 + 45 de inglés', () => {
    const p = horario(ajustarDia(planRoutine('weekday', 'completo'), { entrevista: true }));
    expect(p).toMatchObject({ busqueda: '12:00+45', 'ingles-entrevista': '12:45+45', handyx: '13:30+180' });
  });
});
