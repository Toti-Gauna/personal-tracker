#!/usr/bin/env node
/**
 * Trazo 2.0 · la revisión (tanda 1.8). Abre cada pantalla de la 2.0 en un teléfono de 390 × 844, en claro y en oscuro,
 * saca las capturas y mide lo que el lenguaje (docs/ux/lenguaje-2.0.md §7 y §12) pide:
 *   - título: hasta 3 palabras · intro: hasta 12 · antes de desplazar: hasta 60 · alto: hasta 4 pantallas.
 * Las pantallas del marco 2.0 (`.m-marco`) cumplen o fallan el presupuesto; las del taller (`.lenguaje`) son
 * documentación y se miden sin fallar; las que todavía son 1.0 dentro de la 2.0 se listan para ver qué falta.
 *
 * Uso (con la app servida: `npx vite preview --port 4173`):
 *   npm run v2:revision
 *   BASE=http://127.0.0.1:4173/personal-tracker/ OUT=revision-v2 node scripts/v2-revision.mjs
 *
 * Sale con código 1 si una pantalla del marco 2.0 pasa el presupuesto. Requiere Playwright (no va en el CI).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/personal-tracker/';
const OUT = process.env.OUT ?? 'revision-v2';
const PRESUPUESTO = { titulo: 3, intro: 12, pliegue: 60, pantallas: 4 };
/**
 * Pendientes conocidos: pantallas del marco 2.0 que todavía muestran controles de la 1.0 y se rehacen en una tanda
 * posterior. Siguen apareciendo en el informe con su motivo, pero no rompen la revisión.
 */
const PENDIENTES = {
  'ajustes-plan': 'los controles del plan T+18 son de la 1.0; se rehacen en 3.3',
  'puntos-analisis': 'los gráficos del análisis (mapa, cómo fallás, recall, calibración) son de la 1.0; se rehacen en 3.3',
};

/** Las pantallas de la 2.0 que medimos. `taller` marca lo que es documentación del sistema. */
const PANTALLAS = [
  { id: 'hoy', hash: '#/hoy' },
  { id: 'estudio', hash: '#/estudio' },
  { id: 'plan', hash: '#/metas' },
  { id: 'plan-petria', hash: '#/metas/periodos/P1' },
  { id: 'plan-version', hash: '#/metas/periodos/P1%3Av1.0' },
  { id: 'plan-fase', hash: '#/metas/periodos/F1' },
  { id: 'plan-analisis', hash: '#/metas/analisis' },
  { id: 'plan-linea', hash: '#/metas/linea' },
  { id: 'plan-mapa', hash: '#/metas/constelacion' },
  { id: 'bloque-proyecto', hash: '#/metas/proyecto/P1' },
  { id: 'bloque-cert', hash: '#/metas/proyecto/CW1' },
  { id: 'bloque-ventana', hash: '#/metas/proyecto/W1' },
  { id: 'cert', hash: '#/metas/cert/claude-architect' },
  { id: 'ventana', hash: '#/metas/ventana/W1' },
  { id: 'fondo', hash: '#/metas/fondo' },
  { id: 'fondo-pista-sec', hash: '#/metas/pista/secundaria' },
  { id: 'fondo-pista-com', hash: '#/metas/pista/comercial' },
  { id: 'fondo-app', hash: '#/metas/fondo/handyx' },
  { id: 'fondo-showcase', hash: '#/metas/fondo/com-1' },
  { id: 'iman', hash: '#/metas/iman/handyx' },
  { id: 'open-source', hash: '#/metas/open-source' },
  { id: 'estudio-mate', hash: '#/estudio/mate' },
  { id: 'estudio-libro', hash: '#/estudio/mate/libro/conamat' },
  { id: 'repasar', hash: '#/repaso' },
  { id: 'puntos-debiles', hash: '#/flojo' },
  { id: 'puntos-analisis', hash: '#/flojo/analisis' },
  { id: 'tarjetas', hash: '#/tarjetas' },
  { id: 'como', hash: '#/como' },
  { id: 'entreno', hash: '#/entreno' },
  { id: 'perfil', hash: '#/perfil' },
  { id: 'ajustes', hash: '#/ajustes' },
  { id: 'ajustes-bimestres', hash: '#/ajustes/bimestres' },
  { id: 'ajustes-plan', hash: '#/ajustes/plan' },
  { id: 'taller-lenguaje', hash: '#/v2' },
  { id: 'taller-controles', hash: '#/v2/kit' },
  { id: 'taller-piezas', hash: '#/v2/piezas' },
  { id: 'taller-movimiento', hash: '#/v2/movimiento' },
];

const SEMBRAR = () => {
  const s = JSON.parse(localStorage.getItem('trazo.v1'));
  s.settings.interfaz = 'v2';
  localStorage.setItem('trazo.v1', JSON.stringify(s));
};

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
    if (r.top >= 0 && r.top < 844 - 78) pliegue += palabras(n.textContent);
  }
  return {
    marco: !!document.querySelector('.m-marco'),
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'America/Argentina/Buenos_Aires', colorScheme: tema });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.clock.setSystemTime(new Date('2026-11-23T09:30:00-03:00'));
  await page.goto(BASE);
  await page.waitForSelector('input');
  await page.locator('input').first().fill('Toti');
  await page.locator('input').nth(1).fill('Abi');
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(600);
  const c = page.getByRole('button', { name: /04:00/ });
  if (await c.count()) await c.first().click(); else await page.getByRole('button', { name: /Empezar el día/ }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(SEMBRAR);
  const dir = join(OUT, tema);
  mkdirSync(dir, { recursive: true });
  for (const p of PANTALLAS) {
    await page.goto(BASE + p.hash);
    await page.reload();
    // La carga de la 2.0 (.sp2) tapa la pantalla unos 1,2 s: se espera a que termine antes de medir.
    await page.waitForSelector('.sp2', { state: 'detached', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.evaluate(() => { document.querySelectorAll('.h-velo, .sp2').forEach((e) => e.remove()); });
    const m = await page.evaluate(medir);
    await page.screenshot({ path: join(dir, `${p.id}.png`), fullPage: true });
    filas.push({ tema, pantalla: p.id, ...m, errores: errores.splice(0) });
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
for (const f of filas) for (const e of f.errores) fallos.push(`${f.tema} ${f.pantalla}: error de página: ${e}`);

const tabla = [
  '| tema | pantalla | marco | título | intro | antes de desplazar | alto (pantallas) |',
  '|---|---|---|---|---|---|---|',
  ...filas.map((f) => `| ${f.tema} | ${f.pantalla} | ${f.taller ? 'taller' : f.marco ? '2.0' : '1.0 (dentro de la 2.0)'} | ${f.titulo} | ${f.intro} | ${f.pliegue} | ${f.pantallas} |`),
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
