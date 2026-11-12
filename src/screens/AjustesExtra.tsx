import { useRef, useState } from 'react';
import { ROUTINES } from '../data/defaults';
import { fmtDur, toHHMM, toMin } from '../data/time';
import { getState, resetState, setState, useStore } from '../state/store';
import { markBackup, resetDayRoutines, setDayRoutine, setNames } from '../state/profile';
import { toast } from '../ui/avisos';
import '../styles/perfil.css';

const BLOQUES: [string, string][] = [['rutina', 'Rutina de la mañana'], ['math', 'Matemática'], ['prog', 'Programación']];

function Paso({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="regla">
      <span><b>{label}</b></span>
      <span className="stepper chico">
        <button aria-label={`Menos: ${label}`} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <output aria-label={label}>{fmt(value)}</output>
        <button aria-label={`Más: ${label}`} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </span>
    </div>
  );
}

/** Rutinas del día: a qué hora te levantás y cuánto dura cada bloque de la mañana. */
export function AjustesRutinas() {
  useStore((s) => s.settings);
  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div>
      <h1 className="titulo">Rutinas del día</h1>
      <p className="sub">Las dos que te ofrece Buen día. Lo de Abi, el entreno y la tarde son horas fijas. Con "Otra hora" los bloques de la mañana se acortan solos.</p>
      {ROUTINES.map((r) => {
        const sum = Object.values(r.durations).reduce((a, b) => a + b, 0);
        const fin = toMin(r.wake) + sum;
        return (
          <section key={r.id} className="rutina-aj">
            <div className="fila-t"><h2 className="titulo">{r.name}</h2><span className="mono sub">{r.wake} → {toHHMM(fin)}</span></div>
            <Paso label="Te levantás" value={toMin(r.wake)} min={toMin('03:00')} max={toMin('07:00')} step={10} fmt={(v) => toHHMM(v)} onChange={(v) => setDayRoutine(r.id, { wake: toHHMM(v) })} />
            {BLOQUES.map(([k, n]) => (
              <Paso key={k} label={n} value={r.durations[k]} min={15} max={240} step={5} fmt={fmtDur} onChange={(v) => setDayRoutine(r.id, { durations: { [k]: v } })} />
            ))}
            {fin > toMin('08:30') && <p className="aviso-rojo">Termina después de las 08:30, cuando empieza lo de Abi. Acortá algún bloque.</p>}
          </section>
        );
      })}
      <button className="btn-borde" onClick={() => { resetDayRoutines(); toast({ title: 'Rutinas de fábrica', color: 'var(--economia)' }, false); }}>Volver a las de fábrica</button>
    </main>
  );
}

/** Compañera de entrenamiento y tu nombre. */
export function AjustesCompanera() {
  const settings = useStore((s) => s.settings)!;
  const [yo, setYo] = useState(settings.names.me);
  const [ella, setElla] = useState(settings.names.partner);
  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div>
      <h1 className="titulo">Compañera de entrenamiento</h1>
      <p className="sub">Cada uno tiene sus propios rangos, pesos y récords. Los rangos de repeticiones se ajustan en Editar rutina.</p>
      <label className="campo-doble"><span className="sub">Tu nombre</span><input className="campo-texto" value={yo} onChange={(e) => setYo(e.target.value)} /></label>
      <label className="campo-doble"><span className="sub">Entrenás con</span><input className="campo-texto" value={ella} onChange={(e) => setElla(e.target.value)} /></label>
      <button className="btn-principal" style={{ marginTop: 18 }} disabled={!yo.trim() || !ella.trim()} onClick={() => { setNames(yo, ella); toast({ title: 'Nombres guardados', sub: `${yo.trim()} y ${ella.trim()}`, color: 'var(--salud)' }, false); }}>Guardar</button>
      <a className="fila-link" href="#/entreno">Ir a Entreno <span aria-hidden="true">→</span></a>
    </main>
  );
}

/** Copia de seguridad: todo lo de la app en un archivo, y restaurarlo. */
export function AjustesDatos({ today }: { today: string }) {
  const settings = useStore((s) => s.settings)!;
  const input = useRef<HTMLInputElement>(null);
  const tarjetas = useStore((s) => s.study.cards.length);
  const dias = useStore((s) => Object.keys(s.days).length);
  const sesiones = useStore((s) => s.train.sessions.length);

  const bajar = () => {
    const blob = new Blob([JSON.stringify({ trazo: 1, exportado: today, estado: getState() }, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `trazo-copia-${today}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    markBackup(today);
    toast({ title: 'Copia descargada', sub: `trazo-copia-${today}.json`, color: 'var(--economia)' }, false);
  };

  const restaurar = (f?: File) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(String(rd.result));
        if (j?.trazo !== 1 || !j.estado?.settings) throw new Error('formato');
        if (!window.confirm('Esto reemplaza todo lo que hay en este teléfono por la copia. ¿Seguimos?')) return;
        try { localStorage.setItem('trazo.v1', JSON.stringify(j.estado)); } catch { /* sin storage */ }
        resetState(j.estado);
        setState((s) => s);
        toast({ title: 'Copia restaurada', sub: 'Recargá la app para ver todo al día', color: 'var(--salud)' }, false);
      } catch {
        toast({ title: 'No es una copia de Trazo', sub: 'Elegí el archivo trazo-copia-….json', color: 'var(--rutina)' }, false);
      }
    };
    rd.readAsText(f);
  };

  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div>
      <h1 className="titulo">Copia de seguridad</h1>
      <p className="sub">Trazo guarda todo en este teléfono. La copia es un archivo con todo (días, tarjetas, metas, entrenos y ajustes) para guardarlo o pasarlo a otro teléfono. Lo que va al repo es el JSON de cada día desde el cierre.</p>
      <div className="tres-datos">
        <div><b className="mono">{dias}</b><span>días</span></div>
        <div><b className="mono">{tarjetas}</b><span>tarjetas</span></div>
        <div><b className="mono">{sesiones}</b><span>entrenos</span></div>
      </div>
      <p className="sub">{settings.lastBackup ? `Última copia: ${settings.lastBackup}.` : 'Todavía no hiciste ninguna copia.'}</p>
      <button className="btn-principal" onClick={bajar}>Descargar copia</button>
      <button className="btn-borde" onClick={() => input.current?.click()}>Restaurar desde un archivo</button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => restaurar(e.target.files?.[0])} />
    </main>
  );
}
