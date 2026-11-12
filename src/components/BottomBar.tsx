import { ETIQUETAS, SECCIONES, type Seccion } from '../lib/routes';
import { NavIcon } from './NavIcons';
import { useMarca } from './useMarca';
import '../styles/bar.css';

interface Props {
  activa: Seccion | 'avance';
  /** Tarjetas de repaso pendientes; 0 oculta el contador. */
  pendientes?: number;
}

/** Barra inferior del teléfono: 5 destinos de un quinto del ancho. */
export function BottomBar({ activa, pendientes = 0 }: Props) {
  const nav = useMarca<HTMLElement>(activa);
  return (
    <nav className="barra" aria-label="Secciones" ref={nav}>
      <ul>
        {SECCIONES.map((id) => {
          const esActiva = id === activa;
          const mostrarContador = id === 'estudio' && pendientes > 0 && !esActiva;
          return (
            <li key={id}>
              <a href={`#/${id}`} aria-current={esActiva ? 'page' : undefined}>
                {esActiva && <span className="marca" data-flip-id="marca" />}
                <NavIcon id={id} />
                <span className="txt">{ETIQUETAS[id]}</span>
                {mostrarContador && <span className="contador" aria-label={`${pendientes} tarjetas pendientes`}>{pendientes}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
