/**
 * Trazo 2.0 · las metas propias de un bloque (proyecto, ventana, certificación, libro o unidad): se arman a mano, se tildan,
 * tienen submetas, se editan y se borran, y se exportan con JSON (se importan desde Importar JSON). Mismos datos y mismas
 * funciones que `ui/MetasBloque` de la 1.0.
 */
import { useState } from 'react';
import { avanceBloque, exportarBloque, metaCumplida, type MetaBloque } from '../../data/metas-bloque';
import { agregarMetaBloque, agregarSubBloque, borrarMetaBloque, borrarSubBloque, editarMetaBloque, tildarMetaBloque, tildarSubBloque } from '../../state/metas-bloque';
import { useStore } from '../../state/store';
import { aviso, confirmar } from '../kit/capas';
import { Boton, Casilla, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { cuantos } from '../reglas';

export function MetasDelBloque({ bloque, hoy, titulo = 'Metas del bloque' }: { bloque: string; hoy: string; titulo?: string }) {
  const metas = useStore((s) => s.plan.metasBloque?.[bloque]) ?? [];
  const av = avanceBloque(metas);
  const [nueva, setNueva] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const meta = metas.find((m) => m.id === elegida);
  const exportar = async () => {
    const json = exportarBloque(bloque, metas);
    try {
      await navigator.clipboard.writeText(json);
      aviso({ titulo: 'JSON copiado', sub: `${cuantos(metas.length, 'meta', 'metas')} de ${bloque}`, tono: 'hecho' });
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `metas-${bloque.replace(/:/g, '-')}.json`;
      a.click();
    }
  };
  return (
    <Grupo titulo={titulo} extremo={metas.length ? <span className="t-rotulo">{av.hechas} de {av.total}</span> : undefined}>
      <div className="capa-1 pt-check">
        {metas.map((m) => <MetaFila key={m.id} m={m} bloque={bloque} hoy={hoy} onOpciones={() => setElegida(m.id)} />)}
        <Fila icono="mas" titulo={metas.length ? 'Agregar una meta' : 'Agregar la primera meta'} onClick={() => setNueva(true)} />
      </div>
      <div className="pt-acciones">
        <Boton tamano="s" variante="fantasma" icono="importar" href="#/importar">Importar JSON</Boton>
        {metas.length > 0 && <Boton tamano="s" variante="fantasma" icono="exportar" onClick={exportar}>Exportar JSON</Boton>}
      </div>
      <HojaNueva abierta={nueva} onCerrar={() => setNueva(false)} titulo="Nueva meta" etiqueta="Qué querés lograr" onAgregar={(t) => agregarMetaBloque(bloque, t)} />
      <HojaMeta bloque={bloque} hoy={hoy} m={meta ?? null} onCerrar={() => setElegida(null)} />
    </Grupo>
  );
}

function MetaFila({ m, bloque, hoy, onOpciones }: { m: MetaBloque; bloque: string; hoy: string; onOpciones: () => void }) {
  const subs = m.subs ?? [];
  const hechas = subs.filter((s) => s.hecho).length;
  return (
    <div className="pt-meta">
      <div className="pt-meta-fila">
        {subs.length
          ? <span className={`pt-meta-titulo t-cuerpo${metaCumplida(m) ? ' hecha' : ''}`}>{m.texto}<small className="t-dato"> {hechas}/{subs.length}</small></span>
          : <Casilla marcada={metaCumplida(m)} etiqueta={m.texto} onCambio={() => tildarMetaBloque(bloque, m.id, hoy)} />}
        <Boton soloIcono tamano="s" variante="fantasma" icono="opciones" etiqueta={`Opciones de ${m.texto}`} onClick={onOpciones} />
      </div>
      {subs.length > 0 && (
        <div className="pt-subs">
          {subs.map((s) => <Casilla key={s.id} marcada={!!s.hecho} etiqueta={s.t} onCambio={() => tildarSubBloque(bloque, m.id, s.id, hoy)} />)}
        </div>
      )}
    </div>
  );
}

/** Una hoja para escribir un texto y agregarlo (varias veces seguidas). */
function HojaNueva({ abierta, onCerrar, titulo, etiqueta, onAgregar }: { abierta: boolean; onCerrar: () => void; titulo: string; etiqueta: string; onAgregar: (t: string) => void }) {
  const [t, setT] = useState('');
  const agregar = () => { if (!t.trim()) return false; onAgregar(t.trim()); setT(''); return true; };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={titulo} pie={<><Boton variante="primario" deshabilitado={!t.trim()} onClick={agregar}>Agregar y otra</Boton><Boton variante="secundario" onClick={() => { agregar(); onCerrar(); }}>{t.trim() ? 'Agregar y cerrar' : 'Listo'}</Boton></>}>
      <div className="pt-campo-hoja"><CampoTexto etiqueta={etiqueta} valor={t} onCambio={setT} /></div>
    </Hoja>
  );
}

function HojaMeta({ bloque, hoy, m, onCerrar }: { bloque: string; hoy: string; m: MetaBloque | null; onCerrar: () => void }) {
  const [ultima, setUltima] = useState<MetaBloque | null>(null);
  if (m && m.id !== ultima?.id) setUltima(m);
  const x = m ?? ultima;
  const [texto, setTexto] = useState(x?.texto ?? '');
  const [sub, setSub] = useState('');
  const [fijado, setFijado] = useState(x?.id);
  if (x && x.id !== fijado) { setFijado(x.id); setTexto(x.texto); }
  if (!x) return null;
  const vivo = m ?? x;
  return (
    <Hoja abierta={!!m} onCerrar={onCerrar} titulo="Meta">
      <div className="pt-campo-hoja">
        <CampoTexto etiqueta="Texto de la meta" valor={texto} onCambio={setTexto} />
        <Boton variante="secundario" deshabilitado={!texto.trim() || texto.trim() === vivo.texto} onClick={() => editarMetaBloque(bloque, vivo.id, texto)}>Guardar el texto</Boton>
        {(vivo.subs ?? []).length > 0 && (
          <div className="capa-1 pt-check">
            {vivo.subs!.map((s) => (
              <div key={s.id} className="pt-meta-fila">
                <Casilla marcada={!!s.hecho} etiqueta={s.t} onCambio={() => tildarSubBloque(bloque, vivo.id, s.id, hoy)} />
                <Boton soloIcono tamano="s" variante="fantasma" icono="borrar" etiqueta={`Quitar la submeta ${s.t}`} onClick={() => borrarSubBloque(bloque, vivo.id, s.id)} />
              </div>
            ))}
          </div>
        )}
        <CampoTexto etiqueta="Nueva submeta" valor={sub} onCambio={setSub} />
        <Boton variante="secundario" icono="mas" deshabilitado={!sub.trim()} onClick={() => { agregarSubBloque(bloque, vivo.id, sub.trim()); setSub(''); }}>Agregar submeta</Boton>
        <Boton variante="peligro" icono="borrar" onClick={async () => { if (await confirmar({ titulo: '¿Borrar la meta?', texto: `"${vivo.texto}" y sus submetas se borran.`, accion: 'Borrar', peligro: true })) { borrarMetaBloque(bloque, vivo.id); onCerrar(); } }}>Borrar la meta</Boton>
      </div>
    </Hoja>
  );
}
