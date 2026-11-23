/**
 * Trazo 2.0 · los algoritmos (#/estudio/prog/algoritmos): los algorithm spots plantados en los proyectos (roadmap v7) y el sprint sin
 * IA. Cada tema dice en qué proyecto va y si es con IA o sin IA; registrarlo guarda cuándo, en qué proyecto y la pregunta de entrevista
 * que responde (y arma la línea para `docs/learning.md`). El sprint sin IA son 14 días de 30 min antes de cada ciclo de entrevistas
 * técnicas; los problemas resueltos se cuentan contra ≈ 100. Mismos datos y mismas funciones que la 1.0.
 */
import { useState } from 'react';
import { ALG, estadoTemas, lineaLearning, problemas, sprintActivo, type EstadoTema } from '../../data/algoritmos';
import { agregarTemaAlgoritmo, borrarTemaAlgoritmo, cortarSprintSinIA, iniciarSprintSinIA, registrarSpot, sumarProblemas } from '../../state/plan';
import { getState, useStore } from '../../state/store';
import { aviso, confirmar } from '../kit/capas';
import { Boton, Casilla, CampoTexto, Contador, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { fch, plural } from './comun';

const AREA = 'var(--a-ing)';
const MODO = { 'con-ia': 'con IA', 'sin-ia': 'sin IA' } as const;
const minus = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);

const INFO = (
  <>
    <p className="t-cuerpo-l">Los algorithm spots plantados en los proyectos, para las entrevistas técnicas.</p>
    <p className="t-cuerpo"><b>Con IA:</b> {minus(ALG.modos['con-ia'])}</p>
    <p className="t-cuerpo"><b>Sin IA:</b> {minus(ALG.modos['sin-ia'])}</p>
    <p className="t-nota">{ALG.registro}</p>
    <p className="t-nota">El sprint sin IA: {ALG.sprint.dias} días de {ALG.sprint.minPorDia} min. {ALG.sprint.cuando}.</p>
    <p className="t-nota">Con el sprint en curso, los {ALG.sprint.minPorDia} min de cada día van al arrancar el proyecto de la mañana (en Hoy aparece como «Algoritmos sin IA»).</p>
  </>
);

type Registro = NonNullable<EstadoTema['registro']>;

export default function AlgoritmosV2({ day }: PropsV2) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const ts = estadoTemas(plan);
  const sprint = sprintActivo(plan, hoy);
  const total = problemas(plan);
  const hoyN = plan.problemasSinIA?.[hoy] ?? 0;
  const faltan = Math.max(0, ALG.temasRoadmap - ts.length);
  const proyectos = [...new Set(ts.flatMap((t) => t.proyectos.slice(0, 1)))];
  const sprints = (plan.sprintsSinIA ?? []).length;
  const [sel, setSel] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const elegido = ts.find((t) => t.id === sel) ?? null;

  const terminar = async () => {
    if (await confirmar({ titulo: '¿Terminar el sprint?', texto: sprint && sprint.inicio >= hoy ? 'Arrancó hoy: se borra.' : 'Queda cortado desde ayer. Los problemas que contaste se guardan.', accion: 'Terminar', peligro: true })) cortarSprintSinIA(hoy);
  };

  return (
    <Marco className="pg" titulo="Algoritmos" info={INFO} volver={{ href: '#/estudio/prog', nombre: 'Programación' }}>
      <Tarjeta heroe className="pg-hero pg-sprint" area={AREA}>
        <span className="t-rotulo">Sprint sin IA</span>
        {sprint ? (
          <>
            <p className="t-seccion">Día {sprint.dia} de {ALG.sprint.dias}</p>
            <p className="t-nota">Hasta el {fch(sprint.fin)} · {ALG.sprint.minPorDia} min por día</p>
            <Contador valor={hoyN} etiqueta="Problemas resueltos hoy" min={0} onCambio={(v) => sumarProblemas(hoy, v - hoyN)} />
            <Boton variante="fantasma" onClick={terminar}>Terminar el sprint</Boton>
          </>
        ) : (
          <>
            <p className="t-cuerpo">{ALG.sprint.dias} días de {ALG.sprint.minPorDia} min.</p>
            <Boton variante="primario" icono="play" onClick={() => { iniciarSprintSinIA(hoy); aviso({ titulo: 'Sprint sin IA', sub: `${ALG.sprint.dias} días desde hoy`, tono: 'hecho' }); }}>Arrancar el sprint hoy</Boton>
          </>
        )}
        <div className="pg-datos pg-datos-hero">
          <Dato valor={total} unidad={`de ≈ ${ALG.metaProblemas}`} etiqueta="Problemas sin IA" />
          <Dato valor={sprints} etiqueta={sprints === 1 ? 'Sprint' : 'Sprints'} />
        </div>
      </Tarjeta>

      {proyectos.map((p) => {
        const del = ts.filter((t) => t.proyectos[0] === p);
        return (
          <Grupo key={p} titulo={`${p} · ${plural(del.length, 'tema', 'temas')}`} extremo={<span className="t-rotulo">{del.filter((t) => t.estado !== 'pendiente').length} plantados</span>}>
            <div className="capa-1 s-lista">
              {del.map((t) => (
                <Fila key={t.id} titulo={t.tema} nota={MODO[t.modo]}
                  valor={t.estado === 'hecho' ? 'Hecho' : t.estado === 'registrado' ? 'Plantado' : undefined} onClick={() => setSel(t.id)} />
              ))}
            </div>
          </Grupo>
        );
      })}

      <div className="capa-1 s-lista">
        <Fila icono="mas" titulo="Agregar un tema" nota={faltan > 0 ? `Faltan ${faltan} del roadmap` : `${plural(ts.length, 'tema cargado', 'temas cargados')}`} onClick={() => setNuevo(true)} />
      </div>

      <HojaTema t={elegido} hoy={hoy} onCerrar={() => setSel(null)} />
      <HojaNuevo abierta={nuevo} onCerrar={() => setNuevo(false)} faltan={faltan} total={ts.length} />
    </Marco>
  );
}

// ——— Un tema ———

function HojaTema({ t, hoy, onCerrar }: { t: EstadoTema | null; hoy: string; onCerrar: () => void }) {
  const [ultimo, setUltimo] = useState<EstadoTema | null>(null);
  if (t && t.id !== ultimo?.id) setUltimo(t);
  const x = t ?? ultimo;
  if (!x) return null;
  // Siempre el tema vivo: el último guardado puede estar viejo.
  const vivo = t ?? x;
  return (
    <Hoja abierta={!!t} onCerrar={onCerrar} titulo={vivo.tema}>
      <Tema key={vivo.id} t={vivo} hoy={hoy} onCerrar={onCerrar} />
    </Hoja>
  );
}

function Tema({ t, hoy, onCerrar }: { t: EstadoTema; hoy: string; onCerrar: () => void }) {
  const r = t.registro;
  const [pregunta, setPregunta] = useState(r?.pregunta ?? '');
  const guardar = (cambios: Partial<Registro>) => registrarSpot(t.id, { fecha: r?.fecha ?? hoy, proyecto: r?.proyecto ?? t.proyectos[0], pregunta: pregunta.trim() || undefined, ...(r?.validado ? { validado: true } : {}), ...cambios });
  const copiar = () => {
    const linea = lineaLearning(t, r!);
    navigator.clipboard?.writeText(linea).then(() => aviso({ titulo: 'Copiado para learning.md', sub: t.tema, tono: 'hecho' }), () => undefined);
  };
  const deshacer = () => {
    if (!r) return;
    registrarSpot(t.id, null);
    aviso({ titulo: 'Registro deshecho', sub: t.tema, tono: 'info', deshacer: () => registrarSpot(t.id, r) });
  };
  const borrar = async () => {
    if (!(await confirmar({ titulo: '¿Borrar el tema?', texto: `«${t.tema}» y su registro se borran.`, accion: 'Borrar', peligro: true }))) return;
    borrarTemaAlgoritmo(t.id);
    onCerrar();
  };
  return (
    <div className="pg-detalle">
      <p className="t-rotulo">{t.proyectos.join(', ')}{t.donde ? ` · ${t.donde}` : ''}{r ? ` · registrado el ${fch(r.fecha)}` : ''}</p>
      <p className="t-dato pg-tema-modo">{MODO[t.modo]}</p>
      {/* Con el tema ya registrado, la pregunta se guarda al salir del campo; si no, se guarda junto con "Lo planté hoy". */}
      <div onBlur={() => { if (r) guardar({}); }}>
        <CampoTexto etiqueta="Pregunta de entrevista que responde" valor={pregunta} onCambio={setPregunta} placeholder="¿Cómo implementarías un LRU en O(1)?" />
      </div>
      {r ? (
        <div className="pg-tema-acc">
          <div className="capa-1 pt-check">
            <Casilla marcada={!!r.validado} etiqueta={t.modo === 'con-ia' ? 'Validé complejidad, bordes y cambios en voz alta' : 'Lo escribí yo y pasan los tests'} onCambio={() => guardar({ validado: !r.validado })} />
          </div>
          <div className="pg-acciones">
            <Boton variante="secundario" icono="copiar" onClick={copiar}>Copiar para learning.md</Boton>
            <Boton variante="fantasma" icono="deshacer" onClick={deshacer}>Deshacer el registro</Boton>
          </div>
        </div>
      ) : (
        <Boton variante="primario" onClick={() => guardar({})}>Lo planté hoy</Boton>
      )}
      {t.propio && <div><Boton variante="peligro" icono="borrar" onClick={borrar}>Borrar el tema</Boton></div>}
    </div>
  );
}

// ——— Un tema nuevo ———

function HojaNuevo({ abierta, onCerrar, faltan, total }: { abierta: boolean; onCerrar: () => void; faltan: number; total: number }) {
  const [tema, setTema] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [modo, setModo] = useState<'con-ia' | 'sin-ia'>('sin-ia');
  const agregar = () => {
    const antes = (getState().plan.temasPropios ?? []).length;
    agregarTemaAlgoritmo({ tema: tema.trim(), proyectos: proyecto.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean), modo });
    const id = (getState().plan.temasPropios ?? [])[antes]?.id;
    const nombre = tema.trim();
    setTema('');
    setProyecto('');
    onCerrar();
    aviso({ titulo: 'Tema agregado', sub: nombre, tono: 'hecho', deshacer: id ? () => borrarTemaAlgoritmo(id) : undefined });
  };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Agregar un tema">
      <div className="pg-detalle">
        <p className="t-nota">{faltan > 0 ? `El roadmap habla de ${ALG.temasRoadmap} temas y la tabla trae ${ALG.temas.length}: faltan ${faltan}. Sumalos acá.` : `${plural(total, 'tema cargado', 'temas cargados')}.`}</p>
        <CampoTexto etiqueta="Tema nuevo" valor={tema} onCambio={setTema} placeholder="Trie, union-find, segment tree…" />
        <CampoTexto etiqueta="Proyecto del tema nuevo" valor={proyecto} onCambio={setProyecto} placeholder="P8" />
        <Segmentado etiqueta="Modo del tema nuevo" opciones={[['sin-ia', 'Sin IA'], ['con-ia', 'Con IA']]} valor={modo} onCambio={setModo} />
        <Boton variante="primario" deshabilitado={tema.trim() ? false : 'Escribí el tema'} onClick={agregar}>Agregar tema</Boton>
      </div>
    </Hoja>
  );
}
