import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  linea: string;
  ola: string;
  children?: ReactNode;
}

/** Encabezado mínimo (título y una línea) + aviso de qué ola trae el contenido. */
export function PantallaPendiente({ titulo, linea, ola, children }: Props) {
  return (
    <main className="pantalla">
      <header>
        <h1 className="titulo">{titulo}</h1>
        <p>{linea}</p>
      </header>
      <div className="pendiente"><strong>Llega en la {ola}.</strong> Esta pantalla es parte de los cimientos.</div>
      {children}
    </main>
  );
}
