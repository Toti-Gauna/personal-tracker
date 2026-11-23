/**
 * Trazo 2.0 · las Métricas del Clipping (#/metas/clipping/metricas): el ingreso por mes, el camino a USD 10k, el pago real por campaña
 * contra su tarifa, el embudo, la granja contra el plan, la concentración, la actividad, la semana a semana y las views por clip.
 * Mismos cálculos que la 1.0 (data/clipping-metricas); los gráficos son los de la 2.0 (Barras, Curva, Anillo) y cada uno se lee entero.
 */
import { useMemo, useState } from 'react';
import { CLIP, mesCruce, mesDe, MESES_CLIP } from '../../data/clipping';
import { clipsPorDia, concentracion, distribucionViews, embudo, filas, ingresosPorMes, porCampana, proyeccion, rangoPeriodo, semanas, totales } from '../../data/clipping-metricas';
import { addDays } from '../../data/time';
import { useStore } from '../../state/store';
import { Curva } from '../entreno/Curva';
import { Icono } from '../iconos';
import { Segmentado } from '../kit/controles';
import { Anillo, Dato, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { cuentasPorMes, clipsDiaPorMes, corto, fc, n1, pc, usd, usd2 } from './datos';
import { Actividad, BarrasG, GranjaBarras, Pista, type CeldaActividad } from './piezas';
import '../proyecto/proyecto.css';
import '../entreno/entreno.css';
import './clipping.css';

type Periodo = '30' | '90' | 'todo';
type Dim = 'campana' | 'plataforma' | 'nicho';
type Indicador = 'pago' | 'aprob' | 'clips' | 'cuentas';

const INFO = (
  <>
    <p className="t-cuerpo-l">Todos los gráficos del clipping, con la planilla que cargaste.</p>
    <p className="t-cuerpo">El período (30 días, 90 días o todo) cambia el pago real por campaña, el embudo, la concentración, los USD por hora y las views por clip.</p>
    <p className="t-cuerpo">El pago real sale de las filas con cobro cargado; el ingreso por mes suma además los retainers activos.</p>
  </>
);

const AREA = 'var(--a-eclipse)';
const MESES = Array.from({ length: MESES_CLIP }, (_, i) => i + 1);

export default function MetricasV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const clip = useStore((s) => s.clipping);
  const days = useStore((s) => s.days);
  const [p, setP] = useState<Periodo>('30');
  const [dim, setDim] = useState<Dim>('campana');
  const [esc, setEsc] = useState<'cuentas' | 'clips'>('cuentas');
  const [ind, setInd] = useState<Indicador>('pago');
  const n = mesDe(date);
  const nPlan = Math.min(Math.max(n, 1), MESES_CLIP);

  const d = useMemo(() => {
    const r = rangoPeriodo(p, date, clip);
    const fs = filas(clip, r);
    const sem = semanas(clip, days, date, p === '30' ? 5 : p === '90' ? 13 : 12);
    const heatSem = 13;
    const lunes0 = addDays(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7) - 7 * (heatSem - 1));
    const cpd = clipsPorDia(clip, { desde: lunes0, hasta: addDays(lunes0, heatSem * 7 - 1) });
    const plan = CLIP.meses[nPlan - 1].clipsDia;
    const celdas: CeldaActividad[] = Array.from({ length: heatSem * 7 }, (_, i) => {
      const f = addDays(lunes0, i);
      const v = cpd[f] ?? 0;
      return { fecha: f, nivel: v >= plan ? 3 : v >= plan / 2 ? 2 : v > 0 ? 1 : 0, futuro: f > date, hoy: f === date };
    });
    return {
      r, fs, porMes: ingresosPorMes(clip), sem, sem8: semanas(clip, days, date, 8), celdas, proy: proyeccion(clip, date), camp: porCampana(clip, r), emb: embudo(fs),
      conc: concentracion(clip, r), dist: distribucionViews(fs), tot: totales(fs),
      cuentasMes: cuentasPorMes(clip, date, n), clipsMes: clipsDiaPorMes(clip, date, n),
    };
  }, [clip, days, date, p, n, nPlan]);

  const mes12 = d.proy?.mes12 ?? 0;
  const vpc = d.tot.clips ? Math.round(d.tot.views / d.tot.clips) : null;
  const mesActual = CLIP.meses[nPlan - 1];

  // La semana a semana: el indicador elegido en las últimas 8 semanas (las que tienen dato).
  const serie = d.sem8.map((s) => ({ s, v: ind === 'pago' ? s.pagoReal : ind === 'aprob' ? s.aprobacion : ind === 'clips' ? s.clipsDia : s.cuentas })).filter((x): x is { s: (typeof d.sem8)[number]; v: number } => x.v != null);
  const NOMBRE_IND: Record<Indicador, string> = { pago: 'Pago real por 1.000 views, en USD', aprob: 'Aprobación, en porcentaje', clips: 'Clips por día', cuentas: 'Cuentas activas' };
  const fmtInd = (v: number) => (ind === 'aprob' ? `${Math.round(v * 100)} %` : ind === 'pago' ? usd2(v) : n1(Math.round(v * 10) / 10));

  const etiq = etiquetasSemana(d.sem.map((x) => x.lunes));
  const campMax = Math.max(1, ...d.camp.slice(0, 8).flatMap((f) => [f.tarifa, f.pagoReal ?? 0]));

  return (
    <Marco className="cl" titulo="Métricas" volver={{ href: '#/metas/clipping', nombre: 'Clipping' }} info={INFO}>
      <Tarjeta heroe area={AREA} className="cl-resumen" etiqueta="Totales del período">
        <Segmentado etiqueta="Período" valor={p} onCambio={setP} opciones={[['30', '30 días'], ['90', '90 días'], ['todo', 'Todo']]} />
        <div className="cl-tres">
          <Dato valor={d.tot.clips.toLocaleString('es-AR')} etiqueta="Clips" />
          <Dato valor={d.tot.views.toLocaleString('es-AR')} etiqueta="Views" />
          <Dato valor={usd(d.tot.cobrado).replace('USD ', '')} unidad="USD" etiqueta="Cobrado" />
        </div>
        <p className="t-rotulo">{fc(d.r.desde)} a {fc(d.r.hasta)}</p>
      </Tarjeta>

      <Grupo titulo="Ingreso por mes">
        <Tarjeta capa={1} className="cl-grafico">
          <BarrasG barras={MESES.map((k) => ({ etiqueta: String(k), valor: d.porMes[k - 1], hoy: k === nPlan, texto: d.porMes[k - 1] ? corto(d.porMes[k - 1]) : '' }))}
            nombre={`Ingreso por mes del roadmap, en USD: ${MESES.map((k) => `mes ${k}, ${Math.round(d.porMes[k - 1])}`).join('; ')}. Meta del mes ${nPlan}: ${Math.round(mesActual.meta)}.`} leyenda={`Mes del roadmap. Meta del mes ${nPlan}: ${usd(mesActual.meta)}.`} />
        </Tarjeta>
      </Grupo>

      <Grupo titulo="Camino a USD 10k" extremo={d.proy ? <span className="t-rotulo">Ritmo {Math.round(d.proy.ritmo * 100)} % del plan</span> : undefined}>
        <Tarjeta capa={1} className="cl-camino">
          <div className="cl-anillo" data-grafico><Anillo valor={mes12 / CLIP.metaFinal} tamano={104} etiqueta={d.proy ? `${(mes12 / 1000).toFixed(1).replace('.', ',')}k` : '—'} sub="mes 12" area={AREA} nombre="Proyección del mes 12 contra USD 10.000" /></div>
          <div className="cl-camino-texto">
            {d.proy
              ? <p className="t-cuerpo">Con tu ritmo real, el mes 12 cierra en <b className="t-dato">{usd(mes12)}</b>{d.proy.falta ? <>: faltan <b className="t-dato">{usd(d.proy.falta)}</b> para USD 10k.</> : ', arriba de USD 10k.'}</p>
              : <p className="t-cuerpo">Con el primer cobro aparece tu proyección.</p>}
            <p className="t-nota">Cruza USD 10k: base, mes {mesCruce('base') ?? 'no llega'}; optimista, mes {mesCruce('optimista') ?? 'no llega'}; conservador, {mesCruce('conservador') ? `mes ${mesCruce('conservador')}` : 'no llega'}.</p>
          </div>
        </Tarjeta>
      </Grupo>

      <Grupo titulo="Pago real por 1.000 views" extremo={<span className="t-rotulo">Pisos {usd2(CLIP.umbrales.pagoFase2)} y {usd2(CLIP.umbrales.pagoMes6)}</span>}>
        <Tarjeta capa={1} className="cl-grafico">
          {d.camp.length ? (
            <>
              <ul className="cl-filas-grafico">
                {d.camp.slice(0, 8).map((f) => (
                  <li key={f.id}>
                    <span className="cl-fg-cab"><b className="t-cuerpo">{f.nombre}</b><span className="t-dato">{usd2(f.pagoReal)}</span></span>
                    <Pista valor={f.pagoReal} max={campMax} area={AREA}
                      marcas={[{ valor: f.tarifa, nombre: 'Tarifa listada' }, { valor: CLIP.umbrales.pagoFase2, nombre: 'Piso de la fase 2', tipo: 'piso' }, { valor: CLIP.umbrales.pagoMes6, nombre: 'Piso del mes 6', tipo: 'piso' }]}
                      nombre={`${f.nombre}: pago real ${usd2(f.pagoReal)}, tarifa listada ${usd2(f.tarifa)}, pisos ${usd2(CLIP.umbrales.pagoFase2)} y ${usd2(CLIP.umbrales.pagoMes6)} por 1.000 views`} />
                    <small className="t-nota">Listada {usd2(f.tarifa)}</small>
                  </li>
                ))}
              </ul>
              <p className="t-nota cl-leyenda" data-grafico>Barra: pago real. Rayita: tarifa listada. Rayitas finas: los dos pisos.</p>
            </>
          ) : <p className="t-nota">Cargá campañas y cobros para comparar el pago real con la tarifa listada.</p>}
        </Tarjeta>
      </Grupo>

      <Grupo titulo="Embudo" extremo={<span className="t-rotulo">{d.tot.clips} publicados</span>}>
        <Tarjeta capa={1} className="cl-grafico">
          <ol className="cl-filas-grafico">
            {d.emb.map((x) => (
              <li key={x.id}>
                <span className="cl-fg-cab"><span className="t-cuerpo">{x.nombre}</span><b className="t-dato">{x.v.toLocaleString('es-AR')}</b></span>
                <Pista valor={x.v} max={Math.max(1, d.emb[0].v)} area={AREA} nombre={`${x.nombre}: ${x.v} de ${d.emb[0].v} publicados`} />
              </li>
            ))}
          </ol>
        </Tarjeta>
      </Grupo>

      <Grupo titulo="Concentración" extremo={<span className="t-rotulo">Tope {Math.round(CLIP.umbrales.concentracionMax * 100)} %</span>}>
        <Tarjeta capa={1} className="cl-grafico">
          <Segmentado etiqueta="Por" valor={dim} onCambio={setDim} opciones={[['campana', 'Campaña'], ['plataforma', 'Plataforma'], ['nicho', 'Nicho']]} />
          {d.conc.total ? (
            <ul className="cl-filas-grafico">
              {d.conc[dim].map((x) => (
                <li key={x.nombre}>
                  <span className="cl-fg-cab"><b className="t-cuerpo">{x.nombre}</b><span className="t-dato">{pc(x.pct)} · {usd(x.usd)}</span></span>
                  <Pista valor={x.pct} max={1} area={AREA} marcas={[{ valor: CLIP.umbrales.concentracionMax, nombre: 'Tope' }]} nombre={`${x.nombre}: ${pc(x.pct)} del ingreso, tope ${Math.round(CLIP.umbrales.concentracionMax * 100)} %`} />
                  {x.pct > CLIP.umbrales.concentracionMax && <small className="t-nota cl-pasa"><Icono nombre="atencion" lado={14} /> Pasa el tope</small>}
                </li>
              ))}
            </ul>
          ) : <p className="t-nota">Sin cobros en el período.</p>}
        </Tarjeta>
      </Grupo>

      <Grupo titulo="Más gráficos">
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Actividad" nota="Clips por día, 13 semanas" valor={`${d.celdas.filter((c) => c.nivel > 0).length} días`}>
            <div className="cl-hoja-grafico">
              <Actividad celdas={d.celdas} nombre={`Clips por día en las últimas 13 semanas: ${d.celdas.filter((c) => c.nivel > 0).length} días con clips, ${d.celdas.filter((c) => c.nivel === 3).length} días con los clips del plan o más.`} />
              <p className="t-nota">Lleno: llegaste a los clips del plan ({mesActual.clipsDia} por día). Medio: la mitad.</p>
            </div>
          </FilaHoja>
          <FilaHoja icono="ritmo" titulo="Semana a semana" nota="Últimas 8 semanas">
            <div className="cl-hoja-grafico">
              <Segmentado etiqueta="Indicador" valor={ind} onCambio={setInd} opciones={[['pago', 'Pago'], ['aprob', 'Aprob.'], ['clips', 'Clips'], ['cuentas', 'Cuentas']]} />
              <p className="t-rotulo">{NOMBRE_IND[ind]}</p>
              {serie.length ? (
                <Curva puntos={serie.map(({ s, v }) => ({ fecha: s.lunes, valor: v, rotulo: fc(s.lunes) }))} fmt={fmtInd}
                  nombre={`${NOMBRE_IND[ind]}, semana a semana: ${serie.map(({ s, v }) => `${fc(s.lunes)} ${fmtInd(v)}`).join(', ')}.`} />
              ) : <p className="t-nota">Todavía no hay una semana con este dato.</p>}
            </div>
          </FilaHoja>
          <FilaHoja icono="reloj" titulo="USD por hora trabajada" nota="Por semana">
            <div className="cl-hoja-grafico">
              {d.sem.some((s) => s.usdHora != null)
                ? <BarrasG barras={d.sem.map((s, i) => ({ etiqueta: etiq[i], valor: s.usdHora ?? 0, texto: s.usdHora != null && (d.sem.length <= 6 || i === d.sem.length - 1) ? usd2(s.usdHora) : '' }))} nombre={`USD por hora de clipping, por semana: ${d.sem.map((s) => `semana del ${fc(s.lunes)}, ${s.usdHora == null ? 'sin horas' : usd2(s.usdHora)}`).join('; ')}.`} />
                : <p className="t-nota">Todavía no hay horas de foco en el bloque de clipping: entrá en foco desde Hoy y se miden solas.</p>}
              <p className="t-nota">Horas del bloque de clipping que mide Trazo (foco), con los retainers incluidos. Cada barra lleva el día del lunes de su semana.</p>
            </div>
          </FilaHoja>
          <FilaHoja icono="grafico" titulo="Views por clip" nota="Objetivo 3.500" valor={vpc ? vpc.toLocaleString('es-AR') : undefined}>
            <div className="cl-hoja-grafico">
              <BarrasG barras={d.dist.map((x, i) => ({ etiqueta: TRAMO[i] ?? x.nombre, valor: x.clips, hoy: i >= 3, texto: x.clips ? String(x.clips) : '' }))}
                nombre={`Clips por tramo de views: ${d.dist.map((x) => `${x.nombre}, ${x.clips}`).join('; ')}. Objetivo: 3.500 views por clip.`} leyenda="Clips por tramo de views. En amarillo, los de 3.500 views o más: el objetivo." />
            </div>
          </FilaHoja>
          <FilaHoja icono="perfil" titulo="La granja contra el plan" nota="Cuentas y clips por día">
            <div className="cl-hoja-grafico">
              <Segmentado etiqueta="Qué mirar" valor={esc} onCambio={setEsc} opciones={[['cuentas', 'Cuentas'], ['clips', 'Clips por día']]} />
              {esc === 'cuentas'
                ? <GranjaBarras real={d.cuentasMes} plan={mesActual.cuentas} actual={nPlan} que="Cuentas activas" unidad="cuentas" />
                : <GranjaBarras real={d.clipsMes} plan={mesActual.clipsDia} actual={nPlan} que="Clips por día" unidad="clips por día" />}
            </div>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}

/** Los tramos de views con rótulos cortos (los de `data` no entran en una barra angosta). */
const TRAMO = ['< 500', '500–1k', '1–3,5k', '3,5–10k', '10k +'];

/** El día del lunes de cada barra. Si dos semanas caen en el mismo día del mes, la segunda lleva un espacio fino: así no se repite la clave. */
function etiquetasSemana(lunes: string[]) {
  const vistos = new Map<string, number>();
  return lunes.map((l) => { const d = String(Number(l.slice(8))); const k = vistos.get(d) ?? 0; vistos.set(d, k + 1); return d + '\u200a'.repeat(k); });
}
