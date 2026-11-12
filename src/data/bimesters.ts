export interface BimesterInfo {
  n: number;
  start: string;
  end: string;
  /** Nombre por defecto; se puede renombrar. */
  name: string;
  industry: string;
  product: string;
}

/** Los 9 bimestres de la ruta (16 de un mes al 15 de dos meses después). */
export const BIMESTERS: BimesterInfo[] = [
  { n: 1, start: '2026-11-16', end: '2027-01-15', name: 'El despegue', industry: 'compliance y servicios', product: 'Complia Pro' },
  { n: 2, start: '2027-01-16', end: '2027-03-15', name: 'Agro y pesca', industry: 'agro y pesca marítima', product: 'MarAgro Ops' },
  { n: 3, start: '2027-03-16', end: '2027-05-15', name: 'Petróleo y gas', industry: 'petróleo y gas', product: 'WellSense' },
  { n: 4, start: '2027-05-16', end: '2027-07-15', name: 'Energía', industry: 'energía y utilities', product: 'GridCast' },
  { n: 5, start: '2027-07-16', end: '2027-09-15', name: 'Minería', industry: 'minería', product: 'MineSight Edge' },
  { n: 6, start: '2027-09-16', end: '2027-11-15', name: 'Logística', industry: 'logística, puertos y comercio exterior', product: 'PortDocs AI' },
  { n: 7, start: '2027-11-16', end: '2028-01-15', name: 'Salud', industry: 'salud y medicina', product: 'ClínicaSegura AI' },
  { n: 8, start: '2028-01-16', end: '2028-03-15', name: 'Finanzas', industry: 'finanzas y trading', product: 'QuantLab' },
  { n: 9, start: '2028-03-16', end: '2028-05-15', name: 'Industria', industry: 'industria · plataforma insignia', product: 'Eclipse Industrial AI' },
];

/** Semanas de un bimestre: 4 de estudio, 4 de producto y 1 de cierre. */
export const WEEK_KINDS = ['E', 'E', 'E', 'E', 'P', 'P', 'P', 'P', 'C'] as const;
export const WEEK_KIND_LABEL = { E: 'estudio', P: 'producto', C: 'cierre' } as const;

/** Bimestre que corresponde a una fecha. Antes del B1 cuenta como B1; después del B9, como B9. */
export function bimesterAt(date: string): BimesterInfo {
  if (date < BIMESTERS[0].start) return BIMESTERS[0];
  return BIMESTERS.find((b) => date >= b.start && date <= b.end) ?? BIMESTERS[BIMESTERS.length - 1];
}
