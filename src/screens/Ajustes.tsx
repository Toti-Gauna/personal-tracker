import { DAY_ROUTINES, DAY_TYPES, metasOf } from '../data/routines';
import { useEffect, useState } from 'react';
import { AREAS, areaDefaultName} from '../data/defaults';
import { BIMESTERS } from '../data/bimesters';
import { DEFAULT_ALARMS } from '../data/sounds';
import type { Area } from '../data/types';
import { applyTheme, getThemePref, type ThemePref } from '../lib/theme';
import { useStore } from '../state/store';
import { renameBimester } from '../state/goals';
import { setAreaName } from '../state/profile';
import { toast } from '../ui/avisos';
import '../styles/perfil.css';

const TEMAS: [ThemePref, string][] = [['dark', 'Oscuro'], ['light', 'Claro'], ['system', 'Sistema']];

interface BeforeInstall extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let diferido: BeforeInstall | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); diferido = e as BeforeInstall; });
}

/** 6.4 Ajustes: tema, bimestres, áreas, rutinas del día, Abi y datos. */
export function Ajustes() {
  const settings = useStore((s) => s.settings)!;
  const names = useStore((s) => s.goals.bimesterNames);
  const alarmas = (settings.alarms ?? DEFAULT_ALARMS).filter((a) => a.on).length;
  const [tema, setTema] = useState<ThemePref>(getThemePref);
  const [editB, setEditB] = useState<number | null>(null);
  const [txtB, setTxtB] = useState('');
  const [editA, setEditA] = useState<Area | null>(null);
  const [txtA, setTxtA] = useState('');
  const [instalada, setInstalada] = useState(false);
  useEffect(() => { setInstalada(window.matchMedia?.('(display-mode: standalone)').matches ?? false); }, []);

  const instalar = async () => {
    if (diferido) {
      await diferido.prompt();
      diferido = null;
    } else {
      toast({ title: instalada ? 'Ya está instalada' : 'Agregar a inicio', sub: instalada ? 'Estás usando Trazo como app.' : 'En Safari: Compartir → Agregar a inicio. En Chrome: menú ⋮ → Instalar app.', color: 'var(--economia)' }, false);
    }
  };

  const guardarB = () => {
    if (editB != null) renameBimester(editB, txtB);
    setEditB(null);
  };

  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/perfil">Perfil</a></div>
      <h1 className="titulo">Ajustes</h1>

      <div className="etiqueta aj-t">Tema</div>
      <div className="segmentado" role="radiogroup" aria-label="Tema">
        {TEMAS.map(([id, n]) => <button key={id} role="radio" aria-checked={tema === id} onClick={() => { setTema(id); applyTheme(id); }}>{n}</button>)}
      </div>

      <div className="fila-t aj-t"><span className="etiqueta">Nombres de los bimestres</span><span className="sub nota-der">lo que significa para vos</span></div>
      <ol className="bim-lista">
        {BIMESTERS.map((b) => {
          const propio = names[b.n]?.trim();
          return (
            <li key={b.n} className={propio ? 'propio' : ''}>
              <span className="mono sub">{String(b.n).padStart(2, '0')}</span>
              {editB === b.n ? (
                <form onSubmit={(e) => { e.preventDefault(); guardarB(); }}>
                  <input className="campo-linea" autoFocus value={txtB} onChange={(e) => setTxtB(e.target.value)} onBlur={guardarB} aria-label={`Nombre del bimestre ${b.n}`} maxLength={30} placeholder={b.name} />
                </form>
              ) : (
                <>
                  <span className={propio ? 'nombre' : 'sub'}>{propio || b.name}</span>
                  <button className="subrayado" onClick={() => { setEditB(b.n); setTxtB(propio ?? ''); }} aria-label={`Nombrar el bimestre ${b.n}`}>{propio ? 'Cambiar' : 'Nombrar'}</button>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <div className="etiqueta aj-t">Áreas</div>
      <div className="chips">
        {(Object.keys(AREAS) as Area[]).map((a) => (
          editA === a ? (
            <form key={a} onSubmit={(e) => { e.preventDefault(); setAreaName(a, txtA); setEditA(null); }}>
              <input className="campo-texto" autoFocus value={txtA} onChange={(e) => setTxtA(e.target.value)} onBlur={() => { setAreaName(a, txtA); setEditA(null); }} aria-label={`Nombre del área ${areaDefaultName(a)}`} maxLength={20} />
            </form>
          ) : (
            <button key={a} aria-label={`Renombrar el área ${AREAS[a].name}`} onClick={() => { setEditA(a); setTxtA(AREAS[a].name); }}><i style={{ background: AREAS[a].css }} />{AREAS[a].name}</button>
          )
        ))}
      </div>
      <p className="sub nota-izq">Tocá un área para cambiarle el nombre. El color es el del cuaderno.</p>

      <div className="etiqueta aj-t">Datos y app</div>
      <ul className="aj-filas">
        <li><a href="#/ajustes-rutinas"><span><b>Rutinas del día</b><small>{DAY_TYPES.map((t) => `${DAY_ROUTINES[t].label}: ${metasOf(t).length} metas`).join(' · ')}</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/sonidos"><span><b>Sonidos y alarmas</b><small>{settings.sounds ? 'Sonidos a tu gusto' : 'Campana de bronce'} · {alarmas} {alarmas === 1 ? 'alarma' : 'alarmas'} en el calendario</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/ajustes-companera"><span><b>Compañera de entrenamiento</b><small>{settings.names.partner} · pesos y récords propios</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/motor/importar"><span><b>Importar mazo de Anki</b><small>Archivo de texto exportado desde Anki</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/ajustes-datos"><span><b>Copia de seguridad</b><small>{settings.lastBackup ? `Última copia: ${settings.lastBackup}` : 'Todavía no hiciste ninguna'} · restaurar</small></span><span aria-hidden="true">→</span></a></li>
        <li><button onClick={instalar}><span><b>Instalar Trazo</b><small>{instalada ? 'Ya la estás usando como app' : 'Agregar a la pantalla de inicio'}</small></span><span aria-hidden="true">→</span></button></li>
      </ul>
    </main>
  );
}
