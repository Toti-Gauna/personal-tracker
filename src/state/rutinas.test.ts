import { beforeEach, describe, expect, it } from 'vitest';
import { PLANTILLAS, generarRutina } from '../data/motor-rutinas';
import { metasSemanaGeneradas } from '../data/metas-plan';
import { adaptarDia, asignarRutina, borrarRutina, guardarRutina } from './rutinas';
import { getState, register, resetState, startDay, toggleTask } from './store';

const propia = () => generarRutina({
  despertar: '06:00', dormir: '22:00',
  fijos: [{ label: 'Trabajo nuevo', start: '09:00', end: '17:00', area: 'economia', rama: 'trabajo' }],
  necesidades: [{ label: 'Proyecto', min: 120, rama: 'programacion' }, { label: 'Anki', min: 15, rama: 'matematica' }],
}).bloques;

describe('ola 34 · rutinas propias en el día', () => {
  beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-16'); });

  it('asignada a días de la semana, el día la usa tal cual (sin las reglas del plan); el resto sigue con la del plan', () => {
    const id = guardarRutina({ nombre: 'Con trabajo nuevo', creada: '2026-11-22', bloques: propia() });
    asignarRutina({ rutina: id, tipo: 'semana', dias: [1, 2, 3, 4, 5], desde: '2026-11-23' });
    startDay('completo', '04:00', '2026-11-24'); // martes: sin post del plan
    const d = getState().days['2026-11-24'];
    expect(d.rutinaPropia).toBe('Con trabajo nuevo');
    expect(d.blocks.map((b) => `${b.start} ${b.title}`)).toEqual(['06:30 Proyecto', '08:30 Anki', '09:00 Trabajo nuevo', '22:00 Dormir a las 22:00']); // lo libre no es meta
    expect(d.blocks.some((b) => b.key === 'post')).toBe(false);
    startDay('completo', '04:00', '2026-11-28'); // sábado: la del plan
    expect(getState().days['2026-11-28'].rutinaPropia).toBeUndefined();
    expect(getState().days['2026-11-28'].blocks[0].title).toMatch(/Despertar/);
  });

  it('las metas de horas de la semana salen de la rutina propia los días que rige', () => {
    const id = guardarRutina({ nombre: 'Con trabajo nuevo', creada: '2026-11-22', bloques: propia() });
    asignarRutina({ rutina: id, tipo: 'rango', desde: '2026-11-23', hasta: '2026-11-29' });
    const ms = metasSemanaGeneradas('2026-11-23', '2026-11-16', { intensiva: true });
    expect(ms.find((m) => m.clave === 'horas-prog')?.meta).toBe(14); // 2 h × 7
    expect(ms.find((m) => m.clave === 'horas-mate')?.meta).toBe(2); // 15 min × 7 = 1,75 → media hora
  });

  it('adaptar un día con otra rutina de base: parte de ella y no de la de ese día', () => {
    startDay('completo', '04:00', '2026-11-23');
    const finde = PLANTILLAS.find((p) => p.id === 'plantilla:busqueda-intensiva-finde')!;
    const r = adaptarDia('2026-11-23', {}, 'Del sábado · 2026-11-23', finde.bloques);
    expect(r.errores).toEqual([]);
    const d = getState().days['2026-11-23'];
    expect(d.rutinaPropia).toBe('Del sábado · 2026-11-23');
    expect(d.blocks.some((b) => /mock interview/.test(b.title))).toBe(true);
    expect(getState().plan.rutinasPropias!.find((x) => x.id === r.id)!.bloques.some((b) => /mock interview/.test(b.label))).toBe(true);
  });

  it('adaptar un día empezado: lo que ya hiciste queda, el resto se rearma; borrar la rutina saca sus asignaciones', () => {
    startDay('completo', '04:00', '2026-11-23');
    const d0 = getState().days['2026-11-23'];
    const primero = d0.blocks[0];
    toggleTask('2026-11-23', primero.key, primero.tasks[0].id);
    const r = adaptarDia('2026-11-23', { despertar: '04:00', fijos: [{ label: 'Dentista', start: '13:00', end: '14:00' }] });
    expect(r.errores).toEqual([]);
    const d = getState().days['2026-11-23'];
    expect(d.rutinaPropia).toBe('Adaptada · 2026-11-23');
    expect(d.blocks.find((b) => b.key === primero.key)!.tasks[0].done).toBe(true);
    expect(d.blocks.find((b) => b.title === 'Dentista')).toMatchObject({ start: '13:00', min: 60 });
    expect(d.blocks.map((b) => b.n)).toEqual(d.blocks.map((_, i) => i + 1));
    borrarRutina(r.id);
    expect(getState().plan.asignacionesRutina).toEqual([]);
    expect(getState().days['2026-11-23'].blocks.find((b) => b.title === 'Dentista')).toBeTruthy(); // el día armado queda
  });
});
