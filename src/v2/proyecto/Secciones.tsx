/**
 * Trazo 2.0 · lo que se carga para cerrar un bloque, una fila por cosa y cada una abre su hoja: el estándar de alto valor, la
 * puerta de evidencia, la arquitectura, la entrevista técnica, el portfolio agéntico, el tiempo real, las revisiones, el examen y
 * las horas y fechas. Mismos datos y mismas funciones que la 1.0; solo cambia cómo se ven y cuánto se lee de entrada.
 */
import { useState } from 'react';
import { textoDelta } from '../../data/diferencia';
import { bloqueExtPorId, type BloqueFechado } from '../../data/plan-extendido';
import { EVIDENCIAS, proyectoVacio, type TipoError } from '../../data/plan-state';
import { PLAN, type Capa } from '../../data/plan';
import { alertaVerificar, alertaVersion } from '../../data/plan-vistas';
import { daysBetween } from '../../data/time';
import { guardarExamen, marcarCapa, marcarCertVerificada, setExtraBloque, setTecnica, setVersionCert, sumarRevision, sumarTiempo, toggleAgentico, toggleArquitectura, toggleEvidencia, type TipoExtra } from '../../state/plan';
import { useStore } from '../../state/store';
import { fp } from '../../ui/PeriodoTarjeta';
import { Boton, CampoTexto, Contador, Interruptor, Segmentado, Selector } from '../kit/controles';
import { Barra } from '../kit/superficies';
import { FilaHoja, Lista, hechasDe } from './piezas';
import { cuantos } from '../reglas';

const useProyecto = (id: string) => useStore((s) => s.plan.proyectos[id]) ?? proyectoVacio();

/** El estándar de alto valor: las capas con las que se entrega un proyecto. */
export function Estandar({ id }: { id: string }) {
  const p = useProyecto(id);
  const capas = PLAN.programacion.estandar;
  const n = capas.filter((c) => p.estandar[c.id]).length;
  return (
    <FilaHoja icono="medalla" titulo="Estándar de alto valor" valor={hechasDe(n, capas.length)} hecho={n === capas.length}>
      <Lista items={capas.map((c) => ({ clave: c.id, etiqueta: c.nombre, nota: [c.texto, c.detalle?.join(' · ')].filter(Boolean).join(' · '), marcada: !!p.estandar[c.id as Capa] }))} onCambio={(k) => marcarCapa(id, k as Capa)} />
    </FilaHoja>
  );
}

/** La puerta de evidencia: sin las tres, el proyecto no cierra. */
export function Evidencia({ id }: { id: string }) {
  const p = useProyecto(id);
  const n = EVIDENCIAS.filter(([k]) => p.evidencia?.[k]).length;
  return (
    <FilaHoja icono="candado" titulo="Puerta de evidencia" valor={hechasDe(n, EVIDENCIAS.length)} hecho={n === EVIDENCIAS.length}>
      <Lista items={EVIDENCIAS.map(([k, nombre, texto]) => ({ clave: k, etiqueta: nombre, nota: texto, marcada: !!p.evidencia?.[k] }))} onCambio={(k) => toggleEvidencia(id, k as (typeof EVIDENCIAS)[number][0])} />
      <p className="t-nota pt-pie">Sin las tres, además de los tests y la seguridad, el proyecto no cierra.</p>
    </FilaHoja>
  );
}

const ARQ: [('contrato' | 'trazas' | 'mtls' | 'adr'), string, string][] = [
  ['contrato', 'Contrato probado', 'OpenAPI o eventos con pruebas de contrato (Pact) en CI.'],
  ['trazas', 'Trazas distribuidas', 'OpenTelemetry de punta a punta entre servicios.'],
  ['mtls', 'mTLS entre servicios', 'Identidad de cada servicio y tráfico cifrado adentro.'],
  ['adr', 'ADR de la división', 'Por qué se divide (escala, equipos o aislamiento) y por qué no un monolito modular.'],
];

/** La arquitectura (P1, P5, P10, S1 y Q5): contrato probado, trazas, mTLS y la decisión de dividir. */
export function Arquitectura({ id }: { id: string }) {
  const hechos = useStore((s) => s.plan.arquitectura?.[id]) ?? {};
  const n = ARQ.filter(([k]) => hechos[k]).length;
  const dice = bloqueExtPorId(id)?.ficha?.arquitectura;
  return (
    <FilaHoja icono="hardware" titulo="Arquitectura" valor={hechasDe(n, ARQ.length)} hecho={n === ARQ.length}>
      {dice && <p className="t-cuerpo pt-pie">{dice}.</p>}
      <Lista items={ARQ.map(([k, nombre, texto]) => ({ clave: k, etiqueta: nombre, nota: texto, marcada: !!hechos[k] }))} onCambio={(k) => toggleArquitectura(id, k as (typeof ARQ)[number][0])} />
    </FilaHoja>
  );
}

/** La entrevista técnica del proyecto: documento de diseño, set de algoritmos con tests y defensa simulada. */
export function Tecnica({ id, hoy }: { id: string; hoy: string }) {
  const t = useProyecto(id).tecnica ?? {};
  const cfg = PLAN.programacion.tecnica;
  const n = t.ejercicios ?? 0;
  const hechos = [t.diseno, n >= cfg.ejercicios[0], t.defensa].filter(Boolean).length;
  return (
    <FilaHoja icono="codigo" titulo="Entrevista técnica" valor={hechasDe(hechos, 3)} hecho={hechos === 3}>
      <Lista
        items={[
          { clave: 'diseno', etiqueta: 'Documento de diseño', nota: `${cfg.paginasDiseno} páginas: requisitos, carga, componentes, API, trade-offs, fallas, costos y seguridad.`, marcada: !!t.diseno },
          { clave: 'defensa', etiqueta: `Defensa simulada de ${cfg.defensaMin} min`, nota: t.defensa ? `Aprobada el ${fp(t.defensa)}.` : 'Con la rúbrica: requisitos, estimación, trade-offs, fallas y comunicación.', marcada: !!t.defensa },
        ]}
        onCambio={(k) => (k === 'diseno' ? setTecnica(id, { diseno: !t.diseno }) : setTecnica(id, { defensa: t.defensa ? null : hoy }))}
      />
      <div className="pt-campo-hoja">
        <Contador etiqueta="Ejercicios de algoritmos con tests" valor={n} min={0} max={cfg.ejercicios[1]} onCambio={(v) => setTecnica(id, { ejercicios: v })} unidad={`de ${cfg.ejercicios[1]}`} />
        <p className="t-nota">Entre {cfg.ejercicios[0]} y {cfg.ejercicios[1]}, atados al código del proyecto. {cfg.sesionesPorSemana} sesiones de 45 min por semana: 2 de algoritmos y 1 de diseño.</p>
      </div>
      <p className="t-nota pt-pie">El proyecto no se marca como cerrado sin estos tres.</p>
    </FilaHoja>
  );
}

/** Un servidor MCP y un agente con trazas por proyecto. */
export function Agentico({ id }: { id: string }) {
  const p = useProyecto(id);
  const n = [p.mcp, p.agente].filter(Boolean).length;
  return (
    <FilaHoja icono="cohete" titulo="Portfolio agéntico" valor={hechasDe(n, 2)} hecho={n === 2}>
      <Lista
        items={[
          { clave: 'mcp', etiqueta: 'Servidor MCP publicado', nota: 'Herramientas tipadas, 5 tests, 10 evals y README con instalación en una línea.', marcada: !!p.mcp },
          { clave: 'agente', etiqueta: 'Agente con trazas', nota: 'Con tokens, latencia y costo a la vista; suma a "Preguntale a mis proyectos".', marcada: !!p.agente },
        ]}
        onCambio={(k) => toggleAgentico(id, k as 'mcp' | 'agente')}
      />
    </FilaHoja>
  );
}

const CATS: ['nucleo' | 'producto' | 'lanzamiento', string, string][] = [
  ['nucleo', 'Núcleo técnico', 'var(--a-ing)'],
  ['producto', 'Producto: UX/UI y 3D', 'var(--a-handyx)'],
  ['lanzamiento', 'Lanzamiento', 'var(--a-eclipse)'],
];

/** El tiempo real contra el reparto del plan (55 / 30 / 15). */
export function Tiempo({ id }: { id: string }) {
  const t = useProyecto(id).tiempo;
  const total = t.nucleo + t.producto + t.lanzamiento;
  const plan = PLAN.programacion.presupuesto;
  const horas = Math.round((total / 60) * 10) / 10;
  return (
    <FilaHoja icono="reloj" titulo="Tiempo real" valor={`${String(horas).replace('.', ',')} h`} tituloHoja={`Tiempo real contra ${plan.nucleo} / ${plan.producto} / ${plan.lanzamiento}`}>
      <div className="pt-tiempo">
        {CATS.map(([k, nombre, area]) => {
          const pct = total ? Math.round((t[k] / total) * 100) : 0;
          return (
            <div key={k} className="pt-tiempo-fila">
              <div className="pt-tiempo-cab">
                <b className="t-encabezado">{nombre}</b>
                <span className="t-dato">{total ? `${pct} %` : '—'} <small>· plan {plan[k]} %</small></span>
                <Boton tamano="s" variante="secundario" icono="mas" onClick={() => sumarTiempo(id, k, 30)}>30 min</Boton>
              </div>
              <div className="pt-barra"><Barra valor={pct} max={100} nombre={`${nombre}: ${pct} % del tiempo`} area={area} /><i style={{ left: `${plan[k]}%` }} aria-hidden="true" /></div>
            </div>
          );
        })}
      </div>
      <p className="t-nota pt-pie">La raya es el plan. Si el tiempo no alcanza, se recorta producto, nunca tests ni seguridad.</p>
    </FilaHoja>
  );
}

const TIPOS: [TipoError, string][] = [['concepto', 'Concepto'], ['tecnica', 'Técnica'], ['descuido', 'Descuido']];

/** Las revisiones: lo que falló al revisar el código y de qué tipo fue. */
export function Revisiones({ id, hoy }: { id: string; hoy: string }) {
  const revisiones = useProyecto(id).revisiones;
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<TipoError>('concepto');
  const lista = [...revisiones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const agregar = () => { if (!texto.trim()) return; sumarRevision(id, hoy, texto.trim(), tipo); setTexto(''); };
  return (
    <FilaHoja icono="documento" titulo="Revisiones" valor={lista.length ? String(lista.length) : 'ninguna'} tituloHoja="Revisiones conmigo">
      {lista.length > 0 && (
        <ul className="capa-1 pt-revs">
          {lista.map((r, k) => <li key={k}><span className="t-rotulo">{fp(r.fecha)} · {TIPOS.find((x) => x[0] === r.tipo)?.[1]}</span><span className="t-cuerpo">{r.texto}</span></li>)}
        </ul>
      )}
      <div className="pt-campo-hoja">
        <CampoTexto etiqueta="Qué falló en la revisión" valor={texto} onCambio={setTexto} />
        <Segmentado etiqueta="Tipo de error" opciones={TIPOS} valor={tipo} onCambio={setTipo} />
        <Boton variante="primario" deshabilitado={!texto.trim()} onClick={agregar}>Agregar revisión</Boton>
        <a className="t-nota pt-enlace" href="#/flojo">Ver los puntos débiles</a>
      </div>
    </FilaHoja>
  );
}

/** El puntaje del examen del bloque (con 85 % o más, la puerta o el proyecto se aprueban). */
export function Examen({ id, hoy, ventana }: { id: string; hoy: string; ventana?: boolean }) {
  const examen = useProyecto(id).examen;
  const [v, setV] = useState('');
  const n = Number(v);
  const valido = v !== '' && n >= 0 && n <= 100;
  return (
    <FilaHoja icono="tarjetas" titulo="Examen" valor={examen ? `${examen.puntaje} %` : 'sin cargar'} nota={examen ? `Cargado el ${fp(examen.fecha)}` : undefined} hecho={!!examen && examen.puntaje >= 85}>
      <div className="pt-campo-hoja">
        <CampoTexto etiqueta="Puntaje (0 a 100)" valor={v} onCambio={(x) => setV(x.replace(/\D/g, '').slice(0, 3))} modo="numeric" nota={ventana ? 'Con 85 % o más la puerta queda aprobada.' : 'Con 85 % o más y la entrevista técnica completa, el proyecto queda cerrado.'} />
        <Boton variante="primario" deshabilitado={!valido} onClick={() => { guardarExamen(id, hoy, n); setV(''); }}>{examen ? 'Cambiar' : 'Guardar'}</Boton>
        <p className="t-nota">También entra con el JSON del examen (Importar JSON).</p>
      </div>
    </FilaHoja>
  );
}

/** Las horas y las fechas del bloque, con las semanas extra que se pueden prender o apagar (feature, plataforma, arquitectura). */
export function HorasFechas({ b }: { b: BloqueFechado }) {
  useStore((s) => s.plan.extrasApagados);
  useStore((s) => s.plan.pausaFinDeAnio);
  const largo = daysBetween(b.inicio, b.fin) + 1;
  const filas: [TipoExtra, string, number, number, string | undefined][] = b.tipo === 'proyecto' ? [
    ['feature', 'Feature diferencial', b.extra, b.extraAplicado, b.ficha?.feature],
    ['plataforma', 'Plataforma extra', b.extraPlataforma, b.plataformaAplicada, b.ficha?.plataforma],
    ['arquitectura', 'Arquitectura', b.extraArquitectura, b.arquitecturaAplicada, b.ficha?.arquitectura],
  ] : [];
  const posibles = filas.filter(([, , p]) => p > 0);
  const horas = b.horas ? `${String(b.horas).replace('.', ',')} h` : cuantos(b.dias ?? largo, 'día', 'días');
  return (
    <FilaHoja icono="calendario" titulo="Horas y fechas" valor={horas} tituloHoja={`Horas y fechas de ${b.nombre}`}>
      <p className="t-cuerpo pt-pie">{fp(b.inicio)} – {fp(b.fin)}{b.horasAntes ? ` · antes ${b.horasAntes} h` : ''}{b.pausasDentro.length ? ' · con la pausa de fin de año adentro' : ''}.</p>
      {b.roadmap && <p className="t-nota pt-pie">El roadmap estima {fp(b.roadmap.inicio)} – {fp(b.roadmap.fin)}: Trazo lo termina {textoDelta(daysBetween(b.roadmap.fin, b.fin))}.</p>}
      {posibles.length > 0 && (
        <div className="capa-1 pt-check">
          {posibles.map(([tipo, nombre, posible, aplicada, que]) => (
            <Interruptor key={tipo} prendido={aplicada > 0} etiqueta={`${nombre} · +${posible} sem`} nota={que} onCambio={(v) => setExtraBloque(b.id, v, tipo)} />
          ))}
        </div>
      )}
      {posibles.length > 0 && <p className="t-nota pt-pie">Si falta tiempo se recorta alcance y la feature primero; nunca tests, seguridad, revisiones, repasos, sueño ni entrenamiento.</p>}
      {b.nota && <p className="t-nota pt-pie">{b.nota}.</p>}
    </FilaHoja>
  );
}

/** La versión del examen de una certificación (Security+): elegirla y ver si se retira antes del examen. */
export function VersionDeExamen({ b, hoy }: { b: BloqueFechado; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const vs = b.cert?.versiones;
  if (!vs?.length) return null;
  const alerta = alertaVersion(b, plan, hoy);
  const verificar = alertaVerificar(b, plan, hoy);
  const elegida = plan.versionCert?.[b.id] ?? '';
  const porDefecto = vs.find((v) => v.id === b.cert?.porDefecto);
  const vale = vs.find((v) => v.id === (elegida || b.cert?.porDefecto));
  const verificada = plan.certVerificada?.[b.id];
  return (
    <FilaHoja icono="certificado" titulo="Versión del examen" valor={vale?.nombre ?? 'sin elegir'} nota={alerta ? alerta.titulo : undefined}>
      <ul className="capa-1 pt-revs">
        {vs.map((v) => <li key={v.id}><span className="t-encabezado">{v.nombre}</span><span className="t-nota">{v.retiro ? `Se retira el ${fp(v.retiro)}` : v.sale ? `Sale cerca del ${fp(v.sale)}${v.verificada === false ? ' · sin confirmar' : ''}` : ''}</span></li>)}
      </ul>
      <div className="pt-campo-hoja">
        <Selector etiqueta="Elegida" valor={elegida || ''} placeholder="Elegir" opciones={[{ valor: '', etiqueta: porDefecto ? `La del roadmap (${porDefecto.nombre})` : 'Sin elegir' }, ...vs.map((v) => ({ valor: v.id, etiqueta: v.nombre }))]} onCambio={(v) => setVersionCert(b.id, v)} />
        {!elegida && porDefecto && b.cert?.porDefectoMotivo && <p className="t-nota">{b.cert.porDefectoMotivo}.</p>}
        {alerta ? <p className="t-cuerpo" role="status"><b>{alerta.titulo}</b> {alerta.texto}</p> : vale ? <p className="t-nota">La {vale.nombre} llega a tu examen ({fp(b.fin)}).</p> : null}
        {verificar && (
          <>
            <p className="t-cuerpo"><b>{verificar.titulo}</b> {verificar.texto}</p>
            <Boton variante="secundario" onClick={() => marcarCertVerificada(b.id, hoy)}>Ya la verifiqué</Boton>
          </>
        )}
        {verificada && <p className="t-nota">Verificada el {fp(verificada)}. <button className="pt-enlace" onClick={() => marcarCertVerificada(b.id, null)}>Deshacer</button></p>}
      </div>
    </FilaHoja>
  );
}
