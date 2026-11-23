/**
 * Trazo 2.0 · Importar (#/importar): pegás el JSON que te devuelve Claude, Trazo detecta la rama, lo valida (con la línea que falla) y
 * muestra qué cambia ANTES de guardar. También acepta las metas por bloque ("metas-bloque") y los capítulos de un libro ("libro").
 * La validación y lo que se escribe son los de la 1.0.
 */
import { useMemo, useState } from 'react';
import { EJEMPLO, QUE_ES, RAMAS_DE_TIPO, queCambia, validarImportacion } from '../../data/importar';
import { EJEMPLO_BLOQUE, esJsonDeBloque, nombreBloque, queCambiaBloque, validarJsonBloque } from '../../data/metas-bloque';
import { fechaCorta } from '../../data/plan';
import { RAMAS, RAMA_COLOR, RAMA_NOMBRE } from '../../data/ramas';
import type { Rama } from '../../data/types';
import { ir } from '../../lib/routes';
import { aplicarImportacion } from '../../state/importar';
import { importarJsonBloque } from '../../state/metas-bloque';
import { useStore } from '../../state/store';
import { colorV2 } from '../hoy/datos';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import '../proyecto/proyecto.css';
import './ajustes.css';

/** Los colores de rama que usa la 1.0 al escribir (no cambian: son los que quedan guardados). */
const COLORES = { ...RAMA_COLOR, rutina: 'var(--rutina)' };

interface Cambio { color: string; titulo: string; texto: string }
type ErrorJson = { linea: number; mensaje: string };

const INFO = (
  <>
    <p className="t-cuerpo-l">Pegás el JSON que te devuelve Claude y Trazo lo reparte.</p>
    <ol className="ax-pasos t-cuerpo">
      <li>Sacás una foto del cuaderno.</li>
      <li>Claude la corrige y te devuelve un JSON.</li>
      <li>Lo pegás acá: Trazo detecta la rama y lo valida línea por línea.</li>
      <li>Revisás qué cambia y lo guardás.</li>
    </ol>
    <p className="t-cuerpo">También acepta metas por bloque (<code>"tipo": "metas-bloque"</code>) y los capítulos de un libro (<code>"tipo": "libro"</code>). Lo que ya tildaste se conserva.</p>
    <p className="t-cuerpo"><a className="pt-enlace" href="https://github.com/Toti-Gauna/personal-tracker/blob/main/docs/metas-por-bloque.md" target="_blank" rel="noreferrer">Formato de las metas por bloque</a></p>
  </>
);

/** El cuadro del JSON: números de línea al costado (la que falla va marcada) y el texto sin cortes de línea. */
function CuadroJson({ texto, setTexto, error, ejemplo }: { texto: string; setTexto: (t: string) => void; error?: ErrorJson; ejemplo: string }) {
  const lineas = texto.split('\n').length;
  const filas = Math.max(lineas, 8);
  return (
    <div className={`ax-json${error ? ' ax-con-error' : ''}`}>
      <div className="ax-json-num t-dato" aria-hidden="true">
        {Array.from({ length: filas }, (_, i) => <span key={i} className={error?.linea === i + 1 ? 'ax-mal' : ''}>{i + 1}</span>)}
      </div>
      <textarea id="ax-json" className="t-dato" aria-label="JSON pegado" spellCheck={false} wrap="off" value={texto} rows={filas} placeholder={ejemplo}
        onChange={(e) => setTexto(e.target.value)} aria-invalid={!!error} aria-describedby="ax-estado" />
    </div>
  );
}

function Estado({ ok, texto }: { ok: boolean | null; texto: string }) {
  return (
    <p id="ax-estado" className={`ax-estado t-dato${ok === false ? ' ax-mal' : ''}`} role="status">
      {ok === null ? null : <Icono nombre={ok ? 'tilde' : 'alerta'} lado={16} />}{texto}
    </p>
  );
}

function Cambios({ cambios }: { cambios: Cambio[] }) {
  if (!cambios.length) return null;
  return (
    <Grupo titulo="Qué cambia">
      <ul className="capa-1 ax-cambios">
        {cambios.map((c, i) => <li key={i}><i className="area-punto" style={{ ['--area' as string]: colorV2(c.color) }} /><div><b>{c.titulo}</b><span className="t-nota">{c.texto}</span></div></li>)}
      </ul>
    </Grupo>
  );
}

export default function ImportarV2({ day }: PropsV2) {
  const study = useStore((s) => s.study);
  const importaciones = useStore((s) => s.plan.importaciones);
  const metasBloque = useStore((s) => s.plan.metasBloque);
  const [texto, setTexto] = useState('');
  const [elegida, setElegida] = useState<Rama | undefined>();
  const [hecho, setHecho] = useState<{ lineas: string[]; mapa: boolean } | null>(null);

  const deBloque = esJsonDeBloque(texto);
  const vb = useMemo(() => (deBloque ? validarJsonBloque(texto) : null), [texto, deBloque]);
  const v = useMemo(() => (texto.trim() && !deBloque ? validarImportacion(texto, elegida) : null), [texto, elegida, deBloque]);
  const d = vb?.ok ? vb.d : null;
  const permitidas = v?.ok ? RAMAS_DE_TIPO[v.d.tipo] : RAMAS;
  const rama = v?.ok ? v.d.rama : elegida;
  const cambiosRama: Cambio[] = v?.ok ? queCambia(v.d, study, COLORES) : [];
  const cb = d?.tipo === 'metas-bloque' ? queCambiaBloque(d, metasBloque?.[d.bloque]) : null;
  const cambiosBloque: Cambio[] = d ? (d.tipo === 'libro'
    ? [{ color: 'var(--handyx)', titulo: `${d.libro.titulo}: ${d.libro.capitulos.length} capítulos`, texto: 'Queda en Estudio → Libros. Entra en tu día cuando lo empezás.' }]
    : [
        ...(cb!.agrega.length ? [{ color: 'var(--salud)', titulo: `Agrega ${cb!.agrega.length}`, texto: cb!.agrega.join(' · ') }] : []),
        ...(cb!.cambia.length ? [{ color: 'var(--economia)', titulo: `Cambia ${cb!.cambia.length}`, texto: cb!.cambia.join(' · ') }] : []),
        ...(cb!.saca.length ? [{ color: 'var(--rutina)', titulo: `Saca ${cb!.saca.length}`, texto: cb!.saca.join(' · ') }] : []),
        ...(cb!.conserva > 0 ? [{ color: 'var(--sub)', titulo: `Conserva el avance de ${cb!.conserva}`, texto: 'Lo tildado sigue tildado.' }] : []),
        ...(!cb!.agrega.length && !cb!.cambia.length && !cb!.saca.length ? [{ color: 'var(--sub)', titulo: 'Sin cambios', texto: 'Ya está igual.' }] : []),
      ]) : [];

  const error: ErrorJson | undefined = v && !v.ok ? v.error : vb && !vb.ok ? vb.error : undefined;
  const lista = deBloque ? !!d : !!v?.ok;

  const importar = () => {
    if (deBloque && d) {
      const r = importarJsonBloque(d);
      aviso({ titulo: d.tipo === 'libro' ? 'Libro cargado' : 'Metas importadas', sub: r[0], tono: 'hecho' });
      setHecho({ lineas: r, mapa: false });
      setTexto('');
    } else if (v?.ok) {
      const r = aplicarImportacion(v.d, day.date, COLORES);
      aviso({ titulo: `Importado a ${RAMA_NOMBRE[v.d.rama]}`, sub: r[0] ?? v.d.tipo, tono: 'hecho' });
      setHecho({ lineas: r, mapa: true });
      setTexto('');
    }
  };

  const estado = !texto.trim() ? { ok: null, texto: 'Esperando el JSON' }
    : error ? { ok: false, texto: `Línea ${error.linea}: ${error.mensaje}` }
    : v?.ok ? { ok: true, texto: `Formato válido · ${v.d.tipo} del ${fechaCorta(v.d.fecha)}` }
    : d ? { ok: true, texto: `Formato válido · ${d.tipo === 'libro' ? `libro ${d.libro.titulo}` : nombreBloque(d.bloque) ?? d.bloque}` }
    : { ok: null, texto: 'Esperando el JSON' };

  return (
    <Marco className="ax" titulo="Importar" volver={{ href: '#/hoy', nombre: 'Hoy' }} info={INFO}>
      {hecho ? (
        <Tarjeta heroe area="var(--a-salud)" etiqueta="Importación lista" className="ax-hecho">
          <span className="t-rotulo">Listo · repartido</span>
          <ul className="ax-repartido">{hecho.lineas.map((h, i) => <li key={i} className="t-cuerpo">{h}</li>)}</ul>
          <div className="ax-dos">
            <Boton onClick={() => setHecho(null)}>Importar otro</Boton>
            {hecho.mapa && <Boton variante="primario" icono="mapa" onClick={() => ir('metas/mapa')}>Ver el mapa</Boton>}
          </div>
        </Tarjeta>
      ) : (
        <>
          <Grupo titulo="JSON pegado">
            <CuadroJson texto={texto} setTexto={setTexto} error={error} ejemplo={deBloque ? EJEMPLO_BLOQUE : EJEMPLO} />
            <Estado ok={estado.ok} texto={estado.texto} />
          </Grupo>

          {!deBloque && (
            <Grupo titulo="Rama">
              <div className="ax-ramas" role="radiogroup" aria-label="Rama">
                {RAMAS.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={rama === r} aria-disabled={!permitidas.includes(r) || undefined} className="ax-rama" style={{ ['--area' as string]: colorV2(RAMA_COLOR[r]) }}
                    onClick={() => permitidas.includes(r) && setElegida(r)}><i className="area-punto" />{RAMA_NOMBRE[r]}</button>
                ))}
              </div>
              <p className="t-nota">{v?.ok ? `${QUE_ES[v.d.tipo]}${v.detectada ? '' : ' El JSON no trae "rama": se usa la elegida.'}` : 'Se detecta del JSON; si no la trae, elegila acá.'}</p>
            </Grupo>
          )}

          <Cambios cambios={deBloque ? cambiosBloque : cambiosRama} />

          <Boton variante="primario" ancho icono="importar" deshabilitado={lista ? false : 'Pegá un JSON válido para importar.'} onClick={importar}>
            {v?.ok ? `Importar a ${RAMA_NOMBRE[v.d.rama]}` : d?.tipo === 'libro' ? 'Cargar el libro' : d ? 'Importar las metas' : 'Importar'}
          </Boton>
          {texto && <Boton variante="fantasma" ancho icono="cerrar" onClick={() => setTexto('')}>Limpiar</Boton>}
        </>
      )}

      {importaciones.length > 0 && (
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Importado antes" valor={String(importaciones.length)}>
            <ul className="capa-1 pt-revs">
              {[...importaciones].reverse().slice(0, 6).map((x, i) => (
                <li key={i}><span className="t-rotulo">{RAMA_NOMBRE[x.rama]} · {fechaCorta(x.fecha)}</span><span className="t-cuerpo">{x.resumen[x.resumen.length - 1]}</span></li>
              ))}
            </ul>
          </FilaHoja>
        </div>
      )}
    </Marco>
  );
}
