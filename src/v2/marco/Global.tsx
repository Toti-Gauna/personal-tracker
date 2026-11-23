/**
 * Trazo 2.0 · todo lo que acompaña a cualquier pantalla: la navegación, el mini reproductor del foco, los avisos y la
 * confirmación, las transiciones, el tema que sigue al teléfono, el pesaje como aviso (no como hoja que te persigue), la hoja de
 * la corrida y la de "¿En qué estado estás?". Es un pedazo aparte que App carga una vez que hay ajustes.
 */
import { useEffect } from 'react';
import type { Seccion } from '../../lib/routes';
import { marcarPesoPreguntado } from '../../state/train';
import { cerrarHojas, useHojaAbierta } from '../../ui/checkins';
import { HojaCorridaV2 } from '../entreno/HojaCorridaV2';
import EstadoEstudioV2 from '../estudio/EstadoEstudioV2';
import CapasV2, { aviso } from '../kit/capas';
import { navegar } from '../movimiento/movimiento';
import { BarraV2 } from './BarraV2';
import { MiniFoco } from './MiniFoco';
import { useTemaV2 } from './tema';
import '../tokens.css';
import '../base.css';
import './marco.css';

/** El pesaje, sin perseguirte: un aviso con "Cargar", una vez. La corrida sí tiene su hoja. */
function Checkins() {
  const a = useHojaAbierta();
  useEffect(() => {
    if (a?.tipo !== 'peso') return;
    const fecha = a.date;
    cerrarHojas();
    marcarPesoPreguntado(fecha);
    aviso({ titulo: '¿Te pesaste hoy?', sub: 'En ayunas es lo más comparable.', accion: { etiqueta: 'Cargar', run: () => { void navegar('#/entreno-peso'); } }, duracion: 9000 });
  }, [a]);
  return <HojaCorridaV2 abierta={a?.tipo === 'corrida'} date={a?.tipo === 'corrida' ? a.date : null} />;
}

interface Props {
  activa: Seccion | 'avance';
  pendientes: number;
  /** La barra de navegación (no en el Buen día ni en la presentación). */
  conBarra: boolean;
  /** El mini reproductor del foco (no adentro del foco mismo, que ya lo muestra grande). */
  conMini: boolean;
}

export default function GlobalV2({ activa, pendientes, conBarra, conMini }: Props) {
  useTemaV2();
  return (
    <>
      {conBarra && <BarraV2 activa={activa} pendientes={pendientes} />}
      {conMini && <MiniFoco />}
      <CapasV2 />
      <Checkins />
      <EstadoEstudioV2 />
    </>
  );
}
