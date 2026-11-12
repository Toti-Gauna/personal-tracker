import { useState } from 'react';
import { register } from '../state/store';
import '../styles/hoy.css';

/** 1.1 Instalar: se pide una sola vez el nombre y el de la pareja de entreno. */
export function Instalar() {
  const [me, setMe] = useState('Toti');
  const [partner, setPartner] = useState('Abi');
  return (
    <main className="pantalla instalar">
      <img className="instalar-icono" src={`${import.meta.env.BASE_URL}trazo.svg`} alt="" width={88} height={88} />
      <h1 className="titulo">Tu día,<br />marcado<br />a mano.</h1>
      <p className="instalar-sub">Instalá Trazo en tu inicio para abrirlo como app, a pantalla completa y sin internet.</p>
      <ol className="pasos">
        <li><span className="mono">01</span><span>Tocá <b>Compartir</b> en Safari, o el menú <b>⋮</b> en Chrome.</span></li>
        <li><span className="mono">02</span><span>Elegí <b>Agregar a inicio</b> o <b>Instalar app</b>.</span></li>
        <li><span className="mono">03</span><span>Abrí Trazo desde el ícono y cargá tu nombre y el de Abi. Queda guardado en el teléfono y no te lo vuelve a pedir.</span></li>
      </ol>
      <form
        className="instalar-form"
        onSubmit={(e) => {
          e.preventDefault();
          register(me, partner);
        }}
      >
        <label>
          <span className="etiqueta">Tu nombre</span>
          <input className="campo-texto" value={me} onChange={(e) => setMe(e.target.value)} autoComplete="given-name" />
        </label>
        <label>
          <span className="etiqueta">Entrenás con</span>
          <input className="campo-texto" value={partner} onChange={(e) => setPartner(e.target.value)} />
        </label>
        <button className="btn-principal" type="submit" disabled={!me.trim()}>Empezar el día 0</button>
        <p className="nota">Podés instalarla después desde Ajustes.</p>
      </form>
    </main>
  );
}
