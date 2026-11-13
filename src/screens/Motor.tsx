import { useEffect, useState } from 'react';
import { AREAS } from '../data/defaults';
import { cardFront, parseCardsText } from '../data/study';
import type { Rules } from '../data/study-types';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { addCards, setRules } from '../state/study';
import { DIA, MAX_TRIES } from '../data/study-catalog';
import { toast } from '../ui/avisos';
import { addDays } from '../data/time';
import '../styles/estudio.css';
import '../styles/repaso.css';

/** Días del capítulo: 1 → 2 → 3 → 8 → 22 → 61. */
const ESCALERA: [string, string, string][] = [
  [String(DIA.estudiar), 'Estudiar', 'var(--tinta)'], [String(DIA.test), 'Cold recall + test', 'var(--economia)'], [String(DIA.tesis), 'Tesis', 'var(--economia)'],
  [String(DIA.e8), 'Repetir', 'var(--ing)'], [String(DIA.e22), 'Repetir', 'var(--ing)'], [String(DIA.e61), 'Examen', 'var(--salud)'],
];

/** Una regla con su valor en caja; tocarlo pasa al siguiente valor posible. */
function Ajuste<T>({ label, desc, value, opciones, fmt, onChange }: { label: string; desc: string; value: T; opciones?: T[]; fmt: (v: T) => string; onChange?: (v: T) => void }) {
  const sig = () => {
    if (!opciones || !onChange) return;
    const i = opciones.findIndex((o) => o === value);
    onChange(opciones[(i + 1) % opciones.length]);
  };
  return (
    <div className="regla">
      <span><b>{label}</b><small>{desc}</small></span>
      {opciones ? (
        <button className="valor mono" onClick={sig} aria-label={`${label}: ${fmt(value)}. Tocá para cambiar`}>{fmt(value)}</button>
      ) : (
        <span className="valor mono">{fmt(value)}</span>
      )}
    </div>
  );
}

/** 3.5 Motor de repaso: la escalera, las reglas, el estado de las tarjetas y cómo traer tarjetas. */
export function Motor({ day, seccion }: { day: DayLog; seccion?: string }) {
  const study = useStore((s) => s.study);
  const r = study.rules;
  const set = (p: Partial<Rules>) => setRules(p);
  const [bloque, setBloque] = useState('');
  const [mazo, setMazo] = useState(study.fronts[0]?.id ?? '');
  const [fuente, setFuente] = useState('');
  const detectadas = parseCardsText(bloque);
  const [pegarAbierto, setPegarAbierto] = useState(seccion === 'importar');

  useEffect(() => {
    if (seccion === 'importar') document.getElementById('importar')?.scrollIntoView();
  }, [seccion]);

  const cards = study.cards;
  const nuevas = cards.filter((c) => !c.srs || c.srs.state === 'new').length;
  const aprendiendo = cards.filter((c) => c.srs && (c.srs.state === 'learning' || c.srs.state === 'relearning')).length;
  const maduras = cards.filter((c) => c.srs?.state === 'review' && c.srs.s >= 21).length;
  const enRepaso = cards.length - nuevas - aprendiendo - maduras;
  const desde = addDays(day.date, -30);
  const log = study.log.filter((l) => l.date >= desde);
  const ret = (ids?: Set<string>) => {
    const ls = ids ? log.filter((l) => ids.has(l.cardId)) : log;
    return ls.length ? Math.round((ls.filter((l) => l.grade > 1).length / ls.length) * 100) : null;
  };
  const total = ret();
  const frente = study.fronts.find((f) => f.id === mazo);

  const importar = (texto: string, origen: string) => {
    const cs = parseCardsText(texto);
    if (!cs.length) return toast({ title: 'No encontré tarjetas', sub: 'Una por línea con :: o [[ ]], o un .txt de Anki', color: 'var(--rutina)' }, false);
    addCards(day.date, cs.map((c) => ({ ...c, deck: frente?.name ?? 'General', frontId: frente?.id, source: fuente.trim() || origen })));
    toast({ title: `${cs.length} tarjetas nuevas`, sub: `Mazo ${frente?.name}. Entran de a ${r.newPerDay} por día.`, color: frente ? AREAS[frente.color].css : undefined }, false);
    setBloque('');
  };

  const archivo = (f?: File) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importar(String(rd.result ?? ''), f.name.replace(/\.[^.]+$/, ''));
    rd.readAsText(f);
  };

  return (
    <main className="pantalla motor">
      <div className="topbar"><a className="volver" href="#/repaso">Repaso</a></div>
      <h1 className="titulo">Motor de repaso</h1>
      <p className="sub">Así decide Trazo qué repasás cada día. Todo se ajusta acá y vale para todos los frentes.</p>

      <div className="etiqueta rep-t">De estudiar a recordar</div>
      <ol className="escalera-motor">
        {ESCALERA.map(([d, t, c], i) => (
          <li key={d}><span className="mono" style={{ borderColor: c, background: i === 0 ? 'var(--tinta)' : undefined, color: i === 0 ? 'var(--papel)' : undefined }}>{d}</span><small>{t}</small></li>
        ))}
      </ol>

      <div className="etiqueta rep-t">Reglas</div>
      <Ajuste label="Cold recall antes del test" desc={`El día ${DIA.test}, 5 min contra el capítulo; con ${Math.round(r.coldSkipAt * 100)} % o más no hace falta releer`} value="día 2" fmt={(v) => v} />
      <Ajuste label="Test sin aprobar" desc={`Releer al día siguiente y re-test al otro; a la ${MAX_TRIES === 3 ? 'tercera' : `${MAX_TRIES}.ª`} vez, el tema queda flojo`} value={`${MAX_TRIES} veces`} fmt={(v) => v} />
      <Ajuste label="Releer cuando falla" desc="Cold recall por debajo de este número o tarjeta fallada 2 veces" value={r.rereadBelow} opciones={[0.6, 0.65, 0.7, 0.75, 0.8]}
        fmt={(v) => `< ${Math.round(v * 100)} %`} onChange={(v) => set({ rereadBelow: v })} />
      <Ajuste label="Retención buscada" desc="Cuánto querés recordar; más alto, más repasos" value={r.retention} opciones={[0.85, 0.88, 0.9, 0.92, 0.95]}
        fmt={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ retention: v })} />
      <Ajuste label="Tarjetas nuevas por día" desc="El resto espera al día siguiente" value={r.newPerDay} opciones={[5, 10, 15, 20, 30]} fmt={String} onChange={(v) => set({ newPerDay: v })} />
      <Ajuste label="Tope de repaso por día" desc="Si vence más, entran primero las más olvidadas y el resto pasa a mañana" value={r.cap} opciones={[10, 15, 20, 25, 30]}
        fmt={(v) => `${v} min`} onChange={(v) => set({ cap: v })} />
      <Ajuste label="Saltear lo que ya sabés" desc="Ejercicios espaciados más cortos si el anterior salió perfecto" value={r.shortenIfPerfect} opciones={[true, false]}
        fmt={(v) => (v ? 'sí' : 'no')} onChange={(v) => set({ shortenIfPerfect: v })} />

      <div className="fila-t rep-t"><span className="etiqueta">Tus {cards.length} tarjetas</span><span className="mono sub">retención {total == null ? '—' : `${total} %`}</span></div>
      {cards.length > 0 && (
        <>
          <div className="estado-barra" role="img" aria-label={`${nuevas} nuevas, ${aprendiendo} aprendiendo, ${enRepaso} en repaso, ${maduras} maduras`}>
            {nuevas > 0 && <span style={{ flexGrow: nuevas }} className="vacia" />}
            {aprendiendo > 0 && <span style={{ flexGrow: aprendiendo, background: 'var(--economia)' }} />}
            {enRepaso > 0 && <span style={{ flexGrow: enRepaso, background: 'var(--ing)' }} />}
            {maduras > 0 && <span style={{ flexGrow: maduras, background: 'var(--salud)' }} />}
          </div>
          <div className="estado-leyenda sub">
            <span>{nuevas} nuevas</span><span>{aprendiendo} aprendiendo</span><span>{enRepaso} en repaso</span><span>{maduras} maduras</span>
          </div>
        </>
      )}
      <ul className="por-mazo">
        {study.fronts.map((f) => {
          const ids = new Set(cards.filter((c) => cardFront(c, study.fronts) === f.id).map((c) => c.id));
          const v = ret(ids);
          return (
            <li key={f.id}>
              <span><i style={{ background: AREAS[f.color].css }} />{f.name}</span>
              <span className="mazo-barra"><span style={{ width: `${v ?? 0}%`, background: AREAS[f.color].css }} /></span>
              <span className="mono">{v == null ? (ids.size ? '—' : '0') : `${v} %`}</span>
            </li>
          );
        })}
      </ul>

      <div id="importar" className="etiqueta rep-t">Traer tarjetas</div>
      <label className="fila-link archivo">
        <span>Importar de Anki<small>Archivo de texto exportado · frente y dorso, al mazo {frente?.name ?? 'elegido'}</small></span>
        <span aria-hidden="true">→</span>
        <input type="file" accept=".txt,.tsv,.csv,text/plain" onChange={(e) => archivo(e.target.files?.[0])} />
      </label>
      <button className="fila-link fila-boton" aria-expanded={pegarAbierto} onClick={() => setPegarAbierto((v) => !v)}>
        <span>Pegar un bloque<small>Una tarjeta por línea con :: o [[ ]]</small></span>
        <span aria-hidden="true">{pegarAbierto ? '↓' : '→'}</span>
      </button>
      {pegarAbierto && (
        <div className="pegar">
          <div className="mazo-fuente">
            <label><span className="sub">Mazo</span>
              <select className="select-plano" value={mazo} onChange={(e) => setMazo(e.target.value)}>
                {study.fronts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label><span className="sub">Fuente</span><input className="select-plano" value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder="Opcional" /></label>
          </div>
          <textarea className="campo-texto" rows={5} value={bloque} onChange={(e) => setBloque(e.target.value)} aria-label="Bloque de tarjetas" placeholder={'Menos por menos :: da positivo.\nRestar un número es sumar su [[opuesto]].'} />
          <button className="btn-principal" disabled={!detectadas.length} onClick={() => importar(bloque, 'Bloque pegado')}>
            {detectadas.length ? `Agregar ${detectadas.length} ${detectadas.length === 1 ? 'tarjeta' : 'tarjetas'}` : 'Agregar tarjetas'}
          </button>
        </div>
      )}
    </main>
  );
}
