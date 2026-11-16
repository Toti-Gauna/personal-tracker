import { useEffect, type ReactNode } from 'react';
import { useTeclado } from './useTeclado';
import '../styles/ui.css';

/** Hoja inferior para agregar o editar algo sin salir de la pantalla. Se cierra con Esc o tocando afuera. */
export function Hoja({ titulo, kicker, color, onCerrar, children }: {
  titulo: string; kicker?: string; color?: string; onCerrar: () => void; children: ReactNode;
}) {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', on);
    return () => { window.removeEventListener('keydown', on); prev?.focus?.(); };
  }, [onCerrar]);
  const fondo = useTeclado<HTMLDivElement>();
  return (
    <div className="modal-fondo" ref={fondo} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal hoja-form" role="dialog" aria-modal="true" aria-labelledby="hoja-t" style={{ ['--c' as string]: color ?? 'var(--tinta)' }}>
        {kicker && <div className="etiqueta modal-k">{kicker}</div>}
        <h2 id="hoja-t" className="titulo">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
