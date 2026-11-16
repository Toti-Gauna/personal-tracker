import { EVIDENCIAS, evidenciaCompleta } from '../data/plan-state';
import { bloqueExtPorId } from '../data/plan-extendido';
import { RAMA_COLOR } from '../data/ramas';
import { tildarSalida, toggleEvidencia } from '../state/plan';
import { avanceSalida, salidaDe } from '../data/plan-vistas';
import { useStore } from '../state/store';
import { Casilla } from './Casilla';

/** Ficha del plan extendido (ola 16c): lo que hace distinto a un proyecto, una certificación o una ventana. */
export function FichaBloque({ id }: { id: string }) {
  const b = bloqueExtPorId(id);
  if (!b) return null;
  const f = b.ficha;
  const filas: [string, string | undefined][] = f ? [
    ['Rubro', f.rubro], ['Feature diferencial', f.feature], ['Tecnología nueva', f.tecnologiaNueva], ['Visual', f.visual],
    ['Pieza matemática hecha a mano', f.pieza], ['Referencia externa', f.referencia], ['Quién lo valida', f.validador], ['Perfil al cerrar', f.perfil],
  ] : [];
  return (
    <>
      {f && (
        <section className="pp-ficha">
          <div className="etiqueta pp-sec">Ficha</div>
          <dl>{filas.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {b.alternativa && <p className="sub">Reemplazo propuesto, a confirmar: <b>{b.alternativa}</b>.</p>}
          {b.recortable && <p className="sub">Recortable: si falta tiempo, se recorta este proyecto.</p>}
        </section>
      )}
      {b.cert && (
        <section className="pp-ficha">
          <div className="etiqueta pp-sec">Certificación</div>
          <dl>
            <div><dt>Costo</dt><dd>{b.cert.costo ?? 'Sin verificar'}{b.cert.costo && !b.cert.verificado ? ' · sin verificar' : b.cert.verificado ? ' · verificado el 15 nov 2026' : ''}</dd></div>
            {b.cert.requiere && <div><dt>Requiere</dt><dd>{b.cert.requiere}</dd></div>}
            {b.cert.notas && <div><dt>Notas</dt><dd>{b.cert.notas}</dd></div>}
          </dl>
          <p className="sub">Los precios y versiones cambian: reconfirmá al reservar el examen.</p>
        </section>
      )}
      {b.mate && (
        <section className="pp-ficha">
          <div className="etiqueta pp-sec">Matemática</div>
          <dl>
            <div><dt>Libro principal</dt><dd>{b.mate.principal.join(' · ')}</dd></div>
            <div><dt>Habilita</dt><dd>{b.mate.habilita.join(', ')}</dd></div>
            <div><dt>Perfil</dt><dd>{b.mate.perfil}</dd></div>
          </dl>
          <a className="fila-link" href={`#/estudio/mate/${b.id}`}>Refuerzo según el tipo de error <span aria-hidden="true">→</span></a>
        </section>
      )}
    </>
  );
}

/** Puerta de evidencia: sin las tres, el proyecto no cierra. */
export function EvidenciaProyecto({ id }: { id: string }) {
  const p = useStore((s) => s.plan.proyectos[id]);
  const n = EVIDENCIAS.filter(([k]) => p?.evidencia?.[k]).length;
  return (
    <section>
      <div className="fila-t pp-sec"><span className="etiqueta">Puerta de evidencia</span><span className="mono sub">{n} de 3{evidenciaCompleta(p) ? ' · lista' : ''}</span></div>
      <ul className="pp-capas">
        {EVIDENCIAS.map(([k, nombre, texto]) => (
          <li key={k}>
            <Casilla checked={!!p?.evidencia?.[k]} label={`${nombre}: marcar`} onChange={() => toggleEvidencia(id, k)} />
            <div>
              <b className={p?.evidencia?.[k] ? 'resaltado' : ''} style={{ ['--c' as string]: RAMA_COLOR.programacion }}>{nombre}</b>
              <p className="sub">{texto}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="sub">Sin estas tres, además de tests y seguridad, el proyecto no cierra.</p>
    </section>
  );
}

/**
 * Ola 20 · nivel de salida de una ventana: lo que tenés que poder hacer al cerrarla, como lista que se
 * tilda. Es el chequeo antes del test de la puerta; el test (85 %) sigue siendo el que aprueba.
 */
export function NivelSalida({ id }: { id: string }) {
  const plan = useStore((s) => s.plan);
  const crit = salidaDe(id);
  if (!crit.length) return null;
  const av = avanceSalida(plan, id);
  const hechos = new Set(plan.salida?.[id] ?? []);
  const examen = plan.proyectos[id]?.examen;
  return (
    <section className="salida" aria-label={`Nivel de salida de ${id}`}>
      <div className="fila-t pp-sec"><span className="etiqueta">Nivel de salida · {id}</span><span className="mono sub">{av.hechos} de {av.total}</span></div>
      <ul className="pp-capas">
        {crit.map((c, i) => (
          <li key={i}>
            <Casilla checked={hechos.has(i)} label={c} onChange={() => tildarSalida(id, i)} />
            <div><b className={hechos.has(i) ? 'resaltado' : ''} style={{ ['--c' as string]: 'var(--economia)' }}>{c}</b></div>
          </li>
        ))}
      </ul>
      <p className="sub">
        {av.completo ? 'Nivel de salida completo: listo para el test de la puerta.'
          : examen && examen.puntaje >= 85 ? `Puerta aprobada por el test (${examen.puntaje} %), pero te ${av.total - av.hechos === 1 ? 'falta 1 criterio' : `faltan ${av.total - av.hechos} criterios`} de salida: repasalos antes del proyecto.`
          : 'Tildá cada criterio cuando lo puedas hacer sin ayuda; con todos, hacé el test de la puerta (85 %).'}
      </p>
    </section>
  );
}
