#!/usr/bin/env node
/**
 * Trazo · accesibilidad (tanda 3.5). Pasa axe-core por cada pantalla de la revisión, en claro y en oscuro, y falla con cualquier
 * violación de WCAG 2.1 A/AA (contraste, nombres de botones y campos, roles, foco). Las mismas rutas y datos que la revisión.
 *
 * Uso (con la app servida: `npx vite preview --port 4173`):
 *   npm run a11y
 *   SOLO=hoy,plan npm run a11y
 *
 * Requiere Playwright (como la revisión, no va en el CI). Escribe el detalle en $OUT/a11y.md (por defecto revision-v2/).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { ELEGIDAS, abrirApp, visitar, volver } from './revision-comun.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = process.env.OUT ?? 'revision-v2';

const browser = await chromium.launch();
const fallos = [];
for (const tema of ['light', 'dark']) {
  const { ctx, page } = await abrirApp(browser, tema);
  for (const p of ELEGIDAS) {
    const previo = await visitar(page, p);
    // Sin animaciones a medio camino: axe mide el contraste del color final.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(300);
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
      return res.violations.map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 4).map((n) => `${n.target.join(' ')}${n.any?.[0]?.message ? ` — ${n.any[0].message}` : ''}`), total: v.nodes.length }));
    });
    for (const v of r) fallos.push({ tema, pantalla: p.id, ...v });
    console.log(`${tema} ${p.id}: ${r.length ? r.map((v) => `${v.id}×${v.total}`).join(', ') : 'ok'}`);
    await volver(page, previo);
  }
  await ctx.close();
}
await browser.close();

const informe = [
  '# Accesibilidad (axe-core, WCAG 2.1 AA)',
  '',
  fallos.length ? `**${fallos.length} violaciones:**` : '**Sin violaciones.**',
  '',
  ...fallos.map((f) => `- ${f.tema} · ${f.pantalla} · **${f.id}** (${f.impacto}, ${f.total}): ${f.ayuda}\n${f.nodos.map((n) => `  - \`${n}\``).join('\n')}`),
  '',
].join('\n');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'a11y.md'), informe);
console.log(informe.split('\n').slice(0, 4).join('\n'));
process.exit(fallos.length ? 1 : 0);
