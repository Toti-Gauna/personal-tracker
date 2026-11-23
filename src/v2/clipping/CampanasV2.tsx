/**
 * Trazo 2.0 · las Campañas del Clipping (#/metas/clipping/campanas): la tarifa listada contra el pago real por 1.000 views, qué conviene
 * seguir y qué dejar. Crear y editar va en una hoja; borrar se puede deshacer. Mismos cálculos y mismos datos que la 1.0.
 */
import { useMemo, useState } from 'react';
import { CLIP } from '../../data/clipping';
import { porCampana } from '../../data/clipping-metricas';
import { ESTADOS_CAMPANA, type Campana, type EstadoCampana } from '../../data/clipping-state';
import { borrarCampana, guardarCampana } from '../../state/clipping';
import { useStore } from '../../state/store';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha, CampoTexto, Chip, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { aTexto, decimal, pc, soloNumero, usd, usd2, useHojaDe } from './datos';
import { EstadoClip, palabraEstado } from './piezas';
import '../proyecto/proyecto.css';
import './clipping.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">La tarifa listada contra lo que de verdad pagan por 1.000 views.</p>
    <p className="t-cuerpo">El pago real sale de las filas con cobro cargado y casi siempre queda debajo de lo anunciado. Arriba de USD 0,80 conviene seguir; debajo de USD 0,70, dejar.</p>
    <p className="t-cuerpo">Leé las reglas de 10 campañas (tope por clip, mínimo de views, plataformas, fuente permitida) y cargá las 3 que elijas.</p>
  </>
);

export default function CampanasV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const clip = useStore((s) => s.clipping);
  const hoja = useHojaDe<Campana>();
  const filasC = useMemo(() => porCampana(clip), [clip]);
  const seguir = filasC.filter((f) => f.pagoReal != null && f.pagoReal >= CLIP.umbrales.pagoFase2 && f.estado !== 'descartada');
  const dejar = filasC.filter((f) => f.pagoReal != null && f.pagoReal < CLIP.umbrales.pagoMes6 && f.estado !== 'descartada');

  return (
    <Marco className="cl" titulo="Campañas" volver={{ href: '#/metas/clipping', nombre: 'Clipping' }} info={INFO}>
      {filasC.length > 0 && (
        <Tarjeta heroe area="var(--a-eclipse)" className="cl-resumen" etiqueta="Qué conviene">
          <div className="cl-ranking">
            <div>
              <span className="t-rotulo"><Icono nombre="arriba" lado={14} /> Conviene seguir</span>
              {seguir.length ? seguir.slice(0, 3).map((f) => <b key={f.id} className="t-cuerpo">{f.nombre} · <span className="t-dato">{usd2(f.pagoReal)}</span></b>) : <small className="t-nota">Ninguna arriba de USD {usd2(CLIP.umbrales.pagoFase2)} todavía</small>}
            </div>
            <div>
              <span className="t-rotulo"><Icono nombre="abajo" lado={14} /> Dejar</span>
              {dejar.length ? dejar.slice(0, 3).map((f) => <b key={f.id} className="t-cuerpo">{f.nombre} · <span className="t-dato">{usd2(f.pagoReal)}</span></b>) : <small className="t-nota">Ninguna debajo de USD {usd2(CLIP.umbrales.pagoMes6)}</small>}
            </div>
          </div>
          <Boton variante="primario" ancho icono="mas" onClick={() => hoja.abrir()}>Nueva campaña</Boton>
        </Tarjeta>
      )}

      <Grupo titulo="Campañas" extremo={<span className="t-rotulo">{filasC.length} en total</span>}>
        {filasC.length === 0 ? (
          <Vacio ilustracion="metas" titulo="Cargá tu primera campaña" texto="Leé las reglas de 10 campañas y cargá las 3 que elijas." accion={<Boton variante="primario" icono="mas" onClick={() => hoja.abrir()}>Nueva campaña</Boton>} />
        ) : (
          <div className="capa-1 s-lista">
            {filasC.map((f) => {
              const c = clip.campanas.find((x) => x.id === f.id)!;
              return (
                <Fila key={f.id} titulo={f.nombre} onClick={() => hoja.abrir(c)} valor={<EstadoClip estado={c.estado} />}
                  nota={<>{f.plataforma} · {c.nicho || 'sin nicho'}{c.tope != null ? ` · tope ${usd(c.tope)}` : ''}<br />Listada {usd2(f.tarifa)} · real {usd2(f.pagoReal)}</>} />
              );
            })}
          </div>
        )}
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="enlace" titulo="Plataformas de la semana 1" nota="Tarifas sin verificar" valor={String(CLIP.plataformas.length)}>
            <ul className="cl-plataformas">{CLIP.plataformas.map((p) => <li key={p.nombre}><b>{p.nombre}</b><span className="t-dato">{p.tarifa}</span><small className="t-nota">{p.nota}</small></li>)}</ul>
            <p className="t-nota">{CLIP.datosA}. Revisá las tarifas cada lunes: cambian por campaña y se agotan.</p>
          </FilaHoja>
        </div>
      </Grupo>

      <Hoja abierta={hoja.abierta} onCerrar={hoja.cerrar} titulo={hoja.item ? hoja.item.nombre : 'Nueva campaña'}>
        <Formulario key={`${hoja.clave}:${hoja.item?.id ?? 'nueva'}`} campana={hoja.item} hoy={date} onCerrar={hoja.cerrar} />
      </Hoja>
    </Marco>
  );
}

function Formulario({ campana, hoy, onCerrar }: { campana?: Campana; hoy: string; onCerrar: () => void }) {
  const clip = useStore((s) => s.clipping);
  const real = useMemo(() => (campana ? porCampana(clip).find((f) => f.id === campana.id) : undefined), [clip, campana]);
  const [x, setX] = useState({ nombre: campana?.nombre ?? '', plataforma: campana?.plataforma ?? CLIP.plataformas[0].nombre, nicho: campana?.nicho ?? '', tarifa: aTexto(campana?.tarifa), tope: aTexto(campana?.tope), fuente: campana?.fuente ?? '', estado: campana?.estado ?? ('probando' as EstadoCampana), desde: campana?.desde ?? hoy });
  const tarifa = decimal(x.tarifa);
  const ok = !!x.nombre.trim() && tarifa != null;
  const nichos = [{ valor: '', etiqueta: 'Sin nicho' }, ...CLIP.nichos.map((nn) => ({ valor: nn.nombre, etiqueta: nn.nombre, nota: `riesgo ${nn.riesgo}` })), ...(x.nicho && !CLIP.nichos.some((nn) => nn.nombre === x.nicho) ? [{ valor: x.nicho, etiqueta: x.nicho }] : [])];
  const guardar = () => {
    if (!ok) return;
    const datos = { id: campana?.id, nombre: x.nombre.trim(), plataforma: x.plataforma, nicho: x.nicho, tarifa: tarifa!, tope: decimal(x.tope), fuente: x.fuente.trim() || undefined, estado: x.estado, desde: x.desde };
    const id = guardarCampana(datos);
    aviso({ titulo: campana ? 'Campaña actualizada' : 'Campaña guardada', sub: datos.nombre, tono: 'hecho', deshacer: () => (campana ? guardarCampana(campana) : borrarCampana(id)) });
    onCerrar();
  };
  const borrar = () => {
    if (!campana) return;
    borrarCampana(campana.id);
    aviso({ titulo: 'Campaña borrada', sub: campana.nombre, deshacer: () => guardarCampana(campana) });
    onCerrar();
  };
  return (
    <form className="cl-form" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      {real && (
        <div className="cl-tres" role="group" aria-label="Cómo viene la campaña">
          <Dato valor={usd2(real.tarifa)} etiqueta="Listada" />
          <Dato valor={usd2(real.pagoReal)} etiqueta="Real" />
          <Dato valor={real.brecha == null ? '—' : `${real.brecha > 0 ? '+' : '−'}${usd2(Math.abs(real.brecha))}`} etiqueta="Brecha" />
          <Dato valor={pc(real.aprobacion)} etiqueta="Aprobación" />
        </div>
      )}
      <CampoTexto etiqueta="Nombre" valor={x.nombre} onCambio={(v) => setX({ ...x, nombre: v })} placeholder="GTA 6 · streamer" />
      <div className="cl-campo">
        <CampoTexto etiqueta="Plataforma" valor={x.plataforma} onCambio={(v) => setX({ ...x, plataforma: v })} />
        <div className="cl-chips" role="group" aria-label="Plataformas conocidas">
          {CLIP.plataformas.map((p) => <Chip key={p.nombre} activo={x.plataforma === p.nombre} onCambio={() => setX({ ...x, plataforma: p.nombre })}>{p.nombre}</Chip>)}
        </div>
      </div>
      <Selector etiqueta="Nicho" valor={x.nicho} onCambio={(v) => setX({ ...x, nicho: v })} opciones={nichos} />
      <div className="cl-dos">
        <CampoTexto etiqueta="Tarifa · USD por 1.000" modo="decimal" valor={x.tarifa} onCambio={(v) => setX({ ...x, tarifa: soloNumero(v) })} placeholder="1,09" />
        <CampoTexto etiqueta="Tope por clip · USD" modo="decimal" valor={x.tope} onCambio={(v) => setX({ ...x, tope: soloNumero(v) })} />
      </div>
      <CampoTexto etiqueta="Fuente permitida" valor={x.fuente} onCambio={(v) => setX({ ...x, fuente: v })} placeholder="Solo los streams del canal oficial" />
      <Selector etiqueta="Estado" valor={x.estado} onCambio={(v) => setX({ ...x, estado: v })} opciones={ESTADOS_CAMPANA.map((s) => ({ valor: s, etiqueta: palabraEstado(s) }))} />
      <CampoFecha etiqueta="Desde" valor={x.desde} onCambio={(v) => setX({ ...x, desde: v })} hoy={hoy} />
      <div className="cl-acciones">
        <Boton variante="primario" ancho tipo="submit" icono="tilde" deshabilitado={ok ? false : !x.nombre.trim() ? 'Ponele un nombre a la campaña.' : 'Cargá la tarifa listada.'}>Guardar</Boton>
        {campana && <Boton variante="fantasma" icono="borrar" onClick={borrar}>Borrar la campaña</Boton>}
      </div>
    </form>
  );
}

