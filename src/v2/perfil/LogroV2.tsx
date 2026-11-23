/**
 * Trazo 2.0 · un sello nuevo (#/logro/<id>): cae acuñado, con su brillo y un festejo. Si ganaste más de uno, se ven de a uno.
 */
import { useEffect, useRef } from 'react';
import { SEAL_XP, sealById } from '../../data/profile';
import { fmtFecha } from '../../data/time';
import { useStore } from '../../state/store';
import { markSealSeen } from '../../state/profile';
import { play } from '../../ui/sound';
import { Boton } from '../kit/controles';
import { Vacio } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { festejar, reducido } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import { SelloInclinable } from './Sello';
import '../proyecto/proyecto.css';
import './perfil.css';

export default function LogroV2({ ruta }: PropsV2) {
  const id = ruta.param;
  const def = id ? sealById(id) : undefined;
  const perfil = useStore((s) => s.profile);
  const fecha = id ? perfil.seals[id] : undefined;
  // Los otros sellos ganados que todavía no viste: el de esta pantalla se marca como visto al entrar.
  const pendientes = Object.keys(perfil.seals).filter((x) => x !== id && !perfil.seen.includes(x));
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!def || !id) return;
    play('sello');
    markSealSeen(id);
    if (reducido()) return;
    const t = window.setTimeout(() => festejar(caja.current, { cantidad: 14, alcance: 120 }), 420);
    return () => window.clearTimeout(t);
  }, [def, id]);

  if (!def) {
    return (
      <Marco className="pf" titulo="Sello" volver={{ href: '#/perfil', nombre: 'Perfil' }}>
        <Vacio ilustracion="buscar" titulo="No encontré ese sello" texto="Todos tus sellos están en Perfil." accion={<Boton variante="primario" href="#/perfil">Ir a Perfil</Boton>} />
      </Marco>
    );
  }
  return (
    <Marco className="pf pf-logro" titulo={def.name} rotulo={`Nuevo sello${fecha ? ` · ${fmtFecha(fecha).toLowerCase()}` : ''}`} volver={{ href: '#/perfil', nombre: 'Perfil' }}>
      <div className="pf-logro-sello" ref={caja}><SelloInclinable marca={def.mark} color={def.color} grupo={def.group} ganado lado={208} nombre={`Sello ${def.name}`} className="sl-cae sl-grande" /></div>
      <p className="t-cuerpo-l pf-logro-linea">{def.line}</p>
      <p className="t-nota">{def.how}</p>
      <p className="t-dato pf-logro-xp">+{SEAL_XP} XP</p>
      <div className="pt-acciones pf-logro-acciones">
        {pendientes.length > 0
          ? <Boton variante="primario" ancho icono="siguiente" href={`#/logro/${pendientes[0]}`}>Siguiente sello</Boton>
          : <Boton variante="primario" ancho href="#/perfil">Ver mis sellos</Boton>}
      </div>
    </Marco>
  );
}
