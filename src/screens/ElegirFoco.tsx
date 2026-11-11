import { useMemo, useState } from 'react';
import { AREAS, BUILTIN_PRESETS } from '../data/defaults';
import { startFocus } from '../data/focus';
import { fitPreset, focusMinutes, planLabel } from '../data/pomodoro';
import { blockEnd, remainingMin } from '../data/schedule';
import { fmtDur, nowMin, toHHMM, toMin } from '../data/time';
import type { DayLog, Preset } from '../data/types';
import { ir } from '../lib/routes';
import { setBlockPreset, setFocus, useStore } from '../state/store';
import { PlanBar } from '../ui/Plan';
import '../styles/foco.css';

interface Opcion {
  preset: Preset;
  segs: ReturnType<typeof fitPreset>;
  label: string;
  mine: boolean;
}

/** 1.4 Elegir pomodoro: cómo trabajar lo que queda del bloque. */
export function ElegirFoco({ day, blockKey }: { day: DayLog; blockKey?: string }) {
  const settings = useStore((s) => s.settings)!;
  const block = day.blocks.find((b) => b.key === blockKey);
  const now = nowMin();
  const minutes = block ? remainingMin(block, now) : 0;
  const startAt = block && now >= toMin(block.start) && now < blockEnd(block) ? now : block ? toMin(block.start) : now;

  const opciones = useMemo<Opcion[]>(() => {
    if (!block) return [];
    const mineId = settings.blockPresets[block.key];
    const mine = settings.presets.find((p) => p.id === mineId) ?? BUILTIN_PRESETS.find((p) => p.id === mineId);
    const list = [...(mine ? [mine] : []), ...BUILTIN_PRESETS];
    const seen = new Set<string>();
    return list.flatMap((p) => {
      const segs = fitPreset(p, minutes);
      const label = planLabel(segs);
      if (seen.has(label)) return [];
      seen.add(label);
      return [{ preset: p, segs, label, mine: p === mine }];
    });
  }, [block, minutes, settings]);

  const [sel, setSel] = useState(0);
  const [siempre, setSiempre] = useState(false);

  if (!block) {
    return (
      <main className="pantalla">
        <a className="volver" href="#/hoy">Hoy</a>
        <p>No encontré ese bloque en el día de hoy.</p>
      </main>
    );
  }

  const area = AREAS[block.area];
  const nombre = block.title.split(' · ')[0];
  const elegida = opciones[sel];

  const empezar = () => {
    if (siempre) setBlockPreset(block.key, elegida.preset.id);
    setFocus(startFocus(day.date, block.key, elegida.label, elegida.segs, Date.now()));
    ir('foco');
  };

  return (
    <main className="pantalla elegir" style={{ ['--c' as string]: area.css }}>
      <div className="topbar">
        <a className="volver" href="#/hoy">Hoy</a>
        <span className="mono">{toHHMM(startAt)} – {toHHMM(startAt + minutes)}</span>
      </div>
      <div className="kicker">{area.name} · quedan {fmtDur(minutes)}</div>
      <h1 className="titulo">¿Cómo lo trabajás?</h1>
      <p className="elegir-sub">{block.title}. Cada opción entra justa en los {minutes} minutos que quedan.</p>

      <div className="opciones" role="radiogroup" aria-label="Forma de trabajar el bloque">
        {opciones.map((o, i) => (
          <button key={o.label} role="radio" aria-checked={sel === i} className="opcion" onClick={() => setSel(i)}>
            <span className="radio" aria-hidden="true" />
            <span className="opcion-cab">
              <span className="opcion-t">
                <b>{o.label}</b>
                {o.mine && <span className="chip mono">Tu preset</span>}
              </span>
              <span className="sub">{o.preset.desc ?? `Tu pomodoro «${o.preset.name}»`}</span>
            </span>
            <span className="opcion-min mono">{focusMinutes(o.segs)} min<br />de foco</span>
            <span className="opcion-plan">
              <PlanBar segs={o.segs} color={sel === i ? 'var(--c)' : 'var(--sub)'} />
              <span className="plan-ejes mono">
                <span>{toHHMM(startAt)}</span>
                <span>{o.segs.map((s) => s.min).join(' · ')}</span>
                <span>{toHHMM(startAt + minutes)}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <a className="fila-link" href="#/pomodoros">+ Armar uno a medida <span aria-hidden="true">→</span></a>

      <div className="fila-ajuste">
        <span>
          Usarlo siempre en {nombre}
          <small>Pasa a ser el preset de este bloque</small>
        </span>
        <button role="switch" className="switch" aria-checked={siempre} aria-label={`Usarlo siempre en ${nombre}`} onClick={() => setSiempre((v) => !v)} />
      </div>
      <div className="fila-ajuste">
        <span className="sub">Al terminar cada tramo</span>
        <span className="subrayado">Campana de bronce</span>
      </div>

      <button className="btn-principal" disabled={!elegida} onClick={empezar}>Empezar · {elegida?.label}</button>
    </main>
  );
}
