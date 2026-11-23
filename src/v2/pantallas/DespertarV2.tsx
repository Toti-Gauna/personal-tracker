/**
 * Trazo 2.0 · Buen día: la primera apertura de cada día pregunta a qué hora te levantaste. Tres opciones grandes, otra hora
 * a mano, y un botón. Cómo queda la mañana se abre en una hoja: ya no ocupa la pantalla.
 */
import { useMemo, useState } from 'react';
import { dayNumber } from '../../data/derive';
import { tituloDeBloque } from '../../data/etiquetas';
import { DAY_ROUTINES, TARDE, isMeta, planRoutine, routineFor, wakeDe, wakeRange } from '../../data/routines';
import { fmtDur, fmtFecha, nowMin, toHHMM } from '../../data/time';
import type { RoutineId } from '../../data/types';
import { defaultChoice } from '../../screens/Despertar';
import { inicioTrabajo, planSettings, startDay, useStore } from '../../state/store';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import '../tokens.css';
import '../base.css';
import '../kit/kit.css';
import '../kit/superficies.css';
import '../marco/marco.css';
import { cuantos } from '../reglas';

const PASO = 10;
const MODOS = [['completo', 'Día completo'], ['corto', 'Día corto'], ['tarde', 'Día tarde']] as const;

export default function DespertarV2({ date }: { date: string }) {
  const settings = useStore((s) => s.settings)!;
  const ahora = nowMin();
  const tipo = routineFor(date, { ...planSettings(settings), inicioTrabajo: inicioTrabajo(settings) });
  const inicial = useMemo(() => defaultChoice(ahora, tipo), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [eleccion, setEleccion] = useState<RoutineId>(inicial.r);
  const [otra, setOtra] = useState(inicial.otra);
  const [verManana, setVerManana] = useState(false);
  const rango = wakeRange(tipo);
  const WAKE = wakeDe(tipo);
  const horaDe = (id: 'completo' | 'corto' | 'tarde') => (id === 'tarde' ? TARDE.wake : WAKE[id]);
  const hora = eleccion === 'otra' ? toHHMM(otra) : horaDe(eleccion);
  const plan = planRoutine(tipo, eleccion, hora);
  const primerFijo = plan.findIndex((p) => p.block.kind === 'fixed');
  const manana = eleccion === 'tarde' ? plan.filter((p) => p.block.id !== 'sueno') : plan.slice(0, primerFijo + 1);
  const metas = plan.filter((p) => isMeta(p.block)).length;
  const resumen = (id: 'completo' | 'corto' | 'tarde') => {
    if (id === 'tarde') return 'El estudio, a la tarde';
    const pr = planRoutine(tipo, id);
    const m = pr.slice(0, pr.findIndex((p) => p.block.kind === 'fixed')).filter((p) => isMeta(p.block));
    const txt = m.map((p) => `${p.block.short ?? p.block.label.toLowerCase()} ${fmtDur(p.min)}`).join(' · ');
    return txt[0].toUpperCase() + txt.slice(1);
  };

  return (
    <main className="v2 v2-pantalla bd" aria-labelledby="bd-t">
      <header className="bd-cabeza">
        <p className="t-rotulo">{fmtFecha(date)} · día {dayNumber(settings.startDate, date) + 1} · {toHHMM(ahora)}</p>
        <h1 id="bd-t" className="t-titulo">Buen día, {settings.names.me}</h1>
        <p className="t-cuerpo-l m-intro">¿A qué hora te levantaste?</p>
      </header>

      <div className="bd-opciones" role="radiogroup" aria-label="Rutina del día">
        {MODOS.filter(([id]) => id !== 'tarde' || tipo !== 'libre').map(([id, nombre]) => (
          <button key={id} type="button" role="radio" aria-checked={eleccion === id} className="bd-opcion" onClick={() => setEleccion(id)}>
            <span className="bd-hora">{horaDe(id)}</span>
            <span className="bd-opcion-texto"><b>{nombre}</b><small>{resumen(id)}</small></span>
            <Icono nombre="tilde" lado={20} />
          </button>
        ))}
        <div className={`bd-opcion otra${eleccion === 'otra' ? ' elegida' : ''}`}>
          <button type="button" role="radio" aria-checked={eleccion === 'otra'} aria-label={`Otra hora: ${toHHMM(otra)}`} className="bd-otra-radio" onClick={() => setEleccion('otra')}>
            <span className="bd-hora">{toHHMM(otra)}</span>
            <span className="bd-opcion-texto"><b>Otra hora</b><small>Corre los bloques</small></span>
          </button>
          <span className="bd-otra">
            <Boton soloIcono tamano="s" icono="menos" etiqueta="10 minutos antes" onClick={() => { setEleccion('otra'); setOtra((v) => Math.max(rango.min, v - PASO)); }} />
            <Boton soloIcono tamano="s" icono="mas" etiqueta="10 minutos después" onClick={() => { setEleccion('otra'); setOtra((v) => Math.min(rango.max, v + PASO)); }} />
          </span>
        </div>
      </div>

      <div className="capa-1 s-lista bd-resumen">
        <Fila icono="calendario" titulo={eleccion === 'tarde' ? 'Así queda tu día' : 'Así queda tu mañana'} nota={`${DAY_ROUTINES[tipo].label} · ${cuantos(metas, 'meta', 'metas')}`} onClick={() => setVerManana(true)} />
      </div>

      <div className="bd-pie">
        <Boton variante="primario" ancho icono="hoy" onClick={() => startDay(eleccion, hora, date)}>Empezar · {hora}</Boton>
      </div>

      <Hoja abierta={verManana} onCerrar={() => setVerManana(false)} titulo={eleccion === 'tarde' ? 'Tu día' : 'Tu mañana'}>
        <ul className="bd-manana">
          {manana.map((p) => (
            <li key={p.block.id}>
              <span className="t-dato">{p.start}</span>
              <span className="t-cuerpo">{tituloDeBloque({ rama: p.block.rama, key: p.block.id, title: p.block.label }, date, settings.startDate)}</span>
              <span className="t-dato">{p.block.kind === 'fixed' ? 'fijo' : fmtDur(p.min)}</span>
            </li>
          ))}
        </ul>
        <p className="t-nota">Te lo pregunta una vez por día, la primera vez que abrís Trazo.</p>
      </Hoja>
    </main>
  );
}
