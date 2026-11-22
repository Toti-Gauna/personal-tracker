/**
 * Trazo 2.0 · todo lo que acompaña a cualquier pantalla con la 2.0 prendida: la navegación, los avisos y la confirmación,
 * las transiciones, el tema que sigue al teléfono y el pesaje como aviso (no como hoja que te persigue). App lo carga
 * recién cuando la 2.0 está prendida: la 1.0 no descarga nada de esto.
 */
import { useEffect } from 'react';
import type { Pantalla, Seccion } from '../../lib/routes';
import { marcarPesoPreguntado } from '../../state/train';
import { ponerPuenteAvisos } from '../../ui/avisos';
import { Checkins, cerrarHojas, useHojaAbierta } from '../../ui/checkins';
import CapasV2, { aviso } from '../kit/capas';
import { navegar } from '../movimiento/movimiento';
import { BarraV2 } from './BarraV2';
import { useTemaV2 } from './tema';
import '../tokens.css';
import '../base.css';
import './marco.css';

/** El pesaje, sin perseguirte: un aviso con "Cargar", una vez. La corrida sigue con su hoja. */
function CheckinsV2() {
  const a = useHojaAbierta();
  useEffect(() => {
    if (a?.tipo !== 'peso') return;
    const fecha = a.date;
    cerrarHojas();
    marcarPesoPreguntado(fecha);
    aviso({ titulo: '¿Te pesaste hoy?', sub: 'En ayunas es lo más comparable.', accion: { etiqueta: 'Cargar', run: () => { void navegar('#/entreno-peso'); } }, duracion: 9000 });
  }, [a]);
  return a?.tipo === 'peso' ? null : <Checkins />;
}

/** `pantalla` ya no se usa acá (Perfil 2.0 trae su propio acceso a Ajustes); se deja en la firma porque App lo pasa. */
interface Props { activa: Seccion | 'avance'; pantalla: Pantalla; pendientes: number; conBarra: boolean; conCheckins: boolean }

/** Los avisos que disparan las acciones de la 1.0 (una meta cumplida, un horario cambiado) salen con el estilo de la 2.0. */
function usePuenteAvisos() {
  useEffect(() => {
    ponerPuenteAvisos((t) => {
      const deshacer = t.action?.label === 'Deshacer' ? t.action.run : undefined;
      aviso({ titulo: t.title, sub: t.sub, tono: t.evento === 'tarea' ? 'hecho' : 'info', deshacer, accion: !deshacer && t.action ? { etiqueta: t.action.label, run: t.action.run } : undefined });
      return true;
    });
    return () => ponerPuenteAvisos(null);
  }, []);
}

export default function GlobalV2({ activa, pendientes, conBarra, conCheckins }: Props) {
  useTemaV2();
  usePuenteAvisos();
  return (
    <>
      {conBarra && <BarraV2 activa={activa} pendientes={pendientes} />}
      <CapasV2 />
      {conCheckins && <CheckinsV2 />}
    </>
  );
}
