/**
 * v12.1 · #/metas/ventana/<W1>: una ventana de matemática. Los hitos con su rango de días, el tema y los capítulos del libro de
 * Conamat que cubren; se tildan uno por uno y la ventana no se puede cerrar con hitos sin tildar.
 */
import { claveHito } from '../data/periodos-plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { marcarHito } from '../state/plan';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { fp, hrefPeriodo } from '../ui/PeriodoTarjeta';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/periodos.css';

const LIBRO: Record<string, string> = { conamat: 'Conamat · Aritmética', 'conamat-algebra': 'Conamat · Álgebra' };

/** ¿Se puede cerrar la ventana? Solo con todos los hitos tildados. */
export const puedeCerrarVentana = (id: string, hitos: Record<string, { hecho?: string }>) => {
  const b = PLAN_EXT.bloques.find((x) => x.id === id);
  return !!b?.hitos?.length && b.hitos.every((_, i) => !!hitos[claveHito.mate(id, i)]?.hecho);
};

export function VentanaPagina({ day, id }: { day: DayLog; id: string }) {
  const hoy = day.date;
  const hitos = useStore((s) => s.plan.hitos);
  const b = PLAN_EXT.bloques.find((x) => x.id === id);
  if (!b?.hitos?.length) return <main className="pantalla et-pag"><div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a></div><p className="sub">Esa ventana no tiene hitos.</p></main>;
  const hechos = b.hitos.filter((_, i) => hitos[claveHito.mate(id, i)]?.hecho).length;
  const cerrada = hitos[claveHito.bloque(id)]?.hecho;
  const puede = puedeCerrarVentana(id, hitos);
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.matematica }}>
      <div className="topbar"><a className="volver" href={hrefPeriodo(id)}>{b.nombre}</a><span className="mono sub">{hechos} de {b.hitos.length} hitos</span></div>
      <header><h1 className="titulo">{b.nombre}</h1><p>{b.fechas ? `${fp(b.fechas.inicio)} – ${fp(b.fechas.fin)} · ` : ''}{b.mate?.principal.join(' y ')}</p></header>
      <ul className="vm-hitos">
        {b.hitos.map((h, i) => {
          const k = claveHito.mate(id, i);
          const ok = !!hitos[k]?.hecho;
          return (
            <li key={k}>
              <Casilla checked={ok} label={`Hito ${i + 1}: ${h.hito}`} onChange={() => marcarHito(k, ok ? null : hoy)} />
              <div>
                <span className="mono sub">Días {h.dias[0]}–{h.dias[1]} · {fp(h.inicio)} – {fp(h.fin)}{h.hitoAConfirmar ? ' · a confirmar' : ''}</span>
                <b className={ok ? 'resaltado' : ''}>{h.tema}</b>
                <span>{h.hito}</span>
                {h.capitulos && <span className="sub">{LIBRO[h.capitulos.actividad] ?? h.capitulos.actividad}, capítulos {h.capitulos.desde} a {h.capitulos.hasta}{h.capitulosAConfirmar ? ' (a confirmar)' : ''}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      {b.mate?.salida?.length ? <><span className="etiqueta">Al cerrar la ventana</span><ul className="cp-lista">{b.mate.salida.map((s) => <li key={s}>{s}</li>)}</ul></> : null}
      {cerrada
        ? <p>Ventana cerrada el <b>{fp(cerrada)}</b>. <button className="subrayado" onClick={() => marcarHito(claveHito.bloque(id), null)}>Reabrir</button></p>
        : <button className="btn-borde" disabled={!puede} onClick={() => puede && marcarHito(claveHito.bloque(id), hoy)}>{puede ? 'Cerrar la ventana' : `Cerrar la ventana (faltan ${b.hitos.length - hechos} hitos)`}</button>}
    </main>
  );
}
