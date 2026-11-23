/**
 * Trazo 2.0 · las cuatro siluetas de los sellos, una por grupo: así el muro se lee antes de leer los nombres. Todas caben en un
 * lienzo de 80 × 80, arrancan arriba al centro y giran en el sentido del reloj (el anillo de avance se dibuja a lo largo del contorno).
 */
import type { SealGroup } from '../../data/profile';

export type Forma = 'moneda' | 'hexagono' | 'escudo' | 'roseton';

/** Constancia: la moneda · Cuerpo: el hexágono (una pesa) · Estudio: el escudo · Trabajo: el rosetón (un sello de lacre). */
export const FORMA_DE_GRUPO: Record<SealGroup, Forma> = { constancia: 'moneda', cuerpo: 'hexagono', estudio: 'escudo', trabajo: 'roseton' };
export const NOMBRE_FORMA: Record<Forma, string> = { moneda: 'moneda', hexagono: 'hexágono', escudo: 'escudo', roseton: 'rosetón' };

const r2 = (n: number) => Math.round(n * 100) / 100;
const punto = (grados: number, radio: number) => [r2(40 + radio * Math.cos((grados * Math.PI) / 180)), r2(40 + radio * Math.sin((grados * Math.PI) / 180))] as const;

function poligono(lados: number, radio: number): string {
  const ps = Array.from({ length: lados }, (_, i) => punto(-90 + (360 / lados) * i, radio));
  return `M${ps.map((p) => p.join(' ')).join('L')}Z`;
}

/** Un círculo con bordes festoneados: `lobulos` ondas de `onda` de alto. */
function festoneado(lobulos: number, radio: number, onda: number, pasos = 120): string {
  const ps = Array.from({ length: pasos }, (_, i) => {
    const t = (360 / pasos) * i;
    return punto(-90 + t, radio + onda * Math.cos((t * lobulos * Math.PI) / 180));
  });
  return `M${ps.map((p) => p.join(' ')).join('L')}Z`;
}

export const CONTORNO: Record<Forma, string> = {
  moneda: 'M40 3A37 37 0 1 1 39.99 3Z',
  hexagono: poligono(6, 37.5),
  escudo: 'M40 3C52 9 63 10 73 9C74 40 66 62 40 77C14 62 6 40 7 9C17 10 28 9 40 3Z',
  roseton: festoneado(12, 34.5, 2.8),
};

/** Cuánto se achica la cara respecto del borde (el resto es el canto biselado). */
export const ESCALA_CARA: Record<Forma, number> = { moneda: 0.84, hexagono: 0.82, escudo: 0.8, roseton: 0.84 };
