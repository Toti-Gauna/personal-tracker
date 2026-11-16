/**
 * Ola 16c · el roadmap de matemática único (absorbe la ola 15): los tramos diarios y las
 * ventanas del Plan T+18 extendido, de T+0 a aeroespacial, con su perfil. El refuerzo se abre
 * según el tipo de error y M0 a M10 queda como material extra.
 */
import { PLAN, T0_PLAN } from '../data/plan';
import { PLAN_EXT, ROL_REFUERZO } from '../data/plan-extendido';
import { PUERTA, TEXTO_LUZ, estadoEn, perfilMate, refuerzoPara, rutaMate, type ItemMate } from '../data/plan-vistas';
import { puertaAprobada } from '../data/puertas';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';

const ETAPA = ['', 'Etapa 1 · núcleo', 'Etapa 2 · ciberseguridad', 'Etapa 3 · quant', 'Etapa 4 · aeroespacial'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;
const pct = (n: number) => `${Math.round(n * 100)} %`;

function useMate(day: DayLog) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  useStore((s) => s.plan.extrasApagados);
  const items = rutaMate(t0);
  return { items, plan, perfil: perfilMate(items, day.date, plan) };
}

/** Card para Estudio. */
export function CardMate({ day }: { day: DayLog }) {
  const { items, perfil } = useMate(day);
  const hechos = items.filter((x) => estadoEn(x, day.date) === 'hecho').length;
  return (
    <a className="re-card" href="#/estudio/mate" style={{ ['--c' as string]: 'var(--economia)' }}>
      <span className="re-card-cab"><b>Matemática</b><span className="mono sub">{hechos} de {items.length} tramos</span></span>
      <span className="re-tira" aria-hidden="true">{items.map((x) => <i key={x.id} className={estadoEn(x, day.date) === 'hecho' ? 'cerrada' : estadoEn(x, day.date) === 'actual' ? 'actual' : ''} />)}</span>
      {perfil.actual && (
        <span className="re-card-ahora"><small className="etiqueta">Estás acá</small><span><span className="mono">{perfil.actual.id}</span> · {perfil.actual.principal.join(' y ')}</span></span>
      )}
      <span className="re-card-perfil">
        <span className="sub">{perfil.sos ? <>Hoy sos <b>{perfil.sos}</b></> : 'Recién empezás'}</span>
        {perfil.vasASer && <span className="sub">→ vas a ser <b className="resaltado">{perfil.vasASer}</b></span>}
      </span>
      <span className="mono sub re-card-pie">El roadmap del plan: de CONAMAT a aeroespacial, con las ventanas antes de cada proyecto</span>
    </a>
  );
}

/** #/estudio/mate y #/estudio/mate/:id */
export function MatePlan({ day, param }: { day: DayLog; param: string }) {
  const id = param.split('/')[1];
  const { items, plan, perfil } = useMate(day);
  const it = id ? items.find((x) => x.id === id) : undefined;
  if (it) return <TramoMate it={it} items={items} day={day} />;
  const porEtapa = [1, 2, 3, 4].map((e) => items.filter((x) => x.etapa === e)).filter((x) => x.length);
  return (
    <main className="pantalla re" style={{ ['--c' as string]: 'var(--economia)' }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a><span className="mono sub">{items.length} tramos</span></div>
      <div className="kicker">Roadmap · Plan T+18 extendido</div>
      <header><h1 className="titulo">Matemática</h1><p>{PLAN_EXT.matematica.principio}</p></header>

      <section className="re-aca" aria-labelledby="mp-aca">
        <span className="etiqueta" id="mp-aca">Estás acá</span>
        <div className="re-perfiles">
          <span><small className="sub">Hoy sos</small><b>{perfil.sos ?? 'Recién empezás'}</b></span>
          {perfil.vasASer && <><span className="re-flecha" aria-hidden="true">→</span><span><small className="sub">Vas a ser</small><b className="resaltado">{perfil.vasASer}</b></span></>}
        </div>
        {perfil.actual && (
          <a className="re-aca-fase" href={`#/estudio/mate/${perfil.actual.id}`}>
            <span className="mono">{perfil.actual.id} · {f(perfil.actual.inicio)} a {f(perfil.actual.fin)}</span>
            <b>{perfil.actual.tipo === 'ventana' ? perfil.actual.nombre : perfil.actual.nombre}</b>
            <span className="sub">Manda: {perfil.actual.principal.join(' → ')}</span>
          </a>
        )}
        <p className="mono sub re-quedan">Regla: {pct(PUERTA.verde)} o más aprueba · {pct(PUERTA.amarillo)} a 84 % refuerzo y retest · menos vuelve al tema</p>
      </section>

      <span className="etiqueta">La escalera · las ventanas van siempre antes del proyecto que las pide</span>
      <ol className="re-tl">
        {porEtapa.flatMap((xs) => xs.map((x, i) => {
          const est = estadoEn(x, day.date);
          const gate = PLAN.programacion.puertas[x.id];
          const ok = gate ? puertaAprobada(plan, x.id) : null;
          return (
            <li key={x.id} className={est === 'hecho' ? 'cerrada' : est}>
              {i === 0 && <div className="re-anio"><b>{ETAPA[x.etapa]}</b></div>}
              <a href={`#/estudio/mate/${x.id}`} aria-current={est === 'actual' ? 'step' : undefined}>
                <span className="re-nodo" aria-hidden="true">{est === 'hecho' ? '✓' : ''}</span>
                <span className="re-tl-cuerpo">
                  <span className="mono re-tl-et">{x.id} · {f(x.inicio)} a {f(x.fin)} · {x.semanas} sem{est === 'actual' ? ' · estás acá' : ''}{gate ? ` · puerta de ${gate}${ok ? ' aprobada' : ''}` : ''}</span>
                  <b>{x.tipo === 'ventana' ? x.nombre : x.principal.join(' y ')}</b>
                  <span className="re-tl-perfil"><span className={est === 'actual' ? 'resaltado' : ''}>{x.perfil}</span></span>
                  <span className="sub re-tl-libros">Habilita: {x.habilita.join(', ')}</span>
                </span>
                <span className="re-tl-ir" aria-hidden="true">→</span>
              </a>
            </li>
          );
        }))}
      </ol>

      <a className="fila-link" href="#/estudio/ruta/matematica">Material de refuerzo: M0 a M10 por fases <span aria-hidden="true">→</span></a>
    </main>
  );
}

const MOTIVOS: [string, string][] = [['concepto', 'Fallás por concepto'], ['tecnica', 'Fallás por técnica'], ['enunciado', 'No entendés el enunciado'], ['profundidad', 'Querés más profundidad']];

function TramoMate({ it, items, day }: { it: ItemMate; items: ItemMate[]; day: DayLog }) {
  const plan = useStore((s) => s.plan);
  const i = items.indexOf(it);
  const est = estadoEn(it, day.date);
  const gate = PLAN.programacion.puertas[it.id];
  const examen = plan.proyectos[it.id]?.examen;
  return (
    <main className="pantalla re re-fase" style={{ ['--c' as string]: 'var(--economia)' }}>
      <div className="topbar"><a className="volver" href="#/estudio/mate">Matemática</a><span className="mono sub">{it.id} · {it.semanas} sem</span></div>
      <div className="kicker">{est === 'actual' ? 'Estás acá' : est === 'hecho' ? 'Pasó' : 'Todavía no'} · {f(it.inicio)} a {f(it.fin)}</div>
      <header><h1 className="titulo">{it.tipo === 'ventana' ? it.nombre : it.principal.join(' y ')}</h1><p>{it.tipo === 'ventana' ? 'Semanas de matemática intensiva: los bloques de programación pasan a matemática.' : 'Matemática diaria, 2 h a las 04:30, en libro y papel.'}</p></header>
      <p className="re-al-cerrar">Al terminarlo sos <b className="resaltado">{it.perfil}</b></p>

      <section className="re-sec">
        <span className="etiqueta">Qué libro manda</span>
        <ul className="re-mats re-nucleo">{it.principal.map((t) => <li key={t} className="re-mat"><b>{t}</b></li>)}</ul>
        <p className="sub">Habilita: {it.habilita.join(', ')}</p>
      </section>

      {gate && (
        <section className="re-sec">
          <span className="etiqueta">Puerta de {gate}</span>
          <p>{examen ? `Test cargado: ${examen.puntaje} % el ${f(examen.fecha)}. ${TEXTO_LUZ[examen.puntaje >= 85 ? 'verde' : examen.puntaje >= 65 ? 'amarillo' : 'rojo']}` : `Sin aprobar con 85 % o más, ${gate} no arranca: la programación sigue siendo matemática y se descuenta del colchón.`}</p>
          <a className="btn-borde re-btn" href={`#/metas/proyecto/${it.id}`}>{examen ? 'Ver la puerta' : 'Cargar el test de la puerta'}</a>
        </section>
      )}

      <section className="re-sec">
        <span className="etiqueta">Si un test sale mal</span>
        <ul className="re-semaforo">
          <li className="verde"><i /><span><b>85 % o más</b> {TEXTO_LUZ.verde}</span></li>
          <li className="amarillo"><i /><span><b>65 a 84 %</b> {TEXTO_LUZ.amarillo}</span></li>
          <li className="rojo"><i /><span><b>Menos de 65 %</b> {TEXTO_LUZ.rojo}</span></li>
        </ul>
        <ul className="re-activar">
          {MOTIVOS.map(([k, t]) => {
            const rs = refuerzoPara(it, k);
            return <li key={k}><b>{t}</b><span className="sub">{rs.length ? rs.map((r) => r.titulo).join(' · ') : 'Retest con más cuidado; no hace falta otro libro.'}</span></li>;
          })}
        </ul>
      </section>

      <section className="re-sec">
        <span className="etiqueta">Refuerzo · se abre por tema y tipo de error, nunca en lugar del libro</span>
        <ul className="re-mats">{it.refuerzo.map((r) => <li key={r.titulo} className="re-mat"><b>{r.titulo}</b><small className="re-cuando">{ROL_REFUERZO[r.rol]}</small></li>)}</ul>
        {it.fase && <a className="fila-link" href={`#/estudio/ruta/matematica/${it.fase}`}>Más material en {it.fase} (M0 a M10) <span aria-hidden="true">→</span></a>}
      </section>

      <nav className="re-nav" aria-label="Otros tramos">
        {items[i - 1] ? <a href={`#/estudio/mate/${items[i - 1].id}`}>← {items[i - 1].id}</a> : <span />}
        {items[i + 1] ? <a href={`#/estudio/mate/${items[i + 1].id}`}>{items[i + 1].id} →</a> : <span />}
      </nav>
    </main>
  );
}
