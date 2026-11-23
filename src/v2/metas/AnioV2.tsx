/**
 * Trazo 2.0 · las metas del año (#/metas/anio): los seis bimestres del año 1, el promedio de cada mes contra el 85 %, una meta por
 * rama (se puede reescribir) con las tuyas al lado, y el tramo final del plan.
 */
import { AREAS } from '../../data/defaults';
import { appliesTo, averagePct, valueOf, yearMonths } from '../../data/goals';
import type { Goal } from '../../data/goals-types';
import { filasAnio, nombreBimestre } from '../../data/metas-plan';
import { BIMESTRES, PLAN, SEMANAS, fechaHito, finSemana, semanaDelPlan } from '../../data/plan';
import { RAMAS, RAMA_NOMBRE } from '../../data/ramas';
import type { Rama } from '../../data/types';
import { useStore } from '../../state/store';
import { Boton } from '../kit/controles';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { dm, dmy, fmt, useCtx } from './datos';
import { FilaHoja } from '../proyecto/piezas';
import { Columnas } from './Columnas';
import { FilaFija, FilaMetaPropia, Pestanas } from './piezas';
import './metas.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">El año 1 del plan, en seis bimestres.</p>
    <p className="t-cuerpo">Cada rama tiene su meta del año; la barra es lo que llevás hecho. Tocá una para reescribirla: vacía, vuelve al texto del plan.</p>
    <p className="t-cuerpo">Las barras por mes muestran tu promedio de metas cumplidas contra el objetivo de 85 %. La línea punteada es ese objetivo.</p>
    <p className="t-cuerpo">Los botones B1 a B6 llevan a las metas de cada bimestre.</p>
  </>
);

export default function AnioV2({ day }: PropsV2) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const nombres = useStore((s) => s.goals.bimesterNames);
  const vctx = { study: ctx.study, days: ctx.days, train: ctx.train };
  const anuales = ctx.goals.filter((g) => appliesTo(g, 'anio', date));
  const personal: Partial<Record<Rama, { v: number; target: number; unit?: string }>> = {};
  for (const g of anuales) if (g.rama && !personal[g.rama]) personal[g.rama] = { v: valueOf(g, date, vctx), target: g.target, unit: g.unit };
  const filas = filasAnio(date, ctx, ctx.plan.editadas, personal);
  // Las metas personales del año que ya se muestran dentro de una rama no se repiten.
  const usadas = new Set(RAMAS.filter((r) => personal[r]));
  const resto = anuales.filter((g) => !(g.rama && usadas.has(g.rama) && anuales.find((x) => x.rama === g.rama) === g));
  const eclipsePlan = PLAN.metasAnio.anio1.find((m) => m.area === 'eclipse');
  const actual = Math.min(BIMESTRES, Math.max(1, Math.ceil(Math.max(1, semanaDelPlan(date, t0)) / PLAN.semanasPorBimestre)));
  const finB6 = finSemana(6 * PLAN.semanasPorBimestre, t0);
  const t12 = fechaHito(PLAN.hitos.find((h) => h.id === 'T+12')!, t0);
  const meses = yearMonths(Number(t0.slice(0, 4)) - 2025);
  const prom = meses.map((m) => ({ ...m, ...averagePct(ctx.days, `${m.key}-01`, `${m.key}-31`) }));
  const fin = finSemana(SEMANAS, t0);
  const [finalTrabajo, ...finalResto] = PLAN.metasAnio.tramoFinal;
  const valorPropio = (g: Goal) => { const v = valueOf(g, date, vctx); return g.unit === 'USD' ? `USD ${fmt(v)}` : g.unit === 'kg' ? `${fmt(v)} kg` : `${fmt(v)}/${g.target}`; };

  return (
    <Marco className="mt" titulo="Metas" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}
      acciones={<Boton soloIcono variante="fantasma" icono="mas" etiqueta="Nueva meta del año" href="#/meta-nueva/anio" />}>
      <Pestanas actual="anio" />

      <nav className="mt-bims" aria-label="Bimestres del año 1">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <a key={n} href={`#/metas/bimestre/${n}`} aria-current={n === actual ? 'true' : undefined} className={n === actual ? 'actual' : undefined} aria-label={`B${n}, bimestre ${n}: ${nombreBimestre(n, nombres)}${n === actual ? ', el de ahora' : ''}`}>B{n}</a>
        ))}
      </nav>

      <Grupo titulo="Promedio por mes" extremo={<span className="t-rotulo">Objetivo 85 %</span>}>
        <div className="capa-1 mt-meses">
          <Columnas alto={88} meta={85} max={100} nombre={`Promedio de metas cumplidas por mes: ${prom.map((m) => `${m.name} ${m.loaded ? `${Math.round(m.avg * 100)} %` : 'sin datos'}`).join(', ')}. La línea punteada es el objetivo de 85 %.`}
            columnas={prom.map((m) => ({ etiqueta: m.letter, hoy: m.key === date.slice(0, 7), texto: m.loaded ? String(Math.round(m.avg * 100)) : '–', partes: [{ valor: m.avg * 100 }] }))} />
        </div>
      </Grupo>

      <Grupo titulo="Las metas del año 1">
        <div className="capa-1 mt-lista">
          {filas.map((f) => <FilaFija key={f.clave} rama={f.rama!} clave={f.clave} titulo={f.titulo} sub={f.nota} lado={f.lado} avance={f.avance} de="año" />)}
          {resto.map((g) => <FilaMetaPropia key={g.id} g={g} date={date} nota={g.note ?? (g.rama ? RAMA_NOMBRE[g.rama] : `${g.group ?? AREAS[g.area].name} · área`)} valorTexto={valorPropio(g)} />)}
          {eclipsePlan && !anuales.some((g) => g.area === 'eclipse') && <Fila area="var(--a-eclipse)" titulo="Eclipse" nota={eclipsePlan.texto} />}
          <Fila icono="mas" titulo="Meta del año" nota="Agregar una propia" href="#/meta-nueva/anio" />
        </div>
      </Grupo>

      <Grupo titulo="Más del año">
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Los bimestres del año 1" nota={`Ahora: B${actual}, ${nombreBimestre(actual, nombres)}`} tituloHoja="Bimestres del año 1">
            <div className="capa-1 s-lista">
              {[1, 2, 3, 4, 5, 6].map((n) => <Fila key={n} titulo={`B${n} · ${nombreBimestre(n, nombres)}`} valor={n === actual ? 'Ahora' : undefined} href={`#/metas/bimestre/${n}`} />)}
            </div>
            <dl className="mt-fechas">
              <div><dt className="t-rotulo">Empieza</dt><dd className="t-dato">{dmy(t0)}</dd></div>
              <div><dt className="t-rotulo">T+12</dt><dd className="t-dato">{dmy(t12)}</dd></div>
              <div><dt className="t-rotulo">Cierra</dt><dd className="t-dato">{dmy(finB6)}</dd></div>
            </dl>
          </FilaHoja>
          <FilaHoja icono="meta" titulo="Tramo final" nota={`B7 a B9 · hasta ${dm(fin)} ${fin.slice(0, 4)}`} tituloHoja="Tramo final">
            <div className="mt-hoja">
              <h3 className="t-encabezado">{finalTrabajo.texto}</h3>
              <p className="t-nota">{finalResto.map((m) => m.texto).join(' · ')} · rol senior.</p>
            </div>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}
