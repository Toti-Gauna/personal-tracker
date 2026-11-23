#!/usr/bin/env node
/**
 * Trazo · la revisión (tanda 1.8). Abre cada pantalla en un teléfono de 390 × 844, en claro y en oscuro,
 * saca las capturas y mide lo que el lenguaje (docs/ux/lenguaje-2.0.md §7 y §12) pide:
 *   - título: hasta 3 palabras · intro: hasta 12 · antes de desplazar: hasta 60 · alto: hasta 4 pantallas.
 * Las pantallas del marco (`.m-marco`) cumplen o fallan el presupuesto; las del taller (`.lenguaje`) son documentación y se
 * miden sin fallar; las de pantalla completa (la sesión, la presentación) se miden sin presupuesto. Desde que la 2.0 es la
 * única interfaz, también falla si una ruta muestra "No encontré esa pantalla" (se perdió en el registro).
 *
 * Uso (con la app servida: `npx vite preview --port 4173`):
 *   npm run v2:revision
 *   BASE=http://127.0.0.1:4173/personal-tracker/ OUT=revision-v2 node scripts/v2-revision.mjs
 *
 * Sale con código 1 si una pantalla pasa el presupuesto. Requiere Playwright (no va en el CI).
 * `SOLO=id,id` mide solo esas pantallas.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { ELEGIDAS, abrirApp, visitar, volver } from './revision-comun.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = process.env.OUT ?? 'revision-v2';
const PRESUPUESTO = { titulo: 3, intro: 12, pliegue: 60, pantallas: 4 };
/**
 * Pendientes conocidos: una pantalla que se sabe fuera del presupuesto mientras se rehace (id → motivo). Sigue apareciendo en el
 * informe con su motivo, pero no rompe la revisión. Vacío desde la 3.3.
 */
const PENDIENTES = {};

/** Mide una pantalla ya renderizada: palabras del título, la intro y lo visible antes de desplazar, y el alto. */
const medir = () => {
  // Una palabra tiene al menos una letra o un número: los separadores (·, ›, –) no cuentan.
  const palabras = (t) => (t ?? '').trim().split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;
  const main = document.querySelector('main');
  const titulo = palabras(document.querySelector('h1')?.textContent);
  const intro = palabras(document.querySelector('.m-intro')?.textContent);
  let pliegue = 0;
  const w = document.createTreeWalker(main ?? document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    const el = n.parentElement;
    // No cuenta lo que no se ve (la navegación, lo que flota, el texto solo para lector de pantalla, el título chico oculto arriba)
    // ni lo que está dentro de un gráfico (data-grafico): los nombres de las barras y los meses del eje son datos, no prosa.
    if (!el || !n.textContent.trim() || el.closest('.b2, .c-avisos, .h-velo, .v2-oculto, .m-titulo-chico, [data-grafico], script, style')) continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
    // Lo que quedó a un costado en una tira que se desliza (las pestañas de ejercicios) no se está leyendo.
    if (r.left >= window.innerWidth || r.right <= 0) continue;
    if (r.top >= 0 && r.top < 844 - 78) pliegue += palabras(n.textContent);
  }
  return {
    marco: !!document.querySelector('.m-marco'),
    perdida: !!document.querySelector('main') && /No encontré esa pantalla/.test(document.querySelector('main').textContent ?? ''),
    // La presentación ocupa toda la pantalla y no usa el marco: es 2.0, pero sin título ni pliegue que medir.
    completa: !!document.querySelector('main.wr, main.v2-completa'),
    taller: !!document.querySelector('main.lenguaje'),
    titulo,
    intro,
    pliegue,
    pantallas: Math.round((document.documentElement.scrollHeight / 844) * 100) / 100,
    desbordeLateral: document.documentElement.scrollWidth > window.innerWidth,
  };
};

const browser = await chromium.launch();
const filas = [];

for (const tema of ['light', 'dark']) {
  const { ctx, page, errores } = await abrirApp(browser, tema);
  const dir = join(OUT, tema);
  mkdirSync(dir, { recursive: true });
  for (const p of ELEGIDAS) {
    const previo = await visitar(page, p);
    const m = await page.evaluate(medir);
    await page.screenshot({ path: join(dir, `${p.id}.png`), fullPage: true });
    filas.push({ tema, pantalla: p.id, ...m, errores: errores.splice(0) });
    await volver(page, previo);
  }
  await ctx.close();
}

await browser.close();

// Presupuesto: solo el marco 2.0 que no es taller.
const fallos = [];
const pendientes = [];
const gate = (f) => f.marco && !f.taller;
for (const f of filas.filter(gate)) {
  const motivos = [];
  if (f.titulo > PRESUPUESTO.titulo) motivos.push(`título ${f.titulo} palabras (máx. ${PRESUPUESTO.titulo})`);
  if (f.intro > PRESUPUESTO.intro) motivos.push(`intro ${f.intro} palabras (máx. ${PRESUPUESTO.intro})`);
  if (f.pliegue > PRESUPUESTO.pliegue) motivos.push(`${f.pliegue} palabras antes de desplazar (máx. ${PRESUPUESTO.pliegue})`);
  if (f.pantallas > PRESUPUESTO.pantallas) motivos.push(`${f.pantallas} pantallas de alto (máx. ${PRESUPUESTO.pantallas})`);
  for (const m of motivos) {
    if (PENDIENTES[f.pantalla]) pendientes.push(`${f.tema} ${f.pantalla}: ${m}. Pendiente: ${PENDIENTES[f.pantalla]}`);
    else fallos.push(`${f.tema} ${f.pantalla}: ${m}`);
  }
}
for (const f of filas) if (f.desbordeLateral) fallos.push(`${f.tema} ${f.pantalla}: se desborda a los lados`);
// Toda ruta medida tiene su pantalla: si dice "No encontré esa pantalla", se perdió en el registro.
for (const f of filas) if (f.perdida) fallos.push(`${f.tema} ${f.pantalla}: dice "No encontré esa pantalla"`);
for (const f of filas) for (const e of f.errores) fallos.push(`${f.tema} ${f.pantalla}: error de página: ${e}`);

const tabla = [
  '| tema | pantalla | marco | título | intro | antes de desplazar | alto (pantallas) |',
  '|---|---|---|---|---|---|---|',
  ...filas.map((f) => `| ${f.tema} | ${f.pantalla} | ${f.taller ? 'taller' : f.marco ? 'marco' : f.completa ? 'pantalla completa' : 'sin marco'} | ${f.titulo} | ${f.intro} | ${f.pliegue} | ${f.pantallas} |`),
];
const informe = [
  '# Revisión 2.0',
  '',
  `Presupuesto del marco 2.0: título ${PRESUPUESTO.titulo} · intro ${PRESUPUESTO.intro} · antes de desplazar ${PRESUPUESTO.pliegue} · alto ${PRESUPUESTO.pantallas} pantallas.`,
  '',
  fallos.length ? `**Fallos (${fallos.length}):**\n${fallos.map((x) => `- ${x}`).join('\n')}` : '**Sin fallos en el marco 2.0.**',
  pendientes.length ? `\n**Pendientes conocidos (${pendientes.length}):**\n${pendientes.map((x) => `- ${x}`).join('\n')}` : '',
  '',
  ...tabla,
  '',
].join('\n');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'informe.md'), informe);
console.log(informe);
process.exitCode = fallos.length ? 1 : 0;
