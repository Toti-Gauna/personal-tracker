import { useState } from 'react';
import { weekday } from '../data/study';
import { fmtFecha, parseDate } from '../data/time';
import { fmtKg, pace, weightAt } from '../data/train';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { addWeight, deleteWeight, setGoalKg } from '../state/train';
import { toast } from '../ui/avisos';
import '../styles/entreno.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${parseDate(d).getDate()} ${MES[parseDate(d).getMonth()]}`;
const W = 340;
const H = 190;

/** 5.8 Peso: semanal, con la curva y la meta. */
export function Peso({ day }: { day: DayLog }) {
  const t = useStore((s) => s.train);
  const [txt, setTxt] = useState('');
  const [meta, setMeta] = useState<string | null>(null);
  const ws = [...t.weights].sort((a, b) => a.date.localeCompare(b.date));
  const hoy = day.date;
  const dom = weekday(hoy) === 6;
  const ultimo = weightAt(ws, hoy);
  const previo = ws.length > 1 ? ws[ws.length - 2] : undefined;
  const ritmo = pace(ws);
  const falta = ultimo ? t.goalKg - ultimo.kg : null;
  const semanas = ritmo && falta != null && ritmo.perWeek > 0.01 && falta > 0 ? Math.round(falta / ritmo.perWeek) : null;

  // Eje Y redondeado de a 4 kg, con la meta adentro.
  const vals = [...ws.map((w) => w.kg), t.goalKg];
  const min = Math.floor((Math.min(...vals) - 1) / 4) * 4;
  const max = Math.ceil((Math.max(...vals) + 1) / 4) * 4;
  const x = (i: number) => 52 + (ws.length > 1 ? (i / (ws.length - 1)) * (W - 52 - 16) : (W - 52 - 16) / 2);
  const y = (kg: number) => 16 + (1 - (kg - min) / (max - min)) * (H - 16 - 28);
  const ticks: number[] = [];
  for (let v = min; v <= max; v += 4) ticks.push(v);

  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Number(txt.replace(',', '.'));
    if (!(kg > 20 && kg < 400)) return;
    addWeight(hoy, kg);
    setTxt('');
    toast({ title: `Peso guardado · ${fmtKg(kg)} kg`, sub: falta != null ? `Meta ${fmtKg(t.goalKg)} kg` : undefined, color: 'var(--salud)' }, false);
  };

  return (
    <main className="pantalla peso" style={{ ['--c' as string]: 'var(--salud)' }}>
      <div className="topbar"><a className="volver" href="#/entreno">Entreno</a></div>
      <div className="etiqueta">Peso{ultimo ? ` · ${fmtFecha(ultimo.date).toUpperCase()}` : ''}</div>
      <div className="peso-cab">
        <div className="peso-n"><b className="titulo">{ultimo ? fmtKg(ultimo.kg) : '—'}</b><span className="sub">kg</span></div>
        <div className="peso-meta">
          {ultimo && previo && <b className="mono" style={{ color: ultimo.kg >= previo.kg ? 'var(--salud)' : 'var(--eclipse)' }}>{ultimo.kg >= previo.kg ? '+' : '−'}{fmtKg(Math.abs(ultimo.kg - previo.kg))}</b>}
          <span className="sub">meta {fmtKg(t.goalKg)} kg</span>
        </div>
      </div>

      {ws.length > 0 ? (
        <>
          <svg className="peso-grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Curva de peso: ${ws.map((w) => `${dm(w.date)} ${fmtKg(w.kg)} kg`).join(', ')}`}>
            {ticks.map((v) => (
              <g key={v}><line x1={52} x2={W - 8} y1={y(v)} y2={y(v)} className="grid" /><text x={0} y={y(v) + 4} className="eje">{v}</text></g>
            ))}
            <line x1={52} x2={W - 8} y1={y(t.goalKg)} y2={y(t.goalKg)} className="meta" />
            <text x={W - 8} y={y(t.goalKg) - 6} textAnchor="end" className="meta-t">meta {fmtKg(t.goalKg)}</text>
            {ws.length > 1 && <polyline className="curva" points={ws.map((w, i) => `${x(i)},${y(w.kg)}`).join(' ')} />}
            {ws.map((w, i) => (
              <circle key={w.date} cx={x(i)} cy={y(w.kg)} r={i === ws.length - 1 ? 6 : 4} className={i === ws.length - 1 ? 'ultimo' : 'punto'}><title>{`${dm(w.date)}: ${fmtKg(w.kg)} kg`}</title></circle>
            ))}
            <text x={52} y={H - 6} className="eje">{dm(ws[0].date)}</text>
            {ws.length > 1 && <text x={W - 8} y={H - 6} textAnchor="end" className="eje">{dm(ws[ws.length - 1].date)}</text>}
          </svg>
          <p className="sub">{ws.length} {ws.length === 1 ? 'pesaje' : 'pesajes'}{ritmo ? `. Ritmo actual: ${ritmo.perWeek >= 0 ? '+' : '−'}${fmtKg(Math.round(Math.abs(ritmo.perWeek) * 100) / 100)} kg por semana.` : '. Con dos pesajes se calcula el ritmo.'}</p>
          <div className="tres-datos">
            <div><b className="mono">{ritmo ? `${ritmo.change >= 0 ? '+' : '−'}${fmtKg(Math.abs(Math.round(ritmo.change * 10) / 10))}` : '—'}</b><span>{ritmo ? `kg en ${ritmo.weeks} sem.` : 'kg desde el primer pesaje'}</span></div>
            <div><b className="mono">{falta != null ? fmtKg(Math.round(Math.abs(falta) * 10) / 10) : '—'}</b><span>kg para la meta</span></div>
            <div><b className="mono">{semanas ? `~${semanas}` : '—'}</b><span>semanas al ritmo</span></div>
          </div>
        </>
      ) : (
        <p className="sub vacio">Todavía no hay pesajes. Pesate en ayunas los domingos y cargalo acá: la curva y el ritmo salen solos.</p>
      )}

      <form className="pesaje" onSubmit={registrar}>
        <label className="etiqueta" htmlFor="peso-i">{dom ? `Pesaje del domingo ${parseDate(hoy).getDate()}` : `Pesaje de hoy`} · en ayunas</label>
        <div className="pesaje-fila">
          <input id="peso-i" className="campo-texto mono" inputMode="decimal" placeholder={ultimo ? fmtKg(ultimo.kg) : '88,4'} value={txt} onChange={(e) => setTxt(e.target.value.replace(/[^\d.,]/g, ''))} />
          <button className="btn-principal" type="submit" disabled={!txt}>Registrar</button>
        </div>
        {!dom && <p className="sub nota-izq">Pesarse los domingos hace comparables las semanas, pero podés cargar hoy.</p>}
      </form>

      <div className="etiqueta rep-t">Meta</div>
      <div className="pesaje-fila">
        <input className="campo-texto mono" inputMode="decimal" aria-label="Meta de peso en kg" value={meta ?? fmtKg(t.goalKg)} onChange={(e) => setMeta(e.target.value.replace(/[^\d.,]/g, ''))} onBlur={() => { if (meta != null) setGoalKg(Number(meta.replace(',', '.'))); setMeta(null); }} />
        <span className="sub">kg</span>
      </div>
      {ws.length > 0 && (
        <ul className="pesos-lista">
          {[...ws].reverse().slice(0, 6).map((w) => (
            <li key={w.date}><span>{fmtFecha(w.date)}</span><span className="mono">{fmtKg(w.kg)} kg</span><button className="borrar" aria-label={`Borrar el pesaje del ${dm(w.date)}`} onClick={() => deleteWeight(w.date)}>Borrar</button></li>
          ))}
        </ul>
      )}
    </main>
  );
}
