import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import raw from '../../data/plan-extendido.json';
import { PLAN_EXT, calendario, totalSemanas, validar, type PlanExtendido } from './plan-extendido';
import { TRAMOS } from './plan';

const copia = () => structuredClone(raw) as unknown as PlanExtendido;
const bloque = (id: string, d: PlanExtendido = PLAN_EXT) => d.bloques.find((b) => b.id === id)!;
const nombres = (id: string) => bloque(id).tecnologias!.map((t) => t.nombre);
const marca = (id: string, n: string) => bloque(id).tecnologias!.find((t) => t.nombre === n);

describe('ola 30 · tecnologías de los proyectos (salen del stack del roadmap v7)', () => {
  it('el JSON valida y cada proyecto lleva sus tecnologías; el calendario por semanas (sin horas, v12.1 con fechas explícitas) suma 108', () => {
    expect(validar(raw)).toEqual([]);
    // v12.4: los bloques llevan fechas explícitas (21 nov 2026 a 14 dic 2028); cada uno cuenta al menos 1 semana.
    // Semanas base de las 4 etapas (47 + 10 + 22 + 28 = 107) más la semana de pausa del 20 al 26 dic 2027.
    expect(totalSemanas(calendario())).toBe(108);
    expect(PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto').every((b) => Array.isArray(b.tecnologias))).toBe(true);
    // El stack ya no vive en data/plan.json: sale de las tecnologías.
    // (se lee del archivo: el módulo `plan` muta su copia al armar el calendario vivo).
    const enDisco = JSON.parse(readFileSync(join(__dirname, '../../data/plan.json'), 'utf8')) as { programacion: { tramos: { stack?: string[] }[] } };
    expect(enDisco.programacion.tramos.some((t) => t.stack)).toBe(false);
    expect(TRAMOS.find((t) => t.id === 'P1')!.stack).toEqual(nombres('P1'));
  });

  it('PetrIA: cada tecnología con su ambiente; la † queda como "a confirmar"; las frases del roadmap no son tecnologías', () => {
    expect(nombres('P1')).toEqual(expect.arrayContaining(['Next.js', 'MapLibre GL', 'Java', 'Spring Boot', 'Node.js', 'NestJS', 'LangGraph', 'Claude', 'pgvector', 'PostGIS', 'RabbitMQ', 'MQTT', 'AWS']));
    expect(marca('P1', 'Spring Boot')).toMatchObject({ ambiente: 'Backend', alias: ['spring'] });
    expect(marca('P1', 'LightGBM')).toMatchObject({ opcional: true, nota: 'propuesta a confirmar (†)', ambiente: 'ML propio' });
    expect(marca('P1', 'AWS')).toMatchObject({ nota: 'S3, SQS, Lambda, SES', ambiente: 'Cloud' });
    for (const frase of ['sistema de diseño', 'router', 'idempotencia', '6 servicios']) expect(nombres('P1')).not.toContain(frase);
    // Sin marcas de la v2.1: nada es "nueva" ni "movida" en el stack v7.
    expect(PLAN_EXT.bloques.some((b) => b.tecnologias?.some((t) => t.marca))).toBe(false);
  });

  it('Constelación: la v1 (P0) lleva frontend e infra; LangGraph, FastAPI y SES son de la 2.0 y la 2.1 (P0B)', () => {
    expect(nombres('P0')).toEqual(['Next.js', 'TypeScript', 'Three.js', 'Module Federation', 'platform-kit']);
    expect(nombres('P0B')).toEqual(expect.arrayContaining(['LangGraph', 'FastAPI', 'Neon', 'SES', 'Vercel']));
    expect(nombres('A6')).toEqual([]); // "el de cada proyecto"
  });

  it('los alias que buscan las vacantes se conservan aunque la tecnología cambie de proyecto', () => {
    expect(marca('P5', 'Kubernetes')!.alias).toContain('k8s');
    expect(marca('P1', 'Next.js')!.alias).toEqual(['nextjs', 'next js']);
    expect(marca('P2', 'C#')!.alias).toContain('csharp');
  });

  it('el historial guarda los cambios de la v2.1 y suma el del stack v7; las listas de recortes ya no están', () => {
    const v21 = (id: string) => (bloque(id).historial ?? []).filter((h) => h.fecha === '2026-11-18');
    expect(PLAN_EXT.bloques.filter((b) => v21(b.id).length).map((b) => b.id)).toEqual(['P0', 'P1', 'P2', 'P3', 'P5', 'P8']);
    for (const b of PLAN_EXT.bloques.filter((x) => x.tipo === 'proyecto' && x.tecnologias!.length)) expect(b.historial!.some((h) => h.motivo === 'Roadmap v7 (stack)'), b.id).toBe(true);
    expect(bloque('P1').historial!.find((h) => h.motivo === 'Roadmap v7')!.cambio).toBe('Pasa a llamarse PetrIA (antes Faro v1 · petróleo); horas: antes 122 h, ahora ≈ 304 h');
    expect(PLAN_EXT.bloques.some((b) => b.recortarPrimero)).toBe(false);
  });

  it('descartado por ahora: Django, Supabase, CRM/ERP y APIs de bolsa, con motivo, y no entran a ningún proyecto', () => {
    expect(PLAN_EXT.descartadas!.map((d) => d.nombre)).toEqual(['Django', 'Supabase', 'CRM/ERP', 'APIs de bolsa']);
    expect(PLAN_EXT.descartadas!.every((d) => d.motivo.length > 10)).toBe(true);
    const d = copia();
    bloque('P1', d).tecnologias!.push({ nombre: 'Supabase para el login' });
    expect(validar(d).join(' ')).toMatch(/P1: Supabase para el login está descartada por ahora \(Supabase\)/);
  });
});

describe('ola 26 · el validador de tecnologías (sigue valiendo para lo que se cargue a mano)', () => {
  it('rechaza una tecnología repetida dentro de un proyecto (sin importar mayúsculas ni tildes)', () => {
    const d = copia();
    bloque('P3', d).tecnologias!.push({ nombre: 'SCIKIT-LEARN' }, { nombre: 'Mlflow' });
    const e = validar(d);
    expect(e).toContain('P3: tecnología repetida (SCIKIT-LEARN)');
    expect(e).toContain('P3: tecnología repetida (Mlflow)');
  });

  it('rechaza más de una tecnología nueva por proyecto', () => {
    const d = copia();
    bloque('P1', d).tecnologias!.push({ nombre: 'Zig', marca: 'nueva' }, { nombre: 'Elixir', marca: 'nueva' });
    expect(validar(d)).toContain('P1: hay 2 tecnologías nuevas y el máximo es una');
  });

  it('una movida tiene que aparecer solo en su destino: no sigue en el origen ni se repite', () => {
    const d = copia();
    bloque('P5', d).tecnologias!.push({ nombre: 'Zig', marca: 'movida', desde: 'P1' });
    expect(validar(d)).toEqual([]);
    bloque('P1', d).tecnologias!.push({ nombre: 'Zig' });
    expect(validar(d).join('\n')).toMatch(/P5 · Zig: es movida y sigue en P1/);
    const e = copia();
    bloque('P8', e).tecnologias!.push({ nombre: 'Zig', marca: 'movida', desde: 'P2' });
    bloque('P9', e).tecnologias!.push({ nombre: 'Zig', marca: 'movida', desde: 'P2' });
    expect(validar(e).join('\n')).toMatch(/Zig: movida en P8 y en P9/);
    const f = copia();
    bloque('P5', f).tecnologias!.push({ nombre: 'Zig', marca: 'movida', desde: 'P8' });
    expect(validar(f).join('\n')).toMatch(/"desde" \(P8\) tiene que ir antes/);
    const g = copia();
    bloque('P5', g).tecnologias!.push({ nombre: 'Zig', marca: 'movida' });
    expect(validar(g).join('\n')).toMatch(/necesita "desde" con un proyecto que exista/);
  });

  it('una reusada tiene que venir de un proyecto anterior que la tiene', () => {
    const d = copia();
    bloque('P10', d).tecnologias!.push({ nombre: 'Rust', marca: 'reusada', desde: 'P2' });
    expect(validar(d)).toEqual([]);
    bloque('P10', d).tecnologias!.push({ nombre: 'Kotlin', marca: 'reusada', desde: 'P2' });
    expect(validar(d).join('\n')).toMatch(/P10 · Kotlin: es reusada pero P2 no la tiene/);
  });

  it('recortarPrimero e historial se validan', () => {
    const d = copia();
    bloque('P2', d).recortarPrimero = ['Algo que no está'];
    bloque('P0', d).historial!.push({ fecha: 'ayer', cambio: '', motivo: 'x' });
    const e = validar(d).join('\n');
    expect(e).toMatch(/P2: recortarPrimero menciona Algo que no está/);
    expect(e).toMatch(/P0: el historial pide fecha AAAA-MM-DD, cambio y motivo/);
  });
});
