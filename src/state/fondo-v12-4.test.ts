import { beforeEach, describe, expect, it } from 'vitest';
import { CANALES_LEAD, META_LEADS, periodosComerciales, recordatoriosFondo, sugerenciaPausas } from '../data/fondo';
import { fondoEn } from '../data/pistas-dia';
import { agregarLead, estadoLead, setItem } from './fondo';
import { getState, register, resetState } from './store';

beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

describe('v12.4 · slots comerciales: leads con canal, marca elegida y nombre con el rubro', () => {
  it('un lead lleva nombre, fecha, canal y estado; la venta apunta a 11 (la marca y 10 negocios parecidos)', () => {
    expect(META_LEADS).toBe(11);
    expect(CANALES_LEAD).toEqual(['email', 'WhatsApp', 'LinkedIn', 'Instagram', 'llamada', 'en persona']);
    agregarLead('com-1', { nombre: 'Aquasol', contactado: '2026-12-20', canal: 'email', estado: 'contactado' });
    agregarLead('com-1', { nombre: 'Aqua Park Norte', contactado: '2026-12-21', canal: 'WhatsApp', estado: 'contactado' });
    estadoLead('com-1', getState().plan.fondo!['com-1'].leads![1].id, 'reunión');
    expect(getState().plan.fondo!['com-1'].leads!.map((l) => [l.nombre, l.contactado, l.canal, l.estado])).toEqual([
      ['Aquasol', '2026-12-20', 'email', 'contactado'], ['Aqua Park Norte', '2026-12-21', 'WhatsApp', 'reunión'],
    ]);
  });

  it('la pregunta de la marca (regional o grande) se guarda por slot y apaga el recordatorio de ese slot', () => {
    const antes = recordatoriosFondo(getState().plan, '2027-01-26').map((r) => r.id); // 14 días antes del slot #3 (28 ene)
    expect(antes).toContain('marca-com-3');
    setItem('com-3', { perfilMarca: 'regional' });
    expect(getState().plan.fondo!['com-3'].perfilMarca).toBe('regional');
    expect(recordatoriosFondo(getState().plan, '2027-01-26').map((r) => r.id)).not.toContain('marca-com-3');
    // Cada slot tiene su pregunta, también los que ya traen marca (#1 Aquasol).
    expect(recordatoriosFondo(getState().plan, '2026-11-30').map((r) => r.id)).toContain('marca-com-1');
  });

  it('un slot sin marca se nombra por su rubro hasta que elegís la marca', () => {
    const p = periodosComerciales(getState().plan);
    expect(p.find((x) => x.id === 'com-15')!.nombre).toBe('#15 · Universities and institutes');
    setItem('com-15', { marca: 'Mercado Pago' });
    expect(periodosComerciales(getState().plan).find((x) => x.id === 'com-15')!.nombre).toBe('#15 · Mercado Pago');
    expect(periodosComerciales(getState().plan).find((x) => x.id === 'com-1')!.nombre).toBe('#1 · Aquasol and water parks');
  });

  it('con el uso de Claude sobre el umbral se sugiere pausar primero lo comercial y después lo secundario (nunca solo)', () => {
    const f = fondoEn('2026-12-14');
    expect(sugerenciaPausas(86, 85, f).map((x) => x.pista)).toEqual(['comercial', 'secundaria']);
    expect(sugerenciaPausas(86, 85, { ...f, comercial: null }).map((x) => x.pista)).toEqual(['secundaria']);
  });
});
