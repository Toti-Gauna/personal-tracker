import { describe, expect, it } from 'vitest';
import { filasMapa } from './mapa';
import { emptyPlan } from './plan-state';
import { emptyStudy } from './study-catalog';

describe('mapa en ramas', () => {
  it('arriba T+18, abajo T+0 y HEAD en hoy; lo que viene después de HEAD es futuro', () => {
    const f = filasMapa('2026-12-14', 'mes', emptyPlan(), emptyStudy());
    expect(f[0]).toMatchObject({ hito: 'T+18', fecha: '2028-08-06' });
    expect(f[f.length - 1]).toMatchObject({ hito: 'T+0', fecha: '2026-11-16' });
    const head = f.findIndex((x) => x.tipo === 'head');
    expect(f[head].texto).toBe('Faro v1 · semana 3 de 5');
    expect(f.slice(1, head).every((x) => x.futuro || x.tipo === 'gap')).toBe(true);
    expect(f.slice(head + 1).every((x) => !x.futuro)).toBe(true);
    // Este mes incluye T+2 (11 ene) y la entrega de Faro v1 (3 ene, con las semanas de feature).
    expect(f.some((x) => x.hito === 'T+2')).toBe(true);
    expect(f.some((x) => x.a === 'trabajo' && x.fecha === '2027-01-03')).toBe(true);
    // Ordenadas de la más nueva a la más vieja.
    const fechas = f.filter((x) => x.tipo !== 'gap').map((x) => x.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it('18 meses: los proyectos, las certificaciones y las ventanas', () => {
    const f = filasMapa('2026-12-14', 'todo', emptyPlan(), emptyStudy());
    const ids = f.map((x) => x.id);
    for (const id of ['fin-P1', 'fin-P10', 'fin-C1', 'fin-C2', 'fin-C3', 'fin-W1', 'fin-W2', 'fin-W3']) expect(ids).toContain(id);
    expect(ids.filter((x) => x.startsWith('fin-P'))).toHaveLength(11);
    expect(f.some((x) => x.tipo === 'gap')).toBe(false);
  });
});

describe('mapa · hitos y stand-by (Ola 8b)', () => {
  it('Trimestre: los hitos iniciales, ordenados por fecha, con clipping y rombos', async () => {
    const { HITOS } = await import('./hitos');
    const f = filasMapa('2026-11-15', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16');
    const h = f.filter((x) => x.hitoId);
    // Ola 18 (sin pausas): Escudo cierra el 31 de enero y W1 queda lista el 21 de feb, así que entra en el
    // primer trimestre; Surco v1 arranca (22 feb) y cierra (21 mar) y pasan al segundo. Quedan 28 de los 30.
    // Ola 21: entran los hitos de idiomas del 27 dic (Measure What Matters) y el 7 feb (pronunciación); sale el viejo "B2 sólido".
    // Ola 23: los 3 hitos viejos de clipping dejan lugar a los 15 del Roadmap Clipper (6 caen en el trimestre).
    expect(h).toHaveLength(32);
    expect(HITOS).toHaveLength(45);
    expect(h.filter((x) => x.rama === 'ingles').map((x) => x.hitoId)).toEqual(['ingles-83', 'ingles-41']);
    const fechas = h.map((x) => x.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
    expect(h[h.length - 1]).toMatchObject({ fecha: '2026-11-16', rama: 'main', hito: 'T+0' });
    expect(h.find((x) => x.hitoId === 'programacion-62')).toMatchObject({ fecha: '2027-01-31', rama: 'programacion', hitoTipo: 'grande' });
    const t2 = filasMapa('2027-03-01', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16').filter((x) => x.hitoId);
    expect(t2.find((x) => x.hitoId === 'programacion-77')).toMatchObject({ fecha: '2027-02-22', rama: 'programacion', desde: 'matematica' });
    expect(t2.find((x) => x.hitoId === 'programacion-97')).toMatchObject({ fecha: '2027-03-21', hitoTipo: 'grande' });
    expect(h.find((x) => x.hitoId === 'matematica-76')).toMatchObject({ fecha: '2027-02-21' });
    expect(h.filter((x) => x.rama === 'clipping').map((x) => x.hitoId).reverse()).toEqual(['clip-gta6', 'clip-usd-150', 'clip-dashboard-v1', 'clip-usd-350', 'clip-retainer-1', 'clip-usd-700']);
    expect(h.filter((x) => x.hitoTipo === 'grande')).toHaveLength(10); // con W1 lista (21 feb)
    expect(f[0].hito).toBe('T+18');
  });

  it('marcar un hito como hecho lo pasa a trazo lleno y HEAD sigue en hoy', () => {
    const plan = { ...emptyPlan(), hitos: { 'programacion-13': { hecho: '2026-11-25' } } };
    const f = filasMapa('2026-11-25', 'trimestre', plan, emptyStudy(), '2026-11-16');
    const p0 = f.find((x) => x.hitoId === 'programacion-13')!;
    expect(p0).toMatchObject({ estado: 'hecho', futuro: false });
    expect(f.find((x) => x.tipo === 'head')!.fecha).toBe('2026-11-25');
  });

  it('el orden de las filas no cambia al marcar o desmarcar hitos', () => {
    const base = filasMapa('2026-11-25', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16');
    for (const id of ['programacion-13', 'trabajo-2', 'ingles-3']) {
      const plan = { ...emptyPlan(), hitos: { [id]: { hecho: '2026-11-25' } } };
      const f = filasMapa('2026-11-25', 'trimestre', plan, emptyStudy(), '2026-11-16');
      expect(f.map((x) => x.id)).toEqual(base.map((x) => x.id));
    }
    const mes = filasMapa('2026-11-25', 'mes', emptyPlan(), emptyStudy(), '2026-11-16').map((x) => x.id);
    const plan = { ...emptyPlan(), hitos: { 'programacion-13': { hecho: '2026-11-25' } } };
    expect(filasMapa('2026-11-25', 'mes', plan, emptyStudy(), '2026-11-16').map((x) => x.id)).toEqual(mes);
  });

  it('un hito de búsqueda que pasó sin cumplirse queda vencido con fecha nueva propuesta', () => {
    const f = filasMapa('2026-12-12', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16');
    const rec = f.find((x) => x.texto === 'Primera entrevista con recruiter')!;
    expect(rec).toMatchObject({ estado: 'vencido', propuesta: '2026-12-26' });
    expect(f.find((x) => x.texto.startsWith('Aritmética · test'))!.estado).toBe('pendiente');
  });

  it('con Handyx en pausa sus filas van en stand-by', () => {
    const plan = { ...emptyPlan(), pausas: [{ id: 'p', objetivo: 'handyx', desde: '2026-11-16', motivo: 'búsqueda intensiva', guardado: {} }] };
    const f = filasMapa('2026-12-14', 'trimestre', plan, emptyStudy(), '2026-11-16');
    expect(f.filter((x) => x.rama === 'handyx').every((x) => x.standby)).toBe(true);
    expect(f.filter((x) => x.rama === 'programacion').some((x) => x.standby)).toBe(false);
  });
});
