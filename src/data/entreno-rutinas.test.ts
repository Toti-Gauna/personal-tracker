import { describe, expect, it } from 'vitest';
import { ENTRENO, ERRORES_ENTRENO, validarEntreno, type EntrenoFile } from './entreno-rutinas';

const copia = () => structuredClone(ENTRENO) as EntrenoFile;

describe('data/entreno.json', () => {
  it('es válido: 8 rutinas, 58 ejercicios', () => {
    expect(ERRORES_ENTRENO).toEqual([]);
    expect(ENTRENO.rutinas.map((r) => r.id)).toEqual(['push-a', 'pull-a', 'push-b', 'pull-b', 'legs-a', 'legs-b', 'upper', 'lower']);
    expect(ENTRENO.rutinas.reduce((s, r) => s + r.ejercicios.length, 0)).toBe(58);
  });

  it('marca ids repetidos, series sin RIR completo, tempo mal escrito, rangos al revés y variantes duplicadas', () => {
    const f = copia();
    f.rutinas[0].ejercicios[1].id = f.rutinas[0].ejercicios[0].id;
    f.rutinas[0].ejercicios[2].rir = [2, 1];
    f.rutinas[0].ejercicios[3].tempo = '2/1/2';
    f.rutinas[0].ejercicios[4].reps = [12, 8];
    f.rutinas[2].variante = 'A';
    f.rutinas[1].estiramiento.musculos = '';
    const e = validarEntreno(f).join('\n');
    expect(e).toMatch(/push-a · press-inclinado-mancuernas: id vacío o repetido/);
    expect(e).toMatch(/low-to-high-fly: el RIR trae 2 valores y son 3 series/);
    expect(e).toMatch(/"tempo" tiene la forma 2-1-2/);
    expect(e).toMatch(/"reps" tiene que ser \[mín, máx\]/);
    expect(e).toMatch(/la variante A de "push" está repetida/);
    expect(e).toMatch(/pull-a: falta el estiramiento/);
  });
});
