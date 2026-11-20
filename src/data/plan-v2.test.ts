import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calendario, esSemanaDePausa, finEtapa, opcionesDe, totalSemanas, validar } from './plan-extendido';

/** Ola 27: estos tests comparan con las tablas de la v1 y la v2: usan el JSON de la v2.1 congelado (los datos vivos son los de la v3). */
import raw from './fixtures/plan-extendido-v2.1.json';
const PLAN_EXT = raw as unknown as import('./plan-extendido').PlanExtendido;

const MES: Record<string, string> = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' };
const iso = (t: string) => { const [d, m, y] = t.trim().split(' '); return `${y}-${MES[m]}-${d.padStart(2, '0')}`; };
const rango = (t: string) => { const m = /(\d+ \w+ \d{4}) a (\d+ \w+ \d{4})/.exec(t); return m ? [iso(m[1]), iso(m[2])] : null; };

/** La tabla 3.1 del prompt v2 (docs/prompts/plan-t18-extendido-v2.md): la fuente de verdad. */
const md = readFileSync(join(__dirname, '../../docs/prompts/plan-t18-extendido-v2.md'), 'utf8');
const sec = md.slice(md.indexOf('### 3.1'), md.indexOf('### 3.2'));
const filas = sec.split('\n').filter((r) => r.startsWith('| ') && !r.startsWith('| Id') && !r.startsWith('|---')).map((r) => r.slice(1, -1).split('|').map((x) => x.trim()));

describe('ola 24 · plan T+18 v2', () => {
  it('el JSON valida y suma +25 de feature, +18 de plataforma y +2 de arquitectura', () => {
    expect(validar(PLAN_EXT)).toEqual([]);
    const s = (k: 'extra' | 'extraPlataforma' | 'extraArquitectura') => PLAN_EXT.bloques.reduce((a, b) => a + b[k], 0);
    expect([s('extra'), s('extraPlataforma'), s('extraArquitectura')]).toEqual([25, 18, 2]);
    expect(PLAN_EXT.bloques.find((b) => b.id === 'P8')).toMatchObject({ base: 2, extra: 1 });
    expect(PLAN_EXT.bloques.filter((b) => b.ficha?.entregablesArquitectura).map((b) => b.id)).toEqual(['P1', 'P5', 'P10', 'S1', 'Q5']);
  });

  it('las fechas base y con extras de cada bloque y cada pausa coinciden con la tabla de la v2', () => {
    const base = calendario(PLAN_EXT, { extras: false, plataforma: false, arquitectura: false });
    const ext = calendario(PLAN_EXT);
    let pausa = 0;
    for (const f of filas) {
      const [id, , , , , , , fb, fe] = f;
      if (id === 'PAUSA') {
        const p = ext.filter((b) => b.pausa)[pausa++];
        expect([id, p.inicio, p.fin]).toEqual([id, ...rango(fe)!]);
        continue;
      }
      const b = base.find((x) => x.id === id)!;
      const e = ext.find((x) => x.id === id)!;
      expect([id, b.inicio, b.fin]).toEqual([id, ...rango(fb)!]);
      expect([id, e.inicio, e.fin]).toEqual([id, ...rango(fe)!]);
    }
    expect(pausa).toBe(5);
  });

  it('totales y fin de etapas: 171 base y 217 con extras; las etapas suman 53, 25, 38 y 55 en base', () => {
    const base = calendario(PLAN_EXT, { extras: false, plataforma: false, arquitectura: false });
    const ext = calendario(PLAN_EXT);
    expect(totalSemanas(base)).toBe(171);
    expect(totalSemanas(ext)).toBe(217);
    expect([1, 2, 3, 4].map((n) => base.filter((b) => b.etapa === n).reduce((s, b) => s + b.semanas, 0))).toEqual([53, 25, 38, 55]);
    expect([1, 2, 3, 4].map((n) => finEtapa(base, n))).toEqual(['2027-11-21', '2028-05-14', '2029-02-04', '2030-02-24']);
    expect([1, 2, 3, 4].map((n) => finEtapa(ext, n))).toEqual(['2028-04-23', '2028-11-12', '2029-10-07', '2031-01-12']);
  });

  it('la pausa parte P1 y Q1 (el bloque se corre una semana) y entre bloques va sola', () => {
    const ext = calendario(PLAN_EXT);
    const p1 = ext.find((b) => b.id === 'P1')!;
    expect(p1).toMatchObject({ semanas: 6, inicio: '2026-11-30', fin: '2027-01-17', pausasDentro: [6] });
    expect(ext.find((b) => b.id === 'Q1')!.pausasDentro).toHaveLength(1);
    expect(ext.find((b) => b.id === 'PAUSA-2026')).toMatchObject({ inicio: '2026-12-21', fin: '2026-12-27', tipo: 'descanso', etapa: 1 });
    expect(esSemanaDePausa('2026-12-21')).toBe(true);
    expect(esSemanaDePausa('2026-12-28')).toBe(false);
    expect(esSemanaDePausa('2027-12-17')).toBe(false);
  });

  it('con la pausa apagada vuelve el calendario de la ola 18 (sin pausas, 212 semanas)', () => {
    const sin = calendario(PLAN_EXT, { pausas: false });
    expect(sin.some((b) => b.pausa)).toBe(false);
    expect(totalSemanas(sin)).toBe(212);
    expect(totalSemanas(calendario(PLAN_EXT, { pausas: false, plataforma: false, arquitectura: false }))).toBe(192);
  });

  it('los tres switches son independientes y se leen de lo guardado ("P1" es feature)', () => {
    const o = opcionesDe(['P1', 'P2:plataforma', 'P10:arquitectura'], false);
    expect(o).toMatchObject({ extras: { P1: false }, plataforma: { P2: false }, arquitectura: { P10: false }, pausas: false });
    const cal = calendario(PLAN_EXT, o);
    const b = (id: string) => cal.find((x) => x.id === id)!;
    expect([b('P1').extraAplicado, b('P1').plataformaAplicada]).toEqual([0, 1]);
    expect([b('P2').extraAplicado, b('P2').plataformaAplicada]).toEqual([1, 0]);
    expect([b('P10').semanas, b('P10').arquitecturaAplicada]).toEqual([5, 0]);
  });
});

describe('ola 24 · migración y calendario vivo', () => {
  it('un estado viejo conserva los extras apagados ("P1" sigue siendo feature) y arranca con la pausa prendida', async () => {
    const { migrate, resetState, setState, getState } = await import('../state/store');
    const { SEMANAS, TRAMOS } = await import('./plan');
    const { setPausaFinDeAnio, setExtraBloque } = await import('../state/plan');
    const s = migrate({ plan: { extrasApagados: ['P1'] } });
    expect(s.plan.extrasApagados).toEqual(['P1']);
    expect(s.plan.pausaFinDeAnio).toBeUndefined();
    resetState(s);
    const plan = await import('./plan');
    // La v7 no tiene semanas extra: lo apagado no cambia nada, pero se conserva.
    expect(plan.TRAMOS.find((t) => t.id === 'P1')).toMatchObject({ extra: 0, plataforma: 0, meta: 5, horas: 304 });
    const conPausa = plan.SEMANAS;
    // Apagar la pausa vuelve a contar sin ella; apagar la plataforma de P3 la saca solo de P3.
    setPausaFinDeAnio(false);
    expect(plan.SEMANAS).toBeLessThan(conPausa);
    expect(plan.TRAMOS.some((t) => t.pausa)).toBe(false);
    setExtraBloque('P3', false, 'plataforma');
    expect(getState().plan.extrasApagados).toEqual(['P1', 'P3:plataforma']);
    expect(plan.TRAMOS.find((t) => t.id === 'P3')).toMatchObject({ extra: 0, plataforma: 0, horas: 180 });
    setState((x) => x);
    resetState();
    expect([SEMANAS, TRAMOS.length]).toBeTruthy();
    expect(plan.SEMANAS).toBe(111);
  });
});
