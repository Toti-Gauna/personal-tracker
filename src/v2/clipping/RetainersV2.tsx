/**
 * Trazo 2.0 · los Retainers del Clipping (#/metas/clipping/retainers): el fijo mensual, el embudo de prospección del mes (mensajes,
 * pruebas, activos) y una fila por retainer. Los contadores de la semana suman y restan; crear, editar y borrar (con deshacer) va en una
 * hoja. Mismos datos y mismas acciones que la 1.0 (`sumarProspeccion`, `guardarRetainer`, `borrarRetainer`).
 */
import { useState } from 'react';
import { finMes, inicioMes, mesDe, MESES_CLIP } from '../../data/clipping';
import { ESTADOS_RETAINER, type EstadoRetainer, type Retainer } from '../../data/clipping-state';
import { borrarRetainer, guardarRetainer, sumarProspeccion } from '../../state/clipping';
import { lunesDe } from '../../state/plan';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha, CampoTexto, Contador, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { aTexto, decimal, entero, fc, fcA, soloNumero, usd, useHojaDe } from './datos';
import { EstadoClip, palabraEstado } from './piezas';
import './clipping.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">El fijo real del clipping: un pago mensual por cantidad de clips.</p>
    <p className="t-cuerpo">Se consigue con resultados (un portfolio de 10 clips con sus views) y se apunta desde el mes 3: 20 mensajes a streamers o podcasters medianos, con un mes de prueba.</p>
    <p className="t-cuerpo">La prueba no cobra; el activo suma su fijo a cada mes que cubre.</p>
  </>
);

export default function RetainersV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const clip = useStore((s) => s.clipping);
  const hoja = useHojaDe<Retainer>();
  const n = Math.min(Math.max(mesDe(date), 1), MESES_CLIP);
  const desde = inicioMes(n);
  const hasta = finMes(n);
  const pros = Object.entries(clip.prospeccion).filter(([l]) => l >= lunesDe(desde) && l <= hasta).reduce((s, [, p]) => ({ mensajes: s.mensajes + p.mensajes, pruebas: s.pruebas + p.pruebas }), { mensajes: 0, pruebas: 0 });
  const semana = clip.prospeccion[lunesDe(date)] ?? { mensajes: 0, pruebas: 0 };
  const activos = clip.retainers.filter((r) => r.estado === 'activo');
  const fijo = activos.reduce((s, r) => s + r.usdMes, 0);
  const pasos = [{ k: 'Mensajes enviados', v: pros.mensajes, meta: 20 }, { k: 'Pruebas arrancadas', v: pros.pruebas, meta: 3 }, { k: 'Retainers activos', v: activos.length, meta: n >= 9 ? 3 : n >= 4 ? 2 : 1 }];
  const cambiar = (k: 'mensajes' | 'pruebas') => (v: number) => sumarProspeccion(date, k, v - semana[k]);

  return (
    <Marco className="cl" titulo="Retainers" volver={{ href: '#/metas/clipping', nombre: 'Clipping' }} info={INFO}>
      <Tarjeta heroe area="var(--a-eclipse)" className="cl-resumen" etiqueta="Fijo mensual">
        <Dato grande valor={usd(fijo).replace('USD ', '')} unidad="USD" etiqueta={`Fijo mensual · ${activos.length} ${activos.length === 1 ? 'activo' : 'activos'}`} />
        <ol className="cl-embudo" aria-label={`Embudo del mes ${n}`}>
          {pasos.map((p) => (
            <li key={p.k}>
              <span className="cl-embudo-cab"><span className="t-cuerpo">{p.k}</span><span className="t-dato">{p.v} de {p.meta}</span></span>
              <Barra valor={p.v} max={p.meta} nombre={`${p.k} del mes ${n}: ${p.v} de ${p.meta}`} area="var(--a-eclipse)" />
            </li>
          ))}
        </ol>
      </Tarjeta>

      <Grupo titulo="Esta semana" extremo={<span className="t-rotulo">Desde el lunes {fc(lunesDe(date))}</span>}>
        <div className="capa-1 cl-semana">
          <div className="cl-campo"><span className="k-campo-etiqueta">Mensajes enviados</span><Contador etiqueta="Mensajes enviados esta semana" valor={semana.mensajes} min={0} max={999} onCambio={cambiar('mensajes')} /></div>
          <div className="cl-campo"><span className="k-campo-etiqueta">Pruebas arrancadas</span><Contador etiqueta="Pruebas arrancadas esta semana" valor={semana.pruebas} min={0} max={99} onCambio={cambiar('pruebas')} /></div>
        </div>
      </Grupo>

      <Grupo titulo="Retainers" extremo={<span className="t-rotulo">{clip.retainers.length} en total</span>}>
        {clip.retainers.length === 0 ? (
          <Vacio ilustracion="trabajo" titulo="Sin retainers todavía" texto="Un streamer o podcaster que te paga por mes." accion={<Boton variante="primario" icono="mas" onClick={() => hoja.abrir()}>Nuevo retainer</Boton>} />
        ) : (
          <>
            <div className="capa-1 s-lista">
              {clip.retainers.map((r) => (
                <Fila key={r.id} titulo={r.nombre} valor={<EstadoClip estado={r.estado} />} onClick={() => hoja.abrir(r)}
                  nota={`${usd(r.usdMes)} por mes${r.clipsMes ? ` · ${r.clipsMes} clips` : ''} · desde ${fcA(r.desde)}${r.hasta ? ` hasta ${fcA(r.hasta)}` : ''}`} />
              ))}
            </div>
            <Boton variante="primario" ancho icono="mas" onClick={() => hoja.abrir()}>Nuevo retainer</Boton>
          </>
        )}
      </Grupo>

      <Hoja abierta={hoja.abierta} onCerrar={hoja.cerrar} titulo={hoja.item ? hoja.item.nombre : 'Nuevo retainer'}>
        <Formulario key={`${hoja.clave}:${hoja.item?.id ?? 'nuevo'}`} retainer={hoja.item} hoy={date} onCerrar={hoja.cerrar} />
      </Hoja>
    </Marco>
  );
}

function Formulario({ retainer, hoy, onCerrar }: { retainer?: Retainer; hoy: string; onCerrar: () => void }) {
  const [x, setX] = useState({ nombre: retainer?.nombre ?? '', estado: retainer?.estado ?? ('prueba' as EstadoRetainer), usdMes: aTexto(retainer?.usdMes), clipsMes: aTexto(retainer?.clipsMes), desde: retainer?.desde ?? hoy, hasta: retainer?.hasta ?? '' });
  const usdMes = decimal(x.usdMes);
  const ok = !!x.nombre.trim() && usdMes != null && /^\d{4}-\d{2}-\d{2}$/.test(x.desde);
  const guardar = () => {
    if (!ok) return;
    const datos = { id: retainer?.id, nombre: x.nombre.trim(), estado: x.estado, usdMes: usdMes!, clipsMes: entero(x.clipsMes), desde: x.desde, hasta: x.hasta || undefined };
    const id = guardarRetainer(datos);
    aviso({ titulo: retainer ? 'Retainer actualizado' : 'Retainer guardado', sub: datos.nombre, tono: 'hecho', deshacer: () => (retainer ? guardarRetainer(retainer) : borrarRetainer(id)) });
    onCerrar();
  };
  const borrar = () => {
    if (!retainer) return;
    borrarRetainer(retainer.id);
    aviso({ titulo: 'Retainer borrado', sub: retainer.nombre, deshacer: () => guardarRetainer(retainer) });
    onCerrar();
  };
  return (
    <form className="cl-form" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      <CampoTexto etiqueta="Streamer o podcaster" valor={x.nombre} onCambio={(v) => setX({ ...x, nombre: v })} />
      <div className="cl-dos">
        <CampoTexto etiqueta="USD por mes" modo="decimal" valor={x.usdMes} onCambio={(v) => setX({ ...x, usdMes: soloNumero(v) })} placeholder="300" />
        <CampoTexto etiqueta="Clips por mes" modo="numeric" valor={x.clipsMes} onCambio={(v) => setX({ ...x, clipsMes: soloNumero(v) })} />
      </div>
      <Selector etiqueta="Estado" valor={x.estado} onCambio={(v) => setX({ ...x, estado: v })} opciones={ESTADOS_RETAINER.map((s) => ({ valor: s, etiqueta: palabraEstado(s), nota: s === 'prueba' ? 'No cobra' : s === 'activo' ? 'Suma su fijo a cada mes' : undefined }))} />
      <CampoFecha etiqueta="Desde" valor={x.desde} onCambio={(v) => setX({ ...x, desde: v })} hoy={hoy} />
      <CampoFecha etiqueta="Hasta" valor={x.hasta || null} onCambio={(v) => setX({ ...x, hasta: v })} hoy={hoy} nota={x.hasta ? undefined : 'Sin fecha de fin'} />
      {x.hasta && <Boton variante="fantasma" tamano="s" onClick={() => setX({ ...x, hasta: '' })}>Quitar la fecha de fin</Boton>}
      <div className="cl-acciones">
        <Boton variante="primario" ancho tipo="submit" icono="tilde" deshabilitado={ok ? false : !x.nombre.trim() ? 'Poné el nombre del streamer o podcaster.' : 'Cargá cuánto paga por mes.'}>Guardar</Boton>
        {retainer && <Boton variante="fantasma" icono="borrar" onClick={borrar}>Borrar el retainer</Boton>}
      </div>
    </form>
  );
}
