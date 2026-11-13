import { useRef, useState } from 'react';
import { AREAS } from '../data/defaults';
import { fmtPct } from '../data/mejora';
import { DAY_ROUTINES, DAY_TYPES, WAKE, blockMin, isMeta, metasOf } from '../data/routines';
import { fmtDur } from '../data/time';
import { getState, resetState, setState, useStore } from '../state/store';
import { markBackup, setNames } from '../state/profile';
import { reviewsJson, testsJson } from '../data/debiles';
import { toast } from '../ui/avisos';
import '../styles/perfil.css';

const ISO = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

/**
 * Rutinas del día: lunes a viernes y fin de semana, con sus bloques. Se eligen solas por el día
 * de la semana. Salen de data/routines.json y se cambian ahí.
 */
export function AjustesRutinas() {
  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div>
      <h1 className="titulo">Rutinas del día</h1>
      <p className="sub">
        Cada día usa la suya: de lunes a viernes, la de la semana; sábado y domingo, la del fin de semana. En Buen día, {WAKE.completo} arma el día completo,
        {' '}{WAKE.corto} el corto (se acortan las metas flexibles de la mañana) y "Otra hora" corre los bloques. Los fijos no se mueven. El 1 % del día se reparte entre las metas.
      </p>
      {DAY_TYPES.map((t) => {
        const r = DAY_ROUTINES[t];
        const metas = metasOf(t);
        let n = 0;
        return (
          <section key={t} className="rutina-aj" aria-labelledby={`rut-${t}`}>
            <div className="fila-t"><h2 id={`rut-${t}`} className="titulo">{r.label}</h2><span className="mono sub">{r.days.map((d) => ISO[d]).join(' ')}</span></div>
            <p className="sub rd-res">{metas.length} metas · cada una vale {fmtPct(1 / metas.length, 3).replace(/,?0+$/, '')} %</p>
            <ol className="rd-bloques">
              {r.blocks.map((b) => {
                const meta = isMeta(b);
                if (meta) n++;
                return (
                  <li key={b.id} className={meta ? '' : 'no-meta'} style={{ ['--c' as string]: AREAS[b.area].css }}>
                    <span className="mono">{b.start}–{b.end}</span>
                    <span className="mono rd-n">{meta ? n : ''}</span>
                    <span className="rd-t"><b>{b.label}</b><small className="sub">{meta ? `${fmtDur(blockMin(b))} · ${b.kind === 'fixed' ? 'fijo' : 'flexible'}${b.focus ? '' : ' · sin foco'}` : 'no cuenta como meta'}</small></span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <p className="sub nota-izq">Para cambiar horarios o bloques, se edita data/routines.json en el repo.</p>
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

  const bajarDatos = () => {
    const st = getState().study;
    for (const [nombre, datos] of [['reviews.json', reviewsJson(st)], ['tests.json', testsJson(st)]] as const) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    toast({ title: 'reviews.json y tests.json', sub: 'Tus intentos y tus tests, para el repo', color: 'var(--economia)' }, false);
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
      <button className="btn-borde" onClick={bajarDatos}>Descargar reviews.json y tests.json</button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => restaurar(e.target.files?.[0])} />
    </main>
  );
}
