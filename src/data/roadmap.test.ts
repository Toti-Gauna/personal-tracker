import { describe, expect, it } from 'vitest';
import raw from '../../data/roadmap.json';
import { itemsInWeek, type Roadmap } from './roadmap.schema';

const roadmap = raw as unknown as Roadmap;
const bims = roadmap.bimesters;
const items = bims.flatMap((b) => b.items);

/** La tabla del plan: producto (industria) | matemática | programación | certificación (horas). */
const TABLA: [number, string, string, string, string, [string, number, boolean] | null][] = [
  [1, 'Complia Pro', 'compliance', 'CONAMAT Aritmética 1–11', 'Python, FastAPI, RAG evaluado, OWASP LLM', null],
  [2, 'Faro', 'pesca', 'CONAMAT Álgebra 1–12', 'ML clásico, SQL, geodatos', null],
  [3, 'Lupa', 'salud', 'Álgebra 13–17, Geometría y trig. 1–10', 'Autograd, CNN, visión médica', null],
  [4, 'Talud', 'minería', 'Geom. y trig. 11–17, Analítica 1–7', 'Docker, redes, OWASP, AWS, InSAR', ['AWS SAA', 40, false]],
  [5, 'Despacho', 'emergencias', 'Analítica 8–13, Cálculo diferencial 1–5', 'Agentes en tiempo real, MCP, voz', null],
  [6, 'Guardia', 'ciberseguridad', 'Cálculo integral 1–6, MIT 18.01SC', 'Security+, Zeek, Suricata', ['Security+', 50, false]],
  [7, 'Humo', 'incendios', 'Strang 1–4', 'Terraform, pronóstico, diseño de sistemas', ['Terraform', 15, true]],
  [8, 'Fuga', 'gas', 'Strang 5–7', 'MLOps, video infrarrojo', null],
  [9, 'Arreo', 'ganadería', 'Blitzstein 1–5', 'SageMaker, PX4, seguimiento', ['AWS MLA', 40, false]],
  [10, 'Escudo', 'seguridad de apps con IA', 'Stewart 12–14, Blitzstein 6–7', 'PortSwigger, ataques a LLMs', ['BSCP', 90, false]],
  [11, 'Seña', 'Lengua de Señas Argentina', 'ISL, Blitzstein 8–10, Kohavi', 'Transformers, pose, fine-tuning', null],
  [12, 'Cruce', 'seguridad vial', 'MML', 'Jetson, TensorRT, DeepStream', null],
  [13, 'Rastro', 'cripto', 'Simmons EDOs, matemática discreta (MCS)', 'Blockchain, grafos, criptografía', ['eJPT', 35, false]],
  [14, 'Vivo', 'fintech', 'Chapra métodos numéricos', 'ML adversario, ISO 30107-3', null],
  [15, 'Acequia', 'agua', 'Kreyszig señales, Think DSP', 'Kubernetes, MQTT, FAO-56', ['CKAD', 40, false]],
  [16, 'Sextante', 'navegación', 'Kalman (Labbe), Nise', 'KiCad, ESP32, GNSS-SDR', null],
  [17, 'Lente', 'video inteligente en GPU', 'Understanding Deep Learning', 'Triton, DeepStream, vLLM', ['AWS Security – Specialty', 70, false]],
  [18, 'Halcón', 'drones autónomos para infraestructura', 'Boyd optimización convexa', 'PX4, ROS 2, seguridad industrial', null],
];

const day = (s: string) => Math.round(Date.parse(`${s}T00:00:00Z`) / 86400000);

describe('data/roadmap.json', () => {
  it('son 18 bimestres, del 16-11-2026 al 15-11-2029, con fechas continuas', () => {
    expect(bims).toHaveLength(18);
    expect(roadmap.route).toMatchObject({ start: '2026-11-16', end: '2029-11-15', bimesters: 18 });
    expect(bims[0].start).toBe('2026-11-16');
    expect(bims[17].end).toBe('2029-11-15');
    bims.forEach((b, i) => {
      expect(b.n).toBe(i + 1);
      expect(b.start < b.end).toBe(true);
      expect(b.start.endsWith('-16')).toBe(true);
      expect(b.end.endsWith('-15')).toBe(true);
      if (i > 0) expect(day(b.start)).toBe(day(bims[i - 1].end) + 1);
    });
  });

  it('los ids son únicos', () => {
    const ids = [...items.map((i) => i.id), ...bims.flatMap((b) => b.gates.map((g) => g.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('las semanas van de 1 a 9 y cada ítem tiene un rango válido', () => {
    for (const i of items) {
      expect(i.weeks[0], i.id).toBeGreaterThanOrEqual(1);
      expect(i.weeks[1], i.id).toBeLessThanOrEqual(9);
      expect(i.weeks[0], i.id).toBeLessThanOrEqual(i.weeks[1]);
      expect(i.parts.length, i.id).toBeGreaterThan(0);
    }
  });

  it('toda compuerta apunta a un ítem de su bimestre', () => {
    for (const b of bims) {
      const ids = new Set(b.items.map((i) => i.id));
      expect(b.gates.length).toBeGreaterThan(0);
      for (const g of b.gates) expect(ids.has(g.item), `${g.id} → ${g.item}`).toBe(true);
      if (b.cert) expect(ids.has(b.cert.item)).toBe(true);
    }
  });

  it('los datos coinciden con la tabla del plan', () => {
    for (const [n, producto, industria, mate, prog, cert] of TABLA) {
      const b = bims[n - 1];
      expect(b.product.name, `B${n}`).toBe(producto);
      expect(b.product.industry, `B${n}`).toBe(industria);
      expect(b.summary.math, `B${n}`).toBe(mate);
      expect(b.summary.prog, `B${n}`).toBe(prog);
      if (cert) expect(b.cert).toMatchObject({ name: cert[0], hours: cert[1], optional: cert[2] });
      else expect(b.cert).toBeUndefined();
      // Lo de programación se separa en un ítem por tema.
      expect(b.items.filter((i) => i.lane === 'prog').map((i) => i.title)).toEqual(prog.split(', '));
    }
    expect(bims.filter((b) => b.cert).map((b) => b.n)).toEqual([4, 6, 7, 9, 10, 13, 15, 17]);
  });

  it('cada bimestre sigue el ciclo: estudio y pieza en 1–4, producto en 5–8 y cierre en 9', () => {
    expect(roadmap.cycle).toMatchObject({ study: [1, 4], product: [5, 8], close: [9, 9] });
    for (const b of bims) {
      const por = (id: string) => b.items.find((i) => i.id === `b${b.n}-${id}`)!;
      expect(por('pieza').weeks).toEqual([1, 4]);
      expect(por('producto').weeks).toEqual([5, 8]);
      expect(por('cierre').weeks).toEqual([9, 9]);
      expect(b.items.filter((i) => i.lane === 'prog').every((i) => i.weeks[1] <= 4)).toBe(true);
      expect(itemsInWeek(b, 9).map((i) => i.id)).toEqual([`b${b.n}-cierre`]);
    }
  });

  it('los tres años tienen su perfil y los hilos arrancan donde dice el plan', () => {
    expect(roadmap.route.years.map((y) => [y.year, y.profile, y.bimesters.length])).toEqual([
      [1, 'AI Engineer con seguridad', 6], [2, 'ML Engineer completo', 6], [3, 'Secure AI Engineer', 6],
    ]);
    expect(bims.map((b) => b.year)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]);
    expect(roadmap.threads.map((t) => [t.id, t.from])).toEqual([['algoritmos', 7], ['diseno-sistemas', 7], ['nucleo-eclipse', 'all']]);
    expect(roadmap.threads[0]).toMatchObject({ perWeek: 3, source: 'NeetCode 150' });
    expect(roadmap.optional.map((o) => o.year)).toEqual([4, 5]);
  });
});
