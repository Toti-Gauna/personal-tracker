/**
 * Trazo 2.0 · el Plan (tandas 2.2 y 2.3): el centro (#/metas, #/metas/periodos), un período (#/metas/periodos/<id>), el
 * análisis (#/metas/analisis), la línea de tiempo (#/metas/linea) y el mapa (#/metas/constelacion). El resto de #/metas/… sigue en 1.0 hasta su tanda (el registro decide qué cubre).
 */
import type { PropsV2 } from '../registro';
import { Analisis } from './Analisis';
import { Centro } from './Centro';
import { Constelacion } from './Constelacion';
import { Detalle } from './Detalle';
import { LineaV2 } from './LineaV2';
import '../hoy/hoy.css';
import './plan.css';

export default function PlanV2({ ruta, today }: PropsV2) {
  const param = ruta.param ?? '';
  if (param === 'analisis') return <Analisis />;
  if (param === 'linea') return <LineaV2 hoy={today} />;
  if (param === 'constelacion') return <Constelacion hoy={today} />;
  if (param.startsWith('periodos/')) {
    const id = decodeURIComponent(param.slice('periodos/'.length));
    return <Detalle key={id} id={id} hoy={today} />;
  }
  return <Centro hoy={today} />;
}
