import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { HORIZON_LABEL } from '../data/goals';
import type { GoalType, Horizon } from '../data/goals-types';
import { RAMA_COLOR, RAMAS } from '../data/ramas';
import type { Area, Rama } from '../data/types';
import { ir } from '../lib/routes';
import { enPausa } from '../data/plan-state';
import { addGoal } from '../state/goals';
import { useStore } from '../state/store';
import { newId } from '../data/schedule';
import { toast } from '../ui/avisos';
import { HojaSubmeta } from '../ui/HojaSubmeta';
import '../styles/estudio.css';
import '../styles/metas.css';

const HORIZONTES: Horizon[] = ['dia', 'semana', 'mes', 'bim', 'anio'];
const TIPOS: [GoalType, string, string][] = [
  ['tarea', 'Tarea', 'Se cumple una vez: terminar docs, pagar el alquiler'],
  ['contador', 'Contador', 'Veces por semana: entrenar 7×, meditar 3×'],
  ['numero', 'Número', 'Llegar a una cifra: 23 ventas, 100 usuarios'],
];
const RUTA: Record<Horizon, string> = { dia: 'semana', semana: 'semana', mes: 'mes', bim: 'bimestre', anio: 'anio' };

/** 4.5 Nueva meta: horizonte, área y tipo. */
export function NuevaMeta({ today, horizon }: { today: string; horizon?: string }) {
  const [titulo, setTitulo] = useState('');
  const [h, setH] = useState<Horizon>(HORIZONTES.includes(horizon as Horizon) ? (horizon as Horizon) : 'semana');
  const [area, setArea] = useState<Area>('salud');
  const [tipo, setTipo] = useState<GoalType>('numero');
  const [meta, setMeta] = useState('10');
  const [unidad, setUnidad] = useState('');
  const [quick, setQuick] = useState(false);
  const [rama, setRama] = useState<Rama | null>(null);
  const plan = useStore((st) => st.plan);
  const areaEnPausa = area === 'eclipse' && enPausa(plan, 'ventas', today);
  const [subs, setSubs] = useState<{ id: string; t: string }[]>([]);
  const [hoja, setHoja] = useState(false);
  const [diaria, setDiaria] = useState(false);

  const conSubs = subs.length > 0;
  const porDia = diaria && h === 'semana' && !conSubs && tipo !== 'tarea';
  const target = conSubs ? subs.length : tipo === 'tarea' ? 1 : porDia ? Math.min(7, Number(meta.replace(',', '.')) || 0) : Number(meta.replace(',', '.')) || 0;
  const valida = titulo.trim() && target > 0;
  const guardar = () => {
    if (!valida) return;
    addGoal({ title: titulo.trim(), area, horizon: h, type: tipo, target, subs, daily: porDia, unit: tipo === 'tarea' ? undefined : unidad.trim() || undefined, quick: quick && tipo !== 'tarea' && !conSubs && !porDia && (h === 'dia' || h === 'semana'), ...(rama ? { rama } : {}) }, today);
    toast({ title: 'Meta guardada', sub: `${titulo.trim()} · ${HORIZON_LABEL[h].toLowerCase()}`, color: AREAS[area].css }, false);
    ir(`metas/${RUTA[h]}`);
  };

  return (
    <main className="pantalla actividad nueva-meta">
      <div className="topbar">
        <a className="volver" href="#/metas">Cancelar</a>
        <span className="mono">nueva meta</span>
      </div>
      <label className="etiqueta" htmlFor="nm-t">¿Qué querés lograr?</label>
      <input id="nm-t" className="campo-grande" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ventas de Roofy" autoFocus />

      <span className="etiqueta">Horizonte</span>
      <div className="segmentado" role="radiogroup" aria-label="Horizonte">
        {HORIZONTES.map((x) => <button key={x} role="radio" aria-checked={h === x} onClick={() => setH(x)}>{HORIZON_LABEL[x]}</button>)}
      </div>

      <span className="etiqueta">Área</span>
      <div className="chips" role="radiogroup" aria-label="Área">
        {(Object.keys(AREAS) as Area[]).map((a) => (
          <button key={a} role="radio" aria-checked={area === a} onClick={() => setArea(a)}><i style={{ background: AREAS[a].css }} />{AREAS[a].name}</button>
        ))}
      </div>

      {areaEnPausa && <p className="aviso-pausa">Eclipse está en stand-by: la meta se guarda, pero no se ve en Semana hasta que lo retomes. Elegí otra área para verla ahora.</p>}

      <span className="etiqueta">Rama del plan T+18 · opcional</span>
      <div className="nm-ramas" role="radiogroup" aria-label="Rama del plan">
        <button role="radio" aria-checked={rama === null} onClick={() => setRama(null)}>ninguna</button>
        {RAMAS.map((r) => (
          <button key={r} role="radio" aria-checked={rama === r} style={{ ['--c' as string]: RAMA_COLOR[r] }} onClick={() => setRama(r)}>{r}</button>
        ))}
      </div>
      <p className="sub nota-izq">Con rama, la meta suma al avance de esa rama en la Ruta y aparece en el mapa.</p>

      <span className="etiqueta">Submetas · opcional</span>
      <ul className="subs-lista">
        {subs.map((x, i) => (
          <li key={x.id}>
            <span className="mono sub">{i + 1}</span>
            <span>{x.t}</span>
            <button type="button" className="borrar" aria-label={`Quitar ${x.t}`} onClick={() => setSubs((v) => v.filter((y) => y.id !== x.id))}>Quitar</button>
          </li>
        ))}
      </ul>
      <button type="button" className="nueva-meta-btn subs-agregar" onClick={() => setHoja(true)}>+ Agregar submeta</button>
      <p className="sub nota-izq">{conSubs ? `La meta se cumple al hacer las ${subs.length} submetas.` : 'Pasos más chicos que se tildan dentro de la meta. Sin submetas, elegís el tipo abajo.'}</p>

      {hoja && <HojaSubmeta kicker={titulo.trim() || 'Submeta'} color={AREAS[area].css} onAgregar={(t) => setSubs((x) => [...x, { id: newId(), t }])} onCerrar={() => setHoja(false)} />}

      {!conSubs && <span className="etiqueta">Tipo</span>}
      {!conSubs && <div className="tipos" role="radiogroup" aria-label="Tipo">
        {TIPOS.map(([id, nombre, desc]) => (
          <button key={id} role="radio" aria-checked={tipo === id} onClick={() => setTipo(id)}>
            <span className="radio" aria-hidden="true" />
            <span><b>{nombre}</b><small>{desc}</small></span>
          </button>
        ))}
      </div>}

      {!conSubs && tipo !== 'tarea' && (
        <div className="dos-campos">
          <label>Llegar a<input className="campo-texto mono" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value.replace(/[^\d.,]/g, ''))} /></label>
          <label>Unidad<input className="campo-texto" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="ventas" /></label>
        </div>
      )}
      {!conSubs && tipo === 'contador' && h === 'semana' && (
        <div className="fila-ajuste">
          <span>Marcar día por día<small>Una tira L M X J V S D: tocás cada día que lo cumplís</small></span>
          <button type="button" role="switch" className="switch" aria-checked={diaria} aria-label="Marcar día por día" onClick={() => setDiaria((v) => !v)} />
        </div>
      )}
      {!conSubs && tipo !== 'tarea' && (h === 'dia' || h === 'semana') && (
        <div className="fila-ajuste">
          <span>Mostrar en Hoy<small>Un botón para sumar rápido en «Sumar a la semana»</small></span>
          <button role="switch" className="switch" aria-checked={quick} aria-label="Mostrar en Hoy" onClick={() => setQuick((v) => !v)} />
        </div>
      )}
      <p className="sub nota-izq">{h === 'dia' || h === 'semana' || h === 'mes' ? `Se repite cada ${h === 'dia' ? 'día' : h === 'semana' ? 'semana' : 'mes'} y arranca de cero.` : 'Cuenta solo para este período.'}</p>

      <button className="btn-principal" style={{ marginTop: 24 }} disabled={!valida} onClick={guardar}>Guardar meta</button>
    </main>
  );
}
