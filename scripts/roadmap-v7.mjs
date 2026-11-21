#!/usr/bin/env node
/**
 * Ola 30 · arma `data/proyectos-v7.json` a partir de `docs/prompts/roadmap-completo-v7.md`: la ficha de cada proyecto (puesto, qué
 * hace, problema, valor, diferencial, herramientas con ★, capa física, qué se mide, notificaciones, voz, escala, operación, stack
 * por ambiente, algorithm spots, hardware, por qué hace ruido y entrevistas), sus versiones con fechas y alcance, la preparación de
 * las certificaciones, el contenido de las ventanas y el estándar de 12 puntos. Además rehace las `tecnologias` de cada proyecto en
 * `data/plan-extendido.json` desde el stack v7 (conserva los alias y anota el cambio en el historial).
 *
 * Uso: node scripts/roadmap-v7.mjs   (no toca nada más; correrlo de nuevo da el mismo resultado)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD = readFileSync(join(RAIZ, 'docs/prompts/roadmap-completo-v7.md'), 'utf8');
const EXT_PATH = join(RAIZ, 'data/plan-extendido.json');
const EXT = JSON.parse(readFileSync(EXT_PATH, 'utf8'));
const HOY = '2026-11-20';

const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
const pad = (n) => String(n).padStart(2, '0');

// ——— secciones ———

/** Las secciones "## Título" con sus líneas. */
function secciones(md) {
  const out = [];
  let cur = null;
  for (const l of md.split('\n')) {
    if (/^#{1,2} /.test(l)) {
      if (cur) out.push(cur);
      cur = l.startsWith('## ') ? { titulo: l.slice(3).trim(), lineas: [] } : null;
      continue;
    }
    if (cur) cur.lineas.push(l);
  }
  if (cur) out.push(cur);
  return out;
}

/** Los campos "- **Campo:** texto" de una sección, con sus sublistas ("  - ..."). */
function campos(lineas) {
  const out = [];
  for (const l of lineas) {
    const m = l.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (m) { out.push({ campo: m[1], texto: m[2].trim(), sub: [] }); continue; }
    const s = l.match(/^(\s+)- (.*)$/);
    if (s && out.length) out[out.length - 1].sub.push({ nivel: s[1].length, texto: s[2].trim() });
  }
  return out;
}

const limpiar = (t) => t.replace(/\s+/g, ' ').replace(/[.:]$/, '').trim();

/** Parte por ";" (o "," con `comas`) fuera de paréntesis y comillas. */
function partir(t, comas = false) {
  const out = [];
  let prof = 0;
  let comilla = false;
  let cur = '';
  for (const ch of t) {
    if (ch === '(') prof++;
    if (ch === ')') prof = Math.max(0, prof - 1);
    if (ch === '"') comilla = !comilla;
    if (!prof && !comilla && (ch === ';' || (comas && ch === ','))) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(limpiar).filter(Boolean);
}

/** Una lista con ★ (estrella) y "extras: a, b" (lo que no es del alcance mínimo). */
function items(c) {
  if (!c) return undefined;
  const crudos = c.sub.length ? c.sub.map((s) => s.texto) : [c.texto];
  const out = [];
  for (const crudo of crudos) {
    for (const p of partir(crudo)) {
      const ex = p.match(/^extras?:\s*(.*)$/i);
      if (ex) { for (const e of partir(ex[1], true)) out.push({ nombre: e.replace(/^★\s*/, ''), ...(e.startsWith('★') ? { estrella: true } : {}), extra: true }); continue; }
      out.push({ nombre: p.replace(/^★\s*/, ''), ...(p.startsWith('★') ? { estrella: true } : {}) });
    }
  }
  return out.length ? out : undefined;
}

/** Una lista simple (bullets o una línea partida por ";"). */
function lista(c) {
  if (!c) return undefined;
  const xs = c.sub.length ? c.sub.map((s) => limpiar(s.texto)) : partir(c.texto);
  return xs.length ? xs : undefined;
}

const texto = (c) => (c ? limpiar(c.texto) : undefined);

// ——— fechas de versiones ———

/** "19 nov – 1 dic", "13–21 ene", "6–14 jul 2027", "27 dic – 5 ene" → [inicio, fin] con el año del bloque. */
function rango(t, anioBase, mesBase) {
  const m = t.match(/^(\d{1,2})(?:\s+([a-z]{3}))?(?:\s+(\d{4}))?\s*–\s*(\d{1,2})\s+([a-z]{3})(?:\s+(\d{4}))?$/);
  if (!m) return null;
  const [, d1, m1s, a1s, d2, m2s, a2s] = m;
  const m2 = MESES[m2s];
  const m1 = m1s ? MESES[m1s] : m2;
  let a1 = a1s ? Number(a1s) : anioBase;
  if (!a1s && m1 < mesBase) a1 += 1;
  let a2 = a2s ? Number(a2s) : a1;
  if (!a2s && m2 < m1) a2 = a1 + 1;
  return [`${a1}-${pad(m1)}-${pad(Number(d1))}`, `${a2}-${pad(m2)}-${pad(Number(d2))}`];
}

const NOMBRES_VERSION = { '1.0': 'MVP', '1.1': 'Producto', '2.0': 'Plataforma', '2.1': 'Completa', '3.0': 'Producción' };

function versiones(c, roadmap) {
  if (!c) return [];
  const [anio, mes] = [Number(roadmap.inicio.slice(0, 4)), Number(roadmap.inicio.slice(5, 7))];
  const out = [];
  for (const s of c.sub) {
    const m = s.texto.match(/^\*\*(\d\.\d)(?:\s+([^(*]+?))?\s*\(([^)]*)\):\*\*\s*(.*)$/);
    if (!m) continue;
    const [, id, nombre, paren, resto] = m;
    const partes = paren.split(',').map((x) => x.trim());
    const horas = partes.map((x) => x.match(/^≈?\s*(\d+)\s*h$/)).find(Boolean);
    const fechas = partes.map((x) => rango(x, anio, mes)).find(Boolean);
    const alcance = resto ? partir(resto, true) : [];
    // Las sublistas (PetrIA 1.1) se suman al alcance.
    const idx = c.sub.indexOf(s);
    for (let k = idx + 1; k < c.sub.length && c.sub[k].nivel > s.nivel; k++) alcance.push(limpiar(c.sub[k].texto));
    out.push({
      id, nombre: (nombre ?? NOMBRES_VERSION[id] ?? '').trim() || NOMBRES_VERSION[id],
      ...(fechas ? { inicio: fechas[0], fin: fechas[1] } : {}),
      ...(paren.includes('en curso') ? { enCurso: true } : {}),
      ...(horas ? { horas: Number(horas[1]) } : {}),
      alcance,
    });
  }
  return out;
}

// ——— stack ———

/** Lo que no es una tecnología dentro de una línea del stack (frases del roadmap). */
const NO_TECNOLOGIA = /^(no aplica|explica|nunca decide|el de cada proyecto|a definir|comparado con|comparativa con)/i;
/** Piezas en minúscula que sí son tecnologías (el resto en minúscula es una frase: "portal seguro", "router"). */
const MINUSCULA_OK = new Set(['cFS', 'k3s', 'pgvector', 'scikit-learn', 'garak', 'osquery', 'cosign', 'mTLS', 'platform-kit', 'websockets']);
/** Nombres canónicos (como los busca una vacante). */
const CANON = { 'Kubernetes endurecido': 'Kubernetes', Node: 'Node.js', 'Rails como monolito modular': 'Ruby on Rails', 'backoffice en Rails': 'Ruby on Rails', Rails: 'Ruby on Rails', 'GraphQL opcional': 'GraphQL', 'Neon con pgvector en la 2.0': 'Neon', 'JSON en la v1': '', 'series de tiempo': '', 'Postgres append-only': 'Postgres', 'MCP hacia cada proyecto': 'MCP', 'microfrontends sobre Constelación': 'Microfrontends', 'Rust embebido': 'Rust', 'SGP4 en Rust': 'Rust', 'serving en Kubernetes': 'Kubernetes', 'ONNX Runtime Mobile': 'ONNX Runtime', 'desidentificador en Rust compilado a WebAssembly': 'Rust|WebAssembly', 'C#': 'C#', '.NET': '.NET', '6 servicios': '', PDF: '', 'Alpha Lab': '', 'RAG de manuales': 'RAG', 'AWS (EKS, MSK)': 'AWS' };

/** Las tecnologías de una línea del stack: partida por "," y ";" y por "+", "sobre", "con", "y" y "o"; la † marca "a confirmar". */
function tecnologiasDe(linea) {
  return partir(linea, true).flatMap((x) => {
    let t = x.replace(/\.$/, '').replace(/`/g, '').trim();
    if (!t || NO_TECNOLOGIA.test(t)) return [];
    // El paréntesis final es detalle (va a la nota); la † de adentro no marca a la pieza entera.
    const par = t.match(/^(.*?)\s*\(([^)]*)\)\s*(†?)$/);
    const nota = par ? par[2] : undefined;
    if (par) t = `${par[1]}${par[3]}`;
    const propuesta = t.includes('†');
    t = t.replace(/†/g, '').trim();
    if (CANON[t] != null) return CANON[t].split('|').filter(Boolean).map((n) => ({ nombre: n, ...(propuesta ? { opcional: true } : {}), ...(nota ? { nota } : {}) }));
    const piezas = t.split(/\s+(?:\+|sobre|con|y|o)\s+/).map((p) => p.trim()).filter(Boolean);
    return piezas.flatMap((p) => {
      const c = CANON[p] ?? p;
      if (!c || NO_TECNOLOGIA.test(c)) return [];
      if (/^[a-záéíóú]/.test(c) && !MINUSCULA_OK.has(c)) return [];
      if (c.split(' ').length > 4) return [];
      return [{ nombre: c, ...(propuesta ? { opcional: true } : {}), ...(nota && piezas.length === 1 ? { nota } : {}) }];
    });
  });
}

function stack(c) {
  if (!c) return undefined;
  if (!c.sub.length) return { nota: limpiar(c.texto), ambientes: [] };
  const ambientes = c.sub.map((s) => {
    const m = s.texto.match(/^([^:]+):\s*(.*)$/);
    return m ? { ambiente: m[1].trim(), texto: limpiar(m[2]) } : { ambiente: '', texto: limpiar(s.texto) };
  });
  return { ambientes };
}

// ——— armado ———

const IDS = Object.fromEntries(EXT.bloques.filter((b) => b.tipo === 'proyecto').map((b) => [b.nombre, b.id]));
IDS['Constelación'] = 'P0';
const proyectos = {};
const certs = {};
const ventanas = {};
let estandar = [];
let reglas = [];
let versionesBase = [];

for (const s of secciones(MD)) {
  const nombre = s.titulo.split(' · ').slice(1).join(' · ').trim();
  const cs = campos(s.lineas);
  const c = (k) => cs.find((x) => x.campo === k || x.campo.startsWith(`${k} (`));
  if (s.titulo.startsWith('Estándar de alto valor')) {
    estandar = s.lineas.filter((l) => /^\d+\. /.test(l)).map((l) => {
      const [, n, t] = l.match(/^(\d+)\. (.*)$/);
      const det = [];
      const i = s.lineas.indexOf(l);
      for (let k = i + 1; k < s.lineas.length && /^\s+- /.test(s.lineas[k]); k++) det.push(limpiar(s.lineas[k].replace(/^\s+- /, '')));
      return { n: Number(n), texto: limpiar(t), ...(det.length ? { detalle: det } : {}) };
    });
    continue;
  }
  if (s.titulo.startsWith('Reglas para que haga ruido')) { reglas = s.lineas.filter((l) => l.startsWith('- ')).map((l) => limpiar(l.slice(2))); continue; }
  if (s.titulo.startsWith('Versiones (igual')) { versionesBase = s.lineas.filter((l) => l.startsWith('- ')).map((l) => limpiar(l.slice(2).replace(/\*\*/g, ''))); continue; }
  const cert = s.titulo.match(/Certificación (\d+) · (.*)$/);
  if (cert) {
    const b = EXT.bloques.find((x) => x.numero === Number(cert[1]));
    if (b) certs[b.id] = { ...(texto(c('Preparación')) ? { preparacion: texto(c('Preparación')) } : {}), ...(texto(c('Requisito')) ? { requisito: texto(c('Requisito')) } : {}) };
    continue;
  }
  const w = s.titulo.match(/^(W\d|WQ\d|WA\d) · Matemática$/);
  if (w) { ventanas[w[1]] = { contenido: texto(c('Contenido')) }; continue; }
  const id = IDS[nombre];
  if (!id || !c('Puesto')) continue;
  const b = EXT.bloques.find((x) => x.id === id);
  const med = c('Ahorro a medir') ?? c('Impacto a medir');
  const notif = c('Notificaciones');
  const vs = versiones(c('Versiones'), id === 'P0' ? { inicio: '2026-11-16' } : b.roadmap);
  proyectos[id] = {
    puesto: texto(c('Puesto')),
    queHace: lista(c('Qué hace')),
    ...(texto(c('Problema concreto')) ? { problema: texto(c('Problema concreto')) } : {}),
    ...(texto(c('Valor')) ? { valor: texto(c('Valor')) } : {}),
    ...(lista(c('Diferencial')) ? { diferencial: lista(c('Diferencial')) } : {}),
    ...(items(c('Herramientas')) ? { herramientas: items(c('Herramientas')) } : {}),
    ...(items(c('Capa física')) ? { capaFisica: items(c('Capa física')) } : {}),
    // Lo que se mide va separado por comas ("minutos por parte, errores de tipeo, …").
    ...(med ? { medir: { tipo: med.campo.startsWith('Ahorro') ? 'ahorro' : 'impacto', items: med.sub.length ? lista(med) : partir(med.texto, true) } } : {}),
    ...(notif ? { notificaciones: { ...(notif.campo.includes('(') ? { nota: notif.campo.match(/\((.*)\)/)[1] } : {}), items: items(notif) } } : {}),
    ...(items(c('Voz')) ? { voz: items(c('Voz')) } : {}),
    ...(texto(c('Escala')) ? { escala: texto(c('Escala')) } : {}),
    ...(texto(c('Operación')) ? { operacion: texto(c('Operación')) } : {}),
    ...(stack(c('Stack')) ? { stack: stack(c('Stack')) } : {}),
    ...(lista(c('Algorithm spots')) ? { spots: lista(c('Algorithm spots')) } : {}),
    ...(texto(c('Hardware')) ? { hardware: texto(c('Hardware')) } : {}),
    ...(texto(c('Por qué hace ruido')) ? { ruido: texto(c('Por qué hace ruido')) } : {}),
    ...(texto(c('Entrevistas')) ? { entrevistas: texto(c('Entrevistas')) } : {}),
    versiones: vs,
  };
}

// P0: la v1 queda en P0 (la arman los agentes); la 2.0 y la 2.1 van en P0B, con la misma ficha.
const p0 = proyectos.P0;
proyectos.P0B = { ...p0, versiones: p0.versiones.filter((v) => v.id !== '1.0') };
p0.versiones = p0.versiones.filter((v) => v.id === '1.0');

// Horas por versión: las medidas (PetrIA) quedan; el resto se reparte por días entre las horas del bloque y se marca derivado.
const dias = (a, z) => Math.round((Date.parse(z) - Date.parse(a)) / 864e5) + 1;
for (const [id, p] of Object.entries(proyectos)) {
  const b = EXT.bloques.find((x) => x.id === id);
  if (!b?.horas || p.versiones.every((v) => v.horas != null)) continue;
  const conFechas = p.versiones.filter((v) => v.inicio);
  const total = conFechas.reduce((s, v) => s + dias(v.inicio, v.fin), 0);
  let resto = b.horas;
  conFechas.forEach((v, i) => {
    const h = i === conFechas.length - 1 ? resto : Math.round((b.horas * dias(v.inicio, v.fin)) / total);
    v.horas = h;
    v.derivadas = true;
    resto -= h;
  });
}

const salida = {
  version: 1,
  fuente: 'docs/prompts/roadmap-completo-v7.md',
  generado: 'scripts/roadmap-v7.mjs',
  versionesBase,
  reglas,
  estandar,
  proyectos,
  certs,
  ventanas,
};
writeFileSync(join(RAIZ, 'data/proyectos-v7.json'), JSON.stringify(salida, null, 1) + '\n');

// ——— tecnologías desde el stack v7 ———
const norm = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Alias de todas las tecnologías que ya existían (en cualquier proyecto) más algunos comunes en las vacantes. */
const ALIAS = new Map();
for (const b of EXT.bloques) for (const t of b.tecnologias ?? []) if (t.alias?.length) ALIAS.set(norm(t.nombre), [...new Set([...(ALIAS.get(norm(t.nombre)) ?? []), ...t.alias])]);
const ALIAS_EXTRA = { 'node.js': ['node', 'nodejs'], postgres: ['postgresql'], 'c#': ['csharp'], '.net': ['dotnet'], 'ruby on rails': ['rails'], gcp: ['google cloud'], aws: ['amazon web services'], kubernetes: ['k8s'], 'next.js': ['nextjs', 'next js'], typescript: ['ts'] };
for (const [k, v] of Object.entries(ALIAS_EXTRA)) ALIAS.set(k, [...new Set([...(ALIAS.get(k) ?? []), ...v])]);
let cambiados = 0;
for (const b of EXT.bloques.filter((x) => x.tipo === 'proyecto')) {
  const p = proyectos[b.id];
  if (!p?.stack?.ambientes?.length) continue;
  const vistas = new Set();
  const nuevas = [];
  // La v1 de Constelación (P0) es mapa 3D, Trazo como caso, validador y shell: solo frontend e infra. Lo demás es de la 2.0 y la 2.1 (P0B).
  const ambientes = b.id === 'P0' ? p.stack.ambientes.filter((x) => x.ambiente === 'Frontend' || x.ambiente === 'Infra') : p.stack.ambientes;
  for (const a of ambientes) {
    for (const t of tecnologiasDe(a.texto)) {
      const k = norm(t.nombre);
      if (vistas.has(k)) continue;
      vistas.add(k);
      const alias = ALIAS.get(k);
      nuevas.push({ nombre: t.nombre, ...(alias?.length ? { alias } : {}), ...(t.opcional ? { opcional: true } : {}), ...(t.nota || t.opcional ? { nota: [t.nota, t.opcional ? 'propuesta a confirmar (†)' : null].filter(Boolean).join(' · ') } : {}), ...(a.ambiente ? { ambiente: a.ambiente } : {}) });
    }
  }
  if (JSON.stringify(nuevas) === JSON.stringify(b.tecnologias)) continue;
  b.tecnologias = nuevas;
  delete b.recortarPrimero;
  b.historial = b.historial ?? [];
  if (!b.historial.some((h) => h.fecha === HOY && h.motivo === 'Roadmap v7 (stack)')) b.historial.push({ fecha: HOY, cambio: 'Las tecnologías salen del stack de la v7, por ambiente', motivo: 'Roadmap v7 (stack)' });
  cambiados++;
}
writeFileSync(EXT_PATH, JSON.stringify(EXT, null, 1) + '\n');
console.log(`${Object.keys(proyectos).length} proyectos · ${Object.keys(certs).length} certificaciones · ${Object.keys(ventanas).length} ventanas · ${estandar.length} puntos del estándar · tecnologías rehechas en ${cambiados} proyectos`);
