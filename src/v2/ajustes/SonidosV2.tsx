/**
 * Trazo 2.0 · Sonidos y alarmas (#/sonidos): qué suena en cada aviso (se prueba con el botón de play), el volumen, la vibración y las
 * alarmas que se pasan al calendario del teléfono. Con la app abierta suenan solos; con la app cerrada, el calendario.
 */
import { useState } from 'react';
import { buildIcs } from '../../data/ics';
import { DEFAULT_ALARMS, DEFAULT_SOUNDS, EVENT_LABEL, EVENT_ORDER, SOUNDS, SOUND_ORDER } from '../../data/sounds';
import type { Alarm, SoundEvent } from '../../data/types';
import { alarmsOf, setAlarms, setSoundFor, setVibrate, setVolume } from '../../state/profile';
import { useStore } from '../../state/store';
import { playSound } from '../../ui/sound';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoHora, Interruptor } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { descargar } from './piezas';
import '../proyecto/proyecto.css';
import './ajustes.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Con la app abierta, cada aviso suena con el sonido que elijas.</p>
    <p className="t-cuerpo">Una app web no puede sonar con el teléfono bloqueado y la app cerrada. Para eso, Trazo pasa tus alarmas al calendario del teléfono, que sí suena siempre.</p>
    <p className="t-cuerpo">Se descarga un archivo .ics: abrilo y el teléfono las agrega. Se repiten todos los días.</p>
  </>
);

export default function SonidosV2({ today }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const sonidos = settings.sounds ?? DEFAULT_SOUNDS;
  const alarmas = alarmsOf(settings);
  const [evento, setEvento] = useState<SoundEvent | null>(null);
  const activas = alarmas.filter((a) => a.on);

  const cambiarAlarma = (id: string, p: Partial<Alarm>) => setAlarms(alarmas.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const agregar = () => {
    descargar(buildIcs(alarmas, today), 'trazo-alarmas.ics', 'text/calendar;charset=utf-8');
    aviso({ titulo: `${activas.length} ${activas.length === 1 ? 'alarma lista' : 'alarmas listas'}`, sub: 'Abrí el archivo y el teléfono las agrega al calendario', tono: 'hecho' });
  };

  const fabrica = () => {
    const previas = alarmas;
    setAlarms(DEFAULT_ALARMS);
    aviso({ titulo: 'Alarmas de fábrica', sub: 'Volvieron las cuatro de siempre', deshacer: () => setAlarms(previas) });
  };

  return (
    <Marco className="ax" titulo="Sonidos y alarmas" volver={{ href: '#/ajustes', nombre: 'Ajustes' }} info={INFO}>
      <Grupo titulo="Con la app abierta">
        <div className="capa-1 s-lista">
          {EVENT_ORDER.map((ev) => {
            const id = sonidos.events[ev];
            return (
              <div key={ev} className="ax-evento">
                <button type="button" className="s-fila s-tocable" aria-label={`${EVENT_LABEL[ev]}: ${SOUNDS[id].name}. Cambiar`} onClick={() => setEvento(ev)}>
                  <span className="s-fila-texto"><b>{EVENT_LABEL[ev]}</b><small>{SOUNDS[id].name}</small></span>
                  <Icono nombre="siguiente" lado={18} className="icono s-chevron" />
                </button>
                <Boton soloIcono variante="fantasma" icono="play" etiqueta={`Probar: ${EVENT_LABEL[ev]}`} onClick={() => playSound(id, sonidos.volume)} />
              </div>
            );
          })}
        </div>
        <div className="capa-1 ax-volumen">
          <div className="ax-volumen-cab"><label htmlFor="ax-vol" className="t-cuerpo-l">Volumen</label><output htmlFor="ax-vol" className="t-dato">{sonidos.volume} %</output></div>
          <input id="ax-vol" className="ax-rango" type="range" min={0} max={100} step={5} value={sonidos.volume} style={{ ['--v' as string]: `${sonidos.volume}%` }}
            onChange={(e) => setVolume(Number(e.target.value))}
            onPointerUp={() => playSound(sonidos.events.pomodoro, sonidos.volume)} onKeyUp={() => playSound(sonidos.events.pomodoro, sonidos.volume)} />
          <Interruptor prendido={sonidos.vibrate} onCambio={setVibrate} etiqueta="Vibrar con cada aviso" />
        </div>
      </Grupo>

      <Grupo titulo="Con la app cerrada">
        <div className="capa-1 ax-alarmas">
          {alarmas.map((a) => <Interruptor key={a.id} prendido={a.on} onCambio={(v) => cambiarAlarma(a.id, { on: v })} etiqueta={a.title} nota={<span className="t-dato">{a.time}</span>} />)}
        </div>
        <div className="capa-1 s-lista">
          <FilaHoja icono="reloj" titulo="Cambiar las horas" tituloHoja="Horas de las alarmas" valor={`${activas.length} de ${alarmas.length}`}>
            <div className="ax-horas">
              {alarmas.map((a) => <CampoHora key={a.id} etiqueta={a.title} valor={a.time} onCambio={(v) => cambiarAlarma(a.id, { time: v })} />)}
            </div>
          </FilaHoja>
        </div>
        <Boton variante="primario" ancho icono="calendario" deshabilitado={activas.length ? false : 'Prendé al menos una alarma.'} onClick={agregar}>Agregar {activas.length} {activas.length === 1 ? 'alarma' : 'alarmas'} al calendario</Boton>
        <Boton variante="fantasma" ancho icono="deshacer" onClick={fabrica}>Volver a las de fábrica</Boton>
      </Grupo>

      <Hoja abierta={evento != null} onCerrar={() => setEvento(null)} titulo={evento ? EVENT_LABEL[evento] : 'Sonido'}
        pie={<Boton variante="primario" onClick={() => setEvento(null)}>Listo</Boton>}>
        {evento && (
          <div role="radiogroup" aria-label={`Sonido: ${EVENT_LABEL[evento]}`}>
            {SOUND_ORDER.map((sid) => (
              <button key={sid} type="button" role="radio" aria-checked={sonidos.events[evento] === sid} className="k-opcion"
                onClick={() => { setSoundFor(evento, sid); playSound(sid, sonidos.volume); }}>
                <span><b>{SOUNDS[sid].name}</b></span>
                {sonidos.events[evento] === sid && <Icono nombre="tilde" lado={20} />}
              </button>
            ))}
          </div>
        )}
      </Hoja>
    </Marco>
  );
}
