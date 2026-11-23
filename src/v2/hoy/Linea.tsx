/**
 * Trazo 2.0 · la línea del día: cada meta en su hora, sobre un riel. El nodo muestra cuántos pasos van (y se vuelve el
 * trazo cuando está hecha); la que corre lleva la hora resaltada, y si la hora cae en un hueco, ahí va la marca de "ahora".
 */
import { fmtDur } from '../../data/time';
import type { Block, DayLog } from '../../data/types';
import { Icono } from '../iconos';
import { Anillo } from '../kit/superficies';
import { Escalonado } from '../movimiento/componentes';
import { filasLinea, pasosDe, textoPasos, type EstadoFila } from './datos';

interface Props {
  day: DayLog;
  now: number;
  titulo: (b: Block) => string;
  color: (b: Block) => string;
  onAbrir: (clave: string) => void;
}

const LEE: Record<EstadoFila, string> = { hecha: 'hecha', ahora: 'ahora', pasada: 'sin hacer', futura: '', salteada: 'salteada' };

export function Linea({ day, now, titulo, color, onAbrir }: Props) {
  const filas = filasLinea(day, now);
  return (
    <Escalonado como="ol" className="hy-linea" clave={day.date}>
      {filas.map((f) => {
        if (f.tipo === 'ahora') return <li key="ahora" className="hy-marca" aria-label={`Ahora, ${f.hora}`}><span className="trazo-marca t-dato">{f.hora}</span><i aria-hidden="true" /></li>;
        const { b, estado } = f;
        const { hechos, total } = pasosDe(b);
        const nombre = titulo(b);
        const como = estado === 'salteada' ? 'salteada' : b.hecho ? 'dada por hecha' : '';
        // A la vista, lo justo: la duración, y los pasos solo cuando vas por la mitad. Leído en voz alta, todo.
        const detalle = [fmtDur(b.min), como || (hechos > 0 && hechos < total ? textoPasos(hechos, total) : ''), b.propia ? 'sumada hoy' : ''].filter(Boolean).join(' · ');
        // Leído: primero lo que se ve, tal cual (quien usa la voz dice lo que ve), y después lo que la vista calla.
        const calla = como ? '' : [LEE[estado], hechos > 0 && hechos < total ? '' : textoPasos(hechos, total)].filter(Boolean).join(', ');
        return (
          <li key={b.key} className={`hy-fila-li ${estado}`} style={{ ['--area' as string]: color(b) }}>
            <button type="button" className="hy-fila" onClick={() => onAbrir(b.key)} aria-label={`${b.start}, ${nombre}. ${detalle}${calla ? ` (${calla})` : ''}`}>
              <span className={`hy-hora t-dato${estado === 'ahora' ? ' trazo-marca' : ''}`}>{b.start}</span>{' '}
              <span className="hy-nodo" aria-hidden="true">
                {estado === 'hecha' ? <span className="hy-nodo-hecho"><Icono nombre="tilde" lado={16} /></span>
                  : estado === 'salteada' ? <span className="hy-nodo-salteado" />
                  : <Anillo nombre="" valor={total ? hechos / total : 0} tamano={24} grosor={3} etiqueta=" " />}
              </span>
              <span className="hy-fila-texto">
                <b>{nombre}</b>{' '}
                <small><i className="area-punto" />{detalle}</small>
              </span>
              <Icono nombre="siguiente" lado={16} className="icono s-chevron" />
            </button>
          </li>
        );
      })}
    </Escalonado>
  );
}
