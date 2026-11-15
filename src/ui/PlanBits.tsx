/** Piezas del plan T+18 que se repiten: avisos entre ramas, contadores, etiqueta de rama. */
import { avisosEntreRamas } from '../data/avisos';
import { metasSemanaPlan } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import { addDays } from '../data/time';
import type { RamaOMain } from '../data/types';
import { lunesDe, contador, ensayarRespuesta, setPlanSettings, sumarContador, sumarHandyx } from '../state/plan';
import { planSettings, useStore } from '../state/store';
import { toast } from './avisos';

export const ramaColor = (r: RamaOMain) => RAMA_COLOR[r];

/** "trabajo → ingles" en mono, cada rama con su color. */
export function DeA({ de, a }: { de: RamaOMain; a: RamaOMain }) {
  return (
    <span className="de-a mono">
      <span style={{ color: ramaColor(de) }}>{de}</span><span className="sub"> → </span><span style={{ color: ramaColor(a) }}>{a}</span>
    </span>
  );
}

/** Avisos entre ramas, arriba de la lista de Hoy. */
export function AvisosRamas({ date }: { date: string }) {
  const plan = useStore((s) => s.plan);
  const settings = useStore((s) => s.settings);
  const cfg = planSettings(settings);
  const avisos = avisosEntreRamas(date, plan, cfg, settings?.startDate);
  if (!avisos.length) return null;
  const pasar = () => {
    if (!window.confirm('¿Pasás a la rutina con trabajo de lunes a viernes? Se aplica desde el próximo día que empieces.')) return;
    setPlanSettings({ rutina: 'con-trabajo' });
    toast({ title: 'Rutina con trabajo', sub: 'Desde el próximo Buen día', color: 'var(--rutina)' }, false);
  };
  return (
    <section className="avisos-ramas" aria-label="Avisos entre ramas">
      {avisos.map((a) => {
        const cuerpo = (
          <>
            <DeA de={a.de} a={a.a} />
            <b>{a.titulo}</b>
            <span className="sub">{a.texto}</span>
          </>
        );
        return a.accion ? (
          <div key={a.id} className="aviso-rama" style={{ ['--c' as string]: ramaColor(a.de) }}>
            {cuerpo}
            <button className="btn-borde" onClick={pasar}>Pasar a la rutina con trabajo</button>
          </div>
        ) : (
          <a key={a.id} className="aviso-rama" href={a.href} style={{ ['--c' as string]: ramaColor(a.de) }}>{cuerpo}</a>
        );
      })}
    </section>
  );
}

/** Sumar a la semana con los contadores del plan: postulación, respuesta ensayada, operación de Handyx y entrenamiento. */
export function SumarPlan({ date }: { date: string }) {
  const plan = useStore((s) => s.plan);
  const t0 = useStore((s) => s.settings?.startDate);
  const sesiones = useStore((s) => s.train.sessions.filter((x) => x.date >= lunesDe(date) && x.date <= addDays(lunesDe(date), 6)).length);
  const metas = Object.fromEntries(metasSemanaPlan(date, t0).map((m) => [m.id, m.meta]));
  const ensayadas = plan.respuestas.filter((r) => r.veces > 0).length;
  const ops = plan.handyx[lunesDe(date)]?.operaciones ?? 0;
  const items: { id: string; label: string; v: number; meta?: number; rama: RamaOMain; run: () => void }[] = [
    { id: 'postulaciones', label: '+1 Postulación', v: contador(plan, date, 'postulaciones'), meta: metas.postulaciones, rama: 'trabajo', run: () => sumarContador(date, 'postulaciones') },
    { id: 'respuestas', label: '+1 Respuesta ensayada', v: ensayadas, meta: plan.respuestas.length, rama: 'ingles', run: () => ensayarRespuesta(date) },
    { id: 'operaciones', label: '+1 Operación Handyx', v: ops, rama: 'handyx', run: () => sumarHandyx(date, { operaciones: 1 }) },
    { id: 'entrenos', label: '+1 Entrené', v: sesiones + contador(plan, date, 'entrenos'), meta: metas.entrenos, rama: 'salud', run: () => sumarContador(date, 'entrenos') },
  ];
  return (
    <section className="sumar-sem" aria-label="Sumar a la semana">
      <span className="etiqueta">Sumar a la semana</span>
      <div className="sumar-grid">
        {items.map((x) => (
          <button key={x.id} style={{ ['--c' as string]: ramaColor(x.rama) }} onClick={x.run} aria-label={`${x.label}: van ${x.v}${x.meta ? ` de ${x.meta}` : ''}`}>
            <b>{x.label}</b>
            <span className="mono">{x.v}{x.meta ? ` / ${String(x.meta).replace('.', ',')}` : ''}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
