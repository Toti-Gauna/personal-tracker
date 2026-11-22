/**
 * Trazo 2.0 · la página de un bloque (#/metas/proyecto/<id>): un proyecto, una certificación, una ventana de matemática, inglés,
 * búsqueda… Arriba la portada (un dibujo generado), lo que es y cómo va; abajo, tres pestañas: Resumen (versiones, metas y lo
 * que se carga para cerrar), Ficha y Stack. En la 1.0 eran 800 palabras y quince plegables en una sola columna.
 */
import { useState } from 'react';
import { certV12, estadoCert } from '../../data/certs-v12';
import { atrasoPuerta, puertaAprobada } from '../../data/puertas';
import { PLAN, T0_PLAN, tramoActivo, tramoPorId } from '../../data/plan';
import { avanceSalida, salidaDe } from '../../data/plan-vistas';
import { claveHito } from '../../data/periodos-plan';
import { herramientasDe } from '../../data/herramientas';
import { PLAN_EXT } from '../../data/plan-extendido';
import { V122 } from '../../data/v12-2';
import { tildarSalida } from '../../state/plan';
import { useStore } from '../../state/store';
import { hrefPeriodo, fp } from '../../ui/PeriodoTarjeta';
import { usePeriodos } from '../../ui/usePeriodos';
import { Boton, Segmentado } from '../kit/controles';
import { Dato, Estado, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { camino } from '../plan/datos';
import { areaDe } from '../plan/TarjetaPeriodo';
import { cuando, fichaFilas, primeraFrase, rotuloBloque, vecinos } from './datos';
import { FichaTab, StackTab, tieneStack } from './Pestanas';
import { FilaHoja, Lista, hechasDe } from './piezas';
import { Portada } from './Portada';
import { Agentico, Arquitectura, Estandar, Evidencia, Examen, HorasFechas, Revisiones, Tecnica, Tiempo, VersionDeExamen } from './Secciones';
import { MetasDelBloque } from './MetasBloque';
import { Versiones, resumenVersiones, useVersiones } from './Versiones';
import './proyecto.css';

type Pestana = 'resumen' | 'ficha' | 'stack';

const INFO = (
  <>
    <p className="t-cuerpo-l">Un bloque es un tramo del plan con una entrega al final: un proyecto, un examen, una ventana de matemática.</p>
    <p className="t-cuerpo">Resumen es lo que tenés que ir marcando. Ficha cuenta qué se construye y por qué. Stack, con qué.</p>
    <p className="t-cuerpo">Cada versión del proyecto es un paso: tocala para ver sus fechas, su alcance y publicarla.</p>
  </>
);

export function ProyectoV2({ id, hoy }: { id?: string; hoy: string }) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const { arbol, cal } = usePeriodos(hoy);
  const bid = id || tramoActivo(hoy, t0).id;
  const t = tramoPorId(bid);
  const b = cal.find((x) => x.id === bid);
  const ruta = camino(arbol, bid);
  const p = ruta[ruta.length - 1];
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const vs = useVersiones(bid, b, hoy);
  if (!t && !b) {
    return (
      <Marco titulo="Bloque" volver={{ href: '#/metas', nombre: 'Plan' }}>
        <Vacio ilustracion="plan" titulo="No hay un bloque con ese nombre" texto="Puede que el plan haya cambiado." accion={<Boton variante="primario" href="#/metas">Ir al plan</Boton>} />
      </Marco>
    );
  }
  const tipo = t?.tipo ?? b!.tipo;
  const nombre = t ? (t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'ventana' ? `Ventana ${t.id}` : t.nombre) : b!.nombre;
  const inicio = p?.inicio ?? b?.inicio ?? '';
  const fin = p?.fin ?? b?.fin ?? '';
  const horas = b?.horas ?? t?.horas;
  const area = p ? areaDe(p) : 'var(--a-ing)';
  const grupos = fichaFilas(bid);
  const conStack = tieneStack(bid, t);
  const tabs: [Pestana, string][] = [['resumen', 'Resumen'], ...(grupos.length ? [['ficha', 'Ficha'] as [Pestana, string]] : []), ...(conStack ? [['stack', 'Stack'] as [Pestana, string]] : [])];
  const actual: Pestana = tabs.some(([k]) => k === pestana) ? pestana : 'resumen';
  const rv = resumenVersiones(vs);
  const conEstandar = t?.tipo === 'proyecto' && t.id !== 'P0';
  const { ant, sig } = vecinos(bid);
  return (
    <Marco className="pt" titulo={nombre} info={INFO} volver={{ href: hrefPeriodo(bid), nombre: 'Período', transicion: 'zoom-out' }}>
      <Portada id={bid} tipo={tipo} area={area}>
        <span className="t-rotulo">{rotuloBloque(t, b)}</span>
        <div className="pt-hero-fila">{p && <Estado estado={p.estado} />}<span className="t-dato">{cuando(inicio, fin, horas)}</span></div>
      </Portada>

      {t?.que && <p className="t-cuerpo-l pt-que">{primeraFrase(t.que)}</p>}
      <div className="pt-datos">
        {p && <Dato valor={`${Math.round(p.trabajo * 100)} %`} etiqueta="Hecho" />}
        {rv.total > 0 && <Dato valor={`${rv.publicadas} de ${rv.total}`} etiqueta="Versiones" />}
        {fin && <Dato valor={fp(fin)} etiqueta="Cierra" />}
      </div>

      {tabs.length > 1 && <div className="pt-pestanas"><Segmentado etiqueta="Qué ver" opciones={tabs} valor={actual} onCambio={setPestana} /></div>}

      {actual === 'ficha' && <FichaTab id={bid} />}
      {actual === 'stack' && <StackTab id={bid} t={t} />}
      {actual === 'resumen' && (
        <>
          {vs.length > 0 && b && (
            <Grupo titulo="Versiones">
              <Versiones id={bid} b={b} hoy={hoy} />
            </Grupo>
          )}

          {tipo === 'cert' && b && <Certs b={b} hoy={hoy} />}
          {tipo === 'ventana' && <Ventana id={bid} hoy={hoy} t0={t0} />}

          <MetasDelBloque bloque={bid} hoy={hoy} titulo={`Metas de ${bid}`} />

          {(tipo === 'proyecto' || tipo === 'cert') && b && (
            <Grupo titulo="Para cerrar" extremo={fin ? <span className="t-rotulo">Cierra el {fp(fin)}</span> : undefined}>
              <div className="capa-1 s-lista">
                {conEstandar && <Estandar id={bid} />}
                {tipo === 'proyecto' && <Evidencia id={bid} />}
                {tipo === 'proyecto' && b.ficha?.entregablesArquitectura && <Arquitectura id={bid} />}
                {conEstandar && <Tecnica id={bid} hoy={hoy} />}
                {conEstandar && <Agentico id={bid} />}
                {tipo === 'cert' && <VersionDeExamen b={b} hoy={hoy} />}
                {conEstandar && <Tiempo id={bid} />}
                {t && <Revisiones id={bid} hoy={hoy} />}
                {t && <Examen id={bid} hoy={hoy} />}
                <HorasFechas b={b} />
              </div>
              <Cierre tipo={tipo} nombre={nombre} />
            </Grupo>
          )}
          {(tipo === 'descanso' || tipo === 'colchon') && <p className="t-nota pt-pie">Sin entrega en esta etapa.</p>}

          <MasDelBloque id={bid} />
          {(ant || sig) && (
            <nav className="pt-vecinos" aria-label="Bloques vecinos">
              {ant ? <Boton tamano="s" variante="fantasma" icono="atras" href={`#/metas/proyecto/${ant.id}`}>{ant.id}</Boton> : <span />}
              {sig ? <Boton tamano="s" variante="fantasma" icono="siguiente" href={`#/metas/proyecto/${sig.id}`}>{sig.id}</Boton> : <span />}
            </nav>
          )}
        </>
      )}
    </Marco>
  );
}

function Cierre({ tipo, nombre }: { tipo: string; nombre: string }) {
  return (
    <p className="t-nota pt-pie">
      {tipo === 'proyecto'
        ? `Examen de programación conmigo; el resultado entra como JSON. ${nombre} se entrega a trabajo (portfolio y demo) y a Eclipse (producto vendible).`
        : 'Con la certificación aprobada, entra al CV y al perfil de LinkedIn.'}
    </p>
  );
}

/** Las certificaciones del bloque, cada una con su cuenta regresiva. */
function Certs({ b, hoy }: { b: NonNullable<ReturnType<typeof usePeriodos>['cal'][number]>; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const certs = (b.certs ?? []).map((c) => certV12(c.id)).filter(Boolean);
  if (!certs.length) return null;
  return (
    <Grupo titulo="Exámenes">
      <div className="capa-1 s-lista">
        {certs.map((c) => {
          const e = estadoCert(c!, plan, hoy);
          return <Fila key={c!.id} icono="certificado" titulo={c!.nombre} nota={e.aprobada ? `Aprobada el ${fp(e.aprobada)}` : `Examen el ${fp(e.examen)}${e.reservado ? ' · reservado' : ''}`} valor={e.aprobada ? 'Aprobada' : e.diasAlExamen >= 0 ? `en ${e.diasAlExamen} d` : 'pasó'} href={`#/metas/cert/${c!.id}`} />;
        })}
      </div>
    </Grupo>
  );
}

/** La ventana de matemática: sus hitos (en su página), el nivel de salida y la puerta que abre el proyecto siguiente. */
function Ventana({ id, hoy, t0 }: { id: string; hoy: string; t0: string }) {
  const plan = useStore((s) => s.plan);
  const hitos = useStore((s) => s.plan.hitos);
  const crit = salidaDe(id);
  const av = avanceSalida(plan, id);
  const hechos = new Set(plan.salida?.[id] ?? []);
  const abre = PLAN.programacion.puertas[id];
  const ok = puertaAprobada(plan, id);
  const atraso = atrasoPuerta(plan, id, hoy, t0);
  const lista = PLAN_EXT.bloques.find((x) => x.id === id)?.hitos ?? [];
  const nHitos = lista.filter((_, i) => hitos[claveHito.mate(id, i)]?.hecho).length;
  return (
    <>
      <Grupo titulo="Matemática">
        <div className="capa-1 s-lista">
          <Fila icono="matematica" titulo="Hitos de la ventana" valor={hechasDe(nHitos, lista.length)} href={`#/metas/ventana/${id}`} />
          {crit.length > 0 && (
            <FilaHoja icono="meta" titulo="Nivel de salida" valor={hechasDe(av.hechos, av.total)} hecho={av.completo}>
              <Lista items={crit.map((c, i) => ({ clave: String(i), etiqueta: c, marcada: hechos.has(i) }))} onCambio={(k) => tildarSalida(id, Number(k))} area="var(--a-economia)" />
              <p className="t-nota pt-pie">{av.completo ? 'Nivel de salida completo: listo para el test de la puerta.' : 'Tildá cada criterio cuando lo puedas hacer sin ayuda; con todos, hacé el test de la puerta (85 %).'}</p>
            </FilaHoja>
          )}
          <Examen id={id} hoy={hoy} ventana />
        </div>
      </Grupo>
      {abre && (
        <Tarjeta className="pt-puerta" area="var(--a-economia)">
          <p className="t-rotulo">Puerta {id} · abre {abre}</p>
          <p className="t-cuerpo">{ok ? `Aprobada el ${fp(ok)}: ${abre} puede arrancar.` : `${abre} no arranca hasta aprobar los tests del tema (85 % o más).`}</p>
          {atraso > 0 && <p className="t-nota">+{atraso} {atraso === 1 ? 'semana' : 'semanas'} de atraso: corren las fechas siguientes y se descuentan del colchón.</p>}
        </Tarjeta>
      )}
    </>
  );
}

/** Lo que cuelga del bloque en otras páginas: el repo y el lanzamiento, las herramientas open source y el período. */
function MasDelBloque({ id }: { id: string }) {
  const d = V122.detalle[id];
  const tools = herramientasDe(id);
  return (
    <Grupo titulo="Más">
      <div className="capa-1 s-lista">
        {d && <Fila icono="iman" titulo="Repo, lanzamiento e Imán" href={`#/metas/fondo/${id}`} />}
        {tools.length > 0 && <Fila icono="paquete" titulo="Open source" nota={tools.map(({ h, v }) => `${h.nombre} ${v.id}`).join(' · ')} href="#/metas/open-source" />}
        <Fila icono="plan" titulo="Ver como período" nota="Fechas, estado y lo que sigue" href={hrefPeriodo(id)} />
      </div>
    </Grupo>
  );
}
