/**
 * Trazo 2.0 · la ruta (#/metas/ruta): en qué semana del plan T+18 estás, las seis ramas con su etapa y su avance, lo que una rama le
 * entrega a otra, los hitos, el colchón de semanas, el clipping y el sprint de búsqueda cuando está activo.
 */
import { CLIP, MESES_CLIP, COLOR_CLIP, faseDe, mesDe, mesPlan } from '../../data/clipping';
import { mesContraMeta } from '../../data/clipping-metricas';
import { PLAN, SEMANAS, fechaCorta, fechaHito, hitoSemana, proximasEntregas, proyectos, type Entrega } from '../../data/plan';
import { RAMA_NOMBRE } from '../../data/ramas';
import { cierreProyecto, semanasGanadas } from '../../data/puertas';
import { sprintActual } from '../../data/sprint';
import { fmtFecha } from '../../data/time';
import { useState } from 'react';
import { planSettings, useStore } from '../../state/store';
import { usePlanVista } from '../../ui/usePlan';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Barra, Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import type { PropsV2 } from '../registro';
import { colorRama, dmy, mesAnio, pct } from './datos';
import { Pestanas } from './piezas';
import { colorV2 } from '../hoy/datos';
import './metas.css';

const usd = (v: number) => `USD ${Math.round(v).toLocaleString('es-AR')}`;
const nombreRama = (r: string) => (r === 'main' ? 'Trazo' : RAMA_NOMBRE[r as keyof typeof RAMA_NOMBRE] ?? r);

const INFO = (
  <>
    <p className="t-cuerpo-l">El plan T+18: seis ramas que salen de Trazo y vuelven juntas en T+18.</p>
    <p className="t-cuerpo">Cada rama muestra en qué etapa estás y cuánto llevás. Tocala para entrar. La barra de arriba son las {SEMANAS} semanas del plan; las marcas son los hitos.</p>
    <p className="t-cuerpo">«Lo que viene» son las entregas de una rama a otra: lo que una termina y la otra necesita.</p>
    <p className="t-cuerpo">El colchón son las semanas que ganaste en la etapa 1: una puerta de matemática sin aprobar las consume.</p>
  </>
);

export default function RutaV2({ day }: PropsV2) {
  const date = day.date;
  const plan = useStore((s) => s.plan);
  const clipping = useStore((s) => s.clipping);
  const intensiva = useStore((s) => planSettings(s.settings).modo === 'busqueda-intensiva');
  const [detalle, setDetalle] = useState(false);
  const v = usePlanVista(date);
  const hitos = PLAN.hitos.filter((h) => h.id !== 'T+0');
  const marcas = new Set(PLAN.hitos.map((h) => h.semana));
  // Entrevistas cargadas: lo que falle pasa a tarjetas de inglés.
  const extra: Entrega[] = v.ent ? [{ de: 'trabajo', a: 'ingles', fecha: v.ent.fecha, texto: `Entrevista del ${fmtFecha(v.ent.fecha).split(' ').slice(0, 2).join(' ').toLowerCase()}: lo que falle pasa a tarjetas de inglés` }] : [];
  const viene = proximasEntregas(date, 4, extra, v.t0);
  const sprint = intensiva ? sprintActual(date, plan, v.t0) : null;
  const ganadas = semanasGanadas(plan, date, v.t0);
  const total = proyectos().filter((p) => p.id !== 'P0').length;
  const cerrados = proyectos().filter((p) => p.id !== 'P0' && cierreProyecto(plan, p.id)).length;
  const pctPlan = Math.round((v.semana / SEMANAS) * 100);
  // El clipping: el mes del roadmap de 12 y lo cobrado contra su meta.
  const nClip = mesDe(date);
  const nPlanClip = Math.min(Math.max(nClip, 1), MESES_CLIP);
  const vsMeta = mesContraMeta(clipping, date);
  const mesClip = mesPlan(nPlanClip);
  const faseClip = faseDe(nPlanClip);
  const cobrado = vsMeta?.cobrado ?? 0;
  const clipEstado = nClip >= 1 && nClip <= 12 ? `Mes ${nClip} de 12 · fase ${faseClip?.n ?? 1}` : nClip < 1 ? `Arranca el ${fechaCorta(CLIP.t0)}` : 'Año cerrado';
  const colchon = `${ganadas.total > 0 ? '+' : ''}${ganadas.total}`;

  return (
    <Marco className="mt" titulo="Metas" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      <Pestanas actual="ruta" />

      <Tarjeta heroe etiqueta="Semana del plan" className="mt-heroe">
        <p className="t-rotulo">B{v.bim.n} · {v.nombreBim} · {dmy(date)}</p>
        <Dato grande valor={<Numero valor={v.semana} />} unidad={`de ${SEMANAS}`} etiqueta="Semana del plan" />
        <figure className="mt-segs" role="img" aria-label={`Semana ${v.semana} de ${SEMANAS}`} data-grafico style={{ ['--n' as string]: SEMANAS }}>
          {Array.from({ length: SEMANAS }, (_, i) => {
            const n = i + 1;
            return <span key={n} className={`${n < v.semana ? 'pasada' : n === v.semana ? 'actual' : ''}${marcas.has(n) ? ' hito' : ''}`} />;
          })}
        </figure>
      </Tarjeta>

      <Grupo titulo="Las seis ramas" extremo={<Boton tamano="s" variante="fantasma" icono={detalle ? 'arriba' : 'abajo'} onClick={() => setDetalle((x) => !x)}>{detalle ? 'Menos detalle' : 'Ver el detalle'}</Boton>}>
        <ul className="capa-1 mt-lista mt-ramas">
          {v.ramas.map((r) => (
            <li key={r.rama} className={r.pausa ? 'standby' : undefined} style={{ ['--area' as string]: colorRama(r.rama) }}>
              <a href={r.href} className="mt-rama-fila">
                <span className="mt-rama-nombre"><i className="area-punto" />{RAMA_NOMBRE[r.rama]}</span>
                <span className="mt-rama-lado t-dato">{r.lado}</span>
                <b className="t-cuerpo mt-rama-titulo">{r.titulo}</b>
                {detalle && <small className="mt-rama-sub">{r.sub}</small>}
                {r.riesgo && <small className="mt-riesgo"><Icono nombre="atencion" lado={14} />{r.riesgo}</small>}
                <span className="mt-rama-barra"><Barra valor={r.avance} max={1} nombre={`${RAMA_NOMBRE[r.rama]}: ${Math.round(r.avance * 100)} %`} area={colorRama(r.rama)} /></span>
              </a>
            </li>
          ))}
        </ul>
      </Grupo>

      <Grupo titulo="Lo que viene" extremo={<span className="t-rotulo">Entre ramas</span>}>
        <div className="capa-1 s-lista">
          {viene.map((e, i) => <Fila key={i} titulo={e.texto} nota={`${nombreRama(e.de)} → ${nombreRama(e.a)}`} valor={fechaCorta(e.fecha)} />)}
        </div>
      </Grupo>

      <Grupo titulo="Los hitos">
        <ul className="capa-1 mt-hitos">
          {hitos.map((h) => {
            const hecho = hitoSemana(h.id) <= v.semana;
            return (
              <li key={h.id} className={hecho ? 'hecho' : undefined}>
                <b className="t-rotulo">{h.id}</b>
                <span className="t-cuerpo">{h.titulo}</span>
                <span className="t-dato mt-hito-fecha">{hecho && <Icono nombre="tilde" lado={14} />}{h.id === 'T+18' ? mesAnio(fechaHito(h, v.t0)) : dmy(fechaHito(h, v.t0))}</span>
              </li>
            );
          })}
        </ul>
      </Grupo>

      <Grupo titulo="Más de la ruta">
        <div className="capa-1 s-lista">
          {sprint && <Fila icono="cohete" titulo={`Búsqueda intensiva · día ${sprint.dia} de 14${sprint.numero > 1 ? ` · sprint ${sprint.numero}` : ''}`} nota="Remoto de USD 3.000 a 5.000. Handyx y ventas en stand-by." href="#/metas/sprint" />}
          <Fila icono="reloj" titulo={`${colchon} ${Math.abs(ganadas.total) === 1 ? 'semana' : 'semanas'} de colchón`} nota={`${ganadas.base} de la etapa 1${ganadas.proyectos ? ` · ${ganadas.proyectos > 0 ? '+' : ''}${ganadas.proyectos} por proyectos` : ''}${ganadas.puertas ? ` · −${ganadas.puertas} por puertas` : ''}`} href="#/metas/proyecto" />
          <Fila icono="plan" titulo="Las 4 etapas" nota="Hoy sos, alertas y decisiones" href="#/metas/etapas" />
          <Fila icono="mapa" titulo="El mapa por ramas" nota="Qué depende de qué" href="#/metas/mapa" />
        </div>
      </Grupo>

      <Grupo titulo="Clipping">
        <a className="capa-1 mt-clip" href="#/metas/clipping" style={{ ['--area' as string]: colorV2(COLOR_CLIP) }}>
          <span className="t-rotulo">{clipEstado}</span>
          <span className="mt-clip-tira" aria-hidden="true" data-grafico>{CLIP.meses.map((m) => <i key={m.n} className={m.n < nClip ? 'cerrada' : m.n === nClip ? 'actual' : ''} />)}</span>
          <span className="mt-clip-datos">
            <Dato valor={usd(cobrado)} etiqueta="Cobrado este mes" />
            <Dato valor={usd(mesClip?.meta ?? 0)} etiqueta="Meta del mes" />
          </span>
          <small className="t-nota">Llegás a USD 10k por mes: planilla, métricas y compuertas.</small>
        </a>
      </Grupo>

      <Grupo titulo={`T+18 · ${mesAnio(fechaHito(PLAN.hitos[3], v.t0))}`}>
        <div className="capa-1 mt-final">
          <h3 className="t-encabezado">Senior ML + DevSecOps + cloud</h3>
          <p className="t-nota">10 proyectos en 6 industrias, AWS SAA, Security+ y AWS ML Engineer, examen C1, Handyx decidido y la base matemática hacia la ingeniería.</p>
          <Barra valor={pctPlan} max={100} nombre={`${pct(pctPlan / 100)} del plan`} />
          <p className="t-nota">{pctPlan} % del plan · {cerrados} de {total} proyectos cerrados</p>
        </div>
      </Grupo>
    </Marco>
  );
}
