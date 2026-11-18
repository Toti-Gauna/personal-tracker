import { EVIDENCIAS, evidenciaCompleta } from '../data/plan-state';
import { bloqueExtPorId } from '../data/plan-extendido';
import { RAMA_COLOR } from '../data/ramas';
import { setExtraBloque, setVersionCert, tildarSalida, toggleArquitectura, toggleEvidencia, type TipoExtra } from '../state/plan';
import { alertaVersion, avanceSalida, calendarioCompleto, salidaDe } from '../data/plan-vistas';
import { useStore } from '../state/store';
import { Casilla } from './Casilla';
import { Plegable } from './Plegable';

/** Ficha del plan extendido (ola 16c): lo que hace distinto a un proyecto, una certificación o una ventana. */
export function FichaBloque({ id }: { id: string }) {
  const b = bloqueExtPorId(id);
  if (!b) return null;
  const f = b.ficha;
  const filas: [string, string | undefined][] = f ? [
    ['Rubro', f.rubro], ['Feature diferencial', f.feature], ['Tecnología nueva', f.tecnologiaNueva], ['Visual', f.visual],
    ['Pieza matemática hecha a mano', f.pieza], ['Plataforma extra', f.plataforma], ['Arquitectura', f.arquitectura], ['Referencia externa', f.referencia], ['Quién lo valida', f.validador], ['Se recorta primero si te pasás de horas', b.recortarPrimero?.join(' y ')], ['Perfil al cerrar', f.perfil],
  ] : [];
  return (
    <>
      {f && (
        <section className="pp-ficha">
          <div className="etiqueta pp-sec">Ficha</div>
          <dl>{filas.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {b.alternativa && <p className="sub">Reemplazo propuesto, a confirmar: <b>{b.alternativa}</b>.</p>}
          {b.recortable && <p className="sub">Recortable: si falta tiempo, se recorta este proyecto.</p>}
        </section>
      )}
      {b.cert && (
        <section className="pp-ficha">
          <div className="etiqueta pp-sec">Certificación</div>
          <dl>
            <div><dt>Costo</dt><dd>{b.cert.costo ?? 'Sin verificar'}{b.cert.costo && !b.cert.verificado ? ' · sin verificar' : b.cert.verificado ? ' · verificado el 15 nov 2026' : ''}</dd></div>
            {b.cert.requiere && <div><dt>Requiere</dt><dd>{b.cert.requiere}</dd></div>}
            {b.cert.notas && <div><dt>Notas</dt><dd>{b.cert.notas}</dd></div>}
          </dl>
          <p className="sub">Los precios y versiones cambian: reconfirmá al reservar el examen.</p>
        </section>
      )}
      {b.mate && (
        <section className="pp-ficha">
          <div className="etiqueta pp-sec">Matemática</div>
          <dl>
            <div><dt>Libro principal</dt><dd>{b.mate.principal.join(' · ')}</dd></div>
            <div><dt>Habilita</dt><dd>{b.mate.habilita.join(', ')}</dd></div>
            <div><dt>Perfil</dt><dd>{b.mate.perfil}</dd></div>
          </dl>
          <a className="fila-link" href={`#/estudio/mate/${b.id}`}>Refuerzo según el tipo de error <span aria-hidden="true">→</span></a>
        </section>
      )}
    </>
  );
}

/** Puerta de evidencia: sin las tres, el proyecto no cierra. */
export function EvidenciaProyecto({ id }: { id: string }) {
  const p = useStore((s) => s.plan.proyectos[id]);
  const n = EVIDENCIAS.filter(([k]) => p?.evidencia?.[k]).length;
  return (
    <section>
      <div className="fila-t pp-sec"><span className="etiqueta">Puerta de evidencia</span><span className="mono sub">{n} de 3{evidenciaCompleta(p) ? ' · lista' : ''}</span></div>
      <ul className="pp-capas">
        {EVIDENCIAS.map(([k, nombre, texto]) => (
          <li key={k}>
            <Casilla checked={!!p?.evidencia?.[k]} label={`${nombre}: marcar`} onChange={() => toggleEvidencia(id, k)} />
            <div>
              <b className={p?.evidencia?.[k] ? 'resaltado' : ''} style={{ ['--c' as string]: RAMA_COLOR.programacion }}>{nombre}</b>
              <p className="sub">{texto}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="sub">Sin estas tres, además de tests y seguridad, el proyecto no cierra.</p>
    </section>
  );
}

/**
 * Ola 20 · nivel de salida de una ventana: lo que tenés que poder hacer al cerrarla, como lista que se
 * tilda. Es el chequeo antes del test de la puerta; el test (85 %) sigue siendo el que aprueba.
 */
export function NivelSalida({ id }: { id: string }) {
  const plan = useStore((s) => s.plan);
  const crit = salidaDe(id);
  if (!crit.length) return null;
  const av = avanceSalida(plan, id);
  const hechos = new Set(plan.salida?.[id] ?? []);
  const examen = plan.proyectos[id]?.examen;
  return (
    <section className="salida" aria-label={`Nivel de salida de ${id}`}>
      <div className="fila-t pp-sec"><span className="etiqueta">Nivel de salida · {id}</span><span className="mono sub">{av.hechos} de {av.total}</span></div>
      <ul className="pp-capas">
        {crit.map((c, i) => (
          <li key={i}>
            <Casilla checked={hechos.has(i)} label={c} onChange={() => tildarSalida(id, i)} />
            <div><b className={hechos.has(i) ? 'resaltado' : ''} style={{ ['--c' as string]: 'var(--economia)' }}>{c}</b></div>
          </li>
        ))}
      </ul>
      <p className="sub">
        {av.completo ? 'Nivel de salida completo: listo para el test de la puerta.'
          : examen && examen.puntaje >= 85 ? `Puerta aprobada por el test (${examen.puntaje} %), pero te ${av.total - av.hechos === 1 ? 'falta 1 criterio' : `faltan ${av.total - av.hechos} criterios`} de salida: repasalos antes del proyecto.`
          : 'Tildá cada criterio cuando lo puedas hacer sin ayuda; con todos, hacé el test de la puerta (85 %).'}
      </p>
    </section>
  );
}

// ——— Ola 24 · plan T+18 v2 ———

const ARQ: [('contrato' | 'trazas' | 'mtls' | 'adr'), string, string][] = [
  ['contrato', 'Contrato probado', 'OpenAPI o eventos con pruebas de contrato (Pact) en CI.'],
  ['trazas', 'Trazas distribuidas', 'OpenTelemetry de punta a punta entre servicios.'],
  ['mtls', 'mTLS entre servicios', 'Identidad de cada servicio y tráfico cifrado adentro.'],
  ['adr', 'ADR de la división', 'Por qué se divide (escala, equipos o aislamiento) y por qué no un monolito modular.'],
];

/** Checklist de arquitectura (P1, P5, P10, S1 y Q5): contrato probado, trazas, mTLS y ADR. */
export function ArquitecturaProyecto({ id }: { id: string }) {
  const hechos = useStore((s) => s.plan.arquitectura?.[id]) ?? {};
  const b = bloqueExtPorId(id);
  return (
    <section>
      <p className="sub">{b?.ficha?.arquitectura}. Microservicios con criterio: se divide cuando hay una razón; todo servicio lleva contrato probado, trazas y mTLS.</p>
      <ul className="pp-capas">
        {ARQ.map(([k, nombre, texto]) => (
          <li key={k}>
            <Casilla checked={!!hechos[k]} label={`${nombre}: marcar`} onChange={() => toggleArquitectura(id, k)} />
            <div><b className={hechos[k] ? 'resaltado' : ''} style={{ ['--c' as string]: RAMA_COLOR.programacion }}>{nombre}</b><p className="sub">{texto}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const avanceArquitectura = (h: Partial<Record<string, boolean>> | undefined) => ARQ.filter(([k]) => h?.[k]).length;

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fm = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/** Las tres semanas extra de un proyecto (feature, plataforma y arquitectura), cada una con su switch. */
export function ExtrasProyecto({ id, t0 }: { id: string; t0: string }) {
  useStore((s) => s.plan.extrasApagados);
  useStore((s) => s.plan.pausaFinDeAnio);
  const b = calendarioCompleto(t0).find((x) => x.id === id);
  if (!b || b.tipo !== 'proyecto') return null;
  const filas: [TipoExtra, string, number, number, string | undefined][] = [
    ['feature', 'Feature diferencial', b.extra, b.extraAplicado, b.ficha?.feature],
    ['plataforma', 'Plataforma extra', b.extraPlataforma, b.plataformaAplicada, b.ficha?.plataforma],
    ['arquitectura', 'Arquitectura', b.extraArquitectura, b.arquitecturaAplicada, b.ficha?.arquitectura],
  ];
  const posibles = filas.filter(([, , p]) => p > 0);
  if (!posibles.length) return <p className="sub">Sin semanas extra: {b.base} semanas{b.pausasDentro.length ? ' más la pausa de fin de año' : ''}.</p>;
  return (
    <section>
      <ul className="aj-extras pp-extras">
        {posibles.map(([tipo, nombre, posible, aplicada, que]) => (
          <li key={tipo}>
            <span><b>{nombre}</b><small className="sub"> · +{posible} sem{que ? ` · ${que}` : ''}</small></span>
            <button role="switch" className="switch" aria-checked={aplicada > 0} aria-label={`${nombre} de ${id}`} onClick={() => setExtraBloque(id, !(aplicada > 0), tipo)} />
          </li>
        ))}
      </ul>
      <p className="sub mono">{b.base} base{b.extraAplicado ? ` + ${b.extraAplicado} feature` : ''}{b.plataformaAplicada ? ` + ${b.plataformaAplicada} plataforma` : ''}{b.arquitecturaAplicada ? ` + ${b.arquitecturaAplicada} arquitectura` : ''} = {b.semanas} semanas{b.pausasDentro.length ? ' (más la pausa de fin de año, que lo parte)' : ''} · cierra el {fm(b.fin)}</p>
      <p className="sub">Si falta tiempo se recorta alcance y la feature primero; nunca tests, seguridad, revisiones, repasos, sueño ni entrenamiento.</p>
    </section>
  );
}

/** Versión del examen de una certificación (Security+): elegirla y ver si se retira antes del examen. */
export function VersionExamen({ id, date, t0 }: { id: string; date: string; t0: string }) {
  const plan = useStore((s) => s.plan);
  const b = calendarioCompleto(t0).find((x) => x.id === id);
  const vs = b?.cert?.versiones;
  if (!b || !vs?.length) return null;
  const alerta = alertaVersion(b, plan, date);
  const elegida = plan.versionCert?.[id] ?? '';
  return (
    <section className="pp-ficha">
      <div className="etiqueta pp-sec">Versión del examen</div>
      <ul className="pp-versiones">
        {vs.map((v) => <li key={v.id} className={v.retiro && v.retiro < b.fin ? 'retirada' : ''}><b>{v.nombre}</b><span className="mono sub">{v.retiro ? `se retira el ${fm(v.retiro)}` : v.sale ? `sale cerca del ${fm(v.sale)}` : ''}</span></li>)}
      </ul>
      <label className="pp-version">Elegida
        <select className="campo-texto" value={elegida} onChange={(e) => setVersionCert(id, e.target.value)}>
          <option value="">Sin elegir</option>
          {vs.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </label>
      {alerta ? <p className="pp-alerta-version" role="status"><b>{alerta.titulo}</b> {alerta.texto}</p> : elegida ? <p className="sub">La {vs.find((v) => v.id === elegida)?.nombre} llega a tu examen ({fm(b.fin)}).</p> : null}
    </section>
  );
}

// ——— Ola 26 · tecnologías de un proyecto (v2.1) ———

const MARCA_TXT = { nueva: 'nueva', reusada: 'reusada', movida: 'movida' } as const;
const fh = (d: string) => `${Number(d.slice(8))}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Las tecnologías de un proyecto con su marca (nueva, reusada o movida), lo que se recorta primero y su historial. */
export function TecnologiasProyecto({ id }: { id: string }) {
  const b = bloqueExtPorId(id);
  const tec = b?.tecnologias ?? [];
  if (!b || !tec.length) return <p className="sub">Este bloque no suma tecnología nueva.</p>;
  const marcadas = tec.filter((t) => t.marca);
  const trabajo = tec.filter((t) => !t.marca);
  return (
    <>
      {marcadas.length > 0 && (
        <ul className="tec-lista">
          {marcadas.map((t) => (
            <li key={t.nombre} className={`tec-${t.marca}`}>
              <span className="etiqueta tec-marca">{MARCA_TXT[t.marca!]}{t.desde ? ` · de ${t.desde}` : ''}</span>
              <b>{t.nombre}</b>
              {t.nota && <small className="sub">{t.nota}</small>}
            </li>
          ))}
        </ul>
      )}
      {marcadas.length > 0 && <p className="sub">Una tecnología nueva por proyecto como máximo, y ninguna en bloques con certificación.</p>}
      <section className="re-sec">
        <span className="etiqueta">Parte del trabajo</span>
        <div className="pp-chips">{trabajo.map((t) => <span key={t.nombre} className={`mono${t.opcional ? ' opcional' : ''}`}>{t.nombre}{t.opcional ? ' · opcional' : ''}</span>)}</div>
      </section>
      {b.recortarPrimero?.length ? <p className="sub">Si {id} se pasa de horas, se recorta primero: <b>{b.recortarPrimero.join(' y ')}</b>.</p> : null}
      {b.historial?.length ? (
        <Plegable id={`tec:${id}:historial`} titulo="Historial de cambios" resumen={`${b.historial.length} ${b.historial.length === 1 ? 'cambio' : 'cambios'}`}>
          <ol className="tec-hist">{b.historial.map((h, i) => <li key={i}><span className="mono sub">{fh(h.fecha)}</span><span>{h.cambio}<small className="sub"> · {h.motivo}</small></span></li>)}</ol>
        </Plegable>
      ) : null}
    </>
  );
}
