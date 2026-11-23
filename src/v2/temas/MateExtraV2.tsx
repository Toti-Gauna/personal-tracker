/**
 * Trazo 2.0 · el resto de #/estudio/mate/…: un tramo (#/estudio/mate/<id>) y el capítulo de un libro
 * (#/estudio/mate/libro/<id>/<n>). El centro de Matemática y la página de cada libro las trae la entrada principal de Estudio;
 * si alguna llegara por acá, se resuelve igual con las mismas pantallas.
 */
import { LibroV2, MateV2 } from '../estudio/Matematica';
import type { PropsV2 } from '../registro';
import CapituloV2 from './CapituloV2';
import TramoV2 from './TramoV2';

export default function MateExtraV2({ ruta, day }: PropsV2) {
  const [, seg, id, n] = (ruta.param ?? '').split('/');
  if (seg === 'libro') {
    const libro = id ? decodeURIComponent(id) : '';
    return n ? <CapituloV2 key={`${libro}:${n}`} day={day} id={libro} n={Number(n)} /> : <LibroV2 key={libro} day={day} id={libro} />;
  }
  return seg ? <TramoV2 key={seg} day={day} id={decodeURIComponent(seg)} /> : <MateV2 day={day} />;
}
