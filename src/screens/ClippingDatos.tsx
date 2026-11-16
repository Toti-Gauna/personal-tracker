/** Ola 23 · las pantallas de la planilla del clipping: Registro, Cuentas, Campañas y Retainers. */
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CLIP, COLOR_CLIP, finMes, inicioMes, mesDe, MESES_CLIP } from '../data/clipping';
import {
  ESTADOS_CAMPANA, ESTADOS_CUENTA, ESTADOS_RETAINER, validarPlanilla,
  type Campana, type Cuenta, type EstadoCampana, type EstadoCuenta, type EstadoRetainer, type FilaClip, type Retainer,
} from '../data/clipping-state';
import { cuentasActivas, filas, porCampana, totales, type Rango } from '../data/clipping-metricas';
import { addDays } from '../data/time';
import { DUR, reducedMotion } from '../lib/motion';
import { lunesDe } from '../state/plan';
import { borrarCampana, borrarCuenta, borrarRetainer, guardarCampana, guardarCuenta, guardarRetainer, importarPlanilla, sumarProspeccion } from '../state/clipping';
import { getState, useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { EscaleraPlan } from '../ui/charts/clipping';
import { Hoja } from '../ui/Hoja';
import { Plegable } from '../ui/Plegable';
import { fc, fcA, pc, usd, usd2 } from './Clipping';

gsap.registerPlugin(Flip);

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));
const soloNum = (s: string) => s.replace(/[^\d.,]/g, '');

/** Las listas se reordenan animadas (Flip) cuando cambia su orden. */
function useFlipLista<T extends HTMLElement>(clave: string) {
  const ref = useRef<T>(null);
  const prev = useRef<Flip.FlipState | null>(null);
  useLayoutEffect(() => {
    const items = ref.current ? [...ref.current.children] : [];
    if (prev.current && items.length && !reducedMotion()) Flip.from(prev.current, { targets: items, duration: DUR.flip, ease: 'power2.out' });
    prev.current = items.length ? Flip.getState(items) : null;
  }, [clave]);
  return ref;
}

/* ---------- Registro ---------- */

export function Registro({ date, onEditar }: { date: string; onEditar: (f: FilaClip) => void }) {
  const clip = useStore((s) => s.clipping);
  const [cuenta, setCuenta] = useState('');
  const [campana, setCampana] = useState('');
  const [mes, setMes] = useState(String(Math.min(Math.max(mesDe(date), 1), MESES_CLIP)));
  const [cuantas, setCuantas] = useState(30);
  const rango: Rango | undefined = mes === 'todo' ? undefined : mes === '0' ? { desde: '2000-01-01', hasta: addDays(CLIP.t0, -1) } : { desde: inicioMes(Number(mes)), hasta: finMes(Number(mes)) };
  const fs = filas(clip, rango, { cuenta: cuenta || undefined, campana: campana || undefined });
  const t = totales(fs);
  const lista = [...fs].reverse();
  const nombre = (id: string | undefined, xs: { id: string; alias?: string; nombre?: string }[]) => (id ? xs.find((x) => x.id === id)?.alias ?? xs.find((x) => x.id === id)?.nombre ?? '—' : '');
  return (
    <>
      <div className="clip-filtros">
        <label>Mes<select className="campo-texto" value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="todo">Todo</option>
          {clip.registro.some((f) => f.fecha < CLIP.t0) && <option value="0">Antes del roadmap</option>}
          {CLIP.meses.map((m) => <option key={m.n} value={m.n}>Mes {m.n} · {fc(inicioMes(m.n))}</option>)}
        </select></label>
        <label>Cuenta<select className="campo-texto" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
          <option value="">Todas</option>{clip.cuentas.map((c) => <option key={c.id} value={c.id}>{c.alias}</option>)}
        </select></label>
        <label>Campaña<select className="campo-texto" value={campana} onChange={(e) => setCampana(e.target.value)}>
          <option value="">Todas</option>{clip.campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select></label>
      </div>
      <p className="mono sub clip-tot">{fs.length} filas · {t.clips} clips · {t.views.toLocaleString('es-AR')} views · {usd(t.cobrado)} cobrados</p>
      {lista.length === 0 ? (
        <p className="clip-vacio-txt sub">Sin filas{rango ? ' en este período' : ''}. Tocá <b>Registrar</b> para cargar clips y views (acepta fechas pasadas).</p>
      ) : (
        <ul className="clip-filas">
          {lista.slice(0, cuantas).map((f) => (
            <li key={f.id}>
              <button onClick={() => onEditar(f)} aria-label={`Editar la fila del ${fcA(f.fecha)}`}>
                <span className="mono clip-f-fecha">{fc(f.fecha)}</span>
                <span className="clip-f-t"><b>{f.clips} clips · {f.views.toLocaleString('es-AR')} views</b><small className="sub">{[nombre(f.cuenta, clip.cuentas), nombre(f.campana, clip.campanas), f.nota].filter(Boolean).join(' · ') || 'sin cuenta ni campaña'}</small></span>
                <span className="mono clip-f-usd">{f.cobrado != null ? usd(f.cobrado) : f.estimado != null ? <span className="sub">~{usd(f.estimado)}</span> : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {lista.length > cuantas && <button className="btn-borde" onClick={() => setCuantas((x) => x + 30)}>Ver {Math.min(30, lista.length - cuantas)} más</button>}
      <ExportarImportar />
    </>
  );
}

function ExportarImportar() {
  const [texto, setTexto] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const exportar = () => {
    const blob = new Blob([JSON.stringify({ tipo: 'clipping', version: 1, ...getState().clipping }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trazo-clipping-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importar = () => {
    let x: unknown;
    try { x = JSON.parse(texto); } catch { setErrores(['No es un JSON válido.']); return; }
    const e = validarPlanilla(x);
    setErrores(e);
    if (e.length) return;
    importarPlanilla(x);
    setTexto('');
    toast({ title: 'Planilla importada', color: COLOR_CLIP }, false);
  };
  return (
    <Plegable id="clip:registro:json" titulo="Exportar o importar JSON" resumen="el esquema del dashboard" color={COLOR_CLIP}>
      <p className="sub">Es el esquema de datos de tu dashboard (mes 2): exportalo para sembrarlo. Al importar se valida línea por línea y lo que tenga el mismo id se reemplaza.</p>
      <button className="btn-borde" onClick={exportar}>Exportar la planilla</button>
      <textarea className="campo-texto clip-json" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='{"registro": [{"fecha": "2026-11-19", "clips": 5, "views": 12000}]}' aria-label="JSON para importar" />
      {errores.length > 0 && <ul className="clip-errores">{errores.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>}
      <button className="btn-principal" disabled={!texto.trim()} onClick={importar}>Importar</button>
    </Plegable>
  );
}

/* ---------- Cuentas ---------- */

const CUENTA_COLOR: Record<EstadoCuenta, string> = { calentando: 'luz-medio', activa: 'luz-ok', pausada: '', baneada: 'luz-mal' };

export function Cuentas({ date }: { date: string }) {
  const clip = useStore((s) => s.clipping);
  const [hoja, setHoja] = useState<Cuenta | 'nueva' | null>(null);
  const n = Math.min(Math.max(mesDe(date), 1), MESES_CLIP);
  const plan = CLIP.meses.map((m) => m.cuentas);
  const real = CLIP.meses.map((m) => (m.n > mesDe(date) ? null : cuentasActivas(clip, m.n === mesDe(date) ? date : finMes(m.n))));
  const semana = { desde: addDays(date, -6), hasta: date };
  const ritmo = (id: string) => totales(filas(clip, semana, { cuenta: id })).clips;
  const orden = useMemo(() => [...clip.cuentas].sort((a, b) => ESTADOS_CUENTA.indexOf(a.estado) - ESTADOS_CUENTA.indexOf(b.estado) || a.alias.localeCompare(b.alias)), [clip.cuentas]);
  const lista = useFlipLista<HTMLUListElement>(orden.map((c) => c.id + c.estado).join());
  return (
    <>
      <p className="sub clip-lead">Este mes el plan pide <b>{CLIP.meses[n - 1].cuentas} cuentas</b> y <b>{CLIP.meses[n - 1].clipsDia} clips por día</b>. Tenés {cuentasActivas(clip, date)} activas.</p>
      <div className="r-card">
        <div className="r-card-cab"><h2>La granja contra el plan</h2><span className="sub">3 → 40</span></div>
        <EscaleraPlan plan={plan} real={real} actual={n} unidad="Cuentas activas" />
      </div>
      {orden.length === 0 ? <p className="clip-vacio-txt sub">Sin cuentas. Arrancá con 3 cuentas base (TikTok, Reels, Shorts), cada una con su nicho.</p> : (
        <ul className="clip-cuentas" ref={lista}>
          {orden.map((c) => (
            <li key={c.id} className={CUENTA_COLOR[c.estado]}>
              <button onClick={() => setHoja(c)} aria-label={`Editar ${c.alias}`}>
                <span className="clip-cta-cab"><b>{c.alias}</b><span className="mono clip-estado">{c.estado}</span></span>
                <small className="sub">{c.red} · {c.nicho}{c.estilo ? ` · ${c.estilo}` : ''}</small>
                <small className="mono sub">{ritmo(c.id)} clips en 7 días · desde {fc(c.desde)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-borde" onClick={() => setHoja('nueva')}>+ Cuenta</button>
      <Plegable id="clip:cuentas:reglas" titulo="Reglas de identidad" resumen="no repetir archivos" color={COLOR_CLIP}>
        <ul className="clip-lista">{CLIP.reglasCuentas.map((t) => <li key={t}>{t}</li>)}</ul>
      </Plegable>
      {hoja && <HojaCuenta date={date} cuenta={hoja === 'nueva' ? undefined : hoja} onCerrar={() => setHoja(null)} />}
    </>
  );
}

function HojaCuenta({ date, cuenta, onCerrar }: { date: string; cuenta?: Cuenta; onCerrar: () => void }) {
  const [x, setX] = useState({ alias: cuenta?.alias ?? '', red: cuenta?.red ?? 'TikTok', nicho: cuenta?.nicho ?? '', estilo: cuenta?.estilo ?? '', estado: cuenta?.estado ?? ('calentando' as EstadoCuenta), desde: cuenta?.desde ?? date });
  const ok = x.alias.trim() && /^\d{4}-\d{2}-\d{2}$/.test(x.desde);
  return (
    <Hoja titulo={cuenta ? cuenta.alias : 'Nueva cuenta'} kicker="Clipping · cuentas" color={COLOR_CLIP} onCerrar={onCerrar}>
      <form className="hclip" onSubmit={(e) => { e.preventDefault(); if (!ok) return; guardarCuenta({ ...x, id: cuenta?.id, alias: x.alias.trim(), estilo: x.estilo.trim() || undefined }); onCerrar(); }}>
        <label>Alias<input className="campo-texto" autoFocus={!cuenta} value={x.alias} onChange={(e) => setX({ ...x, alias: e.target.value })} placeholder="gta.cortes" /></label>
        <div className="hclip-dos">
          <label>Red<select className="campo-texto" value={x.red} onChange={(e) => setX({ ...x, red: e.target.value })}>{['TikTok', 'Reels', 'Shorts', 'X', 'Otra'].map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>Nicho<select className="campo-texto" value={x.nicho} onChange={(e) => setX({ ...x, nicho: e.target.value })}><option value="">—</option>{CLIP.nichos.map((nn) => <option key={nn.nombre}>{nn.nombre}</option>)}</select></label>
        </div>
        <label>Estilo (subtítulos, ritmo, horarios)<input className="campo-texto" value={x.estilo} onChange={(e) => setX({ ...x, estilo: e.target.value })} placeholder="Subtítulos amarillos, 3 clips a la tarde" /></label>
        <div className="hclip-dos">
          <label>Estado<select className="campo-texto" value={x.estado} onChange={(e) => setX({ ...x, estado: e.target.value as EstadoCuenta })}>{ESTADOS_CUENTA.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Desde<input className="campo-texto mono" type="date" value={x.desde} onChange={(e) => setX({ ...x, desde: e.target.value })} /></label>
        </div>
        <button className="btn-principal" type="submit" disabled={!ok}>Guardar</button>
        {cuenta && <button className="btn-borde" type="button" onClick={() => { borrarCuenta(cuenta.id); onCerrar(); }}>Borrar la cuenta</button>}
      </form>
    </Hoja>
  );
}

/* ---------- Campañas ---------- */

export function Campanas({ date }: { date: string }) {
  const clip = useStore((s) => s.clipping);
  const [hoja, setHoja] = useState<Campana | 'nueva' | null>(null);
  const filasC = useMemo(() => porCampana(clip), [clip]);
  const lista = useFlipLista<HTMLUListElement>(filasC.map((f) => f.id).join());
  const seguir = filasC.filter((f) => f.pagoReal != null && f.pagoReal >= CLIP.umbrales.pagoFase2 && f.estado !== 'descartada');
  const dejar = filasC.filter((f) => f.pagoReal != null && f.pagoReal < CLIP.umbrales.pagoMes6 && f.estado !== 'descartada');
  return (
    <>
      <p className="sub clip-lead">Tarifa listada contra pago real por 1.000 views. El pago real sale de las filas con cobro cargado y casi siempre queda debajo del anunciado.</p>
      {(seguir.length > 0 || dejar.length > 0) && (
        <div className="clip-ranking">
          <div className="verde"><span className="etiqueta">Conviene seguir</span>{seguir.length ? seguir.slice(0, 3).map((f) => <b key={f.id}>{f.nombre} · {usd2(f.pagoReal)}</b>) : <span className="sub">Ninguna arriba de USD 0,80 todavía</span>}</div>
          <div className="rojo"><span className="etiqueta">Dejar</span>{dejar.length ? dejar.slice(0, 3).map((f) => <b key={f.id}>{f.nombre} · {usd2(f.pagoReal)}</b>) : <span className="sub">Ninguna por debajo de USD 0,70</span>}</div>
        </div>
      )}
      {filasC.length === 0 ? (
        <section className="clip-vacio"><b>Cargá tu primera campaña</b><p className="sub">Leé las reglas de 10 campañas (tope por clip, mínimo de views, plataformas aceptadas, fuente permitida) y cargá las 3 que elijas.</p></section>
      ) : (
        <ul className="clip-camps" ref={lista}>
          {filasC.map((f) => {
            const c = clip.campanas.find((x) => x.id === f.id)!;
            return (
              <li key={f.id} className={f.pagoReal == null ? '' : f.pagoReal >= CLIP.umbrales.pagoFase2 ? 'luz-ok' : f.pagoReal >= CLIP.umbrales.pagoMes6 ? 'luz-medio' : 'luz-mal'}>
                <button onClick={() => setHoja(c)} aria-label={`Editar ${f.nombre}`}>
                  <span className="clip-cta-cab"><b>{f.nombre}</b><span className="mono clip-estado">{f.estado}</span></span>
                  <small className="sub">{f.plataforma} · {c.nicho || 'sin nicho'}{c.tope != null ? ` · tope ${usd(c.tope)}` : ''}{c.fuente ? ` · ${c.fuente}` : ''}</small>
                  <span className="clip-camp-n">
                    <span><small className="sub">Listada</small><b className="mono">{usd2(f.tarifa)}</b></span>
                    <span><small className="sub">Real</small><b className="mono">{usd2(f.pagoReal)}</b></span>
                    <span><small className="sub">Brecha</small><b className="mono">{f.brecha == null ? '—' : `${f.brecha > 0 ? '+' : ''}${usd2(f.brecha)}`}</b></span>
                    <span><small className="sub">Aprob.</small><b className="mono">{pc(f.aprobacion)}</b></span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button className="btn-borde" onClick={() => setHoja('nueva')}>+ Campaña</button>
      <Plegable id="clip:camp:plataformas" titulo="Plataformas de la semana 1" resumen="sin verificar" color={COLOR_CLIP}>
        <ul className="clip-plataformas">{CLIP.plataformas.map((p) => <li key={p.nombre}><b>{p.nombre}</b><span className="mono">{p.tarifa}</span><small className="sub">{p.nota}</small></li>)}</ul>
        <p className="sub">{CLIP.datosA}. Revisá las tarifas cada lunes: cambian por campaña y se agotan.</p>
      </Plegable>
      {hoja && <HojaCampana date={date} campana={hoja === 'nueva' ? undefined : hoja} onCerrar={() => setHoja(null)} />}
    </>
  );
}

function HojaCampana({ date, campana, onCerrar }: { date: string; campana?: Campana; onCerrar: () => void }) {
  const [x, setX] = useState({ nombre: campana?.nombre ?? '', plataforma: campana?.plataforma ?? CLIP.plataformas[0].nombre, nicho: campana?.nicho ?? '', tarifa: campana ? String(campana.tarifa).replace('.', ',') : '', tope: campana?.tope != null ? String(campana.tope) : '', fuente: campana?.fuente ?? '', estado: campana?.estado ?? ('probando' as EstadoCampana), desde: campana?.desde ?? date });
  const ok = x.nombre.trim() && num(x.tarifa) != null;
  return (
    <Hoja titulo={campana ? campana.nombre : 'Nueva campaña'} kicker="Clipping · campañas" color={COLOR_CLIP} onCerrar={onCerrar}>
      <form className="hclip" onSubmit={(e) => { e.preventDefault(); if (!ok) return; guardarCampana({ id: campana?.id, nombre: x.nombre.trim(), plataforma: x.plataforma, nicho: x.nicho, tarifa: num(x.tarifa)!, tope: num(x.tope), fuente: x.fuente.trim() || undefined, estado: x.estado, desde: x.desde }); onCerrar(); }}>
        <label>Nombre<input className="campo-texto" autoFocus={!campana} value={x.nombre} onChange={(e) => setX({ ...x, nombre: e.target.value })} placeholder="GTA 6 · streamer" /></label>
        <div className="hclip-dos">
          <label>Plataforma<input className="campo-texto" list="clip-plats" value={x.plataforma} onChange={(e) => setX({ ...x, plataforma: e.target.value })} /></label>
          <label>Nicho<select className="campo-texto" value={x.nicho} onChange={(e) => setX({ ...x, nicho: e.target.value })}><option value="">—</option>{CLIP.nichos.map((nn) => <option key={nn.nombre}>{nn.nombre}</option>)}</select></label>
        </div>
        <datalist id="clip-plats">{CLIP.plataformas.map((p) => <option key={p.nombre} value={p.nombre} />)}</datalist>
        <div className="hclip-dos">
          <label>Tarifa · USD por 1.000<input className="campo-texto mono" inputMode="decimal" value={x.tarifa} onChange={(e) => setX({ ...x, tarifa: soloNum(e.target.value) })} placeholder="1,09" /></label>
          <label>Tope por clip · USD<input className="campo-texto mono" inputMode="decimal" value={x.tope} onChange={(e) => setX({ ...x, tope: soloNum(e.target.value) })} /></label>
        </div>
        <label>Fuente permitida<input className="campo-texto" value={x.fuente} onChange={(e) => setX({ ...x, fuente: e.target.value })} placeholder="Solo los streams del canal oficial" /></label>
        <div className="hclip-dos">
          <label>Estado<select className="campo-texto" value={x.estado} onChange={(e) => setX({ ...x, estado: e.target.value as EstadoCampana })}>{ESTADOS_CAMPANA.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Desde<input className="campo-texto mono" type="date" value={x.desde} onChange={(e) => setX({ ...x, desde: e.target.value })} /></label>
        </div>
        <button className="btn-principal" type="submit" disabled={!ok}>Guardar</button>
        {campana && <button className="btn-borde" type="button" onClick={() => { borrarCampana(campana.id); onCerrar(); }}>Borrar la campaña</button>}
      </form>
    </Hoja>
  );
}

/* ---------- Retainers ---------- */

export function Retainers({ date }: { date: string }) {
  const clip = useStore((s) => s.clipping);
  const [hoja, setHoja] = useState<Retainer | 'nueva' | null>(null);
  const n = Math.min(Math.max(mesDe(date), 1), MESES_CLIP);
  const desde = inicioMes(n);
  const hasta = finMes(n);
  const pros = Object.entries(clip.prospeccion).filter(([l]) => l >= lunesDe(desde) && l <= hasta).reduce((s, [, p]) => ({ mensajes: s.mensajes + p.mensajes, pruebas: s.pruebas + p.pruebas }), { mensajes: 0, pruebas: 0 });
  const semana = clip.prospeccion[lunesDe(date)] ?? { mensajes: 0, pruebas: 0 };
  const activos = clip.retainers.filter((r) => r.estado === 'activo');
  const fijo = activos.reduce((s, r) => s + r.usdMes, 0);
  const pasos = [{ k: 'Mensajes', v: pros.mensajes, meta: 20 }, { k: 'Pruebas', v: pros.pruebas, meta: 3 }, { k: 'Activos', v: activos.length, meta: n >= 9 ? 3 : n >= 4 ? 2 : 1 }];
  return (
    <>
      <p className="sub clip-lead">El fijo real del clipping: pago mensual por cantidad de clips. Se consigue con resultados (portfolio de 10 clips con sus views) y se apunta desde el mes 3: 20 mensajes a streamers o podcasters medianos con un mes de prueba.</p>
      <div className="clip-fijo"><small className="sub">Fijo mensual</small><b className="mono">{usd(fijo)}</b><span className="sub">{activos.length} {activos.length === 1 ? 'retainer activo' : 'retainers activos'}</span></div>
      <span className="etiqueta">Embudo del mes {n}</span>
      <ol className="clip-embudo-pros">
        {pasos.map((p) => (
          <li key={p.k}>
            <span><b className="mono">{p.v}</b> {p.k}</span>
            <span className="clip-emb-b"><i style={{ width: `${Math.min(100, (p.v / p.meta) * 100)}%` }} /></span>
            <small className="mono sub">meta {p.meta}</small>
          </li>
        ))}
      </ol>
      <div className="clip-pros-btn">
        <button className="btn-borde" onClick={() => sumarProspeccion(date, 'mensajes')}>+1 mensaje <span className="mono sub">({semana.mensajes} esta semana)</span></button>
        <button className="btn-borde" onClick={() => sumarProspeccion(date, 'pruebas')}>+1 prueba <span className="mono sub">({semana.pruebas})</span></button>
      </div>
      {clip.retainers.length > 0 && (
        <ul className="clip-camps">
          {clip.retainers.map((r) => (
            <li key={r.id} className={r.estado === 'activo' ? 'luz-ok' : r.estado === 'prueba' ? 'luz-medio' : ''}>
              <button onClick={() => setHoja(r)} aria-label={`Editar ${r.nombre}`}>
                <span className="clip-cta-cab"><b>{r.nombre}</b><span className="mono clip-estado">{r.estado}</span></span>
                <small className="mono sub">{usd(r.usdMes)}/mes{r.clipsMes ? ` · ${r.clipsMes} clips` : ''} · desde {fcA(r.desde)}{r.hasta ? ` hasta ${fcA(r.hasta)}` : ''}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-borde" onClick={() => setHoja('nueva')}>+ Retainer</button>
      {hoja && <HojaRetainer date={date} retainer={hoja === 'nueva' ? undefined : hoja} onCerrar={() => setHoja(null)} />}
    </>
  );
}

function HojaRetainer({ date, retainer, onCerrar }: { date: string; retainer?: Retainer; onCerrar: () => void }) {
  const [x, setX] = useState({ nombre: retainer?.nombre ?? '', estado: retainer?.estado ?? ('prueba' as EstadoRetainer), usdMes: retainer ? String(retainer.usdMes) : '', clipsMes: retainer?.clipsMes != null ? String(retainer.clipsMes) : '', desde: retainer?.desde ?? date, hasta: retainer?.hasta ?? '' });
  const ok = x.nombre.trim() && num(x.usdMes) != null && /^\d{4}-\d{2}-\d{2}$/.test(x.desde);
  return (
    <Hoja titulo={retainer ? retainer.nombre : 'Nuevo retainer'} kicker="Clipping · retainers" color={COLOR_CLIP} onCerrar={onCerrar}>
      <form className="hclip" onSubmit={(e) => { e.preventDefault(); if (!ok) return; guardarRetainer({ id: retainer?.id, nombre: x.nombre.trim(), estado: x.estado, usdMes: num(x.usdMes)!, clipsMes: num(x.clipsMes), desde: x.desde, hasta: x.hasta || undefined }); onCerrar(); }}>
        <label>Streamer o podcaster<input className="campo-texto" autoFocus={!retainer} value={x.nombre} onChange={(e) => setX({ ...x, nombre: e.target.value })} /></label>
        <div className="hclip-dos">
          <label>USD por mes<input className="campo-texto mono" inputMode="decimal" value={x.usdMes} onChange={(e) => setX({ ...x, usdMes: soloNum(e.target.value) })} placeholder="300" /></label>
          <label>Clips por mes<input className="campo-texto mono" inputMode="numeric" value={x.clipsMes} onChange={(e) => setX({ ...x, clipsMes: soloNum(e.target.value) })} /></label>
        </div>
        <label>Estado<select className="campo-texto" value={x.estado} onChange={(e) => setX({ ...x, estado: e.target.value as EstadoRetainer })}>{ESTADOS_RETAINER.map((s) => <option key={s}>{s}</option>)}</select></label>
        <div className="hclip-dos">
          <label>Desde<input className="campo-texto mono" type="date" value={x.desde} onChange={(e) => setX({ ...x, desde: e.target.value })} /></label>
          <label>Hasta<input className="campo-texto mono" type="date" value={x.hasta} onChange={(e) => setX({ ...x, hasta: e.target.value })} /></label>
        </div>
        <p className="sub">La prueba no cobra; el activo suma su fijo a cada mes que cubre.</p>
        <button className="btn-principal" type="submit" disabled={!ok}>Guardar</button>
        {retainer && <button className="btn-borde" type="button" onClick={() => { borrarRetainer(retainer.id); onCerrar(); }}>Borrar el retainer</button>}
      </form>
    </Hoja>
  );
}
