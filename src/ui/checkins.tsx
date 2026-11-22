import { useState, useSyncExternalStore } from 'react';
import { fmtKg, FEEL_LABEL, fmtPace, medidasPendientes, runOn, runWeek, RUN_LABEL, weightAt } from '../data/train';
import { RUN_KINDS, type Run, type RunKind } from '../data/train-types';
import { addMedida, addRun, guardarPeso, marcarPesoPreguntado } from '../state/train';
import { useStore } from '../state/store';
import { toast } from './avisos';
import { Hoja } from './Hoja';
import '../styles/checkins.css';

type Abierta = { tipo: 'peso' | 'corrida'; date: string } | null;
let abierta: Abierta = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

/** Abre la hoja del peso del día (la primera vez que entrás a Entreno). */
export const abrirPeso = (date: string) => { abierta = { tipo: 'peso', date }; emit(); };
/** Abre la hoja de la corrida del día (al tildar "Correr" o tocar + en la meta). */
export const abrirCorrida = (date: string) => { abierta = { tipo: 'corrida', date }; emit(); };
const cerrar = () => { abierta = null; emit(); };
/** Solo para tests: qué hoja está abierta. */
export const hojaAbierta = () => abierta;
export const cerrarHojas = cerrar;
/** UX 2.0: la hoja abierta, para que el marco de la 2.0 decida cómo mostrarla. */
export const useHojaAbierta = () => useSyncExternalStore(subscribe, () => abierta);

const num = (t: string) => Number(t.replace(',', '.'));
const fmt = (n: number) => String(n).replace('.', ',');

/** Anfitrión de las hojas de check-in: se monta una vez en la app. */
export function Checkins() {
  const a = useSyncExternalStore(subscribe, () => abierta);
  if (!a) return null;
  return a.tipo === 'peso' ? <HojaPeso key={a.date} date={a.date} /> : <HojaCorrida key={a.date} date={a.date} />;
}

/** − [valor] + : el valor también se puede escribir. */
function Paso({ label, value, onChange, step, min, max, unidad, inicio = min }: {
  label: string; value: string; onChange: (v: string) => void; step: number; min: number; max: number; unidad: string;
  /** Desde dónde arranca el primer toque si el campo está vacío. */
  inicio?: number;
}) {
  const mover = (d: number) => {
    const n = num(value);
    if (value === '' || !Number.isFinite(n)) return onChange(fmt(inicio));
    onChange(fmt(Math.min(max, Math.max(min, Math.round((n + d) * 100) / 100))));
  };
  return (
    <div className="ck-paso" role="group" aria-label={`Ajustar ${label.toLowerCase()}`}>
      <button type="button" aria-label={`Menos ${label.toLowerCase()}`} onClick={() => mover(-step)}>−</button>
      <input className="ck-valor mono" inputMode="decimal" aria-label={label} value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />
      <span className="ck-unidad sub">{unidad}</span>
      <button type="button" aria-label={`Más ${label.toLowerCase()}`} onClick={() => mover(step)}>+</button>
    </div>
  );
}

function HojaPeso({ date }: { date: string }) {
  const t = useStore((s) => s.train);
  const ultimo = weightAt(t.weights, date);
  const hayMedidas = medidasPendientes(t.medidas, date);
  const [kg, setKg] = useState(ultimo ? fmt(ultimo.kg) : '');
  const [med, setMed] = useState({ cintura: '', pecho: '', brazo: '' });
  const valido = num(kg) > 20 && num(kg) < 400;

  const saltar = () => { marcarPesoPreguntado(date); cerrar(); };
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    const v = num(kg);
    guardarPeso(date, v);
    const m = { date, cintura: num(med.cintura) || undefined, pecho: num(med.pecho) || undefined, brazo: num(med.brazo) || undefined };
    addMedida(m);
    const d = ultimo ? Math.round((v - ultimo.kg) * 10) / 10 : null;
    toast({
      title: `Peso guardado · ${fmtKg(v)} kg`,
      sub: d == null ? `Meta ${fmtKg(t.goalKg)} kg` : `${d === 0 ? 'Igual que' : `${d > 0 ? '+' : '−'}${fmtKg(Math.abs(d))} kg desde`} el último · meta ${fmtKg(t.goalKg)} kg`,
      color: 'var(--salud)', evento: 'tarea',
    }, true);
    cerrar();
  };

  return (
    <Hoja titulo="¿Te pesaste hoy?" kicker="Entreno · peso" color="var(--salud)" onCerrar={saltar}>
      <form onSubmit={guardar}>
        <p className="sub ck-nota">{ultimo ? `Tu último peso: ${fmtKg(ultimo.kg)} kg.` : 'Todavía no cargaste ningún peso.'} En ayunas es lo más comparable.</p>
        <Paso label="Peso" value={kg} onChange={setKg} step={0.1} min={30} max={300} unidad="kg" inicio={Math.round(t.goalKg - 5)} />
        {hayMedidas && (
          <fieldset className="ck-medidas">
            <legend className="etiqueta">Medidas del mes · opcional</legend>
            <p className="sub ck-nota">Pasaron 4 semanas o más desde las últimas. En cm.</p>
            <div className="ck-3">
              {(['cintura', 'pecho', 'brazo'] as const).map((k) => (
                <label key={k}><span className="sub">{k[0].toUpperCase() + k.slice(1)}</span>
                  <input className="campo-texto mono" inputMode="decimal" placeholder="cm" value={med[k]} onChange={(e) => setMed({ ...med, [k]: e.target.value.replace(/[^\d.,]/g, '') })} />
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <button className="btn-principal" type="submit" disabled={!valido}>Guardar peso</button>
        <button className="btn-borde" type="button" onClick={saltar}>Hoy no</button>
      </form>
    </Hoja>
  );
}

function HojaCorrida({ date }: { date: string }) {
  const t = useStore((s) => s.train);
  const hoy = runOn(t.runs, date);
  const ultima = [...t.runs].sort((a, b) => a.date.localeCompare(b.date)).pop();
  const [min, setMin] = useState(String(hoy?.min ?? ultima?.min ?? 30));
  const [km, setKm] = useState(hoy?.km != null ? fmt(hoy.km) : '');
  const [kind, setKind] = useState<RunKind>(hoy?.kind ?? ultima?.kind ?? 'suave');
  const [feel, setFeel] = useState<Run['feel']>(hoy?.feel ?? 3);
  const m = Math.round(num(min));
  const k = km ? num(km) : undefined;
  const ritmo = fmtPace(m, k);
  const valido = m >= 1 && m <= 600 && (k == null || (k > 0 && k < 200));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    addRun({ date, min: m, ...(k ? { km: k } : {}), kind, feel });
    const sem = runWeek([...t.runs.filter((r) => r.date !== date), { date, min: m, kind, feel }], date);
    toast({
      title: `Corrida guardada · ${m} min${k ? ` · ${fmt(k)} km` : ''}`,
      sub: `Van ${sem.n} esta semana, ${sem.min} min en total${ritmo ? ` · ${ritmo} /km` : ''}`,
      color: 'var(--salud)', evento: 'tarea',
    }, true);
    cerrar();
  };

  return (
    <Hoja titulo={hoy ? 'Corregir la corrida de hoy' : '¿Cuánto corriste?'} kicker="Salud · correr" color="var(--salud)" onCerrar={cerrar}>
      <form onSubmit={guardar}>
        <Paso label="Tiempo" value={min} onChange={setMin} step={5} min={5} max={600} unidad="min" />
        <label className="ck-km"><span className="etiqueta">Distancia · opcional</span>
          <span className="ck-km-fila">
            <input className="campo-texto mono" inputMode="decimal" placeholder="5,2" value={km} onChange={(e) => setKm(e.target.value.replace(/[^\d.,]/g, ''))} aria-label="Distancia en km" />
            <span className="sub">km</span>
            <b className="mono ck-ritmo">{ritmo ? `${ritmo} /km` : '—'}</b>
          </span>
        </label>
        <span className="etiqueta">Tipo</span>
        <div className="segmentado" role="radiogroup" aria-label="Tipo de corrida">
          {RUN_KINDS.map((x) => <button type="button" key={x} role="radio" aria-checked={kind === x} onClick={() => setKind(x)}>{RUN_LABEL[x]}</button>)}
        </div>
        <span className="etiqueta">Cómo te sentiste · {FEEL_LABEL[feel].toLowerCase()}</span>
        <div className="ck-feel" role="radiogroup" aria-label="Cómo te sentiste">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button type="button" key={n} role="radio" aria-checked={feel === n} aria-label={`${n}: ${FEEL_LABEL[n]}`} onClick={() => setFeel(n)}>{n}</button>
          ))}
        </div>
        <button className="btn-principal" type="submit" disabled={!valido}>Guardar corrida</button>
        <button className="btn-borde" type="button" onClick={cerrar}>Después</button>
      </form>
    </Hoja>
  );
}
