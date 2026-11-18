import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import raw from '../../data/plan-extendido.json';
import plan from '../../data/plan.json';
import { PLAN_EXT, bloqueEn, calendario, finEtapa, semanaDe, totalSemanas, validar, type PlanExtendido } from './plan-extendido';

const copia = () => structuredClone(raw) as unknown as PlanExtendido;

/**
 * Ola 24: estos tests comparan con la tabla de la v1 (calendario de la ola 18). Se corren con la pausa
 * de fin de año y las capas de plataforma y arquitectura apagadas; la v2 se prueba en plan-v2.test.ts.
 */
const OLA18 = { pausas: false, plataforma: false, arquitectura: false } as const;

// ——— la tabla de docs/prompts/plan-t18-extendido.md es la fuente de verdad: se lee y se compara ———

const MES: Record<string, string> = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' };
const iso = (s: string) => {
  const [d, m, y] = s.trim().split(' ');
  return `${y}-${MES[m]}-${d.padStart(2, '0')}`;
};
interface Fila { id: string; base: number; extra: number; baseIni: string; baseFin: string; extIni: string; extFin: string }
const doc = readFileSync(resolve(process.cwd(), 'docs/prompts/plan-t18-extendido.md'), 'utf8');
const TABLA: Fila[] = doc.split('\n').flatMap((l) => {
  if (!/^\| (P|W|C|S|Q|A|D|COL|CIE)\w* \|/.test(l)) return [];
  const c = l.split('|').slice(1, -1).map((x) => x.trim());
  if (c.length !== 7 || !/^\d+$/.test(c[3])) return [];
  const [bi, bf] = c[5].split(' a ');
  const [ei, ef] = c[6].split(' a ');
  return [{ id: c[0], base: Number(c[3]), extra: Number(c[4].replace('+', '')), baseIni: iso(bi), baseFin: iso(bf), extIni: iso(ei), extFin: iso(ef) }];
});

describe('data/plan-extendido.json', () => {
  it('es válido', () => {
    expect(validar(raw)).toEqual([]);
  });

  it('tiene los 52 bloques de la tabla, en el mismo orden y con las mismas semanas', () => {
    expect(TABLA).toHaveLength(52);
    expect(PLAN_EXT.bloques.map((b) => b.id)).toEqual(TABLA.map((f) => f.id));
    for (const f of TABLA) {
      const b = PLAN_EXT.bloques.find((x) => x.id === f.id)!;
      expect([b.base, b.extra]).toEqual([f.base, f.extra]);
    }
  });

  it('las semanas por etapa suman 52, 24, 37 y 54 (167) y 11, 3, 6 y 5 de extras (192), sin pausas', () => {
    expect(PLAN_EXT.etapas.map((e) => e.semanasBase)).toEqual([52, 24, 37, 54]);
    expect(PLAN_EXT.etapas.map((e) => e.semanasExtra)).toEqual([11, 3, 6, 5]);
    const base = calendario(PLAN_EXT, { ...OLA18, extras: false });
    expect(totalSemanas(base)).toBe(167);
    expect(totalSemanas(calendario(PLAN_EXT, OLA18))).toBe(192);
  });

  it('27 proyectos, 12 ventanas y 7 certificaciones', () => {
    const n = (t: string) => PLAN_EXT.bloques.filter((b) => b.tipo === t).length;
    // El prompt cuenta 27 proyectos con P0, P1 a P10, S1 a S3, Q1 a Q6 y A1 a A7.
    expect([n('proyecto'), n('ventana'), n('cert')]).toEqual([27, 12, 7]);
  });

  it('las ventanas abren a sus proyectos y los reemplazos propuestos quedan marcados', () => {
    const dep = (id: string) => PLAN_EXT.bloques.find((b) => b.id === id)!.dependeDe;
    expect([dep('P3'), dep('P6'), dep('P8'), dep('S1')]).toEqual([['W1'], ['W2'], ['W3'], ['W4']]);
    expect([dep('Q1'), dep('Q2'), dep('Q3'), dep('Q4'), dep('Q5'), dep('Q6')]).toEqual([['WQ1'], ['WQ1'], ['WQ2'], ['WQ2'], ['WQ3'], ['WQ3']]);
    expect([dep('A1'), dep('A2'), dep('A3'), dep('A4'), dep('A5'), dep('A6')]).toEqual([['WA1'], ['WA2'], ['WA3'], ['WA4'], ['WA5'], ['WA5']]);
    const alt = Object.fromEntries(PLAN_EXT.bloques.filter((b) => b.alternativa).map((b) => [b.id, b.alternativa]));
    expect(alt).toEqual({ P8: 'red teaming de agentes', Q2: 'réplica de papers', Q6: 'pipeline de datos de mercado', A6: 'contribuciones open source' });
    expect(PLAN_EXT.bloques.filter((b) => b.recortable).map((b) => b.id)).toEqual(['A3', 'A6']);
  });
});

describe('calendario derivado (con la pausa y las capas v2 apagadas: el de la ola 18)', () => {
  it('coincide fecha por fecha con la tabla del prompt, sin extras y con extras', () => {
    const base = calendario(PLAN_EXT, { ...OLA18, extras: false });
    const ext = calendario(PLAN_EXT, { ...OLA18, extras: true });
    for (const f of TABLA) {
      const b = base.find((x) => x.id === f.id)!;
      const e = ext.find((x) => x.id === f.id)!;
      expect([f.id, b.inicio, b.fin]).toEqual([f.id, f.baseIni, f.baseFin]);
      expect([f.id, e.inicio, e.fin]).toEqual([f.id, f.extIni, f.extFin]);
    }
  });

  it('los extras vienen prendidos por defecto', () => {
    expect(calendario(PLAN_EXT, OLA18)).toEqual(calendario(PLAN_EXT, { ...OLA18, extras: true }));
  });

  it('el fin de cada etapa es el del prompt', () => {
    const fin = (o: Parameters<typeof calendario>[1]) => [1, 2, 3, 4].map((n) => finEtapa(calendario(PLAN_EXT, { ...OLA18, ...o }), n));
    expect(fin({ extras: false })).toEqual(['2027-11-14', '2028-04-30', '2029-01-14', '2030-01-27']);
    expect(fin({ extras: true })).toEqual(['2028-01-30', '2028-08-06', '2029-06-03', '2030-07-21']);
  });

  it('es continuo: cada bloque empieza el lunes siguiente al fin del anterior', () => {
    const cal = calendario(PLAN_EXT, OLA18);
    cal.forEach((b, i) => {
      expect(new Date(b.inicio + 'T12:00').getDay()).toBe(1);
      expect(new Date(b.fin + 'T12:00').getDay()).toBe(0);
      if (i) expect(b.desde).toBe(cal[i - 1].hasta + 1);
    });
  });

  it('apagar el extra de un bloque lo acorta y corre lo que sigue', () => {
    const con = calendario(PLAN_EXT, OLA18);
    const sin = calendario(PLAN_EXT, { ...OLA18, extras: { P1: false } });
    expect(sin.find((b) => b.id === 'P1')!.semanas).toBe(3);
    expect(con.find((b) => b.id === 'P1')!.semanas).toBe(5);
    expect(sin.find((b) => b.id === 'P2')!.desde).toBe(con.find((b) => b.id === 'P2')!.desde - 2);
    expect(totalSemanas(sin)).toBe(190);
    // Con extras apagados en general, uno prendido suma solo el suyo.
    expect(totalSemanas(calendario(PLAN_EXT, { ...OLA18, extras: false }))).toBe(167);
    expect(totalSemanas(calendario(PLAN_EXT, { ...OLA18, extras: { P1: true }, atrasos: {} }))).toBe(192);
  });

  it('un atraso en una ventana se descuenta del colchón y las fechas siguientes se corren solas', () => {
    const base = calendario(PLAN_EXT, OLA18);
    const a = calendario(PLAN_EXT, { ...OLA18, atrasos: { W1: 2 } });
    const get = (c: typeof base, id: string) => c.find((b) => b.id === id)!;
    expect(get(a, 'W1').semanas).toBe(3 + 2);
    // Lo que va hasta el colchón se corre 2 semanas…
    expect(get(a, 'P3').desde).toBe(get(base, 'P3').desde + 2);
    // …el colchón de 2 semanas se lo come todo…
    expect(get(a, 'COL')).toMatchObject({ semanas: 0, absorbido: 2 });
    // …y lo que viene después queda en su fecha.
    expect(get(a, 'W4').inicio).toBe(get(base, 'W4').inicio);
    expect(finEtapa(a, 1)).toBe(finEtapa(base, 1));
    expect(totalSemanas(a)).toBe(totalSemanas(base));
  });

  it('con más atraso que colchón, solo lo que sobra corre la etapa 2', () => {
    const base = calendario(PLAN_EXT, OLA18);
    const a = calendario(PLAN_EXT, { ...OLA18, atrasos: { W1: 3, W2: 2 } });
    const get = (c: typeof base, id: string) => c.find((b) => b.id === id)!;
    expect(get(a, 'COL')).toMatchObject({ semanas: 0, absorbido: 2 });
    expect(get(a, 'W4').inicio).toBe(addSemanas(get(base, 'W4').inicio, 3));
    expect(totalSemanas(a)).toBe(totalSemanas(base) + 3);
  });

  it('un atraso con colchón a medias lo achica sin sacarlo', () => {
    const a = calendario(PLAN_EXT, { ...OLA18, atrasos: { P5: 1 } });
    expect(a.find((b) => b.id === 'COL')).toMatchObject({ semanas: 1, absorbido: 1 });
  });

  it('un atraso en una etapa sin colchón corre todo lo que sigue', () => {
    const base = calendario(PLAN_EXT, OLA18);
    const a = calendario(PLAN_EXT, { ...OLA18, atrasos: { S2: 2 } });
    expect(a.find((b) => b.id === 'C4')!.desde).toBe(base.find((b) => b.id === 'C4')!.desde + 2);
    expect(totalSemanas(a)).toBe(totalSemanas(base) + 2);
  });

  it('bloqueEn y semanaDe ubican una fecha', () => {
    const cal = calendario(PLAN_EXT, OLA18);
    expect(bloqueEn(cal, '2026-11-16')!.id).toBe('P0');
    expect(bloqueEn(cal, '2026-12-30')!.id).toBe('P1'); // con extras P1 dura hasta el 3 de enero
    expect(bloqueEn(cal, '2027-01-05')!.id).toBe('P2'); // sin pausa de fin de año: Escudo arranca el 4 de enero
    expect(bloqueEn(cal, '2026-11-15')).toBeNull();
    expect(bloqueEn(cal, '2031-01-01')).toBeNull();
    expect(semanaDe('2026-11-16')).toBe(1);
    expect(semanaDe('2026-11-22')).toBe(1);
    expect(semanaDe('2026-11-23')).toBe(2);
  });

  it('el plan puede arrancar otro lunes', () => {
    const cal = calendario(PLAN_EXT, { ...OLA18, t0: '2026-11-23' });
    expect(cal[0].inicio).toBe('2026-11-23');
    expect(cal[cal.length - 1].fin).toBe('2030-07-28');
  });
});

function addSemanas(f: string, n: number) {
  const d = new Date(f + 'T12:00');
  d.setDate(d.getDate() + n * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('validar', () => {
  it('marca ids repetidos y referencias rotas', () => {
    const d = copia();
    d.bloques[2].id = 'P0';
    d.bloques.find((b) => b.id === 'P3')!.dependeDe = ['W99'];
    const e = validar(d).join('\n');
    expect(e).toMatch(/P0: id repetido/);
    expect(e).toMatch(/P3: depende de un bloque que no existe \(W99\)/);
  });

  it('marca una ventana que va después del proyecto que la pide', () => {
    const d = copia();
    d.bloques.find((b) => b.id === 'P3')!.dependeDe = ['W2'];
    expect(validar(d).join('\n')).toMatch(/P3: depende de W2, que va después/);
  });

  it('marca una dependencia que no es una ventana', () => {
    const d = copia();
    d.bloques.find((b) => b.id === 'P3')!.dependeDe = ['P1'];
    expect(validar(d).join('\n')).toMatch(/P3: depende de P1, que no es una ventana/);
  });

  it('marca un ciclo', () => {
    const d = copia();
    // W1 depende de P3 y P3 de W1: además de ir después, forma un ciclo.
    d.bloques.find((b) => b.id === 'W1')!.dependeDe = ['P3'];
    const e = validar(d).join('\n');
    expect(e).toMatch(/ciclo de dependencias: .*W1.*P3|ciclo de dependencias: .*P3.*W1/);
  });

  it('marca sumas por etapa que no cierran', () => {
    const d = copia();
    d.bloques.find((b) => b.id === 'W1')!.base = 4;
    d.bloques.find((b) => b.id === 'P5')!.extra = 3;
    const e = validar(d).join('\n');
    expect(e).toMatch(/etapa 1: las semanas base suman 53 y dice 52/);
    expect(e).toMatch(/etapa 1: las semanas extra suman 13 y dice 11/);
  });

  it('marca extras en un bloque que no es proyecto, bases inválidas y etapas desordenadas', () => {
    const d = copia();
    d.bloques.find((b) => b.id === 'W1')!.extra = 1;
    d.bloques.find((b) => b.id === 'C1')!.base = 0;
    d.bloques.find((b) => b.id === 'S1')!.etapa = 1;
    const e = validar(d).join('\n');
    expect(e).toMatch(/W1: solo un proyecto lleva semanas extra/);
    expect(e).toMatch(/C1: base tiene que ser un entero de 1 o más/);
    expect(e).toMatch(/S1: las etapas van en orden/);
  });

  it('marca un t0 que no es lunes y una etapa sin declarar', () => {
    const d = copia();
    d.t0 = '2026-11-17';
    d.etapas = d.etapas.slice(0, 3);
    const e = validar(d).join('\n');
    expect(e).toMatch(/t0 tiene que ser un lunes/);
    expect(e).toMatch(/etapa 4: no está declarada/);
  });
});

describe('contra el plan que ya está en la app (data/plan.json)', () => {
  const tramos = (plan as unknown as { programacion: { tramos: { id: string; tipo: string; meta: number }[] } }).programacion.tramos;

  it('todos los proyectos y certificaciones existentes están, con la misma duración base', () => {
    for (const t of tramos.filter((x) => x.tipo === 'proyecto' || x.tipo === 'cert')) {
      const b = PLAN_EXT.bloques.find((x) => x.id === t.id);
      expect(b, t.id).toBeDefined();
      expect([t.id, b!.tipo, b!.base]).toEqual([t.id, t.tipo, t.meta]);
    }
  });

  it('las etapas 1 y 2 suman 76 semanas base (52 + 24) y no hay ninguna pausa', () => {
    expect(PLAN_EXT.etapas[0].semanasBase + PLAN_EXT.etapas[1].semanasBase).toBe(76);
    expect(PLAN_EXT.bloques.filter((b) => b.id.startsWith('PAU') || (b.tipo as string) === 'pausa')).toEqual([]);
    expect(PLAN_EXT.bloques.filter((b) => b.tipo === 'descanso').map((b) => b.id)).toEqual(['DES3', 'DES4']);
  });

  it('lo que cambia: las ventanas se alargan y el colchón baja (documentado en PLAN.md §6 quater)', () => {
    const dur = (id: string) => PLAN_EXT.bloques.find((b) => b.id === id)!.base;
    const hoy = (id: string) => tramos.find((t) => t.id === id)!.meta;
    expect(['W1', 'W2', 'W3'].map((id) => [id, hoy(id), dur(id)])).toEqual([['W1', 2, 3], ['W2', 3, 4], ['W3', 2, 4]]);
    expect([tramos.find((t) => t.id === 'colchon')!.meta, dur('COL')]).toEqual([6, 2]);
  });
});
