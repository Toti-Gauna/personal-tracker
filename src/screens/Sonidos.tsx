import { useEffect, useState } from 'react';
import { buildIcs } from '../data/ics';
import { DEFAULT_ALARMS, DEFAULT_SOUNDS, EVENT_LABEL, EVENT_ORDER, SOUNDS, SOUND_ORDER } from '../data/sounds';
import type { Alarm } from '../data/types';
import { useStore } from '../state/store';
import { alarmsOf, setAlarms, setSoundFor, setVibrate, setVolume } from '../state/profile';
import { toast } from '../ui/avisos';
import { Casilla } from '../ui/Casilla';
import { playSound } from '../ui/sound';
import '../styles/perfil.css';

/** Hora en 24 h, escrita a mano: HH:MM. Si queda mal escrita, vuelve a la anterior. */
function HoraInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [txt, setTxt] = useState(value);
  useEffect(() => setTxt(value), [value]);
  const ok = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const fin = () => {
    const m = txt.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
    const v = m ? `${m[1].padStart(2, '0')}:${m[2]}` : txt;
    if (ok(v)) onChange(v);
    else setTxt(value);
  };
  return <input className="hora mono" inputMode="numeric" value={txt} maxLength={5} onChange={(e) => setTxt(e.target.value)} onBlur={fin} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label={label} />;
}

/** 6.5 Sonidos y alarmas: con la app abierta suenan; con la app cerrada, el calendario del teléfono. */
export function Sonidos({ today }: { today: string }) {
  const settings = useStore((s) => s.settings)!;
  const sonidos = settings.sounds ?? DEFAULT_SOUNDS;
  const alarmas = alarmsOf(settings);
  const [abierta, setAbierta] = useState<string | null>(null);
  const activas = alarmas.filter((a) => a.on);

  const cambiarAlarma = (id: string, p: Partial<Alarm>) => setAlarms(alarmas.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const descargar = () => {
    const ics = buildIcs(alarmas, today);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'trazo-alarmas.ics' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: `${activas.length} ${activas.length === 1 ? 'alarma lista' : 'alarmas listas'}`, sub: 'Abrí el archivo y el teléfono las agrega al calendario', color: 'var(--economia)' }, false);
  };

  return (
    <main className="pantalla sonidos">
      <div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div>
      <h1 className="titulo">Sonidos y alarmas</h1>

      <div className="etiqueta aj-t">Con la app abierta</div>
      <ul className="evento-lista">
        {EVENT_ORDER.map((ev) => {
          const id = sonidos.events[ev];
          return (
            <li key={ev}>
              <div className="evento-fila">
                <span><b>{EVENT_LABEL[ev]}</b><small>{SOUNDS[id].desc}</small></span>
                <button className="subrayado" aria-expanded={abierta === ev} onClick={() => setAbierta(abierta === ev ? null : ev)}>Cambiar</button>
                <button className="btn-play" aria-label={`Probar: ${EVENT_LABEL[ev]}`} onClick={() => playSound(id, sonidos.volume)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                </button>
              </div>
              {abierta === ev && (
                <div className="cambiar-op" role="radiogroup" aria-label={`Sonido: ${EVENT_LABEL[ev]}`}>
                  {SOUND_ORDER.map((sid) => (
                    <button key={sid} role="radio" aria-checked={id === sid} onClick={() => { setSoundFor(ev, sid); playSound(sid, sonidos.volume); }}>{SOUNDS[sid].name}</button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="fila-ajuste">
        <label htmlFor="vol">Volumen</label>
        <input id="vol" className="volumen" type="range" min={0} max={100} step={5} value={sonidos.volume} onChange={(e) => setVolume(Number(e.target.value))} onPointerUp={() => playSound(sonidos.events.pomodoro, sonidos.volume)} />
        <span className="mono">{sonidos.volume}</span>
      </div>
      <div className="fila-ajuste">
        <span>Vibrar con cada aviso</span>
        <button role="switch" className="switch" aria-checked={sonidos.vibrate} aria-label="Vibrar con cada aviso" onClick={() => setVibrate(!sonidos.vibrate)} />
      </div>

      <div className="etiqueta aj-t">Con la app cerrada</div>
      <p className="sub">Una app web no puede sonar con el teléfono bloqueado y la app cerrada. Para eso, Trazo pasa tus alarmas al calendario del teléfono, que sí suena siempre.</p>
      <ul className="alarmas">
        {alarmas.map((a) => (
          <li key={a.id}>
            <Casilla checked={a.on} label={`${a.time} ${a.title}`} onChange={() => cambiarAlarma(a.id, { on: !a.on })} />
            <HoraInput value={a.time} label={`Hora: ${a.title}`} onChange={(v) => cambiarAlarma(a.id, { time: v })} />
            <span>{a.title}</span>
          </li>
        ))}
      </ul>
      <button className="btn-principal" disabled={!activas.length} onClick={descargar}>Agregar {activas.length} {activas.length === 1 ? 'alarma' : 'alarmas'} al calendario</button>
      <p className="nota">Se descarga un archivo .ics; abrilo y el teléfono las agrega. Se repiten todos los días.</p>
      <button className="terminar-foco" onClick={() => setAlarms(DEFAULT_ALARMS)}>Volver a las alarmas de fábrica</button>
    </main>
  );
}
