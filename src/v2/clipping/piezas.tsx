/**
 * Trazo 2.0 · las piezas chicas del Clipping: la píldora de estado (ícono + palabra), una pista con marcas (pago real contra
 * tarifa, concentración contra el tope), la actividad de las últimas 13 semanas y las barras de la granja contra el plan.
 */
import type { ReactNode } from 'react';
import type { EstadoCampana, EstadoCuenta, EstadoRetainer } from '../../data/clipping-state';
import type { Luz } from '../../data/clipping-metricas';
import { Icono, type NombreIcono } from '../iconos';
import { Barras, type Barra } from '../estudio/Barras';
import { corto, fc, n1 } from './datos';
import './clipping.css';

// ——— Estados: ícono + palabra, y la forma dice el tono ———

type Tono = '' | 'atencion' | 'hecho';
const VISTO: Record<string, { icono: NombreIcono; tono: Tono; palabra: string }> = {
  calentando: { icono: 'reloj', tono: '', palabra: 'Calentando' },
  activa: { icono: 'ritmo', tono: '', palabra: 'Activa' },
  pausada: { icono: 'pausa', tono: '', palabra: 'Pausada' },
  baneada: { icono: 'alerta', tono: 'atencion', palabra: 'Baneada' },
  probando: { icono: 'reloj', tono: '', palabra: 'Probando' },
  agotada: { icono: 'menos', tono: '', palabra: 'Agotada' },
  descartada: { icono: 'cerrar', tono: '', palabra: 'Descartada' },
  prueba: { icono: 'reloj', tono: '', palabra: 'Prueba' },
  activo: { icono: 'ritmo', tono: '', palabra: 'Activo' },
  terminado: { icono: 'menos', tono: '', palabra: 'Terminado' },
};

export const palabraEstado = (e: EstadoCuenta | EstadoCampana | EstadoRetainer) => VISTO[e].palabra;

/** La píldora de estado de una cuenta, una campaña o un retainer (la forma y el ícono dicen lo mismo que la palabra). */
export function EstadoClip({ estado }: { estado: EstadoCuenta | EstadoCampana | EstadoRetainer }) {
  const v = VISTO[estado];
  return <span className={`s-estado ${v.tono}`}><Icono nombre={v.icono} lado={16} />{v.palabra}</span>;
}

const LUZ: Record<Luz, { icono: NombreIcono; tono: Tono; palabra: string }> = {
  verde: { icono: 'tilde', tono: 'hecho', palabra: 'Verde' },
  amarillo: { icono: 'atencion', tono: '', palabra: 'Amarillo' },
  rojo: { icono: 'alerta', tono: 'atencion', palabra: 'Rojo' },
  gris: { icono: 'menos', tono: '', palabra: 'Sin datos' },
};
export const palabraLuz = (l: Luz) => LUZ[l].palabra;

/** El semáforo de una compuerta: nunca solo color, siempre con su ícono y su palabra. */
export function LuzClip({ luz }: { luz: Luz }) {
  const v = LUZ[luz];
  return <span className={`s-estado ${v.tono}`}><Icono nombre={v.icono} lado={16} />{v.palabra}</span>;
}

// ——— Una pista con marcas ———

/** Una rayita sobre la pista. `piso`: fina y punteada (un umbral); sin tipo, llena (la tarifa o el tope). */
export interface Marca { valor: number; nombre: string; tipo?: 'piso' }

/**
 * Una barra horizontal con marcas (rayitas) sobre ella: el pago real contra la tarifa listada y los pisos, la parte de cada fuente
 * contra el tope del 30 %. Es un dibujo: se lee entero con `nombre`.
 */
export function Pista({ valor, max, marcas = [], nombre, area }: { valor: number | null; max: number; marcas?: Marca[]; nombre: string; area?: string }) {
  const pos = (v: number) => `${Math.max(0, Math.min(1, max > 0 ? v / max : 0)) * 100}%`;
  return (
    <div className="cl-pista" role="img" aria-label={nombre} data-grafico style={area ? { ['--area' as string]: area } : undefined}>
      {valor != null && <span className="cl-pista-valor" style={{ width: pos(valor) }} />}
      {marcas.map((m) => <i key={m.nombre} className={`cl-pista-marca${m.tipo ? ` ${m.tipo}` : ''}`} style={{ left: pos(m.valor) }} />)}
    </div>
  );
}

// ——— Actividad: clips por día, 13 semanas ———

export interface CeldaActividad { fecha: string; nivel: 0 | 1 | 2 | 3; futuro: boolean; hoy: boolean }

/** Una semana por columna y un día por fila (lunes arriba): cuanto más lleno, más cerca de los clips por día que pide el plan. */
export function Actividad({ celdas, nombre }: { celdas: CeldaActividad[]; nombre: string }) {
  return (
    <figure className="cl-calor" role="img" aria-label={nombre} data-grafico>
      <span className="cl-calor-dias" aria-hidden="true">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <b key={d} className="t-rotulo">{d}</b>)}</span>
      <span className="cl-calor-grilla">
        {celdas.map((c) => <i key={c.fecha} className={`cl-n${c.nivel}${c.futuro ? ' futuro' : ''}${c.hoy ? ' hoy' : ''}`} />)}
      </span>
      <figcaption className="cl-calor-leyenda" aria-hidden="true"><span>nada</span><i className="cl-n1" /><i className="cl-n2" /><i className="cl-n3" /><span>plan</span></figcaption>
    </figure>
  );
}

// ——— Barras ———

/** Las barras de la 2.0 como un dibujo (`data-grafico`: sus números y rótulos son datos, no prosa). */
export function BarrasG({ barras, nombre, alto = 84, meta, leyenda }: { barras: Barra[]; nombre: string; alto?: number; meta?: number; /** Qué dice el dibujo (cuenta como parte del dibujo, no como prosa). */ leyenda?: string }) {
  // La línea de la meta la dibuja esta pieza (la de `Barras` no cae en su lugar): `Barras` solo la usa para fijar la escala.
  const max = Math.max(1, meta ?? 0, ...barras.map((b) => b.valor));
  return (
    <div className="cl-barras" data-grafico style={{ ['--alto' as string]: `${alto}px` }}>
      <Barras barras={barras} meta={meta} nombre={nombre} alto={alto} />
      {meta != null && meta > 0 && <i className="cl-barras-meta" style={{ bottom: `calc(var(--cl-pie) + ${meta / max} * var(--alto))` }} aria-hidden="true" />}
      {leyenda && <p className="t-nota cl-leyenda">{leyenda}</p>}
    </div>
  );
}

// ——— La granja contra el plan ———

/** Los 12 meses del roadmap en barras (lo real) con una línea punteada: lo que pide el mes en curso. */
export function GranjaBarras({ real, plan, actual, que, unidad }: { real: (number | null)[]; plan: number; actual: number; que: string; unidad: string }): ReactNode {
  const barras = real.map((v, i) => ({ etiqueta: String(i + 1), valor: v ?? 0, hoy: i + 1 === actual, texto: v == null ? '' : corto(v) }));
  const nombre = `${que} por mes del roadmap: ${real.map((v, i) => `mes ${i + 1}, ${v == null ? 'sin datos' : n1(v)}`).join('; ')}. El plan del mes ${actual} pide ${n1(plan)} ${unidad}.`;
  return (
    <BarrasG barras={barras} meta={plan} nombre={nombre} leyenda={`Mes del roadmap. Punteada: lo que pide el mes ${actual}, ${n1(plan)} ${unidad}.`} />
  );
}

/** El rango de un paso: "16–17 nov", o "30 nov – 2 dic" si cruza de mes. */
export function rangoCorto(desde: string, hasta: string) {
  if (desde === hasta) return fc(desde);
  return desde.slice(0, 7) === hasta.slice(0, 7) ? `${Number(desde.slice(8))}–${fc(hasta)}` : `${fc(desde)} – ${fc(hasta)}`;
}
