/**
 * Trazo 2.0 · el análisis de puntos débiles (#/flojo/analisis): el mapa de fortaleza por capítulo, cómo fallás, el recall de la
 * semana y la calibración. Son los gráficos de la 1.0, adentro del marco 2.0 hasta que se rehagan (3.3): así no se pierde nada.
 */
import { useStore } from '../../state/store';
import { Calibracion, ComoFallas, Mapa, RecallSemanal } from '../../ui/Debiles';
import { Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import '../../styles/debiles.css';
import './estudio.css';

export function AnalisisFlojo({ day }: { day: PropsV2['day'] }) {
  const st = useStore((s) => s.study);
  const conamat = st.activities.find((a) => a.id === 'conamat') ?? st.activities.find((a) => a.units?.length);
  return (
    <Marco className="es" titulo="Análisis" volver={{ href: '#/flojo', nombre: 'Puntos débiles' }}>
      <div className="pl-detalle-v1 es-puente">
        <Mapa st={st} a={conamat} />
        <ComoFallas st={st} />
        <RecallSemanal st={st} date={day.date} />
        <Calibracion st={st} />
      </div>
    </Marco>
  );
}
