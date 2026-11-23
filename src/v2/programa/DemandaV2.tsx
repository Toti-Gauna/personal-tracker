/**
 * Trazo 2.0 · la demanda (#/estudio/prog/demanda): qué tecnologías piden las vacantes que cargaste y qué proyecto del plan las
 * cubre. No hay datos de mercado: la tabla arranca vacía y solo cuenta lo que pegás. Mismos datos y mismas funciones que la 1.0
 * (`data/demanda`, cargar y borrar vacantes con deshacer).
 */
import { useMemo, useState } from 'react';
import { leerVacantes, tablaDemanda, type FilaDemanda } from '../../data/demanda';
import { PLAN_EXT } from '../../data/plan-extendido';
import { calendarioCompleto } from '../../data/plan-vistas';
import { borrarVacantes, cargarVacantes, restaurarVacantes } from '../../state/plan';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { fp, plural, useT0 } from './comun';

const EJEMPLO = `AI Engineer · Empresa X
Stack: Python, LangGraph, RabbitMQ
Buscamos experiencia con agentes y Kubernetes.
---
Backend Java · Empresa Y
Spring Boot, Docker, Azure`;

const INFO = (
  <>
    <p className="t-cuerpo-l">Qué tecnologías piden las vacantes que cargás y qué proyecto del plan las cubre.</p>
    <p className="t-cuerpo">No hay datos de mercado: solo cuenta lo que vos pegues.</p>
    <p className="t-nota">La fecha es el cierre estimado del proyecto con tus semanas extra. «Sin proyecto» es una tecnología que piden y el plan no cubre.</p>
  </>
);

const VISIBLES = 8;

function FilaTec({ f }: { f: FilaDemanda }) {
  const nota = f.proyecto ? `${f.proyecto}${f.fecha ? ` · ${fp(f.fecha)}${f.cubierta ? ' · lista' : ''}` : ''}` : 'Sin proyecto en el plan';
  return <Fila titulo={f.tecnologia} nota={nota} valor={plural(f.vacantes, 'vacante', 'vacantes')} href={f.proyecto ? `#/estudio/prog/${f.proyecto}/stack` : undefined} />;
}

export default function DemandaV2({ day }: PropsV2) {
  const t0 = useT0();
  const vacantes = useStore((s) => s.plan.vacantes) ?? [];
  useStore((s) => s.plan.extrasApagados);
  useStore((s) => s.plan.pausaFinDeAnio);
  const [texto, setTexto] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [formatos, setFormatos] = useState(false);
  const t = useMemo(() => tablaDemanda(vacantes, calendarioCompleto(t0), day.date), [vacantes, t0, day.date]);

  const cargar = () => {
    const r = leerVacantes(texto, day.date);
    if (!r.ok) { setErrores(r.errores); setAvisos([]); return; }
    if (!r.vacantes.length) { setErrores(['No encontré ninguna vacante.']); return; }
    const ids = cargarVacantes(r.vacantes);
    setTexto('');
    setErrores([]);
    setAvisos(r.avisos);
    aviso({ titulo: `${plural(ids.length, 'vacante cargada', 'vacantes cargadas')}`, sub: 'La tabla se actualizó', tono: 'hecho', deshacer: () => borrarVacantes(ids) });
  };

  return (
    <Marco className="pg" titulo="Demanda" info={<>{INFO}{t.fueraDelPlan > 0 && <p className="t-nota">Ahora hay {plural(t.fueraDelPlan, 'tecnología', 'tecnologías')} sin proyecto.</p>}</>} volver={{ href: '#/estudio/prog', nombre: 'Programación' }}>
      <section className="pg-carga" aria-label="Cargar vacantes">
        <CampoTexto etiqueta="Cargar vacantes" multilinea valor={texto} onCambio={(v) => { setTexto(v); setErrores([]); }} placeholder={EJEMPLO} />
        {errores.length > 0 && <ul className="pg-errores" role="alert">{errores.slice(0, 8).map((e) => <li key={e} className="t-nota">{e}</li>)}</ul>}
        {avisos.length > 0 && <ul className="pg-avisos t-nota">{avisos.map((e) => <li key={e}>{e}</li>)}</ul>}
        <Boton variante="primario" icono="importar" deshabilitado={texto.trim() ? false : 'Pegá una vacante primero'} onClick={cargar}>Cargar vacantes</Boton>
      </section>

      {t.vacantes === 0 ? (
        <Vacio ilustracion="trabajo" titulo="Sin vacantes cargadas" texto="Pegá una arriba y la tabla se arma sola." accion={<Boton variante="secundario" onClick={() => setFormatos(true)}>Ver los formatos</Boton>} />
      ) : (
        <Grupo titulo="Lo que piden" extremo={<span className="t-rotulo">{plural(t.filas.length, 'tecnología', 'tecnologías')}</span>}>
          <div className="capa-1 s-lista">
            {t.filas.slice(0, VISIBLES).map((f) => <FilaTec key={f.clave} f={f} />)}
            {t.filas.length > VISIBLES && (
              <FilaHoja icono="mas" titulo={`Ver las ${t.filas.length - VISIBLES} que faltan`} tituloHoja="Lo que piden">
                <div className="capa-1 s-lista">{t.filas.slice(VISIBLES).map((f) => <FilaTec key={f.clave} f={f} />)}</div>
              </FilaHoja>
            )}
          </div>
        </Grupo>
      )}

      <div className="capa-1 s-lista">
        <Fila icono="documento" titulo="Formatos aceptados" valor="texto o JSON" onClick={() => setFormatos(true)} />
        {t.vacantes > 0 && t.sinPedir.length > 0 && (
          <FilaHoja icono="paquete" titulo="Del plan, sin vacantes" valor={plural(t.sinPedir.length, 'tecnología', 'tecnologías')}>
            <div className="capa-1 s-lista">{t.sinPedir.map((f) => <FilaTec key={f.clave} f={f} />)}</div>
          </FilaHoja>
        )}
        {vacantes.length > 0 && (
          <FilaHoja icono="trabajo" titulo="Vacantes cargadas" valor={String(vacantes.length)}>
            <div className="capa-1 s-lista">
              {vacantes.map((v) => (
                <Fila key={v.id} titulo={v.rol} nota={`${v.empresa ? `${v.empresa} · ` : ''}${v.stack.length ? v.stack.join(' · ') : 'sin tecnologías'}`}
                  extremo={<Boton soloIcono tamano="s" variante="fantasma" icono="borrar" etiqueta={`Borrar la vacante ${v.rol}`} onClick={() => { borrarVacantes([v.id]); aviso({ titulo: 'Vacante borrada', sub: v.rol, tono: 'info', deshacer: () => restaurarVacantes([v]) }); }} />} />
              ))}
            </div>
          </FilaHoja>
        )}
        {(PLAN_EXT.backlog?.length ?? 0) > 0 && (
          <FilaHoja icono="calendario" titulo="Backlog sin fecha" valor={String(PLAN_EXT.backlog!.length)}>
            <div className="capa-1 s-lista">{PLAN_EXT.backlog!.map((d) => <Fila key={d.nombre} titulo={d.nombre} nota={`${d.motivo} · ${fp(d.fecha)}`} />)}</div>
          </FilaHoja>
        )}
        {(PLAN_EXT.descartadas?.length ?? 0) > 0 && (
          <FilaHoja icono="cerrar" titulo="Descartado por ahora" valor={String(PLAN_EXT.descartadas!.length)}>
            <div className="capa-1 s-lista">{PLAN_EXT.descartadas!.map((d) => <Fila key={d.nombre} titulo={d.nombre} nota={`${d.motivo} · ${fp(d.fecha)}`} />)}</div>
          </FilaHoja>
        )}
      </div>

      <Hoja abierta={formatos} onCerrar={() => setFormatos(false)} titulo="Formatos aceptados">
        <div className="pg-detalle">
          <p className="t-cuerpo">Una vacante por bloque, separadas por una línea <span className="t-dato">---</span>, o un JSON.</p>
          <p className="t-cuerpo">Texto: la primera línea es el rol; una línea <span className="t-dato">Stack: a, b, c</span> suma lo que diga; el resto se busca entre las tecnologías del plan.</p>
          <pre className="pg-json">{`{ "tipo": "vacantes", "lista": [\n  { "rol": "AI Engineer", "empresa": "X",\n    "stack": ["Python", "LangGraph", "Kubernetes"] }\n] }`}</pre>
        </div>
      </Hoja>
    </Marco>
  );
}
