/**
 * v12.1 · la tarjeta de un período: dos barras (tiempo que pasó y trabajo hecho), el estado, las marcas de estimado y fecha límite en
 * los proyectos, las horas planificadas contra las reales y, en las hojas, la casilla para marcarlo hecho.
 */
import type { EstadoPeriodo, NivelPeriodo, PeriodoMedido } from '../data/periodos';
import { accionDe } from '../data/periodos-plan';
import { marcarHito, publicarVersion } from '../state/plan';
import { Casilla } from './Casilla';
import '../styles/periodos.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fp = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}${d.slice(0, 4) === '2026' ? '' : ` ${d.slice(0, 4)}`}`;
const n1 = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');
const pct = (x: number) => `${Math.round(x * 100)} %`;
/** Para CSS: sin espacio ("40%"). */
const css = (x: number) => `${Math.round(x * 1000) / 10}%`;

export const ESTADO: Record<EstadoPeriodo, string> = { proximo: 'próximo', 'en-plan': 'en plan', adelantado: 'adelantado', atrasado: 'atrasado', vencido: 'vencido', hecho: 'hecho', pausado: 'en pausa' };
export const NIVEL: Record<NivelPeriodo, string> = { etapa: 'Etapa', fase: 'Fase', bloque: 'Bloque', version: 'Versión', lote: 'Lote', capitulo: 'Capítulo', paper: 'Paper', cert: 'Certificación', hito: 'Hito' };
export const hrefPeriodo = (id: string) => `#/metas/periodos/${encodeURIComponent(id)}`;

export function PeriodoTarjeta({ p, hoy, enlace = true, compacta = false }: { p: PeriodoMedido; hoy: string; enlace?: boolean; compacta?: boolean }) {
  const accion = !p.hijos?.length ? accionDe(p.id) : p.nivel === 'version' ? accionDe(p.id) : null;
  const hecho = p.estado === 'hecho';
  const tildar = () => {
    if (!accion) return;
    if (accion.tipo === 'version') publicarVersion(accion.proyecto, accion.version, hecho ? null : hoy);
    else marcarHito(accion.clave, hecho ? null : hoy);
  };
  const cab = (
    <>
      <span className="pd-kicker mono">{NIVEL[p.nivel]} · {fp(p.inicio)} – {fp(p.fin)}{p.deadline ? ` · límite ${fp(p.deadline)}` : ''}{p.aConfirmar ? ' · a confirmar' : ''}</span>
      <b className="pd-nombre">{p.nombre}</b>
    </>
  );
  return (
    <article className={`pd-card ${p.estado}${compacta ? ' compacta' : ''}`} aria-label={`${p.nombre}: ${ESTADO[p.estado]}, tiempo ${pct(p.tiempo)}, trabajo ${pct(p.trabajo)}`}>
      <div className="pd-cab">
        {accion && <Casilla checked={hecho} label={`${p.nombre}: marcar ${accion.tipo === 'version' ? 'publicada' : 'hecho'}`} onChange={tildar} />}
        {enlace && p.hijos?.length ? <a className="pd-tit" href={hrefPeriodo(p.id)}>{cab}</a> : <div className="pd-tit">{cab}</div>}
        <span className={`pd-estado ${p.estado}`}>{ESTADO[p.estado]}</span>
      </div>
      <div className="pd-barras" aria-hidden="true">
        <span className="pd-l mono">tiempo</span><span className="pd-barra"><i style={{ width: css(p.tiempo) }} /></span><span className="pd-n mono">{pct(p.tiempo)}</span>
        <span className="pd-l mono">trabajo</span><span className="pd-barra trabajo"><i style={{ width: css(p.trabajo) }} /></span><span className="pd-n mono">{pct(p.trabajo)}</span>
      </div>
      {p.marcas.deadline != null && !compacta && (
        <div className="pd-marcas" aria-label={`Estimado ${fp(p.fin)}, fecha límite ${fp(p.deadline!)}`}>
          <span className="pd-pista">
            <i className="pd-hoy" style={{ left: css(p.marcas.hoy) }} title="hoy" />
            <i className="pd-est" style={{ left: css(p.marcas.estimado!) }} title="estimado" />
            <i className="pd-dl" style={{ left: '100%' }} title="fecha límite" />
          </span>
          <span className="pd-ley mono"><span>hoy</span><span>▲ estimado {fp(p.fin)}</span><span>■ límite {fp(p.deadline!)}</span></span>
        </div>
      )}
      {(p.horasPlan != null || p.horasReal != null) && !compacta && (
        <p className="pd-horas mono">plan {n1(p.horasPlan ?? 0)} h{p.horasReal != null ? ` · real ${n1(p.horasReal)} h` : ''}</p>
      )}
    </article>
  );
}
