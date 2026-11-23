/**
 * Trazo 2.0 · la sesión de estudio (#/sesion/<id>): el timer de cada meta de estudio, tramo por tramo. Un anillo con el tiempo que
 * queda, el tramo que toca y, abajo, la acción de ese tramo. Mismo foco, mismos tramos y mismas acciones que la 1.0: el tiempo, el
 * "Hecho", el pomodoro y la micro-tesis escriben lo mismo.
 */
import { useState } from 'react';
import { BUILTIN_PRESETS } from '../../data/defaults';
import { addMinutes, pause, resume, segProgress, segRemaining } from '../../data/focus';
import { capsTexto, microFaltantes } from '../../data/libros';
import { STEP_LABEL, presetName, rePomodoro, studyPreset, sumMin } from '../../data/study';
import type { Tramo } from '../../data/study-types';
import { fmtClock, fmtDur, toHHMM, toMin } from '../../data/time';
import { ir } from '../../lib/routes';
import { setFocus, useStore } from '../../state/store';
import { saveActivity } from '../../state/study';
import { startStudy, tramoHecho } from '../../ui/estudio-acciones';
import { useNow } from '../../ui/useNow';
import { useStudyPlan } from '../../ui/useStudy';
import { Icono } from '../iconos';
import { aviso, confirmar } from '../kit/capas';
import { Boton, Selector } from '../kit/controles';
import { Fila, Vacio } from '../kit/superficies';
import { haptico } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import { Inmersiva, areaDeFrente } from './comun';
import { MicroTesisHoja, progresoMicro } from './MicroTesisV2';

/** "Terminó el cold recall", "Terminó la tesis"… */
const TERMINO: Record<Tramo['kind'], string> = {
  cold: 'el cold recall', releer: 'la relectura', tarjetas: 'las tarjetas', tesis: 'la tesis', ejercicios: 'los ejercicios',
  examen: 'el examen corto', capitulo: 'el pomodoro', descanso: 'el descanso', test: 'el test',
};

const INFO = (
  <>
    <p className="t-cuerpo-l">Un tramo por vez: primero lo que vence, después el capítulo y al final el test.</p>
    <p className="t-cuerpo">Con "Hecho" cerrás el tramo y sus minutos suman a tu día. Los tramos de cold recall, tesis, tarjetas y test se hacen en su pantalla y vuelven acá.</p>
    <p className="t-cuerpo">Si salís, el reloj sigue corriendo: la sesión queda abierta hasta que la termines.</p>
  </>
);

/** Los tramos de la sesión: el pasado con tilde, el actual con su detalle. */
function Tramos({ tramos, actual }: { tramos: Tramo[]; actual: number }) {
  return (
    <ol className="capa-1 se-tramos" aria-label="Los tramos de la sesión">
      {tramos.map((x, i) => (
        <li key={i} className={i < actual ? 'pasado' : i === actual ? 'actual' : undefined} aria-current={i === actual ? 'step' : undefined}>
          <span className="se-tramo-n t-dato">{i < actual ? <Icono nombre="tilde" lado={14} /> : i + 1}{i < actual && <span className="v2-oculto">, hecho</span>}</span>
          <span className="se-tramo-txt"><b>{x.title}</b>{i === actual && <small>{x.sub}</small>}</span>
          <span className="t-dato se-tramo-min">{fmtDur(x.min)}</span>
        </li>
      ))}
    </ol>
  );
}

/** El anillo del tramo: se vacía mientras corre, con el tiempo que queda al medio. */
function Reloj({ restante, avance, total, pausado }: { restante: number; avance: number; total: number; pausado: boolean }) {
  const lado = 248;
  const grosor = 10;
  const r = (lado - grosor) / 2;
  const largo = 2 * Math.PI * r;
  return (
    <div className={`se-reloj${pausado ? ' pausado' : ''}`} role="timer" aria-label={`Quedan ${fmtClock(restante)}${pausado ? ', en pausa' : ''}`} data-grafico style={{ width: lado, height: lado }}>
      <svg viewBox={`0 0 ${lado} ${lado}`} aria-hidden="true">
        <circle className="se-reloj-fondo" cx={lado / 2} cy={lado / 2} r={r} strokeWidth={grosor} />
        <circle className="se-reloj-valor" cx={lado / 2} cy={lado / 2} r={r} strokeWidth={grosor} strokeDasharray={largo} strokeDashoffset={largo * avance} transform={`rotate(-90 ${lado / 2} ${lado / 2})`} />
      </svg>
      <span className="se-reloj-centro" aria-hidden="true">
        <b className="t-dato">{fmtClock(restante)}</b>
        <small className="t-rotulo">{pausado ? 'En pausa' : `de ${fmtClock(total * 60000)}`}</small>
      </span>
    </div>
  );
}

export default function SesionEstudioV2({ ruta, day }: PropsV2) {
  const id = ruta.param;
  const focus = useStore((s) => s.focus);
  const study = useStore((s) => s.study);
  const presets = useStore((s) => s.settings?.presets ?? []);
  const plan = useStudyPlan(day);
  const now = useNow(250);
  const [cerrado, setCerrado] = useState(-1);
  const [micro, setMicro] = useState(false);
  const c = plan.contenidos.find((x) => x.id === id);
  const activa = focus?.tramos && focus.activityId === id && focus.date === day.date ? focus : null;
  const a = study.activities.find((x) => x.id === id);
  const front = study.fronts.find((f) => f.id === a?.front);
  const area = id === 'repaso' ? 'var(--a-economia)' : areaDeFrente(study, a?.front);
  const meta = day.blocks.find((b) => b.key === (c?.blockKey ?? a?.block));
  const kicker = `${meta ? `Meta ${meta.n} · ` : ''}${front?.name ?? 'Repaso'}${a ? ` · ${a.title.split(' · ')[0]}` : ''}`;
  const tr = activa?.tramos ?? c?.tramos ?? [];
  const iLearn = tr.findIndex((x) => x.kind === 'capitulo');
  const preset = a ? studyPreset(a, presets) : null;
  const salir = { href: '#/hoy', nombre: 'Hoy' };

  const cambiar = (pid: string) => {
    if (!a) return;
    saveActivity({ ...a, pomodoro: pid });
    const p = [...BUILTIN_PRESETS, ...presets].find((x) => x.id === pid)!;
    if (!activa) return;
    const otros = sumMin(tr.filter((x) => x.step !== 'estudiar'));
    const avail = meta ? meta.min - otros : sumMin(tr.filter((x) => x.step === 'estudiar'));
    const nuevos = rePomodoro(tr, activa.i, p, avail);
    if (!nuevos) return aviso({ titulo: `Pomodoro ${presetName(p)}`, sub: 'Ya empezaste a estudiar: se aplica desde la próxima sesión', tono: 'info' });
    setFocus({ ...activa, tramos: nuevos, segs: nuevos.map((t) => ({ type: t.kind === 'descanso' ? 'rest' : 'focus', min: t.min })) });
  };

  const pomodoro = a && iLearn >= 0 && preset ? (
    <Selector etiqueta={`Pomodoro del tramo ${iLearn + 1}`} valor={preset.id} onCambio={cambiar}
      opciones={[...BUILTIN_PRESETS, ...presets].map((p) => ({ valor: p.id, etiqueta: p.builtin ? presetName(p) : p.name, nota: p.desc }))} />
  ) : null;

  // ——— Antes de empezar: los tramos y un botón ———
  if (!activa) {
    return (
      <Inmersiva titulo="Sesión de estudio" area={area} salir={salir} info={INFO}
        pie={c && c.tramos.length > 0 ? <Boton variante="primario" ancho icono="play" onClick={() => { haptico('leve'); startStudy(day.date, c.id, c.blockKey, c.tramos); }}>Empezar · {fmtDur(c.total)}</Boton> : undefined}>
        {c && c.tramos.length > 0 ? (
          <>
            <p className="t-rotulo se-kicker">{kicker}</p>
            <p className="t-rotulo se-kicker">{c.tramos.length} tramos{meta ? ` · ${meta.start} – ${toHHMM(toMin(meta.start) + meta.min)}` : ''}</p>
            <Tramos tramos={c.tramos} actual={-1} />
            {pomodoro}
          </>
        ) : (
          <Vacio ilustracion="foco" titulo="Hoy no hay sesión" texto="Este contenido no toca hoy." accion={<Boton variante="secundario" href="#/estudio">Ir a Estudio</Boton>} />
        )}
      </Inmersiva>
    );
  }

  // ——— En curso ———
  const t = tr[activa.i];
  const prev = activa.i > 0 ? tr[activa.i - 1] : null;
  const ultimoLearn = tr.map((x) => x.kind).lastIndexOf('capitulo');
  const unidadLibro = a?.libro && t.ref.startsWith('learn:') ? Number(t.ref.split(':')[2]) || null : null;
  const faltaMicro = a && unidadLibro ? microFaltantes(study, a, unidadLibro) : [];
  const pausado = activa.pausedAt != null;
  const total = sumMin(tr);
  const m = a && unidadLibro && t.step === 'estudiar' ? progresoMicro(study, a, unidadLibro) : null;

  const accion = () => {
    if (t.kind === 'tesis') return ir(`tesis/${t.ref.slice(4)}`);
    if (t.kind === 'cold') return ir(`recall/${t.ref.slice(4)}`);
    if (t.kind === 'tarjetas') return ir(`tarjetas/${t.ref.slice(6)}`);
    if (t.kind === 'test') {
      const [, act, n] = t.ref.split(':');
      return ir(`test/${act}/${n}`);
    }
    // Libro: el último tramo de leer no cierra la unidad sin la micro-tesis de cada capítulo.
    if (faltaMicro.length && t.kind === 'capitulo' && activa.i === ultimoLearn) {
      aviso({ titulo: `Falta la micro-tesis del ${capsTexto(faltaMicro)}`, sub: 'Una frase por capítulo, en tus palabras', tono: 'atencion' });
      return setMicro(true);
    }
    haptico('exito');
    tramoHecho(activa);
  };
  const accionLabel = t.kind === 'tesis' ? 'Abrir tesis' : t.kind === 'cold' ? 'Escribir' : t.kind === 'tarjetas' ? 'Abrir tarjetas' : t.kind === 'test' ? 'Abrir test' : t.kind === 'descanso' ? 'Seguir ahora' : 'Hecho';
  const terminar = async () => {
    if (await confirmar({ titulo: 'Terminar la sesión', texto: 'Lo que no cerraste con "Hecho" no suma minutos.', accion: 'Terminar', peligro: true })) { setFocus(null); ir('estudio'); }
  };

  const progreso = (
    <div className="se-segs" role="img" aria-label={`Tramo ${activa.i + 1} de ${tr.length}`} data-grafico>
      {tr.map((x, i) => (
        <span key={i} className={`${i < activa.i ? 'hecho' : i === activa.i ? 'actual' : ''}${x.kind === 'descanso' ? ' descanso' : ''}`} style={{ flexGrow: x.min }}>
          {i === activa.i && <i style={{ width: `${segProgress(activa, now) * 100}%` }} />}
        </span>
      ))}
    </div>
  );

  return (
    <Inmersiva titulo="Sesión de estudio" area={area} salir={salir} info={INFO} progreso={progreso}
      pie={<Boton variante="primario" ancho icono={t.kind === 'descanso' ? 'siguiente' : 'tilde'} onClick={accion}>{accionLabel}</Boton>}>
      {prev && cerrado !== activa.i && (
        <div className="capa-2 se-aviso" role="status">
          <span className="se-aviso-texto"><b>Terminó {TERMINO[prev.kind]}</b><small>Sigue: {t.title} · {fmtDur(t.min)}</small></span>
          <Boton soloIcono tamano="s" variante="fantasma" icono="cerrar" etiqueta="Cerrar aviso" onClick={() => setCerrado(activa.i)} />
        </div>
      )}
      <div className="se-tramo">
        <p className="t-rotulo">Tramo {activa.i + 1} de {tr.length} · {t.kind === 'descanso' ? 'Descanso' : STEP_LABEL[t.step] ?? ''}</p>
        <h2 className="t-seccion">{t.title}</h2>
        <p className="t-rotulo se-kicker">{kicker}</p>
      </div>
      <Reloj restante={segRemaining(activa, now)} avance={segProgress(activa, now)} total={t.min} pausado={pausado} />
      <div className="se-controles">
        <Boton variante="secundario" icono={pausado ? 'play' : 'pausa'} onClick={() => setFocus(pausado ? resume(activa, Date.now()) : pause(activa, Date.now()))}>{pausado ? 'Seguir' : 'Pausar'}</Boton>
        <Boton variante="secundario" icono="mas" onClick={() => setFocus(addMinutes(activa, 5))}>5 min</Boton>
      </div>

      {a && unidadLibro && m && (
        <>
          <div className="capa-1 s-lista"><Fila icono="editar" titulo="Micro-tesis" nota="Una frase por capítulo" valor={`${m.guardadas} de ${m.total}`} onClick={() => setMicro(true)} /></div>
          <MicroTesisHoja abierta={micro} onCerrar={() => setMicro(false)} date={day.date} a={a} n={unidadLibro} />
        </>
      )}

      <section className="se-lista" aria-label="La sesión">
        <p className="t-rotulo se-lista-cab"><span>La sesión</span><span className="t-dato">{fmtDur(total)}{meta ? ` de ${fmtDur(meta.min)}` : ''}</span></p>
        <Tramos tramos={tr} actual={activa.i} />
      </section>
      {pomodoro}
      <div className="capa-1 s-lista">
        {(t.kind === 'tesis' || t.kind === 'test' || t.kind === 'cold' || t.kind === 'tarjetas') && <Fila icono="siguiente" titulo="Pasar al siguiente tramo" onClick={() => tramoHecho(activa)} />}
        <Fila icono="cerrar" titulo="Terminar la sesión" onClick={terminar} />
      </div>
    </Inmersiva>
  );
}
