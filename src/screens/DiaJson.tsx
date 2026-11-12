import { dayJson } from '../data/export';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { toast } from '../ui/avisos';
import '../styles/foco.css';

/** El JSON del día, para pegarlo y commitearlo en data/days/. */
export function DiaJson({ day }: { day: DayLog }) {
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const names = useStore((s) => s.goals.bimesterNames);
  const texto = JSON.stringify(dayJson(day, settings, days, names), null, 2);
  const archivo = `${day.date}.json`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: 'JSON copiado', sub: `Pegalo como data/days/${archivo}`, color: 'var(--economia)' }, false);
    } catch {
      toast({ title: 'No se pudo copiar', sub: 'Seleccioná el texto y copialo a mano', color: 'var(--rutina)' }, false);
    }
  };

  const bajar = () => {
    const url = URL.createObjectURL(new Blob([texto + '\n'], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: archivo });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="pantalla json">
      <div className="topbar"><a className="volver" href="#/hoy">Hoy</a></div>
      <header>
        <h1 className="titulo">JSON del día</h1>
        <p>Copialo y pegalo para que quede commiteado en <code>data/days/{archivo}</code>.</p>
      </header>
      <pre className="json-pre" tabIndex={0}>{texto}</pre>
      <button className="btn-principal" onClick={copiar}>Copiar JSON</button>
      <button className="btn-borde" onClick={bajar}>Descargar {archivo}</button>
    </main>
  );
}
