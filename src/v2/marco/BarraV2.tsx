/**
 * Trazo 2.0 · la navegación: en el teléfono, una barra de vidrio que flota con el trazo deslizándose a la sección activa;
 * en tablet, un riel; en escritorio, una barra lateral con nombre. Es el mismo componente: el CSS decide.
 */
import { FocoSide } from '../../components/FocoMini';
import type { Seccion } from '../../lib/routes';
import { Icono, type NombreIcono } from '../iconos';
import './marco.css';

type Destino = Seccion | 'avance';
const DESTINOS: { id: Destino; nombre: string; icono: NombreIcono }[] = [
  { id: 'avance', nombre: 'Avance', icono: 'grafico' },
  { id: 'hoy', nombre: 'Hoy', icono: 'hoy' },
  { id: 'estudio', nombre: 'Estudio', icono: 'estudio' },
  { id: 'metas', nombre: 'Plan', icono: 'plan' },
  { id: 'entreno', nombre: 'Entreno', icono: 'entreno' },
  { id: 'perfil', nombre: 'Perfil', icono: 'perfil' },
];

interface Props { activa: Destino; pendientes?: number }

export function BarraV2({ activa, pendientes = 0 }: Props) {
  // En el teléfono Avance cuelga de Perfil: son 5 destinos; en ancho, 6.
  const ancho = DESTINOS.findIndex((d) => d.id === activa);
  const telefono = DESTINOS.slice(1).findIndex((d) => d.id === (activa === 'avance' ? 'perfil' : activa));
  return (
    <nav className="b2" aria-label="Secciones" data-v2-nav="" style={{ ['--i' as string]: Math.max(0, telefono), ['--j' as string]: Math.max(0, ancho) }}>
      <a className="b2-logo" href="#/hoy" aria-label="Trazo" data-transicion="fundido"><Icono nombre="trazo" lado={32} /><span>trazo</span></a>
      <ul>
        <li className="b2-trazo" aria-hidden="true"><i /></li>
        {DESTINOS.map((d) => {
          const esActiva = d.id === activa || (d.id === 'perfil' && activa === 'avance');
          const actual = d.id === activa;
          return (
            <li key={d.id} className={d.id === 'avance' ? 'solo-ancho' : undefined}>
              <a href={`#/${d.id}`} data-transicion="fundido" aria-current={actual ? 'page' : undefined} className={esActiva ? 'activa' : undefined}>
                <span className="b2-icono"><Icono nombre={d.icono} /></span>
                <span className="b2-txt">{d.nombre}</span>
                {d.id === 'estudio' && pendientes > 0 && !esActiva && <span className="b2-contador" aria-label={pendientes === 1 ? '1 tarjeta pendiente' : `${pendientes} tarjetas pendientes`}>{pendientes > 99 ? '99+' : pendientes}</span>}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="b2-foco"><FocoSide /></div>
    </nav>
  );
}
