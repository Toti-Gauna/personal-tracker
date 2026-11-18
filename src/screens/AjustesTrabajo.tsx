/** Ola 27 · Ajustes: inicio del trabajo (un único campo), horario del trabajo y bloques pendientes (Handyx, clipping, Eclipse). */
import { useState } from 'react';
import { fechaCorta } from '../data/plan';
import {
  HORARIO_TRABAJO, NOMBRE_PENDIENTE, OBJETIVOS_PENDIENTES, ajustarTrabajo, pendienteEncaja, planRoutine,
  type BloquePendiente, type ObjetivoPendiente,
} from '../data/routines';
import { addDays } from '../data/time';
import { setPlanSettings } from '../state/plan';
import { inicioTrabajo, planSettings, useStore } from '../state/store';
import { T0_PLAN } from '../data/plan';

const DIAS: [BloquePendiente['dias'], string][] = [['lv', 'Lunes a viernes'], ['finde', 'Fin de semana'], ['todos', 'Todos los días']];

/** Las dos filas del trabajo nuevo: la fecha de inicio y el horario. */
export function FilasTrabajo() {
  const settings = useStore((s) => s.settings)!;
  const cfg = planSettings(settings);
  const inicio = inicioTrabajo(settings);
  const porDefecto = addDays(settings.startDate || T0_PLAN, 56);
  const h = cfg.horarioTrabajo ?? HORARIO_TRABAJO;
  const { tarde } = ajustarTrabajo(planRoutine('con-trabajo', 'completo'), h);
  const guardar = (x: Partial<typeof h>) => setPlanSettings({ horarioTrabajo: { ...h, ...x } });
  return (
    <>
      <li>
        <span><b>Inicio del trabajo</b><small>Desde esa fecha rige la rutina con trabajo (el modo intensivo termina el día anterior) y el calendario del plan se recalcula con las horas de esa rutina. {cfg.t2 ? `Cargado: ${fechaCorta(cfg.t2)}.` : `Por defecto, T+2 (${fechaCorta(porDefecto)}).`}</small></span>
        <span className="aj-dos">
          <input className="campo-texto mono" type="date" value={inicio} onChange={(e) => e.target.value && setPlanSettings({ t2: e.target.value })} aria-label="Inicio del trabajo" />
          {cfg.t2 && <button className="subrayado" onClick={() => setPlanSettings({ t2: undefined })}>Restaurar</button>}
        </span>
      </li>
      <li className="aj-columna">
        <span><b>Horario del trabajo</b><small>{tarde.sinMatematica ? 'Con esta salida no entra la matemática de la tarde: queda como deuda de horas. ' : ''}La programación de la mañana no se toca; idiomas y entreno se acomodan después de la salida (entreno de {Math.floor(tarde.entrenoMin / 60)} h{tarde.entrenoMin % 60 ? ` ${tarde.entrenoMin % 60} min` : ''} con las caminatas).</small></span>
        <div className="dos-campos">
          <label>Entrada<input className="campo-texto mono" type="time" value={h.inicio} onChange={(e) => e.target.value && guardar({ inicio: e.target.value })} /></label>
          <label>Salida<input className="campo-texto mono" type="time" value={h.fin} onChange={(e) => e.target.value && guardar({ fin: e.target.value })} /></label>
        </div>
      </li>
    </>
  );
}

function Pendiente({ o }: { o: ObjetivoPendiente }) {
  const cfg = planSettings(useStore((s) => s.settings));
  const actual = cfg.bloquesPendientes?.[o];
  const [start, setStart] = useState(actual?.start ?? '17:00');
  const [min, setMin] = useState(String(actual?.min ?? 90));
  const [dias, setDias] = useState<BloquePendiente['dias']>(actual?.dias ?? 'finde');
  const [error, setError] = useState('');
  const nombre = NOMBRE_PENDIENTE[o];
  const guardar = () => {
    const b: BloquePendiente = { start, min: Number(min), dias };
    const e = pendienteEncaja(b);
    if (e) { setError(e); return; }
    setError('');
    setPlanSettings({ bloquesPendientes: { ...(cfg.bloquesPendientes ?? {}), [o]: b } });
  };
  const quitar = () => {
    const { [o]: _x, ...resto } = cfg.bloquesPendientes ?? {};
    setPlanSettings({ bloquesPendientes: resto });
    setError('');
  };
  return (
    <li className="aj-columna">
      <span><b>{nombre}</b><small>{actual ? `Bloque asignado: ${actual.start}, ${actual.min} min.` : o === 'clipping' ? 'Pausado: sin bloque no hay alertas, fechas ni metas. Se reactiva al asignarle uno.' : 'Bloque pendiente: sin horario asignado no aparece en Hoy.'}</small></span>
      <div className="dos-campos">
        <label>Empieza<input className="campo-texto mono" type="time" value={start} onChange={(e) => { setStart(e.target.value); setError(''); }} aria-label={`Hora de ${nombre}`} /></label>
        <label>Dura (min)<input className="campo-texto mono" inputMode="numeric" value={min} onChange={(e) => { setMin(e.target.value.replace(/\D/g, '')); setError(''); }} aria-label={`Duración de ${nombre}`} /></label>
      </div>
      <select className="campo-texto" value={dias} onChange={(e) => { setDias(e.target.value as BloquePendiente['dias']); setError(''); }} aria-label={`Días de ${nombre}`}>
        {DIAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
      {error && <p className="hdia-error" role="alert">{error}</p>}
      <span className="aj-dos">
        {actual && <button className="subrayado" onClick={quitar}>Quitar</button>}
        <button className="btn-borde" onClick={guardar}>{actual ? 'Cambiar' : 'Asignar'}</button>
      </span>
    </li>
  );
}

/** Handyx, clipping y Eclipse no tienen bloque en las rutinas nuevas: acá les asignás uno (solo entra en un hueco libre). */
export function BloquesPendientes() {
  return (
    <>
      <li className="aj-columna"><span><b>Bloques pendientes</b><small>Handyx, clipping y Eclipse no tienen bloque en las rutinas nuevas. Asignales un horario: solo entra donde no pisa otra meta (el descanso del fin de semana cede su tiempo).</small></span></li>
      {OBJETIVOS_PENDIENTES.map((o) => <Pendiente key={o} o={o} />)}
    </>
  );
}
