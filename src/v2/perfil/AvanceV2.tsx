/**
 * Trazo 2.0 · Avance (#/avance): todo el progreso en una vista, por semana, mes o año. Estudio, metas del año, el mes, los frentes,
 * el cuerpo y los sellos. "Presentar" lo cuenta en pantallas grandes, sin lo privado (#/avance/presentacion).
 */
import { useState } from 'react';
import { mesClipEn, mesDe as mesClipDe } from '../../data/clipping';
import { ingresoMes } from '../../data/clipping-metricas';
import { AREAS } from '../../data/defaults';
import { bimester } from '../../data/derive';
import { programacionDelPlan } from '../../data/etiquetas';
import { appliesTo, averagePct, monthLabel, periodRange, valueOf } from '../../data/goals';
import { fmtPct, mejoraDia } from '../../data/mejora';
import { SEALS } from '../../data/profile';
import { weekday } from '../../data/study';
import { addDays, fmtDur } from '../../data/time';
import { fmtKg, pace, runWeek, weightAt } from '../../data/train';
import { useStore } from '../../state/store';
import { barras, type Periodo } from '../../ui/WeekChart';
import { Curva } from '../entreno/Curva';
import { Barras } from '../estudio/Barras';
import { colorV2 } from '../hoy/datos';
import { Boton, Segmentado } from '../kit/controles';
import { Barra, Dato } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { Mes } from './Calor';
import { mapaDelAnio, resumen } from './datos';
import Presentacion from './Presentacion';
import { SelloV2 } from './Sello';
import '../entreno/entreno.css';
import './perfil.css';

const PERIODOS: [Periodo, string][] = [['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']];
const ESTE: Record<Periodo, string> = { semana: 'Esta semana', mes: 'Este mes', anio: 'Este año' };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;

const INFO = (
  <>
    <p className="t-cuerpo-l">Todo lo que hiciste, en una sola vista.</p>
    <p className="t-cuerpo">Elegí semana, mes o año: cambia el estudio. Las metas del año, el mes, los frentes y el cuerpo siempre muestran lo de ahora.</p>
    <p className="t-cuerpo">"Presentar" lo cuenta en pantallas grandes para mostrárselo a alguien. Ahí no aparecen el peso ni la plata.</p>
  </>
);

export default function AvanceV2(props: PropsV2) {
  if (props.ruta.param === 'presentacion') return <Presentacion day={props.day} />;
  return <Vista {...props} />;
}

function Vista({ day }: PropsV2) {
  const s = useStore((x) => x);
  const settings = s.settings!;
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const date = day.date;
  const r = resumen(s, date);
  const bim = bimester(settings.startDate, date, s.goals.bimesterNames);
  const progPlan = programacionDelPlan(date, settings.startDate);
  const ctx = { study: s.study, days: s.days, train: s.train };

  const { items, metaMin } = barras(periodo, date);
  const porBarra = items.map((b) => ({ ...b, min: Object.entries(s.days).filter(([k]) => k >= b.desde && k <= b.hasta).flatMap(([, d]) => d.study ?? []).reduce((a, l) => a + l.min, 0) }));
  const minutos = porBarra.reduce((a, b) => a + b.min, 0);
  const log30 = s.study.log.filter((l) => l.date >= addDays(date, -30));
  const recuerdo = log30.length ? Math.round((log30.filter((l) => l.grade > 1).length / log30.length) * 100) : null;

  const ws = [...s.train.weights].sort((a, b) => a.date.localeCompare(b.date));
  const peso = weightAt(ws, date);
  const ritmo = pace(ws.filter((w) => w.date >= addDays(date, -28)));
  const [mesDesde, mesHasta] = periodRange('mes', date);
  const promMes = averagePct(s.days, mesDesde, mesHasta);
  const mes = mapaDelAnio(s.days, date, settings.startDate).filas.find((f) => f.clave === date.slice(0, 7));
  const anio = s.goals.goals.filter((g) => appliesTo(g, 'anio', date));
  const ganados = SEALS.filter((d) => s.profile.seals[d.id]);
  const clipMes = mesClipDe(date);
  const corridas = [...s.train.runs].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);

  return (
    <Marco className="pf pf-avance" titulo="Avance" volver={{ href: '#/perfil', nombre: 'Perfil' }} info={INFO}
      acciones={<Boton tamano="s" variante="primario" icono="play" href="#/avance/presentacion">Presentar</Boton>}>
      <div className="pf-numeros pf-numeros-avance">
        <Dato valor={r.racha} unidad={r.racha === 1 ? 'día' : 'días'} etiqueta="Racha" />
        <Dato valor={`+${fmtPct(r.mejora, 1)}`} unidad="%" etiqueta="Mejora" delta={{ valor: `+${fmtPct(mejoraDia(day))}`, sentido: 'sube', nota: 'hoy' }} />
        <Dato valor={r.nivel} etiqueta="Nivel" />
        <Dato valor={peso ? fmtKg(peso.kg) : '—'} unidad={peso ? 'kg' : undefined} etiqueta="Peso"
          delta={ritmo ? { valor: fmtKg(Math.abs(Math.round(ritmo.change * 10) / 10)), sentido: ritmo.change > 0 ? 'sube' : ritmo.change < 0 ? 'baja' : 'igual', nota: `en ${ritmo.weeks} sem.` } : undefined} />
      </div>

      <div className="pf-rejilla">
        <Grupo titulo="Estudio" extremo={<span className="t-rotulo">{fmtDur(minutos)}{recuerdo != null ? ` · recordás ${recuerdo} %` : ''}</span>}>
          <Segmentado etiqueta="Período" valor={periodo} onCambio={setPeriodo} opciones={PERIODOS} />
          <div className="capa-1 pf-caja">
            <Barras alto={104} meta={metaMin} barras={porBarra.map((b) => ({ etiqueta: b.letra, valor: b.min, hoy: b.actual, texto: b.min ? fmtDur(b.min).replace(' ', '') : '—' }))}
              nombre={`${ESTE[periodo]}, minutos de estudio: ${porBarra.map((b) => `${b.largo} ${b.min}`).join(', ')}. Meta de cada barra: ${Math.round(metaMin)}.`} />
          </div>
        </Grupo>

        {mes && (
          <Grupo titulo={monthLabel(date)} extremo={<span className="t-rotulo">{promMes.loaded ? `Promedio ${Math.round(promMes.avg * 100)} %` : 'Sin días cargados'}</span>}>
            <div className="capa-1 pf-caja">
              <Mes celdas={mes.celdas} desplazamiento={weekday(mes.celdas[0].fecha)} nombre={`${monthLabel(date)}: ${promMes.loaded} ${promMes.loaded === 1 ? 'día cargado' : 'días cargados'}${promMes.loaded ? `, promedio ${Math.round(promMes.avg * 100)} %` : ''}.`} />
            </div>
          </Grupo>
        )}

        <Grupo titulo="Metas del año">
          <ul className="capa-1 pf-metas">
            {clipMes >= 1 && clipMes <= 12 && (
              <Meta nombre={`Clipping · mes ${clipMes}`} color="var(--a-eclipse)" valor={ingresoMes(s.clipping, clipMes)} meta={mesClipEn(date).meta} texto={`USD ${Math.round(ingresoMes(s.clipping, clipMes))} de ${mesClipEn(date).meta}`} />
            )}
            {anio.map((g) => {
              const v = valueOf(g, date, ctx);
              return <Meta key={g.id} nombre={g.title} color={colorV2(AREAS[g.area].css)} valor={v} meta={g.target} texto={g.unit === 'kg' ? `${fmtKg(v)} kg` : g.unit === 'USD' ? `USD ${v}` : `${String(v).replace('.', ',')} de ${g.target}`} />;
            })}
            {anio.length === 0 && !(clipMes >= 1 && clipMes <= 12) && <li className="t-nota">Las metas del año se cargan en Plan.</li>}
          </ul>
        </Grupo>

        <Grupo titulo="Frentes de estudio" extremo={<span className="t-rotulo">Bimestre {bim.n}</span>}>
          <ul className="capa-1 pf-metas">
            {s.study.activities.map((a) => {
              const f = s.study.fronts.find((x) => x.id === a.front);
              const hechas = a.units ? a.units.filter((u) => s.study.units[a.id]?.[u.n]?.approvedOn).length : a.progress;
              const total = a.units ? a.units.length : a.total;
              return <Meta key={a.id} nombre={a.front === 'prog' && progPlan ? `${progPlan.replace('Programación · ', '')} · ${a.title}` : a.title} color={colorV2(AREAS[f?.color ?? 'ing'].css)} valor={hechas} meta={total} texto={`${hechas} de ${total}`} />;
            })}
          </ul>
        </Grupo>

        <Grupo titulo="Corridas" extremo={<span className="t-rotulo">{s.train.runs.length ? `${runWeek(s.train.runs, date).min} min esta semana` : 'Sin registros'}</span>}>
          {corridas.length ? (
            <div className="capa-1 pf-caja"><Barras alto={72} barras={corridas.map((x) => ({ etiqueta: dm(x.date).split(' ')[0], valor: x.min, hoy: x.date === date, texto: `${x.min}’` }))} nombre={`Minutos de las últimas ${corridas.length} corridas: ${corridas.map((x) => `${dm(x.date)} ${x.min}`).join(', ')}.`} /></div>
          ) : <p className="t-nota">Las corridas se registran en Entreno.</p>}
        </Grupo>

        <Grupo titulo="Peso" extremo={<span className="t-rotulo">Meta {fmtKg(s.train.goalKg)} kg</span>}>
          {ws.length ? (
            <div className="capa-1 pf-caja"><Curva puntos={ws.map((w) => ({ fecha: w.date, valor: w.kg, rotulo: dm(w.date) }))} meta={s.train.goalKg} fmt={fmtKg} nombre={`Curva de peso: ${ws.map((w) => `${dm(w.date)} ${fmtKg(w.kg)} kg`).join(', ')}. Meta: ${fmtKg(s.train.goalKg)} kg.`} /></div>
          ) : <p className="t-nota">Los pesajes se cargan en Entreno, en Peso.</p>}
        </Grupo>
      </div>

      <Grupo titulo="Sellos" extremo={<a className="pt-enlace t-nota" href="#/perfil">{ganados.length} de {SEALS.length}</a>}>
        {ganados.length === 0 ? <p className="t-nota">Todavía no ganaste sellos. El primero llega al cerrar tu primer día.</p> : (
          <ul className="pf-fila-sellos">
            {ganados.map((d, i) => <li key={d.id}><SelloV2 marca={d.mark} color={d.color} ganado lado={56} nombre={d.name} i={i} /></li>)}
          </ul>
        )}
      </Grupo>
    </Marco>
  );
}

/** Un renglón con su barra: el nombre, cuánto va y la meta. */
export function Meta({ nombre, color, valor, meta, texto }: { nombre: string; color: string; valor: number; meta: number; texto: string }) {
  return (
    <li>
      <span className="pf-meta-cab"><b className="t-cuerpo"><i className="area-punto" style={{ ['--area' as string]: color }} />{nombre}</b><span className="t-dato">{texto}</span></span>
      <Barra valor={valor} max={Math.max(meta, 1)} nombre={`${nombre}: ${texto}`} area={color} />
    </li>
  );
}
