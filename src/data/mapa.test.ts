import { describe, expect, it } from 'vitest';
import { filasMapa } from './mapa';
import { emptyPlan } from './plan-state';
import { emptyStudy } from './study-catalog';

describe('mapa en ramas', () => {
  it('arriba T+18, abajo T+0 y HEAD en hoy; lo que viene después de HEAD es futuro', () => {
    const f = filasMapa('2026-12-01', 'mes', emptyPlan(), emptyStudy());
    // v12.1: T+18 es el cierre de la etapa 2, el 21 nov 2027.
    expect(f[0]).toMatchObject({ hito: 'T+18', fecha: '2027-11-21' });
    expect(f[f.length - 1]).toMatchObject({ hito: 'T+0', fecha: '2026-11-16' });
    const head = f.findIndex((x) => x.tipo === 'head');
    expect(f[head].texto).toBe('PetrIA · semana 2 de 3');
    expect(f.slice(1, head).every((x) => x.futuro || x.tipo === 'gap')).toBe(true);
    expect(f.slice(head + 1).every((x) => !x.futuro)).toBe(true);
    // Un día de English E#1, HEAD dice el nombre del bloque.
    expect(filasMapa('2026-12-14', 'mes', emptyPlan(), emptyStudy()).find((x) => x.tipo === 'head')!.texto).toBe('English E#1');
    // La entrega de PetrIA es el 9 dic.
    expect(filasMapa('2026-12-14', 'todo', emptyPlan(), emptyStudy()).find((x) => x.id === 'fin-P1')?.fecha).toBe('2026-12-09');
    expect(filasMapa('2026-12-14', 'mes', emptyPlan(), emptyStudy()).some((x) => x.hito === 'T+2')).toBe(true);
    // Ordenadas de la más nueva a la más vieja.
    const fechas = f.filter((x) => x.tipo !== 'gap').map((x) => x.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it('T+18: los proyectos, las cert windows, las semanas de inglés y de búsqueda y las ventanas', () => {
    const f = filasMapa('2026-12-14', 'todo', emptyPlan(), emptyStudy());
    const ids = f.map((x) => x.id);
    for (const id of ['fin-P1', 'fin-P10', 'fin-CW1', 'fin-CW6', 'fin-CW9', 'fin-E1', 'fin-J5', 'fin-W1', 'fin-W2', 'fin-W3', 'fin-W4']) expect(ids).toContain(id);
    // P0, PetrIA v0 (archivado), P1 a P10 y la 2.0/2.1 de Constelación (P0B).
    expect(ids.filter((x) => x.startsWith('fin-P'))).toHaveLength(13);
    expect(f.some((x) => x.tipo === 'gap')).toBe(false);
  });
});

describe('mapa · hitos y stand-by (Ola 8b)', () => {
  it('Trimestre: los hitos iniciales, ordenados por fecha, con clipping y rombos', async () => {
    const { HITOS } = await import('./hitos');
    const { setClippingActivo } = await import('./clipping-activo');
    setClippingActivo(true);
    const f = filasMapa('2026-11-15', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16');
    const h = f.filter((x) => x.hitoId);
    // v12.1: PetrIA cierra el 9 dic, VitalIA el 30 dic, W1 el 3 feb y AgrIA arranca el 19 feb (todo en el primer trimestre);
    // AgrIA cierra el 2 mar y queda en el segundo. Los hitos de idiomas (plan de 6 años archivado) y de clipping (pausado) se conservan en el mapa.
    expect(h).toHaveLength(33);
    expect(HITOS).toHaveLength(45);
    expect(h.filter((x) => x.rama === 'ingles').map((x) => x.hitoId)).toEqual(['ingles-83', 'ingles-41']);
    const fechas = h.map((x) => x.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
    expect(h[h.length - 1]).toMatchObject({ fecha: '2026-11-16', rama: 'main', hito: 'T+0' });
    expect(h.find((x) => x.hitoId === 'programacion-62')).toMatchObject({ fecha: '2026-12-30', rama: 'programacion', hitoTipo: 'grande' }); // VitalIA
    expect(h.find((x) => x.hitoId === 'programacion-34')).toMatchObject({ fecha: '2026-12-09' }); // PetrIA
    expect(h.find((x) => x.hitoId === 'programacion-13')).toMatchObject({ fecha: '2026-11-18' }); // P0 v1
    expect(h.find((x) => x.hitoId === 'programacion-77')).toMatchObject({ fecha: '2027-02-19', rama: 'programacion', desde: 'matematica' });
    expect(h.find((x) => x.hitoId === 'matematica-76')).toMatchObject({ fecha: '2027-02-03' });
    const t2 = filasMapa('2027-03-01', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16').filter((x) => x.hitoId);
    expect(t2.find((x) => x.hitoId === 'programacion-97')).toMatchObject({ fecha: '2027-03-02', hitoTipo: 'grande' });
    expect(h.filter((x) => x.rama === 'clipping').map((x) => x.hitoId).reverse()).toEqual(['clip-gta6', 'clip-usd-150', 'clip-dashboard-v1', 'clip-usd-350', 'clip-retainer-1', 'clip-usd-700']);
    expect(h.filter((x) => x.hitoTipo === 'grande')).toHaveLength(10);
    expect(f[0].hito).toBe('T+18');
    // Pausado (sin bloque asignado) los hitos del clipping no salen del mapa.
    setClippingActivo(false);
    const pausado = filasMapa('2026-11-15', 'trimestre', emptyPlan(), emptyStudy(), '2026-11-16').filter((x) => x.hitoId);
    expect(pausado.filter((x) => x.rama === 'clipping')).toHaveLength(0);
    expect(pausado).toHaveLength(h.length - 6);
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
