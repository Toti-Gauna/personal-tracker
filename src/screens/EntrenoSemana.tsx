import { useState } from 'react';
import { addDays } from '../data/time';
import { weekday } from '../data/study';
import { adjustDays, exercisesMin, monday, sessionsInWeek } from '../data/train';
import { REST_DAY, REST_DAY_MIN, TEMPLATE_LABEL } from '../data/train-catalog';
import type { Template } from '../data/train-types';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { adjustWeek, dismissAdjust, setDay, setTemplate } from '../state/train';
import '../styles/entreno.css';

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const NOMBRES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** 5.2 Semana de entrenamiento: qué entrenás cada día, o una plantilla. */
export function EntrenoSemana({ day }: { day: DayLog }) {
  const t = useStore((s) => s.train);
  const partner = useStore((s) => s.settings!.names.partner);
  const [editando, setEditando] = useState<number | null>(null);
  const date = day.date;
  const m = monday(date);
  const hoy = weekday(date);
  const hechos = new Set(sessionsInWeek(t, date).map((s) => s.date));
  // Días que ya pasaron, tocaban entrenar y no se hizo.
  const perdidos = t.plan.days.map((id, i) => ({ id, i })).filter(({ id, i }) => i < hoy && id && id !== REST_DAY && !hechos.has(addDays(m, i)));
  const dos = adjustDays(t.plan, hoy).map((i) => ({ i, id: t.plan.days[i] }));
  const mostrarAviso = perdidos.length > 0 && dos.length > 0 && !t.dismissed.includes(m) && !dos.every(({ id }) => id === 'full');

  return (
    <main className="pantalla entreno-semana">
      <div className="topbar"><a className="volver" href="#/entreno">Entreno</a></div>
      <div className="etiqueta">Qué entrenás cada día</div>
      <h1 className="titulo">Semana de entreno</h1>

      <div className="segmentado" role="radiogroup" aria-label="Plantilla">
        {(Object.keys(TEMPLATE_LABEL) as Template[]).map((k) => (
          <button key={k} role="radio" aria-checked={t.plan.template === k} onClick={() => setTemplate(k)}>{TEMPLATE_LABEL[k]}</button>
        ))}
      </div>

      {mostrarAviso && (
        <div className="aviso-ajuste">
          <p>
            Faltaste {perdidos.length === 1 ? `el ${NOMBRES[perdidos[0].i]}` : `${perdidos.length} días`}. ¿Pasamos {dos.map(({ i }) => NOMBRES[i]).join(' y ')} a <b>Full body</b> para cubrir la semana?
          </p>
          <div className="dos-botones">
            <button className="btn-principal" onClick={() => adjustWeek(date, dos.length)}>Sí, ajustar</button>
            <button className="btn-borde" onClick={() => dismissAdjust(m)}>Dejar como está</button>
          </div>
        </div>
      )}

      <ul className="dias-lista">
        {t.plan.days.map((id, i) => {
          const r = t.routines.find((x) => x.id === id);
          const perdido = perdidos.some((p) => p.i === i);
          const hecho = hechos.has(addDays(m, i));
          return (
            <li key={i} className={i === hoy ? 'hoy' : ''}>
              <span className={`mono dia-n${perdido ? ' perdido' : ''}`}>{DIAS[i]}</span>
              <span className="dia-t">
                <b className={perdido ? 'tachado' : id === REST_DAY ? 'sub' : ''}>{r ? r.name : id === REST_DAY ? 'Descanso activo' : 'Libre'}</b>
                <small>
                  {perdido ? 'No se hizo' : hecho ? 'Hecho' : r ? `18:00 · ${exercisesMin(r)} min${i === 1 || i === 2 ? ` · con ${partner}` : ''}${id === 'full' && i === 5 ? ' · opcional' : ''}` : id === REST_DAY ? `caminar ${REST_DAY_MIN} min` : ''}
                </small>
              </span>
              <button className="btn-cambiar" onClick={() => setEditando(editando === i ? null : i)} aria-expanded={editando === i}>Cambiar</button>
              {editando === i && (
                <div className="cambiar-op" role="radiogroup" aria-label={`Qué entrenás el ${NOMBRES[i]}`}>
                  {t.routines.map((x) => (
                    <button key={x.id} role="radio" aria-checked={id === x.id} onClick={() => { setDay(i, x.id); setEditando(null); }}>{x.name}</button>
                  ))}
                  <button role="radio" aria-checked={id === REST_DAY} onClick={() => { setDay(i, REST_DAY); setEditando(null); }}>Descanso activo</button>
                  <button role="radio" aria-checked={id == null} onClick={() => { setDay(i, null); setEditando(null); }}>Libre</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button className="nueva-meta-btn" onClick={() => ir('entreno-rutina/nueva')}>+ Crear rutina</button>
    </main>
  );
}
