// Genera los PNG de la PWA a partir de public/trazo.svg (Palotes).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/trazo.svg', 'utf8');
// Versión maskable: fondo a sangre, sin esquinas redondeadas (todo el dibujo ya está en el 80 % central).
const full = svg.replace(' rx="112"', '');

const out = (name, src, size) =>
  sharp(Buffer.from(src), { density: 384 }).resize(size, size).png().toFile(`public/${name}`);

await Promise.all([
  out('icon-512.png', svg, 512),
  out('icon-192.png', svg, 192),
  out('icon-512-maskable.png', full, 512),
  out('apple-touch-icon.png', full, 180),
  out('favicon-32.png', svg, 32),
  out('favicon-16.png', svg, 16),
  out('preview-96.png', svg, 96),
]);
console.log('iconos listos');
