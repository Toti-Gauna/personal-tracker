/**
 * 7.7 · Importar: pegás el JSON que te devuelve Claude, Trazo detecta la rama, valida a mano
 * (con la línea que falla) y muestra qué cambia antes de guardar.
 */
import { useMemo, useState } from 'react';
import { EJEMPLO, QUE_ES, RAMAS_DE_TIPO, queCambia, validarImportacion } from '../data/importar';
import { RAMA_COLOR, RAMAS } from '../data/ramas';
import { fechaCorta } from '../data/plan';
import type { DayLog, Rama } from '../data/types';
import { ir } from '../lib/routes';
import { aplicarImportacion } from '../state/importar';
import { useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { EJEMPLO_BLOQUE, esJsonDeBloque, nombreBloque, queCambiaBloque, validarJsonBloque } from '../data/metas-bloque';
import { importarJsonBloque } from '../state/metas-bloque';

const PASOS = ['Foto del cuaderno', 'Claude corrige', 'Pegás el JSON', 'Trazo reparte'];
const COLORES = { ...RAMA_COLOR, rutina: 'var(--rutina)' };

export function PlanImportar({ day }: { day: DayLog }) {
  const study = useStore((s) => s.study);
  const importaciones = useStore((s) => s.plan.importaciones);
  const [texto, setTexto] = useState('');
  const [elegida, setElegida] = useState<Rama | undefined>();
  const [hecho, setHecho] = useState<string[] | null>(null);
  const deBloque = esJsonDeBloque(texto);
  const vb = useMemo(() => (deBloque ? validarJsonBloque(texto) : null), [texto, deBloque]);
  const metasBloque = useStore((s) => s.plan.metasBloque);
  const v = useMemo(() => (texto.trim() && !deBloque ? validarImportacion(texto, elegida) : null), [texto, elegida, deBloque]);
  const permitidas = v?.ok ? RAMAS_DE_TIPO[v.d.tipo] : RAMAS;
  const rama = v?.ok ? v.d.rama : elegida;
  const cambios = v?.ok ? queCambia(v.d, study, COLORES) : [];
  const lineas = texto.split('\n').length;

  const importar = () => {
    if (!v?.ok) return;
    const r = aplicarImportacion(v.d, day.date, COLORES);
    toast({ title: `Importado a ${v.d.rama}`, sub: r[0] ?? v.d.tipo, color: RAMA_COLOR[v.d.rama] }, false);
    setHecho(r);
    setTexto('');
  };

  if (vb || deBloque) return <ImportarBloque texto={texto} setTexto={setTexto} vb={vb} actual={metasBloque} />;

  return (
    <main className="pantalla plan-rama plan-importar" style={{ ['--c' as string]: rama ? RAMA_COLOR[rama] : 'var(--tinta)' }}>
      <div className="topbar"><a className="volver" href="#/hoy">Hoy</a><span className="mono sub">→ main</span></div>
      <h1 className="titulo">Importar</h1>
      <p className="pp-que">Pegás el JSON que te devuelve Claude. Trazo detecta la rama y te muestra qué cambia antes de guardar. También acepta metas por bloque (<code>"tipo": "metas-bloque"</code>) y los capítulos de un libro (<code>"tipo": "libro"</code>).</p>

      <ol className="pim-pasos">
        {PASOS.map((p, i) => <li key={p} className={i === (hecho ? 3 : 2) ? 'on' : ''}><span className="mono sub">{i + 1}</span>{p}</li>)}
      </ol>

      {hecho ? (
        <section className="pr-card pim-hecho">
          <span className="etiqueta">Listo · repartido</span>
          <ul>{hecho.map((h, i) => <li key={i}>{h}</li>)}</ul>
          <div className="dos-botones">
            <button className="btn-borde" onClick={() => setHecho(null)}>Importar otro</button>
            <button className="btn-principal" onClick={() => ir('metas/mapa')}>Ver el mapa</button>
          </div>
        </section>
      ) : (
        <>
          <div className="etiqueta pp-sec">Rama</div>
          <div className="nm-ramas" role="radiogroup" aria-label="Rama">
            {RAMAS.map((r) => (
              <button key={r} role="radio" aria-checked={rama === r} disabled={!permitidas.includes(r)} style={{ ['--c' as string]: RAMA_COLOR[r] }}
                onClick={() => setElegida(r)}>{r}</button>
            ))}
          </div>
          <p className="sub">{v?.ok ? `${QUE_ES[v.d.tipo]}${v.detectada ? '' : ' El JSON no trae "rama": se usa la elegida.'}` : 'Se detecta del JSON; si no la trae, elegila acá.'}</p>

          <label className="etiqueta pp-sec" htmlFor="pim-json">JSON pegado</label>
          <div className={`pim-json${v && !v.ok ? ' con-error' : ''}`}>
            <div className="pim-num mono" aria-hidden="true">
              {Array.from({ length: Math.max(lineas, 8) }, (_, i) => <span key={i} className={v && !v.ok && v.error.linea === i + 1 ? 'mal' : ''}>{i + 1}</span>)}
            </div>
            <textarea id="pim-json" className="mono" spellCheck={false} value={texto} onChange={(e) => { setTexto(e.target.value); }} placeholder={EJEMPLO} rows={Math.max(lineas, 8)}
              aria-invalid={!!v && !v.ok} aria-describedby="pim-estado" />
          </div>
          <p id="pim-estado" className="mono pim-estado" role="status">
            {!v ? <span className="sub">Esperando el JSON</span>
              : v.ok ? <span style={{ color: 'var(--salud)' }}>✓ formato válido · {v.d.tipo} del {fechaCorta(v.d.fecha)}</span>
              : <span style={{ color: 'var(--rutina)' }}>✕ línea {v.error.linea}: {v.error.mensaje}</span>}
          </p>

          {cambios.length > 0 && (
            <>
              <div className="etiqueta pp-sec">Qué cambia</div>
              <ul className="pim-cambios">
                {cambios.map((c, i) => <li key={i}><i style={{ background: c.color }} aria-hidden="true" /><div><b>{c.titulo}</b><span className="sub">{c.texto}</span></div></li>)}
              </ul>
            </>
          )}

          <button className="btn-principal pim-btn" disabled={!v?.ok} onClick={importar}>{v?.ok ? `Importar a ${v.d.rama}` : 'Importar'}</button>
          <button className="btn-borde pim-btn" onClick={() => (texto ? setTexto('') : ir('hoy'))}>Cancelar</button>
        </>
      )}

      {importaciones.length > 0 && (
        <>
          <div className="etiqueta pp-sec">Importado antes</div>
          <ul className="pim-antes">
            {[...importaciones].reverse().slice(0, 6).map((x, i) => (
              <li key={i}><span className="mono" style={{ color: RAMA_COLOR[x.rama] }}>{x.rama}</span><span>{x.resumen[x.resumen.length - 1]}</span><span className="mono sub">{fechaCorta(x.fecha)}</span></li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

/** Ola 20 · el JSON de metas por bloque o de un libro: validación por línea, qué cambia y guardar. */
function ImportarBloque({ texto, setTexto, vb, actual }: { texto: string; setTexto: (t: string) => void; vb: ReturnType<typeof validarJsonBloque> | null; actual?: Record<string, import('../data/metas-bloque').MetaBloque[]> }) {
  const [hecho, setHecho] = useState<string[] | null>(null);
  const lineas = texto.split('\n').length;
  const d = vb?.ok ? vb.d : null;
  const c = d?.tipo === 'metas-bloque' ? queCambiaBloque(d, actual?.[d.bloque]) : null;
  const importar = () => {
    if (!d) return;
    const r = importarJsonBloque(d);
    toast({ title: d.tipo === 'libro' ? 'Libro cargado' : 'Metas importadas', sub: r[0], color: 'var(--salud)' }, false);
    setHecho(r);
    setTexto('');
  };
  return (
    <main className="pantalla plan-rama plan-importar" style={{ ['--c' as string]: 'var(--salud)' }}>
      <div className="topbar"><a className="volver" href="#/hoy">Hoy</a><span className="mono sub">→ metas por bloque</span></div>
      <h1 className="titulo">Importar</h1>
      <p className="pp-que">Metas de un proyecto, ventana, certificación o libro, o los capítulos de un libro. Trazo valida línea por línea y te muestra qué cambia; lo que ya tildaste se conserva.</p>
      {hecho ? (
        <section className="pr-card pim-hecho">
          <span className="etiqueta">Listo</span>
          <ul>{hecho.map((h, i) => <li key={i}>{h}</li>)}</ul>
          <button className="btn-borde" onClick={() => setHecho(null)}>Importar otro</button>
        </section>
      ) : (
        <>
          <label className="etiqueta pp-sec" htmlFor="pim-json">JSON pegado</label>
          <div className={`pim-json${vb && !vb.ok ? ' con-error' : ''}`}>
            <div className="pim-num mono" aria-hidden="true">
              {Array.from({ length: Math.max(lineas, 8) }, (_, i) => <span key={i} className={vb && !vb.ok && vb.error.linea === i + 1 ? 'mal' : ''}>{i + 1}</span>)}
            </div>
            <textarea id="pim-json" className="mono" spellCheck={false} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={EJEMPLO_BLOQUE} rows={Math.max(lineas, 8)} aria-invalid={!!vb && !vb.ok} aria-describedby="pim-estado" />
          </div>
          <p id="pim-estado" className="mono pim-estado" role="status">
            {!vb ? <span className="sub">Esperando el JSON</span>
              : vb.ok ? <span style={{ color: 'var(--salud)' }}>✓ formato válido · {vb.d.tipo === 'libro' ? `libro ${vb.d.libro.titulo}` : nombreBloque(vb.d.bloque)}</span>
              : <span style={{ color: 'var(--rutina)' }}>✕ línea {vb.error.linea}: {vb.error.mensaje}</span>}
          </p>
          {d && (
            <>
              <div className="etiqueta pp-sec">Qué cambia</div>
              <ul className="pim-cambios">
                {d.tipo === 'libro' ? (
                  <li><i style={{ background: 'var(--handyx)' }} aria-hidden="true" /><div><b>{d.libro.titulo}: {d.libro.capitulos.length} capítulos</b><span className="sub">Queda en Estudio → Libros. Entra en tu día cuando lo empezás.</span></div></li>
                ) : (
                  <>
                    {c!.agrega.length > 0 && <li><i style={{ background: 'var(--salud)' }} aria-hidden="true" /><div><b>Agrega {c!.agrega.length}</b><span className="sub">{c!.agrega.join(' · ')}</span></div></li>}
                    {c!.cambia.length > 0 && <li><i style={{ background: 'var(--economia)' }} aria-hidden="true" /><div><b>Cambia {c!.cambia.length}</b><span className="sub">{c!.cambia.join(' · ')}</span></div></li>}
                    {c!.saca.length > 0 && <li><i style={{ background: 'var(--rutina)' }} aria-hidden="true" /><div><b>Saca {c!.saca.length}</b><span className="sub">{c!.saca.join(' · ')}</span></div></li>}
                    {c!.conserva > 0 && <li><i style={{ background: 'var(--sub)' }} aria-hidden="true" /><div><b>Conserva el avance de {c!.conserva}</b><span className="sub">Lo tildado sigue tildado.</span></div></li>}
                    {!c!.agrega.length && !c!.cambia.length && !c!.saca.length && <li><i style={{ background: 'var(--sub)' }} aria-hidden="true" /><div><b>Sin cambios</b><span className="sub">Ya está igual.</span></div></li>}
                  </>
                )}
              </ul>
            </>
          )}
          <button className="btn-principal pim-btn" disabled={!d} onClick={importar}>{d?.tipo === 'libro' ? 'Cargar el libro' : 'Importar las metas'}</button>
          <button className="btn-borde pim-btn" onClick={() => setTexto('')}>Cancelar</button>
          <p className="sub">Formato: <a className="subrayado" href="https://github.com/Toti-Gauna/personal-tracker/blob/main/docs/metas-por-bloque.md" target="_blank" rel="noreferrer">docs/metas-por-bloque.md</a></p>
        </>
      )}
    </main>
  );
}
