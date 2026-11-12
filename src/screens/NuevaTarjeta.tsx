import { useState } from 'react';
import { AREAS } from '../data/defaults';
import type { CardKind } from '../data/study-types';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { addCards } from '../state/study';
import { toast } from '../ui/avisos';
import '../styles/estudio.css';
import '../styles/repaso.css';

const TIPOS: [CardKind, string, string, string][] = [
  ['pregunta', 'Pregunta', '¿Por qué restar −5 es sumar 5?', 'Porque restar un número es sumar su opuesto: 3 − (−5) = 3 + 5 = 8.'],
  ['completar', 'Completar', 'Restar un número es sumar su [[opuesto]].', ''],
  ['explicar', 'Explicar', 'Explicá con tus palabras qué es el MCD.', 'El número más grande que divide a los dos sin dejar resto.'],
  ['ejercicio', 'Ejercicio', 'MCD de 12 y 18', '12 = 2² · 3, 18 = 2 · 3² → MCD = 2 · 3 = 6'],
  ['inversa', 'Inversa', 'Divisor común más grande de dos números', 'MCD'],
];

/** 3.4 Nueva tarjeta: en segundos, unida a su fuente. */
export function NuevaTarjeta({ day }: { day: DayLog }) {
  const study = useStore((s) => s.study);
  const hoy = study.cards.filter((c) => c.createdOn === day.date).length;
  const [tipo, setTipo] = useState<CardKind>('pregunta');
  const [frente, setFrente] = useState('');
  const [dorso, setDorso] = useState('');
  const [reves, setReves] = useState(false);
  const [mazo, setMazo] = useState(study.fronts[0]?.id ?? '');
  const [fuente, setFuente] = useState('');
  const t = TIPOS.find((x) => x[0] === tipo)!;
  const front = study.fronts.find((f) => f.id === mazo);

  const cloze = frente.match(/\[\[(.+?)\]\]/);
  const vista = tipo === 'completar'
    ? { f: frente.replace(/\[\[(.+?)\]\]/g, '___'), b: cloze?.[1] ?? '' }
    : { f: frente, b: dorso };
  const valida = vista.f.trim() && vista.b.trim();

  const guardar = (otra: boolean) => {
    if (!valida) return;
    const base = { deck: front?.name ?? 'General', frontId: front?.id, source: fuente.trim() };
    const kind: CardKind = tipo === 'inversa' ? 'pregunta' : tipo;
    const drafts: { front: string; back: string; kind: CardKind; deck: string; frontId?: string; source: string }[] = [{ ...base, front: vista.f.trim(), back: vista.b.trim(), kind }];
    if (reves || tipo === 'inversa') drafts.push({ ...base, front: vista.b.trim(), back: vista.f.trim(), kind: 'inversa' });
    const n = addCards(day.date, drafts);
    toast({ title: n === 1 ? 'Tarjeta guardada' : `${n} tarjetas guardadas`, sub: `Mazo ${base.deck}${base.source ? ` · ${base.source}` : ''}`, color: front ? AREAS[front.color].css : undefined }, false);
    setFrente('');
    setDorso('');
    if (!otra) history.length > 1 ? history.back() : (location.hash = '#/repaso');
  };

  return (
    <main className="pantalla nueva-tarjeta">
      <div className="topbar">
        <a className="volver" href="#/repaso">Repaso</a>
        <span className="mono">{hoy} {hoy === 1 ? 'hecha' : 'hechas'} hoy</span>
      </div>
      <h1 className="titulo">Nueva tarjeta</h1>
      <p className="sub">Hacela en segundos mientras estudiás. Las que salen de tu tesis o de una lectura quedan unidas a su fuente.</p>

      <div className="chips" role="radiogroup" aria-label="Tipo de tarjeta">
        {TIPOS.map(([id, nombre]) => <button key={id} role="radio" aria-checked={tipo === id} onClick={() => setTipo(id)}>{nombre}</button>)}
      </div>

      <label className="etiqueta" htmlFor="nt-f">Frente</label>
      <textarea id="nt-f" className="campo-texto campo-frente" rows={2} value={frente} onChange={(e) => setFrente(e.target.value)} placeholder={t[2]} />
      {tipo === 'completar' ? (
        <p className="sub nota-izq">Poné entre [[ ]] lo que tenés que completar.</p>
      ) : (
        <>
          <label className="etiqueta" htmlFor="nt-d">Dorso</label>
          <textarea id="nt-d" className="campo-texto" rows={3} value={dorso} onChange={(e) => setDorso(e.target.value)} placeholder={t[3]} />
          <div className="chips extras">
            <button onClick={() => setDorso((d) => `${d}${d ? '\n' : ''}Ejemplo: `)}>+ Ejemplo</button>
            <button onClick={() => setDorso((d) => `${d}${d ? '\n' : ''}Fórmula: `)}>+ Fórmula</button>
            {tipo !== 'inversa' && <button role="switch" aria-checked={reves} onClick={() => setReves((v) => !v)}>También al revés</button>}
          </div>
        </>
      )}

      <div className="mazo-fuente">
        <label>
          <span className="sub">Mazo</span>
          <select className="select-plano" value={mazo} onChange={(e) => setMazo(e.target.value)}>
            {study.fronts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label>
          <span className="sub">Fuente</span>
          <input className="select-plano" value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder="Tesis cap. 2" />
        </label>
      </div>

      <div className="etiqueta rep-t">Así se va a ver</div>
      <div className="vista-previa" style={{ ['--c' as string]: front ? AREAS[front.color].css : 'var(--ing)' }}>
        <div><b>{vista.f || t[2].replace(/\[\[(.+?)\]\]/g, '___')}</b></div>
        <div className="sub">{vista.b || (tipo === 'completar' ? 'opuesto' : t[3])}</div>
      </div>

      <div className="dos-botones">
        <button className="btn-borde" disabled={!valida} onClick={() => guardar(false)}>Guardar</button>
        <button className="btn-principal" disabled={!valida} onClick={() => guardar(true)}>Guardar y otra</button>
      </div>
      <a className="fila-link" href="#/motor/importar">Pegar muchas o importar de Anki <span aria-hidden="true">→</span></a>
    </main>
  );
}
