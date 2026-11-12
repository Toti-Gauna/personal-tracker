import { ETIQUETAS, NAV_ANCHA, type Seccion } from '../lib/routes';
import { NavIcon } from './NavIcons';
import { useMarca } from './useMarca';
import { FocoSide } from './FocoMini';
import '../styles/side.css';

interface Props {
  activa: Seccion | 'avance';
  pendientes?: number;
}

/**
 * Barra lateral en escritorio (1100 px o más) y riel de íconos en tablet (720 a 1099 px):
 * el mismo componente, que el CSS achica. El foco que corre aparece abajo.
 */
export function SideNav({ activa, pendientes = 0 }: Props) {
  const nav = useMarca<HTMLElement>(activa);
  return (
    <nav className="lateral" aria-label="Secciones" ref={nav}>
      <a className="lateral-logo" href="#/avance" aria-label="Trazo · Avance">
        <img src={`${import.meta.env.BASE_URL}trazo.svg`} alt="" width={36} height={36} />
        <span className="titulo">trazo</span>
      </a>
      <ul>
        {NAV_ANCHA.map((id) => {
          const esActiva = id === activa;
          const mostrarContador = id === 'estudio' && pendientes > 0 && !esActiva;
          return (
            <li key={id}>
              <a href={`#/${id}`} aria-current={esActiva ? 'page' : undefined}>
                {esActiva && <span className="marca" data-flip-id="marca-lateral" />}
                <NavIcon id={id} />
                <span className="txt">{ETIQUETAS[id]}</span>
                {mostrarContador && <span className="contador" aria-label={`${pendientes} tarjetas pendientes`}>{pendientes}</span>}
              </a>
            </li>
          );
        })}
      </ul>
      <FocoSide />
    </nav>
  );
}
