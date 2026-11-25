import { describe, expect, it } from 'vitest';
import raw from '../../data/plan-extendido.json';
import studyRaw from '../../data/study-roadmaps.json';
import { PLAN, aplicarCalendario } from './plan';
import { PLAN_EXT, validar, type PlanExtendido } from './plan-extendido';
import { emptyPlan, proyectoVacio } from './plan-state';
import { alertaVerificar, alertaVersion, alertas, calendarioCompleto, estadoEn, hoySos, lineaEtapas, perfilMate, refuerzoPara, rutaMate, semaforoPuerta } from './plan-vistas';

const T0 = '2026-11-16';
const copia = () => structuredClone(raw) as unknown as PlanExtendido;

describe('fichas, ventanas y certificaciones (ola 16c)', () => {
  it('v12.1: los 29 proyectos tienen ficha con perfil (con P0B y P1V0); las 12 ventanas, libro principal; las 12 cert windows, sus certificaciones', () => {
    expect(validar(raw)).toEqual([]);
    const bs = PLAN_EXT.bloques;
    expect(bs.filter((b) => b.tipo === 'proyecto' && b.ficha?.perfil)).toHaveLength(29);
    expect(bs.filter((b) => b.tipo === 'ventana' && b.mate?.principal.length)).toHaveLength(12);
    // Las certificaciones van agrupadas en cert windows (CW1…CW12), cada una con sus certs (las C1…C13 de la v7 quedan archivadas).
    const cw = bs.filter((b) => b.tipo === 'cert');
    expect(cw.map((b) => b.id)).toEqual(['CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7', 'CW8', 'CW9', 'CW10', 'CW11', 'CW12']);
    expect(cw.every((b) => b.certs?.length)).toBe(true);
    expect(bs.find((b) => b.id === 'CW1')!.certs!.map((c) => c.id)).toEqual(['claude-architect', 'gh-foundations']);
    expect(bs.find((b) => b.id === 'CW6')!.certs!.map((c) => c.id)).toEqual(['secplus', 'ghas']);
    // Renovación: la validez habitual del proveedor, "a verificar".
    expect(bs.find((b) => b.id === 'CW1')!.certs![1].renovacion).toMatchObject({ anos: 3, nota: 'usual validity (to verify)' });
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
  it('v12.4: solo ventanas (los tramos diarios m1–m4 están archivados), de W1 a la última de aeroespacial, en orden y sin solaparse', () => {
    const r = rutaMate(T0);
    expect(r.map((x) => x.id)).toEqual(['W1', 'W2', 'W3', 'W4', 'WQ1', 'WQ2', 'WQ3', 'WA1', 'WA2', 'WA3', 'WA4', 'WA5']);
    expect(r.every((x) => x.tipo === 'ventana')).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i].inicio > r[i - 1].fin).toBe(true);
    expect(r[0]).toMatchObject({ inicio: '2027-01-28', fin: '2027-02-21', horas: 206, habilita: ['P3'], perfil: 'Algebraico', principal: ['Conamat "Matemáticas simplificadas"'] });
    expect(r.find((x) => x.id === 'W2')).toMatchObject({ inicio: '2027-07-12', fin: '2027-08-05', horas: 205, habilita: ['P6'] });
    expect(r.find((x) => x.id === 'WA5')).toMatchObject({ etapa: 4, habilita: ['A5', 'A6'] });
  });

  it('los libros del calendario vivo son los de la v12.1', () => {
    expect(PLAN.matematica.tramos.find((m) => m.id === 'W1')!.libros).toEqual(['Conamat "Matemáticas simplificadas"']);
    expect(PLAN.matematica.tramos.find((m) => m.id === 'W4')!.libros).toEqual(['Silverman, A Friendly Introduction to Number Theory', 'Aumasson, Serious Cryptography']);
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
    expect(perfilMate(r, '2026-11-20', emptyPlan())).toMatchObject({ sos: null, vasASer: 'Algebraico' });
    // W1 pasó sin aprobar la puerta: no sos Algebraico todavía.
    expect(perfilMate(r, '2027-03-16', emptyPlan())).toMatchObject({ sos: null, vasASer: 'Calculista' });
    const p = { ...emptyPlan(), proyectos: { W1: { ...proyectoVacio(), examen: { fecha: '2027-02-03', puntaje: 88 } } } };
    expect(perfilMate(r, '2027-03-16', p).sos).toBe('Algebraico');
    expect(estadoEn(r[0], '2026-11-16')).toBe('proximo');
    expect(estadoEn(r[0], '2027-01-20')).toBe('proximo');
    expect(estadoEn(r[0], '2027-02-01')).toBe('actual');
    expect(estadoEn(r[0], '2027-02-22')).toBe('hecho');
  });
});

describe('v12.1 · Security+ sin versión fija: se rinde la versión vigente al reservar', () => {
  it('Security+ va en la Cert window 6 sin versiones del roadmap: no hay aviso de versión ni de verificación', () => {
    const cw6 = calendarioCompleto(T0).find((b) => b.id === 'CW6')!;
    expect(cw6).toMatchObject({ inicio: '2027-06-05', fin: '2027-06-16' });
    expect(cw6.cert).toBeUndefined();
    expect(alertaVersion(cw6, emptyPlan(), '2026-11-18')).toBeNull();
    expect(alertaVerificar(cw6, emptyPlan(), '2026-11-21')).toBeNull();
    for (const f of ['2026-11-18', '2026-11-21', '2027-05-25']) expect(alertas(f, emptyPlan(), T0).some((x) => /^(ver|verif|dec)-/.test(x.id))).toBe(false);
  });
});

describe('etapas, hoy sos y alertas', () => {
  it('cuatro etapas con sus semanas de calendario (52, 13, 21 y 30: cada bloque cuenta al menos una) y la actual marcada', () => {
    const e = lineaEtapas('2027-03-01', T0);
    expect(e.map((x) => x.semanas)).toEqual([52, 13, 21, 30]);
    expect(e.map((x) => x.estado)).toEqual(['actual', 'proximo', 'proximo', 'proximo']);
    // Las fechas de las 4 etapas de la v12.4 (el fin de cada una es un absorbedor de 3 días).
    expect(e.map((x) => x.fin)).toEqual(['2027-11-03', '2028-01-21', '2028-05-31', '2028-12-14']);
    expect(e[3]).toMatchObject({ perfil: 'GNC / Mission Software Engineer' });
  });

  it('hoy sos: el último proyecto cerrado; vas a ser: el que sigue', () => {
    const p = emptyPlan();
    expect(hoySos('2026-11-17', p, T0)).toMatchObject({ sos: null, vasASer: { perfil: 'Sr Full-stack → AI Engineer (RAG multifuente y agentes)' } });
    // P0 v1 (16 a 18 nov) ya pasó por fechas pero no se cerró: vas a ser lo de PetrIA (21 nov a 12 dic).
    expect(hoySos('2026-11-21', p, T0)).toMatchObject({ sos: null, vasASer: { perfil: 'Full-stack AI Engineer (energía)', con: 'P1 · PetrIA', fin: '2026-12-12' } });
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-18', puntaje: 90 }, evidencia: { medido: true, validador: true, informe: true } };
    expect(hoySos('2026-11-30', p, T0)).toMatchObject({ sos: { perfil: 'Sr Full-stack → AI Engineer (RAG multifuente y agentes)' }, vasASer: { perfil: 'Full-stack AI Engineer (energía)' } });
  });

  it('alertas: una cert window que se acerca y una ventana que cierra', () => {
    const a = alertas('2026-11-16', emptyPlan(), T0);
    expect(a.find((x) => x.id === 'cert-CW1')).toMatchObject({ titulo: 'Cert window 1 empieza el 13 dic 2026' });
    expect(a.find((x) => x.id === 'cert-CW1')!.texto).toMatch(/reconfirmá precio y versión al reservar/);
    expect(alertas('2027-02-15', emptyPlan(), T0).find((x) => x.id === 'vent-W1')).toMatchObject({ titulo: 'W1 cierra el 21 feb 2027' });
    const aprobada = { ...emptyPlan(), proyectos: { W1: { ...proyectoVacio(), examen: { fecha: '2027-02-12', puntaje: 90 } } } };
    expect(alertas('2027-02-15', aprobada, T0).some((x) => x.id === 'vent-W1')).toBe(false);
  });

  it('apagar la pausa se refleja también en las etapas 3 y 4', () => {
    try {
      aplicarCalendario([], false);
      // v12.4: las fechas son explícitas; sin la pausa de dic 2027, la etapa 4 termina igual el 14 dic 2028.
      expect(lineaEtapas('2027-03-01', T0)[3].fin).toBe('2028-12-14');
    } finally {
      aplicarCalendario([]);
    }
  });
});
