import { useMemo, useState } from 'react';
import { AREAS } from '../data/defaults';
import { bimester, dayNumber, mejoraAcumulada, mejoraAyer } from '../data/derive';
import { dayJson } from '../data/export';
import { blockDone, fmtPct, mejoraDia, valorMeta } from '../data/mejora';
import { dayXp } from '../data/profile';
import { cierreSugerido } from '../data/study';
import { racha } from '../data/derive';
import { addDays, fmtFecha, toHHMM, nowMin } from '../data/time';
import type { Area, DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { getState, useStore } from '../state/store';
import { closeDay, reopenDay } from '../state/profile';
import { toast } from '../ui/avisos';
import { Casilla } from '../ui/Casilla';
import '../styles/perfil.css';

const num = (n: number, d = 2) => n.toFixed(d).replace('.', ',');

/** 6.1 Cierre del día: primero la mejora, después áreas, pendientes y el JSON. */
export function Cierre({ day }: { day: DayLog }) {
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const names = useStore((s) => s.goals.bimesterNames);
  const cerrado = !!day.closed;
  const mejora = mejoraDia(day);
  const ayer = mejoraAyer(days, day.date);
  const diff = mejora - ayer;
  const hechas = day.blocks.flatMap((b) => b.tasks).filter((t) => t.done).length;
  const total = day.blocks.flatMap((b) => b.tasks).length;
  const score = total ? hechas / total : 0;
  const xp = dayXp(day);
  const metas = day.blocks.filter(blockDone).length;
  const n = dayNumber(settings.startDate, day.date);
  const acum = mejoraAcumulada(days, day.date);
  const ultimos = [-2, -1, 0].map((i) => addDays(day.date, i)).filter((d) => days[d]).map((d) => ({ d, m: mejoraDia(days[d]) }));
  const max = Math.max(1, ...ultimos.map((x) => x.m));
  const pendientes = day.blocks.flatMap((b) => b.tasks.filter((t) => !t.done).map((t) => ({ ...t, block: b.title })));
  const [pasar, setPasar] = useState<Set<string>>(() => new Set(pendientes.map((t) => t.id)));
  // Del estudio salen la victoria (un test aprobado hoy) y lo primero de mañana (lo que vence).
  const [sug] = useState(() => cierreSugerido(getState().study, day.date));
  const [victoria, setVictoria] = useState(day.closed?.victoria ?? sug.victoria);
  const [manana, setManana] = useState(day.closed?.manana ?? sug.manana);

  const porArea = useMemo(() => {
    const m = new Map<Area, { h: number; t: number }>();
    for (const b of day.blocks) {
      const c = m.get(b.area) ?? { h: 0, t: 0 };
      c.h += b.tasks.filter((t) => t.done).length;
      c.t += b.tasks.length;
      m.set(b.area, c);
    }
    return [...m.entries()].filter(([, v]) => v.t > 0);
  }, [day.blocks]);

  const bim = bimester(settings.startDate, day.date, names);
  const json = useMemo(() => {
    const j = dayJson({ ...day, closed: day.closed ?? { at: toHHMM(nowMin()), xp, score, victoria, manana } }, settings, days, names);
    return JSON.stringify(j, null, 2);
  }, [day, settings, days, names, xp, score, victoria, manana]);

  const cerrar = async () => {
    const nuevos = closeDay(day.date, { victoria, manana, carry: [...pasar], score });
    // El JSON se arma después de cerrar, con lo que pasó a mañana ya sacado del día.
    const s = getState();
    const final = JSON.stringify(dayJson(s.days[day.date], s.settings!, s.days, s.goals.bimesterNames), null, 2);
    try {
      await navigator.clipboard.writeText(final + '\n');
      toast({ title: 'JSON copiado · día cerrado', sub: `Pegalo como data/days/${day.date}.json`, color: 'var(--economia)' }, false);
    } catch {
      toast({ title: 'Día cerrado', sub: 'No pude copiar: descargalo desde "JSON del día"', color: 'var(--rutina)' }, false);
    }
    if (nuevos.length) ir(`logro/${nuevos[0]}`);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(json + '\n');
      toast({ title: 'JSON copiado', sub: `data/days/${day.date}.json`, color: 'var(--economia)' }, false);
    } catch {
      toast({ title: 'No se pudo copiar', sub: 'Descargalo desde "JSON del día"', color: 'var(--rutina)' }, false);
    }
  };

  return (
    <main className="pantalla cierre">
      <div className="topbar"><a className="volver" href="#/hoy">Hoy</a></div>
      <div className="etiqueta">Cierre · día {String(n).padStart(2, '0')} · {day.closed?.at ?? toHHMM(nowMin())}</div>
      <p className="sub cierre-mejoraste">Hoy mejoraste</p>
      <div className="mejora-gran"><b className="mono">+{num(mejora)} %</b><span className="sub">de 1 % posible</span></div>
      <p className="avanzaste"><span className="resaltado" style={{ ['--c' as string]: 'var(--economia)' }}>
        {!days[addDays(day.date, -1)] ? 'Es tu primer día registrado.' : Math.abs(diff) < 0.005 ? 'Igual que ayer.' : diff > 0 ? `Avanzaste ${num(diff)} más que ayer.` : `Hoy ${num(-diff)} menos que ayer.`}
      </span></p>
      <div className="seg-metas" aria-hidden="true">{day.blocks.map((b) => <span key={b.key} className={blockDone(b) ? 'on' : ''} />)}</div>
      <p className="sub">{metas} de {day.blocks.length} metas del día · cada una vale {fmtPct(valorMeta(day), 3)} %</p>

      <div className="dos-cajas">
        <div>
          <span className="sub">Estos días</span>
          <div className="mini-barras" role="img" aria-label={ultimos.map((x) => `${fmtFecha(x.d)} ${num(x.m)}`).join(', ')}>
            <i className="meta-1" />
            {ultimos.map((x) => (
              <span key={x.d} className={x.d === day.date ? 'hoy' : ''}><i style={{ height: `${(x.m / max) * 100}%` }} /><small className="mono">{'DLMXJVS'[new Date(x.d + 'T12:00').getDay()]} {num(x.m)}</small></span>
            ))}
          </div>
        </div>
        <div>
          <span className="sub">Desde el día 0</span>
          <b className="mono grande">+{num(acum)} %</b>
          <small className="sub">Si sostenés 1 % por día, en un año sos {Math.round(1.01 ** 365)} veces mejor.</small>
        </div>
      </div>
      <div className="fila-t resumen-linea mono"><span className="sub">{hechas} de {total} tareas · {Math.round(score * 100)} %</span><span>+{cerrado ? day.closed!.xp : xp} XP · racha {racha(days, day.date)}</span></div>

      <ul className="areas-barras">
        {porArea.map(([a, v]) => (
          <li key={a}><span>{AREAS[a].name}</span><span className="barra"><i style={{ width: `${(v.h / v.t) * 100}%`, background: AREAS[a].css }} /></span><span className="mono">{Math.round((v.h / v.t) * 100)}%</span></li>
        ))}
      </ul>

      {pendientes.length > 0 && !cerrado && (
        <>
          <div className="etiqueta cierre-t">Pasar a mañana</div>
          <ul className="tareas">
            {pendientes.map((t) => (
              <li key={t.id}>
                <Casilla checked={pasar.has(t.id)} label={t.t} onChange={() => setPasar((p) => { const n2 = new Set(p); n2.has(t.id) ? n2.delete(t.id) : n2.add(t.id); return n2; })} />
                <span className="pend-t">{t.t}<small className="sub">{t.block}</small></span>
              </li>
            ))}
          </ul>
        </>
      )}

      <label className="campo-doble"><span className="sub">Pequeña victoria</span>
        <input className="campo-linea" value={victoria} onChange={(e) => setVictoria(e.target.value)} placeholder={sug.victoria || 'Aprobé el test del cap. 3'} readOnly={cerrado} /></label>
      <label className="campo-doble"><span className="sub">Mañana, lo primero</span>
        <input className="campo-linea" value={manana} onChange={(e) => setManana(e.target.value)} placeholder={sug.manana || 'Cold recall del cap. 3'} readOnly={cerrado} /></label>

      <div className="json-cab"><b className="mono">{day.date}.json</b><span className="mono sub">{(new Blob([json]).size / 1024).toFixed(1).replace('.', ',')} KB</span></div>
      <pre className="json-pre corto" tabIndex={0}>{json}</pre>
      {cerrado ? (
        <>
          <p className="listo">Día cerrado a las {day.closed!.at}. {bim.name}, semana {bim.week}.</p>
          <button className="btn-principal" onClick={copiar}>Copiar JSON otra vez</button>
          <button className="terminar-foco" onClick={() => reopenDay(day.date)}>Reabrir el día</button>
        </>
      ) : (
        <>
          <button className="btn-principal" onClick={cerrar}>Copiar JSON y cerrar el día</button>
          <p className="nota">Pegáselo a Claude y queda guardado en el repo.</p>
        </>
      )}
    </main>
  );
}
