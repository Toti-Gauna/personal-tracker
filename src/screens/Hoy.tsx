import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { reducedMotion } from '../lib/motion';
import { AREAS } from '../data/defaults';
import { bimester, dayNumber, mejoraAyer } from '../data/derive';
import { blockDone, fmtPct, mejoraDia } from '../data/mejora';
import { activitiesFor } from '../data/study';
import { plannedFor } from '../data/train';
import { blockEnd, currentBlock, remainingMin } from '../data/schedule';
import { addDays, fmtDur, fmtFecha, nowMin, toHHMM, toMin } from '../data/time';
import type { Block, DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { Marca } from '../ui/Marca';
import { ChipRuta, chipDe } from '../ui/RutaBits';
import '../styles/ruta.css';
import { SumarSemana } from '../ui/SumarSemana';
import { Tareas } from '../ui/Tareas';
import { useNow } from '../ui/useNow';
import '../styles/hoy.css';
import '../styles/metas.css';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function frase(blocks: Block[], now: number) {
  const cur = currentBlock(blocks, now);
  const next = blocks.filter((b) => toMin(b.start) > now);
  if (cur) {
    const after = blocks.filter((b) => toMin(b.start) >= blockEnd(cur)).slice(0, 2).map((b) => b.short);
    return `Ahora toca ${cur.short}${after.length ? `; después, ${after.join(' y ')}` : ''}.`;
  }
  if (next.length) return `Lo próximo: ${next[0].short} a las ${next[0].start}.`;
  return 'Terminaron los bloques de hoy.';
}

/** Etiqueta del bloque abierto: "AHORA · 07:00 · QUEDAN 1 H 30". */
function estado(b: Block, now: number) {
  const s = toMin(b.start);
  const e = blockEnd(b);
  if (now >= s && now < e) return `Ahora · ${toHHMM(now)} · quedan ${fmtDur(remainingMin(b, now))}`;
  if (now < s) return `Empieza ${b.start} · ${fmtDur(b.min)}`;
  return `Terminó ${toHHMM(e)} · ${fmtDur(b.min)}`;
}

export function Hoy({ day }: { day: DayLog }) {
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const focus = useStore((s) => s.focus);
  const study = useStore((s) => s.study);
  const train = useStore((s) => s.train);
  const ruta = useStore((s) => s.ruta);
  const now = nowMin(new Date(useNow(30000)));
  const cur = currentBlock(day.blocks, now);
  const upcoming = day.blocks.find((b) => toMin(b.start) > now);
  const lista = useRef<HTMLOListElement>(null);
  // Entrada: las filas aparecen escalonadas y la regla de horas baja hasta su lugar.
  useLayoutEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (reducedMotion()) {
      const t = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15, clearProps: 'opacity' });
      return () => { t.kill(); };
    }
    const ctx = gsap.context(() => {
      gsap.from('.meta', { y: 12, opacity: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out', clearProps: 'opacity,transform' });
      gsap.from('.regla-horas', { scaleY: 0, transformOrigin: 'top', duration: 0.7, ease: 'power3.out' });
    }, el);
    return () => ctx.revert();
  }, []);
  const [abierta, setAbierta] = useState<string | null>(() => (cur ?? upcoming)?.key ?? null);

  const tareas = day.blocks.flatMap((b) => b.tasks);
  const hechas = tareas.filter((t) => t.done).length;
  const pct = tareas.length ? Math.round((hechas / tareas.length) * 100) : 0;
  const names = useStore((s) => s.goals.bimesterNames);
  const bim = bimester(settings.startDate, day.date, names);
  const n = dayNumber(settings.startDate, day.date);
  const mejora = mejoraDia(day);
  const ayer = mejoraAyer(days, day.date);
  const tieneAyer = !!days[addDays(day.date, -1)];

  return (
    <main className="pantalla hoy">
      <Marca date={day.date} />
      <header>
        <h1 className="titulo">Hoy</h1>
        <p>{fmtFecha(day.date)}, día {String(n).padStart(2, '0')} de {bim.name}. {frase(day.blocks, now)}</p>
      </header>

      <div className="dia-avance" aria-label={`${hechas} de ${tareas.length} tareas`}>
        <div className="avance-barra">
          {tareas.map((t, i) => <span key={t.id} className={i < hechas ? 'on' : ''} />)}
        </div>
        <div className="avance-txt mono">
          <span><b>{pct} %</b> · {hechas} de {tareas.length}</span>
          <span>semana {bim.week} de {bim.weeks}</span>
        </div>
      </div>

      <section className="mejora" aria-label="Mejora de hoy">
        <div>
          <b>Mejora de hoy</b>
          <small>{tieneAyer ? `ayer cerraste +${fmtPct(ayer)} %` : 'ayer no hay registro'}</small>
        </div>
        <div className="mejora-seg" aria-hidden="true">
          {day.blocks.map((b) => <span key={b.key} className={blockDone(b) ? 'on' : ''} />)}
        </div>
        <span className="mejora-n mono">+{fmtPct(mejora)} %</span>
      </section>

      <ol className="metas" ref={lista}>
        <li className="regla-horas" aria-hidden="true" />
        {day.blocks.map((b) => {
          const done = b.tasks.filter((t) => t.done).length;
          const abiertaEsta = abierta === b.key;
          const activa = cur?.key === b.key;
          const enFoco = focus?.key === b.key && focus.date === day.date;
          // La etiqueta de ruta: a qué carril empuja esta meta.
          const chip = b.ref ? chipDe(b.ref, ruta, day.date) : null;
          // Una meta de estudio abre su sesión de estudio; el resto, elegir pomodoro.
          const act = b.kind === 'estudio' ? activitiesFor(study, day.date).find((a) => a.block === b.key) : undefined;
          // La meta de entreno abre la sesión de entreno (o Entreno, si hoy no hay rutina).
          const hoyRut = b.kind === 'entreno' ? plannedFor(train, day.date).routine : null;
          const entrenando = b.kind === 'entreno' && train.active?.date === day.date;
          const entrenado = b.kind === 'entreno' && !entrenando && train.sessions.some((s) => s.date === day.date);
          const destino = b.kind === 'entreno'
            ? (entrenando && train.active ? `entreno-sesion/${train.active.routineId}` : 'entreno')
            : enFoco ? (focus?.tramos ? `sesion/${focus.activityId}` : 'foco') : act ? `sesion/${act.id}` : `elegir/${b.key}`;
          return (
            <li
              key={b.key}
              className={`meta${abiertaEsta ? ' abierta' : ''}${blockDone(b) ? ' hecha' : ''}${activa ? ' activa' : ''}${chip ? ' con-ruta' : ''}`}
              style={{ ['--c' as string]: AREAS[b.area].css }}
            >
              <button className="meta-fila" aria-expanded={abiertaEsta} onClick={() => setAbierta(abiertaEsta ? null : b.key)}>
                <span className="meta-check" aria-hidden="true" />
                <span className="meta-n mono">{b.n}</span>
                <span className="meta-tit">
                  <span className="meta-nombre">{b.title}</span>
                  <span className="meta-hora mono">{b.start}</span>
                </span>
                <span className="meta-cont mono" aria-label={`${done} de ${b.tasks.length} tareas`}>{done}/{b.tasks.length}</span>
              </button>
              {chip && <a className="meta-ruta" href="#/metas/semana-ruta" aria-label={`Ruta: ${chip.texto}`}><ChipRuta lane={chip.lane} texto={chip.texto} /></a>}
              {abiertaEsta && (
                <div className="meta-det">
                  <div className="kicker">{estado(b, now)}</div>
                  <Tareas date={day.date} block={b} />
                  {b.focus !== false && <button className="btn-foco" onClick={() => ir(destino)}>
                    {b.kind === 'entreno' ? (entrenando ? 'Volver al entreno' : entrenado ? 'Ver el entreno de hoy' : hoyRut ? `Entrar en foco · ${hoyRut.name}` : 'Entrar en foco · entreno') : enFoco ? 'Volver al foco' : act ? 'Entrar en foco · sesión de estudio' : 'Entrar en foco'}
                  </button>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <SumarSemana date={day.date} />

      <a className={`cierre-link${day.closed ? ' cerrado' : ''}`} href="#/cierre">
        <span><b>{day.closed ? 'Día cerrado' : 'Cerrar el día'}</b><small>{day.closed ? `A las ${day.closed.at} · +${day.closed.xp} XP` : 'Mejora, pendientes y el JSON de hoy'}</small></span>
        <span aria-hidden="true">→</span>
      </a>

      <nav className="hoy-links" aria-label="Más">
        <a href="#/pomodoros">Pomodoros a medida <span aria-hidden="true">→</span></a>
        <a href="#/json">JSON del día <span aria-hidden="true">→</span></a>
      </nav>
    </main>
  );
}
