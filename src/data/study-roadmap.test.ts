import { beforeEach, describe, expect, it } from 'vitest';
import raw from '../../data/study-roadmaps.json';
import { getState, migrate, register, resetState } from '../state/store';
import { cerrarFase, reabrirFase, toggleCriterio } from '../state/estudio-ruta';
import { completeLearn, saveTest } from '../state/study';
import { DEFAULT_ACTIVITIES } from './study-catalog';
import {
  dondeEstas, estadoFases, evidencia, mesesRestantes, paraActivar, porRol, roadmapPorId, semaforo, STUDY_ROADMAPS, validar,
  type ProgresoRoadmap, type StudyRoadmaps,
} from './study-roadmap';

const mate = roadmapPorId('matematica')!;
const fase = (id: string) => mate.fases.find((f) => f.id === id)!;
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
const copia = () => structuredClone(raw) as unknown as StudyRoadmaps;

describe('data/study-roadmaps.json', () => {
  it('es válido', () => {
    expect(validar(raw)).toEqual([]);
  });

  it('matemática tiene las fases M0 a M10, cada una con su perfil y un libro núcleo', () => {
    expect(mate.fases.map((f) => f.id)).toEqual(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10']);
    expect(new Set(mate.fases.map((f) => f.perfil)).size).toBe(11);
    expect(fase('M1').perfil).toBe('Aritmético');
    for (const f of mate.fases) expect(f.materiales.some((m) => m.rol === 'nucleo')).toBe(true);
  });

  it('M1 arranca con CONAMAT y sigue con Serge Lang; Baldor es banco, no núcleo', () => {
    const nucleos = fase('M1').materiales.filter((m) => m.rol === 'nucleo').map((m) => m.id);
    expect(nucleos).toEqual(['conamat', 'lang-basic']);
    expect(fase('M1').materiales.find((m) => m.id === 'baldor')!.rol).toBe('banco');
  });

  it('Stewart Calculus no se repite: se divide entre M3 (Cálculo I) y M5 (Cálculo II)', () => {
    const m3 = fase('M3').materiales.find((m) => m.id === 'stewart-calc')!;
    const m5 = fase('M5').materiales.find((m) => m.id === 'stewart-calc')!;
    expect([m3.parte, m5.parte]).toEqual(['Cálculo I', 'Cálculo II y multivariable']);
  });

  it('las actividades que dan evidencia existen en Estudio', () => {
    const ids = DEFAULT_ACTIVITIES.map((a) => a.id);
    for (const f of mate.fases) if (f.actividad) expect(ids).toContain(f.actividad);
  });

  it('los años apuntan a fases que existen', () => {
    expect(mate.anios.map((a) => a.anio)).toEqual([1, 2, 3]);
    expect(STUDY_ROADMAPS).toHaveLength(1);
  });
});

describe('validar', () => {
  it('marca un bloque cuyo núcleo no está en la fase', () => {
    const d = copia();
    d.roadmaps[0].fases[2].bloques![0].nucleo = 'no-existe';
    expect(validar(d).join()).toMatch(/M2: el bloque "Funciones y gráficas" apunta a un núcleo/);
  });

  it('marca un semáforo invertido, una fase sin núcleo y un año con una fase que no existe', () => {
    const d = copia();
    d.roadmaps[0].semaforo.amarillo = 0.9;
    d.roadmaps[0].fases[0].materiales = d.roadmaps[0].fases[0].materiales.map((m) => ({ ...m, rol: 'banco' as const }));
    d.roadmaps[0].anios[0].fases.push('M99');
    const e = validar(d).join('\n');
    expect(e).toMatch(/semáforo inválido/);
    expect(e).toMatch(/M0: sin libro núcleo/);
    expect(e).toMatch(/fase que no existe \(M99\)/);
  });

  it('marca ids de fase repetidos y un rol desconocido', () => {
    const d = copia();
    d.roadmaps[0].fases[1].id = 'M0';
    (d.roadmaps[0].fases[3].materiales[0] as { rol: string }).rol = 'libro';
    const e = validar(d).join('\n');
    expect(e).toMatch(/M0: id vacío o repetido/);
    expect(e).toMatch(/rol desconocido \(libro\)/);
  });
});

describe('semáforo y qué activar', () => {
  it('80 % o más avanza, de 65 a 79 % activa complementario y debajo de 65 % vuelve', () => {
    expect(semaforo(0.8, mate)).toBe('verde');
    expect(semaforo(0.79, mate)).toBe('amarillo');
    expect(semaforo(0.65, mate)).toBe('amarillo');
    expect(semaforo(0.64, mate)).toBe('rojo');
  });

  it('falla de técnica → banco de ejercicios; de concepto → complementario y después curso', () => {
    expect(paraActivar(mate, fase('M1'), 'tecnica').map((m) => m.id)).toEqual(['baldor', 'humongous']);
    expect(paraActivar(mate, fase('M2'), 'concepto').map((m) => m.id)).toEqual(['gelfand-func', 'gelfand-trig', 'khan-m2']);
    expect(paraActivar(mate, fase('M1'), 'descuido')).toEqual([]);
  });

  it('nunca propone el libro núcleo y agrupa por rol en orden', () => {
    for (const f of mate.fases) for (const k of ['concepto', 'tecnica', 'enunciado', 'profundidad'] as const) {
      expect(paraActivar(mate, f, k).some((m) => m.rol === 'nucleo')).toBe(false);
    }
    expect(porRol(fase('M1')).map(([r]) => r)).toEqual(['nucleo', 'banco', 'curso']);
  });
});

describe('dónde estás', () => {
  it('sin progreso: estás en M0, sin perfil todavía', () => {
    const d = dondeEstas(mate);
    expect(d).toMatchObject({ perfil: null, proximo: 'Estudiante con método', cerradas: 0, total: 11, terminado: false });
    expect(d.actual!.id).toBe('M0');
    // Sumando las duraciones de tu texto da 45 a 57 meses; el cronograma por años habla de 33 (las fases se solapan).
    expect(mesesRestantes(mate)).toEqual([45, 57]);
  });

  it('con M0 y M1 cerradas sos Aritmético y vas por M2', () => {
    const p: ProgresoRoadmap = { salida: { M2: [0, 2, 99] }, cerradas: { M0: '2026-11-20', M1: '2027-04-01' } };
    expect(dondeEstas(mate, p)).toMatchObject({ perfil: 'Aritmético', proximo: 'Precalculista', cerradas: 2 });
    const e = estadoFases(mate, p);
    expect(e.map((x) => x.estado).slice(0, 4)).toEqual(['cerrada', 'cerrada', 'actual', 'proxima']);
    // El índice 99 no existe: no cuenta.
    expect(e[2].criterios).toEqual({ hechos: 2, total: 6 });
    expect(e[2].lista).toBe(false);
  });
});

describe('progreso guardado', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });
  const prog = () => getState().estudioRuta.matematica;

  it('una fase se cierra solo con todos sus criterios y en orden', () => {
    expect(cerrarFase('matematica', 'M0', '2026-11-20')).toBe(false);
    toggleCriterio('matematica', 'M0', 0);
    expect(cerrarFase('matematica', 'M0', '2026-11-20')).toBe(false);
    toggleCriterio('matematica', 'M0', 1);
    // M1 no es la actual todavía.
    for (let i = 0; i < fase('M1').salida.length; i++) toggleCriterio('matematica', 'M1', i);
    expect(cerrarFase('matematica', 'M1', '2026-11-20')).toBe(false);
    expect(cerrarFase('matematica', 'M0', '2026-11-20')).toBe(true);
    expect(cerrarFase('matematica', 'M1', '2027-04-01')).toBe(true);
    expect(dondeEstas(mate, prog()).perfil).toBe('Aritmético');
    reabrirFase('matematica');
    expect(dondeEstas(mate, prog())).toMatchObject({ perfil: 'Estudiante con método', proximo: 'Aritmético' });
  });

  it('destildar un criterio lo saca', () => {
    toggleCriterio('matematica', 'M1', 3);
    toggleCriterio('matematica', 'M1', 1);
    toggleCriterio('matematica', 'M1', 3);
    expect(prog().salida.M1).toEqual([1]);
  });

  it('la evidencia de M1 son los capítulos aprobados de CONAMAT', () => {
    expect(evidencia(fase('M1'), getState().study)).toEqual({ hechos: 0, total: 11 });
    completeLearn('2026-11-16', 'conamat', 1);
    saveTest('2026-11-17', 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    expect(evidencia(fase('M1'), getState().study)).toEqual({ hechos: 1, total: 11 });
    expect(evidencia(fase('M2'), getState().study)).toBeNull();
  });

  it('un estado guardado antes de la ola 12 arranca sin progreso', () => {
    const s = migrate({ settings: null, days: {} });
    expect(s.estudioRuta).toEqual({});
  });
});
