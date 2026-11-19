import { describe, expect, it } from 'vitest';
import raw from '../../data/plan-extendido.json';
import studyRaw from '../../data/study-roadmaps.json';
import { PLAN, aplicarCalendario } from './plan';
import { PLAN_EXT, validar, type PlanExtendido } from './plan-extendido';
import { emptyPlan, proyectoVacio } from './plan-state';
import { alertaVersion, alertas, calendarioCompleto, estadoEn, hoySos, lineaEtapas, perfilMate, refuerzoPara, rutaMate, semaforoPuerta } from './plan-vistas';

const T0 = '2026-11-16';
const copia = () => structuredClone(raw) as unknown as PlanExtendido;

describe('fichas, ventanas y certificaciones (ola 16c)', () => {
  it('los 27 proyectos tienen ficha con perfil; las 12 ventanas, libro principal; las 7 certificaciones, costo y verificación', () => {
    expect(validar(raw)).toEqual([]);
    const bs = PLAN_EXT.bloques;
    expect(bs.filter((b) => b.tipo === 'proyecto' && b.ficha?.perfil)).toHaveLength(27);
    expect(bs.filter((b) => b.tipo === 'ventana' && b.mate?.principal.length)).toHaveLength(12);
    expect(bs.filter((b) => b.tipo === 'cert' && b.cert)).toHaveLength(7);
    // Lo que no está verificado queda así.
    expect(bs.filter((b) => b.cert && !b.cert.verificado).map((b) => b.id)).toEqual(['C1', 'C3', 'C5']);
    expect(bs.find((b) => b.id === 'C6')!.cert).toMatchObject({ costo: 'US$ 445', requiere: 'C5' });
  });

  it('el validador marca un proyecto sin ficha, una ventana que habilita algo que va antes y un perfil de hito roto', () => {
    const d = copia();
    delete d.bloques.find((b) => b.id === 'P4')!.ficha;
    d.bloques.find((b) => b.id === 'W2')!.mate!.habilita = ['P1'];
    d.perfilesHito.push({ despues: 'X9', perfil: 'x', nota: '' });
    const e = validar(d).join('\n');
    expect(e).toMatch(/P4: proyecto sin ficha/);
    expect(e).toMatch(/W2: habilita P1, que va antes/);
    expect(e).toMatch(/el bloque X9 no existe/);
  });

  it('las fases M0 a M10 que dan refuerzo existen en el roadmap de estudio', () => {
    const fases = new Set(studyRaw.roadmaps[0].fases.map((f) => f.id));
    const usadas = [...PLAN_EXT.bloques.map((b) => b.mate?.fase), ...Object.values(PLAN_EXT.matematica.diarios).map((m) => m.fase)].filter(Boolean);
    for (const f of usadas) expect(fases.has(f!)).toBe(true);
  });
});

describe('matemática: un solo roadmap (absorbe la ola 15)', () => {
  it('va de T+0 a la última ventana de aeroespacial, en orden y sin solaparse', () => {
    const r = rutaMate(T0);
    // v3: los tramos diarios se miden en horas de matemática y se pausan durante cada ventana: una ventana cae dentro del rango de un diario.
    expect(r.map((x) => x.id)).toEqual(['m1', 'W1', 'm2', 'W2', 'm3', 'm4', 'W3', 'W4', 'WQ1', 'WQ2', 'WQ3', 'WA1', 'WA2', 'WA3', 'WA4', 'WA5']);
    const diarios = r.filter((x) => x.tipo === 'diario');
    for (let i = 1; i < diarios.length; i++) expect(diarios[i].inicio > diarios[i - 1].fin).toBe(true);
    const ventanas = r.filter((x) => x.tipo === 'ventana');
    for (let i = 1; i < ventanas.length; i++) expect(ventanas[i].inicio > ventanas[i - 1].fin).toBe(true);
    expect(r[0]).toMatchObject({ tipo: 'diario', inicio: '2026-11-16', horas: 126, perfil: 'Aritmético', principal: ['CONAMAT Aritmética', 'CONAMAT Álgebra'] });
    // T+0 a T+2 (126 h) termina en marzo de 2027; T+3 a T+6 (196 h), en julio.
    expect(r.find((x) => x.id === 'm1')!.fin).toBe('2027-03-10');
    expect(r.find((x) => x.id === 'm2')).toMatchObject({ inicio: '2027-03-11', fin: '2027-07-22', horas: 196 });
    expect(r.find((x) => x.id === 'W1')).toMatchObject({ inicio: '2027-01-06', fin: '2027-01-31', habilita: ['P3'], perfil: 'Algebraico' });
    expect(r.find((x) => x.id === 'WA5')).toMatchObject({ etapa: 4, habilita: ['A5', 'A6'] });
  });

  it('los libros del calendario vivo son los del prompt', () => {
    expect(PLAN.matematica.tramos.find((m) => m.id === 'm1')!.libros).toEqual(['CONAMAT Aritmética', 'CONAMAT Álgebra']);
    expect(PLAN.matematica.tramos.find((m) => m.id === 'W4')!.libros).toEqual(['Lehman, Leighton y Meyer · Mathematics for Computer Science']);
  });

  it('las puertas salen del plan: W1 → P3, W2 → P6, W3 → P8 y W4 → S1', () => {
    expect(PLAN.programacion.puertas).toEqual({ W1: 'P3', W2: 'P6', W3: 'P8', W4: 'S1' });
  });

  it('semáforo 85 / 65', () => {
    expect([semaforoPuerta(0.85), semaforoPuerta(0.84), semaforoPuerta(0.65), semaforoPuerta(0.64)]).toEqual(['verde', 'amarillo', 'amarillo', 'rojo']);
  });

  it('el refuerzo se abre según el tipo de error: concepto → intuición, técnica → banco, profundidad → libro duro', () => {
    const w2 = rutaMate(T0).find((x) => x.id === 'W2')!;
    expect(refuerzoPara(w2, 'concepto').map((r) => r.titulo)).toEqual(['3Blue1Brown', 'MIT 18.01SC']);
    expect(refuerzoPara(w2, 'tecnica').map((r) => r.titulo)).toEqual(['Stewart · Calculus']);
    expect(refuerzoPara(w2, 'profundidad').map((r) => r.titulo)).toEqual(['Strang cap. 1 a 3', 'Parr y Howard · Matrix Calculus']);
    expect(refuerzoPara(w2, 'descuido')).toEqual([]);
  });

  it('hoy sos / vas a ser en matemática; una ventana sin la puerta aprobada no cuenta', () => {
    const r = rutaMate(T0);
    expect(perfilMate(r, '2026-11-20', emptyPlan())).toMatchObject({ sos: null, vasASer: 'Aritmético' });
    expect(perfilMate(r, '2027-03-16', emptyPlan())).toMatchObject({ sos: 'Aritmético', vasASer: 'Precalculista' });
    const p = { ...emptyPlan(), proyectos: { W1: { ...proyectoVacio(), examen: { fecha: '2027-02-20', puntaje: 88 } } } };
    expect(perfilMate(r, '2027-03-16', p).sos).toBe('Algebraico');
    expect(estadoEn(r[0], '2026-11-16')).toBe('actual');
  });
});

describe('ola 24 · alerta de versión de examen (Security+)', () => {
  // Con el calendario por horas el examen de Security+ cae el 31 may 2027, antes del retiro de la SY0-701 en inglés (11 jun 2027): no hay alerta.
  it('con el examen antes del retiro no avisa; si el examen se corre después del retiro, avisa (sin elegir, y con la 701 en inglés)', () => {
    expect(alertas('2026-11-18', emptyPlan(), T0).some((x) => x.id === 'ver-C2')).toBe(false);
    const c2 = calendarioCompleto(T0).find((b) => b.id === 'C2')!;
    expect(c2.fin).toBe('2027-05-31');
    const tarde = { ...c2, fin: '2027-08-01' };
    const a = alertaVersion(tarde, emptyPlan(), '2026-11-18')!;
    expect(a).toMatchObject({ tipo: 'cert', titulo: 'Decisión el 22 nov 2026: versión de CompTIA Security+' });
    expect(a.texto).toMatch(/SY0-701 en inglés ya está retirada/);
    expect(a.texto).toMatch(/Sirven: SY0-701 en español o SY0-801/);
    expect(alertaVersion(tarde, { ...emptyPlan(), versionCert: { C2: 'SY0-801' } }, '2026-11-18')).toBeNull();
    expect(alertaVersion(tarde, { ...emptyPlan(), versionCert: { C2: 'SY0-701-en' } }, '2026-11-18')!.titulo).toBe('SY0-701 en inglés se retira el 11 jun 2027, antes de tu examen (1 ago 2027)');
    // Después del examen no avisa más.
    expect(alertaVersion(tarde, { ...emptyPlan(), versionCert: { C2: 'SY0-701-en' } }, '2027-08-02')).toBeNull();
  });
});

describe('etapas, hoy sos y alertas', () => {
  it('cuatro etapas con sus semanas del plan (79, 29, 47 y 65, con las pausas) y la actual marcada', () => {
    const e = lineaEtapas('2027-03-01', T0);
    expect(e.map((x) => x.semanas)).toEqual([79, 29, 47, 65]);
    expect(e.map((x) => x.estado)).toEqual(['actual', 'proximo', 'proximo', 'proximo']);
    // Etapa 1 termina el 31 ene 2028, la 2 el 25 jul 2028, la 3 el 6 may 2029 y la 4 el 2 jun 2030 (con el inicio del trabajo el 11 ene 2027).
    expect(e.map((x) => x.fin)).toEqual(['2028-01-31', '2028-07-25', '2029-05-06', '2030-06-02']);
    expect(e[3]).toMatchObject({ perfil: 'Aerospace Software Engineer' });
  });

  it('hoy sos: el último proyecto cerrado; vas a ser: el que sigue', () => {
    const p = emptyPlan();
    expect(hoySos('2026-11-20', p, T0)).toMatchObject({ sos: null, vasASer: { perfil: 'Sr Full-stack con IA aplicada' } });
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-21', puntaje: 90 }, evidencia: { medido: true, validador: true, informe: true } };
    expect(hoySos('2026-11-30', p, T0)).toMatchObject({ sos: { perfil: 'Sr Full-stack con IA aplicada' }, vasASer: { perfil: 'Full-stack AI Engineer' } });
  });

  it('alertas: la decisión de Security+, una certificación que se acerca y una ventana que cierra', () => {
    const a = alertas('2026-11-16', emptyPlan(), T0);
    // Con el examen el 31 may 2027 (antes del retiro de la SY0-701 en inglés) la alerta de versión no hace falta: queda la de la decisión.
    expect(a.some((x) => x.id === 'ver-C2')).toBe(false);
    expect(a.find((x) => x.id === 'dec-secplus')).toMatchObject({ titulo: 'Decisión el 22 nov 2026' });
    expect(alertas('2026-11-16', { ...emptyPlan(), versionCert: { C2: 'SY0-801' } }, T0).find((x) => x.tipo === 'decision')).toMatchObject({ titulo: 'Decisión el 22 nov 2026' });
    const c1 = alertas('2027-03-08', emptyPlan(), T0).find((x) => x.id === 'cert-C1')!;
    expect(c1.texto).toMatch(/Costo sin verificar/);
    expect(alertas('2027-01-28', emptyPlan(), T0).find((x) => x.id === 'vent-W1')).toMatchObject({ titulo: 'W1 cierra el 31 ene 2027' });
    const aprobada = { ...emptyPlan(), proyectos: { W1: { ...proyectoVacio(), examen: { fecha: '2027-01-25', puntaje: 90 } } } };
    expect(alertas('2027-01-28', aprobada, T0).some((x) => x.id === 'vent-W1')).toBe(false);
  });

  it('apagar extras se refleja también en las etapas 3 y 4', () => {
    try {
      aplicarCalendario(['P1']);
      // Dos semanas del plan menos (49 h): todo lo que sigue se corre hacia atrás.
      expect(lineaEtapas('2027-03-01', T0)[3].fin < '2030-06-02').toBe(true);
    } finally {
      aplicarCalendario([]);
    }
  });
});
