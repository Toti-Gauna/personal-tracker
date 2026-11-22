/**
 * Trazo 2.0 · las herramientas open source (#/metas/open-source) como tarjetas de paquete: nombre, paquete y registro, la última
 * versión publicada y las descargas. Cada tarjeta abre su hoja: las versiones con su checklist de extracción y publicarlas,
 * el link, las descargas a mano y el post del jueves. El escrow de HandyX figura como interno: nunca se publica.
 */
import { useState } from 'react';
import { HERRAMIENTAS, REGLA_HERRAMIENTAS, estadoVersion, nombreOrigen, presetsAlawys, puedePublicarHerramienta } from '../../data/herramientas';
import { PLAN_EXT } from '../../data/plan-extendido';
import { V122, type Herramienta } from '../../data/v12-2';
import { agregarPost, publicarVersionFondo, setItem } from '../../state/fondo';
import { marcarHito } from '../../state/plan';
import { useStore } from '../../state/store';
import { fp } from '../../ui/PeriodoTarjeta';
import { Icono } from '../iconos';
import { Boton, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { CampoAlSalir, Lista } from './piezas';
import './proyecto.css';

const KIND: Record<Herramienta['kind'], string> = { standalone: 'Producto propio', extracted: 'Extraída', interna: 'Interna' };
const CAMPOS_FICHA: [string, string][] = [['puesto', 'Puesto'], ['descripcion', 'Descripción'], ['problema', 'Problema'], ['valor', 'Valor'], ['diferencial', 'Diferencial'], ['stack', 'Stack'], ['pesoEntrevistas', 'Peso en entrevistas'], ['hook', 'Imán (hook)'], ['metrica', 'Métrica']];

/** Los ítems que pueden necesitar una herramienta extraída (todo menos su origen). */
const ITEMS = [
  ...PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto' && b.fechas && !b.archivado).map((b) => ({ id: b.id, nombre: b.nombre })),
  ...V122.secundarias.map((s) => ({ id: s.id, nombre: s.nombre })),
  ...V122.comerciales.map((c) => ({ id: c.id, nombre: `#${c.n} ${c.marca ?? 'a definir'}` })),
];

const INFO = (
  <>
    <p className="t-cuerpo-l">Las herramientas son paquetes que salen de tus proyectos y se publican.</p>
    <p className="t-cuerpo">{REGLA_HERRAMIENTAS}</p>
    <p className="t-cuerpo">Una herramienta extraída no se publica hasta que un segundo ítem la necesite. La interna nunca se publica.</p>
  </>
);

export function OpenSourceV2({ hoy }: { hoy: string }) {
  const plan = useStore((s) => s.plan);
  const [elegida, setElegida] = useState<string | null>(null);
  const publicadas = HERRAMIENTAS.filter((h) => Object.values(plan.fondo?.[h.id]?.versiones ?? {}).some((v) => v.publicada));
  const resto = HERRAMIENTAS.filter((h) => !publicadas.includes(h));
  const ps = presetsAlawys(plan);
  const h = HERRAMIENTAS.find((x) => x.id === elegida);
  return (
    <Marco className="pt" titulo="Open source" info={INFO} volver={{ href: '#/metas/fondo', nombre: 'De fondo' }}>
      <div className="pt-datos">
        <Dato valor={publicadas.length} unidad={`de ${HERRAMIENTAS.length}`} etiqueta="Publicadas" />
        <Dato valor={ps.hechos} unidad={`de ${ps.total}`} etiqueta="Presets de Alawys" />
      </div>
      {publicadas.length > 0 && <Grupo titulo="Publicadas"><div className="pt-paquetes">{publicadas.map((x) => <Paquete key={x.id} h={x} onElegir={() => setElegida(x.id)} />)}</div></Grupo>}
      <Grupo titulo={publicadas.length ? 'En el plan' : 'Todas'}>
        <div className="pt-paquetes">{resto.map((x) => <Paquete key={x.id} h={x} onElegir={() => setElegida(x.id)} />)}</div>
      </Grupo>
      <HojaHerramienta h={h ?? null} hoy={hoy} onCerrar={() => setElegida(null)} />
    </Marco>
  );
}

function Paquete({ h, onElegir }: { h: Herramienta; onElegir: () => void }) {
  const e = useStore((s) => s.plan.fondo?.[h.id]);
  const ultima = h.versiones.filter((v) => e?.versiones?.[v.id]?.publicada).pop();
  return (
    <button type="button" className="capa-1 pt-paquete" onClick={onElegir} aria-label={`${h.nombre}, ${ultima ? `versión ${ultima.id} publicada` : 'sin publicar'}`}>
      <span className="pt-paquete-cab"><Icono nombre="paquete" lado={20} /><b className="t-encabezado">{h.nombre}</b><span className="t-rotulo">{KIND[h.kind]}</span></span>
      <span className="t-dato pt-paquete-nombre">{h.paquete}</span>
      <span className="pt-paquete-pie">
        <span className={`pt-version-pill${ultima ? ' on' : ''}`}>{ultima ? <><Icono nombre="tilde" lado={14} />v{ultima.id}</> : 'Sin publicar'}</span>
        <span className="t-nota">{h.registro}{e?.descargas != null ? ` · ${e.descargas} descargas` : ''}</span>
      </span>
    </button>
  );
}

function HojaHerramienta({ h, hoy, onCerrar }: { h: Herramienta | null; hoy: string; onCerrar: () => void }) {
  const plan = useStore((s) => s.plan);
  const [ultima, setUltima] = useState<Herramienta | null>(null);
  if (h && h !== ultima) setUltima(h);
  const x = h ?? ultima;
  if (!x) return null;
  const e = plan.fondo?.[x.id] ?? {};
  const posteada = plan.posts?.some((p) => p.item === x.id);
  const fila = CAMPOS_FICHA.filter(([k]) => x.ficha?.[k]);
  return (
    <Hoja abierta={!!h} onCerrar={onCerrar} titulo={x.nombre} alto="completa">
      <div className="pt-herramienta">
        <p className="t-dato">{x.paquete}{x.licencia ? ` · ${x.licencia}` : ''} · {x.registro}</p>
        <p className="t-nota">Origen: {[...new Set(x.versiones.map((v) => nombreOrigen(v.origen)))].join(', ')}</p>
        {fila.length > 0 && (
          <dl className="capa-1 pt-ficha">
            {fila.map(([k, n]) => <div key={k} className="pt-ficha-fila"><dt className="t-rotulo">{n}</dt><dd><p className="t-cuerpo">{x.ficha![k]}</p></dd></div>)}
          </dl>
        )}
        {x.kind === 'extracted' && (
          <Selector etiqueta="La necesita (sin un segundo ítem que la use, no se publica)" valor={e.necesitadoPor ?? ''} placeholder="Elegir"
            opciones={[{ valor: '', etiqueta: 'Todavía ninguno' }, ...ITEMS.filter((i) => i.id !== x.versiones[0].origen).map((i) => ({ valor: i.id, etiqueta: i.nombre }))]}
            onCambio={(v) => setItem(x.id, { necesitadoPor: v || undefined })} />
        )}
        {x.versiones.filter((v) => v.donde !== 'recurrente').map((v) => {
          const st = estadoVersion(x, v, plan);
          const g = puedePublicarHerramienta(x, v, plan);
          return (
            <section key={v.id} className="capa-1 pt-herr-version" aria-label={`${x.nombre} ${v.id}`}>
              <p className="t-encabezado">v{v.id}{v.lanzamiento ? ' · lanzamiento (Imán)' : ''}</p>
              <p className="t-nota">{nombreOrigen(v.origen)}{st.fechas ? ` · ${fp(st.fechas.inicio)}${st.fechas.fin !== st.fechas.inicio ? ` – ${fp(st.fechas.fin)}` : ''}` : ''} · {v.linea}</p>
              {x.kind !== 'interna' && <Lista festejo={false} items={st.checklist.map((c) => ({ clave: c.clave, etiqueta: c.texto, marcada: c.hecho }))} onCambio={(k) => { const c = st.checklist.find((y) => y.clave === k)!; marcarHito(k, c.hecho ? null : hoy); }} />}
              {st.publicada
                ? <p className="t-nota">Publicada el {fp(st.publicada)}. <button className="pt-enlace" onClick={() => publicarVersionFondo(x.id, v.id, null)}>Deshacer</button></p>
                : g.ok
                  ? <Boton variante="primario" icono="tilde" onClick={() => publicarVersionFondo(x.id, v.id, hoy)}>v{v.id} publicada hoy</Boton>
                  : <p className="t-nota">{x.kind === 'interna' ? 'Interna: nunca se publica.' : `Para publicar falta: ${g.faltan.join(' · ')}`}{v.lanzamiento && x.kind !== 'interna' ? <> · <a href={`#/metas/iman/${x.id}`}>Imán</a></> : null}</p>}
            </section>
          );
        })}
        {x.versiones.some((v) => v.donde === 'recurrente') && <p className="t-nota">v1.x: {x.versiones.find((v) => v.donde === 'recurrente')!.linea}. Es la casilla "Preset agregado a Alawys" del arranque de cada proyecto.</p>}
        {x.kind !== 'interna' && (
          <div className="pt-campo-hoja">
            <CampoAlSalir etiqueta="Link del paquete" valor={e.enlace} guardar={(v) => setItem(x.id, { enlace: v || undefined })} modo="url" />
            <CampoAlSalir etiqueta="Descargas (a mano)" valor={e.descargas != null ? String(e.descargas) : ''} guardar={(v) => setItem(x.id, { descargas: v ? Number(v.replace(/\D/g, '')) : undefined })} modo="numeric" />
            {posteada ? <p className="t-nota">Post del jueves: hecho.</p> : <Boton variante="secundario" icono="tilde" onClick={() => agregarPost({ fecha: hoy, canales: ['linkedin-en', 'linkedin-es', 'x'], pista: 'principal', item: x.id })}>Post del jueves hecho hoy</Boton>}
          </div>
        )}
      </div>
    </Hoja>
  );
}
