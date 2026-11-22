/**
 * v12.2 · en la revisión del domingo: el uso de Claude (lo cargás vos) contra el umbral, las pausas sugeridas (primero lo comercial,
 * después lo secundario; nunca sin confirmar), el tiempo de revisión de lo de fondo contra la meta, "elegí la próxima secundaria"
 * desde el 29 ago 2027 y "elegí la marca" de los slots a definir que arrancan en 14 días.
 */
import { useState } from 'react';
import { fondoEn, metaRevisionSemana, revisionSemana, sugerenciaPausas, type EntradaRevision } from '../data/fondo';
import { addDays } from '../data/time';
import { V122 } from '../data/v12-2';
import { anotarRevision, borrarRevision, pausarItem, setItem, setUmbralClaude, setUsoClaude } from '../state/fondo';
import { useStore } from '../state/store';
import { tramoActivo } from '../data/plan';

const h1 = (m: number) => String(Math.round((m / 60) * 10) / 10).replace('.', ',');

export function RevisionFondo({ hoy, lunes }: { hoy: string; lunes: string }) {
  const plan = useStore((s) => s.plan);
  const uso = plan.usoClaude?.[lunes];
  const umbral = plan.umbralClaude ?? 85;
  const [usoTxt, setUsoTxt] = useState(uso != null ? String(uso) : '');
  const activo = fondoEn(hoy);
  const sug = sugerenciaPausas(uso, umbral, activo).filter((s) => !plan.fondo?.[s.id]?.pausado);
  const pausados = Object.entries(plan.fondo ?? {}).filter(([, x]) => x.pausado);
  const rev = revisionSemana(plan.revisionFondo, lunes);
  const meta = metaRevisionSemana(lunes);
  const items = [...activo.secundaria.map((s) => ({ id: s.app.id, nombre: `${s.app.nombre} v${s.version}` })), ...(activo.comercial ? [{ id: activo.comercial.id, nombre: `#${activo.comercial.n} ${activo.comercial.marca ?? plan.fondo?.[activo.comercial.id]?.marca ?? 'a definir'}` }] : [])];
  const [f, setF] = useState<{ item: string; tipo: EntradaRevision['tipo']; inicio: string; min: string }>({ item: items[0]?.id ?? '', tipo: 'walkthrough', inicio: '', min: '60' });
  const [aviso, setAviso] = useState<string | null>(null);
  const anotar = () => {
    const min = Number(f.min);
    if (!f.item || !(min > 0)) return;
    const tipoBloque = tramoActivo(hoy).tipo;
    setAviso(anotarRevision({ fecha: hoy, item: f.item, tipo: f.tipo, min, ...(f.inicio ? { inicio: f.inicio } : {}) }, tipoBloque));
  };
  const elegir = hoy >= '2027-08-29' && hoy <= '2027-09-19';
  const marcas = V122.comerciales.filter((c) => !c.marca && c.inicio > hoy && addDays(c.inicio, -14) <= hoy);
  const semana = (plan.revisionFondo ?? []).filter((x) => x.fecha >= lunes && x.fecha <= addDays(lunes, 6));
  return (
    <section aria-labelledby="rev-fondo" className="pd-fase">
      <span className="etiqueta" id="rev-fondo">De fondo y Claude</span>
      <div className="ru-horas">
        <label><span className="sub">Uso de Claude esta semana (%)</span><input className="campo-texto mono" inputMode="decimal" aria-label="Uso de Claude esta semana" value={usoTxt} onChange={(e) => setUsoTxt(e.target.value)} onBlur={() => setUsoClaude(lunes, usoTxt.trim() ? Number(usoTxt.replace(',', '.')) : null)} /></label>
        <label><span className="sub">Umbral (%)</span><input className="campo-texto mono" inputMode="decimal" aria-label="Umbral de uso de Claude" defaultValue={umbral} onBlur={(e) => { const n = Number(e.target.value); if (n > 0 && n <= 100) setUmbralClaude(n); }} /></label>
      </div>
      {sug.length > 0 && (
        <div className="pd-sug" role="alert">
          <b>Claude al {uso} % (umbral {umbral} %): lo principal va primero.</b>
          <p className="sub">Sugerencia: pausar primero lo comercial y, si hace falta, lo secundario. Nada se pausa sin que lo confirmes.</p>
          {sug.map((s) => <button key={s.id} className="btn-borde" onClick={() => pausarItem(s.id, hoy)}>Pausar {s.nombre} ({s.pista})</button>)}
        </div>
      )}
      {pausados.length > 0 && <p className="sub">En pausa: {pausados.map(([id]) => <button key={id} className="subrayado" onClick={() => pausarItem(id, null)}>reanudar {id}</button>)}</p>}
      <p className="mono">Revisión de fondo: {h1(rev.min)} h esta semana (walkthrough {h1(rev.walkthrough)} de {h1(meta.walkthroughMin)} h; diseño {h1(rev.diseno)} h; comercial {h1(rev.comercial)} h). No suma a las 72 h de foco.</p>
      {items.length > 0 && (
        <div className="cp-mocks" aria-label="Anotar tiempo de revisión">
          <select className="select-plano" aria-label="Ítem de fondo" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })}>{items.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
          <select className="select-plano" aria-label="Tipo de revisión" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as EntradaRevision['tipo'] })}>
            <option value="walkthrough">walkthrough</option><option value="diseño">diseño</option><option value="comercial">comercial</option><option value="otro">otro</option>
          </select>
          <input className="campo-texto mono" type="time" aria-label="Desde" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
          <input className="campo-texto mono" inputMode="numeric" aria-label="Minutos" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} />
          <button className="btn-borde" onClick={anotar}>Anotar</button>
        </div>
      )}
      {aviso && <p className="pd-aviso" role="alert">{aviso}</p>}
      {semana.length > 0 && <ul className="cp-lista">{semana.map((x) => <li key={x.id}>{x.fecha.slice(5)} · {x.item} · {x.tipo} · {x.min} min{x.inicio ? ` desde ${x.inicio}` : ''} · <button className="subrayado" onClick={() => borrarRevision(x.id)}>borrar</button></li>)}</ul>}
      {elegir && (
        <label className="ru-campo"><span className="sub">Elegí la próxima app secundaria (desde el 7 sep 2027 la pista queda libre)</span>
          <select className="select-plano" aria-label="Próxima secundaria" value={plan.fondo?.['secundaria-siguiente']?.marca ?? ''} onChange={(e) => setItem('secundaria-siguiente', { marca: e.target.value || undefined })}>
            <option value="">—</option>{V122.backlog.map((b) => <option key={b.nombre} value={b.nombre}>{b.nombre}{b.destacado ? ' ⭐' : ''}</option>)}
          </select>
        </label>
      )}
      {marcas.map((c) => (
        <label key={c.id} className="ru-campo"><span className="sub">Elegí la marca del slot #{c.n} (arranca el {c.inicio}; {c.ventana})</span>
          <input className="campo-texto" aria-label={`Marca del slot ${c.n}`} defaultValue={plan.fondo?.[c.id]?.marca ?? ''} onBlur={(e) => setItem(c.id, { marca: e.target.value.trim() || undefined })} />
        </label>
      ))}
    </section>
  );
}
