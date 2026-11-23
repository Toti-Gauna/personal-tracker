#!/usr/bin/env node
/**
 * Trazo · el presupuesto de peso (tanda 3.5). Después de `npm run build`, mide en gzip lo que baja la primera vez (index.html,
 * el script de entrada, lo que precarga y su CSS) y cada pedazo que se carga después, y falla si algo pasa su tope.
 * Corre en el CI después del build: una dependencia o un JSON grande que se cuele en la carga inicial lo frena ahí.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = process.env.DIST ?? 'dist';
const KB = 1024;
/** Topes en KB gzip. La carga inicial incluye los datos del plan (el estado los necesita para arrancar). */
const TOPE = { inicial: 290, pedazo: 45, escena3d: 150, css: 20 };
/** Pedazos grandes a propósito, que nunca están en la carga inicial: la constelación 3D (three.js). */
const GRANDES = [/^constelacion-escena-/];

const gz = (f) => gzipSync(readFileSync(join(DIST, f))).length;
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
/** La ruta dentro de dist: sin la base de GitHub Pages (/personal-tracker/). */
const base = (u) => u.replace(/^\/personal-tracker\//, '').replace(/^\.?\//, '');
const entrada = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => base(m[1]));
const precarga = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => base(m[1]));
const hojas = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => base(m[1]));
const iniciales = new Set([...entrada, ...precarga, ...hojas]);

const fallos = [];
const inicial = gz('index.html') + [...iniciales].reduce((s, f) => s + gz(f), 0);
const filas = [['carga inicial', inicial, TOPE.inicial]];
if (inicial > TOPE.inicial * KB) fallos.push(`la carga inicial pesa ${(inicial / KB).toFixed(1)} KB (tope ${TOPE.inicial})`);

for (const f of readdirSync(join(DIST, 'assets')).map((x) => `assets/${x}`)) {
  if (iniciales.has(f) || !/\.(js|css)$/.test(f)) continue;
  const n = f.slice('assets/'.length);
  const grande = GRANDES.some((r) => r.test(n));
  const tope = f.endsWith('.css') ? TOPE.css : grande ? TOPE.escena3d : TOPE.pedazo;
  const p = gz(f);
  if (p > tope * KB) fallos.push(`${n} pesa ${(p / KB).toFixed(1)} KB (tope ${tope})`);
  if (p > 8 * KB) filas.push([n, p, tope]);
}
for (const f of iniciales) if (GRANDES.some((r) => r.test(f.slice(7)))) fallos.push(`${f} está en la carga inicial y tiene que bajar solo cuando se usa`);

console.log(filas.map(([n, p, t]) => `${String(n).padEnd(34)} ${(p / KB).toFixed(1).padStart(6)} KB  (tope ${t})`).join('\n'));
if (fallos.length) { console.error(`\nSe pasó del presupuesto:\n- ${fallos.join('\n- ')}`); process.exit(1); }
console.log('\nDentro del presupuesto.');
