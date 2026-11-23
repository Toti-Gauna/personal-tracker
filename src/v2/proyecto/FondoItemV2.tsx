/**
 * Trazo 2.0 · un ítem de fondo (#/metas/fondo/<id>): una app secundaria, un showcase comercial o un proyecto principal. La
 * portada, el Imán como anillo, sus versiones como pasos, el repo y la demo, y lo que le toca a cada tipo: la ficha de la
 * app, el estado y la seguridad del showcase, los leads.
 */
import { useState } from 'react';
import { ESTADOS_COMERCIAL, ESTADO_COMERCIAL_TXT, faltaForeground, lanzamientoDe, periodosSecundarias, type EstadoComercial, type Lead } from '../../data/fondo';
import { herramientasDe } from '../../data/herramientas';
import { REGLAS_EXTRA, SEGURIDAD, puedePublicar, puntosIman } from '../../data/iman';
import { medir, type EstadoPeriodo } from '../../data/periodos';
import { PLAN_EXT } from '../../data/plan-extendido';
import { fichaV7 } from '../../data/proyectos-v7';
import { V122, comercial, secundaria, type VersionSecundaria } from '../../data/v12-2';
import { agregarLead, estadoLead, marcarForeground, marcarSeguridad, publicarVersionFondo, setItem } from '../../state/fondo';
import { useStore } from '../../state/store';
import { DetalleProyectoV2 } from './DetalleProyectoV2';
import { fp } from '../../ui/periodos';
import { Icono } from '../iconos';
import { Boton, CampoTexto, Casilla, Chip, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { rango } from '../plan/datos';
import { diaMes, faltaTexto, mayuscula, primeraFrase } from './datos';
import { AnilloIman } from './ImanV2';
import { CampoAlSalir, FilaHoja, Lista, hechasDe } from './piezas';
import { Portada } from './Portada';
import { Pasos } from './Versiones';
import './proyecto.css';

const AREA_TXT: Record<string, string> = { dinero: 'plata', 'datos personales': 'datos personales', seguridad: 'seguridad', 'smart contracts': 'smart contracts' };
const LEADS = ['contactado', 'respondió', 'reunión', 'propuesta', 'ganado', 'perdido'] as const;

const INFO = (
  <>
    <p className="t-cuerpo-l">Una app o un showcase que corre de fondo mientras vos hacés los proyectos principales.</p>
    <p className="t-cuerpo">Cada versión se publica cuando está lista. La de lanzamiento lleva el Imán: sin los 8 puntos no se publica.</p>
  </>
);

const estadoPaso = (e: EstadoPeriodo) => (e === 'hecho' ? 'publicada' : e === 'atrasado' || e === 'vencido' ? 'atrasada' : e === 'proximo' || e === 'pausado' ? 'proxima' : 'en-curso') as 'publicada' | 'atrasada' | 'proxima' | 'en-curso';

export function FondoItemV2({ id, hoy }: { id: string; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const sec = secundaria(id);
  const com = comercial(id);
  const principal = !sec && !com ? PLAN_EXT.bloques.find((b) => b.id === id && b.tipo === 'proyecto') : undefined;
  if (!sec && !com && !principal) {
    return <Marco titulo="De fondo" volver={{ href: '#/metas/fondo', nombre: 'De fondo' }}><Vacio ilustracion="plan" titulo="No hay un ítem con ese nombre" accion={<Boton variante="primario" href="#/metas/fondo">Ir a De fondo</Boton>} /></Marco>;
  }
  const e = plan.fondo?.[id] ?? {};
  const versiones = sec ? sec.versiones : com ? [{ id: '1.0' }] : fichaV7(id)?.versiones ?? [];
  const lanz = lanzamientoDe(versiones, e.lanzamiento);
  const ok = puntosIman(plan.iman?.[id]).map((p) => p.ok);
  const nombre = sec?.nombre ?? (com ? `Showcase ${com.n}` : principal!.nombre);
  const marca = com ? com.marca ?? e.marca : undefined;
  const volver = sec ? { href: '#/metas/pista/secundaria', nombre: 'Secundaria' } : com ? { href: '#/metas/pista/comercial', nombre: 'Comercial' } : { href: `#/metas/proyecto/${id}`, nombre: 'Proyecto' };
  const inicio = sec?.inicio ?? com?.inicio ?? principal!.fechas?.inicio ?? '';
  const fin = sec?.fin ?? com?.fin ?? principal!.fechas?.fin ?? '';
  const area = sec ? 'var(--a-handyx)' : com ? 'var(--a-eclipse)' : 'var(--a-ing)';
  const tools = herramientasDe(id);
  return (
    <Marco className="pt" titulo={nombre} info={INFO} volver={volver}>
      <Portada id={id} area={area}>
        <span className="t-rotulo">{sec ? 'App secundaria' : com ? marca ?? 'Marca a definir' : 'Lanzamiento'}</span>
        <div className="pt-hero-fila">
          {inicio && <span className="t-dato">{rango(inicio, fin, hoy)}</span>}
          <a className="pt-iman-enlace" href={`#/metas/iman/${id}`} aria-label={`Imán: ${ok.filter(Boolean).length} de 8 puntos`}><AnilloIman ok={ok} tamano={40} grosor={4} /><span className="t-dato">Imán {ok.filter(Boolean).length}/8</span><Icono nombre="siguiente" lado={14} /></a>
        </div>
      </Portada>

      {sec && <p className="t-cuerpo-l pt-que">{primeraFrase(mayuscula(sec.descripcion))}</p>}
      {com && <p className="t-cuerpo-l pt-que">{com.queSeHace ? primeraFrase(com.queSeHace) : 'Elegí la marca y qué se construye.'}</p>}

      {sec && <Grupo titulo="Versiones"><PasosSecundaria id={id} hoy={hoy} lanzamiento={lanz} /></Grupo>}

      {com && <Comercial id={id} hoy={hoy} />}

      <Grupo titulo="Datos">
        <div className="capa-1 pt-campos">
          {com && !com.marca && <CampoAlSalir etiqueta="Marca o rubro" valor={e.marca} guardar={(v) => setItem(id, { marca: v || undefined })} placeholder="Elegí la marca" />}
          <CampoAlSalir etiqueta="Repo" valor={e.repo} guardar={(v) => setItem(id, { repo: v || undefined })} placeholder="https://github.com/…" modo="url" />
          <CampoAlSalir etiqueta="Demo" valor={e.demo} guardar={(v) => setItem(id, { demo: v || undefined })} placeholder="https://…" modo="url" />
          {!com && <Selector etiqueta="Versión de lanzamiento (lleva el Imán)" valor={lanz} opciones={versiones.map((v) => ({ valor: v.id, etiqueta: `v${v.id}` }))} onCambio={(v) => setItem(id, { lanzamiento: v })} />}
        </div>
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          {sec && <FilaHoja icono="documento" titulo="La ficha" nota="Valor, diferencial, rol y stack">
            <dl className="capa-1 pt-ficha">
              {([['Fechas', `${fp(sec.inicio)} – ${fp(sec.fin)}`], ['Valor', sec.valor], ['Diferencial', sec.diferencial], ['Rol', `${sec.rol} · peso en entrevistas: ${sec.peso}`], ['Empresas', sec.empresas.join(', ')], ['Stack', `dev: ${sec.stack.dev} · staging: ${sec.stack.staging} · prod: ${sec.stack.prod}`]] as [string, string][]).map(([k, v]) => <div key={k} className="pt-ficha-fila"><dt className="t-rotulo">{k}</dt><dd><p className="t-cuerpo">{v}</p></dd></div>)}
            </dl>
          </FilaHoja>}
          {(id === 'handyx' || id === 'clip-studio') && (
            <FilaHoja icono="candado" titulo="Reglas de esta app">
              <ul className="pt-items">{(id === 'handyx' ? [REGLAS_EXTRA.cripto, REGLAS_EXTRA.pagos, REGLAS_EXTRA.voz] : [REGLAS_EXTRA.clip]).map((r) => <li key={r}>{r}</li>)}</ul>
            </FilaHoja>
          )}
          {com && (com.wow || com.reusa) && <FilaHoja icono="documento" titulo="La ficha" nota="Momento wow y qué reusa">
            <dl className="capa-1 pt-ficha">
              {([['Fechas', `${fp(com.inicio)} – ${fp(com.fin)} · ${com.ventana}`], ['Momento wow', com.wow], ['Reusa', com.reusa]] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => <div key={k} className="pt-ficha-fila"><dt className="t-rotulo">{k}</dt><dd><p className="t-cuerpo">{v}</p></dd></div>)}
            </dl>
          </FilaHoja>}
          {principal && V122.detalle[id] && <FilaHoja icono="documento" titulo="Detalle del proyecto" tituloHoja={principal.nombre}><DetalleProyectoV2 id={id} /></FilaHoja>}
          {tools.map(({ h, v }) => <Fila key={h.id + v.id} icono="paquete" titulo={`${h.nombre} ${v.id}`} nota={v.linea} href="#/metas/open-source" />)}
        </div>
      </Grupo>
    </Marco>
  );
}

/** Las versiones de una app secundaria como pasos; cada una abre su hoja con la revisión en primer plano y publicarla. */
function PasosSecundaria({ id, hoy, lanzamiento }: { id: string; hoy: string; lanzamiento: string }) {
  const plan = useStore((s) => s.plan);
  const app = secundaria(id)!;
  const periodo = medir(periodosSecundarias(plan).find((p) => p.id === id)!, hoy);
  const [abierta, setAbierta] = useState<string | null>(null);
  const items = app.versiones.map((v, i) => ({ id: v.id, nombre: `hasta ${diaMes(v.fin)}`, estado: estadoPaso(periodo.hijos![i].estado) }));
  const v = app.versiones.find((x) => x.id === abierta) ?? null;
  return (
    <>
      <Pasos items={items} onElegir={setAbierta} />
      <HojaVersionSec id={id} v={v} hoy={hoy} lanzamiento={lanzamiento} onCerrar={() => setAbierta(null)} />
    </>
  );
}

function HojaVersionSec({ id, v, hoy, lanzamiento, onCerrar }: { id: string; v: VersionSecundaria | null; hoy: string; lanzamiento: string; onCerrar: () => void }) {
  const plan = useStore((s) => s.plan);
  const [ultima, setUltima] = useState<VersionSecundaria | null>(null);
  if (v && v !== ultima) setUltima(v);
  const x = v ?? ultima;
  if (!x) return null;
  const r = plan.fondo?.[id]?.versiones?.[x.id] ?? {};
  const g = puedePublicar({ version: x.id, lanzamiento, iman: plan.iman?.[id], faltaForeground: faltaForeground(x.revisionForeground, r.foreground) });
  const pie = r.publicada
    ? <Boton variante="fantasma" icono="deshacer" onClick={() => publicarVersionFondo(id, x.id, null)}>Sacar de publicadas</Boton>
    : g.ok ? <Boton variante="primario" icono="tilde" onClick={() => publicarVersionFondo(id, x.id, hoy)}>v{x.id} publicada hoy</Boton>
      : <Boton variante="primario" icono="iman" href={`#/metas/iman/${id}`}>Falta {g.faltan.length === 1 ? '1 cosa' : `${g.faltan.length} cosas`}</Boton>;
  return (
    <Hoja abierta={!!v} onCerrar={onCerrar} titulo={`v${x.id}`} pie={pie}>
      <div className="pt-version">
        <p className="t-dato">{fp(x.inicio)} – {fp(x.fin)}{r.publicada ? ` · publicada el ${fp(r.publicada)}` : ''}</p>
        <p className="t-cuerpo-l">{x.linea}</p>
        {x.entregables.length > 0 && <ul className="pt-items">{x.entregables.map((a) => <li key={a}>{a}</li>)}</ul>}
        {x.revisionForeground?.length ? <Lista items={[{ clave: 'f', etiqueta: 'Revisión en primer plano hecha', nota: `Toca ${x.revisionForeground.map((a) => AREA_TXT[a]).join(', ')}`, marcada: !!r.foreground }]} onCambio={() => marcarForeground(id, x.id, r.foreground ? null : hoy)} /> : null}
        {!r.publicada && !g.ok && <p className="t-nota" role="alert">Para publicar falta {faltaTexto(g.faltan)}.</p>}
      </div>
    </Hoja>
  );
}

/** Un showcase comercial: en qué estado está (publicar y ofrecer piden el Imán y la seguridad), la seguridad y los leads. */
function Comercial({ id, hoy }: { id: string; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const c = comercial(id)!;
  const e = plan.fondo?.[id] ?? {};
  const seg = plan.seguridadShowcase?.[id];
  const estado = e.estado ?? 'planned';
  const g = puedePublicar({ version: '1.0', lanzamiento: '1.0', iman: plan.iman?.[id], comercial: true, seguridad: seg });
  const [lead, setLead] = useState('');
  const texto = `${c.queSeHace ?? ''} ${c.wow ?? ''}`.toLowerCase();
  const cambiar = (x: EstadoComercial) => { if ((x === 'published' || x === 'pitched') && !g.ok) return; setItem(id, { estado: x }); };
  return (
    <>
      <Grupo titulo="Estado">
        <div className="pt-etapas" role="group" aria-label="Estado del showcase">
          {ESTADOS_COMERCIAL.map((x) => <Chip key={x} activo={estado === x} onCambio={() => cambiar(x)}>{ESTADO_COMERCIAL_TXT[x]}</Chip>)}
        </div>
        {!g.ok && <p className="t-nota" role="alert">Para publicarlo falta {faltaTexto(g.faltan)}.</p>}
      </Grupo>
      <div className="capa-1 s-lista">
        <FilaHoja icono="candado" titulo="Seguridad antes de publicar" valor={hechasDe(SEGURIDAD.filter((_, i) => seg?.[i]).length, SEGURIDAD.length)} hecho={SEGURIDAD.every((_, i) => seg?.[i])}>
          <Lista festejo={false} items={SEGURIDAD.map((x, i) => ({ clave: String(i), etiqueta: x, marcada: !!seg?.[i] }))} onCambio={(k) => marcarSeguridad(id, Number(k), !seg?.[Number(k)])} />
          {/voz|voice|talking/.test(texto) && <p className="t-nota pt-pie">{REGLAS_EXTRA.voz}</p>}
          {/pago|payment|ticket|booking|reserv/.test(texto) && <p className="t-nota pt-pie">{REGLAS_EXTRA.pagos}</p>}
          {/clip/.test(texto) && <p className="t-nota pt-pie">{REGLAS_EXTRA.clip}</p>}
        </FilaHoja>
      </div>
      <Grupo titulo="Leads freelance" extremo={<span className="t-rotulo">{e.leads?.length ?? 0}</span>}>
        {(e.leads ?? []).length > 0 && (
          <div className="capa-1 pt-campos">
            {e.leads!.map((l) => (
              <div key={l.id} className="pt-lead">
                <div><b className="t-encabezado">{l.nombre}</b><span className="t-nota"> · {fp(l.contactado)}</span></div>
                <Selector etiqueta={`Estado de ${l.nombre}`} valor={l.estado} opciones={LEADS.map((s) => ({ valor: s, etiqueta: s }))} onCambio={(v) => estadoLead(id, l.id, v as Lead['estado'])} />
              </div>
            ))}
          </div>
        )}
        <div className="pt-campo-hoja">
          <CampoTexto etiqueta="Nuevo lead" valor={lead} onCambio={setLead} placeholder="Nombre o empresa" />
          <Boton variante="secundario" icono="mas" deshabilitado={!lead.trim()} onClick={() => { agregarLead(id, { nombre: lead.trim(), contactado: hoy, estado: 'contactado' }); setLead(''); }}>Sumar lead</Boton>
        </div>
      </Grupo>
    </>
  );
}
