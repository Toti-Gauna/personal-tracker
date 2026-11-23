/**
 * Trazo 2.0 · lo de fondo dentro de la revisión del domingo: el uso de Claude contra el umbral y las pausas que sugiere (nunca sin que
 * las confirmes), el tiempo de revisión de lo de fondo contra la meta, y las elecciones que llegan en fecha (la próxima secundaria y la
 * marca de los slots a definir). Mismos datos y mismas funciones que `ui/RevisionFondo` de la 1.0; cada cosa abre su hoja.
 */
import { useState } from 'react';
import { fondoEn, metaRevisionSemana, revisionSemana, sugerenciaPausas, type EntradaRevision } from '../../data/fondo';
import { tramoActivo } from '../../data/plan';
import { addDays } from '../../data/time';
import { V122 } from '../../data/v12-2';
import { anotarRevision, borrarRevision, pausarItem, setItem, setUmbralClaude, setUsoClaude } from '../../state/fondo';
import { getState, useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoHora, Contador, Interruptor, Segmentado, Selector } from '../kit/controles';
import { Dato } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { CampoAlSalir, FilaHoja } from '../proyecto/piezas';
import { dm, n1 } from './comun';

const horas = (min: number) => n1(min / 60);
const TIPOS: [EntradaRevision['tipo'], string][] = [['walkthrough', 'Walkthrough'], ['diseño', 'Diseño'], ['comercial', 'Comercial'], ['otro', 'Otro']];

/** Uso de Claude esta semana contra el umbral; si lo pasa, las pausas que se sugieren (a mano). */
function Claude({ hoy, lunes }: { hoy: string; lunes: string }) {
  const plan = useStore((s) => s.plan);
  const uso = plan.usoClaude?.[lunes];
  const umbral = plan.umbralClaude ?? 85;
  const activo = fondoEn(hoy);
  const sug = sugerenciaPausas(uso, umbral, activo).filter((s) => !plan.fondo?.[s.id]?.pausado);
  const pausados = Object.entries(plan.fondo ?? {}).filter(([, x]) => x.pausado) as [string, { pausado: string }][];
  const pausar = (id: string, nombre: string) => { pausarItem(id, hoy); aviso({ titulo: `${nombre}: en pausa`, sub: 'Nada se borró', deshacer: () => pausarItem(id, null) }); };
  const reanudar = (id: string, desde: string) => { pausarItem(id, null); aviso({ titulo: `${id}: reanudado`, tono: 'hecho', deshacer: () => pausarItem(id, desde) }); };
  return (
    <div className="pt-campo-hoja">
      <CampoAlSalir etiqueta="Uso de Claude esta semana (%)" valor={uso != null ? String(uso) : ''} modo="decimal" guardar={(v) => { const n = Number(v.replace(',', '.')); setUsoClaude(lunes, v && Number.isFinite(n) ? n : null); }} />
      <CampoAlSalir etiqueta="Umbral (%)" valor={String(umbral)} modo="decimal" guardar={(v) => { const n = Number(v.replace(',', '.')); if (n > 0 && n <= 100) setUmbralClaude(n); }} />
      {sug.length > 0 && (
        <div className="capa-2 tr-caja" role="alert">
          <p className="t-encabezado">Claude al {uso} % (umbral {umbral} %): lo principal va primero.</p>
          <p className="t-nota">Se sugiere pausar primero lo comercial y, si hace falta, lo secundario. Nada se pausa sin que lo confirmes.</p>
          {sug.map((s) => <Boton key={s.id} variante="secundario" icono="pausa" onClick={() => pausar(s.id, s.nombre)}>{`Pausar ${s.nombre}`}</Boton>)}
        </div>
      )}
      {pausados.length > 0 && (
        <div className="tr-pausados">
          <p className="t-rotulo">En pausa</p>
          {pausados.map(([id, x]) => <Boton key={id} tamano="s" variante="fantasma" icono="play" onClick={() => reanudar(id, x.pausado)}>{`Reanudar ${id}`}</Boton>)}
        </div>
      )}
    </div>
  );
}

/** El tiempo de revisión de la semana, para anotar uno y para ver (y borrar) los anotados. */
function Tiempo({ hoy, lunes }: { hoy: string; lunes: string }) {
  const plan = useStore((s) => s.plan);
  const activo = fondoEn(hoy);
  const rev = revisionSemana(plan.revisionFondo, lunes);
  const meta = metaRevisionSemana(lunes);
  const items = [...activo.secundaria.map((s) => ({ id: s.app.id, nombre: `${s.app.nombre} v${s.version}` })), ...(activo.comercial ? [{ id: activo.comercial.id, nombre: `#${activo.comercial.n} ${activo.comercial.marca ?? plan.fondo?.[activo.comercial.id]?.marca ?? 'a definir'}` }] : [])];
  const [f, setF] = useState<{ item: string; tipo: EntradaRevision['tipo']; con: boolean; inicio: string; min: number | null }>({ item: items[0]?.id ?? '', tipo: 'walkthrough', con: false, inicio: new Date().toTimeString().slice(0, 5), min: 60 });
  const semana = (plan.revisionFondo ?? []).filter((x) => x.fecha >= lunes && x.fecha <= addDays(lunes, 6));
  const anotar = () => {
    if (!f.item || !f.min || f.min <= 0) return;
    const aviso1 = anotarRevision({ fecha: hoy, item: f.item, tipo: f.tipo, min: f.min, ...(f.con ? { inicio: f.inicio } : {}) }, tramoActivo(hoy).tipo);
    const id = getState().plan.revisionFondo?.at(-1)?.id;
    aviso({ titulo: `Revisión anotada · ${f.min} min`, sub: items.find((x) => x.id === f.item)?.nombre, tono: 'hecho', deshacer: id ? () => borrarRevision(id) : undefined });
    if (aviso1) aviso({ titulo: 'Ojo con la hora', sub: aviso1, tono: 'atencion' });
  };
  const borrar = (x: EntradaRevision) => {
    borrarRevision(x.id);
    aviso({ titulo: 'Revisión borrada', sub: `${dm(x.fecha)} · ${x.item} · ${x.min} min`, deshacer: () => { const { id: _id, ...resto } = x; anotarRevision(resto); } });
  };
  return (
    <div className="pt-campo-hoja">
      <div className="tr-datos">
        <Dato valor={`${horas(rev.walkthrough)} de ${horas(meta.walkthroughMin)}`} unidad="h" etiqueta="Walkthrough" />
        <Dato valor={horas(rev.diseno)} unidad="h" etiqueta="Diseño" />
        <Dato valor={horas(rev.comercial)} unidad="h" etiqueta="Comercial" />
      </div>
      <p className="t-nota">Son {horas(rev.min)} h esta semana. No suman a las 72 h de foco.</p>
      {items.length > 0 ? (
        <>
          <Selector etiqueta="Ítem de fondo" valor={f.item} opciones={items.map((x) => ({ valor: x.id, etiqueta: x.nombre }))} onCambio={(v) => setF({ ...f, item: v })} />
          <Segmentado etiqueta="Tipo de revisión" opciones={TIPOS} valor={f.tipo} onCambio={(v) => setF({ ...f, tipo: v })} />
          <div className="tr-campo"><span className="t-rotulo">Cuánto duró</span><Contador etiqueta="Minutos" valor={f.min} inicial={60} min={5} max={600} paso={5} unidad="min" onCambio={(v) => setF({ ...f, min: v })} /></div>
          <Interruptor prendido={f.con} onCambio={(v) => setF({ ...f, con: v })} etiqueta="Anotar desde qué hora" nota="Así te avisamos si cae en un bloque de foco" />
          {f.con && <CampoHora etiqueta="Desde" valor={f.inicio} onCambio={(v) => setF({ ...f, inicio: v })} />}
          <Boton variante="primario" icono="tilde" deshabilitado={!f.min} onClick={anotar}>Anotar revisión</Boton>
        </>
      ) : <p className="t-nota">No hay nada de fondo corriendo hoy: no hay a qué anotarle tiempo.</p>}
      {semana.length > 0 && (
        <ul className="capa-1 pt-revs">
          {semana.map((x) => (
            <li key={x.id} className="tr-corrida">
              <span className="tr-corrida-texto"><span className="t-rotulo">{dm(x.fecha)} · {x.tipo}{x.inicio ? ` · desde ${x.inicio}` : ''}</span><span className="t-cuerpo">{x.item} · {x.min} min</span></span>
              <Boton tamano="s" variante="fantasma" icono="borrar" etiqueta={`Borrar ${x.item} del ${dm(x.fecha)}`} soloIcono onClick={() => borrar(x)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lo que se elige en una fecha: la próxima app secundaria (29 ago a 19 sep 2027) y la marca de los slots que arrancan en 14 días. */
function Elegir({ hoy }: { hoy: string }) {
  const plan = useStore((s) => s.plan);
  const elegir = hoy >= '2027-08-29' && hoy <= '2027-09-19';
  const marcas = V122.comerciales.filter((c) => !c.marca && c.inicio > hoy && addDays(c.inicio, -14) <= hoy);
  const actual = plan.fondo?.['secundaria-siguiente']?.marca ?? '';
  return (
    <>
      {elegir && (
        <FilaHoja icono="estrella" titulo="Próxima secundaria" nota="La pista queda libre desde el 7 sep 2027" valor={actual || 'Sin elegir'} tituloHoja="Elegí la próxima secundaria">
          <div className="pt-campo-hoja">
            <Selector etiqueta="Próxima app secundaria" valor={actual} placeholder="Sin elegir" opciones={[{ valor: '', etiqueta: 'Sin elegir' }, ...V122.backlog.map((b) => ({ valor: b.nombre, etiqueta: `${b.nombre}${b.destacado ? ' ⭐' : ''}` }))]} onCambio={(v) => setItem('secundaria-siguiente', { marca: v || undefined })} />
          </div>
        </FilaHoja>
      )}
      {marcas.map((c) => (
        <FilaHoja key={c.id} icono="paquete" titulo={`Marca del slot #${c.n}`} nota={`Arranca el ${dm(c.inicio)} · ${c.ventana}`} valor={plan.fondo?.[c.id]?.marca ?? 'A definir'} tituloHoja={`Elegí la marca del slot #${c.n}`}>
          <div className="pt-campo-hoja">
            <CampoAlSalir etiqueta={`Marca del slot ${c.n}`} valor={plan.fondo?.[c.id]?.marca ?? ''} guardar={(v) => setItem(c.id, { marca: v || undefined })} />
          </div>
        </FilaHoja>
      ))}
    </>
  );
}

export function GrupoFondo({ hoy, lunes }: { hoy: string; lunes: string }) {
  const plan = useStore((s) => s.plan);
  const uso = plan.usoClaude?.[lunes];
  const umbral = plan.umbralClaude ?? 85;
  const rev = revisionSemana(plan.revisionFondo, lunes);
  const meta = metaRevisionSemana(lunes);
  return (
    <Grupo titulo="De fondo y Claude">
      <div className="capa-1 s-lista">
        <FilaHoja icono="ritmo" titulo="Uso de Claude" nota={uso != null && uso >= umbral ? 'Pasó el umbral' : `Umbral ${umbral} %`} valor={uso != null ? `${n1(uso)} %` : 'Sin cargar'} tituloHoja="Uso de Claude">
          <Claude hoy={hoy} lunes={lunes} />
        </FilaHoja>
        <FilaHoja icono="ojo" titulo="Tiempo de revisión" nota="Walkthrough · aparte de las 72 h de foco" valor={`${horas(rev.walkthrough)} de ${horas(meta.walkthroughMin)} h`} tituloHoja="Revisión de lo de fondo">
          <Tiempo hoy={hoy} lunes={lunes} />
        </FilaHoja>
        <Elegir hoy={hoy} />
      </div>
    </Grupo>
  );
}
