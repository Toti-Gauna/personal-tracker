/** Trazo 2.0 · #/v2 (el lenguaje) y #/v2/kit (los controles): el taller donde se ve el sistema antes de las pantallas. */
import type { PropsV2 } from '../registro';
import '../kit/superficies.css';
import Lenguaje from './Lenguaje';
import Kit from './Kit';
import Piezas from './Piezas';

export default function Taller({ ruta, today }: PropsV2) {
  const pag = ruta.param === 'kit' ? 'kit' : ruta.param === 'piezas' ? 'piezas' : 'lenguaje';
  const kit = pag === 'kit';
  return (
    <main className="v2 v2-pantalla lenguaje">
      <nav className="mu-volver"><a href="#/ajustes">Ajustes</a></nav>
      <header className="mu-encabezado">
        <p className="t-rotulo">Trazo 2.0 · taller</p>
        <h1 className="t-titulo">{{ kit: 'Controles', piezas: 'Piezas', lenguaje: 'Instrumento' }[pag]}</h1>
        <p className="t-cuerpo-l mu-intro">{{ kit: 'Cada control de la 2.0, vivo.', piezas: 'Avisos, hojas, avance y carga, vivos.', lenguaje: 'Las reglas visuales de la 2.0, en vivo.' }[pag]}</p>
      </header>
      <nav className="kt-pestanas" aria-label="Taller">
        <a href="#/v2" aria-current={pag === 'lenguaje' ? 'page' : undefined}>Lenguaje</a>
        <a href="#/v2/kit" aria-current={kit ? 'page' : undefined}>Controles</a>
        <a href="#/v2/piezas" aria-current={pag === 'piezas' ? 'page' : undefined}>Piezas</a>
      </nav>
      {kit ? <Kit hoy={today} /> : pag === 'piezas' ? <Piezas /> : <Lenguaje />}
    </main>
  );
}
