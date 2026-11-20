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

describe('ola 26 · tecnologías de los proyectos (v2.1, con los cambios de la v3)', () => {
  it('el JSON valida y cada proyecto lleva sus tecnologías; el calendario por semanas (sin horas) suma 243 con los bloques de la v7', () => {
    expect(validar(raw)).toEqual([]);
    expect(totalSemanas(calendario())).toBe(243);
    expect(PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto').every((b) => Array.isArray(b.tecnologias))).toBe(true);
    // El stack ya no vive en data/plan.json: sale de las tecnologías.
    // (se lee del archivo: el módulo `plan` muta su copia al armar el calendario vivo).
    const enDisco = JSON.parse(readFileSync(join(__dirname, '../../data/plan.json'), 'utf8')) as { programacion: { tramos: { stack?: string[] }[] } };
    expect(enDisco.programacion.tramos.some((t) => t.stack)).toBe(false);
    expect(TRAMOS.find((t) => t.id === 'P1')!.stack).toEqual(nombres('P1'));
  });

  it('P0 (v3): solo hub, Trazo como caso, CV, LinkedIn y pitch; la auditoría, el RAG y portfolio-mcp van al backlog sin fecha', () => {
    expect(nombres('P0')).toEqual(['Next.js', 'Three.js', 'ElevenLabs', 'Higgsfield']);
    expect(bloque('P0').base).toBe(1);
    expect(JSON.stringify(raw)).not.toMatch(/\bCompli?A\b|Complia Pro/i);
    expect(bloque('P0').tecnologias!.some((t) => t.marca === 'nueva')).toBe(false);
    expect(bloque('P0').historial).toHaveLength(4);
    expect(bloque('P0').historial![3]).toMatchObject({ fecha: '2026-11-20', motivo: 'Roadmap v7' });
    expect(PLAN_EXT.backlog!.map((b) => b.nombre)).toEqual(expect.arrayContaining(['portfolio-mcp', 'Auditoría y refactor de una app generada con IA', 'RAG para negocios (dominio de muestra)']));
  });

  it('P1: LangGraph es la única nueva; evals, cola y conector son parte del trabajo; DuckDB y Parquet ya no está y Electron va a la Semana de sumas', () => {
    const t = bloque('P1').tecnologias!;
    expect(t.filter((x) => x.marca === 'nueva').map((x) => x.nombre)).toEqual(['LangGraph (agente analista con herramientas)']);
    for (const parte of [/^Evals/, /^Cola asíncrona.*RabbitMQ o SQS/, /^Conector a una API de terceros en sandbox/]) expect(t.find((x) => parte.test(x.nombre))?.marca).toBeUndefined();
    expect(nombres('P1').some((n) => /DuckDB|Parquet/.test(n))).toBe(false);
    expect(nombres('P1').some((n) => /SQLite/.test(n))).toBe(false);
    expect(bloque('P1').extraPlataforma).toBe(0);
    expect(bloque('P1').ficha!.plataforma).toMatch(/Semana de sumas/);
    expect(bloque('P1').ficha!.tecnologiaNueva).toBe('LangGraph (agente analista con herramientas)');
    // v7: ya no hay lista de recortes (se mueven fechas, no se recorta profundidad).
    expect(bloque('P1').recortarPrimero).toBeUndefined();
  });

  it('P2: .NET con FHIR es la nueva, suma Azure y accesibilidad; la app de prueba va a la Semana de sumas; vLLM y LoRA ya no está; el gateway en Go sigue', () => {
    expect(bloque('P2').ficha!.tecnologiaNueva).toBe('.NET con FHIR (C# y ASP.NET Core)');
    expect(nombres('P2')).toEqual(expect.arrayContaining(['Go', 'Despliegue en Azure con Azure OpenAI', 'Revisión de accesibilidad']));
    expect(nombres('P2').some((n) => /TestFlight/.test(n))).toBe(false);
    expect(bloque('P2').extraPlataforma).toBe(0);
    expect(nombres('P2').some((n) => /vLLM|LoRA/.test(n))).toBe(false);
    expect(bloque('P2').recortarPrimero).toBeUndefined();
    expect(bloque('P2').historial!.at(-1)).toMatchObject({ cambio: 'Ya no tiene lista de recortes: si una versión se atrasa, se mueven fechas' });
  });

  it('P3: GraphQL opcional; Rails es la nueva y el resto queda igual', () => {
    expect(marca('P3', 'GraphQL en el backoffice de Rails')).toMatchObject({ opcional: true });
    expect(marca('P3', 'GraphQL en el backoffice de Rails')?.marca).toBeUndefined();
    expect(bloque('P3').ficha!.tecnologiaNueva).toBe('Ruby on Rails');
    expect(nombres('P3')).toEqual(expect.arrayContaining(['pandas', 'scikit-learn', 'MLflow', 'Gradient boosting y predicción conforme']));
  });

  it('las movidas aparecen solo en su destino: DuckDB y Parquet en P5 (de P1) y vLLM y LoRA en P8 (de P2)', () => {
    expect(marca('P5', 'DuckDB y Parquet')).toMatchObject({ marca: 'movida', desde: 'P1' });
    expect(marca('P8', 'vLLM y LoRA')).toMatchObject({ marca: 'movida', desde: 'P2' });
    const donde = (n: string) => PLAN_EXT.bloques.filter((b) => b.tecnologias?.some((t) => t.nombre === n)).map((b) => b.id);
    expect(donde('DuckDB y Parquet')).toEqual(['P5']);
    expect(donde('vLLM y LoRA')).toEqual(['P8']);
    // P5 y P8 conservan su tecnología nueva.
    expect(bloque('P5').ficha!.tecnologiaNueva).toBe('eBPF con Falco');
    expect(bloque('P8').ficha!.tecnologiaNueva).toBe('garak y PyRIT (si se confirma el reemplazo)');
  });

  it('los cambios de la v2.1 siguen en P0, P1, P2, P3, P5 y P8; la v7 suma a cada proyecto su nombre y sus horas; las etapas 2 a 4 no tienen movidas', () => {
    const v21 = (id: string) => (bloque(id).historial ?? []).filter((h) => h.fecha === '2026-11-18');
    expect(PLAN_EXT.bloques.filter((b) => v21(b.id).length).map((b) => b.id)).toEqual(['P0', 'P1', 'P2', 'P3', 'P5', 'P8']);
    for (const b of PLAN_EXT.bloques.filter((x) => x.etapa > 1 && x.tipo === 'proyecto')) expect(b.tecnologias!.some((t) => t.marca === 'movida')).toBe(false);
    // Lo que no es de la v2.1 es de la v7 (20 nov 2026).
    for (const b of PLAN_EXT.bloques.filter((x) => x.historial)) for (const h of b.historial!) expect(['2026-11-18', '2026-11-20']).toContain(h.fecha);
    expect(bloque('P1').historial!.find((h) => h.motivo === 'Roadmap v7')!.cambio).toBe('Pasa a llamarse PetrIA (antes Faro v1 · petróleo); horas: antes 122 h, ahora ≈ 304 h');
    expect(bloque('A7').historial).toEqual([{ fecha: '2026-11-20', cambio: 'horas: antes 196 h, ahora ≈ 265 h', motivo: 'Roadmap v7' }]);
  });

  it('descartado por ahora: Django, Supabase, CRM/ERP y APIs de bolsa, con motivo, y no entran a ningún proyecto', () => {
    expect(PLAN_EXT.descartadas!.map((d) => d.nombre)).toEqual(['Django', 'Supabase', 'CRM/ERP', 'APIs de bolsa']);
    expect(PLAN_EXT.descartadas!.every((d) => d.motivo.length > 10)).toBe(true);
    const d = copia();
    bloque('P1', d).tecnologias!.push({ nombre: 'Supabase para el login' });
    expect(validar(d).join(' ')).toMatch(/P1: Supabase para el login está descartada por ahora \(Supabase\)/);
  });
});

describe('ola 26 · el validador de tecnologías', () => {
  it('rechaza una tecnología repetida dentro de un proyecto (sin importar mayúsculas ni tildes)', () => {
    const d = copia();
    bloque('P3', d).tecnologias!.push({ nombre: 'PANDAS' }, { nombre: 'Incertidumbre' });
    const e = validar(d);
    expect(e).toContain('P3: tecnología repetida (PANDAS)');
    expect(e).toContain('P3: tecnología repetida (Incertidumbre)');
  });

  it('rechaza más de una tecnología nueva por proyecto', () => {
    const d = copia();
    bloque('P1', d).tecnologias!.push({ nombre: 'DuckDB', marca: 'nueva' });
    expect(validar(d)).toContain('P1: hay 2 tecnologías nuevas y el máximo es una');
  });

  it('una movida tiene que aparecer solo en su destino: no sigue en el origen ni se repite', () => {
    const d = copia();
    bloque('P1', d).tecnologias!.push({ nombre: 'DuckDB y Parquet' });
    expect(validar(d).join('\n')).toMatch(/P5 · DuckDB y Parquet: es movida y sigue en P1/);
    const e = copia();
    bloque('P9', e).tecnologias!.push({ nombre: 'vLLM y LoRA', marca: 'movida', desde: 'P2' });
    expect(validar(e).join('\n')).toMatch(/vLLM y LoRA: movida en P8 y en P9/);
    const f = copia();
    bloque('P5', f).tecnologias!.find((t) => t.marca === 'movida')!.desde = 'P8';
    expect(validar(f).join('\n')).toMatch(/"desde" \(P8\) tiene que ir antes/);
    const g = copia();
    delete bloque('P5', g).tecnologias!.find((t) => t.marca === 'movida')!.desde;
    expect(validar(g).join('\n')).toMatch(/necesita "desde" con un proyecto que exista/);
  });

  it('una reusada tiene que venir de un proyecto anterior que la tiene', () => {
    const d = copia();
    bloque('P10', d).tecnologias!.push({ nombre: 'Go', marca: 'reusada', desde: 'P2' });
    expect(validar(d)).toEqual([]);
    bloque('P10', d).tecnologias!.push({ nombre: 'Rust', marca: 'reusada', desde: 'P2' });
    expect(validar(d).join('\n')).toMatch(/P10 · Rust: es reusada pero P2 no la tiene/);
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
