import { useMemo, useState } from 'react';
import { AREAS } from '../data/defaults';
import { cardsFromText, tesisStart, unitState } from '../data/study';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { saveTesis } from '../state/study';
import { toast } from '../ui/avisos';
import { Casilla } from '../ui/Casilla';
import '../styles/estudio.css';

/** 2.7 Tesis: se abre desde el repaso del día en que vence (+3 del capítulo). */
export function TesisPantalla({ day, itemId }: { day: DayLog; itemId?: string }) {
  const study = useStore((s) => s.study);
  const item = study.reviews.find((r) => r.id === itemId && r.kind === 'tesis');
  const prev = study.tesis.find((t) => t.itemId === itemId);
  const a = study.activities.find((x) => x.id === item?.activityId);
  const [modo, setModo] = useState<'app' | 'papel'>(prev?.mode ?? 'app');
  const [tab, setTab] = useState(0);
  const [texto, setTexto] = useState(prev?.text ?? '');
  const [practica, setPractica] = useState<boolean[]>(prev?.practice ?? [false, false, false]);
  const detectadas = useMemo(() => cardsFromText(texto), [texto]);
  const [fuera, setFuera] = useState<Set<number>>(new Set());

  if (!item || !a) {
    return <main className="pantalla"><a className="volver" href="#/estudio">Estudio</a><p>No encontré esa tesis.</p></main>;
  }
  const front = study.fronts.find((f) => f.id === a.front);
  const titulo = item.label.replace(/^Tesis · /, '');
  const vence = item.due > day.date;
  const tests = item.unit != null ? unitState(study, a.id, item.unit).tests : [];
  const inicio = tesisStart(tests.find((t) => t.approved) ?? tests[tests.length - 1]);
  const elegidas = detectadas.filter((_, i) => !fuera.has(i));

  const guardar = () => {
    saveTesis(day.date, item.id, { text: texto, mode: modo, practice: practica }, elegidas);
    toast({ title: 'Tesis guardada', sub: `${elegidas.length} ${elegidas.length === 1 ? 'tarjeta nueva' : 'tarjetas nuevas'} en ${front?.name ?? 'el mazo'}`, color: 'var(--economia)' }, false);
    history.length > 1 ? history.back() : (location.hash = '#/estudio');
  };

  return (
    <main className="pantalla tesis" style={{ ['--c' as string]: front ? AREAS[front.color].css : 'var(--ing)' }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <div className="kicker" style={{ color: 'var(--economia)' }}>Tesis · día +3 · después del test</div>
      <h1 className="titulo">{titulo}</h1>
      {vence && <p className="sub">Vence el {fmtFecha(item.due).toLowerCase()}: ese día aparece en tu sesión, después de lo que vence. Nunca va el mismo día que el test.</p>}

      <div className="segmentado" role="radiogroup" aria-label="Dónde la escribís">
        <button role="radio" aria-checked={modo === 'app'} onClick={() => setModo('app')}>En la app</button>
        <button role="radio" aria-checked={modo === 'papel'} onClick={() => setModo('papel')}>En papel</button>
      </div>
      <p className="sub nota-papel">En papel: la escribís en tu cuaderno, le sacás una foto y se la mandás a Claude. Te la devuelve pasada a texto y con las tarjetas listas para pegar.</p>

      {inicio && (
        <div className="empeza">
          <span className="etiqueta">Empezá por lo que fallaste</span>
          <p>{inicio}</p>
        </div>
      )}

      <div className="pestanas" role="tablist">
        {['1 · Escribir', '2 · Practicar', '3 · Tarjetas'].map((t, i) => (
          <button key={t} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <>
          <p className="sub nota-izq">{modo === 'app' ? 'Explicalo con tus palabras.' : 'Pegá el texto que te devolvió Claude.'} Las líneas con :: o [[ ]] se vuelven tarjetas.</p>
          <textarea className="cuaderno" rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Tesis"
            placeholder={'Los enteros son los naturales, el cero y sus opuestos.\nSumar con signos distintos :: se restan los valores absolutos y queda el signo del mayor.\nRestar un número es sumar su [[opuesto]].'} />
          <Detectadas detectadas={detectadas} fuera={fuera} setFuera={setFuera} deck={front?.name ?? 'General'} />
          <button className="btn-principal" onClick={() => setTab(1)}>Seguir: practicar 3 problemas</button>
        </>
      )}
      {tab === 1 && (
        <>
          <p className="sub">Resolvé 3 problemas del capítulo sin mirar, explicando cada paso como si se lo contaras a alguien.</p>
          <ul className="tareas">
            {practica.map((v, i) => (
              <li key={i}>
                <Casilla checked={v} label={`Problema ${i + 1}`} onChange={() => setPractica((p) => p.map((x, j) => (j === i ? !x : x)))} />
                <span>Problema {i + 1} resuelto y explicado</span>
              </li>
            ))}
          </ul>
          <button className="btn-principal" onClick={() => setTab(2)}>Seguir: revisar tarjetas</button>
        </>
      )}
      {tab === 2 && (
        <>
          <Detectadas detectadas={detectadas} fuera={fuera} setFuera={setFuera} deck={front?.name ?? 'General'} />
          <button className="btn-principal" disabled={!texto.trim()} onClick={guardar}>
            Guardar tesis{elegidas.length ? ` y ${elegidas.length} ${elegidas.length === 1 ? 'tarjeta' : 'tarjetas'}` : ''}
          </button>
        </>
      )}
      <p className="nota">También podés <a href="#/motor/importar">pegar un bloque que te arme Claude o importar un mazo de Anki</a>.</p>
    </main>
  );
}

function Detectadas({ detectadas, fuera, setFuera, deck }: {
  detectadas: ReturnType<typeof cardsFromText>; fuera: Set<number>; setFuera: (f: Set<number>) => void; deck: string;
}) {
  if (!detectadas.length) return null;
  return (
    <div className="detectadas">
      <div className="fila-t"><span className="etiqueta">{detectadas.length} {detectadas.length === 1 ? 'tarjeta detectada' : 'tarjetas detectadas'}</span><span className="sub">Mazo: {deck}</span></div>
      <ul className="tareas">
        {detectadas.map((c, i) => (
          <li key={i}>
            <Casilla checked={!fuera.has(i)} label={c.front} onChange={() => { const n = new Set(fuera); n.has(i) ? n.delete(i) : n.add(i); setFuera(n); }} />
            <span className="tarjeta-t"><b>{c.front}</b><small>{c.back}</small></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
