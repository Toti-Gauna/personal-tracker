/**
 * Trazo 2.0 · Búsqueda de trabajo (#/metas/trabajo): el embudo contra sus metas, la próxima entrevista con lo que hay que preparar,
 * las que pasaron (con lo que falló, que ya es tarjeta), la revisión de mercado y las postulaciones. Cargar una postulación o una
 * entrevista, cambiar un estado y anotar lo que falló van en hojas. Mismos datos y mismas funciones que la 1.0.
 */
import { useState } from 'react';
import { PLAN, T0_PLAN, diaSemanaCorto, faseTrabajo, hitoSemana, inicioSemana, nombreTramo, semanaDelPlan, tramoActivo, type Entrevista, type EstadoPostulacion } from '../../data/plan';
import { addDays } from '../../data/time';
import { estadoPostulacion, fallaEntrevista, guardarEntrevista, marcarHito, marcarPrep, nuevaPostulacion, setMercado } from '../../state/plan';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha, CampoHora, CampoTexto, Contador, Interruptor, Segmentado, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { CampoAlSalir, FilaHoja, Lista, hechasDe } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, miles, useT0 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';
import { numeroEscrito } from '../reglas';

const ESTADOS: [EstadoPostulacion, string][] = [['enviada', 'Enviada'], ['respuesta', 'Respuesta'], ['entrevista', 'Entrevista'], ['oferta', 'Oferta'], ['rechazada', 'Rechazada']];
const NOMBRE_ESTADO = Object.fromEntries(ESTADOS) as Record<EstadoPostulacion, string>;
/** Las que se pueden mover según el mercado: lo que piden el 40 % o más de las ofertas sube; menos del 10 %, baja. */
const MOVIBLES: [string, string][] = [['P2', 'VitalIA'], ['P4', 'Antena'], ['P5', 'PetrIA Guard'], ['C1', 'AWS SAA'], ['C2', 'Security+'], ['C3', 'AWS ML Engineer']];
const veredicto = (pct?: number) => (pct == null ? 'Sin dato' : pct >= 40 ? 'Sube' : pct < 10 ? 'Baja' : 'Queda');
const MODALIDAD = 'remoto · entrevista técnica en inglés';

// ——— Hojas para cargar ———

function HojaPostulacion({ abierta, onCerrar, hoy }: { abierta: boolean; onCerrar: () => void; hoy: string }) {
  const [rol, setRol] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [rango, setRango] = useState('');
  const guardar = () => {
    if (!rol.trim()) return;
    nuevaPostulacion(hoy, { rol: rol.trim(), empresa: empresa.trim() || undefined, rango: rango.trim() || undefined });
    aviso({ titulo: 'Postulación cargada', sub: rol.trim(), tono: 'hecho' });
    setRol(''); setEmpresa(''); setRango('');
    onCerrar();
  };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Nueva postulación" pie={<Boton variante="primario" ancho deshabilitado={!rol.trim() ? 'Escribí el rol' : false} onClick={guardar}>Guardar</Boton>}>
      <div className="pt-campo-hoja">
        <CampoTexto etiqueta="Rol" valor={rol} onCambio={setRol} placeholder="Backend Python" />
        <CampoTexto etiqueta="Empresa" valor={empresa} onCambio={setEmpresa} />
        <CampoTexto etiqueta="Rango" valor={rango} onCambio={setRango} placeholder="USD …" />
      </div>
    </Hoja>
  );
}

function HojaEntrevista({ abierta, onCerrar, hoy }: { abierta: boolean; onCerrar: () => void; hoy: string }) {
  const [x, setX] = useState({ fecha: addDays(hoy, 3), rol: '', empresa: '', rango: '', modalidad: MODALIDAD });
  const [conHora, setConHora] = useState(false);
  const [hora, setHora] = useState('10:00');
  const guardar = () => {
    if (!x.rol.trim()) return;
    guardarEntrevista({ ...x, rol: x.rol.trim(), hora: conHora ? hora : undefined, empresa: x.empresa.trim() || undefined, rango: x.rango.trim() || undefined, modalidad: x.modalidad.trim() || undefined });
    aviso({ titulo: 'Entrevista cargada', sub: `${x.rol.trim()} · ${dm(x.fecha)}`, tono: 'hecho' });
    setX({ fecha: addDays(hoy, 3), rol: '', empresa: '', rango: '', modalidad: MODALIDAD }); setConHora(false);
    onCerrar();
  };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Nueva entrevista" pie={<Boton variante="primario" ancho deshabilitado={!x.rol.trim() ? 'Escribí el rol' : false} onClick={guardar}>Guardar</Boton>}>
      <div className="pt-campo-hoja">
        <CampoTexto etiqueta="Rol" valor={x.rol} onCambio={(v) => setX({ ...x, rol: v })} placeholder="AI Engineer" />
        <CampoFecha etiqueta="Fecha" valor={x.fecha} onCambio={(v) => setX({ ...x, fecha: v })} hoy={hoy} />
        <Interruptor prendido={conHora} onCambio={setConHora} etiqueta="Con hora" />
        {conHora && <CampoHora etiqueta="Hora" valor={hora} onCambio={setHora} />}
        <CampoTexto etiqueta="Empresa" valor={x.empresa} onCambio={(v) => setX({ ...x, empresa: v })} />
        <CampoTexto etiqueta="Rango" valor={x.rango} onCambio={(v) => setX({ ...x, rango: v })} placeholder="USD …" />
        <CampoTexto etiqueta="Modalidad" valor={x.modalidad} onCambio={(v) => setX({ ...x, modalidad: v })} />
      </div>
    </Hoja>
  );
}

// ——— La próxima entrevista y las que pasaron ———

function Proxima({ e, t0 }: { e: Entrevista; t0: string }) {
  const respuestas = useStore((s) => s.plan.respuestas);
  const ens = respuestas.filter((r) => r.veces > 0).length;
  const t = tramoActivo(e.fecha, t0);
  const demo = t.tipo === 'proyecto' ? nombreTramo(t, false) : 'tu último proyecto';
  const items: [string, 'ingles' | 'programacion' | 'trabajo', string, string | undefined][] = [
    ['respuestas', 'ingles', `${respuestas.length} respuestas ensayadas en voz alta`, `Inglés · ${ens} de ${respuestas.length}`],
    ['demo', 'programacion', `Demo de ${demo} en 3 minutos`, 'Programación'],
    ['empresa', 'trabajo', 'Investigar la empresa y su stack', 'Trabajo'],
    ['preguntas', 'trabajo', 'Preguntas para ellos', 'Trabajo'],
  ];
  const hechos = items.filter(([k]) => (k === 'respuestas' ? ens >= respuestas.length || !!e.prep[k] : !!e.prep[k])).length;
  return (
    <Tarjeta area={AREA.trabajo} etiqueta="Próxima entrevista" className="tr-entrevista">
      <p className="t-rotulo">{diaSemanaCorto(e.fecha)} {dm(e.fecha)}{e.hora ? ` · ${e.hora}` : ''}</p>
      <h3 className="t-encabezado">{e.rol}{e.rango ? ` · ${e.rango}` : ''}</h3>
      <p className="t-nota">{[e.empresa || '[Empresa]', e.modalidad].filter(Boolean).join(' · ')}</p>
      <div className="s-lista">
        <FilaHoja icono="tilde" titulo="Preparación" nota="Lo que hay que tener listo" valor={hechasDe(hechos, items.length)} hecho={hechos === items.length} tituloHoja="Preparar la entrevista">
          <Lista
            area={AREA.trabajo}
            items={items.map(([k, , texto, nota]) => ({ clave: k, etiqueta: texto, nota, marcada: k === 'respuestas' ? ens >= respuestas.length || !!e.prep[k] : !!e.prep[k] }))}
            onCambio={(k) => marcarPrep(e.id, k)}
          />
          <p className="t-nota pt-pie">Después cargás qué preguntaron. Lo que falló va a Puntos débiles de inglés o de programación.</p>
        </FilaHoja>
      </div>
    </Tarjeta>
  );
}

function Pasada({ id, hoy }: { id: string; hoy: string }) {
  const e = useStore((s) => s.plan.entrevistas.find((x) => x.id === id));
  const [texto, setTexto] = useState('');
  const [rama, setRama] = useState<'programacion' | 'ingles'>('programacion');
  if (!e) return null;
  const agregar = () => {
    if (!texto.trim()) return;
    fallaEntrevista(e.id, hoy, texto.trim(), rama, rama === 'ingles' ? 'fluidez' : 'técnica');
    aviso({ titulo: 'Ya es tarjeta', sub: `Puntos débiles de ${rama === 'ingles' ? 'inglés' : 'programación'}`, tono: 'hecho' });
    setTexto('');
  };
  return (
    <FilaHoja icono="trabajo" titulo={`${e.rol}${e.empresa ? ` · ${e.empresa}` : ''}`} nota={dm(e.fecha)} valor={e.fallas?.length ? `${e.fallas.length} ${e.fallas.length === 1 ? 'falla' : 'fallas'}` : 'Sin cargar'} tituloHoja={`${e.rol} · ${dm(e.fecha)}`}>
      {e.fallas && e.fallas.length > 0 && (
        <ul className="capa-1 pt-revs">{e.fallas.map((f, i) => <li key={i}><span className="t-cuerpo">{f}</span></li>)}</ul>
      )}
      <div className="pt-campo-hoja">
        <CampoTexto etiqueta="Qué preguntaron o qué falló" valor={texto} onCambio={setTexto} />
        <Segmentado etiqueta="Va a" opciones={[['programacion', 'Programación'], ['ingles', 'Inglés']]} valor={rama} onCambio={setRama} />
        <Boton variante="secundario" icono="mas" deshabilitado={!texto.trim()} onClick={agregar}>Agregar</Boton>
        <p className="t-nota">Lo que cargues entra como tarjeta al repaso.</p>
      </div>
    </FilaHoja>
  );
}

// ——— La revisión de mercado ———

function Mercado({ hoy, t0 }: { hoy: string; t0: string }) {
  const m = useStore((s) => s.plan.mercado) ?? {};
  const domingo = addDays(t0, 6);
  const ofertas = m.ofertas ?? 0;
  const decidir = () => {
    setMercado({ decidido: hoy });
    marcarHito('trabajo-6', hoy);
    aviso({ titulo: 'Orden confirmado', tono: 'hecho', deshacer: () => { setMercado({ decidido: null }); marcarHito('trabajo-6', null); } });
  };
  return (
    <FilaHoja icono="grafico" titulo="Revisión de mercado" nota={m.decidido ? `Orden confirmado el ${dm(m.decidido)}` : `Se decide el ${dm(domingo)}`} valor={`${ofertas} de 30 ofertas`} tituloHoja="Revisión de mercado">
      <div className="pt-campo-hoja">
        <p className="t-cuerpo">Cargá unas 30 ofertas en la planilla “Ofertas remotas”. Por cada proyecto que se puede mover: qué % de las ofertas lo pide. 40 % o más sube; menos de 10 %, baja. Las ventanas de matemática y la cadena de reuso no se mueven.</p>
        <div className="tr-campo"><span className="t-rotulo">Ofertas cargadas</span><Contador etiqueta="Ofertas cargadas" valor={ofertas} min={0} unidad="de 30" onCambio={(v) => setMercado({ ofertas: v })} /></div>
        <div className="capa-1 pt-check tr-movibles">
          {MOVIBLES.map(([id, n]) => (
            <div key={id} className="tr-movible">
              <CampoAlSalir etiqueta={`% de ofertas que piden ${n}`} valor={m.pct?.[id] != null ? String(m.pct[id]) : ''} modo="numeric" guardar={(v) => { const x = numeroEscrito(v); if (x != null) setMercado({ pct: { [id]: Math.min(100, Math.round(x)) } }); }} />
              <b className="t-dato tr-veredicto">{veredicto(m.pct?.[id])}</b>
            </div>
          ))}
        </div>
        {m.decidido
          ? <p className="t-nota">Orden confirmado el {dm(m.decidido)}.</p>
          : <Boton variante="primario" icono="tilde" deshabilitado={ofertas < 1 ? 'Cargá al menos una oferta' : false} onClick={decidir}>Confirmar el orden</Boton>}
      </div>
    </FilaHoja>
  );
}

// ——— La pantalla ———

export default function BusquedaV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const t0 = useT0();
  const plan = useStore((s) => s.plan);
  const f = faseTrabajo(date, t0);
  const s = Math.max(1, semanaDelPlan(date, t0));
  const t2 = inicioSemana(hitoSemana('T+2'), t0);
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
  const practicaHoy = day?.blocks.find((b) => b.key === 'busqueda')?.tasks.some((t) => /^Practicar la entrevista de mañana/.test(t.t));
  const posts = [...plan.postulaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [todas, setTodas] = useState(false);
  const [nueva, setNueva] = useState<'post' | 'ent' | null>(null);
  const enBusqueda = f.id === 'busqueda';

  const INFO = (
    <>
      <p className="t-cuerpo-l">{enBusqueda ? `Remoto de USD 3.000 a 5.000 para el ${dm(t2)}. 1 h 30 por día${practicaHoy ? '; hoy suma practicar la entrevista de mañana' : ''}.` : `${f.texto} Búsqueda 2 h por semana; en B5 y B6, postular a AI/ML Engineer.`}</p>
      <p className="t-cuerpo">El embudo se mide contra la meta de {e.semanas} semanas: {e.postulaciones} postulaciones, {e.mensajes} mensajes, {e.entrevistas[0]} a {e.entrevistas[1]} entrevistas y {e.ofertas[0]} o {e.ofertas[1]} ofertas.</p>
      <p className="t-cuerpo">Las postulaciones con detalle van acá; el contador rápido está en Hoy («+1 Postulación»). Tocá una para cambiar su estado.</p>
    </>
  );

  return (
    <Marco className="tr" titulo={enBusqueda ? 'Búsqueda' : 'Trabajo'} rotulo={enBusqueda ? `Semana ${Math.min(s, f.hasta)} de ${f.hasta}` : f.nombre} volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe area={AREA.trabajo} etiqueta="El embudo" className="tr-heroe">
        <p className="t-rotulo">Embudo</p>
        <ul className="tr-embudo">
          {embudo.map(([n, v, meta]) => (
            <li key={n}>
              <span className="t-cuerpo">{n}</span>
              <span className="t-dato">{miles(v)} de {miles(meta)}</span>
              <Barra valor={v} max={Math.max(1, meta)} nombre={`${n}: ${v} de ${meta}`} area={AREA.trabajo} />
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Grupo titulo="Entrevistas" extremo={<Boton tamano="s" variante="fantasma" icono="mas" onClick={() => setNueva('ent')}>Nueva</Boton>}>
        {prox ? <Proxima e={prox} t0={t0} /> : (
          <Vacio ilustracion="trabajo" titulo="Sin entrevistas cargadas" texto="Cuando te citen, cargala acá: el día anterior practicás con el pitch armado." accion={<Boton variante="secundario" icono="mas" onClick={() => setNueva('ent')}>Cargar entrevista</Boton>} />
        )}
        {pasadas.length > 0 && (
          <>
            <p className="t-rotulo tr-sub">Las que pasaron</p>
            <div className="capa-1 s-lista tr-pasadas">{pasadas.map((x) => <Pasada key={x.id} id={x.id} hoy={date} />)}</div>
          </>
        )}
      </Grupo>

      <Grupo titulo="Mercado">
        <div className="capa-1 s-lista"><Mercado hoy={date} t0={t0} /></div>
      </Grupo>

      <Grupo titulo="Postulaciones" extremo={posts.length ? <span className="t-rotulo">{posts.length}</span> : undefined}>
        <Boton variante="primario" ancho icono="mas" onClick={() => setNueva('post')}>Nueva postulación</Boton>
        {posts.length === 0 ? (
          <Vacio ilustracion="buscar" titulo="Sin postulaciones con detalle" texto="El contador rápido está en Hoy. Acá van las que querés seguir una por una." />
        ) : (
          <>
            <div className="capa-1 s-lista tr-posts">
              {(todas ? posts : posts.slice(0, 5)).map((p) => (
                <FilaHoja key={p.id} titulo={`${p.rol}${p.empresa ? ` · ${p.empresa}` : ''}`} nota={[p.rango, dm(p.fecha)].filter(Boolean).join(' · ')} valor={NOMBRE_ESTADO[p.estado]} hecho={p.estado === 'oferta'} tituloHoja={p.rol}>
                  <div className="pt-campo-hoja">
                    <Selector etiqueta="Estado" valor={p.estado} opciones={ESTADOS.map(([v, n]) => ({ valor: v, etiqueta: n }))} onCambio={(v) => estadoPostulacion(p.id, v)} />
                  </div>
                </FilaHoja>
              ))}
            </div>
            {posts.length > 5 && <div className="pt-acciones"><Boton tamano="s" variante="fantasma" icono={todas ? 'arriba' : 'abajo'} onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver las ${posts.length}`}</Boton></div>}
          </>
        )}
      </Grupo>

      <HojaPostulacion abierta={nueva === 'post'} onCerrar={() => setNueva(null)} hoy={date} />
      <HojaEntrevista abierta={nueva === 'ent'} onCerrar={() => setNueva(null)} hoy={date} />
    </Marco>
  );
}
