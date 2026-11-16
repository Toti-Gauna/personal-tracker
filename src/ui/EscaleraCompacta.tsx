import { Plegable } from './Plegable';

export interface ItemEscalera {
  id: string;
  href: string;
  titulo: string;
  /** Una línea chica: fechas, semanas, avance. */
  sub?: string;
  estado: 'hecho' | 'actual' | 'proximo';
  /** Es el tramo en el que estás hoy. */
  aqui?: boolean;
}

export interface GrupoEscalera {
  id: string;
  titulo: string;
  resumen: string;
  abierto: boolean;
  items: ItemEscalera[];
}

/**
 * Ola 22 · la escalera de un roadmap en filas de una línea, por etapa, con solo la etapa en curso abierta.
 * Es lo que deja a los roadmaps de matemática, programación e idiomas en unas 3 pantallas de scroll.
 */
export function EscaleraCompacta({ grupos, color, etiqueta }: { grupos: GrupoEscalera[]; color: string; etiqueta: string }) {
  return (
    <div className="esc" style={{ ['--c' as string]: color }} role="group" aria-label={etiqueta}>
      {grupos.map((g) => (
        <Plegable key={g.id} id={g.id} titulo={g.titulo} resumen={g.resumen} abierto={g.abierto || g.items.some((x) => x.aqui)}>
          <ol className="esc-lista">
            {g.items.map((x) => (
              <li key={x.id} className={`${x.estado}${x.aqui ? ' aqui' : ''}`}>
                <a href={x.href} aria-current={x.aqui ? 'step' : undefined}>
                  <span className="esc-nodo" aria-hidden="true">{x.estado === 'hecho' ? '✓' : ''}</span>
                  <span className="esc-t"><b>{x.titulo}</b>{x.sub && <small className="mono">{x.sub}{x.aqui ? ' · estás acá' : ''}</small>}</span>
                  <span aria-hidden="true" className="esc-ir">→</span>
                </a>
              </li>
            ))}
          </ol>
        </Plegable>
      ))}
    </div>
  );
}
