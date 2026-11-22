/**
 * v12.1 · lo del plan para hoy, en Hoy y en Períodos: "Activo ahora: Fase 1 › PetrIA › v1.0 › lote 1.3", lo que vence hoy, la
 * próxima fecha límite, los avisos para reservar exámenes y los hábitos con su racha.
 */
import { recordatoriosActivos } from '../data/certs-v12';
import { alertasCompras } from '../data/compras';
import { ESTADO_COMERCIAL_TXT, fondoEn, metaRevisionSemana, recordatoriosFondo, revisionSemana } from '../data/fondo';
import { addDays } from '../data/time';
import { estadoHabitos } from '../data/habitos';
import { activoAhora, proximaFechaLimite, vencenHoy, type PeriodoMedido } from '../data/periodos';
import { daysBetween } from '../data/time';
import type { DayLog } from '../data/types';
import { marcarHito } from '../state/plan';
import { useStore } from '../state/store';
import { fp, hrefPeriodo } from './PeriodoTarjeta';
import '../styles/periodos.css';

const corto = (p: PeriodoMedido) => (p.nivel === 'fase' ? `Fase ${p.id.slice(1)}` : p.nivel === 'version' ? `v${p.id.split(':v')[1]}` : p.nivel === 'lote' ? `lote ${p.id.split(':lote:')[1]}` : p.nivel === 'hito' ? `hito ${p.id.split(':hito:')[1]}` : p.nombre);

export function AhoraPlan({ hoy, arbol, day, conHabitos = true }: { hoy: string; arbol: PeriodoMedido[]; day?: DayLog; conHabitos?: boolean }) {
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const cadena = activoAhora(arbol, hoy).filter((p) => p.nivel !== 'etapa');
  const vence = vencenHoy(arbol, hoy).filter((p) => p.nivel !== 'etapa' && p.nivel !== 'fase');
  const prox = proximaFechaLimite(arbol, hoy, ['bloque', 'version', 'cert']);
  const avisos = recordatoriosActivos(plan, hoy);
  // v12.1: hardware y trámites, 30 días antes de cada fecha límite (los trámites, desde ya).
  const compras = alertasCompras(plan, hoy);
  // v12.2: lo de fondo (no usa horas de foco): la app secundaria y el slot comercial activos, y la revisión de la semana.
  const fondo = fondoEn(hoy);
  const lunes = addDays(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7));
  const rev = revisionSemana(plan.revisionFondo, lunes);
  const meta = metaRevisionSemana(lunes);
  const avisosFondo = recordatoriosFondo(plan, hoy);
  const habitos = conHabitos ? estadoHabitos(day ? { ...days, [day.date]: day } : days, hoy) : [];
  return (
    <section className="pd-ahora" aria-label="Lo del plan para hoy">
      <span className="pd-cadena">
        {cadena.length ? <><b>Activo ahora:</b> {cadena.map((p, i) => <span key={p.id}>{i ? ' › ' : ''}<a href={hrefPeriodo(p.id)}>{corto(p)}</a></span>)}</> : <b>Sin período activo hoy</b>}
      </span>
      {vence.length > 0 && <small><b>Vence hoy:</b> {vence.map((p) => p.nombre).join(' · ')}</small>}
      {prox && <small><b>Próxima fecha límite:</b> {prox.periodo.nombre} · {fp(prox.fecha)} (en {daysBetween(hoy, prox.fecha)} {daysBetween(hoy, prox.fecha) === 1 ? 'día' : 'días'})</small>}
      {avisos.map((a) => (
        <small key={a.id} className="pd-aviso">
          <b>Reservar:</b> {a.texto}{a.faltan.length ? ` (faltan ${a.faltan.length})` : ''} · <a href={a.faltan[0] ? `#/metas/cert/${a.faltan[0]}` : '#/estudio/idiomas'}>{a.faltan[0] ? 'reservar' : 'ver'}</a>
          {!a.certs?.length && <> · <button className="subrayado" onClick={() => marcarHito(`v12:recordatorio:${a.id}`, hoy)}>ya reservé</button></>}
        </small>
      ))}
      {compras.map((c) => <small key={c.id}><b>Hardware:</b> {c.titulo} · <a href={c.href}>ver</a></small>)}
      <div className="pd-fondo" aria-label="De fondo">
        {fondo.pausa ? <small><b>De fondo:</b> en pausa ({fondo.pausa.nombre})</small> : (
          <small>
            <b>De fondo:</b>{' '}
            {fondo.secundaria.length ? fondo.secundaria.map((x, i) => <span key={x.app.id + x.version}>{i ? ' + ' : ''}<a href={`#/metas/fondo/${x.app.id}`}>{x.app.nombre} v{x.version}</a></span>) : 'sin app secundaria'}
            {' · '}
            {fondo.comercial ? <a href={`#/metas/fondo/${fondo.comercial.id}`}>#{fondo.comercial.n} {fondo.comercial.marca ?? plan.fondo?.[fondo.comercial.id]?.marca ?? 'a definir'} ({ESTADO_COMERCIAL_TXT[plan.fondo?.[fondo.comercial.id]?.estado ?? 'planned']})</a> : 'sin showcase'}
            {' · '}revisión {Math.round((rev.min / 60) * 10) / 10} / {meta.walkthroughMin / 60} h esta semana
          </small>
        )}
        {avisosFondo.map((a) => <small key={a.id}><b>Fondo:</b> {a.texto}{a.href ? <> · <a href={a.href}>ver</a></> : null} · <button className="subrayado" onClick={() => marcarHito(`v12:recordatorio:${a.id}`, hoy)}>listo</button></small>)}
      </div>
      {habitos.length > 0 && (
        <ul className="pd-habitos" aria-label="Hábitos">
          {habitos.map((h) => (
            <li key={h.habito.id}>
              <span>{h.hoy.toca ? (h.hoy.hecho ? '✓ ' : '○ ') : '· '}{h.habito.nombre}</span>
              <span className="pd-racha">{h.racha} {h.racha === 1 ? 'vez' : 'seguidas'}</span>
              <span className="pd-dias" aria-hidden="true">{h.semana.map((d) => <i key={d.fecha} className={d.hecho == null ? 'no' : d.hecho ? 'on' : ''} />)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
