import { useState, type ReactNode } from 'react';
import '../styles/plegable.css';

const KEY = 'trazo.plegables';

function leer(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>; } catch { return {}; }
}

/** Recuerda si dejaste abierta o cerrada una sección (en este teléfono); sin `id` solo vive mientras la pantalla está abierta. */
export function useAbierto(id: string | undefined, porDefecto: boolean) {
  const [abierto, setAbierto] = useState(() => (id ? leer()[id] ?? porDefecto : porDefecto));
  const cambiar = (v: boolean) => {
    setAbierto(v);
    if (!id) return;
    try { localStorage.setItem(KEY, JSON.stringify({ ...leer(), [id]: v })); } catch { /* sin storage */ }
  };
  return [abierto, cambiar] as const;
}

/**
 * Ola 22 · una sección que se pliega: el título y un resumen en una fila de 56 px, y el contenido
 * debajo. Es lo que mantiene cada pantalla en unas 3 pantallas de scroll. Recuerda lo que abriste.
 */
export function Plegable({ id, titulo, resumen, kicker, color, abierto = false, children, className = '' }: {
  id?: string; titulo: ReactNode; resumen?: ReactNode; kicker?: ReactNode; color?: string; abierto?: boolean; children: ReactNode; className?: string;
}) {
  const [open, setOpen] = useAbierto(id, abierto);
  return (
    <details className={`plegable ${className}`} open={open} onToggle={(e) => { const v = (e.currentTarget as HTMLDetailsElement).open; if (v !== open) setOpen(v); }} style={color ? { ['--c' as string]: color } : undefined}>
      <summary>
        <span className="pleg-t">
          {kicker && <small className="mono pleg-k">{kicker}</small>}
          <b>{titulo}</b>
        </span>
        {resumen != null && <span className="mono sub pleg-r">{resumen}</span>}
        <i className="pleg-flecha" aria-hidden="true" />
      </summary>
      <div className="pleg-cuerpo">{children}</div>
    </details>
  );
}
