/** Trazo 2.0 · el taller (#/v2, /kit, /piezas, /movimiento): donde se ve el sistema antes de las pantallas. */
import type { PropsV2 } from '../registro';
import '../kit/superficies.css';
import Lenguaje from './Lenguaje';
import Kit from './Kit';
import Piezas from './Piezas';
import Movimiento from './Movimiento';

export default function Taller({ ruta, today }: PropsV2) {
  const pag = ruta.param === 'kit' ? 'kit' : ruta.param === 'piezas' ? 'piezas' : ruta.param?.startsWith('movimiento') ? 'movimiento' : 'lenguaje';
  const sub = ruta.param?.startsWith('movimiento/') ? ruta.param.slice(11) : undefined;
  const kit = pag === 'kit';
  return (
    <main className="v2 v2-pantalla lenguaje">
      {sub ? <Movimiento sub={sub} /> : <>
      <nav className="mu-volver"><a href="#/ajustes">Ajustes</a></nav>
      <header className="mu-encabezado">
        <p className="t-rotulo">Trazo 2.0 · taller</p>
        <h1 className="t-titulo">{{ kit: 'Controles', piezas: 'Piezas', movimiento: 'Movimiento', lenguaje: 'Instrumento' }[pag]}</h1>
        <p className="t-cuerpo-l mu-intro">{{ kit: 'Cada control de la 2.0, vivo.', piezas: 'Avisos, hojas, avance y carga, vivos.', movimiento: 'El movimiento explica de dónde venís.', lenguaje: 'Las reglas visuales de la 2.0, en vivo.' }[pag]}</p>
      </header>
      <nav className="kt-pestanas" aria-label="Taller">
        <a href="#/v2" data-transicion="fundido" aria-current={pag === 'lenguaje' ? 'page' : undefined}>Lenguaje</a>
        <a href="#/v2/kit" data-transicion="fundido" aria-current={kit ? 'page' : undefined}>Controles</a>
        <a href="#/v2/piezas" data-transicion="fundido" aria-current={pag === 'piezas' ? 'page' : undefined}>Piezas</a>
        <a href="#/v2/movimiento" data-transicion="fundido" aria-current={pag === 'movimiento' ? 'page' : undefined}>Movimiento</a>
      </nav>
      {kit ? <Kit hoy={today} /> : pag === 'piezas' ? <Piezas /> : pag === 'movimiento' ? <Movimiento /> : <Lenguaje />}
      </>}
    </main>
  );
}
