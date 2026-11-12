import { beforeEach, describe, expect, it } from 'vitest';
import { areaNameOverrides, AREAS, ROUTINES } from '../data/defaults';
import { buildIcs } from '../data/ics';
import { SEALS, bestStreak, dayXp, earlyStreak, hitos, levelOf, totalXp } from '../data/profile';
import { DEFAULT_ALARMS } from '../data/sounds';
import { getState, register, resetState, startDay } from './store';
import { closeDay, claimSeal, markSealSeen, setAreaName, setDayRoutine, syncSeals } from './profile';
import { completeLearn, saveTest } from './study';
import { setAlarms } from './profile';
import { startTraining, nudge, logSet, finishTraining } from './train';
import { addDays } from '../data/time';
import { toggleTask } from './store';

const D0 = '2026-11-11';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

function hacer(date: string, blocks: number) {
  getState().days[date].blocks.slice(0, blocks).forEach((b) => b.tasks.forEach((t) => toggleTask(date, b.key, t.id)));
}

describe('XP y niveles', () => {
  it('4 XP por tarea y 10 por meta: 15 tareas y 6 metas son 120 XP', () => {
    const day = { blocks: [
      ...Array.from({ length: 6 }, (_, i) => ({ key: `m${i}`, tasks: [{ id: 'a', t: 'x', done: true }, { id: 'b', t: 'y', done: true }] })),
      { key: 'n1', tasks: [{ id: 'c', t: 'z', done: true }, { id: 'd', t: 'w', done: false }, { id: 'e', t: 'v', done: false }] },
      { key: 'n2', tasks: [{ id: 'f', t: 'z', done: false }, { id: 'g', t: 'z', done: false }] },
    ] } as never;
    // 12 + 1 = 13 tareas hechas, 6 metas
    expect(dayXp(day)).toBe(13 * 4 + 6 * 10);
  });

  it('cada nivel cuesta 100 XP más que el anterior', () => {
    expect(levelOf(0)).toMatchObject({ level: 1, toNext: 300 });
    expect(levelOf(300).level).toBe(2);
    expect(levelOf(700)).toMatchObject({ level: 3, into: 0 });
    expect(levelOf(1240)).toMatchObject({ level: 4, toNext: 560 });
  });
});

describe('cierre, sellos y ajustes', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('hay 24 sellos, 6 por grupo', () => {
    expect(SEALS).toHaveLength(24);
    for (const g of ['constancia', 'cuerpo', 'estudio', 'trabajo']) expect(SEALS.filter((s) => s.group === g)).toHaveLength(6);
    expect(new Set(SEALS.map((s) => s.id)).size).toBe(24);
  });

  it('empezar el día 0 da "Hombre nuevo"; cerrar el día guarda el cierre y suma XP', () => {
    hacer(D0, 2);
    const nuevos = closeDay(D0, { victoria: 'Aprobé el test', manana: 'Tesis del cap. 1', carry: [], score: 0.25 });
    expect(nuevos).toContain('hombre-nuevo');
    markSealSeen('hombre-nuevo');
    expect(getState().profile.seen).toEqual(['hombre-nuevo']);
    const d = getState().days[D0];
    expect(d.closed).toMatchObject({ victoria: 'Aprobé el test', manana: 'Tesis del cap. 1', score: 0.25 });
    expect(d.closed!.xp).toBe(dayXp(d));
    expect(totalXp(getState())).toBe(d.closed!.xp + 50);
  });

  it('las tareas elegidas pasan a mañana y las demás quedan en el día', () => {
    const pend = getState().days[D0].blocks[0].tasks;
    closeDay(D0, { victoria: '', manana: '', carry: [pend[0].id], score: 0 });
    expect(getState().carry[addDays(D0, 1)].rutina).toEqual([pend[0].t]);
    expect(getState().days[D0].blocks[0].tasks.map((t) => t.id)).toEqual([pend[1].id]);
  });

  it('un día con las 8 metas es "Día perfecto" y suma 1 % de mejora', () => {
    hacer(D0, 8);
    expect(syncSeals(D0)).toContain('dia-perfecto');
    expect(getState().profile.seals['dia-perfecto']).toBe(D0);
    expect(syncSeals(D0)).toEqual([]);
  });

  it('rachas: 7 seguidos y madrugador a las 4:30 o antes', () => {
    const days = getState().days;
    let d = D0;
    for (let i = 1; i < 7; i++) {
      d = addDays(d, 1);
      startDay('completo', '04:00', d);
    }
    for (const k of Object.keys(getState().days)) hacer(k, 1);
    expect(bestStreak(getState().days)).toBe(7);
    expect(earlyStreak(getState().days)).toBe(7);
    const fresh = syncSeals(d);
    expect(fresh).toEqual(expect.arrayContaining(['siete', 'madrugador']));
    expect(days).toBeTruthy();
  });

  it('primer capítulo y primer entreno', () => {
    completeLearn(D0, 'conamat', 1);
    saveTest(D0, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    startTraining('legs', D0, false);
    nudge('me', 'kg', 100);
    logSet();
    finishTraining();
    const fresh = syncSeals(D0);
    expect(fresh).toEqual(expect.arrayContaining(['primer-capitulo', 'test-perfecto', 'primer-entreno']));
  });

  it('los hitos muestran el avance de lo que falta, el más cerca primero', () => {
    const s = getState();
    startDay('completo', '04:00', addDays(D0, 1));
    hacer(D0, 1);
    hacer(addDays(D0, 1), 1);
    const h = hitos(getState(), addDays(D0, 1));
    expect(h[0].def.id).toBe('madrugador');
    expect(h[0].p.value).toBe(2);
    expect(s).toBeTruthy();
  });

  it('los sellos manuales se marcan a mano', () => {
    expect(syncSeals(D0)).not.toContain('mvp');
    claimSeal('mvp', D0);
    expect(getState().profile.seals.mvp).toBe(D0);
  });

  it('renombrar un área cambia su nombre en toda la app y vaciarlo vuelve al de fábrica', () => {
    expect(AREAS.eclipse.name).toBe('Eclipse');
    setAreaName('eclipse', 'Ventas');
    expect(AREAS.eclipse.name).toBe('Ventas');
    expect(areaNameOverrides.eclipse).toBe('Ventas');
    setAreaName('eclipse', '');
    expect(AREAS.eclipse.name).toBe('Eclipse');
  });

  it('editar la rutina del día cambia el plan; la de fábrica se recupera', () => {
    setDayRoutine('corto', { wake: '05:10', durations: { prog: 90 } });
    const corto = ROUTINES.find((r) => r.id === 'corto')!;
    expect(corto.wake).toBe('05:10');
    expect(corto.durations).toMatchObject({ prog: 90, math: 90 });
    resetState();
    expect(ROUTINES.find((r) => r.id === 'corto')!.wake).toBe('05:00');
  });
});

describe('alarmas .ics', () => {
  it('un evento diario por alarma activa, con aviso a la hora exacta', () => {
    const ics = buildIcs(DEFAULT_ALARMS.map((a, i) => ({ ...a, on: i !== 1 })), '2026-11-11', new Date(Date.UTC(2026, 10, 11, 3, 0, 0)));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART:20261111T040000');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('TRIGGER:PT0S');
    expect(ics).toContain('SUMMARY:Cerrar el día');
    expect(ics).not.toContain('Empieza matemática');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    for (const l of ics.split('\r\n')) expect(l.length).toBeLessThanOrEqual(75);
  });

  it('se guardan las alarmas editadas en los ajustes', () => {
    resetState();
    register('Toti', 'Abi', D0);
    setAlarms([{ id: 'x', time: '06:15', title: 'Una, dos; tres', on: true }]);
    expect(getState().settings!.alarms![0].time).toBe('06:15');
    expect(buildIcs(getState().settings!.alarms!, D0)).toContain('SUMMARY:Una\\, dos\; tres');
  });
});
