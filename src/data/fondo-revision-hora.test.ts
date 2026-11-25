import { beforeEach, describe, expect, it } from 'vitest';
import { editarRevision } from '../state/fondo';
import { darPorHecho, deshacerHecho } from '../state/dia';
import { getState, register, resetState, startDay, toggleTask } from '../state/store';
import { MIN_HORA_FONDO, revisionSemana, sincronizarRevision } from './fondo';

const DIA = '2026-12-14'; // lunes: JulIA v3.0 (16:00) y el slot #1, Aquasol (17:00)
const bloque = (k: string) => getState().days[DIA].blocks.find((b) => b.key === k)!;
const log = () => getState().plan.revisionFondo ?? [];

beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); startDay('completo', '04:00', DIA); });

describe('v12.4 · tildar una hora de fondo anota 60 min de revisión a esa pista', () => {
  it('el día arma las dos horas de fondo con su nombre (16:00 la secundaria, 17:00 la comercial)', () => {
    expect(bloque('fondo-sec')).toMatchObject({ start: '16:00', min: 60, title: 'Secundaria · JulIA v3.0' });
    expect(bloque('fondo-com')).toMatchObject({ start: '17:00', min: 60, title: 'Comercial · #1 Aquasol and water parks · build' });
    expect(log()).toEqual([]);
  });

  it('tildar todos los pasos anota 60 min a la app (walkthrough); destildar los saca; con la comercial, a su slot', () => {
    for (const t of bloque('fondo-sec').tasks) toggleTask(DIA, 'fondo-sec', t.id);
    expect(log()).toEqual([expect.objectContaining({ id: `rev-${DIA}-fondo-sec`, fecha: DIA, min: MIN_HORA_FONDO, item: 'julia', tipo: 'walkthrough', bloque: 'fondo-sec' })]);
    // Un paso sin tildar: la hora no está hecha y la entrada se va.
    toggleTask(DIA, 'fondo-sec', bloque('fondo-sec').tasks[0].id);
    expect(log()).toEqual([]);
    for (const t of bloque('fondo-com').tasks) toggleTask(DIA, 'fondo-com', t.id);
    expect(log()).toEqual([expect.objectContaining({ item: 'com-1', tipo: 'comercial', min: 60 })]);
    expect(revisionSemana(log(), '2026-12-14')).toMatchObject({ min: 60, comercial: 60 });
  });

  it('darla por hecha también anota; deshacerlo la saca; los minutos editados (40) se quedan aunque la destildes', () => {
    darPorHecho(DIA, 'fondo-sec');
    expect(log()).toHaveLength(1);
    editarRevision(`rev-${DIA}-fondo-sec`, 40);
    expect(log()[0].min).toBe(40);
    deshacerHecho(DIA, 'fondo-sec');
    expect(log()).toHaveLength(1); // editada: no se pierde
    expect(log()[0].min).toBe(40);
    // Tildar de nuevo no la duplica.
    darPorHecho(DIA, 'fondo-sec');
    expect(log()).toHaveLength(1);
    expect(sincronizarRevision(log(), getState().days[DIA])).toBe(log());
  });

  it('una hora devuelta a la principal (sin pista activa) no anota nada', () => {
    startDay('completo', '04:00', '2027-08-10');
    const b = getState().days['2027-08-10'].blocks.find((x) => x.key === 'prog-fondo-sec')!;
    for (const t of b.tasks) toggleTask('2027-08-10', 'prog-fondo-sec', t.id);
    expect(log()).toEqual([]);
  });
});
