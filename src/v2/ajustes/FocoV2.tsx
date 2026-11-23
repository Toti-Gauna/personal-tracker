/**
 * Trazo 2.0 · Foco (#/foco): la sesión de concentración a pantalla completa. Un anillo grande con lo que queda del tramo, pausar,
 * pasar al descanso y terminar. Corre sobre la misma máquina de estados que la 1.0 (`data/focus` y `useFocusRunner`, que avisa y
 * suena cuando termina un tramo); al terminar guarda lo mismo: los minutos de foco hechos, en el día.
 */
import { useState } from 'react';
import { AREAS } from '../../data/defaults';
import { etiquetaDeBloque } from '../../data/etiquetas';
import { focusIndex, pause, restNow, resume, segProgress, segRemaining, skipRest } from '../../data/focus';
import { focusMinutes } from '../../data/pomodoro';
import { blockEnd } from '../../data/schedule';
import { fmtClock, nowMin, toHHMM } from '../../data/time';
import { ir } from '../../lib/routes';
import { addNote, logFocus, setFocus, useStore } from '../../state/store';
import { useNow } from '../../ui/useNow';
import { colorV2 } from '../hoy/datos';
import { Pasos } from '../hoy/Pasos';
import { aviso, confirmar } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Vacio } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { useInmersiva } from '../sesiones/comun';
import { Tramos } from './piezas';
import '../hoy/hoy.css';
import './ajustes.css';

export default function FocoV2({ day }: PropsV2) {
  const focus = useStore((s) => s.focus);
  const planSt = useStore((s) => s.plan);
  const study = useStore((s) => s.study);
  const t0 = useStore((s) => s.settings?.startDate);
  const now = useNow(250);
  const [anotando, setAnotando] = useState(false);
  const [nota, setNota] = useState('');

  const block = focus && day.blocks.find((b) => b.key === focus.key);
  if (!focus || !block) {
    return (
      <Marco className="ax" titulo="Foco" volver={{ href: '#/hoy', nombre: 'Hoy' }}>
        <Vacio ilustracion="foco" titulo="No hay un foco corriendo" texto="Elegí una meta en Hoy y entrá en foco." accion={<Boton variante="primario" icono="play" href="#/hoy">Ir a Hoy</Boton>} />
      </Marco>
    );
  }

  const area = AREAS[block.area];
  const color = colorV2(area.css);
  const tag = etiquetaDeBloque(block, { day, t0, plan: planSt, study });
  const delArea = day.blocks.filter((b) => b.area === block.area);
  const seg = focus.segs[focus.i];
  const enFoco = seg.type === 'focus';
  const pausado = focus.pausedAt != null;
  const progreso = segProgress(focus, now);
  const ultimo = focus.i === focus.segs.length - 1;
  const { n, m } = focusIndex(focus);
  const colorTramo = pausado ? 'var(--texto-3)' : enFoco ? color : 'var(--a-salud)';
  const estado = pausado ? 'En pausa' : enFoco ? 'Concentración' : 'Descanso';

  /** Lo que se guarda al terminar: los tramos de foco completos y la parte hecha del actual. */
  const hechos = () => focus.segs.slice(0, focus.i).concat(enFoco ? [{ ...seg, min: Math.round((seg.min * 60000 - segRemaining(focus, now)) / 60000) }] : []);
  const terminar = () => {
    logFocus(day.date, { key: block.key, plan: focus.plan, focusMin: focusMinutes(hechos()), at: toHHMM(nowMin()) });
    setFocus(null);
    ir('hoy');
  };
  const cortar = async () => {
    const min = focusMinutes(hechos());
    const ok = await confirmar({ titulo: '¿Terminás el foco?', texto: min ? `Se guardan los ${min} min de foco que llevás.` : 'Todavía no llevás minutos de foco: no se guarda nada.', accion: 'Terminar el foco' });
    if (ok) terminar();
  };
  const guardarNota = () => {
    addNote(day.date, nota);
    setNota('');
    setAnotando(false);
    aviso({ titulo: 'Anotado', sub: 'Queda en el JSON del día para hacer la tarjeta', tono: 'hecho' });
  };

  return (
    <>
    <Inmersivo />
    <main className={`v2 v2-completa ax-foco${pausado ? ' ax-foco-pausa' : ''}`} style={{ ['--area' as string]: colorTramo }} aria-label="Foco">
      <header className="ax-foco-barra">
        <Boton variante="fantasma" icono="atras" href="#/hoy">Hoy</Boton>
        <span className="t-dato t-nota">{block.start} – {toHHMM(blockEnd(block))}</span>
      </header>

      <div className="ax-foco-cuerpo">
        <p className="t-rotulo ax-foco-kicker"><i className="area-punto" style={{ ['--area' as string]: color }} /> {area.name} · bloque {delArea.indexOf(block) + 1} de {delArea.length}</p>
        <h1 className="t-seccion ax-foco-titulo">{block.title.split(' · ')[0]}</h1>
        {tag && tag !== 'fuera del plan' && <p className="t-nota">{tag}</p>}

        <div className="ax-foco-reloj" role="timer" aria-label={`${estado}: quedan ${fmtClock(segRemaining(focus, now))}`} data-grafico>
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle className="ax-foco-fondo" cx="100" cy="100" r="92" pathLength={1} />
            <circle className="ax-foco-valor" cx="100" cy="100" r="92" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - progreso} transform="rotate(-90 100 100)" />
          </svg>
          <div className="ax-foco-centro">
            <span className="t-rotulo">{estado}</span>
            <b className="ax-foco-tiempo t-dato">{fmtClock(segRemaining(focus, now))}</b>
            <span className="t-nota">{enFoco ? `Foco ${n} de ${m}` : `Descanso de ${seg.min} min`}</span>
          </div>
        </div>

        <div className="ax-foco-plan">
          <Tramos segs={focus.segs} actual={focus.i} area={color} nombre={`Plan ${focus.plan}`} />
          <Boton tamano="s" variante="fantasma" icono="editar" href={`#/elegir/${block.key}`}>{focus.plan} · cambiar</Boton>
        </div>

        <div className="ax-foco-botones">
          <Boton ancho icono={pausado ? 'play' : 'pausa'} onClick={() => setFocus(pausado ? resume(focus, Date.now()) : pause(focus, Date.now()))}>{pausado ? 'Seguir' : 'Pausar'}</Boton>
          {enFoco ? <Boton ancho variante="primario" icono="reloj" onClick={() => setFocus(restNow(focus, Date.now()))}>Descanso ahora</Boton>
            : ultimo ? <Boton ancho variante="primario" icono="tilde" onClick={terminar}>Terminar</Boton>
            : <Boton ancho variante="primario" icono="adelantado" onClick={() => setFocus(skipRest(focus, Date.now()))}>Seguir ahora</Boton>}
        </div>

        <section className="capa-1 ax-foco-pasos" aria-label="Pasos de este bloque">
          <Pasos date={day.date} block={block} editable />
        </section>
        <div className="capa-1 s-lista ax-foco-fila"><Fila icono="documento" titulo="Anotar algo para una tarjeta" onClick={() => setAnotando(true)} /></div>
        <Boton variante="fantasma" icono="cerrar" onClick={cortar}>Terminar el foco</Boton>
      </div>

      <Hoja abierta={anotando} onCerrar={() => setAnotando(false)} titulo="Anotar para una tarjeta"
        pie={<><Boton onClick={() => setAnotando(false)}>Cancelar</Boton><Boton variante="primario" icono="tilde" deshabilitado={nota.trim() ? false : 'Escribí la nota.'} onClick={guardarNota}>Guardar nota</Boton></>}>
        <CampoTexto etiqueta="Nota para una tarjeta" valor={nota} onCambio={setNota} multilinea />
      </Hoja>
    </main>
    </>
  );
}

/** Mientras corre el foco, la barra y la tarjeta del foco se sacan (no solo se tapan). */
function Inmersivo() {
  useInmersiva();
  return null;
}
