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
  'hoy', 'estudio', 'estudio/mate', 'estudio/mate/W1', 'estudio/mate/m1', 'estudio/mate/libro/conamat', 'estudio/mate/libro/conamat/1', 'estudio/prog', 'estudio/prog/P3', 'estudio/prog/P3/metas', 'estudio/idiomas', 'estudio/idiomas/ingles',
  'estudio/idiomas/frances', 'estudio/idiomas/biblioteca', 'estudio/idiomas/ascenso', 'estudio/libro/mwm', 'estudio/ruta/matematica',
  'metas/ruta', 'metas/semana', 'metas/mes', 'metas/bimestre', 'metas/anio', 'metas/etapas', 'metas/mapa', 'metas/evolucion', 'metas/sprint', 'metas/impacto',
  'metas/trabajo', 'metas/ingles', 'metas/handyx', 'metas/proyecto/P1', 'entreno', 'entreno-semana', 'entreno-motor', 'entreno-peso',
  'perfil', 'ajustes', 'ajustes-rutinas', 'ajustes-datos', 'avance', 'unidades', 'como', 'repaso', 'flojo', 'tarjetas', 'motor', 'pomodoros', 'json', 'importar',
  'cierre', 'actividad', 'meta-nueva/semana',
  // Ola 23 · el apartado Clipping (con una planilla de ejemplo cargada).
  'estudio/prog/demanda', 'estudio/prog/algoritmos', 'estudio/prog/P1/stack', 'estudio/prog/P5/stack',
  'metas/calibracion', 'metas/diferencia', 'metas/proyecto/C8', 'metas/proyecto/Q1', 'estudio/prog/P1', 'metas/proyecto/C2', 'metas/proyecto/P10',
  'metas/clipping', 'metas/clipping/plan', 'metas/clipping/registro', 'metas/clipping/metricas', 'metas/clipping/cuentas',
  'metas/clipping/campanas', 'metas/clipping/retainers', 'metas/clipping/nichos', 'metas/clipping/riesgos', 'metas/clipping/semana1',
];

/** Planilla de ejemplo del clipping: 3 campañas, 4 cuentas, un retainer y 14 días de registro. */
function planillaDemo(hoy) {
  const d = (n) => { const x = new Date(`${hoy}T12:00:00`); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const campanas = [
    { id: 'k1', nombre: 'GTA 6 · streamer', plataforma: 'Whop Content Rewards', nicho: 'Videojuegos', tarifa: 1.5, tope: 50, estado: 'activa', desde: d(14) },
    { id: 'k2', nombre: 'Podcast semanal', plataforma: 'Vyro', nicho: 'Podcasts', tarifa: 1.1, estado: 'activa', desde: d(14) },
    { id: 'k3', nombre: 'Estreno de serie', plataforma: 'Clipster', nicho: 'Películas y series', tarifa: 0.9, estado: 'probando', desde: d(10) },
  ];
  const cuentas = ['gta.cortes', 'pod.clips', 'stream.top', 'series.cut'].map((alias, i) => ({ id: `c${i}`, alias, red: ['TikTok', 'Reels', 'Shorts', 'TikTok'][i], nicho: campanas[i % 3].nicho, estado: i < 3 ? 'activa' : 'calentando', desde: d(15) }));
  const registro = Array.from({ length: 14 }, (_, i) => ({ id: `r${i}`, fecha: d(13 - i), cuenta: `c${i % 3}`, campana: `k${(i % 3) + 1}`, clips: 4 + (i % 3), views: 6000 + i * 900, mas1000: 2 + (i % 2), aprobados: 4, ...(i < 9 ? { cobrado: Math.round((6000 + i * 900) * (0.7 + (i % 3) * 0.2)) / 1000 } : { estimado: 7 }) }));
  return { cuentas, campanas, registro, retainers: [{ id: 't1', nombre: 'Streamer mediano', estado: 'prueba', usdMes: 300, desde: d(3) }], prospeccion: {}, rutina: {} };
}

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
await page.evaluate((planilla) => {
  const s = JSON.parse(localStorage.getItem('trazo.v1'));
  localStorage.setItem('trazo.v1', JSON.stringify({ ...s, clipping: planilla }));
}, planillaDemo(new Date().toISOString().slice(0, 10)));

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
