import { describe, expect, it } from 'vitest';
import { aliasDe, catalogo, detectar, leerVacantes, norm, tablaDemanda, type Vacante } from './demanda';
import { calendarioCompleto } from './plan-vistas';

const HOY = '2026-11-20';
const cal = calendarioCompleto();
const v = (rol: string, stack: string[], extra: Partial<Vacante> = {}): Vacante => ({ id: rol, rol, stack, fecha: HOY, ...extra });

describe('ola 26 · catálogo y detección de tecnologías', () => {
  it('cada tecnología del plan la cubre el primer proyecto que la tiene (stack v7); ninguna aparece dos veces', () => {
    const c = catalogo();
    const cubre = (n: string) => c.find((x) => x.nombre === n)?.proyecto;
    expect(cubre('DuckDB')).toBe('P5');
    expect(cubre('LoRA')).toBe('P8');
    expect(cubre('LangGraph')).toBe('P1'); // P0 (la v1 de Constelación) solo lleva frontend e infra
    expect(cubre('Three.js')).toBe('P0');
    expect(cubre('Orekit')).toBe('A5');
    expect(new Set(c.map((x) => x.clave)).size).toBe(c.length);
  });

  it('los alias salen del nombre, de lo que va entre paréntesis y de las partes de "X y Y"; los de siempre se conservan', () => {
    expect(aliasDe({ nombre: 'DuckDB y Parquet' })).toEqual(expect.arrayContaining(['DuckDB y Parquet', 'DuckDB', 'Parquet']));
    expect(aliasDe({ nombre: 'Cola asíncrona para la ingesta (RabbitMQ o SQS)' })).toEqual(expect.arrayContaining(['RabbitMQ', 'SQS']));
    expect(aliasDe({ nombre: 'SBOM y firmas' })).toEqual(expect.arrayContaining(['SBOM']));
    expect(aliasDe({ nombre: 'SBOM y firmas' })).not.toContain('firmas');
    expect(catalogo().find((x) => x.nombre === 'Kubernetes')!.alias).toContain('k8s');
    expect(catalogo().find((x) => x.nombre === 'Next.js')!.alias).toContain('nextjs');
  });

  it('un alias ambiguo no cuenta para dos tecnologías; "Java" es la de P1', () => {
    const c = catalogo();
    expect(detectar('Backend en Java').filter((n) => /Java|Orekit/.test(n))).toEqual(['Java']);
    expect(c.find((x) => x.nombre === 'Java')!.proyecto).toBe('P1');
    const alias = c.flatMap((e) => [...new Set(e.alias.map(norm))].filter((a) => a !== e.clave));
    expect(new Set(alias).size).toBe(alias.length);
  });

  it('detectar encuentra tecnologías en un texto sin confundirse: "Go" solo con mayúscula y como palabra', () => {
    const d = detectar('Buscamos backend con Python, Spring Boot y k8s. Sumá experiencia en RabbitMQ.');
    expect(d).toEqual(expect.arrayContaining(['Python', 'Spring Boot', 'Kubernetes', 'RabbitMQ']));
    expect(detectar('Vamos a go adelante, ¿googlear no cuenta?')).not.toContain('Go');
    expect(detectar('Gateway en Go para pagos')).toContain('Go');
    expect(detectar('Experiencia con Azure OpenAI y Entra ID')).toEqual(expect.arrayContaining(['Azure OpenAI', 'Entra ID']));
    expect(norm('  Accesibilidad  ')).toBe('accesibilidad');
  });
});

describe('ola 26 · cargar vacantes (texto o JSON)', () => {
  it('texto: una vacante por bloque separado por ---; la primera línea es el rol; "Stack:" suma lo que diga', () => {
    const r = leerVacantes('AI Engineer · Empresa X\nStack: Python, LangGraph, Terraform Cloud\nTambién Kubernetes.\n---\nBackend Java\nSpring Boot y Docker', HOY);
    if (!r.ok) throw new Error(r.errores.join());
    expect(r.vacantes).toHaveLength(2);
    expect(r.vacantes[0]).toMatchObject({ rol: 'AI Engineer · Empresa X', fecha: HOY });
    expect(r.vacantes[0].stack).toEqual(expect.arrayContaining(['Python', 'LangGraph', 'Kubernetes', 'Terraform Cloud']));
    // Docker no está en ningún stack de la v7: en el texto libre no se detecta (en "Stack:" sí se cargaría).
    expect(r.vacantes[1].stack).toEqual(['Java', 'Spring Boot']);
  });

  it('JSON: lista, { tipo: "vacantes", lista } o una sola; une el stack con lo que nombre "texto"', () => {
    const a = leerVacantes('{"tipo":"vacantes","lista":[{"rol":"ML Engineer","empresa":"Z","stack":["k8s","PyTorch"],"texto":"usamos DuckDB"}]}', HOY);
    if (!a.ok) throw new Error(a.errores.join());
    expect(a.vacantes[0]).toMatchObject({ rol: 'ML Engineer', empresa: 'Z' });
    expect(a.vacantes[0].stack).toEqual(['Kubernetes', 'PyTorch', 'DuckDB']);
    expect(leerVacantes('[{"rol":"A","stack":["Go"]},{"rol":"B","stack":["Rust"]}]', HOY)).toMatchObject({ ok: true });
    expect(leerVacantes('{"rol":"Solo","stack":["Java"]}', HOY)).toMatchObject({ ok: true });
  });

  it('JSON inválido: dice qué vacante y qué campo falla, y no carga nada', () => {
    const r = leerVacantes('[{"rol":"A","stack":"Python"},{"stack":["Go"]},{"rol":"C"}]', HOY);
    expect(r).toEqual({ ok: false, errores: ['vacante 1: "stack" tiene que ser una lista de textos.', 'vacante 2: falta "rol".', 'vacante 3: falta "stack" (lista) o "texto".'] });
    expect(leerVacantes('{"tipo":"entrevista","lista":[]}', HOY)).toMatchObject({ ok: false });
    expect(leerVacantes('{ roto', HOY)).toMatchObject({ ok: false, errores: [expect.stringMatching(/no es válido/)] });
    expect(leerVacantes('   ', HOY)).toMatchObject({ ok: false });
  });
});

describe('ola 26 · la tabla de demanda', () => {
  it('sin vacantes cargadas no hay nada que contar (no se inventa ningún dato de mercado)', () => {
    const t = tablaDemanda([], cal, HOY);
    expect(t.filas).toEqual([]);
    expect(t.vacantes).toBe(0);
    expect(t.sinPedir.length).toBeGreaterThan(50);
    expect(t.sinPedir.every((f) => f.vacantes === 0)).toBe(true);
  });

  it('cuenta vacantes por tecnología (una vez por vacante), con su proyecto y fecha estimada', () => {
    const t = tablaDemanda([
      v('A', ['Python', 'LangGraph', 'k8s', 'Python']),
      v('B', ['langgraph', 'Spring Boot']),
      v('C', ['DuckDB', 'Rust']),
    ], cal, HOY);
    const fila = (n: string) => t.filas.find((f) => f.tecnologia === n)!;
    expect(fila('LangGraph')).toMatchObject({ vacantes: 2, proyecto: 'P1', fecha: '2026-12-09', cubierta: false });
    expect(fila('Python').vacantes).toBe(1);
    expect(fila('Kubernetes')).toMatchObject({ vacantes: 1, proyecto: 'P5' });
    expect(fila('DuckDB')).toMatchObject({ proyecto: 'P5', fecha: '2027-04-30' }); // v12.1: PetrIA Guard entrega el 30 abr 2027
    expect(t.filas[0].vacantes).toBe(2);
    expect(t.vacantes).toBe(3);
  });

  it('lo que el plan no cubre queda "sin proyecto" y se cuenta aparte', () => {
    const t = tablaDemanda([v('A', ['Django', 'Python']), v('B', ['django', 'Elixir'])], cal, HOY);
    expect(t.filas.find((f) => f.tecnologia === 'Django')).toMatchObject({ vacantes: 2, proyecto: null, fecha: null });
    expect(t.fueraDelPlan).toBe(2);
    expect(t.sinPedir.some((f) => f.tecnologia === 'Python')).toBe(false);
  });

  it('una fecha pasada marca la tecnología como cubierta', () => {
    const t = tablaDemanda([v('A', ['Next.js'])], cal, '2027-02-01');
    expect(t.filas[0]).toMatchObject({ proyecto: 'P0', fecha: '2026-11-18', cubierta: true });
  });
});
