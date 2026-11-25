import { describe, expect, it } from 'vitest';
import { PLAN, calendarioVivo, capacidadDelDia } from './plan';
import { PLAN_EXT } from './plan-extendido';
import { emptyPlan } from './plan-state';
import { PROY_V7, entregablesHechos, fichaV7, validarV7, versionesFechadas, type ProyectosV7 } from './proyectos-v7';

const cal = calendarioVivo();
const bloque = (id: string) => cal.find((b) => b.id === id)!;

describe('ola 30 · los proyectos del roadmap v7 por dentro', () => {
  it('cada proyecto del plan tiene su ficha v7 con puesto y versiones; el JSON valida (salvo la diferencia de PetrIA, avisada)', () => {
    // v12.4: PetrIA son 193,5 h, lo mismo que suman sus lotes. PetrIA v0 (archivada) no lleva ficha.
    const ids = PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto' && !b.archivado).map((b) => b.id);
    expect(ids).toHaveLength(28);
    for (const id of ids) expect(fichaV7(id)?.puesto, id).toBeTruthy();
    expect(Object.keys(PROY_V7.certs)).toHaveLength(13);
    expect(PROY_V7.ventanas.W1.contenido).toBe('probabilidad, estadística, regresión, álgebra lineal base, trigonometría');
    // El JSON valida sin avisos (las versiones de cada proyecto suman las horas de su bloque: VitalIA, 102 h en v12.4).
    expect(validarV7(PROY_V7, PLAN_EXT.bloques)).toEqual([]);
  });

  it('PetrIA: la ficha trae herramientas con ★ y extras, capa física, ahorro a medir, stack por ambiente y spots', () => {
    const f = fichaV7('P1')!;
    expect(f.puesto).toBe('Full-stack AI Engineer (energy)');
    expect(f.herramientas!.filter((h) => h.estrella).map((h) => h.nombre.split(':')[0])).toEqual(['Sweet spots', 'Valor del pozo', 'Declinación con Arps en P10/P50/P90', 'Lector de partes']);
    expect(f.herramientas!.filter((h) => h.extra).map((h) => h.nombre)).toEqual(['alertas', 'más cuencas', 'cumplimiento', 'yacimiento 3D']);
    expect(f.medir).toEqual({ tipo: 'ahorro', items: ['minutos por parte', 'errores de tipeo', 'horas de Excel por pozo'] });
    expect(f.stack!.ambientes.map((a) => a.ambiente)).toEqual(['Frontend', 'Backend', 'IA por API', 'ML propio', 'DB', 'Infra', 'Cloud']);
    expect(f.spots).toHaveLength(3);
    expect(f.ruido).toMatch(/Cuánto vale cada pozo de Vaca Muerta/);
    // VitalIA: las notificaciones van sin datos clínicos; Constelación mide impacto, no ahorro.
    expect(fichaV7('P2')!.notificaciones!.nota).toBe('sin datos clínicos');
    expect(fichaV7('P0')!.medir!.tipo).toBe('impacto');
  });

  it('versiones: PetrIA con las horas de sus lotes (47 + 48,5 + 40 + 58 = 193,5); el resto repartidas por días y marcadas', () => {
    expect(fichaV7('P1')!.versiones.map((v) => [v.id, v.nombre, v.inicio, v.fin, v.horas, !!v.derivadas])).toEqual([
      ['1.0', 'MVP', '2026-11-21', '2026-11-25', 47, false],
      ['1.1', 'Producto', '2026-11-26', '2026-11-30', 48.5, false],
      ['2.0', 'Plataforma', '2026-12-01', '2026-12-05', 40, false],
      ['3.0', 'Producción', '2026-12-06', '2026-12-12', 58, false],
    ]);
    // La 1.1 de PetrIA trae su alcance en sublista.
    expect(fichaV7('P1')!.versiones[1].alcance[0]).toBe('Herramientas: valor del pozo, declinación, lector de partes');
    const p2 = fichaV7('P2')!.versiones;
    expect(p2.every((v) => v.derivadas)).toBe(true);
    // AgrIA Sat (v12.4: 23 ago a 1 sep 2027); Upstream no tiene 1.1.
    expect(fichaV7('P7')!.versiones.map((v) => v.inicio)).toEqual(['2027-08-23', '2027-08-25', '2027-08-28', '2027-08-31']);
    expect(fichaV7('A6')!.versiones.map((v) => v.id)).toEqual(['1.0', '2.0', '3.0']);
    // Constelación: la v1 (en curso, la arman los agentes) en P0; la 2.0 y la 2.1 en P0B.
    expect(fichaV7('P0')!.versiones).toMatchObject([{ id: '1.0', nombre: 'Base', enCurso: true }]);
    expect(fichaV7('P0B')!.versiones.map((v) => [v.id, v.nombre, v.inicio, v.fin])).toEqual([['2.0', 'Con IA', '2027-05-16', '2027-05-18'], ['2.1', 'Completa', '2027-05-19', '2027-05-21']]);
    // VitalIA: sus versiones suman las 102 h del bloque en v12.4 (antes 104).
    expect(p2.reduce((s, v) => s + v.horas!, 0)).toBe(102);
  });

  it('el validador marca versiones solapadas, fuera del bloque y horas que no suman', () => {
    const d = structuredClone(PROY_V7) as ProyectosV7;
    d.proyectos.P1.versiones[1].inicio = '2026-11-24';
    d.proyectos.P2.versiones[3].fin = '2027-03-01';
    d.proyectos.P1.versiones[3].horas = 56;
    const e = validarV7(d, PLAN_EXT.bloques).join('\n');
    expect(e).toMatch(/P1 1.1: se solapa con la versión anterior/);
    expect(e).toMatch(/P2 3.0: cae fuera de las fechas del bloque/);
    expect(e).toMatch(/P1: las versiones suman 191.5 h y el bloque tiene 193.5/);
    delete (d.proyectos as Record<string, unknown>).P3;
    expect(validarV7(d, PLAN_EXT.bloques)).toContain('P3: sin ficha v7');
  });

  it('versiones fechadas: Trazo reparte las horas sobre el calendario vivo; con la capacidad de cada día caen en las fechas de v12.4', () => {
    // v12.4: 1.0 21–25 nov · 1.1 26–30 nov · 2.0 1–5 dic · 3.0 6–12 dic. Depende de la capacidad por día (las horas de fondo salen de las 10/11 h).
    const vs = versionesFechadas('P1', bloque('P1'), capacidadDelDia, emptyPlan(), '2026-11-21');
    expect(vs.map((v) => [v.id, v.inicioTrazo, v.finTrazo, v.delta, v.estado])).toEqual([
      ['1.0', '2026-11-21', '2026-11-25', 0, 'en-curso'],
      ['1.1', '2026-11-26', '2026-11-30', 0, 'proxima'],
      ['2.0', '2026-12-01', '2026-12-05', 0, 'proxima'],
      ['3.0', '2026-12-06', '2026-12-12', 0, 'proxima'],
    ]);
    // La última termina con el bloque.
    expect(vs[3].finTrazo).toBe(bloque('P1').fin);
    // Publicada manda sobre la fecha; pasada la fecha sin publicar, atrasada.
    const plan = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-29', notas: true, video: true } } } };
    const tarde = versionesFechadas('P1', bloque('P1'), capacidadDelDia, plan, '2026-12-09');
    expect(tarde.map((v) => v.estado)).toEqual(['publicada', 'atrasada', 'atrasada', 'en-curso']);
    expect(entregablesHechos(tarde[0].registro)).toBe(2);
    // La v1 de Constelación no tiene fechas: queda en curso.
    expect(versionesFechadas('P0', bloque('P0'), capacidadDelDia, emptyPlan(), '2026-11-21')[0]).toMatchObject({ id: '1.0', estado: 'en-curso' });
  });

  it('el estándar de alto valor son los 12 puntos de la v7, con el detalle de operación y frontend', () => {
    expect(PLAN.programacion.estandar.map((c) => c.id)).toEqual(['produccion', 'datos', 'metricas', 'diseno', 'seguridad', 'llm', 'escala', 'operacion', 'frontend', 'spots', 'entrevista', 'opensource']);
    expect(PLAN.programacion.estandar.find((c) => c.id === 'operacion')!.detalle).toHaveLength(9);
    expect(PLAN.programacion.estandar.find((c) => c.id === 'frontend')!.detalle).toContain('WCAG AA con axe en el CI');
    expect(PROY_V7.estandar.map((e) => e.texto)).toEqual(PLAN.programacion.estandar.map((c) => c.texto));
  });
});
