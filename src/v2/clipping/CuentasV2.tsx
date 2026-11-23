/**
 * Trazo 2.0 · las Cuentas del Clipping (#/metas/clipping/cuentas): la granja contra el plan mes a mes y una fila por cuenta (red, nicho,
 * estilo, estado y clips de los últimos 7 días). Crear y editar va en una hoja; borrar se puede deshacer.
 */
import { useMemo, useState } from 'react';
import { CLIP, mesDe, MESES_CLIP } from '../../data/clipping';
import { filas, totales } from '../../data/clipping-metricas';
import { ESTADOS_CUENTA, type Cuenta, type EstadoCuenta } from '../../data/clipping-state';
import { addDays } from '../../data/time';
import { borrarCuenta, guardarCuenta } from '../../state/clipping';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha, CampoTexto, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { cuentasPorMes, useHojaDe } from './datos';
import { EstadoClip, GranjaBarras, palabraEstado } from './piezas';
import '../proyecto/proyecto.css';
import './clipping.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada cuenta es una identidad: su nicho, su estilo de subtítulos, su ritmo y sus horarios.</p>
    <p className="t-cuerpo">Las que están calentando no cuentan todavía como activas. El plan pasa de 3 a 40 cuentas en los 12 meses.</p>
  </>
);

export default function CuentasV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const clip = useStore((s) => s.clipping);
  const hoja = useHojaDe<Cuenta>();
  const n = Math.min(Math.max(mesDe(date), 1), MESES_CLIP);
  const mes = CLIP.meses[n - 1];
  const real = cuentasPorMes(clip, date, mesDe(date));
  const activas = clip.cuentas.filter((c) => c.estado === 'activa' && c.desde <= date).length;
  const semana = { desde: addDays(date, -6), hasta: date };
  const ritmo = (id: string) => totales(filas(clip, semana, { cuenta: id })).clips;
  const orden = useMemo(() => [...clip.cuentas].sort((a, b) => ESTADOS_CUENTA.indexOf(a.estado) - ESTADOS_CUENTA.indexOf(b.estado) || a.alias.localeCompare(b.alias)), [clip.cuentas]);

  return (
    <Marco className="cl" titulo="Cuentas" volver={{ href: '#/metas/clipping', nombre: 'Clipping' }} info={INFO}>
      <Tarjeta heroe area="var(--a-eclipse)" className="cl-resumen" etiqueta="La granja contra el plan">
        <div className="cl-tres">
          <Dato grande valor={activas} etiqueta="Activas hoy" />
          <Dato valor={mes.cuentas} etiqueta={`Pide el mes ${n}`} />
        </div>
        <GranjaBarras real={real} plan={mes.cuentas} actual={n} que="Cuentas activas" unidad="cuentas" />
        {orden.length > 0 && <Boton variante="primario" ancho icono="mas" onClick={() => hoja.abrir()}>Nueva cuenta</Boton>}
      </Tarjeta>

      <Grupo titulo="Cuentas" extremo={<span className="t-rotulo">{orden.length} en total</span>}>
        {orden.length === 0 ? (
          <Vacio ilustracion="datos" titulo="Sin cuentas todavía" texto="Arrancá con 3 cuentas base (TikTok, Reels, Shorts), cada una con su nicho." accion={<Boton variante="primario" icono="mas" onClick={() => hoja.abrir()}>Nueva cuenta</Boton>} />
        ) : (
          <div className="capa-1 s-lista">
            {orden.map((c) => (
              <Fila key={c.id} titulo={c.alias} valor={<EstadoClip estado={c.estado} />} onClick={() => hoja.abrir(c)}
                nota={<>{c.red} · {c.nicho || 'sin nicho'}{c.estilo ? ` · ${c.estilo}` : ''}<br />{ritmo(c.id)} clips en 7 días</>} />
            ))}
          </div>
        )}
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="candado" titulo="Reglas de identidad" nota="Para que no las lean como una granja" valor={String(CLIP.reglasCuentas.length)}>
            <ul className="cl-lista">{CLIP.reglasCuentas.map((t) => <li key={t}>{t}</li>)}</ul>
          </FilaHoja>
        </div>
      </Grupo>

      <Hoja abierta={hoja.abierta} onCerrar={hoja.cerrar} titulo={hoja.item ? hoja.item.alias : 'Nueva cuenta'}>
        <Formulario key={`${hoja.clave}:${hoja.item?.id ?? 'nueva'}`} cuenta={hoja.item} hoy={date} onCerrar={hoja.cerrar} />
      </Hoja>
    </Marco>
  );
}

const REDES = ['TikTok', 'Reels', 'Shorts', 'X', 'Otra'];

function Formulario({ cuenta, hoy, onCerrar }: { cuenta?: Cuenta; hoy: string; onCerrar: () => void }) {
  const [x, setX] = useState({ alias: cuenta?.alias ?? '', red: cuenta?.red ?? 'TikTok', nicho: cuenta?.nicho ?? '', estilo: cuenta?.estilo ?? '', estado: cuenta?.estado ?? ('calentando' as EstadoCuenta), desde: cuenta?.desde ?? hoy });
  const ok = !!x.alias.trim() && /^\d{4}-\d{2}-\d{2}$/.test(x.desde);
  const nichos = [{ valor: '', etiqueta: 'Sin nicho' }, ...CLIP.nichos.map((nn) => ({ valor: nn.nombre, etiqueta: nn.nombre, nota: `riesgo ${nn.riesgo}` })), ...(x.nicho && !CLIP.nichos.some((nn) => nn.nombre === x.nicho) ? [{ valor: x.nicho, etiqueta: x.nicho }] : [])];
  const redes = [...REDES, ...(REDES.includes(x.red) ? [] : [x.red])];
  const guardar = () => {
    if (!ok) return;
    const datos = { id: cuenta?.id, alias: x.alias.trim(), red: x.red, nicho: x.nicho, estilo: x.estilo.trim() || undefined, estado: x.estado, desde: x.desde };
    const id = guardarCuenta(datos);
    aviso({ titulo: cuenta ? 'Cuenta actualizada' : 'Cuenta guardada', sub: datos.alias, tono: 'hecho', deshacer: () => (cuenta ? guardarCuenta(cuenta) : borrarCuenta(id)) });
    onCerrar();
  };
  const borrar = () => {
    if (!cuenta) return;
    borrarCuenta(cuenta.id);
    aviso({ titulo: 'Cuenta borrada', sub: cuenta.alias, deshacer: () => guardarCuenta(cuenta) });
    onCerrar();
  };
  return (
    <form className="cl-form" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      <CampoTexto etiqueta="Alias" valor={x.alias} onCambio={(v) => setX({ ...x, alias: v })} placeholder="gta.cortes" />
      <Selector etiqueta="Red" valor={x.red} onCambio={(v) => setX({ ...x, red: v })} opciones={redes.map((r) => ({ valor: r, etiqueta: r }))} />
      <Selector etiqueta="Nicho" valor={x.nicho} onCambio={(v) => setX({ ...x, nicho: v })} opciones={nichos} />
      <CampoTexto etiqueta="Estilo (subtítulos, ritmo, horarios)" valor={x.estilo} onCambio={(v) => setX({ ...x, estilo: v })} placeholder="Subtítulos amarillos, 3 clips a la tarde" />
      <Selector etiqueta="Estado" valor={x.estado} onCambio={(v) => setX({ ...x, estado: v })} opciones={ESTADOS_CUENTA.map((s) => ({ valor: s, etiqueta: palabraEstado(s) }))} />
      <CampoFecha etiqueta="Desde" valor={x.desde} onCambio={(v) => setX({ ...x, desde: v })} hoy={hoy} />
      <div className="cl-acciones">
        <Boton variante="primario" ancho tipo="submit" icono="tilde" deshabilitado={ok ? false : 'Ponele un alias a la cuenta.'}>Guardar</Boton>
        {cuenta && <Boton variante="fantasma" icono="borrar" onClick={borrar}>Borrar la cuenta</Boton>}
      </div>
    </form>
  );
}
