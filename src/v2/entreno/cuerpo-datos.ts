/**
 * Trazo 2.0 · el dibujo del cuerpo: la silueta y cada músculo, de frente y de espalda, como trazos SVG sobre un lienzo de
 * 200 × 440. Está dibujada solo la mitad derecha (x ≥ 100); la izquierda es su espejo. Dibujo propio, hecho para Trazo.
 */
import type { Musculo } from './musculos';

export const LIENZO = { ancho: 200, alto: 440, ver: '22 6 156 430' } as const;
/** El espejo de la mitad derecha sobre el eje del cuerpo (x = 100). */
export const ESPEJO = 'matrix(-1 0 0 1 200 0)';

/** La silueta: cabeza, torso, brazo y pierna. Se pintan superpuestos; el borde se dibuja antes, así queda solo el contorno. */
export const SILUETA: string[] = [
  'M100 12 C 111 12 117 21 117 33 C 117 46 110 56 100 56 Z',
  'M100 50 L107 50 L107 63 Q 111 73 127 77 Q 146 79 150 95 L 139 120 Q 138 150 132 176 Q 130 196 137 220 L 138 240 L 100 240 Z',
  'M129 78 Q 151 77 156 98 Q 162 124 159 148 Q 168 172 167 204 L 165 232 Q 170 246 164 259 Q 158 267 153 257 L 153 234 Q 149 202 147 174 Q 142 148 139 120 Z',
  'M100 228 L138 220 Q 148 266 138 312 Q 143 338 138 370 Q 134 396 130 412 Q 134 420 140 426 L 140 431 L 114 431 L 117 412 Q 109 378 113 344 Q 110 324 113 312 Q 108 276 102 240 Z',
];

/** La rótula: un detalle que no se enciende, solo de frente. */
export const ROTULA = 'M121 316 Q 126 312 131 316 Q 132 322 126 325 Q 120 322 121 316 Z';

const BRAZO_ALTO = 'M142 125 Q 149 121 154 127 Q 160 143 157 161 Q 151 168 146 162 Q 142 145 142 125 Z';
const ANTEBRAZO = 'M147 175 Q 153 168 159 170 Q 166 188 164 229 L 154 231 Q 150 203 147 175 Z';
const HOMBRO = 'M130 79 Q 151 78 155 99 Q 157 112 153 123 Q 145 119 139 109 Q 132 96 130 79 Z';

export type Vista = 'frente' | 'espalda';

/** Los músculos de cada vista. Cada uno puede tener más de un trazo (los abdominales son cuatro bloques por lado). */
export const TRAZOS: Record<Vista, Partial<Record<Musculo, string[]>>> = {
  frente: {
    trapecio: ['M107 58 Q 113 71 127 77 L 109 82 Q 105 71 107 58 Z'],
    hombros: [HOMBRO],
    pecho: ['M102 87 L 127 83 Q 137 95 137 112 Q 129 128 112 128 Q 104 127 102 122 Z'],
    biceps: [BRAZO_ALTO],
    antebrazos: [ANTEBRAZO],
    abdominales: ['M102 134 L116 134 L116 147 L102 147 Z', 'M102 150 L116 150 L116 163 L102 163 Z', 'M102 166 L116 166 L116 179 L102 179 Z', 'M102 182 L116 182 Q 117 198 105 210 L 102 210 Z'],
    oblicuos: ['M120 138 Q 130 135 136 128 Q 137 152 131 178 Q 130 190 132 200 L 121 210 Q 118 176 120 138 Z'],
    cuadriceps: ['M112 240 Q 126 229 137 232 Q 146 268 138 306 Q 128 315 117 309 Q 110 282 112 240 Z'],
    aductores: ['M103 242 L 109 240 Q 108 270 113 298 Q 105 278 103 242 Z'],
    gemelos: ['M115 328 Q 127 321 137 330 Q 141 352 136 374 Q 132 392 129 404 L 120 404 Q 112 374 115 328 Z'],
  },
  espalda: {
    trapecio: ['M100 56 L 107 58 Q 112 72 129 78 Q 118 90 112 104 L 100 146 Z'],
    hombros: [HOMBRO],
    dorsales: ['M114 108 Q 127 112 138 122 Q 137 152 129 178 Q 119 194 102 197 L 102 152 Z'],
    lumbares: ['M102 200 Q 117 197 128 184 Q 128 204 134 216 L 102 222 Z'],
    triceps: [BRAZO_ALTO],
    antebrazos: [ANTEBRAZO],
    gluteos: ['M102 226 L 135 219 Q 145 240 138 260 Q 122 272 102 263 Z'],
    isquios: ['M108 271 Q 124 277 138 266 Q 144 290 137 310 Q 127 316 117 310 Q 110 292 108 271 Z'],
    gemelos: ['M114 328 Q 126 319 138 330 Q 144 352 137 376 Q 132 386 129 404 L 120 404 Q 107 362 114 328 Z'],
  },
};
