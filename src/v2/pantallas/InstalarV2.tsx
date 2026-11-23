/**
 * Trazo · la primera vez: tu nombre y el de tu compañera de entreno, y a empezar. Instalarla como app es opcional y se explica
 * en una hoja (también se puede hacer después desde Ajustes). Queda guardado en el teléfono: no se vuelve a pedir.
 */
import { useState } from 'react';
import { pedirInstalacion } from '../../lib/instalar';
import { register } from '../../state/store';
import { Icono } from '../iconos';
import { Boton, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import '../kit/kit.css';
import '../kit/superficies.css';
import '../marco/marco.css';

const PASOS = [
  ['Compartir', 'en Safari, o el menú ⋮ en Chrome.'],
  ['Agregar a inicio', 'o Instalar app.'],
  ['Abrí Trazo', 'desde el ícono: pantalla completa y sin internet.'],
] as const;

export default function InstalarV2() {
  const [me, setMe] = useState('Toti');
  const [partner, setPartner] = useState('Abi');
  const [hoja, setHoja] = useState(false);
  const instalar = async () => { if (!(await pedirInstalacion())) setHoja(true); };
  return (
    <main className="v2 v2-pantalla in" aria-labelledby="in-t">
      <div className="in-cabeza">
        <Icono nombre="trazo" lado={64} />
        <h1 id="in-t" className="t-heroe">Tu día, marcado a mano.</h1>
        <p className="t-cuerpo-l in-sub">Dos nombres y arrancás.</p>
      </div>
      <form className="in-form" onSubmit={(e) => { e.preventDefault(); if (me.trim()) register(me, partner); }}>
        <CampoTexto etiqueta="Tu nombre" valor={me} onCambio={setMe} />
        <CampoTexto etiqueta="Entrenás con" valor={partner} onCambio={setPartner} nota="Se cambia cuando quieras en Ajustes." />
        <Boton variante="primario" ancho tipo="submit" icono="siguiente" deshabilitado={me.trim() ? false : 'Escribí tu nombre.'}>Empezar</Boton>
      </form>
      <div className="in-instalar"><Boton variante="fantasma" icono="importar" onClick={() => { void instalar(); }}>Instalarla como app</Boton></div>
      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo="Instalarla como app">
        <ol className="in-pasos">
          {PASOS.map(([que, como], i) => <li key={que}><span className="t-dato">{String(i + 1).padStart(2, '0')}</span><span className="t-cuerpo"><b>{que}</b> {como}</span></li>)}
        </ol>
      </Hoja>
    </main>
  );
}
