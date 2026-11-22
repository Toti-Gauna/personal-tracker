/** v12.2 · el detalle de un proyecto principal, con los campos en castellano tal cual están en el plan. */
import { PLAN_EXT } from '../data/plan-extendido';
import { detalleDe, type DetalleProyecto as D } from '../data/v12-2';

const CAMPOS: [keyof D, string][] = [
  ['puesto', 'Puesto'], ['descripcion', 'Descripción'], ['problema', 'Problema'], ['valor', 'Valor'], ['diferencial', 'Diferencial'],
  ['herramientas', 'Herramientas'], ['capaFisica', 'Capa física'], ['ahorro', 'Ahorro a medir'], ['impacto', 'Impacto a medir'], ['voz', 'Voz'],
  ['escala', 'Escala'], ['stack', 'Stack'], ['publicacion', 'Publicación'], ['cambios', 'Cambios v12.1'], ['pesoEntrevistas', 'Peso en entrevistas'],
];

export function DetalleProyecto({ id }: { id: string }) {
  const d = detalleDe(id);
  if (!d) return null;
  const papers = PLAN_EXT.bloques.find((b) => b.id === id)?.papers ?? [];
  return (
    <section className="pd-fase pp-ficha" aria-label="Detalle del proyecto">
      {d.horas != null && <p className="sub mono">{String(d.horas).replace('.', ',')} h{d.horasLim ? ` (lím ${d.horasLim} h si pego seguido el límite semanal de Claude)` : ''}</p>}
      {d.notaAlcance && <p className="sub">Alcance: {d.notaAlcance}</p>}
      <dl>
        {CAMPOS.filter(([k]) => d[k]).map(([k, n]) => <div key={k}><dt>{n}</dt><dd>{d[k] as string}</dd></div>)}
        {papers.length > 0 && <div><dt>Papers</dt><dd>{papers.map((p) => `${p.nombre}${p.opcional ? ' (opcional)' : ''}`).join(' · ')}</dd></div>}
      </dl>
      {d.versiones.length > 0 && (
        <>
          <span className="etiqueta">Versiones</span>
          <ul className="cp-lista">{d.versiones.map((v) => <li key={v.id}><b className="mono">v{v.id}</b> {v.base ? '· base ya hecha' : `· ${v.inicio} → ${v.fin}${v.deadline ? ` (límite ${v.deadline})` : ''}`}: {v.linea}</li>)}</ul>
        </>
      )}
    </section>
  );
}
