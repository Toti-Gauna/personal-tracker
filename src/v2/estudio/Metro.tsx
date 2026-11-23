/**
 * Trazo 2.0 · el metro: una línea con una estación por tramo. Lo recorrido va con el trazo, la estación actual es más grande y
 * late, y las que vienen son un anillo del color del área. `MetroVertical` es la misma línea parada, con nombre en cada estación.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Estacion, Linea } from './lineas';

const estilo = (area: string, n?: number) => ({ ['--area' as string]: area, ...(n != null ? { ['--n' as string]: n } : {}) }) as CSSProperties;

/** Va siempre dentro de un link que ya dice cuántos van: es dibujo, no se anuncia. */
export function Metro({ linea }: { linea: Pick<Linea, 'nombre' | 'area' | 'estaciones' | 'hechas' | 'unidad'> }) {
  const n = linea.estaciones.length;
  return (
    <ol className="es-metro" style={estilo(linea.area, n)} aria-hidden="true">
      {linea.estaciones.map((e) => <li key={e.id} className={e.estado} aria-current={e.estado === 'actual' ? 'step' : undefined}><i /></li>)}
    </ol>
  );
}

/** Una línea parada: cada estación con su nombre, su fecha o nota y, si hace falta, un enlace. */
export function MetroVertical({ area, estaciones, nota, href }: { area: string; estaciones: Estacion[]; nota?: (e: Estacion) => ReactNode; href?: (e: Estacion) => string | undefined }) {
  return (
    <ol className="es-vertical" style={estilo(area)}>
      {estaciones.map((e) => {
        const dentro = (<><i /><span className="es-vertical-texto"><b>{e.nombre}</b>{nota?.(e) && <small>{nota(e)}</small>}</span></>);
        const h = href?.(e);
        return <li key={e.id} className={e.estado} aria-current={e.estado === 'actual' ? 'step' : undefined}>{h ? <a href={h}>{dentro}</a> : <div>{dentro}</div>}</li>;
      })}
    </ol>
  );
}
