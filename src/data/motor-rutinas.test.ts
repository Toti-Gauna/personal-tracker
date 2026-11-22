import { describe, expect, it } from 'vitest';
import { PLANTILLAS, adaptarRutina, generarRutina, minutosPorRama, restriccionesDe, rutinaParaFecha, type RutinaPropia } from './motor-rutinas';
import { blockMin } from './routines';

const fila = (bs: { start: string; end: string; label: string }[]) => bs.map((b) => `${b.start}-${b.end} ${b.label}`);

describe('ola 34 · motor de rutinas', () => {
  it('genera desde restricciones: despertar, fijos en su lugar, cada necesidad en los huecos (con tope por bloque) y dormir', () => {
    const g = generarRutina({
      despertar: '04:00', dormir: '21:00',
      fijos: [{ label: 'Abi + correr', start: '08:30', end: '10:00', area: 'salud', rama: 'salud' }, { label: 'Cena', start: '20:00', end: '21:00' }],
      necesidades: [{ label: 'Foco', min: 600, rama: 'programacion' }, { label: 'Anki', min: 15, rama: 'matematica' }],
    });
    expect(g.errores).toEqual([]);
    expect(fila(g.bloques)).toEqual([
      '04:00-04:30 Despertar y arrancar',
      '04:30-08:30 Foco',
      '08:30-10:00 Abi + correr',
      '10:00-14:00 Foco',
      '14:00-16:00 Foco',
      '16:00-16:15 Anki',
      '16:15-20:00 Libre',
      '20:00-21:00 Cena',
      '21:00-04:00 Dormir a las 21:00',
    ]);
    expect(g.faltan).toEqual([]);
    expect(g.libre).toBe(225);
    expect(new Set(g.bloques.map((b) => b.id)).size).toBe(g.bloques.length);
    expect(minutosPorRama(g.bloques)).toMatchObject({ programacion: 600, matematica: 15 });
  });

  it('avisa lo que no entra y los fijos que se pisan o caen fuera del día', () => {
    const g = generarRutina({
      despertar: '07:00', dormir: '23:00',
      fijos: [{ label: 'Trabajo', start: '09:00', end: '18:00' }, { label: 'Dentista', start: '17:00', end: '18:00' }, { label: 'Madrugada', start: '05:00', end: '06:00' }],
      necesidades: [{ label: 'Foco', min: 600 }],
    });
    expect(g.errores).toEqual(['Dentista se pisa con Trabajo', 'Madrugada cae fuera del día (de 07:00 a 23:00, después del despertar)']);
    expect(g.faltan).toEqual([{ label: 'Foco', min: 600 - 90 - 300 }]);
  });

  it('cruza la medianoche si te acostás tarde', () => {
    const g = generarRutina({ despertar: '10:00', dormir: '01:00', fijos: [], necesidades: [{ label: 'Foco', min: 60 }] });
    expect(g.bloques.at(-1)).toMatchObject({ start: '01:00', end: '10:00' });
    expect(g.libre).toBe(15 * 60 - 30 - 60);
  });

  it('adaptar un día: levantarte tarde y un compromiso nuevo; los fijos quedan, lo flexible se acomoda y se avisa lo que no entra', () => {
    const v12 = PLANTILLAS.find((p) => p.id === 'plantilla:busqueda-intensiva')!;
    const r = restriccionesDe(v12.bloques);
    expect(r.despertar).toBe('04:00');
    expect(r.fijos.map((f) => f.label)).toContain('Abi + correr');
    const a = adaptarRutina(v12.bloques, { despertar: '07:00', fijos: [{ label: 'Dentista', start: '13:00', end: '14:00' }] });
    expect(a.errores).toEqual([]);
    expect(a.bloques[0]).toMatchObject({ start: '07:00' });
    expect(a.bloques.find((b) => b.label === 'Dentista')).toMatchObject({ start: '13:00', end: '14:00', kind: 'fixed' });
    expect(a.bloques.find((b) => b.label === 'Abi + correr')).toMatchObject({ start: '08:30', end: '10:00' });
    // El bloque 2 (fijo de 12:00 a 15:45) choca con el dentista: pasa a flexible y se ubica en lo que queda.
    expect(a.bloques.filter((b) => b.label === 'Bloque 2 · deep focus').every((b) => b.kind === 'flex')).toBe(true);
    // 3 h menos de mañana y 1 h de dentista: lo flexible que no entra se informa (no se pierde en silencio).
    expect(a.faltan.reduce((s, f) => s + f.min, 0)).toBeGreaterThan(0);
    // Sin cambios, adaptar da la misma rutina de bloques fijos.
    const igual = adaptarRutina(v12.bloques, {});
    expect(igual.bloques.filter((b) => b.kind === 'fixed').map((b) => `${b.start}-${b.end}`)).toEqual(v12.bloques.filter((b) => b.kind === 'fixed').map((b) => `${b.start}-${b.end}`));
    expect(igual.bloques.reduce((s, b) => s + (b.id === 'sueno' ? 0 : blockMin(b)), 0)).toBe(17 * 60);
  });

  it('qué rutina rige cada fecha: un día manda sobre un rango, un rango sobre los días de la semana; sin asignación, la del plan', () => {
    const r = (id: string): RutinaPropia => ({ id, nombre: id, creada: '2026-11-22', bloques: [] });
    const rutinas = [r('semana'), r('viaje'), r('dentista')];
    const as = [
      { id: 'a1', rutina: 'semana', tipo: 'semana' as const, dias: [1, 2, 3, 4, 5], desde: '2026-12-01' },
      { id: 'a2', rutina: 'viaje', tipo: 'rango' as const, desde: '2026-12-10', hasta: '2026-12-15' },
      { id: 'a3', rutina: 'dentista', tipo: 'dia' as const, fecha: '2026-12-11' },
    ];
    expect(rutinaParaFecha('2026-11-30', as, rutinas)).toBeNull(); // lunes, antes del 1 dic
    expect(rutinaParaFecha('2026-12-01', as, rutinas)?.id).toBe('semana');
    expect(rutinaParaFecha('2026-12-05', as, rutinas)).toBeNull(); // sábado
    expect(rutinaParaFecha('2026-12-10', as, rutinas)?.id).toBe('viaje');
    expect(rutinaParaFecha('2026-12-11', as, rutinas)?.id).toBe('dentista');
    expect(rutinaParaFecha('2026-12-16', as, rutinas)?.id).toBe('semana');
    // Una rutina borrada no rige.
    expect(rutinaParaFecha('2026-12-11', as, [r('semana')])?.id).toBe('semana');
  });

  it('plantillas: primero las de v12.1, después las archivadas', () => {
    expect(PLANTILLAS.filter((p) => p.grupo === 'v12').map((p) => p.id)).toEqual(['plantilla:busqueda-intensiva', 'plantilla:busqueda-intensiva-finde', 'plantilla:busqueda-intensiva-domingo']);
    expect(PLANTILLAS.filter((p) => p.grupo === 'archivada').map((p) => p.id)).toEqual(expect.arrayContaining(['plantilla:weekday', 'plantilla:con-trabajo', 'plantilla:libre', 'plantilla:tarde']));
    expect(PLANTILLAS[0].grupo).toBe('v12');
  });
});
