/**
 * Trazo 2.0 · tu evolución (#/metas/evolucion): la mejora de cada día con su promedio (por día, semana, mes, bimestre o año), la
 * constancia de las últimas 15 semanas, las horas mes a mes, el avance de la ruta contra el plan, las competencias contra las metas
 * del año 1 y del 3, y lo que construiste. Mismos datos que la 1.0; cada dibujo trae su resumen en palabras.
 */
import { useState } from 'react';
import { mejoraAcumulada, racha } from '../../data/derive';
import { allDoneUntil, competencyAxes, routeCurve } from '../../data/ruta';
import { competencyScores } from '../../data/roadmap-charts';
import { useStore } from '../../state/store';
import { bimsCerrados, conamatHechos, constancia, construiste, mejoraSerie, mesAMes, useRutaVista, type Rango } from '../../ui/useRuta';
import { colorV2 } from '../hoy/datos';
import { Segmentado } from '../kit/controles';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Columnas } from './Columnas';
import { num, pctD } from './datos';
import './metas.css';

const RANGOS: [Rango, string][] = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['bim', 'Bim.'], ['anio', 'Año']];
const MES_ENT = (l: string) => l[0].toUpperCase() + l.slice(1);

const INFO = (
  <>
    <p className="t-cuerpo-l">Cómo venís: día a día, mes a mes y año a año.</p>
    <p className="t-cuerpo">La mejora del día es hasta 1 %, repartida entre tus metas: cada meta cumplida suma su parte. La línea es el promedio de 7 días (o de 3 períodos, en semanas, meses y bimestres).</p>
    <p className="t-cuerpo">En la constancia, cada cuadrado es un día y las filas van de lunes a domingo. El martes es libre: si no hay registro, no cuenta como falta.</p>
    <p className="t-cuerpo">Cada competencia sube con lo que cerrás: capítulos y exámenes para matemática, productos y piezas desde cero para ML y producto, certificaciones para cloud y seguridad, placas y equipos para hardware.</p>
  </>
);

/** Una línea chica con su resumen: la historia de lo que construiste. */
function Chispa({ valores, color, nombre }: { valores: number[]; color: string; nombre: string }) {
  const max = Math.max(1, ...valores);
  const n = Math.max(1, valores.length - 1);
  const pts = valores.map((v, i) => `${(i / n) * 100},${100 - (v / max) * 88 - 6}`).join(' ');
  return <svg className="mt-chispa" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={nombre} data-grafico style={{ ['--area' as string]: color }}><polyline points={pts} /></svg>;
}

export default function EvolucionV2({ day }: PropsV2) {
  const s = useStore((x) => x);
  const date = day.date;
  const v = useRutaVista(date);
  const [rango, setRango] = useState<Rango>('dia');
  const serie = mejoraSerie(s.days, date, rango);
  const conDatos = serie.values.filter((x) => x > 0);
  const promedio = conDatos.length ? conDatos.reduce((a, x) => a + x, 0) / conDatos.length : 0;
  const mitad = Math.floor(serie.values.length / 2);
  const prev = serie.values.slice(0, mitad).filter((x) => x > 0);
  const recent = serie.values.slice(mitad).filter((x) => x > 0);
  const delta = prev.length && recent.length ? recent.reduce((a, x) => a + x, 0) / recent.length - prev.reduce((a, x) => a + x, 0) / prev.length : null;
  const pocos = serie.cargados < 7;
  const mejor = Math.max(0, ...Object.values(s.days).map((d) => d.blocks.filter((b) => b.tasks.length && b.tasks.every((t) => t.done)).length / Math.max(1, d.blocks.length)));
  const heat = constancia(s.days, date);
  const meses = mesAMes(s.days, date);
  const rc = routeCurve(s.ruta.log, date);
  const comp = (pm: Record<string, number>) => competencyScores(competencyAxes(pm)).map((c) => c.score);
  const hoy = comp(v.p);
  const a1 = comp(allDoneUntil(6));
  const a3 = comp(allDoneUntil(18));
  const ejes = competencyAxes(v.p).map((a) => a.label);
  const hechos = construiste(s, date);
  const diffPlan = v.rutaAvance - v.rutaPlan;
  const cumplidos = heat.filter((c) => !c.futuro && c.level != null && c.level >= 2).length;
  const cargadosHeat = heat.filter((c) => !c.futuro && c.level != null).length;
  const conAvg = serie.values.length >= 7 || rango !== 'dia';
  const ultimo = serie.values.length - 1;
  const horas = (m: (typeof meses)[number]) => `${num(m.math, 1)} h de matemática y ${num(m.prog, 1)} h de programación`;
  const bimsPlan = rc.plan.slice(1);

  return (
    <Marco className="mt" titulo="Tu evolución" volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe etiqueta="Mejora diaria" className="mt-heroe">
        <p className="t-rotulo">Mejora · {serie.titulo}</p>
        <Dato grande valor={<Numero valor={promedio} decimales={2} />} unidad="%" etiqueta="Promedio"
          delta={delta != null ? { valor: `${num(Math.abs(delta))} %`, sentido: delta > 0.005 ? 'sube' : delta < -0.005 ? 'baja' : 'igual', nota: 'contra la mitad anterior' } : undefined} />
        <Segmentado etiqueta="Rango" valor={rango} opciones={RANGOS} onCambio={setRango} />
        <Columnas alto={112} max={1} meta={undefined} linea={conAvg ? serie.avg : undefined}
          nombre={`Mejora, ${serie.titulo}: promedio ${num(promedio)} %. ${serie.values.length} ${serie.values.length === 1 ? 'columna' : 'columnas'}, la línea es el promedio.`}
          columnas={serie.values.map((x, i) => ({ etiqueta: serie.labels[i] || undefined, partes: [{ valor: x }], hoy: rango === 'dia' && i === ultimo }))} />
        {pocos && <p className="t-nota">{serie.cargados} {serie.cargados === 1 ? 'día con datos' : 'días con datos'}: se completa con el uso.</p>}
      </Tarjeta>

      <div className="mt-datos">
        <Dato valor={racha(s.days, date)} unidad={racha(s.days, date) === 1 ? 'día' : 'días'} etiqueta="Racha" />
        <Dato valor={num(mejor)} unidad="%" etiqueta="Mejor día" />
        <Dato valor={`+${num(mejoraAcumulada(s.days, date), 1)}`} unidad="%" etiqueta="Compuesto" />
      </div>

      <Grupo titulo="Constancia" extremo={<span className="t-rotulo">15 semanas</span>}>
        <div className="capa-1 mt-constancia">
          <figure className="mt-heat" role="img" data-grafico aria-label={`Constancia de las últimas 15 semanas: ${cumplidos} de ${cargadosHeat} días cargados con la mitad o más de las metas cumplidas.`}>
            {heat.map((c) => <i key={c.date} className={`${c.futuro ? 'futuro' : c.libre ? 'libre' : c.level == null ? 'vacio' : `n${c.level}`}`} />)}
          </figure>
          <p className="t-nota">{cumplidos} de {cargadosHeat} días con la mitad o más cumplida.</p>
        </div>
      </Grupo>

      <Grupo titulo="Horas por mes" extremo={<span className="t-rotulo">Matemática y programación</span>}>
        <div className="capa-1 mt-grafico">
          <Columnas alto={96} nombre={`Horas por mes: ${meses.map((m) => `${m.label} ${num(m.math + m.prog, 1)} h`).join(', ')}.`}
            columnas={meses.map((m) => ({ etiqueta: m.label, hoy: m.actual, partes: [{ valor: m.math, area: 'var(--a-economia)' }, { valor: m.prog, area: 'var(--a-ing)' }] }))} />
          <ul className="mt-leyenda-fila" aria-label="Leyenda">
            <li><i className="area-punto" style={{ ['--area' as string]: 'var(--a-economia)' }} />Matemática</li>
            <li><i className="area-punto" style={{ ['--area' as string]: 'var(--a-ing)' }} />Programación</li>
          </ul>
        </div>
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Detalle por mes" nota="Horas y metas cumplidas" valor={meses[meses.length - 1]?.metas != null ? `${MES_ENT(meses[meses.length - 1].label)} ${pctD(meses[meses.length - 1].metas!)}` : undefined} tituloHoja="Mes a mes">
            <div className="capa-1 s-lista">
              {[...meses].reverse().map((m) => <Fila key={m.label + m.actual} titulo={MES_ENT(m.label)} nota={horas(m)} valor={m.metas == null ? '—' : pctD(m.metas)} />)}
            </div>
            <p className="t-nota pt-pie">El porcentaje es el promedio de metas cumplidas del mes.</p>
          </FilaHoja>
        </div>
      </Grupo>

      <Grupo titulo="Avance de la ruta" extremo={<span className="t-rotulo">Real contra plan</span>}>
        <div className="capa-1 mt-grafico">
          <Columnas alto={96} max={1} punteada linea={bimsPlan}
            nombre={`Avance acumulado por bimestre: ${bimsPlan.map((p, i) => `B${i + 1}, plan ${pctD(p)}, real ${rc.real[i + 1] != null ? pctD(rc.real[i + 1], 1) : 'sin datos'}`).join('; ')}.`}
            columnas={bimsPlan.map((_, i) => ({ etiqueta: i % 3 === 0 ? `B${i + 1}` : undefined, partes: [{ valor: rc.real[i + 1] ?? 0 }] }))} />
          <ul className="mt-leyenda-fila" aria-label="Leyenda">
            <li><i className="mt-muestra barra" aria-hidden="true" />Real</li>
            <li><i className="mt-muestra linea" aria-hidden="true" />Plan</li>
          </ul>
          {rc.certs.length > 0 && <p className="t-nota">Aprobadas: {rc.certs.map((c) => `${c.name} (B${c.n})`).join(', ')}.</p>}
        </div>
        <div className="mt-datos">
          <Dato valor={bimsCerrados(v.p, date)} etiqueta="Bimestres cerrados" />
          <Dato valor={num(v.rutaAvance * 100, 1)} unidad="%" etiqueta="De la ruta" delta={{ valor: `${num(Math.abs(diffPlan * 100), 1)} %`, sentido: diffPlan > 0.0005 ? 'sube' : diffPlan < -0.0005 ? 'baja' : 'igual', nota: diffPlan >= 0 ? 'sobre el plan' : 'bajo el plan' }} />
          <Dato valor={`${conamatHechos(v.p)}/69`} etiqueta="Capítulos CONAMAT" />
        </div>
      </Grupo>

      <Grupo titulo="Competencias" extremo={<span className="t-rotulo">Hoy contra las metas</span>}>
        <ul className="capa-1 mt-comp-lista">
          {ejes.map((e, i) => (
            <li key={e} className="mt-comp">
              <span className="t-cuerpo">{e}</span>
              <b className="t-dato">{hoy[i]}</b>
              <div className="mt-comp-riel" role="img" aria-label={`${e}: hoy ${hoy[i]} de 100; meta del año 1, ${a1[i]}; meta del año 3, ${a3[i]}`} data-grafico>
                <i className="hoy" style={{ width: `${hoy[i]}%` }} />
                <i className="meta a1" style={{ left: `${a1[i]}%` }} />
                <i className="meta a3" style={{ left: `${a3[i]}%` }} />
              </div>
            </li>
          ))}
          <li className="mt-comp-ley t-nota"><span><i className="mt-muestra relleno" aria-hidden="true" />Hoy</span><span><i className="mt-muestra rayita a1" aria-hidden="true" />Meta del año 1</span><span><i className="mt-muestra rayita a3" aria-hidden="true" />Meta del año 3</span></li>
        </ul>
      </Grupo>

      <Grupo titulo="Lo que construiste">
        <div className="mt-construido">
          {hechos.map((h) => (
            <div key={h.label} className="capa-1">
              <span className="t-rotulo">{h.label}</span>
              <b className="t-seccion t-dato">{h.value}</b>
              <Chispa valores={h.serie} color={colorV2(h.color)} nombre={`${h.label}: ${h.value}`} />
            </div>
          ))}
        </div>
      </Grupo>
    </Marco>
  );
}
