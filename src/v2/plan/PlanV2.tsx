/**
 * Trazo 2.0 · el Plan (tanda 2.2): el centro (#/metas, #/metas/periodos), un período (#/metas/periodos/<id>) y el análisis
 * (#/metas/analisis). El resto de #/metas/… sigue en 1.0 hasta su tanda (el registro decide qué cubre).
 */
import type { PropsV2 } from '../registro';
import { Analisis } from './Analisis';
import { Centro } from './Centro';
import { Detalle } from './Detalle';
import '../hoy/hoy.css';
import './plan.css';

export default function PlanV2({ ruta, today }: PropsV2) {
  const param = ruta.param ?? '';
  if (param === 'analisis') return <Analisis />;
  if (param.startsWith('periodos/')) {
    const id = decodeURIComponent(param.slice('periodos/'.length));
    return <Detalle key={id} id={id} hoy={today} />;
  }
  return <Centro hoy={today} />;
}
