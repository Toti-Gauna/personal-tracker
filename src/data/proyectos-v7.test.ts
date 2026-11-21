import { describe, expect, it } from 'vitest';
import { PLAN, calendarioVivo, capacidadDelDia } from './plan';
import { PLAN_EXT } from './plan-extendido';
import { emptyPlan } from './plan-state';
import { PROY_V7, entregablesHechos, fichaV7, validarV7, versionesFechadas, type ProyectosV7 } from './proyectos-v7';

const cal = calendarioVivo();
const bloque = (id: string) => cal.find((b) => b.id === id)!;

describe('ola 30 · los proyectos del roadmap v7 por dentro', () => {
  it('cada proyecto del plan tiene su ficha v7 con puesto y versiones; el JSON valida', () => {
    expect(validarV7(PROY_V7, PLAN_EXT.bloques)).toEqual([]);
    const ids = PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto').map((b) => b.id);
    expect(ids).toHaveLength(28);
    for (const id of ids) expect(fichaV7(id)?.puesto, id).toBeTruthy();
    expect(Object.keys(PROY_V7.certs)).toHaveLength(13);
    expect(PROY_V7.ventanas.W1.contenido).toBe('probabilidad, estadística, regresión, álgebra lineal base, trigonometría');
  });

  it('PetrIA: la ficha trae herramientas con ★ y extras, capa física, ahorro a medir, stack por ambiente y spots', () => {
    const f = fichaV7('P1')!;
    expect(f.puesto).toBe('Full-stack AI Engineer (energía)');
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

  it('versiones: PetrIA con sus horas medidas (74 + 74 + 64 + 92 = 304); el resto repartidas por días y marcadas', () => {
    expect(fichaV7('P1')!.versiones.map((v) => [v.id, v.nombre, v.inicio, v.fin, v.horas, !!v.derivadas])).toEqual([
      ['1.0', 'MVP', '2026-11-19', '2026-12-01', 74, false],
      ['1.1', 'Producto', '2026-12-02', '2026-12-12', 74, false],
      ['2.0', 'Plataforma', '2026-12-13', '2026-12-22', 64, false],
      ['3.0', 'Producción', '2026-12-23', '2027-01-05', 92, false],
    ]);
    // La 1.1 de PetrIA trae su alcance en sublista.
    expect(fichaV7('P1')!.versiones[1].alcance[0]).toBe('Herramientas: valor del pozo, declinación, lector de partes');
    const p2 = fichaV7('P2')!.versiones;
    expect(p2.every((v) => v.derivadas)).toBe(true);
    expect(p2.reduce((s, v) => s + v.horas!, 0)).toBe(155);
    // AgrIA Sat salta la pausa de 2027 entre la 1.1 y la 2.0; Upstream no tiene 1.1.
    expect(fichaV7('P7')!.versiones.map((v) => v.inicio)).toEqual(['2027-12-03', '2027-12-12', '2027-12-27', '2028-01-06']);
    expect(fichaV7('A6')!.versiones.map((v) => v.id)).toEqual(['1.0', '2.0', '3.0']);
    // Constelación: la v1 (en curso, la arman los agentes) en P0; la 2.0 y la 2.1 en P0B.
    expect(fichaV7('P0')!.versiones).toMatchObject([{ id: '1.0', nombre: 'Base', enCurso: true }]);
    expect(fichaV7('P0B')!.versiones.map((v) => [v.id, v.nombre, v.inicio, v.fin])).toEqual([['2.0', 'Con IA', '2027-07-06', '2027-07-14'], ['2.1', 'Completa', '2027-07-15', '2027-07-23']]);
  });

  it('el validador marca versiones solapadas, fuera del bloque y horas que no suman', () => {
    const d = structuredClone(PROY_V7) as ProyectosV7;
    d.proyectos.P1.versiones[1].inicio = '2026-11-30';
    d.proyectos.P2.versiones[3].fin = '2027-03-01';
    d.proyectos.P1.versiones[3].horas = 90;
    const e = validarV7(d, PLAN_EXT.bloques).join('\n');
    expect(e).toMatch(/P1 1.1: se solapa con la versión anterior/);
    expect(e).toMatch(/P2 3.0: cae fuera de las fechas del bloque/);
    expect(e).toMatch(/P1: las versiones suman 302 h y el bloque tiene 304/);
    delete (d.proyectos as Record<string, unknown>).P3;
    expect(validarV7(d, PLAN_EXT.bloques)).toContain('P3: sin ficha v7');
  });

  it('versiones fechadas: Trazo reparte las horas sobre el calendario vivo; el MVP público de PetrIA cae el 28 nov (el roadmap dice 1 dic)', () => {
    const vs = versionesFechadas('P1', bloque('P1'), capacidadDelDia, emptyPlan(), '2026-11-21');
    expect(vs.map((v) => [v.id, v.inicioTrazo, v.finTrazo, v.delta, v.estado])).toEqual([
      ['1.0', '2026-11-19', '2026-11-28', -3, 'en-curso'],
      ['1.1', '2026-11-29', '2026-12-07', -5, 'proxima'],
      ['2.0', '2026-12-08', '2026-12-15', -7, 'proxima'],
      ['3.0', '2026-12-16', '2026-12-26', -10, 'proxima'],
    ]);
    // La última termina con el bloque.
    expect(vs[3].finTrazo).toBe(bloque('P1').fin);
    // Publicada manda sobre la fecha; pasada la fecha sin publicar, atrasada.
    const plan = { ...emptyPlan(), versiones: { P1: { '1.0': { publicada: '2026-11-29', notas: true, video: true } } } };
    const tarde = versionesFechadas('P1', bloque('P1'), capacidadDelDia, plan, '2026-12-09');
    expect(tarde.map((v) => v.estado)).toEqual(['publicada', 'atrasada', 'en-curso', 'proxima']);
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
