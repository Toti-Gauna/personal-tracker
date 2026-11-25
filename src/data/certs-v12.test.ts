import { describe, expect, it } from 'vitest';
import { CERTS_V12, certV12, estadoCert, fijasDeReservas, recordatoriosActivos } from './certs-v12';
import { claveHito } from './periodos-plan';

const plan = (x: Record<string, unknown> = {}) => ({ hitos: {}, ...x }) as never;

describe('v12.1 · certificaciones', () => {
  it('las 20 de las 12 cert windows, cada una en su bloque', () => {
    expect(CERTS_V12).toHaveLength(20);
    expect(certV12('secplus')).toMatchObject({ bloque: 'CW6', examen: '2027-06-15', listo: 85 }); // v12.4: Cert V6, 5–16 jun 2027; Security+ el 15 y GHAS el 16
  });

  it('listo con el mejor de los últimos dos simulacros; la reserva manda sobre la fecha del plan', () => {
    const c = certV12('claude-architect')!;
    // v12.4: la ventana de la Cert V1 es del 13 al 18 dic 2026; el examen del plan es el 16 y el día antes toca "Weak spots + mock".
    const e0 = estadoCert(c, plan(), '2026-12-15');
    expect(e0).toMatchObject({ examen: '2026-12-16', reservado: false, diasAlExamen: 1, ultimo: null, meta: 85, listo: false, hoy: { texto: 'Weak spots + mock' } });
    const e1 = estadoCert(c, plan({ mocks: { 'claude-architect': [{ fecha: '2026-12-14', pct: 70 }, { fecha: '2026-12-15', pct: 88 }, { fecha: '2026-12-15', pct: 82 }] }, reservas: { 'claude-architect': { examen: '2026-12-17', reservado: '2026-11-21' } } }), '2026-12-15');
    expect(e1).toMatchObject({ examen: '2026-12-17', reservado: true, ultimo: 88, listo: true, diasAlExamen: 2 });
    expect(estadoCert(certV12('pnpt')!, plan(), '2027-11-01')).toMatchObject({ meta: 'AD lab end-to-end without guide', listo: null });
  });

  it('renovación: validez habitual desde que la aprobás, siempre "a verificar"', () => {
    const c = certV12('gh-foundations')!;
    expect(estadoCert(c, plan(), '2026-12-01').renovacion).toEqual({ vence: null, nota: 'usual validity (to verify)' });
    expect(estadoCert(c, plan({ hitos: { [claveHito.cert('gh-foundations')]: { hecho: '2026-12-13' } } }), '2026-12-14').renovacion).toEqual({ vence: '2029-12-13', nota: 'usual validity (to verify)' });
  });

  it('avisos de reserva: desde 7 días antes hasta reservar todo; las reservas son fechas fijas', () => {
    expect(recordatoriosActivos(plan(), '2026-11-21').map((r) => [r.id, r.faltan])).toEqual([['reserva-claude-gh', ['claude-architect', 'gh-foundations']]]);
    const una = plan({ reservas: { 'claude-architect': { examen: '2026-12-16', reservado: '2026-11-21' } } });
    expect(recordatoriosActivos(una, '2026-11-21')[0].faltan).toEqual(['gh-foundations']);
    const dos = plan({ reservas: { 'claude-architect': { examen: '2026-12-16', reservado: '2026-11-21' }, 'gh-foundations': { examen: '2026-12-18', reservado: '2026-11-21' } } });
    expect(recordatoriosActivos(dos, '2026-11-21')).toEqual([]);
    // v12.4: AI-103 y Databricks se reservan antes del 26 dic (se ven desde el 19) y la Cert V3, el día que empieza VitalIA, 28 dic (se ve desde el 21).
    expect(recordatoriosActivos(plan(), '2026-12-18').map((r) => r.id)).toEqual(['reserva-claude-gh']);
    expect(recordatoriosActivos(plan(), '2026-12-19').map((r) => r.id)).toEqual(['reserva-claude-gh', 'reserva-ai103-databricks']);
    expect(recordatoriosActivos(plan(), '2026-12-21').map((r) => r.id)).toEqual(['reserva-claude-gh', 'reserva-ai103-databricks', 'reserva-cw3']);
    // El Cambridge no trae exámenes del plan: se cierra a mano.
    expect(recordatoriosActivos(plan({ hitos: { 'v12:recordatorio:reserva-cambridge': { hecho: '2027-01-14' } } }), '2027-01-14').map((r) => r.id)).not.toContain('reserva-cambridge');
    expect(fijasDeReservas(dos)).toEqual([{ inicio: '2026-12-16', fin: '2026-12-16' }, { inicio: '2026-12-18', fin: '2026-12-18' }]);
  });
});
