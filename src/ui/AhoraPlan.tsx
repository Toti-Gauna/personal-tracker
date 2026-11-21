/**
 * v12.1 · lo del plan para hoy, en Hoy y en Períodos: "Activo ahora: Fase 1 › PetrIA › v1.0 › lote 1.3", lo que vence hoy, la
 * próxima fecha límite, los avisos para reservar exámenes y los hábitos con su racha.
 */
import { recordatoriosActivos } from '../data/certs-v12';
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
