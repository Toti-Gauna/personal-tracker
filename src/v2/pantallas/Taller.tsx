/** Trazo 2.0 · el taller (#/v2, /kit, /piezas, /movimiento): donde se ve el sistema antes de las pantallas. */
import type { PropsV2 } from '../registro';
import '../kit/superficies.css';
import Lenguaje from './Lenguaje';
import Kit from './Kit';
import Piezas from './Piezas';
import Movimiento from './Movimiento';
import { Marco } from '../marco/Marco';
import './lenguaje.css';

export default function Taller({ ruta, today }: PropsV2) {
  const pag = ruta.param === 'kit' ? 'kit' : ruta.param === 'piezas' ? 'piezas' : ruta.param?.startsWith('movimiento') ? 'movimiento' : 'lenguaje';
  const sub = ruta.param?.startsWith('movimiento/') ? ruta.param.slice(11) : undefined;
  const kit = pag === 'kit';
  if (sub) return <main className="v2 v2-pantalla lenguaje"><Movimiento sub={sub} /></main>;
  return (
    <Marco className="lenguaje" rotulo="Trazo · taller" volver={{ href: '#/ajustes', nombre: 'Ajustes' }}
      titulo={{ kit: 'Controles', piezas: 'Piezas', movimiento: 'Movimiento', lenguaje: 'Instrumento' }[pag]}
      intro={{ kit: 'Cada control, vivo.', piezas: 'Avisos, hojas, avance y carga, vivos.', movimiento: 'El movimiento explica de dónde venís.', lenguaje: 'Las reglas visuales de la 2.0, en vivo.' }[pag]}>
      <nav className="kt-pestanas" aria-label="Taller">
        <a href="#/v2" data-transicion="fundido" aria-current={pag === 'lenguaje' ? 'page' : undefined}>Lenguaje</a>
        <a href="#/v2/kit" data-transicion="fundido" aria-current={kit ? 'page' : undefined}>Controles</a>
        <a href="#/v2/piezas" data-transicion="fundido" aria-current={pag === 'piezas' ? 'page' : undefined}>Piezas</a>
        <a href="#/v2/movimiento" data-transicion="fundido" aria-current={pag === 'movimiento' ? 'page' : undefined}>Movimiento</a>
      </nav>
      {kit ? <Kit hoy={today} /> : pag === 'piezas' ? <Piezas /> : pag === 'movimiento' ? <Movimiento /> : <Lenguaje />}
    </Marco>
  );
}
