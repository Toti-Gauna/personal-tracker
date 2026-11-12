import { useState } from 'react';
import { bimester, mejoraAcumulada, racha } from '../data/derive';
import { GROUP_LABEL, GROUP_ORDER, SEALS, SEAL_XP, history, hitos, levelOf, totalXp, type SealDef } from '../data/profile';
import { fmtPct } from '../data/mejora';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { claimSeal, unclaimSeal } from '../state/profile';
import { Sello } from '../ui/Sello';
import '../styles/perfil.css';

const n3 = (n: number) => n.toLocaleString('es-AR');
const WORDS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const word = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/** 6.3 Perfil y logros: nivel, hitos, 24 sellos en 4 grupos e historial. */
export function Perfil({ day }: { day: DayLog }) {
  const s = useStore((x) => x);
  const settings = s.settings!;
  const xp = totalXp(s);
  const lv = levelOf(xp);
  const rach = racha(s.days, day.date);
  const ganados = Object.keys(s.profile.seals).length;
  const acum = mejoraAcumulada(s.days, day.date);
  const [detalle, setDetalle] = useState<SealDef | null>(null);
  const hs = hitos(s, day.date);
  const hist = history(s, settings.startDate);
  const bim = bimester(settings.startDate, day.date, s.goals.bimesterNames);

  return (
    <main className="pantalla perfil">
      <header className="perfil-cab">
        <div>
          <h1 className="titulo">Perfil</h1>
          <p>{settings.names.me}, nivel {lv.level} con {n3(xp)} XP. {rach > 0 ? `${rach === 1 ? 'Un día seguido' : `${word(rach)[0].toUpperCase()}${word(rach).slice(1)} días seguidos`}` : 'Sin racha todavía'} y {word(ganados)} {ganados === 1 ? 'sello ganado' : 'sellos ganados'}.</p>
        </div>
        <a className="btn-engranaje" href="#/ajustes" aria-label="Ajustes">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></svg>
        </a>
      </header>

      <div className="xp-segs" role="img" aria-label={`${lv.into} de ${lv.cost} XP del nivel ${lv.level}`}>
        {Array.from({ length: 20 }, (_, i) => <span key={i} className={i < Math.floor((lv.into / lv.cost) * 20) ? 'on' : ''} />)}
      </div>
      <p className="sub xp-txt">{n3(lv.toNext)} XP para el nivel {lv.level + 1}</p>

      <div className="cuatro-stats">
        <div><b className="mono">{Object.keys(s.days).length}</b><span>días</span></div>
        <div><b className="mono">{rach}</b><span>racha</span></div>
        <div><b className="mono">{s.study.cards.length}</b><span>tarjetas</span></div>
        <div><b className="mono">+{fmtPct(acum, 1)}%</b><span>mejora</span></div>
      </div>

      <div className="fila-t hitos-t"><span className="etiqueta">Próximos hitos</span><span className="mono sub">los más cerca primero</span></div>
      {hs.length === 0 ? (
        <p className="sub">Los hitos aparecen cuando empezás a acercarte a un sello: una racha, un peso, tus primeros capítulos.</p>
      ) : (
        <ul className="hitos">
          {hs.map(({ def, p }) => (
            <li key={def.id}>
              <div className="hito-cab"><b>{def.name === 'Pesar 90' ? 'Pesar 90 kg' : def.name}</b><span className="mono">{String(Math.round(p.value * 10) / 10).replace('.', ',')}{def.id.startsWith('pesar') ? '' : `/${p.target}`}</span></div>
              <div className="hito-barra"><i style={{ width: `${(p.value / p.target) * 100}%`, background: def.color }} /></div>
              <small className="sub">{p.hint}</small>
            </li>
          ))}
        </ul>
      )}

      {GROUP_ORDER.map((g) => {
        const defs = SEALS.filter((d) => d.group === g);
        const ok = defs.filter((d) => s.profile.seals[d.id]).length;
        return (
          <section key={g} aria-label={GROUP_LABEL[g]}>
            <div className="fila-t grupo-t"><span className="etiqueta">{GROUP_LABEL[g]}</span><span className="mono sub">{ok}/{defs.length}</span></div>
            <ul className="sellos">
              {defs.map((d) => (
                <li key={d.id}>
                  <button onClick={() => setDetalle(d)} aria-label={`${d.name}: ${s.profile.seals[d.id] ? 'ganado' : 'bloqueado'}`}>
                    <Sello mark={d.mark} color={d.color} locked={!s.profile.seals[d.id]} label={d.name} />
                    <span className={s.profile.seals[d.id] ? '' : 'sub'}>{d.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="etiqueta hitos-t">Historial</div>
      <ul className="historial">
        {hist.length === 0 && <li className="sub">Todavía no hay días cerrados.</li>}
        {hist.map((h) => (
          <li key={h.date}><span className="mono sub">{fmtFecha(h.date).split(' ').slice(1).join(' ').toLowerCase()}</span><span>{h.text}</span></li>
        ))}
      </ul>
      <p className="nota">{bim.name}, semana {bim.week} de {bim.weeks}.</p>

      {detalle && (
        <div className="hoja-fondo sello-detalle" onClick={() => setDetalle(null)}>
          <section className="modal-sello" role="dialog" aria-modal="true" aria-labelledby="sello-t" onClick={(e) => e.stopPropagation()}>
            <Sello mark={detalle.mark} color={detalle.color} locked={!s.profile.seals[detalle.id]} label={detalle.name} size={96} />
            <h2 id="sello-t" className="titulo">{detalle.name}</h2>
            <p className="sub">{detalle.how}</p>
            {s.profile.seals[detalle.id] ? <p className="mono">Ganado el {fmtFecha(s.profile.seals[detalle.id]).toLowerCase()} · +{SEAL_XP} XP</p> : detalle.progress && <p className="mono sub">{detalle.progress({ s, date: day.date }).hint}</p>}
            {detalle.manual && (
              s.profile.seals[detalle.id]
                ? <button className="btn-borde" onClick={() => unclaimSeal(detalle.id)}>Quitar el sello</button>
                : <button className="btn-principal" onClick={() => claimSeal(detalle.id, day.date)}>Marcar como logrado</button>
            )}
            <button className="btn-borde" onClick={() => setDetalle(null)}>Cerrar</button>
          </section>
        </div>
      )}
    </main>
  );
}
