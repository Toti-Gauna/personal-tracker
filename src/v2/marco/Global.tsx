/**
 * Trazo 2.0 · todo lo que acompaña a cualquier pantalla con la 2.0 prendida: la navegación, los avisos y la confirmación,
 * las transiciones, el tema que sigue al teléfono y el pesaje como aviso (no como hoja que te persigue). App lo carga
 * recién cuando la 2.0 está prendida: la 1.0 no descarga nada de esto.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pantalla, Seccion } from '../../lib/routes';
import { marcarPesoPreguntado } from '../../state/train';
import { Checkins, cerrarHojas, useHojaAbierta } from '../../ui/checkins';
import { Icono } from '../iconos';
import CapasV2, { aviso } from '../kit/capas';
import { navegar } from '../movimiento/movimiento';
import { PANTALLAS_V2 } from '../registro';
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

/** En las pantallas que todavía son 1.0, lo que la 2.0 corrige desde afuera: en Perfil, Ajustes con engranaje y nombre. */
function AccionDeMarca({ pantalla }: { pantalla: Pantalla }) {
  // La ranura la pone la marca "1.0" de la pantalla; se busca después de que esa pantalla se montó.
  const [ranura, setRanura] = useState<HTMLElement | null>(null);
  useEffect(() => { setRanura(document.getElementById('v2-marca-accion')); }, [pantalla]);
  if (!ranura || !ranura.isConnected || pantalla !== 'perfil' || PANTALLAS_V2.perfil) return null;
  return createPortal(<a className="k-boton secundario chico" href="#/ajustes" data-v2-nav=""><Icono nombre="ajustes" lado={18} /><span>Ajustes</span></a>, ranura);
}

interface Props { activa: Seccion | 'avance'; pantalla: Pantalla; pendientes: number; conBarra: boolean; conCheckins: boolean }

export default function GlobalV2({ activa, pantalla, pendientes, conBarra, conCheckins }: Props) {
  useTemaV2();
  return (
    <>
      {conBarra && <BarraV2 activa={activa} pendientes={pendientes} />}
      {conBarra && <AccionDeMarca pantalla={pantalla} />}
      <CapasV2 />
      {conCheckins && <CheckinsV2 />}
    </>
  );
}
