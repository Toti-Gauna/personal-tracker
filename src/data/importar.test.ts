import { beforeEach, describe, expect, it } from 'vitest';
import { aplicarImportacion } from '../state/importar';
import { getState, register, resetState } from '../state/store';
import { lineaDeClave, queCambia, validarImportacion } from './importar';
import { RAMA_COLOR } from './ramas';
import { unitState } from './study';

const COL = { ...RAMA_COLOR, rutina: 'var(--rutina)' };
const sesion = (over: Record<string, unknown> = {}) => JSON.stringify({
  tipo: 'sesion', rama: 'matematica', fecha: '2026-12-14', libro: 'CONAMAT · Aritmética', capitulo: 4, minutos: 120,
  test: { hechos: 30, correctos: 26 }, errores: [{ tema: 'divisibilidad', tipo: 'concepto', nota: 'criterio del 11' }],
  tarjetas_nuevas: [{ frente: '¿Cuándo es divisible por 11?', dorso: 'Suma alternada múltiplo de 11' }], ...over,
}, null, 2);

describe('validación del JSON importado', () => {
  it('acepta una sesión válida y detecta la rama', () => {
    const v = validarImportacion(sesion());
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.d).toMatchObject({ tipo: 'sesion', rama: 'matematica', capitulo: 4, test: { hechos: 30, correctos: 26 } });
  });

  it('un error de sintaxis dice la línea', () => {
    const t = '{\n  "tipo": "sesion",\n  "rama": "matematica"\n  "fecha": "2026-12-14"\n}';
    const v = validarImportacion(t);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error.linea).toBeGreaterThanOrEqual(3);
  });

  it('un campo mal dice la línea del campo', () => {
    const t = sesion({ test: { hechos: 30, correctos: 31 } });
    const v = validarImportacion(t);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.error.linea).toBe(lineaDeClave(t, 'correctos'));
      expect(v.error.mensaje).toMatch(/correctos/);
    }
    const f = validarImportacion(sesion({ fecha: '2026-02-30' }));
    expect(!f.ok && f.error.mensaje).toMatch(/AAAA-MM-DD/);
    const r = validarImportacion(sesion({ rama: 'handyx' }));
    expect(!r.ok && r.error.mensaje).toMatch(/matematica o programacion/);
    const e = validarImportacion(sesion({ errores: [{ tema: 'x', tipo: 'otro' }] }));
    expect(!e.ok && e.error.mensaje).toMatch(/concepto/);
  });

  it('sin "rama" usa la elegida si el tipo la permite', () => {
    const t = JSON.stringify({ tipo: 'entrevista', fecha: '2026-12-17', fallas: ['pausas largas'] });
    const v = validarImportacion(t, 'ingles');
    expect(v.ok && v.d.rama).toBe('ingles');
    expect(v.ok && v.detectada).toBe(false);
  });

  it('los otros tipos: revisión, examen, postulaciones y semana de Handyx', () => {
    expect(validarImportacion(JSON.stringify({ tipo: 'examen', rama: 'programacion', fecha: '2026-12-27', proyecto: 'P1', puntaje: 88 })).ok).toBe(true);
    expect(validarImportacion(JSON.stringify({ tipo: 'examen', rama: 'programacion', fecha: '2026-12-27', proyecto: 'P99', puntaje: 88 })).ok).toBe(false);
    expect(validarImportacion(JSON.stringify({ tipo: 'revision', rama: 'programacion', fecha: '2026-12-11', proyecto: 'P1', hallazgos: [{ texto: 'falta timeout', tipo: 'tecnica' }] })).ok).toBe(true);
    expect(validarImportacion(JSON.stringify({ tipo: 'postulaciones', rama: 'trabajo', fecha: '2026-12-11', lista: [{ rol: 'Backend', estado: 'respuesta' }] })).ok).toBe(true);
    expect(validarImportacion(JSON.stringify({ tipo: 'semana', rama: 'handyx', fecha: '2026-12-14' })).ok).toBe(false);
  });
});

describe('importar', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', '2026-11-16');
  });

  it('una sesión guarda el test, agenda la tesis, suma tarjetas, horas y el commit del mapa', () => {
    const v = validarImportacion(sesion());
    if (!v.ok) throw new Error('inválido');
    const cambios = queCambia(v.d, getState().study, COL).map((c) => c.titulo);
    expect(cambios[0]).toBe('Test del cap. 4 · 87 %');
    expect(cambios).toContain('1 punto débil · divisibilidad');
    const antes = getState().study.cards.length;
    aplicarImportacion(v.d, '2026-12-14', COL);
    const s = getState();
    expect(unitState(s.study, 'conamat', 4).approvedOn).toBe('2026-12-14');
    expect(s.study.reviews.some((r) => r.activityId === 'conamat' && r.unit === 4 && r.kind === 'tesis')).toBe(true);
    expect(s.study.cards.length).toBe(antes + 2);
    expect(s.plan.contadores['2026-12-14']['horas-mate']).toBe(2);
    expect(s.plan.importaciones).toHaveLength(1);
    expect(s.plan.eventos.at(-1)).toMatchObject({ rama: 'matematica', texto: 'Aritmética 4 de 11' });
  });

  it('un examen cierra el proyecto y las postulaciones suman al embudo', () => {
    const ex = validarImportacion(JSON.stringify({ tipo: 'examen', rama: 'programacion', fecha: '2026-12-27', proyecto: 'P1', puntaje: 88 }));
    if (ex.ok) aplicarImportacion(ex.d, '2026-12-27', COL);
    expect(getState().plan.proyectos.P1.examen).toEqual({ fecha: '2026-12-27', puntaje: 88 });
    const po = validarImportacion(JSON.stringify({ tipo: 'postulaciones', rama: 'trabajo', fecha: '2026-12-15', lista: [{ rol: 'Backend' }, { rol: 'ML', estado: 'respuesta' }], mensajes: 5 }));
    if (po.ok) aplicarImportacion(po.d, '2026-12-15', COL);
    const p = getState().plan;
    expect(p.postulaciones.map((x) => x.estado)).toEqual(['enviada', 'respuesta']);
    expect(p.contadores['2026-12-14']).toMatchObject({ postulaciones: 2, mensajes: 5 });
  });
});
