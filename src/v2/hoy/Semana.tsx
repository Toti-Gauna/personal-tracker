/**
 * Trazo 2.0 · los contadores de la semana (postulaciones, respuestas ensayadas, operaciones, clips, entrenos): cada uno con
 * su avance contra la meta y un "+1" con nombre. Son los mismos contadores de la 1.0.
 */
import { useItemsSemana } from '../../ui/plan-bits';
import { RAMA_COLOR } from '../../data/ramas';
import { Boton } from '../kit/controles';
import { Barra } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { colorV2 } from './datos';

const n = (x: number) => String(x).replace('.', ',');

export function Semana({ date, onClips }: { date: string; onClips: () => void }) {
  const items = useItemsSemana(date, onClips);
  return (
    <Grupo titulo="Esta semana">
      <ul className="capa-1 hy-contadores">
        {items.map((x) => {
          const nombre = x.label.replace(/^\+1 /, '').replace(/^Registrar /, '');
          const titulo = nombre[0].toUpperCase() + nombre.slice(1);
          return (
            <li key={x.id} style={{ ['--area' as string]: colorV2(x.color ?? RAMA_COLOR[x.rama]) }}>
              <span className="hy-contador-texto">
                <b><i className="area-punto" />{titulo}</b>
                <small className="t-dato">{x.meta ? `${n(x.v)} de ${n(x.meta)}` : n(x.v)}</small>
                {x.meta ? <Barra nombre={titulo} valor={x.v} max={x.meta} area="var(--area)" /> : null}
              </span>
              <Boton soloIcono icono="mas" etiqueta={x.id === 'clips' ? 'Registrar clips' : `Sumar 1: ${titulo}`} onClick={x.run} />
            </li>
          );
        })}
      </ul>
    </Grupo>
  );
}
