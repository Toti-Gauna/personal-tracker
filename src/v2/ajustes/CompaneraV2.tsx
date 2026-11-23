/**
 * Trazo 2.0 · Compañera de entreno (#/ajustes-companera): tu nombre y el de con quien entrenás. Cada uno tiene sus propios rangos,
 * pesos y récords. Guarda con `setNames`, igual que la 1.0.
 */
import { useState } from 'react';
import { setNames } from '../../state/profile';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Fila } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import './ajustes.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada uno tiene sus propios rangos de repeticiones, pesos y récords.</p>
    <p className="t-cuerpo">Los rangos se ajustan en Entreno, al editar cada rutina. Acá solo cambian los nombres que se ven en la sesión y el resumen.</p>
  </>
);

export default function CompaneraV2(_: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const [yo, setYo] = useState(settings.names.me);
  const [ella, setElla] = useState(settings.names.partner);
  const vacio = !yo.trim() || !ella.trim();
  const igual = yo.trim() === settings.names.me && ella.trim() === settings.names.partner;
  const guardar = () => {
    setNames(yo, ella);
    aviso({ titulo: 'Nombres guardados', sub: `${yo.trim()} y ${ella.trim()}`, tono: 'hecho' });
  };
  return (
    <Marco className="ax" titulo="Compañera de entreno" volver={{ href: '#/ajustes', nombre: 'Ajustes' }} info={INFO}>
      <div className="capa-1 ax-form">
        <CampoTexto etiqueta="Tu nombre" valor={yo} onCambio={setYo} />
        <CampoTexto etiqueta="Entrenás con" valor={ella} onCambio={setElla} />
        <Boton variante="primario" ancho icono="tilde" deshabilitado={vacio ? 'Escribí los dos nombres.' : igual} onClick={guardar}>Guardar nombres</Boton>
      </div>
      <div className="capa-1 s-lista"><Fila icono="entreno" titulo="Ir a Entreno" nota="Rutinas, semana y peso" href="#/entreno" /></div>
    </Marco>
  );
}
