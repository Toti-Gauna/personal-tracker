import { useState } from 'react';
import { BIMS, ROADMAP, bimOf, bimProgress, progressMap } from '../data/ruta';
import { weightedProgress } from '../data/roadmap-charts';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { pct } from '../ui/charts/core';
import '../styles/ruta.css';

type Tab = 1 | 2 | 3 | 'opc';
const cortoMath = (s: string) => s.replace(/^CONAMAT /, '').replace(/ (\d+)[–-](\d+)/g, '').replace(/ \d+–\d+/g, '');
const cortoProg = (s: string) => s.split(', ').slice(0, 2).join(' y ');

/** 7.4 El mapa: los 18 bimestres en orden, cada año con su perfil y su avance. */
export function RutaMapa({ day }: { day: DayLog }) {
  const ruta = useStore((s) => s.ruta);
  const actual = bimOf(day.date);
  const [tab, setTab] = useState<Tab>(actual.year as Tab);
  const p = progressMap(ruta.log);
  const anio = tab === 'opc' ? null : ROADMAP.route.years[tab - 1];
  const bims = anio ? BIMS.filter((b) => b.year === anio.year) : [];
  const avanceAnio = anio ? weightedProgress(bims.flatMap((b) => b.items).map((i) => ({ hours: i.hours, done: p[i.id] ?? 0 }))) : 0;

  return (
    <main className="pantalla r-pant">
      <div className="topbar"><a className="volver" href="#/metas/ruta">Ruta</a></div>
      <h1 className="titulo">El mapa</h1>
      <p className="sub">Los 18 bimestres en orden, con su producto, su matemática, su programación y su certificación. Cada año termina en un perfil.</p>

      <div className="segmentado" role="tablist" aria-label="Año">
        {([1, 2, 3, 'opc'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} aria-checked={tab === t} onClick={() => setTab(t)}>{t === 'opc' ? '4 y 5' : `Año ${t}`}</button>
        ))}
      </div>

      {anio ? (
        <>
          <ul className="mapa-lista">
            {bims.map((b) => {
              const av = bimProgress(b, p);
              const es = b.n === actual.n;
              return (
                <li key={b.n} className={es ? 'actual' : ''}>
                  <span className="mono">B{b.n}</span>
                  <a href={`#/metas/bim/${b.n}`} className="mapa-item">
                    <div className="mapa-cab"><b className={es ? 'resaltado' : ''} style={{ ['--c' as string]: 'var(--ing)' }}>{b.product.name}</b><span className="sub">{b.product.industry[0].toUpperCase() + b.product.industry.slice(1)}</span></div>
                    <div className="mapa-linea">
                      <i style={{ background: 'var(--ing)' }} />{cortoMath(b.summary.math)} · <i style={{ background: 'var(--salud)' }} />{cortoProg(b.summary.prog)}
                      {b.cert && <span className="rojo"> · {b.cert.name}</span>}
                    </div>
                    {(es || av > 0) && <div className="mapa-barra" role="img" aria-label={`Avance: ${pct(av)}`}><i style={{ width: `${Math.max(2, av * 100)}%` }} /></div>}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="perfil-anio">
            <span className="etiqueta">Al cerrar el año {anio.year}</span>
            <b>{anio.profile}</b>
            <div className="mapa-barra" role="img" aria-label={`Avance del año ${anio.year}: ${pct(avanceAnio, 1)}`}><i style={{ width: `${Math.max(1, avanceAnio * 100)}%` }} /></div>
            <span className="sub">{pct(avanceAnio, 1)} del año · B{bims[0].n} a B{bims[bims.length - 1].n}</span>
          </div>
        </>
      ) : (
        <ul className="mapa-lista">
          {ROADMAP.optional.map((o) => (
            <li key={o.id}>
              <span className="mono">A{o.year}</span>
              <div>
                <div className="mapa-cab"><b>Año {o.year}</b><span className="sub">opcional</span></div>
                <div className="mapa-linea">{o.title}</div>
                <div className="mapa-linea mono">{o.items.join(' · ')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
