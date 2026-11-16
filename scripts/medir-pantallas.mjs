#!/usr/bin/env node
/**
 * Ola 22 · mide cuántas pantallas de scroll ocupa cada pantalla de Trazo en un teléfono de 390 × 844 px y
 * falla si alguna pasa del presupuesto (3 pantallas, con 0,2 de margen) o si algo se desborda a los lados.
 *
 * Uso (con la app servida, por ejemplo `npx vite preview --port 4173`):
 *   npm run pantallas
 *   BASE=http://127.0.0.1:4173/personal-tracker/ PRESUPUESTO=3.2 node scripts/medir-pantallas.mjs
 *
 * Requiere Playwright instalado (no está en las dependencias del proyecto: el CI no lo corre).
 */
import { createRequire } from 'node:module';

// `require` respeta NODE_PATH: sirve con un Playwright instalado en global.
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/personal-tracker/';
const PRESUPUESTO = Number(process.env.PRESUPUESTO ?? 3.2);
const RUTAS = [
  'hoy', 'estudio', 'estudio/mate', 'estudio/mate/W1', 'estudio/prog', 'estudio/prog/P3', 'estudio/prog/P3/metas', 'estudio/idiomas', 'estudio/idiomas/ingles',
  'estudio/idiomas/frances', 'estudio/idiomas/biblioteca', 'estudio/idiomas/ascenso', 'estudio/libro/mwm', 'estudio/ruta/matematica',
  'metas/ruta', 'metas/semana', 'metas/mes', 'metas/bimestre', 'metas/anio', 'metas/etapas', 'metas/mapa', 'metas/evolucion', 'metas/sprint', 'metas/impacto',
  'metas/trabajo', 'metas/ingles', 'metas/handyx', 'metas/proyecto/P1', 'entreno', 'entreno-semana', 'entreno-motor', 'entreno-peso',
  'perfil', 'ajustes', 'ajustes-rutinas', 'ajustes-datos', 'avance', 'unidades', 'como', 'repaso', 'flojo', 'tarjetas', 'motor', 'pomodoros', 'json', 'importar',
  'cierre', 'actividad', 'meta-nueva/semana',
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
await page.goto(BASE);
await page.waitForSelector('input');
await page.locator('input').first().fill('Toti');
await page.locator('input').nth(1).fill('Abi');
await page.getByRole('button', { name: /Empezar/ }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Empezar el día/ }).click();
await page.waitForTimeout(1000);

const filas = [];
for (const ruta of RUTAS) {
  await page.goto(`${BASE}#/${ruta}`);
  await page.reload();
  await page.waitForTimeout(1800);
  const salir = page.getByRole('button', { name: /Hoy no/ });
  if (await salir.count()) { await salir.click(); await page.waitForTimeout(300); }
  const [pantallas, desborde] = await page.evaluate(() => [Math.round((document.documentElement.scrollHeight / window.innerHeight) * 10) / 10, document.documentElement.scrollWidth - window.innerWidth]);
  filas.push({ ruta, pantallas, desborde });
}
await browser.close();

filas.sort((a, b) => b.pantallas - a.pantallas);
let mal = 0;
for (const f of filas) {
  const pasa = f.pantallas <= PRESUPUESTO && f.desborde <= 0;
  if (!pasa) mal++;
  console.log(`${pasa ? 'ok ' : 'MAL'} ${String(f.pantallas).padStart(4)}  ${f.desborde > 0 ? `desborde ${f.desborde} px  ` : ''}${f.ruta}`);
}
console.log(`\n${filas.length} pantallas · presupuesto ${PRESUPUESTO} · ${mal ? `${mal} se pasan` : 'todas dentro'}`);
process.exit(mal ? 1 : 0);
