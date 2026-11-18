/**
 * Ola 27 (v3) · el roadmap de matemática medido en horas. Cada tramo diario (T+0 a T+2, T+3 a T+6…) vale unas horas (semanas base × 14) y se
 * reparte sobre las horas de matemática de la rutina de cada día: 7 por semana en el modo intensivo, 14 con trabajo. Durante una ventana W la
 * matemática diaria se pausa (la ventana la reemplaza) y se retoma al terminar. Puro.
 */
import { planRoutine, type DayType } from './routines';
import { addDays, parseDate } from './time';

/** Horas de matemática que da una rutina en un día. */
export function horasMateDe(tipo: DayType): number {
  return planRoutine(tipo, 'completo').filter((p) => p.block.rama === 'matematica').reduce((s, p) => s + p.min, 0) / 60;
}
const cache: Partial<Record<DayType, number>> = {};
const horasTipo = (t: DayType) => (cache[t] ??= horasMateDe(t));
const esFinde = (f: string) => { const d = parseDate(f).getDay(); return d === 0 || d === 6; };

export interface VentanaFechas { inicio: string; fin: string }

/** Horas de matemática diaria de un día: cero dentro de una ventana; si no, las de la rutina que rige. */
export function horasMateDelDia(f: string, o: { inicioTrabajo: string; ventanas: VentanaFechas[] }): number {
  if (o.ventanas.some((v) => f >= v.inicio && f <= v.fin)) return 0;
  const fin = esFinde(f);
  if (f < o.inicioTrabajo) return horasTipo(fin ? 'busqueda-intensiva-finde' : 'busqueda-intensiva');
  return horasTipo(fin ? 'con-trabajo-finde' : 'con-trabajo');
}

export interface DiarioFechado { id: string; horas: number; inicio: string; fin: string }

/** Las fechas de cada tramo diario, uno detrás del otro. El último se corta en `hasta` si no alcanza a juntar sus horas. */
export function fecharDiarios(diarios: { id: string; horas: number }[], t0: string, hasta: string, o: { inicioTrabajo: string; ventanas: VentanaFechas[] }): DiarioFechado[] {
  const out: DiarioFechado[] = [];
  let d = t0;
  for (const x of diarios) {
    const inicio = d;
    let acc = 0;
    let fin = inicio;
    while (d <= hasta) {
      acc += horasMateDelDia(d, o);
      fin = d;
      d = addDays(d, 1);
      if (acc >= x.horas - 1e-9) break;
    }
    out.push({ id: x.id, horas: x.horas, inicio, fin });
    if (d > hasta) break;
  }
  return out;
}
