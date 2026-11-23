/**
 * Trazo 2.0 · Calibración (#/metas/calibracion): cuánto lleva de verdad lo que estimaste. Arriba el factor real / estimado que sale de
 * PetrIA y lo que dice; abajo las versiones que calibran, las horas por proyecto, el registro de los últimos 7 días (con la carga de
 * horas a mano para los días sin foco: cada día abre su hoja) y los escenarios. Mismos datos y mismas funciones que la 1.0.
 */
import { useMemo } from 'react';
import { FACTOR_MAX, FACTOR_MIN, calibrar, diasPorDiezPorCiento, escenarios, proyectar, sugerencia } from '../../data/calibracion';
import { deudaMatematica, registroDiario } from '../../data/control';
import { PLAN_EXT } from '../../data/plan-extendido';
import { calendarioCompleto } from '../../data/plan-vistas';
import { addDays } from '../../data/time';
import { cargarHorasManuales } from '../../state/plan';
import { inicioTrabajo, useStore } from '../../state/store';
import { Boton, Contador } from '../kit/controles';
import { Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, dma, f2, fh, n1, useT0 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

/** Las horas de un día: lo cargado a mano o, si no hay, el foco. */
function CargaDia({ fecha, rama, nombre, foco, manual }: { fecha: string; rama: 'programacion' | 'matematica'; nombre: string; foco: number; manual?: number }) {
  return (
    <div className="tr-carga">
      <Contador etiqueta={`Horas de ${nombre} del ${dm(fecha)}`} valor={manual ?? null} inicial={foco} min={0} max={24} paso={0.5} decimales={1} unidad="h" onCambio={(v) => cargarHorasManuales(fecha, rama, v)} />
      <p className="t-nota">{manual != null ? `Cargaste ${n1(manual)} h a mano.` : `Hoy cuenta el foco: ${n1(foco)} h.`}</p>
      {manual != null && <Boton tamano="s" variante="fantasma" icono="deshacer" onClick={() => cargarHorasManuales(fecha, rama, null)}>Volver al foco</Boton>}
    </div>
  );
}

export default function CalibracionV2({ today }: PropsV2) {
  const hoy = today;
  const t0 = useT0();
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const inicio = useStore((s) => inicioTrabajo(s.settings));
  const d = useMemo(() => {
    const cal = calendarioCompleto(t0);
    const c = calibrar(cal, days, plan, hoy);
    const horas = cal.reduce((s, b) => s + (b.horas ?? 0), 0);
    const fin = cal.reduce((m, b) => (b.fin > m ? b.fin : m), cal[0].fin);
    const cerrados = c.hito ? ['P0', 'P1'] : [];
    const proy = c.factor != null ? proyectar(c.factor, t0, cerrados) : null;
    const base = proyectar(1, t0, cerrados);
    return { c, horas, fin, proy, sug: proy ? sugerencia(c, proy.fin, base.fin) : null, esc: escenarios(t0, cerrados), diez: diasPorDiezPorCiento(t0, cerrados) };
  }, [t0, plan, days, hoy]);
  const { c } = d;
  const p1 = PLAN_EXT.bloques.find((b) => b.id === 'P1');
  // Los bloques sin horas (P0, la versión 0 archivada) no calibran nada: no se listan.
  const filas = c.filas.filter((x) => x.estimadas > 0 || x.reales > 0);
  const max = Math.max(1, ...filas.map((x) => Math.max(x.estimadas, x.reales)));
  const desde = addDays(hoy, -6) < t0 ? t0 : addDays(hoy, -6);
  const registro = registroDiario(days, desde, hoy, { t0, inicioTrabajo: inicio, manual: plan.horasManuales });
  const deuda = deudaMatematica(hoy, { t0, inicioTrabajo: inicio });
  const frase = d.sug ? d.sug.texto : c.regla === 'en-plan' ? 'Vas en plan: no hace falta tocar nada.' : null;

  const INFO = (
    <>
      <p className="t-cuerpo-l">El factor es las horas reales sobre las estimadas.</p>
      <p className="t-cuerpo">Las horas de PetrIA salen de sus lotes ({n1(p1?.horas ?? 0)} h{p1?.horasAntes ? `; antes eran ${n1(p1.horasAntes)}` : ''}). El factor se calcula al publicar PetrIA 1.0 y otra vez con la 1.1, y proyecta lo que viene después.</p>
      <p className="t-cuerpo">Las horas reales salen del foco de los bloques de programación o de lo que cargues a mano: tocá un día de “Últimos 7 días” para cargarlo.</p>
      <p className="t-cuerpo">En “Horas por proyecto” se lee reales de estimadas: la barra fina es lo estimado y la gruesa, lo real.</p>
      <p className="t-cuerpo">Las fechas del plan no se mueven solas: si hace falta correr bloques, Trazo lo sugiere en Períodos y vos lo confirmás.</p>
      <p className="t-cuerpo">Los tres escenarios proyectan el plan con un factor de 0,85, 1,00 y 1,15 sobre los proyectos que faltan: son proyecciones, el calendario no cambia.</p>
    </>
  );

  return (
    <Marco className="tr" titulo="Calibración" volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe area={AREA.programacion} etiqueta="Factor real sobre estimado" className="tr-heroe">
        {c.factor != null ? (
          <>
            <Dato grande valor={f2(c.factor)} etiqueta="Factor real / estimado" />
            <p className="t-nota tr-linea">{n1(c.reales)} h reales de {n1(c.estimadas)} h estimadas en PetrIA {c.hito === '1.1' ? '1.0 y 1.1' : '1.0'}. En plan, entre {f2(FACTOR_MIN)} y {f2(FACTOR_MAX)}.</p>
            {c.hito === '1.0' && c.cuando && <p className="t-nota tr-linea">Se recalcula al publicar la 1.1 (el {dma(c.cuando)}).</p>}
          </>
        ) : (
          <>
            <p className="t-rotulo">Factor real / estimado</p>
            <p className="t-seccion tr-linea">Se calcula al publicar PetrIA 1.0.</p>
          </>
        )}
        {frase && <p className="t-cuerpo tr-linea" role="status">{frase}</p>}
        <Dato valor={d.diez} unidad="días" etiqueta="Por +10 % de horas" />
      </Tarjeta>

      <Grupo titulo="Versiones de PetrIA">
        <div className="capa-1 s-lista">
          {c.versiones.map((v) => (
            <Fila key={v.version} titulo={`${v.version} · ${v.nombre}`} nota={v.publicada ? `Publicada el ${fh(v.publicada, hoy)}` : `Sin publicar${v.finTrazo ? ` · ${fh(v.finTrazo, hoy)}` : ''}`} valor={v.reales != null ? `${n1(v.reales)} de ${n1(v.estimadas)} h` : `${n1(v.estimadas)} h`} />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Horas por proyecto">
        {filas.length === 0 ? (
          <Vacio ilustracion="datos" titulo="Todavía no empezó ningún proyecto" texto="Cuando empiece el primero, acá ves cuánto lleva de verdad." accion={<Boton variante="secundario" href="#/metas/periodos">Ver el plan</Boton>} />
        ) : (
          <ul className="capa-1 tr-proyectos">
            {filas.map((x) => (
              <li key={x.id}>
                <div className="tr-proyecto-fila">
                  <span className="tr-proyecto-nombre"><b className="t-cuerpo-l">{x.id} · {x.nombre}</b><span className="t-nota">{x.enCurso ? 'En curso' : 'Cerrado'}</span></span>
                  <span className="t-dato">{n1(x.reales)} de {n1(x.estimadas)} h</span>
                </div>
                <span className="tr-barras" role="img" data-grafico aria-label={`${x.nombre}: ${n1(x.reales)} horas reales contra ${n1(x.estimadas)} estimadas`}>
                  <i className="est" style={{ width: `${(x.estimadas / max) * 100}%` }} />
                  <i className="real" style={{ width: `${(x.reales / max) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Grupo>

      <Grupo titulo="Últimos 7 días">
        <div className="capa-1 s-lista">
          {registro.map((r) => {
            const man = plan.horasManuales?.[r.fecha];
            return (
              <FilaHoja key={r.fecha} icono="calendario" titulo={dm(r.fecha)} nota={`Prog. ${n1(r.progReal)}/${n1(r.progPlan)} h · Mate ${n1(r.mateReal)}/${n1(r.matePlan)} h`} valor={man ? 'A mano' : undefined} tituloHoja={`Horas del ${dm(r.fecha)} · ${r.proyecto}`}>
                <div className="pt-campo-hoja">
                  <p className="t-rotulo">Programación</p>
                  <CargaDia fecha={r.fecha} rama="programacion" nombre="programación" foco={r.progReal} manual={man?.programacion} />
                  <p className="t-rotulo">Matemática</p>
                  <CargaDia fecha={r.fecha} rama="matematica" nombre="matemática" foco={r.mateReal} manual={man?.matematica} />
                  <p className="t-nota">Si trabajaste sin abrir el foco, cargá las horas a mano: mandan sobre el foco de ese día.</p>
                </div>
              </FilaHoja>
            );
          })}
          {deuda.horas > 0 && <Fila icono="matematica" titulo="Deuda de matemática" nota="1 h por día en el modo intensivo, en vez de 2. Se recupera con trabajo." valor={`${n1(deuda.horas)} h`} />}
        </div>
      </Grupo>

      <Grupo titulo="Escenarios">
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Calendario actual" nota={`${n1(d.horas)} h`} valor={dma(d.fin)} tituloHoja="Calendario actual">
            <p className="t-cuerpo pt-pie">Con las horas reales cargadas y el factor, si ya está.</p>
          </FilaHoja>
          {d.proy && c.factor != null && (
            <FilaHoja icono="grafico" titulo="Con tu factor" nota={`${n1(d.proy.horas)} h`} valor={dma(d.proy.fin)} tituloHoja={`Con tu factor · ${f2(c.factor)}`}>
              <p className="t-cuerpo pt-pie">Los días de los proyectos que vienen después de PetrIA × {f2(c.factor)}; las ventanas, las certificaciones, los días fijos y la pausa no cambian.</p>
            </FilaHoja>
          )}
          {d.esc.map((e) => (
            <FilaHoja key={e.id} icono="grafico" titulo={`${e.nombre} · ${f2(e.factor)}`} nota={`${n1(e.horas)} h`} valor={dma(e.fin)} tituloHoja={`${e.nombre} · factor ${f2(e.factor)}`}>
              <p className="t-cuerpo pt-pie">{e.supuesto}</p>
            </FilaHoja>
          ))}
        </div>
      </Grupo>
    </Marco>
  );
}
