/**
 * 7.4 Búsqueda, 7.5 Inglés y 7.6 Handyx: el detalle de cada rama con lo que se registra en ella.
 * Todo arranca vacío y crece con el uso: nada trae números de ejemplo.
 */
import { useState } from 'react';
import { horasDeRama } from '../data/metas-plan';
import {
  PLAN, corteHandyx, diaSemanaCorto, faseIngles, faseTrabajo, fechaCorta, fechaHito, finSemana, hitoSemana, inicioSemana, nombreTramo, semanaDelPlan,
  T0_PLAN, tramoActivo, type EstadoPostulacion,
} from '../data/plan';
import { planSettings, useStore } from '../state/store';
import { RAMA_COLOR } from '../data/ramas';
import { addDays } from '../data/time';
import type { DayLog } from '../data/types';
import {
  ensayarRespuesta, estadoPostulacion, fallaEntrevista, guardarEntrevista, lunesDe, marcarPrep, nuevaPostulacion, sumarFallaIngles, sumarHandyx,
} from '../state/plan';
import { Casilla } from '../ui/Casilla';
import { toast } from '../ui/avisos';

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const miles = (n: number) => n.toLocaleString('es-AR');
const t2De = (t0: string) => inicioSemana(hitoSemana('T+2'), t0);

function Top({ rama, lado }: { rama: string; lado: string }) {
  return (
    <div className="topbar">
      <a className="volver" href="#/metas">Ruta</a>
      <span className="mono" style={{ color: RAMA_COLOR[rama as keyof typeof RAMA_COLOR] }}>{rama} · {lado}</span>
    </div>
  );
}

// ——— 7.4 Búsqueda ———

const ESTADOS: EstadoPostulacion[] = ['enviada', 'respuesta', 'entrevista', 'oferta', 'rechazada'];
const ESTADO_NOMBRE: Record<EstadoPostulacion, string> = { enviada: 'Enviada', respuesta: 'Respuesta', entrevista: 'Entrevista', oferta: 'Oferta', rechazada: 'Rechazada' };
const ESTADO_COLOR: Record<EstadoPostulacion, string> = { enviada: 'var(--sub)', respuesta: 'var(--economia)', entrevista: 'var(--rutina)', oferta: 'var(--salud)', rechazada: 'var(--sub)' };

export function PlanBusqueda({ day }: { day: DayLog }) {
  const date = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const f = faseTrabajo(date, t0);
  const s = Math.max(1, semanaDelPlan(date, t0));
  const t2 = t2De(t0);
  const total = (id: string) => Object.values(plan.contadores).reduce((a, c) => a + (c[id] ?? 0), 0);
  const e = PLAN.trabajo.embudo;
  const respuestas = plan.postulaciones.filter((p) => p.estado !== 'enviada' && p.estado !== 'rechazada').length;
  const ofertas = plan.postulaciones.filter((p) => p.estado === 'oferta').length;
  const embudo: [string, number, number][] = [
    ['Postulaciones', total('postulaciones'), e.postulaciones],
    ['Mensajes', total('mensajes'), e.mensajes],
    ['Respuestas', respuestas, e.postulaciones],
    ['Entrevistas', plan.entrevistas.length, e.entrevistas[1]],
    ['Ofertas', ofertas, e.ofertas[1]],
  ];
  const prox = plan.entrevistas.filter((x) => x.fecha >= date).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const pasadas = plan.entrevistas.filter((x) => x.fecha < date).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const hoyIngles = day.blocks.some((b) => b.key === 'ingles-entrevista');
  const [nueva, setNueva] = useState<'post' | 'ent' | null>(null);

  return (
    <main className="pantalla plan-rama" style={{ ['--c' as string]: RAMA_COLOR.trabajo }}>
      <Top rama="trabajo" lado={f.id === 'busqueda' ? `semana ${Math.min(s, f.hasta)} de ${f.hasta}` : f.nombre.toLowerCase()} />
      <h1 className="titulo">{f.id === 'busqueda' ? 'Búsqueda' : 'Trabajo'}</h1>
      <p className="pp-que">
        {f.id === 'busqueda'
          ? `Meta: remoto de USD 3.000 a 5.000 para el ${fechaCorta(t2)}. 1 h 30 por día${hoyIngles ? '; hoy, 45 min, porque el resto va a inglés' : ''}.`
          : `${f.texto} Búsqueda 2 h por semana; en B5 y B6, postular a AI/ML Engineer.`}
      </p>

      <div className="etiqueta pp-sec">Embudo</div>
      <ul className="pb-embudo">
        {embudo.map(([n, v, meta]) => (
          <li key={n}><span>{n}</span><span className="pb-barra"><i style={{ width: `${Math.min(1, v / Math.max(1, meta)) * 100}%` }} /></span><b className="mono">{miles(v)}</b></li>
        ))}
      </ul>
      <p className="mono sub pb-meta">meta de {e.semanas} semanas: {e.postulaciones} · {e.mensajes} · {e.entrevistas[0]} a {e.entrevistas[1]} entrevistas · {e.ofertas[0]} o {e.ofertas[1]} ofertas</p>

      {prox ? <ProximaEntrevista e={prox} /> : (
        <div className="pr-card pb-ent"><span className="etiqueta">Próxima entrevista</span><p className="sub">Ninguna cargada. Cuando te citen, cargala acá: Trazo arma la preparación y el inglés de esos días.</p></div>
      )}
      {nueva === 'ent' ? <FormEntrevista date={date} onListo={() => setNueva(null)} /> : <button className="btn-borde pb-btn" onClick={() => setNueva('ent')}>+ Entrevista</button>}

      {pasadas.length > 0 && (
        <>
          <div className="etiqueta pp-sec">Entrevistas que pasaron</div>
          <ul className="pb-pasadas">{pasadas.map((x) => <EntrevistaPasada key={x.id} e={x} date={date} />)}</ul>
        </>
      )}

      <div className="fila-t pp-sec"><span className="etiqueta">Postulaciones</span><button className="btn-borde pb-nueva" onClick={() => setNueva(nueva === 'post' ? null : 'post')}>+ Nueva</button></div>
      {nueva === 'post' && <FormPostulacion date={date} onListo={() => setNueva(null)} />}
      <ul className="pb-posts">
        {[...plan.postulaciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p) => (
          <li key={p.id}>
            <div><b>{p.rol}{p.empresa ? ` · ${p.empresa}` : ''}</b><span className="mono sub">{[p.rango, fechaCorta(p.fecha)].filter(Boolean).join(' · ')}</span></div>
            <button className="pb-estado mono" style={{ ['--e' as string]: ESTADO_COLOR[p.estado] }} aria-label={`${p.rol}: ${ESTADO_NOMBRE[p.estado]}. Cambiar estado`}
              onClick={() => estadoPostulacion(p.id, ESTADOS[(ESTADOS.indexOf(p.estado) + 1) % ESTADOS.length])}>{ESTADO_NOMBRE[p.estado]}</button>
          </li>
        ))}
      </ul>
      {!plan.postulaciones.length && <p className="sub">Las postulaciones con detalle van acá; el contador rápido está en Hoy («+1 Postulación»). Tocá el estado para cambiarlo.</p>}
    </main>
  );
}

function ProximaEntrevista({ e }: { e: import('../data/plan').Entrevista }) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const respuestas = useStore((s) => s.plan.respuestas);
  const ens = respuestas.filter((r) => r.veces > 0).length;
  const t = tramoActivo(e.fecha, t0);
  const demo = t.tipo === 'proyecto' ? nombreTramo(t, false) : 'tu último proyecto';
  const items: [string, 'ingles' | 'programacion' | 'trabajo', string, string | null][] = [
    ['respuestas', 'ingles', `${respuestas.length} respuestas ensayadas en voz alta`, `${ens}/${respuestas.length}`],
    ['demo', 'programacion', `Demo de ${demo} en 3 minutos`, null],
    ['empresa', 'trabajo', 'Investigar la empresa y su stack', null],
    ['preguntas', 'trabajo', 'Preguntas para ellos', null],
  ];
  return (
    <div className="pr-card pb-ent">
      <span className="etiqueta" style={{ color: RAMA_COLOR.trabajo }}>Próxima entrevista · {diaSemanaCorto(e.fecha)} {fechaCorta(e.fecha)}{e.hora ? ` · ${e.hora}` : ''}</span>
      <h2 className="titulo">{e.rol}{e.rango ? ` · ${e.rango}` : ''}</h2>
      <p className="sub">{[e.empresa || '[Empresa]', e.modalidad].filter(Boolean).join(' · ')}</p>
      <ul className="pb-prep">
        {items.map(([k, rama, texto, lado]) => {
          const hecho = k === 'respuestas' ? ens >= respuestas.length || !!e.prep[k] : !!e.prep[k];
          return (
            <li key={k}>
              <Casilla checked={hecho} label={`${texto}: marcar`} onChange={() => marcarPrep(e.id, k)} />
              <div><span className="mono" style={{ color: RAMA_COLOR[rama], fontSize: 12 }}>{rama}</span><span>{texto}</span></div>
              <span className="mono sub">{lado ?? (hecho ? 'hecho' : '—')}</span>
            </li>
          );
        })}
      </ul>
      <p className="sub">Después cargás qué preguntaron. Lo que falló va a Puntos débiles de inglés o de programación.</p>
    </div>
  );
}

function EntrevistaPasada({ e, date }: { e: import('../data/plan').Entrevista; date: string }) {
  const [texto, setTexto] = useState('');
  const [rama, setRama] = useState<'ingles' | 'programacion'>('programacion');
  return (
    <li>
      <div className="fila-t"><b>{e.rol}{e.empresa ? ` · ${e.empresa}` : ''}</b><span className="mono sub">{fechaCorta(e.fecha)}</span></div>
      {e.fallas?.map((f, i) => <p key={i} className="sub pb-falla">· {f}</p>)}
      <form className="pp-rev-form" onSubmit={(ev) => { ev.preventDefault(); if (texto.trim()) { fallaEntrevista(e.id, date, texto.trim(), rama, rama === 'ingles' ? 'fluidez' : 'técnica'); setTexto(''); toast({ title: 'Ya es tarjeta', sub: `Puntos débiles de ${rama === 'ingles' ? 'inglés' : 'programación'}`, color: RAMA_COLOR[rama] }, false); } }}>
        <input className="campo-texto" value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Qué preguntaron o qué falló" aria-label={`Qué falló en la entrevista de ${e.rol}`} />
        <div className="segmentado" role="radiogroup" aria-label="Va a">
          <button type="button" role="radio" aria-checked={rama === 'programacion'} onClick={() => setRama('programacion')}>programación</button>
          <button type="button" role="radio" aria-checked={rama === 'ingles'} onClick={() => setRama('ingles')}>inglés</button>
        </div>
        <button className="btn-borde" type="submit" disabled={!texto.trim()}>Agregar</button>
      </form>
    </li>
  );
}

function FormEntrevista({ date, onListo }: { date: string; onListo: () => void }) {
  const [x, setX] = useState({ fecha: addDays(date, 3), hora: '', rol: '', empresa: '', rango: '', modalidad: 'remoto · entrevista técnica en inglés' });
  const set = (k: keyof typeof x) => (e: React.ChangeEvent<HTMLInputElement>) => setX({ ...x, [k]: e.target.value });
  return (
    <form className="pb-form" onSubmit={(e) => { e.preventDefault(); if (!x.rol.trim()) return; guardarEntrevista({ ...x, rol: x.rol.trim(), hora: x.hora || undefined, empresa: x.empresa || undefined, rango: x.rango || undefined }); onListo(); }}>
      <label>Rol<input className="campo-texto" value={x.rol} onChange={set('rol')} placeholder="AI Engineer" autoFocus /></label>
      <div className="dos-campos">
        <label>Fecha<input className="campo-texto" type="date" value={x.fecha} onChange={set('fecha')} /></label>
        <label>Hora<input className="campo-texto" type="time" value={x.hora} onChange={set('hora')} /></label>
      </div>
      <div className="dos-campos">
        <label>Empresa<input className="campo-texto" value={x.empresa} onChange={set('empresa')} /></label>
        <label>Rango<input className="campo-texto" value={x.rango} onChange={set('rango')} placeholder="USD …" /></label>
      </div>
      <label>Modalidad<input className="campo-texto" value={x.modalidad} onChange={set('modalidad')} /></label>
      <div className="dos-botones"><button type="button" className="btn-borde" onClick={onListo}>Cancelar</button><button type="submit" className="btn-principal" disabled={!x.rol.trim()}>Guardar</button></div>
    </form>
  );
}

function FormPostulacion({ date, onListo }: { date: string; onListo: () => void }) {
  const [rol, setRol] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [rango, setRango] = useState('');
  return (
    <form className="pb-form" onSubmit={(e) => { e.preventDefault(); if (!rol.trim()) return; nuevaPostulacion(date, { rol: rol.trim(), empresa: empresa.trim() || undefined, rango: rango.trim() || undefined }); onListo(); }}>
      <label>Rol<input className="campo-texto" value={rol} onChange={(e) => setRol(e.target.value)} placeholder="Backend Python" autoFocus /></label>
      <div className="dos-campos">
        <label>Empresa<input className="campo-texto" value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></label>
        <label>Rango<input className="campo-texto" value={rango} onChange={(e) => setRango(e.target.value)} placeholder="USD …" /></label>
      </div>
      <div className="dos-botones"><button type="button" className="btn-borde" onClick={onListo}>Cancelar</button><button type="submit" className="btn-principal" disabled={!rol.trim()}>Guardar</button></div>
    </form>
  );
}

// ——— 7.5 Inglés ———

const TIPOS_FALLA = ['fluidez', 'gramática', 'pronunciación', 'vocabulario'];

export function PlanIngles({ day }: { day: DayLog }) {
  const date = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const f = faseIngles(date, t0);
  const fases = PLAN.ingles.fases;
  const ent = plan.entrevistas.filter((x) => x.fecha >= date).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const ens = plan.respuestas.filter((r) => r.veces > 0).length;
  const bloque = day.blocks.find((b) => b.key === 'ingles-entrevista' || b.key === 'ingles');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState(TIPOS_FALLA[0]);
  const finPlan = finSemana(PLAN.semanas, t0);
  const mesFin = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(finPlan.slice(5, 7)) - 1];
  const ensayar = () => {
    const r = [...plan.respuestas].sort((a, b) => a.veces - b.veces)[0];
    ensayarRespuesta(date, r?.id);
    if (r) toast({ title: 'Respuesta ensayada', sub: r.texto, color: RAMA_COLOR.ingles }, false);
  };

  return (
    <main className="pantalla plan-rama" style={{ ['--c' as string]: RAMA_COLOR.ingles }}>
      <Top rama="ingles" lado={f.nombre.toLowerCase()} />
      <h1 className="titulo">Inglés</h1>
      <p className="pp-que">Hasta conseguir el trabajo, entrevistas. Después, {PLAN.ingles.minutosDiarios} min por día hacia el C1 Advanced, con el examen en {mesFin} de {finPlan.slice(0, 4)}.</p>

      <div className="pi-fases">
        {fases.map((x, i) => (
          <div key={x.id} className={x.id === f.id ? 'on' : ''}>
            <span className="mono sub">{x.id === f.id ? 'ahora' : i === fases.length - 1 ? `${mesFin.slice(0, 3)} ${finPlan.slice(0, 4)}` : `desde ${fechaCorta(inicioSemana(x.desde, t0))}`}</span>
            <b>{x.nombre}</b>
          </div>
        ))}
      </div>

      <div className="fila-t pp-sec">
        <span className="etiqueta">{ent ? `Respuestas para el ${diaSemanaCorto(ent.fecha)} ${Number(ent.fecha.slice(8))}` : 'Respuestas ensayadas'}</span>
        <span className="mono sub">{ens} de {plan.respuestas.length}</span>
      </div>
      <ul className="pi-resp">
        {plan.respuestas.map((r) => (
          <li key={r.id}>
            <Casilla checked={r.veces > 0} label={`Ensayé: ${r.texto}`} onChange={() => ensayarRespuesta(date, r.id)} />
            <span className={r.veces > 0 ? 'sub' : ''}>{r.texto}</span>
            <span className="mono sub">×{r.veces}</span>
          </li>
        ))}
      </ul>
      {bloque ? (
        <a className="btn-principal pi-btn" href={`#/elegir/${bloque.key}`}>Ensayar en voz alta · {bloque.min} min</a>
      ) : (
        <button className="btn-principal pi-btn" onClick={ensayar}>Ensayar en voz alta</button>
      )}
      <p className="sub">Cada vez que tildás una, suma un ensayo (también desde Hoy: «+1 Respuesta ensayada»).</p>

      <div className="etiqueta pp-sec">Lo que falló · ya es tarjeta</div>
      <ul className="pi-fallas">
        {[...plan.fallasIngles].reverse().map((x, i) => <li key={i}><span>{x.texto}</span><span className="mono" style={{ color: RAMA_COLOR.ingles }}>{x.tipo}</span></li>)}
      </ul>
      <form className="pp-rev-form" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) { sumarFallaIngles(date, texto.trim(), tipo); setTexto(''); } }}>
        <input className="campo-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Qué falló al hablar" aria-label="Qué falló al hablar" />
        <div className="segmentado pi-tipos" role="radiogroup" aria-label="Tipo">
          {TIPOS_FALLA.map((x) => <button key={x} type="button" role="radio" aria-checked={tipo === x} onClick={() => setTipo(x)}>{x}</button>)}
        </div>
        <button className="btn-borde" type="submit" disabled={!texto.trim()}>Agregar</button>
      </form>
      <p className="sub">Entran al mismo motor de repaso que matemática: escalera +1, +3, +7, +21, +60.</p>

      {fases[1] && (
        <div className="pr-card pp-cerrar">
          <span className="etiqueta">Desde el trabajo nuevo · {fechaCorta(inicioSemana(fases[1].desde, t0))}</span>
          <p>{fases[1].texto} {fases[2] ? fases[2].texto : ''}</p>
        </div>
      )}
    </main>
  );
}

// ——— 7.6 Handyx ———

export function PlanHandyx({ day }: { day: DayLog }) {
  const date = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const settings = useStore((s) => s.settings);
  const cfg = planSettings(settings);
  const c = corteHandyx(date, t0);
  const decision = fechaHito(PLAN.hitos.find((h) => h.id === 'T+12')!, t0);
  const semanasAnio = PLAN.handyx.cortes[PLAN.handyx.cortes.length - 1].hasta;
  const s = semanaDelPlan(date, t0);
  const l = lunesDe(date);
  const sem = plan.handyx[l] ?? {};
  const porDia = Array.from({ length: 7 }, (_, i) => horasDeRama(days, 'handyx', addDays(l, i), addDays(l, i)));
  const horasSemana = porDia.reduce((a, b) => a + b, 0) + (sem.horas ?? 0);
  const horasAnio = Object.values(plan.handyx).reduce((a, h) => a + (h.horas ?? 0), 0) + horasDeRama(days, 'handyx', t0, finSemana(semanasAnio, t0));
  const usuarios = Math.max(0, ...Object.values(plan.handyx).map((h) => h.clientes ?? 0));
  const margen = Object.entries(plan.handyx).filter(([k]) => k <= l).sort(([a], [b]) => b.localeCompare(a)).find(([, h]) => h.margen != null)?.[1].margen;
  const corteRent = PLAN.handyx.cortes.findIndex((x) => x.id === 'rentabilidad');
  const enRent = c && c.indice >= corteRent;
  const maxH = Math.max(PLAN.handyx.horasPorDia, ...porDia) * 1.1;
  const hoy = (new Date(date + 'T12:00').getDay() + 6) % 7;
  const [usu, setUsu] = useState('');
  const [mar, setMar] = useState('');

  return (
    <main className="pantalla plan-rama" style={{ ['--c' as string]: RAMA_COLOR.handyx }}>
      <Top rama="handyx" lado={c ? `semana ${Math.max(1, s)} de ${semanasAnio}` : 'según la decisión'} />
      <h1 className="titulo">Handyx</h1>
      <p className="pp-que">Un año de prueba a {PLAN.handyx.horasPorDia} h por día. El {fechaCorta(decision)} {decision.slice(0, 4)} decidís con datos: seguir, delegar o soltar.</p>

      <div className="etiqueta pp-sec">{PLAN.handyx.cortes.length === 4 ? 'Cuatro' : PLAN.handyx.cortes.length} cortes</div>
      <ol className="ph-cortes">
        {PLAN.handyx.cortes.map((x, i) => {
          const fin = i === PLAN.handyx.cortes.length - 1 ? decision : finSemana(x.hasta, t0);
          const est = !c ? 'pas' : i < c.indice ? 'pas' : i === c.indice ? 'on' : '';
          return (
            <li key={x.id} className={est}>
              <i aria-hidden="true" />
              <div className="fila-t"><b className={est === 'on' ? 'resaltado' : ''}>{x.nombre}</b><span className="mono sub">hasta {fechaCorta(fin)}</span></div>
              <p className="sub">{x.texto}</p>
            </li>
          );
        })}
      </ol>

      <div className="fila-t pp-sec"><span className="etiqueta">Horas esta semana</span><span className="mono">{fmt(horasSemana)} / {PLAN.handyx.horasPorSemana} h</span></div>
      <div className="ph-horas" role="img" aria-label={`Horas de Handyx por día: ${porDia.map((h, i) => `${'LMMJVSD'[i]} ${fmt(h)}`).join(', ')}`}>
        <i className="ph-meta" style={{ bottom: `calc(22px + (100% - 22px) * ${PLAN.handyx.horasPorDia / maxH})` }} />
        {porDia.map((h, i) => (
          <div key={i} className={i === hoy ? 'hoy' : ''}><span style={{ height: `${(h / maxH) * 100}%` }} /><small className="mono sub">{'LMMJVSD'[i]}</small></div>
        ))}
      </div>
      <div className="fila-t">
        <p className="sub">La línea punteada son las {PLAN.handyx.horasPorDia} h del plan. Las horas salen del foco del bloque de Handyx.</p>
        <button className="mg-mas chico" onClick={() => sumarHandyx(date, { horas: 1 })} aria-label="Sumar 1 hora a mano">+1 h</button>
      </div>

      <div className="ph-stats">
        <div><span className="sub">Operaciones</span><b className="mono">{sem.operaciones ?? 0}</b><button className="mg-mas chico" onClick={() => sumarHandyx(date, { operaciones: 1 })} aria-label="Sumar una operación">+1</button></div>
        <div>
          <span className="sub">Usuarios activos</span><b className="mono">{usuarios}</b>
          <form onSubmit={(e) => { e.preventDefault(); const n = Number(usu); if (usu !== '' && n >= 0) { sumarHandyx(date, { clientes: n }, false); setUsu(''); } }}>
            <input className="campo-texto mono" inputMode="numeric" value={usu} onChange={(e) => setUsu(e.target.value.replace(/\D/g, ''))} placeholder="hoy" aria-label="Usuarios activos hoy" />
          </form>
        </div>
        <div><span className="sub">Horas del año</span><b className="mono">{miles(Math.round(horasAnio))} / {miles(PLAN.handyx.horasPorSemana * semanasAnio)}</b></div>
        <div>
          <span className="sub">Margen por operación</span>
          {enRent ? (
            <>
              <b className="mono">{margen != null ? `USD ${fmt(margen)}` : '—'}</b>
              <form onSubmit={(e) => { e.preventDefault(); const n = Number(mar.replace(',', '.')); if (mar !== '' && !Number.isNaN(n)) { sumarHandyx(date, { margen: n }, false); setMar(''); } }}>
                <input className="campo-texto mono" inputMode="decimal" value={mar} onChange={(e) => setMar(e.target.value.replace(/[^\d.,-]/g, ''))} placeholder="USD" aria-label="Margen por operación" />
              </form>
            </>
          ) : <b className="mono">corte {corteRent + 1}</b>}
        </div>
      </div>

      <div className="pr-card pp-cerrar">
        <span className="etiqueta">Criterio para el {fechaCorta(decision)} {decision.slice(0, 4)}</span>
        <p>Seguir si deja al menos <b>{cfg.umbralIngreso || '[tu umbral de ingreso]'}</b> por mes con <b>{cfg.horasMaximas || '[horas máximas]'}</b> por semana. Si no, delegar u ordenar la salida. Las {PLAN.handyx.horasPorDia} h vuelven a programación o a Eclipse.</p>
        {(!cfg.umbralIngreso || !cfg.horasMaximas) && <a className="subrayado" href="#/ajustes">Escribir los umbrales en Ajustes</a>}
      </div>
    </main>
  );
}
