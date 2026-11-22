/**
 * Trazo 2.0 · lo que pasa al tocar la casilla de un paso del estudio de hoy: ir a la tarjeta, a la tesis o al cold recall, marcar
 * un repaso, completar un capítulo (que no se da por estudiado sin la micro-tesis de cada capítulo de la unidad) o ir al test.
 * Mismo comportamiento que la 1.0.
 */
import { capsTexto, microFaltantes } from '../../data/libros';
import type { PlanStep } from '../../data/study';
import { ir } from '../../lib/routes';
import { getState } from '../../state/store';
import { completeLearn, completeReview, uncompleteReview } from '../../state/study';
import { aviso } from '../kit/capas';

export function tocarPaso(date: string, s: PlanStep, done: boolean) {
  const [tipo, a, b] = s.ref.split(':');
  if (tipo === 'cards') return ir(`tarjetas/${a}`);
  if (tipo === 'rev') {
    if (s.kind === 'tesis') return ir(`tesis/${a}`);
    if (s.kind === 'cold' && !done) return ir(`recall/${a}`);
    return done ? uncompleteReview(date, a) : completeReview(date, a);
  }
  if (tipo === 'learn' && !done) {
    const act = getState().study.activities.find((x) => x.id === a);
    const falta = act?.libro && b ? microFaltantes(getState().study, act, Number(b)) : [];
    if (act?.libro && falta.length) {
      aviso({ titulo: `Falta la micro-tesis del ${capsTexto(falta)}`, sub: 'Una frase por capítulo, en el libro', tono: 'atencion' });
      return ir(`estudio/libro/${act.libro}`);
    }
    return completeLearn(date, a, b ? Number(b) : undefined);
  }
  if (tipo === 'test') return ir(`test/${a}/${b}`);
}
