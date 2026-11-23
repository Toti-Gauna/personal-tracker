/**
 * Trazo 2.0 · las 4 etapas del plan (#/metas/etapas): quién sos hoy y quién vas a ser, las alertas (certificaciones, ventanas,
 * decisiones, hardware y trámites), cada etapa con sus bloques y las decisiones que se toman a mano.
 */
import { useState } from 'react';
import { T0_PLAN } from '../../data/plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { alertas, hoySos, lineaEtapas } from '../../data/plan-vistas';
import { inicioTrabajo, useStore } from '../../state/store';
import { Icono, type NombreIcono } from '../iconos';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { dmy } from './datos';
import './metas.css';

const TIPO: Record<string, string> = { proyecto: 'proyecto', ventana: 'ventana de matemática', cert: 'certificación', descanso: 'descanso', colchon: 'colchón', cierre: 'cierre', sumas: 'semana de sumas' };
const ICONO_ALERTA: Record<string, NombreIcono> = { cert: 'certificado', ventana: 'matematica', decision: 'meta', idioma: 'idioma', clipping: 'grafico', matematica: 'matematica', control: 'reloj', compra: 'hardware' };
const VISTAS = 3;

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada etapa deja un perfil vendible.</p>
    <p className="t-cuerpo">Cortar en cualquier cierre no pierde lo anterior: lo que ya sumaste queda. «Hoy sos» es el perfil del último proyecto que cerraste.</p>
    <p className="t-cuerpo">En la barra de cada etapa, un tramo por bloque: lleno si ya pasó, con borde si es el de ahora. Tocá uno para entrar. Con una rayita son las certificaciones y con puntos las ventanas de matemática.</p>
    <p className="t-cuerpo">Las decisiones abiertas se deciden a mano: Trazo no las resuelve.</p>
  </>
);

export default function EtapasV2({ day }: PropsV2) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const clipping = useStore((s) => s.clipping);
  const days = useStore((s) => s.days);
  const inicio = useStore((s) => inicioTrabajo(s.settings));
  const hoy = day.date;
  const etapas = lineaEtapas(hoy, t0);
  const total = etapas.reduce((s, e) => s + e.semanas, 0);
  const sos = hoySos(hoy, plan, t0);
  const al = alertas(hoy, plan, t0, clipping, { days, inicioTrabajo: inicio });
  const [todas, setTodas] = useState(false);
  const decisiones = PLAN_EXT.decisiones.filter((d) => !d.resuelta);

  return (
    <Marco className="mt" titulo="Las 4 etapas" rotulo={`${total} semanas`} volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      <Tarjeta heroe etiqueta="Hoy sos" className="mt-heroe">
        <p className="t-rotulo">Hoy sos</p>
        <h2 className="t-seccion">{sos.sos?.perfil ?? 'Todavía sin proyecto cerrado'}</h2>
        {sos.sos && <p className="t-nota">{sos.sos.desde}</p>}
        {sos.vasASer && (
          <div className="mt-vas">
            <p className="t-rotulo">Vas a ser</p>
            <p className="t-encabezado">{sos.vasASer.perfil}</p>
            <p className="t-nota">Con {sos.vasASer.con}, hasta el {dmy(sos.vasASer.fin)}.</p>
          </div>
        )}
      </Tarjeta>

      {etapas.map((e) => (
        <Grupo key={e.n} titulo={`Etapa ${e.n} · ${e.nombre}`} extremo={e.estado === 'actual' ? <span className="mt-aca t-rotulo">Estás acá</span> : <span className="t-rotulo">{e.semanas} sem</span>}>
          <Tarjeta className={`mt-etapa ${e.estado}`} etiqueta={`Etapa ${e.n}`}>
            <p className="t-rotulo">{dmy(e.inicio)} – {dmy(e.fin)}</p>
            <div className="mt-etapa-barra" role="group" aria-label={`Etapa ${e.n}: ${e.bloques.map((b) => `${b.id} ${b.semanas} semanas`).join(', ')}`} data-grafico>
              {e.bloques.map((b) => (
                <a key={b.id} href={`#/metas/proyecto/${b.id}`} className={`mt-bloque ${b.tipo} ${b.estado}`} style={{ flexGrow: b.semanas }} aria-label={`${b.id}, ${b.nombre}, ${dmy(b.inicio)} a ${dmy(b.fin)}`}>
                  <span>{b.semanas >= 3 ? b.id : ''}</span>
                </a>
              ))}
            </div>
            <p className="t-cuerpo mt-perfil"><Icono nombre="siguiente" lado={14} titulo="Al cerrarla sos" />{e.perfil}</p>
            <FilaHoja icono="linea" titulo={`Los ${e.bloques.length} bloques`} tituloHoja={`Etapa ${e.n} · ${e.nombre}`}>
              <div className="capa-1 s-lista">
                {e.bloques.map((b) => (
                  <Fila key={b.id} titulo={`${b.id} · ${b.nombre}`} href={`#/metas/proyecto/${b.id}`}
                    nota={`${b.pausa ? 'Pausa de fin de año' : TIPO[b.tipo]} · ${dmy(b.inicio)} · ${b.horas ? `${b.horas} h` : `${b.semanas} sem`}${b.semanas > b.base && !b.pausa && b.horas == null && b.dias == null ? ` (+${b.semanas - b.base - b.atraso})` : ''}${b.alternativa ? ` · o ${b.alternativa}` : ''}${b.recortable ? ' · recortable' : ''}${b.pausasDentro?.length ? ' · partido por la pausa' : ''}`}
                    valor={b.estado === 'actual' ? 'Ahora' : b.estado === 'hecho' ? 'Pasó' : undefined} />
                ))}
              </div>
            </FilaHoja>
          </Tarjeta>
        </Grupo>
      ))}

      {al.length > 0 && (
        <Grupo titulo="Alertas" extremo={<span className="t-rotulo">{al.length}</span>}>
          <div className="capa-1 s-lista">
            {al.slice(0, VISTAS).map((a) => <Fila key={a.id} icono={ICONO_ALERTA[a.tipo] ?? 'alerta'} titulo={a.titulo} nota={a.texto} href={a.href} />)}
          </div>
          {al.length > VISTAS && <Boton tamano="s" variante="fantasma" icono="abajo" onClick={() => setTodas(true)}>Ver las {al.length - VISTAS} más</Boton>}
          <Hoja abierta={todas} onCerrar={() => setTodas(false)} titulo="Alertas del plan">
            <div className="capa-1 s-lista">
              {al.map((a) => <Fila key={a.id} icono={ICONO_ALERTA[a.tipo] ?? 'alerta'} titulo={a.titulo} nota={a.texto} href={a.href} />)}
            </div>
          </Hoja>
        </Grupo>
      )}

      <Grupo titulo="Decisiones y más">
        <div className="capa-1 s-lista">
          {decisiones.length > 0 ? (
            <FilaHoja icono="meta" titulo="Decisiones abiertas" nota="Se deciden a mano" valor={String(decisiones.length)} tituloHoja="Decisiones abiertas">
              <ul className="capa-1 pt-revs">
                {decisiones.map((d) => <li key={d.id}><span className="t-cuerpo">{d.texto}</span>{d.fecha && <span className="t-rotulo">{dmy(d.fecha)}</span>}</li>)}
              </ul>
              <p className="t-nota pt-pie">Trazo no las resuelve: las decidís vos.</p>
            </FilaHoja>
          ) : <Fila icono="meta" titulo="Decisiones abiertas" nota="Ninguna por ahora" />}
          <Fila icono="calendario" titulo="Períodos" nota="Tiempo contra trabajo" href="#/metas/periodos" />
          <Fila icono="linea" titulo="Línea de tiempo" href="#/metas/linea" />
          <Fila icono="repaso" titulo="Revisión semanal" href="#/metas/revision" />
          <Fila icono="hardware" titulo="Hardware y trámites" href="#/metas/compras" />
          <Fila icono="grafico" titulo="Diferencia con el plan v12.1" href="#/metas/diferencia" />
          <Fila icono="ritmo" titulo="Calibración" nota="Horas reales y escenarios" href="#/metas/calibracion" />
        </div>
      </Grupo>
    </Marco>
  );
}
