/**
 * Trazo 2.0 · el año de un vistazo: un renglón por mes, una celda por día. Cuanto más se cumplió ese día, más lleno. Hoy lleva un
 * aro. Es un dibujo con su resumen en palabras; los números (días cargados, promedio) van al lado, no adentro.
 */
import type { MapaAnio } from './datos';
import './perfil.css';

export function Calor({ mapa, nombre }: { mapa: MapaAnio; nombre: string }) {
  return (
    <figure className="ca" role="img" aria-label={nombre} data-grafico>
      {mapa.filas.map((f) => (
        <div key={f.clave} className="ca-mes">
          <span className="ca-letra t-rotulo" aria-hidden="true">{f.letra}</span>
          <span className="ca-dias">
            {f.celdas.map((c) => <i key={c.fecha} className={`ca-n${c.nivel}${c.hoy ? ' ca-hoy' : ''}${c.futuro ? ' ca-futuro' : ''}`} />)}
          </span>
        </div>
      ))}
      <figcaption className="ca-leyenda" aria-hidden="true"><span>menos</span><i className="ca-n1" /><i className="ca-n2" /><i className="ca-n3" /><i className="ca-n4" /><span>casi todo</span></figcaption>
    </figure>
  );
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Un mes como calendario: siete columnas, cada día con su número y su nivel. */
export function Mes({ celdas, desplazamiento, nombre }: { celdas: MapaAnio['filas'][number]['celdas']; /** Cuántos huecos antes del día 1 (lunes = 0). */ desplazamiento: number; nombre: string }) {
  return (
    <figure className="ca-calendario" role="img" aria-label={nombre} data-grafico>
      {DIAS.map((d) => <span key={d} className="t-rotulo" aria-hidden="true">{d}</span>)}
      {Array.from({ length: desplazamiento }, (_, i) => <span key={`h${i}`} />)}
      {celdas.map((c) => <i key={c.fecha} className={`ca-n${c.nivel}${c.hoy ? ' ca-hoy' : ''}${c.futuro ? ' ca-futuro' : ''}`}><b>{c.dia}</b></i>)}
    </figure>
  );
}
