import { useState } from 'react';
import { applyTheme, getTheme, type Theme } from '../lib/theme';
import { PantallaPendiente } from './Seccion';

export function Perfil() {
  const [tema, setTema] = useState<Theme>(getTheme);
  const cambiar = () => {
    const n: Theme = tema === 'dark' ? 'light' : 'dark';
    applyTheme(n);
    setTema(n);
  };
  return (
    <PantallaPendiente titulo="Perfil" linea="Nivel, rachas, sellos e historial." ola="ola 6">
      <button className="tema" onClick={cambiar} aria-pressed={tema === 'light'}>
        Tema: {tema === 'dark' ? 'oscuro' : 'claro'} · cambiar
      </button>
    </PantallaPendiente>
  );
}
