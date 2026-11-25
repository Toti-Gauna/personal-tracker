/**
 * Trazo 2.0 · lo del plan para hoy. La 1.0 lo mostraba como un recuadro de texto; acá son tres filas (lo activo, lo que
 * vence y el próximo límite), lo de fondo como chips, y los avisos juntos en una hoja que se abre desde la campana.
 */
import { useState } from 'react';
import { atrasoPrincipal } from '../../data/atraso';
import { recordatoriosActivos } from '../../data/certs-v12';
import { alertasCompras } from '../../data/compras';
import { ESTADO_COMERCIAL_TXT, fondoEn, metaRevisionSemana, recordatoriosFondo, revisionSemana } from '../../data/fondo';
import { activoAhora, proximaFechaLimite, vencenHoy, type PeriodoMedido } from '../../data/periodos';
import { faseComercial, pistasActivas } from '../../data/pistas-dia';
import { addDays, daysBetween } from '../../data/time';
import type { DayLog } from '../../data/types';
import { marcarHito } from '../../state/plan';
import { useStore } from '../../state/store';
import { useAvisosRamas } from '../../ui/plan-bits';
import { fp, hrefPeriodo } from '../../ui/periodos';
import { usePeriodos } from '../../ui/usePeriodos';
import { Icono } from '../iconos';
import { aviso, confirmar } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Vacio } from '../kit/superficies';
import { Grupo } from '../marco/Marco';

export interface AvisoHoy { id: string; titulo: string; texto?: string; href?: string; accion?: { etiqueta: string; run: () => void } }

const corto = (p: PeriodoMedido) => (p.nivel === 'fase' ? `Fase ${p.id.slice(1)}` : p.nivel === 'version' ? `v${p.id.split(':v')[1]}` : p.nivel === 'lote' ? `Lote ${p.id.split(':lote:')[1]}` : p.nivel === 'hito' ? `Hito ${p.id.split(':hito:')[1]}` : p.nombre);
const horas = (min: number) => String(Math.round((min / 60) * 10) / 10).replace('.', ',');

/** v12.4 · el aviso del atraso acumulado: cuánto, el nuevo fin estimado y qué pausar primero (lo comercial) y después (lo secundario). */
export function textoAtraso(a: ReturnType<typeof atrasoPrincipal>) {
  const com = a.sugerencias.find((x) => x.pista === 'comercial');
  const pausar = a.sugerencias.length
    ? ` Pausá primero lo comercial${com ? ` (devuelve 1 h por día: unos ${com.diasRecuperados} días hasta el final)` : ''} y, si no alcanza, lo secundario.`
    : '';
  return { titulo: `Vas ${a.dias} días atrasado`, texto: `La principal termina el ${fp(a.finEstimado)} en vez del ${fp(a.finPlan)}.${pausar}` };
}

/** Todo lo del plan que le importa a hoy, ya ordenado para dibujar. */
export function usePlanHoy(day: DayLog) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const { arbol, cal } = usePeriodos(hoy);
  const ramas = useAvisosRamas(hoy, day);
  const cadena = activoAhora(arbol, hoy).filter((p) => p.nivel !== 'etapa');
  const vence = vencenHoy(arbol, hoy).filter((p) => p.nivel !== 'etapa' && p.nivel !== 'fase');
  const prox = proximaFechaLimite(arbol, hoy, ['bloque', 'version', 'cert']);
  const fondo = fondoEn(hoy);
  const lunes = addDays(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7));
  const revision = { min: revisionSemana(plan.revisionFondo, lunes).min, meta: metaRevisionSemana(lunes).walkthroughMin + metaRevisionSemana(lunes).comercialMin };
  // v12.4: la revisión de hoy (1 h por pista activa) y el atraso acumulado de la principal (alerta a partir de más de 7 días).
  const hoyRev = { min: (plan.revisionFondo ?? []).filter((x) => x.fecha === hoy).reduce((s, x) => s + x.min, 0), meta: pistasActivas(hoy).length * 60 };
  const atraso = atrasoPrincipal(arbol, cal, plan, hoy);
  const pasarAConTrabajo = async () => {
    if (!(await confirmar({ titulo: '¿Pasar a la rutina con trabajo?', texto: 'De lunes a viernes, desde el próximo día que empieces.', accion: 'Pasar' }))) return;
    ramas.aplicarRutinaConTrabajo();
    aviso({ titulo: 'Rutina con trabajo', sub: 'Desde el próximo Buen día', tono: 'hecho' });
  };
  const avisos: AvisoHoy[] = [
    ...ramas.avisos.map((a) => ({ id: a.id, titulo: a.titulo, texto: a.texto, href: a.href, accion: a.accion ? { etiqueta: 'Pasar a esa rutina', run: () => { void pasarAConTrabajo(); } } : undefined })),
    ...recordatoriosActivos(plan, hoy).map((a) => ({
      id: `reserva-${a.id}`, titulo: `Reservar: ${a.texto}`, texto: a.faltan.length ? `${a.faltan.length === 1 ? 'Falta 1 examen' : `Faltan ${a.faltan.length} exámenes`} por reservar.` : undefined,
      href: a.faltan[0] ? `#/metas/cert/${a.faltan[0]}` : '#/estudio/idiomas',
      accion: a.certs?.length ? undefined : { etiqueta: 'Ya reservé', run: () => marcarHito(`v12:recordatorio:${a.id}`, hoy) },
    })),
    ...alertasCompras(plan, hoy).map((c) => ({ id: `compra-${c.id}`, titulo: c.titulo, texto: c.texto, href: c.href })),
    ...(atraso.excede ? [{ id: 'atraso-principal', titulo: textoAtraso(atraso).titulo, texto: textoAtraso(atraso).texto, href: '#/metas/periodos' }] : []),
    ...recordatoriosFondo(plan, hoy).map((a) => ({ id: `fondo-${a.id}`, titulo: a.texto, href: a.href, accion: { etiqueta: 'Listo', run: () => marcarHito(`v12:recordatorio:${a.id}`, hoy) } })),
  ];
  const comercial = fondo.comercial ? { ...fondo.comercial, marcaVisible: fondo.comercial.marca ?? plan.fondo?.[fondo.comercial.id]?.marca ?? fondo.comercial.sector ?? 'a definir', estado: ESTADO_COMERCIAL_TXT[plan.fondo?.[fondo.comercial.id]?.estado ?? 'planned'] } : null;
  return { hoy, cadena, vence, prox, fondo, comercial, revision, hoyRev, atraso, avisos };
}

type PlanHoyDatos = ReturnType<typeof usePlanHoy>;

/** La tarjeta "Plan": lo activo, lo que vence hoy y el próximo límite; debajo, lo de fondo. */
export function PlanHoy({ p, bimestre }: { p: PlanHoyDatos; bimestre?: string }) {
  const [verVence, setVerVence] = useState(false);
  const activo = p.cadena[p.cadena.length - 1];
  const dias = p.prox ? daysBetween(p.hoy, p.prox.fecha) : 0;
  const hayFondo = !!p.fondo.pausa || p.fondo.secundaria.length > 0 || !!p.comercial || p.revision.meta > 0;
  return (
    <Grupo titulo="Plan" extremo={bimestre ? <span className="t-rotulo">{bimestre}</span> : undefined}>
      <div className="capa-1 s-lista">
        {p.atraso.excede && <Fila icono="alerta" titulo={textoAtraso(p.atraso).titulo} nota={textoAtraso(p.atraso).texto} href="#/metas/periodos" />}
        {activo
          ? <Fila icono="plan" titulo={activo.nombre} nota={p.cadena.slice(0, -1).map(corto).join(' › ') || 'Activo ahora'} href={hrefPeriodo(activo.id)} />
          : <Fila icono="plan" titulo="Sin período activo hoy" nota="Ver el plan" href="#/metas/periodos" />}
        {p.vence.length > 0 && <Fila icono="reloj" titulo="Vencen hoy" valor={p.vence.length} onClick={() => setVerVence(true)} />}
        {p.prox && <Fila icono="calendario" titulo={p.prox.periodo.nombre} nota={`Próximo límite · ${fp(p.prox.fecha)}`} valor={dias === 1 ? '1 día' : `${dias} días`} href={hrefPeriodo(p.prox.periodo.id)} />}
      </div>
      {hayFondo && (
        <div className="hy-fondo" aria-label="En el fondo">
          <span className="t-rotulo">En el fondo</span>
          {p.fondo.pausa && <span className="hy-chip"><Icono nombre="pausa" lado={16} />En pausa · {p.fondo.pausa.nombre}</span>}
          {p.fondo.secundaria.map((x) => <a key={x.app.id + x.version} className="hy-chip" href={`#/metas/fondo/${x.app.id}`}><Icono nombre="fondo" lado={16} />{x.app.nombre} v{x.version}</a>)}
          {p.comercial && <a className="hy-chip" href={`#/metas/fondo/${p.comercial.id}`}><Icono nombre="cohete" lado={16} />#{p.comercial.n} {p.comercial.marcaVisible} · {faseComercial(p.fondo.comercial!, p.hoy) === 'venta' ? 'venta' : 'build'}</a>}
          {p.hoyRev.meta > 0 && <a className="hy-chip" href="#/metas/pista/secundaria"><Icono nombre="ojo" lado={16} />Revisión de hoy {horas(p.hoyRev.min)} de {horas(p.hoyRev.meta)} h</a>}
          {p.revision.meta > 0 && <a className="hy-chip" href="#/metas/pista/secundaria"><Icono nombre="ojo" lado={16} />Revisión {horas(p.revision.min)} de {horas(p.revision.meta)} h</a>}
        </div>
      )}
      <Hoja abierta={verVence} onCerrar={() => setVerVence(false)} titulo="Vencen hoy">
        <div className="capa-2 s-lista">
          {p.vence.map((v) => <Fila key={v.id} titulo={v.nombre} nota={corto(v) !== v.nombre ? corto(v) : undefined} href={hrefPeriodo(v.id)} />)}
        </div>
      </Hoja>
    </Grupo>
  );
}

/** La hoja de avisos (la campana): cada aviso con lo que hay que hacer. */
export function HojaAvisos({ avisos, abierta, onCerrar }: { avisos: AvisoHoy[]; abierta: boolean; onCerrar: () => void }) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Avisos">
      {avisos.length === 0 && <Vacio ilustracion="avisos" titulo="Sin avisos" texto="Cuando el plan necesite algo de vos, aparece acá." />}
      {avisos.map((a) => (
        <article key={a.id} className="capa-2 hy-aviso">
          <b className="t-cuerpo-l">{a.titulo}</b>
          {a.texto && <p className="t-nota">{a.texto}</p>}
          {(a.href || a.accion) && (
            <div className="hy-aviso-botones">
              {a.href && <Boton tamano="s" href={a.href}>Ver</Boton>}
              {a.accion && <Boton tamano="s" variante={a.href ? 'fantasma' : 'secundario'} icono="tilde" onClick={a.accion.run}>{a.accion.etiqueta}</Boton>}
            </div>
          )}
        </article>
      ))}
    </Hoja>
  );
}
