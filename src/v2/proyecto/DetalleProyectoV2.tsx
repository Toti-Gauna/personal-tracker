/**
 * Trazo 2.0 · el detalle de un proyecto principal (v12.2), con los campos en castellano tal cual están en el plan: horas, alcance,
 * puesto, problema, valor… los papers y las versiones. Se abre en una hoja desde la página del bloque y desde De fondo.
 */
import { PLAN_EXT } from '../../data/plan-extendido';
import { detalleDe, type DetalleProyecto as D } from '../../data/v12-2';
import './proyecto.css';

const CAMPOS: [keyof D, string][] = [
  ['puesto', 'Puesto'], ['descripcion', 'Descripción'], ['problema', 'Problema'], ['valor', 'Valor'], ['diferencial', 'Diferencial'],
  ['herramientas', 'Herramientas'], ['capaFisica', 'Capa física'], ['ahorro', 'Ahorro a medir'], ['impacto', 'Impacto a medir'], ['voz', 'Voz'],
  ['escala', 'Escala'], ['stack', 'Stack'], ['publicacion', 'Publicación'], ['cambios', 'Cambios v12.1'], ['pesoEntrevistas', 'Peso en entrevistas'],
];

export function DetalleProyectoV2({ id }: { id: string }) {
  const d = detalleDe(id);
  if (!d) return null;
  const papers = PLAN_EXT.bloques.find((b) => b.id === id)?.papers ?? [];
  return (
    <section className="pt-detalle" aria-label="Detalle del proyecto">
      {(d.horas != null || d.notaAlcance) && (
        <p className="t-nota">
          {d.horas != null && <span className="t-dato">{String(d.horas).replace('.', ',')} h</span>}
          {d.horasLim ? ` · ${d.horasLim} h si se repite el límite semanal de Claude` : ''}
          {d.notaAlcance ? `${d.horas != null ? ' · ' : ''}Alcance: ${d.notaAlcance}` : ''}
        </p>
      )}
      <dl className="pt-detalle-campos">
        {CAMPOS.filter(([k]) => d[k]).map(([k, n]) => <div key={k}><dt className="t-rotulo">{n}</dt><dd className="t-cuerpo">{d[k] as string}</dd></div>)}
        {papers.length > 0 && <div><dt className="t-rotulo">Papers</dt><dd className="t-cuerpo">{papers.map((p) => `${p.nombre}${p.opcional ? ' (opcional)' : ''}`).join(' · ')}</dd></div>}
      </dl>
      {d.versiones.length > 0 && (
        <div className="pt-detalle-versiones">
          <h3 className="t-rotulo">Versiones</h3>
          <ul>
            {d.versiones.map((v) => (
              <li key={v.id} className="t-cuerpo">
                <b className="t-dato">v{v.id}</b> <span className="t-nota">{v.base ? 'base ya hecha' : `${v.inicio} → ${v.fin}${v.deadline ? ` · límite ${v.deadline}` : ''}`}</span>
                <br />{v.linea}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
