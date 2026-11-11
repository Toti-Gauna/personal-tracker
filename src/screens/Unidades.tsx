import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { bimester } from '../data/derive';
import { unitStatus } from '../data/study';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import '../styles/estudio.css';

/** 2.8 Unidades y tests del bimestre: CONAMAT completo y la programación del B1. */
export function Unidades({ day }: { day: DayLog }) {
  const study = useStore((s) => s.study);
  const settings = useStore((s) => s.settings)!;
  const conUnidades = study.activities.filter((a) => a.units?.length);
  const [tab, setTab] = useState(conUnidades[0]?.id);
  const a = conUnidades.find((x) => x.id === tab) ?? conUnidades[0];
  const bim = bimester(settings.startDate, day.date);
  const front = study.fronts.find((f) => f.id === a?.front);

  return (
    <main className="pantalla unidades" style={{ ['--c' as string]: front ? AREAS[front.color].css : 'var(--ing)' }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <div className="etiqueta">Bimestre {bim.n} · {bim.name}</div>
      <h1 className="titulo">Unidades y tests</h1>
      <div className="pestanas" role="tablist" style={{ gridTemplateColumns: `repeat(${conUnidades.length}, 1fr)` }}>
        {conUnidades.map((x) => {
          const f = study.fronts.find((ff) => ff.id === x.front);
          const ok = x.units!.filter((u) => study.units[x.id]?.[u.n]?.approvedOn).length;
          return <button key={x.id} role="tab" aria-selected={x.id === a?.id} onClick={() => setTab(x.id)}>{f?.name ?? x.title} · {ok}/{x.units!.length}</button>;
        })}
      </div>
      {a && (
        <>
          <ol className="unid">
            {a.units!.map((u) => {
              const st = unitStatus(a, study, u.n, day.date);
              return (
                <li key={u.n}>
                  <span className="mono">{String(u.n).padStart(2, '0')}</span>
                  <a href={`#/test/${a.id}/${u.n}`}>
                    <b>{u.title}</b>
                    <small>Test: {u.test.desc}</small>
                  </a>
                  <span className={`estado ${st.tone}`}>{st.label}</span>
                </li>
              );
            })}
          </ol>
          {a.final && (
            <div className="cierre-bim">
              <span className="etiqueta">Cierre del bimestre</span>
              <b>{a.final.title}</b>
              <span className="sub">{a.final.desc}</span>
            </div>
          )}
        </>
      )}
    </main>
  );
}
