/**
 * Trazo 2.0 · Semana de entreno (#/entreno-semana): qué entrenás cada día. Se elige una plantilla o se cambia día por día (en una
 * hoja). Si faltaste, propone pasar los próximos días a Full body. Escribe con las mismas acciones que la 1.0.
 */
import { useState } from 'react';
import { T0_PLAN } from '../../data/plan';
import { weekday } from '../../data/study';
import { addDays } from '../../data/time';
import { adjustDays, fmtH, monday, opcionesDia, rutinaDelDia, sessionsInWeek, trainingMin } from '../../data/train';
import { REST_DAY, REST_DAY_MIN, TEMPLATE_LABEL } from '../../data/train-catalog';
import type { Template } from '../../data/train-types';
import { useStore } from '../../state/store';
import { adjustWeek, dismissAdjust, setDay, setTemplate } from '../../state/train';
import { Icono } from '../iconos';
import { Boton, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import './ajustes.css';

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const NOMBRES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const INFO = (
  <>
    <p className="t-cuerpo-l">Elegí una plantilla o cambiá qué entrenás cada día.</p>
    <p className="t-cuerpo">Si cambiás un día a mano, la plantilla pasa a "Propia". Las rutinas con A/B se alternan por semana: una semana toca la A y la otra la B.</p>
    <p className="t-cuerpo">Si faltás a un entreno, Trazo te propone pasar los próximos días a Full body para cubrir la semana.</p>
  </>
);

export default function SemanaV2({ day }: PropsV2) {
  const t = useStore((s) => s.train);
  const t0 = useStore((s) => s.settings?.startDate) || T0_PLAN;
  const [editando, setEditando] = useState<number | null>(null);
  const date = day.date;
  const m = monday(date);
  const hoy = weekday(date);
  const hechos = new Set(sessionsInWeek(t, date).map((s) => s.date));
  // Días que ya pasaron, tocaban entrenar y no se hizo.
  const perdidos = t.plan.days.map((id, i) => ({ id, i })).filter(({ id, i }) => i < hoy && id && id !== REST_DAY && !hechos.has(addDays(m, i)));
  const dos = adjustDays(t.plan, hoy).map((i) => ({ i, id: t.plan.days[i] }));
  const mostrarAviso = perdidos.length > 0 && dos.length > 0 && !t.dismissed.includes(m) && !dos.every(({ id }) => id === 'full');
  const elegir = (id: string | null) => { if (editando != null) setDay(editando, id); setEditando(null); };
  const actual = editando != null ? t.plan.days[editando] : undefined;

  return (
    <Marco className="ax" titulo="Semana de entreno" volver={{ href: '#/entreno', nombre: 'Entreno' }} info={INFO}>
      <Segmentado etiqueta="Plantilla" valor={t.plan.template} opciones={(Object.keys(TEMPLATE_LABEL) as Template[]).map((k) => [k, TEMPLATE_LABEL[k]] as [Template, string])} onCambio={setTemplate} />

      {mostrarAviso && (
        <section className="capa-1 ax-ajuste" aria-label="Ajuste de la semana">
          <p className="t-cuerpo">Faltaste {perdidos.length === 1 ? `el ${NOMBRES[perdidos[0].i]}` : `${perdidos.length} días`}. ¿Pasamos {dos.map(({ i }) => NOMBRES[i]).join(' y ')} a <b>Full body</b>?</p>
          <div className="ax-dos">
            <Boton variante="primario" icono="tilde" onClick={() => adjustWeek(date, dos.length)}>Sí, ajustar</Boton>
            <Boton onClick={() => dismissAdjust(m)}>Dejar como está</Boton>
          </div>
        </section>
      )}

      <ul className="capa-1 ax-dias">
        {t.plan.days.map((id, i) => {
          const r = rutinaDelDia(t.routines, id, addDays(m, i), t0);
          const alterna = !!r?.variante && id === r.slot;
          const perdido = perdidos.some((p) => p.i === i);
          const hecho = hechos.has(addDays(m, i));
          const nombre = r ? r.name : id === REST_DAY ? 'Descanso activo' : 'Libre';
          const detalle = r ? `18:00 · ${fmtH(trainingMin(r))}${alterna ? ' · A/B' : ''}` : id === REST_DAY ? `Caminar ${REST_DAY_MIN} min` : 'Sin entreno';
          const pie = perdido ? 'No se hizo' : hecho ? 'Hecho' : detalle;
          return (
            <li key={i} className={i === hoy ? 'ax-hoy' : undefined}>
              <button type="button" className="ax-dia" aria-label={`${NOMBRES[i]}${i === hoy ? ' (hoy)' : ''}: ${nombre} ${pie}. Cambiar`} onClick={() => setEditando(i)}>
                <span className="ax-dia-n t-rotulo" aria-hidden="true">{DIAS[i]}</span>
                <span className="ax-dia-t">
                  <b>{nombre}</b>{' '}
                  <small>
                    {perdido || hecho ? <><Icono nombre={perdido ? 'atencion' : 'tilde'} lado={14} /> {pie}</> : pie}
                  </small>
                </span>
                <Icono nombre="siguiente" lado={18} className="icono s-chevron" />
              </button>
            </li>
          );
        })}
      </ul>

      <Boton variante={mostrarAviso ? 'secundario' : 'primario'} ancho icono="mas" href="#/entreno-rutina/nueva">Crear rutina</Boton>

      <Hoja abierta={editando != null} onCerrar={() => setEditando(null)} titulo={editando != null ? `Qué entrenás el ${NOMBRES[editando]}` : 'Qué entrenás'}>
        <div role="radiogroup" aria-label={editando != null ? `Qué entrenás el ${NOMBRES[editando]}` : 'Qué entrenás'}>
          {opcionesDia(t.routines).map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={actual === x.id} className="k-opcion" onClick={() => elegir(x.id)}>
              <span><b>{x.nombre}{x.alterna ? ' A/B' : ''}</b></span>{actual === x.id && <Icono nombre="tilde" lado={20} />}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={actual === REST_DAY} className="k-opcion" onClick={() => elegir(REST_DAY)}>
            <span><b>Descanso activo</b><small>Caminar {REST_DAY_MIN} min</small></span>{actual === REST_DAY && <Icono nombre="tilde" lado={20} />}
          </button>
          <button type="button" role="radio" aria-checked={actual == null} className="k-opcion" onClick={() => elegir(null)}>
            <span><b>Libre</b></span>{actual == null && <Icono nombre="tilde" lado={20} />}
          </button>
        </div>
      </Hoja>
    </Marco>
  );
}
