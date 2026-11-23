/**
 * Trazo 2.0 · Diferencia (#/metas/diferencia): el calendario de Trazo contra las fechas que estima el roadmap. Arriba cuándo termina
 * el plan y cuánto se corre; después lo que no cierra en el propio roadmap y, por etapa, cuánto se corre cada bloque (cada etapa abre
 * su lista). Mismos datos y mismas funciones que la 1.0.
 */
import { useMemo } from 'react';
import { ANIOS_PAUSA, esDiaDePausa, horasDelDia, HORAS_ANTES_TRABAJO, INICIO_TRABAJO_DIAS } from '../../data/capacidad';
import { chequeosRoadmap, diferenciaMate, diferenciaRoadmap, resumenDiferencia, textoDelta, type FilaDiferencia } from '../../data/diferencia';
import { PLAN, T0_PLAN } from '../../data/plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { calendarioCompleto } from '../../data/plan-vistas';
import { addDays } from '../../data/time';
import { inicioTrabajo, planSettings, useStore } from '../../state/store';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, diasTxt, dm, dma, n1 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

const ETAPA = ['', 'Núcleo', 'Ciberseguridad', 'Quant', 'Aeroespacial'];

function FilaBloque({ x }: { x: FilaDiferencia }) {
  return (
    <Fila
      titulo={`${x.id} · ${x.nombre}${x.numero != null ? ` · certificación ${x.numero}` : ''}`}
      nota={`Trazo ${dm(x.inicio)} a ${dma(x.fin)} · roadmap ${dm(x.roadmap.inicio)} a ${dma(x.roadmap.fin)} · ${x.horas ? `${n1(x.horas)} h${x.horasAntes ? ` (antes ${n1(x.horasAntes)})` : ''}` : `${x.dias ?? 0} días fijos`}`}
      valor={diasTxt(x.deltaFin)}
      href={`#/metas/proyecto/${x.id}`}
    />
  );
}

export default function DiferenciaV2({ today }: PropsV2) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const inicio = useStore((s) => inicioTrabajo(s.settings));
  // Los chequeos miden el roadmap con sus propios supuestos: su T0 y el trabajo el 4 ene 2027 (o el inicio que cargaste).
  const inicioRoadmap = useStore((s) => planSettings(s.settings).t2) ?? addDays(PLAN_EXT.t0, INICIO_TRABAJO_DIAS);
  // El calendario vivo se recalcula con las horas reales: la diferencia también.
  useStore((s) => s.days);
  useStore((s) => s.plan.pausaFinDeAnio);
  const d = useMemo(() => {
    const filas = diferenciaRoadmap(calendarioCompleto(t0));
    // v12.1: las ventanas de matemática usan el día entero de la rutina (10 h entre semana, 11 el fin de semana), como todo lo demás.
    const chequeos = chequeosRoadmap(PLAN_EXT, (fecha) => horasDelDia(fecha, { t0: PLAN_EXT.t0, inicioTrabajo: inicioRoadmap }), (fecha) => esDiaDePausa(fecha));
    return { filas, resumen: resumenDiferencia(filas), chequeos, mate: diferenciaMate(PLAN_EXT, PLAN.matematica.tramos) };
  }, [t0, inicio, inicioRoadmap, today]);
  const r = d.resumen;

  const INFO = (
    <>
      <p className="t-cuerpo-l">El plan de Trazo, la versión 12.1, contra las fechas que estima el roadmap.</p>
      <p className="t-cuerpo">Las fechas del roadmap son estimaciones.</p>
      <p className="t-cuerpo">Trazo recalcula con las horas de cada bloque y lo que da cada día{HORAS_ANTES_TRABAJO != null ? ` (${n1(HORAS_ANTES_TRABAJO)} h por día antes del trabajo nuevo, que empieza el ${dma(inicio)}; 29 h por semana después; 43 en las ventanas)` : ''}, y con tus horas reales cuando las cargás.</p>
      <p className="t-cuerpo">Acá ves cuánto se corre cada bloque. Si una versión se atrasa, se mueven fechas: no se recorta profundidad.</p>
      {ANIOS_PAUSA && <p className="t-cuerpo">Pausas de diciembre: {ANIOS_PAUSA.join(', ').replace(/, (\d+)$/, ' y $1')} (en 2026 no hay).</p>}
    </>
  );

  return (
    <Marco className="tr" titulo="Diferencia" volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      {r && (
        <Tarjeta heroe area={AREA.programacion} etiqueta="Cuándo termina el plan" className="tr-heroe">
          <Dato grande valor={dma(r.fin)} etiqueta="El plan termina" delta={{ valor: r.delta === 0 ? 'En fecha' : textoDelta(r.delta), sentido: r.delta > 0 ? 'sube' : r.delta < 0 ? 'baja' : 'igual', nota: r.delta === 0 ? `con el roadmap` : `que el roadmap (${dma(r.finRoadmap)})` }} />
          <Dato valor={n1(r.horas)} unidad="h" etiqueta={r.horasAntes && r.horasAntes !== r.horas ? `De proyecto (antes ${n1(r.horasAntes)} h)` : 'De proyecto'} />
          {r.masAntes && <p className="t-nota tr-linea">Lo que más se adelanta: {r.masAntes.id} · {r.masAntes.nombre} ({textoDelta(r.masAntes.deltaFin)}).</p>}
          {r.masDespues && <p className="t-nota tr-linea">Lo que más se atrasa: {r.masDespues.id} · {r.masDespues.nombre} ({textoDelta(r.masDespues.deltaFin)}).</p>}
        </Tarjeta>
      )}

      {d.chequeos.length > 0 && (
        <div className="capa-1 s-lista">
          <FilaHoja icono="atencion" titulo="Lo que no cierra en el roadmap" valor={`${d.chequeos.length} ${d.chequeos.length === 1 ? 'caso' : 'casos'}`} tituloHoja="Lo que no cierra en el roadmap">
            <div className="capa-1 s-lista tr-lista-hoja">
              {d.chequeos.map((c) => <Fila key={c.id} icono="atencion" titulo={c.texto} nota={c.calculo} />)}
            </div>
            <p className="t-nota pt-pie">Trazo no lo corrige: usa las horas del bloque y te muestra la diferencia.</p>
          </FilaHoja>
        </div>
      )}

      <Grupo titulo="Por etapa">
        <div className="capa-1 s-lista">
          {[1, 2, 3, 4].map((n) => {
            const fs = d.filas.filter((x) => x.etapa === n);
            if (!fs.length) return null;
            const ult = fs.reduce((m, x) => (x.fin > m.fin ? x : m), fs[0]);
            const ultR = fs.reduce((m, x) => (x.roadmap.fin > m.roadmap.fin ? x : m), fs[0]);
            const delta = Math.round((Date.parse(ult.fin) - Date.parse(ultR.roadmap.fin)) / 864e5);
            return (
              <FilaHoja key={n} icono="mapa" titulo={`Etapa ${n} · ${ETAPA[n]}`} valor={diasTxt(delta)} tituloHoja={`Etapa ${n} · ${ETAPA[n]}`}>
                <p className="t-cuerpo pt-pie">Termina el {dma(ult.fin)}; el roadmap la estima el {dma(ultR.roadmap.fin)}: {textoDelta(delta)}.</p>
                <div className="capa-1 s-lista tr-lista-hoja">{fs.map((x) => <FilaBloque key={x.id} x={x} />)}</div>
              </FilaHoja>
            );
          })}
          {d.mate.length > 0 && (
            <FilaHoja icono="matematica" titulo="Matemática diaria" nota={d.mate.map((m) => `${m.id} ${diasTxt(m.delta)}`).join(' · ')} tituloHoja="Matemática diaria">
              <div className="capa-1 s-lista tr-lista-hoja">
                {d.mate.map((m) => <Fila key={m.id} titulo={`${m.id} · ${m.nombre}`} nota={`${m.horas} h · Trazo termina el ${dma(m.fin)} · roadmap ≈ ${dma(m.finRoadmap)}`} valor={diasTxt(m.delta)} href={`#/estudio/mate/${m.id}`} />)}
              </div>
              <p className="t-nota pt-pie">1 h por día hasta el trabajo nuevo y 2 h después; se pausa en las ventanas.</p>
            </FilaHoja>
          )}
        </div>
      </Grupo>
    </Marco>
  );
}
