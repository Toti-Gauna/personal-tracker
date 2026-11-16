import { useState } from 'react';
import { avanceBloque, exportarBloque, metaCumplida } from '../data/metas-bloque';
import { useStore } from '../state/store';
import { agregarMetaBloque, agregarSubBloque, borrarMetaBloque, borrarSubBloque, editarMetaBloque, tildarMetaBloque, tildarSubBloque } from '../state/metas-bloque';
import { Casilla } from './Casilla';
import { Hoja } from './Hoja';
import { HojaSubmeta } from './HojaSubmeta';
import { toast } from './avisos';

/**
 * Ola 20 · las metas propias de un bloque (proyecto, ventana, certificación, libro o unidad): se arman a
 * mano, se tildan, editan y borran, con submetas. Se importan y exportan con JSON.
 */
export function MetasBloque({ bloque, date, titulo = 'Metas del bloque', vacio }: { bloque: string; date: string; titulo?: string; vacio?: string }) {
  const guardadas = useStore((s) => s.plan.metasBloque?.[bloque]);
  const metas = guardadas ?? [];
  const [editar, setEditar] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [subDe, setSubDe] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const av = avanceBloque(metas);
  const exportar = async () => {
    const json = exportarBloque(bloque, metas);
    try {
      await navigator.clipboard.writeText(json);
      toast({ title: 'JSON copiado', sub: `${metas.length} metas de ${bloque}`, color: 'var(--salud)' }, false);
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `metas-${bloque.replace(/:/g, '-')}.json`;
      a.click();
    }
  };
  const meta = subDe ? metas.find((m) => m.id === subDe) : undefined;

  return (
    <section className="mb" aria-label={titulo}>
      <div className="fila-t">
        <span className="etiqueta">{titulo}</span>
        <span className="mono sub">{metas.length ? `${av.hechas} de ${av.total}` : 'sin metas'}</span>
      </div>
      {metas.length > 0 && <span className="mb-barra" aria-hidden="true"><span style={{ width: `${(av.hechas / av.total) * 100}%` }} /></span>}
      {!metas.length && <p className="sub">{vacio ?? 'Todavía no hay metas. Armalas a mano o importalas con un JSON.'}</p>}
      <ul className="mb-lista">
        {metas.map((m) => {
          const ok = metaCumplida(m);
          const conSubs = !!m.subs?.length;
          return (
            <li key={m.id} className={ok ? 'hecha' : ''}>
              <div className="mb-fila">
                {conSubs ? <span className="mb-cont mono" aria-label={`${m.subs!.filter((s) => s.hecho).length} de ${m.subs!.length} submetas`}>{m.subs!.filter((s) => s.hecho).length}/{m.subs!.length}</span>
                  : <Casilla id={`mb-${bloque}-${m.id}`} checked={ok} label={m.texto} onChange={() => tildarMetaBloque(bloque, m.id, date)} />}
                {editar ? (
                  <button className="mb-t mb-editable" onClick={() => setEditando({ id: m.id, texto: m.texto })} aria-label={`Editar ${m.texto}`}>{m.texto}</button>
                ) : conSubs ? <span className={`mb-t trazo${ok ? ' on' : ''}`}>{m.texto}</span> : <label className="mb-t" htmlFor={`mb-${bloque}-${m.id}`}><span className={`trazo${ok ? ' on' : ''}`}>{m.texto}</span></label>}
                {editar && <button className="borrar" onClick={() => borrarMetaBloque(bloque, m.id)} aria-label={`Borrar ${m.texto}`}>Borrar</button>}
              </div>
              {conSubs && (
                <ul className="mb-subs" aria-label={`Submetas de ${m.texto}`}>
                  {m.subs!.map((x) => (
                    <li key={x.id}>
                      <Casilla id={`mb-${bloque}-${x.id}`} checked={!!x.hecho} label={x.t} onChange={() => tildarSubBloque(bloque, m.id, x.id, date)} />
                      <label htmlFor={`mb-${bloque}-${x.id}`}><span className={`trazo${x.hecho ? ' on' : ''}`}>{x.t}</span></label>
                      {editar && <button className="borrar" onClick={() => borrarSubBloque(bloque, m.id, x.id)} aria-label={`Quitar la submeta ${x.t}`}>Quitar</button>}
                    </li>
                  ))}
                </ul>
              )}
              <button className="mb-add-sub" onClick={() => setSubDe(m.id)} aria-label={`Agregar submeta a ${m.texto}`}>+ Submeta</button>
            </li>
          );
        })}
      </ul>
      <button className="mg-add-sub" onClick={() => setNueva(true)}>+ Agregar meta</button>
      <div className="mb-acciones">
        {metas.length > 0 && <button className="subrayado" onClick={() => setEditar((v) => !v)}>{editar ? 'Listo' : 'Editar'}</button>}
        <a className="subrayado" href="#/importar">Importar JSON</a>
        {metas.length > 0 && <button className="subrayado" onClick={exportar}>Exportar JSON</button>}
      </div>

      {nueva && (
        <HojaSubmeta kicker={titulo} onAgregar={(t) => agregarMetaBloque(bloque, t)} onCerrar={() => setNueva(false)} tituloHoja="Nueva meta" />
      )}
      {meta && <HojaSubmeta kicker={meta.texto} onAgregar={(t) => agregarSubBloque(bloque, meta.id, t)} onCerrar={() => setSubDe(null)} />}
      {editando && (
        <Hoja titulo="Editar meta" kicker={titulo} onCerrar={() => setEditando(null)}>
          <form onSubmit={(e) => { e.preventDefault(); editarMetaBloque(bloque, editando.id, editando.texto); setEditando(null); }}>
            <input className="campo-texto" autoFocus value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} aria-label="Texto de la meta" />
            <button className="btn-principal" type="submit" style={{ marginTop: 14 }} disabled={!editando.texto.trim()}>Guardar</button>
          </form>
        </Hoja>
      )}
    </section>
  );
}
