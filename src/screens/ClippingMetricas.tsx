/** Ola 23 · #/metas/clipping/metricas: todos los gráficos del clipping con selector de período. */
import { useMemo, useState } from 'react';
import { CLIP, COLOR_CLIP, curva, finMes, mesCruce, mesDe, MESES_CLIP } from '../data/clipping';
import {
  clipsPorDia, concentracion, cuentasActivas, distribucionViews, embudo, filas, ingresosPorMes, porCampana, proyeccion, rangoPeriodo, semanas, totales,
} from '../data/clipping-metricas';
import { addDays } from '../data/time';
import { useStore } from '../state/store';
import { Anillo, Heatmap } from '../ui/charts/charts';
import { Barras, Concentracion, Embudo, EscaleraPlan, IngresoMensual, PagoPorCampana } from '../ui/charts/clipping';
import { Card, Leyenda } from '../ui/charts/core';
import { fc, usd, usd2 } from './Clipping';

type Periodo = '30' | '90' | 'todo';
type Dim = 'campana' | 'plataforma' | 'nicho';

export function MetricasClip({ date }: { date: string }) {
  const clip = useStore((s) => s.clipping);
  const days = useStore((s) => s.days);
  const [p, setP] = useState<Periodo>('30');
  const [dim, setDim] = useState<Dim>('campana');
  const [esc, setEsc] = useState<'cuentas' | 'clips'>('cuentas');
  const n = mesDe(date);
  const nPlan = Math.min(Math.max(n, 1), MESES_CLIP);
  const d = useMemo(() => {
    const r = rangoPeriodo(p, date, clip);
    const fs = filas(clip, r);
    const meses = Array.from({ length: MESES_CLIP }, (_, i) => i + 1);
    const porMes = ingresosPorMes(clip);
    const clipsMes = meses.map((k) => {
      if (k > n) return null;
      const hasta = k === n ? date : finMes(k);
      const desde = addDays(finMes(k - 1), 1);
      const dias = Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5) + 1;
      return Math.round((totales(filas(clip, { desde, hasta })).clips / dias) * 10) / 10;
    });
    const sem = semanas(clip, days, date, p === '30' ? 5 : p === '90' ? 13 : 12);
    const heatSem = 13;
    const lunes0 = addDays(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7) - 7 * (heatSem - 1));
    const cpd = clipsPorDia(clip, { desde: lunes0, hasta: addDays(lunes0, heatSem * 7 - 1) });
    const plan = CLIP.meses[nPlan - 1].clipsDia;
    const cells = Array.from({ length: heatSem * 7 }, (_, i) => {
      const f = addDays(lunes0, i);
      const v = cpd[f] ?? 0;
      return { date: f, level: v >= plan ? 3 : v >= plan / 2 ? 2 : v > 0 ? 1 : 0, libre: false, futuro: f > date };
    });
    return {
      r, fs, porMes, clipsMes, sem, cells, heatSem, proy: proyeccion(clip, date), camp: porCampana(clip, r), emb: embudo(fs),
      conc: concentracion(clip, r), dist: distribucionViews(fs), tot: totales(fs),
      cuentasMes: meses.map((k) => (k > n ? null : cuentasActivas(clip, k === n ? date : finMes(k)))),
    };
  }, [clip, days, date, p, n, nPlan]);
  const metas = CLIP.meses.map((m) => m.meta);
  const optimista = CLIP.meses.map((m) => curva('optimista', m.n));
  const conservador = CLIP.meses.map((m) => curva('conservador', m.n));
  const mes12 = d.proy?.mes12 ?? 0;
  const vpc = d.tot.clips ? Math.round(d.tot.views / d.tot.clips) : null;
  return (
    <>
      <div className="segmentado clip-periodo" role="radiogroup" aria-label="Período">
        {([['30', '30 días'], ['90', '90 días'], ['todo', 'Todo']] as const).map(([k, t]) => <button key={k} role="radio" aria-checked={p === k} onClick={() => setP(k)}>{t}</button>)}
      </div>
      <p className="mono sub clip-tot">{fc(d.r.desde)} a {fc(d.r.hasta)} · {d.tot.clips} clips · {d.tot.views.toLocaleString('es-AR')} views · {usd(d.tot.cobrado)}</p>

      <Card title="Ingreso mensual" aside="cobrado y meta">
        <IngresoMensual cobrado={d.porMes} metas={metas} optimista={optimista} conservador={conservador} actual={nPlan} />
        <Leyenda items={[{ label: 'Cobrado', color: COLOR_CLIP, kind: 'area' }, { label: 'Base', color: 'var(--tinta)', kind: 'linea' }, { label: 'Optimista', color: 'var(--salud)', kind: 'punteada' }, { label: 'Conservador', color: 'var(--rutina)', kind: 'punteada' }]} />
      </Card>

      <Card title="Camino a USD 10k" aside={d.proy ? `ritmo ${Math.round(d.proy.ritmo * 100)} % del plan` : 'sin cobros todavía'}>
        <div className="clip-camino">
          <Anillo value={mes12 / CLIP.metaFinal} label="mes 12" size={116} color={COLOR_CLIP} texto={d.proy ? `${(mes12 / 1000).toFixed(1).replace('.', ',')}k` : '—'} />
          <div>
            {d.proy ? <p>Con tu ritmo real, el mes 12 cierra en <b className="mono">{usd(mes12)}</b>{d.proy.falta ? <>; faltan <b className="mono">{usd(d.proy.falta)}</b> para USD 10k.</> : ', arriba de USD 10k.'}</p>
              : <p className="sub">Con el primer cobro aparece tu proyección. Mientras, el plan en gris.</p>}
            <p className="sub mono">Cruza USD 10k · base mes {mesCruce('base')} · optimista mes {mesCruce('optimista')} · conservador {mesCruce('conservador') ?? 'no llega'}</p>
          </div>
        </div>
      </Card>

      <Card title="Pago real por 1.000 views" aside="pisos 0,80 y 0,70" plegable={{ id: 'clip:m:pago', abierto: true }}>
        {d.camp.length ? <><PagoPorCampana filas={d.camp.slice(0, 8)} /><Leyenda items={[{ label: 'Pago real', color: COLOR_CLIP, kind: 'area' }, { label: 'Tarifa listada', color: 'var(--tinta)', kind: 'punto' }]} /></>
          : <p className="sub r-vacio">Cargá campañas y cobros para comparar el pago real con la tarifa listada.</p>}
      </Card>

      <Card title="Embudo" aside={`${d.tot.clips} publicados`} plegable={{ id: 'clip:m:embudo' }}>
        <Embudo pasos={d.emb} />
      </Card>

      <Card title="La granja contra el plan" aside={esc === 'cuentas' ? 'cuentas activas' : 'clips por día'} plegable={{ id: 'clip:m:granja' }}>
        <div className="segmentado" role="radiogroup" aria-label="Qué mirar">
          <button role="radio" aria-checked={esc === 'cuentas'} onClick={() => setEsc('cuentas')}>Cuentas</button>
          <button role="radio" aria-checked={esc === 'clips'} onClick={() => setEsc('clips')}>Clips por día</button>
        </div>
        {esc === 'cuentas'
          ? <EscaleraPlan plan={CLIP.meses.map((m) => m.cuentas)} real={d.cuentasMes} actual={nPlan} unidad="Cuentas activas" />
          : <EscaleraPlan plan={CLIP.meses.map((m) => m.clipsDia)} real={d.clipsMes} actual={nPlan} unidad="Clips por día" />}
      </Card>

      <Card title="Concentración" aside="máximo 30 %" plegable={{ id: 'clip:m:conc' }}>
        <div className="segmentado" role="radiogroup" aria-label="Por">
          {([['campana', 'Campaña'], ['plataforma', 'Plataforma'], ['nicho', 'Nicho']] as const).map(([k, t]) => <button key={k} role="radio" aria-checked={dim === k} onClick={() => setDim(k)}>{t}</button>)}
        </div>
        {d.conc.total ? <Concentracion partes={d.conc[dim]} max={CLIP.umbrales.concentracionMax} /> : <p className="sub r-vacio">Sin cobros en el período.</p>}
      </Card>

      <Card title="Actividad" aside={`clips por día · plan ${CLIP.meses[nPlan - 1].clipsDia}`} plegable={{ id: 'clip:m:heat' }}>
        <Heatmap cells={d.cells} weeks={d.heatSem} />
        <p className="sub r-nota">Lleno: llegaste a los clips del plan; medio: la mitad.</p>
      </Card>

      <Card title="USD por hora trabajada" aside="por semana" plegable={{ id: 'clip:m:hora' }}>
        {d.sem.some((s) => s.usdHora != null)
          ? <Barras valores={d.sem.map((s) => ({ label: fc(s.lunes).split(' ')[0], v: s.usdHora }))} etiqueta="USD por hora de clipping, por semana" formato={(v) => usd2(v)} />
          : <p className="sub r-vacio">Todavía no hay horas de foco en el bloque de clipping: entrá en foco desde Hoy y se miden solas.</p>}
        <p className="sub r-nota">Horas del bloque de clipping que mide Trazo (foco); retainers incluidos.</p>
      </Card>

      <Card title="Views por clip" aside={vpc ? `promedio ${vpc.toLocaleString('es-AR')} · objetivo 3.500` : 'objetivo 3.500'} plegable={{ id: 'clip:m:views' }}>
        <Barras valores={d.dist.map((x, i) => ({ label: x.nombre, v: x.clips, resaltado: i >= 3 }))} objetivo={{ v: 0, label: '3.500', indice: 3 }} etiqueta="Clips por tramo de views" />
      </Card>
    </>
  );
}
