#!/usr/bin/env node
/**
 * Plan v12.4 · migra los datos de v12.2 a v12.4. La fuente de verdad es docs/prompts/plan-v12.4.md (§4 foreground, §5 apps
 * secundarias, §6 slots, §7 recordatorios). Es de una sola vez: lee data/plan-extendido.json, data/proyectos-v7.json y
 * data/v12-2.json en su forma v12.2 y los reescribe; si ya son v12.4, no hace nada (la forma v12.4 se comprueba contra el doc en
 * src/data/plan-v12-4.test.ts). No usar plan-v12.mjs ni plan-v12-2.mjs después: regeneran las formas viejas.
 *
 * Qué hace:
 *  - fechas de los 69 bloques, etapas y fases (§4); los dos descansos pasan a ser días libres fijos (capacidad.fijas);
 *  - las certificaciones (examen, día por día), los hitos de matemática y los lotes de PetrIA se reparten en proporción dentro de
 *    la ventana nueva (sobre los días hábiles: sin los días libres fijos); PNPT lleva su estructura propia;
 *  - versiones de los proyectos (proyectos-v7.json y detalle de v12-2.json);
 *  - la línea BACKGROUND de cada bloque, las 10 apps secundarias, los 23 slots (build y sell), las herramientas y los recordatorios.
 *
 * Uso: node scripts/plan-v12-4.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => JSON.parse(readFileSync(join(RAIZ, p), 'utf8'));
const guardar = (p, o) => writeFileSync(join(RAIZ, p), `${JSON.stringify(o, null, 1)}\n`);
const MD = readFileSync(join(RAIZ, 'docs/prompts/plan-v12.4.md'), 'utf8');
const PE = leer('data/plan-extendido.json');
const PV7 = leer('data/proyectos-v7.json');
const V = leer('data/v12-2.json');

if (PE.plan === 'v12.4') { console.log('Los datos ya son v12.4: no hay nada que migrar.'); process.exit(0); }

// ——— fechas ———
const MES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const ms = (s) => Date.parse(`${s}T00:00:00Z`);
const suma = (s, n) => new Date(ms(s) + n * 864e5).toISOString().slice(0, 10);
const entre = (a, b) => Math.round((ms(b) - ms(a)) / 864e5);
const punto = (s) => {
  const x = s.trim().match(/^(\d{1,2})(?:\s+([A-Za-z]{3}))?(?:\s+(\d{4}))?$/);
  if (!x) throw new Error(`fecha ilegible: "${s}"`);
  return { d: Number(x[1]), m: x[2] ? MES[x[2].toLowerCase()] : undefined, y: x[3] ? Number(x[3]) : undefined };
};
/** "21 Nov–12 Dec 2026", "13–18 Dec 2026", "28 Dec–8 Jan 2027": el año del final manda; si no hay, el de contexto (ya ordenado). */
function rango(s, previo) {
  const [a, b] = s.replace(/\(.*?\)/g, '').trim().split(/\s*–\s*/);
  const B = punto(b ?? a);
  const A = punto(a);
  const mB = B.m ?? A.m;
  const mA = A.m ?? mB;
  let yB = B.y;
  let yA = A.y;
  if (yB == null) {
    // Sin año: el primero que no queda antes de `previo`.
    const base = previo ? Number(previo.slice(0, 4)) : 2026;
    yA = yA ?? base;
    if (previo && iso(yA, mA, A.d) < previo) yA += 1;
    yB = mB < mA ? yA + 1 : yA;
  } else yA = yA ?? (mA > mB ? yB - 1 : yB);
  return { inicio: iso(yA, mA, A.d), fin: iso(yB, mB, B.d) };
}

// ——— §4: los bloques del doc, en orden ———
const sec4 = MD.slice(MD.indexOf('## 4.'), MD.indexOf('## 5.'));
const TIPOS = { PROJECT: ['proyecto', 'sumas'], CERT: ['cert'], MATH: ['ventana'], ENGLISH: ['ingles'], 'JOB SEARCH': ['busqueda'], CONSOLIDATION: ['colchon'], 'STAGE CLOSE': ['cierre'], 'CLOSE & RENEWALS': ['cierre'] };
const entradas = [];
let actual = null;
for (const linea of sec4.split('\n')) {
  const m = linea.match(/^- (PROJECT|CERT|MATH|ENGLISH|JOB SEARCH|CONSOLIDATION|STAGE CLOSE|CLOSE & RENEWALS)\b(.*)$/);
  if (m) {
    const partes = m[2].split(' · ');
    const iR = partes.findIndex((p) => /^\d{1,2}(\s+[A-Za-z]{3})?(\s+\d{4})?\s*–\s*\d{1,2}\s+[A-Za-z]{3}(\s+\d{4})?\s*$/.test(p.trim()));
    if (iR < 0) throw new Error(`sin fechas: ${linea}`);
    const r = rango(partes[iR].trim());
    const h = partes[iR + 1]?.match(/^([\d.]+) h/);
    actual = { tipo: m[1], nombre: partes.slice(0, iR).join(' · ').trim(), ...r, horas: h ? Number(h[1]) : null, versiones: [], fondo: null };
    entradas.push(actual);
  } else if (actual && /^\s+· versions:/.test(linea)) {
    let previo = actual.inicio;
    for (const t of linea.replace(/^\s+· versions:\s*/, '').split(' · ')) {
      const x = t.match(/^(\d+\.\d+)\s+(.+)$/);
      if (!x) continue;
      const r = rango(x[2], previo);
      actual.versiones.push({ id: x[1], ...r });
      previo = r.fin;
    }
  } else if (actual && /^\s+· BACKGROUND →/.test(linea)) {
    const txt = linea.replace(/^\s+· BACKGROUND → /, '');
    const sec = txt.match(/secondary: (.+?)(?: · commercial:|$)/)[1].trim();
    const com = txt.match(/commercial: (.+)$/)[1].trim();
    actual.fondo = { sec, com };
  }
}

// El doc sigue el orden del plan sin los dos descansos (que pasan a ser días libres).
const viejos = PE.bloques.filter((b) => b.id !== 'P0' && b.id !== 'P1V0' && b.tipo !== 'descanso');
if (viejos.length !== entradas.length) throw new Error(`el doc trae ${entradas.length} bloques y el plan ${viejos.length}`);
const nuevo = new Map(); // id → entrada
viejos.forEach((b, i) => {
  const e = entradas[i];
  if (!TIPOS[e.tipo].includes(b.tipo)) throw new Error(`${b.id} es ${b.tipo} y el doc dice ${e.tipo} ${e.nombre}`);
  if (e.horas != null && b.horas != null && e.horas !== b.horas) console.log(`  horas: ${b.id} ${b.horas} → ${e.horas}`);
  nuevo.set(b.id, e);
});

// ——— los días libres fijos y los días hábiles de una ventana ———
const FIJAS = [
  { inicio: '2027-12-20', fin: '2027-12-26', nombre: 'Pause' },
  { inicio: '2027-12-31', fin: '2028-01-06', nombre: 'Rest' },
  { inicio: '2028-06-09', fin: '2028-06-15', nombre: 'Rest' },
];
const libre = (d) => FIJAS.some((f) => d >= f.inicio && d <= f.fin);
const habiles = (a, b) => { const out = []; for (let d = a; d <= b; d = suma(d, 1)) if (!libre(d)) out.push(d); return out; };
/** Una fecha de la ventana vieja, llevada en proporción a los días hábiles de la nueva. */
const llevar = (d, viejo, nuevoR) => {
  const w = habiles(nuevoR.inicio, nuevoR.fin);
  const n = Math.max(1, entre(viejo.inicio, viejo.fin));
  const i = Math.min(n, Math.max(0, entre(viejo.inicio, d)));
  return w[Math.round((i * (w.length - 1)) / n)];
};

const viejoDe = new Map(viejos.map((b) => [b.id, { ...b.fechas }]));
const nuevoDe = (id) => ({ inicio: nuevo.get(id).inicio, fin: nuevo.get(id).fin });

// ——— plan-extendido.json ———
for (const b of PE.bloques) {
  if (!nuevo.has(b.id)) continue;
  const v = viejoDe.get(b.id);
  const n = nuevoDe(b.id);
  const e = nuevo.get(b.id);
  if (e.horas != null) b.horas = e.horas;
  b.fechas = { ...n };
  // El doc v12.4 es ahora el roadmap: lo que estima el roadmap y lo que dice Trazo coinciden (la diferencia parte en cero).
  if (b.roadmap) b.roadmap = { ...n };
  // Certificaciones: el examen y el día por día, en proporción.
  for (const c of b.certs ?? []) {
    c.examen = llevar(c.examen, v, n);
    c.plan = c.plan.map((p) => ({ ...p, fecha: llevar(p.fecha, v, n) }));
    if (c.miniProyecto) c.miniProyecto.fecha = llevar(c.miniProyecto.fecha, v, n);
  }
  // Matemática: los hitos quedan seguidos, del primer día al último de la ventana.
  if (b.hitos?.length) {
    const inicios = b.hitos.map((h) => llevar(h.inicio, v, n));
    const w = habiles(n.inicio, n.fin);
    b.hitos.forEach((h, i) => {
      h.inicio = inicios[i];
      const sig = inicios[i + 1];
      h.fin = sig ? w[Math.max(0, w.indexOf(sig) - 1)] : n.fin;
      if (h.fin < h.inicio) h.fin = h.inicio;
    });
  }
  // Inglés con examen (Cambridge C1): la semana del examen va con la ventana; reservarlo, antes del 25 ene 2027.
  if (b.ingles?.examen?.semana) {
    b.ingles.examen.semana = [n.inicio, n.fin];
    b.ingles.examen.reserva = '2027-01-25';
  }
}
// PNPT: estudio 13–19 dic y 27–30 dic; examen práctico 7–11 ene (5 días seguidos); informe 12–13 ene.
{
  const b = PE.bloques.find((x) => x.id === 'CW9');
  const c = b.certs[0];
  c.examen = '2028-01-07';
  c.plan = [
    { fecha: '2027-12-13', texto: 'AD/OSINT intensive + lab (study 13–19 Dec and 27–30 Dec, lab twice)' },
    { fecha: '2028-01-07', texto: 'Practical exam (7–11 Jan, 5 days in a row)' },
    { fecha: '2028-01-12', texto: 'Report' },
    { fecha: '2028-01-13', texto: 'Report' },
    { fecha: '2028-01-13', texto: 'Debrief in English' },
  ];
}
// Reservas de exámenes: Claude + GitHub y AI-103 + Databricks con su fecha del doc.
for (const b of PE.bloques) for (const c of b.certs ?? []) {
  if (b.id === 'CW1') c.reserva = '2026-11-21';
  if (b.id === 'CW2') c.reserva = '2026-12-26';
}
// Los descansos salen del plan: son días libres fijos.
PE.bloques = PE.bloques.filter((b) => b.tipo !== 'descanso');
// Etapas y fases salen de sus bloques.
const dentro = (f) => PE.bloques.filter((b) => b.fechas && f(b) && b.id !== 'P0' && b.id !== 'P1V0');
for (const e of PE.etapas) {
  const bs = dentro((b) => b.etapa === e.n);
  e.inicio = bs.reduce((m, b) => (b.fechas.inicio < m ? b.fechas.inicio : m), '9999');
  e.fin = bs.reduce((m, b) => (b.fechas.fin > m ? b.fechas.fin : m), '0000');
  // Las semanas base de la etapa salen de sus bloques (sin los descansos que se fueron).
  const suma = (k) => PE.bloques.filter((b) => b.etapa === e.n).reduce((s, b) => s + (b[k] ?? 0), 0);
  e.semanasBase = suma('base');
  e.semanasExtra = suma('extra');
  e.semanasPlataforma = suma('extraPlataforma');
  e.semanasArquitectura = suma('extraArquitectura');
}
for (const f of PE.fases) {
  const bs = dentro((b) => b.fase === f.id);
  f.inicio = bs.reduce((m, b) => (b.fechas.inicio < m ? b.fechas.inicio : m), '9999');
  f.fin = bs.reduce((m, b) => (b.fechas.fin > m ? b.fechas.fin : m), '0000');
}
// Capacidad: los días libres fijos y la hora de Alawys v0.1 que sale de PetrIA.
PE.capacidad = { ...PE.capacidad, fijas: FIJAS, extras: [{ inicio: '2026-12-05', fin: '2026-12-11', horas: 1, bloque: 'P1', nombre: 'Alawys v0.1' }] };
// Recordatorios de reserva: el doc y la regla "el día que arranca el proyecto anterior".
const ini = (id) => nuevoDe(id).inicio;
PE.recordatorios = [
  { id: 'reserva-claude-gh', texto: 'Book Claude Architect + GitHub Foundations exams for 13–18 Dec (keep any booking you already made)', fecha: '2026-11-21', certs: ['claude-architect', 'gh-foundations'] },
  { id: 'reserva-ai103-databricks', texto: 'Book Azure AI-103 + Databricks GenAI exams (before 26 Dec)', fecha: '2026-12-26', certs: ['ai-103', 'databricks-genai'] },
  { id: 'reserva-cambridge', texto: 'Book Cambridge C1 Advanced (exam week 5–13 Apr 2027, before 25 Jan)', fecha: '2027-01-25' },
  { id: 'reserva-cw3', texto: 'Book AWS MLA + GitHub Actions exams', fecha: ini('P2'), certs: ['aws-mla', 'gh-actions'], regla: 'preceding project starts (VitalIA)' },
  { id: 'reserva-cw4', texto: 'Book AWS SAA + Prometheus exams', fecha: ini('P3'), certs: ['aws-saa', 'prometheus'], regla: 'preceding project starts (AgrIA)' },
  { id: 'reserva-cw5', texto: 'Book AWS Developer + Terraform exams', fecha: ini('P4'), certs: ['aws-dva', 'terraform'], regla: 'preceding project starts (Antena)' },
  { id: 'reserva-cw678', texto: 'Book Security+, GHAS, CKA, OpenTelemetry, AWS GenAI Pro and Claude Developer exams', fecha: ini('P5'), certs: ['secplus', 'ghas', 'cka', 'otel', 'aws-genai-pro', 'claude-dev'], regla: 'preceding project starts (PetrIA Guard)' },
  { id: 'reserva-pnpt', texto: 'Book the PNPT 5-day practical exam window for 7–11 Jan 2028', fecha: ini('S3'), certs: ['pnpt'], regla: 'preceding project starts (Vigía)' },
  { id: 'reserva-cks', texto: 'Book the CKS exam (requires an active CKA)', fecha: ini('Q4'), certs: ['cks'], regla: 'preceding project starts (Matchbook)' },
  { id: 'reserva-scs', texto: 'Book the AWS Security Specialty exam', fecha: ini('Q6'), certs: ['aws-scs'], regla: 'preceding project starts (Ticker)' },
  { id: 'reserva-sap', texto: 'Book the AWS SA Professional exam', fecha: ini('A4'), certs: ['aws-sap'], regla: 'preceding project starts (Piloto)' },
];
PE.plan = 'v12.4';

// ——— versiones y lotes (proyectos-v7.json y detalle de v12-2.json) ———
const lotesViejos = new Map();
for (const e of entradas.filter((x) => x.versiones.length)) {
  const id = [...nuevo].find(([, x]) => x === e)[0];
  const pv = PV7.proyectos[id];
  const vv = pv?.versiones ?? [];
  const viejasV = new Map(vv.map((x) => [x.id, { inicio: x.inicio, fin: x.fin }]));
  for (const nv of e.versiones) {
    const x = vv.find((y) => y.id === nv.id);
    if (!x) { console.log(`  versión sin datos: ${id} v${nv.id}`); continue; }
    x.inicio = nv.inicio; x.fin = nv.fin;
    const d = V.detalle[id]?.versiones?.find((y) => y.id === nv.id);
    if (d) { d.inicio = nv.inicio; d.fin = nv.fin; }
  }
  if (id === 'P1') lotesViejos.set(id, viejasV);
}
// PetrIA: cada lote va en proporción dentro de su versión nueva (los deadlines no se tocan).
{
  const b = PE.bloques.find((x) => x.id === 'P1');
  const viejas = lotesViejos.get('P1');
  for (const l of b.lotes ?? []) {
    const nv = nuevo.get('P1').versiones.find((x) => x.id === l.version);
    const ov = viejas.get(l.version);
    if (nv && ov) l.estimado = llevar(l.estimado, ov, nv);
  }
}

// ——— v12-2.json ———
const APP = { JulIA: 'julia', HandyX: 'handyx', 'Clip Studio': 'clip-studio', Roofy: 'roofy', 'Amazon v2': 'amazon-v2', 'Stripe v2': 'stripe-v2', 'Uber v2': 'uber-v2', 'Notion v2': 'notion-v2', 'Spotify v2': 'spotify-v2', 'Cursor v2': 'cursor-v2' };
const fondo = {};
for (const [id, e] of nuevo) {
  const f = {};
  if (/PAUSED/.test(e.fondo.sec)) f.pausa = 'PNPT';
  else if (e.fondo.sec === 'free') f.secundaria = 'libre';
  else f.secundaria = e.fondo.sec.split(' · ').map((t) => { const m = t.match(/^(.+?) v(\d\.\d)(?:–v(\d\.\d))?$/); return { app: m[1], version: m[3] ? `${m[2]}–${m[3]}` : m[2] }; });
  if (!/PAUSED/.test(e.fondo.com)) {
    const m = e.fondo.com.match(/^slot #(\d+) \((build|sell|build \+ sell)\)$/);
    f.comercial = m ? Number(m[1]) : null;
    if (m) f.faseComercial = m[2];
  }
  fondo[id] = f;
}
V.fondo = fondo;
// VitalIA: 102 h (el v0.1 de Alawys sale de PetrIA; acá va el v0.2 con el preset vitalia).
if (V.detalle.P2) { V.detalle.P2.horas = 102; V.detalle.P2.notaAlcance = 'batch 0.1 = Alawys v0.2 (preset vitalia, .NET) + scaffold VitalIA with it (v12.4: 104 → 102 h; Alawys v0.1 is built in the background in PetrIA, 5–11 Dec)'; }
// Las horas de las versiones de VitalIA suman las del bloque (21 + 30 + 30 + 21 = 102).
for (const v of PV7.proyectos.P2?.versiones ?? []) if (v.horas === 31) v.horas = 30;
V.plan = 'v12.4';
V.fuente = 'docs/prompts/plan-v12.4.md';

// §5: las 10 apps secundarias. Las cuatro de v12.2 conservan sus textos; cambian fechas y revisiones.
const R = { dinero: 'dinero', datos: 'datos personales', seguridad: 'seguridad', contratos: 'smart contracts' };
const rev = (...x) => x.map((k) => R[k]);
const NUEVAS = [
  { id: 'julia', nombre: 'JulIA', v: [['1.0', '2026-11-26', '2026-12-02', []], ['2.0', '2026-12-03', '2026-12-09', rev('datos')], ['3.0', '2026-12-10', '2026-12-16', rev('contratos')]], empresas: ['Udemy', 'Platzi', 'Coursera'] },
  { id: 'handyx', nombre: 'HandyX', v: [['1.0', '2026-12-17', '2026-12-23', rev('dinero')], ['2.0', '2026-12-24', '2026-12-30', []], ['3.0', '2026-12-31', '2027-01-06', rev('dinero', 'seguridad', 'contratos')]], empresas: ['Uber', 'PedidosYa', 'Rappi'] },
  { id: 'clip-studio', nombre: 'Clip Studio', v: [['1.0', '2027-01-07', '2027-01-13', []], ['2.0', '2027-01-14', '2027-01-20', []], ['3.0', '2027-01-21', '2027-01-27', []]], empresas: ['Opus Clip', 'Descript', 'CapCut', 'YouTube', 'Kick', 'Twitch'] },
  { id: 'roofy', nombre: 'Roofy', v: [['1.0', '2027-01-28', '2027-02-03', []], ['2.0', '2027-02-04', '2027-02-10', rev('datos')], ['3.0', '2027-02-11', '2027-02-17', rev('dinero', 'seguridad')]], empresas: ['Zonaprop', 'Roomix'] },
  { id: 'amazon-v2', nombre: 'Amazon v2', v: [['1.0', '2027-02-18', '2027-02-24', [], 'catalog, hybrid search, cart, checkout'], ['2.0', '2027-02-25', '2027-03-03', [], 'recommendations, shopping agent that never pays without confirmation'], ['3.0', '2027-03-04', '2027-03-17', rev('dinero', 'datos'), 'simulated Black Friday, caching, search evals']], empresas: ['Amazon', 'Mercado Libre', 'Shopify'], stack: 'Next.js, NestJS per domain, Postgres FTS + pgvector, Redis, LightGBM, Claude agent', descripcion: 'A marketplace-scale shop: catalog, hybrid search, cart and checkout, recommendations and a shopping agent.' },
  { id: 'stripe-v2', nombre: 'Stripe v2', v: [['1.0', '2027-03-18', '2027-03-24', rev('dinero', 'seguridad', 'contratos'), 'charges, double-entry ledger, idempotency'], ['2.0', '2027-03-25', '2027-03-31', rev('dinero', 'seguridad', 'contratos'), 'signed webhooks, refunds, disputes, ML anti-fraud'], ['3.0', '2027-04-01', '2027-04-14', rev('dinero', 'seguridad', 'contratos'), 'reconciliation, chaos, USDC testnet']], empresas: ['Stripe', 'Mercado Pago', 'Ualá', 'Nubank', 'dLocal'], stack: '.NET (reuse HandyX) or Go, append-only Postgres, HMAC, LightGBM + rules', descripcion: 'A payments platform: ledger, webhooks, refunds, disputes and anti-fraud. Crypto only on testnet.' },
  { id: 'uber-v2', nombre: 'Uber v2', v: [['1.0', '2027-04-15', '2027-04-21', [], 'request, dispatch, live tracking'], ['2.0', '2027-04-22', '2027-04-28', [], 'surge pricing, ML ETA'], ['3.0', '2027-04-29', '2027-05-12', rev('datos'), '10k simulated drivers, p99, network failures']], empresas: ['Uber', 'Cabify', 'DiDi', 'Rappi', 'PedidosYa'], stack: 'Go or Rust, Redis geo, websockets, H3, Kafka, MapLibre, Expo', descripcion: 'Realtime mobility: ride requests, dispatch, live tracking, surge pricing and ETAs at simulated scale.' },
  { id: 'notion-v2', nombre: 'Notion v2', v: [['1.0', '2027-05-13', '2027-05-19', [], 'block editor, live collaboration, presence'], ['2.0', '2027-05-20', '2027-05-26', [], 'offline, permissions, writing agent'], ['3.0', '2027-05-27', '2027-06-09', rev('datos', 'seguridad'), 'RAG with permissions, 100 concurrent editors']], empresas: ['Notion', 'Linear', 'Figma', 'Atlassian', 'Canva'], stack: 'Next.js, Yjs, websockets, Redis pub/sub, Postgres + pgvector', descripcion: 'A collaborative workspace: block editor, live collaboration, offline, permissions and a writing agent.' },
  { id: 'spotify-v2', nombre: 'Spotify v2', v: [['1.0', '2027-06-10', '2027-06-16', [], 'catalog, HLS streaming, playlists'], ['2.0', '2027-06-17', '2027-06-23', [], 'audio-embedding recommendations, generated radio'], ['3.0', '2027-06-24', '2027-07-07', [], 'podcast summaries with voice, offline evals']], empresas: ['Spotify', 'Deezer', 'SoundCloud'], stack: '', descripcion: 'A music and podcast streamer. Rule: only open-licence or permitted audio.' },
  { id: 'cursor-v2', nombre: 'Cursor v2', v: [['1.0', '2027-07-08', '2027-07-14', [], 'read repo, plan, edit, diff'], ['2.0', '2027-07-15', '2027-07-21', [], 'sandboxed tests, automatic PR'], ['3.0', '2027-07-22', '2027-08-04', rev('seguridad'), 'SWE-bench-lite evals with success rate, MCP']], empresas: ['Anthropic', 'Cursor', 'GitHub', 'Vercel', 'Replit'], stack: 'TypeScript CLI + web, Claude tools + MCP, no-network containers, @alawys/evals-action', descripcion: 'A coding agent: reads a repo, plans, edits, runs sandboxed tests and opens a PR. Isolated execution, no secrets.' },
];
const previas = new Map(V.secundarias.map((s) => [s.id, s]));
V.secundarias = NUEVAS.map((n) => {
  const p = previas.get(n.id);
  const versiones = n.v.map(([id, inicio, fin, revisionForeground, linea]) => {
    const pv = p?.versiones.find((x) => x.id === id);
    return { id, inicio, fin, linea: pv?.linea ?? linea ?? '', entregables: pv?.entregables ?? (linea ? linea.split(/,\s*/) : []), ...(revisionForeground.length ? { revisionForeground } : {}) };
  });
  return {
    id: n.id, nombre: n.nombre, inicio: n.v[0][1], fin: n.v[2][2], versiones,
    descripcion: p?.descripcion ?? n.descripcion ?? '', valor: p?.valor ?? '', diferencial: p?.diferencial ?? '', rol: p?.rol ?? '', peso: p?.peso ?? '',
    empresas: n.empresas, stack: p?.stack ?? { dev: n.stack ?? '', staging: '', prod: '' },
    ...(n.id === 'julia' ? {} : { conAlawys: true }),
  };
});

// §6: los 23 slots (build y sell). La marca de los primeros 14 se conserva; de #15 en adelante, el rubro.
const secSlots = MD.slice(MD.indexOf('## 6.'), MD.indexOf('## 7.'));
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const previosC = new Map(V.comerciales.map((c) => [c.n, c]));
V.comerciales = [];
for (const linea of secSlots.split('\n')) {
  const m = linea.match(/^- #(\d+) · (.+)$/);
  if (!m) continue;
  const t = m[2].split(' · ').map((x) => x.trim());
  const n = Number(m[1]);
  const r = rango(t[0]);
  const host = t.find((x) => x.startsWith('host:')).slice(5).trim();
  const dosFases = t.find((x) => /^build \d/.test(x));
  const sell = t.find((x) => /^sell \d/.test(x));
  const build = dosFases ? rango(dosFases.slice(6), r.inicio) : { ...r };
  const venta = sell ? rango(sell.slice(5), build.fin) : null;
  const iB = t.findIndex((x) => /^(build \d|build only)/.test(x));
  const iSell = sell ? t.indexOf(sell) : iB;
  const sector = t[iSell + 1];
  const campo = (k) => { const x = t.find((y) => y.startsWith(`${k}:`)); return x ? mayus(x.slice(k.length + 1).trim()) : null; };
  const prev = previosC.get(n);
  const rev2 = t.find((x) => x.startsWith('foreground review:'));
  V.comerciales.push({
    n, id: `com-${n}`, inicio: r.inicio, fin: r.fin, ventana: host.replace(/^./, (c) => c.toUpperCase()),
    marca: n <= 14 ? (prev?.marca ?? sector) : null, sector,
    build, venta, queSeHace: campo('builds'), wow: campo('wow'), reusa: campo('reuses'),
    ...(rev2 ? { revisionForeground: rev2.slice(18).split(',').map((s) => s.trim()).map((s) => (s === 'personal data' ? 'datos personales' : s)) } : {}),
  });
}
if (V.comerciales.length !== 23) throw new Error(`el doc trae ${V.comerciales.length} slots`);

// §3: Alawys y las herramientas.
const al = V.herramientas.find((h) => h.id === 'alawys');
const v01 = al.versiones.find((v) => v.id === '0.1');
al.versiones = [
  { id: '0.1', origen: 'P1', donde: 'fecha', fecha: '2026-12-05', hasta: '2026-12-11', linea: 'modo interactivo + flags; presets web-next, mern, petria (del repo de PetrIA); pack de agentes (CLAUDE.md + subagentes); Docker compose; CI; .env.example validado; hook de gitleaks. Se arma en segundo plano con la PC nueva: 1 h por día que sale de PetrIA.' },
  { id: '0.2', origen: 'P2', donde: 'fecha', fecha: '2026-12-28', linea: 'preset vitalia (.NET + Azure). Generar VitalIA con Alawys y anotar la métrica: tokens y minutos por scaffold, Claude contra Alawys (medido en Aquasol, HandyX y VitalIA).' },
  { id: '1.0', origen: 'P2', donde: 'cierre', lanzamiento: true, linea: 'npm publish, README, demo de 60 s', post: '2027-01-14' },
  al.versiones.find((v) => v.id === '1.x'),
  al.versiones.find((v) => v.id === '2.0'),
];
void v01;
const tour = V.herramientas.find((h) => h.id === 'tour3d');
tour.versiones = [{ origen: 'com-11', donde: 'cierre', linea: 'tour 3D y AR', id: '1.0' }];
const DESDE = { 'showcase-kit': 'Aquasol', captions: 'JulIA', 'seat-picker': 'Cinemacenter', 'voice-agent': 'PetrIA voice-gateway', tour3d: 'Roofy', notify: 'PetrIA', 'llm-router': 'PetrIA', 'evals-action': 'PetrIA', 'usage-meter': 'PetrIA' };
for (const [id, desde] of Object.entries(DESDE)) V.herramientas.find((h) => h.id === id).desde = desde;

// §7: los recordatorios de fondo (los de cada slot, 7 y 14 días antes, los arma la app).
const hand = [['2026-12-16', 'JulIA → HandyX', 'JulIA'], ['2027-01-06', 'HandyX → Clip Studio', 'HandyX'], ['2027-01-27', 'Clip Studio → Roofy', 'Clip Studio'], ['2027-02-17', 'Roofy → Amazon v2', 'Roofy'], ['2027-03-17', 'Amazon v2 → Stripe v2', 'Amazon v2'], ['2027-04-14', 'Stripe v2 → Uber v2', 'Stripe v2'], ['2027-05-12', 'Uber v2 → Notion v2', 'Uber v2'], ['2027-06-09', 'Notion v2 → Spotify v2', 'Notion v2'], ['2027-07-07', 'Spotify v2 → Cursor v2', 'Spotify v2']];
V.recordatorios = [
  { id: 'v124-2026-11-26', fecha: '2026-11-26', texto: 'Start JulIA v1.0 in the background (separate repo).' },
  { id: 'v124-2026-12-03', fecha: '2026-12-03', texto: 'Prepare the Aquasol brief for slot #1 (starts 13 Dec).' },
  { id: 'v124-2026-12-05', fecha: '2026-12-05', texto: 'The PC arrives: start Alawys v0.1 (1 h/day from PetrIA until 11 Dec).' },
  { id: 'v124-2026-12-13a', fecha: '2026-12-13', texto: 'Three weeks of JulIA: is 1 h/day of review enough?' },
  { id: 'v124-2026-12-13b', fecha: '2026-12-13', texto: 'Re-check the plan with real data (3 weeks in): delay, capacity and the estimated end.' },
  ...hand.map(([fecha, par, de]) => ({ id: `v124-${fecha}`, fecha, texto: `Secondary handover: ${par}. Check ${de} reached v3.0 or log what's left.` })),
  { id: 'v124-2027-07-28', fecha: '2027-07-28', texto: 'Decide whether to open a new secondary after 4 Aug (pick from "Ver a futuro").' },
  { id: 'v124-2027-08-04', fecha: '2027-08-04', texto: 'Cursor v2 is done: the secondary track is free.' },
];

guardar('data/plan-extendido.json', PE);
guardar('data/proyectos-v7.json', PV7);
guardar('data/v12-2.json', V);
console.log(`v12.4: ${nuevo.size} bloques, ${V.secundarias.length} apps secundarias, ${V.comerciales.length} slots. Fin del plan: ${PE.bloques.at(-1).fechas.fin}`);
