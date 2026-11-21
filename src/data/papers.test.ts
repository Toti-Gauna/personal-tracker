import { describe, expect, it } from 'vitest';
import { PAPERS_ID, PAPERS_V12, actividadPapers, temaDelPost } from './papers';
import { ajustarDia, planRoutine } from './routines';
import { capituloAbierto, focusUnit } from './study';
import type { StudyState } from './study-types';

describe('v12.1 · papers', () => {
  it('una actividad con un paper por unidad, en el orden de los bloques; los sueltos al final', () => {
    expect(PAPERS_V12.map((p) => p.bloque)).toEqual(['P1', 'P1', 'W2', 'W2', 'P6', 'P6', 'P8', 'P8', 'P9', 'P10', null, null]);
    const a = actividadPapers();
    expect(a.units).toHaveLength(12);
    expect(a.units![0]).toMatchObject({ n: 1, title: 'word2vec (2013) (opcional)', test: { count: 5, min: 15 } });
  });

  it('el siguiente paper se abre con la tesis del anterior, como un capítulo', () => {
    const a = actividadPapers();
    const st = { units: { [PAPERS_ID]: { 1: { learnedOn: '2026-11-25', tests: [] } } }, reviews: [], activities: [a] } as unknown as StudyState;
    expect(capituloAbierto(a, st)?.n).toBe(1);
    expect(focusUnit(a, st, '2026-11-26')).toBeUndefined();
  });

  it('la tesis de paper de la última semana es el tema del post del martes o el jueves', () => {
    const st = { tesis: [{ itemId: 'x', activityId: PAPERS_ID, unit: 7, text: '…', mode: 'app' as const, savedOn: '2027-08-03', practice: [] }] };
    expect(temaDelPost(st, '2027-08-05')).toBe('Attention Is All You Need (2017)');
    expect(temaDelPost(st, '2027-08-12')).toBeNull();
    const dia = ajustarDia(planRoutine('busqueda-intensiva', 'completo'), { postDelDia: true, postTema: temaDelPost(st, '2027-08-05') });
    expect(dia.find((p) => p.block.id === 'post')!.block.tasks![0]).toBe('Post de LinkedIn (EN + ES) sobre la tesis de Attention Is All You Need (2017)');
  });
});
