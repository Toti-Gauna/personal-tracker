#!/usr/bin/env node
/**
 * Plan v12.2 · lee docs/prompts/plan-v12.2.md (la fuente de verdad) y genera data/v12-2.json:
 *  - detalle de cada proyecto principal (los campos en castellano tal cual), sus versiones con fechas y entregables, notas de alcance;
 *  - la línea BACKGROUND de cada bloque (secundaria y comercial que corren detrás);
 *  - las 4 apps secundarias y los 23 slots comerciales;
 *  - los recordatorios nuevos y el backlog "Ver a futuro".
 * Valida contra data/plan-extendido.json (fechas de bloques, horas y versiones) y avisa las diferencias. Uso: node scripts/plan-v12-2.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD = readFileSync(join(RAIZ, 'docs/prompts/plan-v12.2.md'), 'utf8');
const PLAN = JSON.parse(readFileSync(join(RAIZ, 'data/plan-extendido.json'), 'utf8'));
const PV7 = JSON.parse(readFileSync(join(RAIZ, 'data/proyectos-v7.json'), 'utf8'));

const MES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, ene: 1, abr: 4, ago: 8, dic: 12 };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const avisos = [];

/** "d Mon [yyyy]" o "d" → { d, m?, y? } */
function punto(s) {
  const x = s.trim().match(/^(\d{1,2})(?:\s+([A-Za-zé]{3})[a-zé]*)?(?:\s+(\d{4}))?$/);
  if (!x) throw new Error(`fecha ilegible: "${s}"`);
  return { d: Number(x[1]), m: x[2] ? MES[x[2].toLowerCase().slice(0, 3)] : undefined, y: x[3] ? Number(x[3]) : undefined };
}

/** Un rango "10–13 Dec 2026", "31 Dec 2026–7 Jan 2027", "18 Mar–2 Apr", con el año de contexto. */
function rango(s, anio, mesCtx) {
  const limpio = s.replace(/\(.*?\)/g, '').trim();
  const [a, b] = limpio.split(/\s*[–-]\s*/);
  const B = punto(b ?? a);
  const A = punto(a);
  const mB = B.m ?? mesCtx;
  const yB = B.y ?? anio;
  const mA = A.m ?? mB;
  const yA = A.y ?? (mA > mB ? yB - 1 : yB);
  return { inicio: iso(yA, mA, A.d), fin: iso(yB, mB, B.d) };
}

// ——— §10: bloques del roadmap ———
const sec10 = MD.slice(MD.indexOf('## 10.'), MD.indexOf('## 11.'));
const lineas = sec10.split('\n');
const bloques = PLAN.bloques.filter((b) => b.fechas);
let anio = 2026;
let ultimoInicio = '2026-11-01';
const detalle = {};
const fondo = {};
let actual = null;

const CAMPOS = ['Puesto', 'Descripción', 'Problema', 'Valor', 'Diferencial', 'Herramientas', 'Capa física', 'Ahorro a medir', 'Impacto a medir', 'Voz', 'Escala', 'Stack', 'Publicación', 'Cambios v12.1', 'Peso en entrevistas'];
const CLAVE = { Puesto: 'puesto', 'Descripción': 'descripcion', Problema: 'problema', Valor: 'valor', Diferencial: 'diferencial', Herramientas: 'herramientas', 'Capa física': 'capaFisica', 'Ahorro a medir': 'ahorro', 'Impacto a medir': 'impacto', Voz: 'voz', Escala: 'escala', Stack: 'stack', 'Publicación': 'publicacion', 'Cambios v12.1': 'cambios', 'Peso en entrevistas': 'pesoEntrevistas' };

for (const l of lineas) {
  const cab = l.match(/^- (PROJECT|CERT|ENGLISH|MATH|JOB SEARCH|CONSOLIDATION|STAGE CLOSE|CLOSE & RENEWALS)(.*?) · (.+)$/);
  if (cab) {
    const partes = cab[3].split(' · ');
    const yMatch = partes[0].match(/\d{4}/g);
    let r = rango(partes[0], yMatch ? Number(yMatch[yMatch.length - 1]) : anio);
    if (r.inicio < ultimoInicio) r = rango(partes[0], anio + 1);
    anio = Number(r.fin.slice(0, 4));
    ultimoInicio = r.inicio;
    const b = bloques.find((x) => x.fechas.inicio === r.inicio && !x.archivado);
    if (!b) { avisos.push(`sin bloque que empiece el ${r.inicio}: ${l.slice(2, 60)}`); actual = null; continue; }
    if (b.fechas.fin !== r.fin) avisos.push(`${b.id}: termina el ${b.fechas.fin} en el plan y el ${r.fin} en v12.2`);
    const h = cab[3].match(/· (\d+(?:\.\d+)?) h(?: \(lim (\d+)\))?/);
    if (h && b.horas != null && Number(h[1]) !== b.horas) avisos.push(`${b.id}: ${b.horas} h en el plan y ${h[1]} h en v12.2`);
    const nota = cab[3].match(/scope note: (.+)$/);
    actual = { id: b.id, tipo: cab[1], rango: r };
    if (cab[1] === 'PROJECT') detalle[b.id] = { ...(nota ? { notaAlcance: nota[1].trim() } : {}), ...(h ? { horas: Number(h[1]), ...(h[2] ? { horasLim: Number(h[2]) } : {}) } : {}), versiones: [] };
    continue;
  }
  if (!actual) continue;
  const bg = l.match(/^\s+· BACKGROUND → (.+)$/);
  if (bg) {
    if (/PAUSED/.test(bg[1])) { fondo[actual.id] = { pausa: 'PNPT' }; continue; }
    const sec = bg[1].match(/secondary: (.+?) · commercial: (.+)$/);
    const secs = sec[1].trim();
    const com = sec[2].trim();
    fondo[actual.id] = {
      secundaria: /^free/.test(secs) ? 'libre' : secs.split(/,\s*/).map((x) => { const m = x.match(/^(.+) v(\d\.\d)$/); return { app: m[1].trim(), version: m[2] }; }),
      comercial: com === '—' ? null : Number(com.match(/#(\d+)/)[1]),
    };
    continue;
  }
  if (actual.tipo !== 'PROJECT') continue;
  const v = l.match(/^\s+· v(\d\.\d) · (.+?): (.+)$/);
  if (v) {
    const [, id, cuando, texto] = v;
    const dl = cuando.match(/\(límite ([^)]+)\)/);
    let fechas = null;
    if (!/base ya hecha/.test(cuando)) {
      const prev = detalle[actual.id].versiones.at(-1);
      const mesCtx = prev?.fin ? Number(prev.fin.slice(5, 7)) : Number(actual.rango.inicio.slice(5, 7));
      const yCtx = prev?.fin ? Number(prev.fin.slice(0, 4)) : Number(actual.rango.inicio.slice(0, 4));
      const limpio = cuando.replace(/\(.*?\)/, '').trim();
      const dos = limpio.match(/^(\d+) \+ (\d+ \w+)$/); // "19 + 27 dic": un día suelto y el siguiente tramo
      fechas = dos ? { inicio: rango(`${dos[1]}–${dos[2]}`, yCtx, mesCtx).inicio, fin: rango(dos[2], yCtx, mesCtx).fin, partida: true } : rango(limpio, yCtx, mesCtx);
      if (fechas.fin < fechas.inicio || fechas.inicio < actual.rango.inicio) { const r2 = rango(limpio, yCtx + 1, mesCtx); if (r2.inicio >= actual.rango.inicio) fechas = r2; }
      if (dl) {
        const p = punto(dl[1]);
        const yd = p.m < Number(fechas.fin.slice(5, 7)) ? Number(fechas.fin.slice(0, 4)) + 1 : Number(fechas.fin.slice(0, 4));
        fechas.deadline = iso(yd, p.m, p.d);
      }
    }
    const entregables = (texto.includes(';') ? texto.split(/;\s*/) : texto.split(/,\s*/)).map((x) => x.trim()).filter(Boolean);
    detalle[actual.id].versiones.push({ id, ...(fechas ?? { base: true }), linea: texto.trim(), entregables });
    continue;
  }
  const c = l.match(/^\s+· ([^:]+): (.+)$/);
  if (c && CAMPOS.includes(c[1])) detalle[actual.id][CLAVE[c[1]]] = c[2].trim();
}

// Las versiones contra las del plan (proyectos-v7.json).
for (const [id, d] of Object.entries(detalle)) {
  const vs = PV7.proyectos[id]?.versiones ?? [];
  for (const v of d.versiones) {
    const p = vs.find((x) => x.id === v.id);
    if (!p) { if (!v.base) avisos.push(`${id} v${v.id}: no está en el plan`); continue; }
    if (v.inicio && (p.inicio !== v.inicio || p.fin !== v.fin)) avisos.push(`${id} v${v.id}: ${p.inicio}–${p.fin} en el plan y ${v.inicio}–${v.fin} en v12.2`);
    if (v.deadline && p.deadline !== v.deadline) avisos.push(`${id} v${v.id}: límite ${p.deadline} en el plan y ${v.deadline} en v12.2`);
  }
}

// ——— §11: secundarias ———
const sec11 = MD.slice(MD.indexOf('## 11.'), MD.indexOf('## 12.'));
const secundarias = [];
let app = null;
const FG = { money: 'dinero', 'personal data': 'datos personales', security: 'seguridad', 'smart contracts': 'smart contracts' };
for (const l of sec11.split('\n')) {
  const h = l.match(/^\d+\. (.+?) · (.+)$/);
  if (h) {
    const [a, b] = h[2].split(/\s+–\s+/);
    const B = punto(b); const A = punto(a);
    app = { id: h[1].toLowerCase().replace(/\s+/g, '-'), nombre: h[1], inicio: iso(A.y ?? B.y, A.m, A.d), fin: iso(B.y, B.m, B.d), versiones: [] };
    secundarias.push(app);
    continue;
  }
  if (!app) continue;
  let m;
  if ((m = l.match(/^\s+- Description: (.+)$/))) app.descripcion = m[1].trim();
  else if ((m = l.match(/^\s+- Value: (.+?) Differentiator: (.+)$/))) { app.valor = m[1].trim(); app.diferencial = m[2].trim(); }
  else if ((m = l.match(/^\s+- Role: (.+?) · Interview weight: (.+?) · Targets: (.+?)\.?$/))) { app.rol = m[1].trim(); app.peso = m[2].trim(); app.empresas = m[3].split(/,\s*/); }
  else if ((m = l.match(/^\s+- Stack dev: (.+?) Staging: (.+?) Prod: (.+)$/))) app.stack = { dev: m[1].trim(), staging: m[2].trim(), prod: m[3].trim() };
  else if ((m = l.match(/^\s+- v(\d\.\d) (.+?): (.+?)(?: \[foreground review: (.+)\])?$/))) {
    const [a, b] = m[2].split(/\s+–\s+/);
    const B = punto(b); const A = punto(a);
    app.versiones.push({ id: m[1], inicio: iso(A.y ?? B.y, A.m ?? B.m, A.d), fin: iso(B.y, B.m, B.d), linea: m[3].trim(), entregables: m[3].replace(/\.$/, '').split(/,\s*/), ...(m[4] ? { revisionForeground: m[4].split(/,\s*/).map((x) => FG[x.trim()] ?? x.trim()) } : {}) });
  }
}
const backlog = (MD.match(/Backlog "Ver a futuro": (.+)/)?.[1] ?? '').split(' · ').map((x) => ({ nombre: x.replace(' ⭐', '').trim(), destacado: x.includes('⭐') }));

// ——— §12: comerciales ———
const comerciales = [];
for (const l of MD.slice(MD.indexOf('## 12. '), MD.indexOf('## 12b')).split('\n')) {
  const m = l.match(/^\|\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/);
  if (!m) continue;
  const definir = m[5].trim() === 'TO DEFINE';
  comerciales.push({ n: Number(m[1]), id: `com-${m[1]}`, inicio: m[2], fin: m[3], ventana: m[4].trim(), marca: definir ? null : m[5].trim(), queSeHace: m[6].trim() || null, wow: m[7].trim() || null, reusa: m[8].trim() || null });
}

// ——— §12b: recordatorios ———
const recordatorios = [];
for (const l of MD.slice(MD.indexOf('## 12b')).split('\n')) {
  const m = l.match(/^- (\d{4}-\d{2}-\d{2}): (.+)$/);
  if (m) recordatorios.push({ id: `v122-${m[1]}`, fecha: m[1], texto: m[2].trim() });
}

// ——— validaciones de las pistas ———
const pnpt = PLAN.bloques.find((b) => b.id === 'CW9')?.fechas;
const proyectos = PLAN.bloques.filter((b) => b.tipo === 'proyecto' && b.fechas && !b.archivado && b.id !== 'P0');
for (const c of comerciales) {
  if (c.inicio > c.fin) avisos.push(`#${c.n}: termina antes de empezar`);
  if (pnpt && c.inicio <= pnpt.fin && pnpt.inicio <= c.fin) avisos.push(`#${c.n}: cae en el PNPT`);
  for (const p of proyectos) if (c.inicio <= p.fechas.fin && p.fechas.inicio <= c.fin) avisos.push(`#${c.n}: se cruza con el proyecto ${p.id}`);
}
for (const [id, f] of Object.entries(fondo)) {
  if (f.comercial == null) continue;
  const c = comerciales.find((x) => x.n === f.comercial);
  const b = PLAN.bloques.find((x) => x.id === id);
  if (!c || c.fin < b.fechas.inicio || c.inicio > b.fechas.fin) avisos.push(`${id}: el BACKGROUND dice #${f.comercial} y ese slot no cae en el bloque`);
}

const out = { version: 1, plan: 'v12.2', fuente: 'docs/prompts/plan-v12.2.md', detalle, fondo, secundarias, comerciales, recordatorios, backlog };
writeFileSync(join(RAIZ, 'data/v12-2.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(detalle).length} proyectos con detalle · ${Object.keys(fondo).length} líneas de fondo · ${secundarias.length} secundarias · ${comerciales.length} comerciales · ${recordatorios.length} recordatorios`);
if (avisos.length) console.log(`Avisos (${avisos.length}):\n- ${avisos.join('\n- ')}`);
