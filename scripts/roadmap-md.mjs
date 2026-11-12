// Genera docs/ROADMAP.md desde data/roadmap.json.
//   npm run roadmap:md            escribe el archivo
//   node scripts/roadmap-md.mjs --check   falla si docs/ROADMAP.md está desactualizado (lo usa el CI)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(raiz, 'data/roadmap.json');
const MD_PATH = join(raiz, 'docs/ROADMAP.md');

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MESES[m - 1]} ${y}`; };
const semanas = (w) => (w[0] === w[1] ? `S${w[0]}` : `S${w[0]}–${w[1]}`);
const esc = (s) => String(s).replace(/\|/g, '\\|');
const PARTES = { learn: 'aprender', test: 'test', build: 'construir', close: 'cerrar' };

/** Arma el Markdown a partir del roadmap. Es una función pura: la usa también el test. */
export function render(r) {
  const L = [];
  L.push('# Roadmap de Trazo');
  L.push('');
  L.push('> Generado desde `data/roadmap.json` con `npm run roadmap:md`. **No lo edites a mano**: cambiá el JSON y regeneralo. El CI falla si este archivo está desactualizado.');
  L.push('');
  L.push(`**Ruta:** ${fecha(r.route.start)} a ${fecha(r.route.end)} · ${r.route.bimesters} bimestres de 2 meses.`);
  L.push('');
  L.push('## Cómo es cada bimestre');
  L.push('');
  L.push(`- **Semanas ${r.cycle.study[0]}–${r.cycle.study[1]}:** estudio y pieza desde cero.`);
  L.push(`- **Semanas ${r.cycle.product[0]}–${r.cycle.product[1]}:** producto.`);
  L.push(`- **Semana ${r.cycle.close[0]}:** cierre (${r.cycle.closeParts.map((p) => (p === 'README' ? p : p[0].toLowerCase() + p.slice(1))).join(', ')}).`);
  L.push(`- ${r.cycle.pilot}`);
  L.push('');
  L.push('## Los tres años');
  L.push('');
  L.push('| Año | Perfil | Bimestres |');
  L.push('|---|---|---|');
  for (const y of r.route.years) L.push(`| ${y.year} | ${esc(y.profile)} | B${y.bimesters[0]} a B${y.bimesters[y.bimesters.length - 1]} |`);
  L.push('');
  L.push('## Resumen');
  L.push('');
  L.push('| B | Fechas | Producto (industria) | Matemática | Programación | Certificación (horas) |');
  L.push('|---|---|---|---|---|---|');
  for (const b of r.bimesters) {
    const prod = `${b.product.name} (${b.product.industry}${b.product.pitch ? ` · ${b.product.pitch}` : ''})`;
    const cert = b.cert ? `${b.cert.name} (~${b.cert.hours} h)${b.cert.optional ? ', opcional' : ''}` : '—';
    L.push(`| ${b.n} | ${fecha(b.start)} – ${fecha(b.end)} | ${esc(prod)} | ${esc(b.summary.math)} | ${esc(b.summary.prog)} | ${esc(cert)} |`);
  }
  L.push('');
  L.push('## Hilos que corren a la par');
  L.push('');
  for (const t of r.threads) {
    const desde = t.from === 'all' ? 'en todos los bimestres' : `desde B${t.from}`;
    L.push(`- **${t.title}** · ${desde}${t.perWeek ? ` · ${t.perWeek} por semana` : ''}${t.source ? ` (${t.source})` : ''}`);
  }
  L.push('');
  L.push('## Años 4 y 5 (opcionales)');
  L.push('');
  for (const o of r.optional) L.push(`- **Año ${o.year}:** ${o.title}`);
  L.push('');
  L.push('## Detalle por bimestre');
  for (const b of r.bimesters) {
    L.push('');
    L.push(`### B${b.n} · ${b.product.name}`);
    L.push('');
    L.push(`${fecha(b.start)} – ${fecha(b.end)} · año ${b.year} (${r.route.years[b.year - 1].profile}) · ${b.product.industry}${b.product.pitch ? `: ${b.product.pitch}` : ''}`);
    if (b.existing) L.push(`\n**Qué existe:** ${b.existing}`);
    if (b.angle) L.push(`\n**Nuestro ángulo:** ${b.angle}`);
    L.push('');
    L.push('| Semanas | Carril | Ítem | Partes | Horas |');
    L.push('|---|---|---|---|---|');
    for (const i of [...b.items].sort((a, z) => a.weeks[0] - z.weeks[0] || a.weeks[1] - z.weeks[1])) {
      L.push(`| ${semanas(i.weeks)} | ${i.lane} | ${esc(i.title)} | ${i.parts.map((p) => PARTES[p]).join(', ')} | ${i.hours ?? ''} |`);
    }
    L.push('');
    L.push('**Compuertas**');
    L.push('');
    for (const g of b.gates) L.push(`- \`${g.item}\`: ${g.rule}`);
  }
  return L.join('\n') + '\n';
}

const principal = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (principal) {
  const md = render(JSON.parse(readFileSync(JSON_PATH, 'utf8')));
  if (process.argv.includes('--check')) {
    let actual = '';
    try { actual = readFileSync(MD_PATH, 'utf8'); } catch { /* no existe */ }
    if (actual !== md) {
      console.error('docs/ROADMAP.md está desactualizado: corré `npm run roadmap:md` y commiteá el resultado.');
      process.exit(1);
    }
    console.log('docs/ROADMAP.md está al día.');
  } else {
    writeFileSync(MD_PATH, md);
    console.log(`docs/ROADMAP.md generado (${md.split('\n').length} líneas).`);
  }
}
