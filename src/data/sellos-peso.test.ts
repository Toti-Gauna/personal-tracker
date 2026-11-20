import { beforeEach, describe, expect, it } from 'vitest';
import { syncSeals } from '../state/profile';
import { getState, migrate, register, resetState } from '../state/store';
import { addWeight, setGoalKg } from '../state/train';
import { SEALS, caminoPeso, sealById } from './profile';

const D = '2026-11-19';
const ids = () => Object.keys(getState().profile.seals);

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-16'); });

describe('ola 29 · los sellos de peso siguen tu meta', () => {
  it('con 110,3 kg y meta 80 no hay sellos de peso (antes "Pesar 90" y "Pesar 95" salían por ser ≥ 90)', () => {
    setGoalKg(80);
    addWeight('2026-11-18', 110.5);
    addWeight(D, 110.3);
    syncSeals(D);
    expect(ids().filter((i) => i.startsWith('peso-') || i.startsWith('pesar-'))).toEqual([]);
    expect(caminoPeso(getState())).toMatchObject({ inicio: 110.5, actual: 110.3, meta: 80 });
    expect(caminoPeso(getState()).avance).toBeCloseTo(0.0066, 3);
    expect(sealById('peso-mitad')!.progress!({ s: getState(), date: D }).hint).toBe('Hoy 110,3 kg · objetivo 95,3 kg · faltan 15');
  });

  it('bajando: la mitad del camino (95,3 kg) y la meta (80 kg)', () => {
    setGoalKg(80);
    addWeight('2026-11-18', 110.6);
    addWeight('2026-11-25', 95);
    syncSeals('2026-11-25');
    expect(ids()).toContain('peso-mitad');
    expect(ids()).not.toContain('peso-meta');
    addWeight('2027-03-01', 79.5);
    syncSeals('2027-03-01');
    expect(ids()).toContain('peso-meta');
  });

  it('subiendo también funciona: de 70 a una meta de 80', () => {
    setGoalKg(80);
    addWeight('2026-11-18', 70);
    addWeight('2026-12-10', 75.5);
    syncSeals('2026-12-10');
    expect(ids()).toContain('peso-mitad');
    expect(ids()).not.toContain('peso-meta');
    addWeight('2027-01-10', 80.2);
    syncSeals('2027-01-10');
    expect(ids()).toContain('peso-meta');
  });

  it('alejarte de la meta no suma, y sin pesajes no hay nada', () => {
    setGoalKg(80);
    expect(caminoPeso(getState()).avance).toBe(0);
    addWeight('2026-11-18', 100);
    addWeight(D, 104);
    expect(caminoPeso(getState()).avance).toBe(0);
    syncSeals(D);
    expect(ids().filter((i) => i.startsWith('peso-'))).toEqual([]);
  });

  it('un estado viejo pierde los sellos "Pesar 90" y "Pesar 95" ganados por error, y conserva los demás', () => {
    const viejo = structuredClone(getState());
    viejo.profile = { seals: { 'pesar-90': D, 'pesar-95': D, 'primer-entreno': D }, seen: ['pesar-90', 'pesar-95', 'primer-entreno'] };
    const m = migrate(viejo);
    expect(m.profile.seals).toEqual({ 'primer-entreno': D });
    expect(m.profile.seen).toEqual(['primer-entreno']);
    expect(SEALS).toHaveLength(24);
    expect(SEALS.filter((x) => x.group === 'cuerpo')).toHaveLength(6);
  });
});
