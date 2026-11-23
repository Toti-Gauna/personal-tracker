/**
 * Trazo 2.0 · el Clipping (#/metas/clipping): lo cobrado este mes contra la meta, los clips de hoy y un botón para cargarlos; debajo,
 * los números del mes, la compuerta de la fase y las secciones como filas que abren su página. Es el mismo roadmap, la misma planilla
 * y los mismos cálculos que la 1.0 (data/clipping*, state/clipping).
 */
import { CLIP, finMes, inicioMes } from '../../data/clipping';
import { aprobacion, filas, pagoReal, totales } from '../../data/clipping-metricas';
import { Icono, type NombreIcono } from '../iconos';
import { Boton } from '../kit/controles';
import { Anillo, Dato, Fila, Ritmo, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { lunesDe } from '../../state/plan';
import { HojaFila, useHojaFila } from './HojaFila';
import { LuzClip } from './piezas';
import { fc, n1, pc, rotuloMes, subsVisibles, usd, usd2, useClip, type SubClip } from './datos';
import '../proyecto/proyecto.css';
import './clipping.css';

const AREA = 'var(--a-eclipse)';

const INFO = (
  <>
    <p className="t-cuerpo-l">Trazo es la planilla y el tablero del Roadmap Clipper de 12 meses. No publica ni entra a las plataformas.</p>
    <p className="t-cuerpo">Cargá los clips y las views de cada día. Acepta fechas pasadas: podés cargar lo que hiciste desde el 16 nov. El pago real sale de las filas con cobro cargado.</p>
    <p className="t-cuerpo">Tus apps (el pipeline, el dashboard) son aparte: esta planilla se exporta en JSON para sembrarlas.</p>
    <p className="t-nota">Las tarifas y plataformas son {CLIP.datosA}, sin verificar por Trazo.</p>
  </>
);

const ICONO: Record<SubClip, NombreIcono> = { registro: 'documento', campanas: 'meta', cuentas: 'perfil', retainers: 'dinero', metricas: 'grafico', plan: 'plan', nichos: 'paquete', riesgos: 'atencion', semana1: 'cohete' };

export default function ClippingV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const c = useClip(date);
  const hoja = useHojaFila();
  const cob = c.vsMeta?.cobrado ?? 0;
  const meta = c.mes.meta;
  const ahora = c.clip.registro.filter((f) => f.fecha === date);
  const clipsHoy = totales(ahora).clips;
  const delMes = filas(c.clip, { desde: inicioMes(c.nPlan), hasta: date });
  const tot = totales(delMes);
  const esperado = c.vsMeta?.esperado ?? 0;
  const ritmo = c.vsMeta?.ritmo;
  const frase = `Meta ${usd(meta)}${ritmo == null ? '' : ritmo >= 1 ? ' · en ritmo o adelante' : ` · ritmo ${pc(ritmo)}`}`;
  const rutina = c.clip.rutina[lunesDe(date)] ?? [];
  const activas = c.clip.cuentas.filter((x) => x.estado === 'activa').length;
  const retActivos = c.clip.retainers.filter((r) => r.estado === 'activo').length;

  const valor: Record<SubClip, string | undefined> = {
    registro: `${delMes.length} este mes`, campanas: String(c.clip.campanas.length), cuentas: `${activas} ${activas === 1 ? 'activa' : 'activas'}`,
    retainers: `${retActivos} ${retActivos === 1 ? 'activo' : 'activos'}`, metricas: undefined, plan: `Mes ${c.nPlan}`, nichos: String(CLIP.nichos.length),
    riesgos: `${rutina.length} de ${CLIP.rutina.length}`, semana1: undefined,
  };
  const nota: Record<SubClip, string> = {
    registro: 'Clips y views de cada día', campanas: 'Tarifa listada y pago real', cuentas: 'La granja contra el plan', retainers: 'El fijo y la prospección', metricas: 'Todos los gráficos',
    plan: 'Fases, meses y criterios', nichos: 'Riesgo y derechos', riesgos: 'La rutina de la semana y el plan B', semana1: 'GTA 6 y las plataformas para probar',
  };

  const ind = [
    { k: 'Pago por 1.000 views', v: usd2(pagoReal(delMes)), u: 'USD' },
    { k: 'Aprobación', v: pc(aprobacion(delMes)), sub: `${tot.aprobados} de ${tot.clipsConAprobados} clips` },
    { k: 'Clips por día', v: n1(c.vsPlan?.clipsDia ?? 0) },
    { k: 'Cuentas activas', v: String(c.vsPlan?.cuentas ?? 0), sub: `plan ${c.mes.cuentas}` },
  ];

  return (
    <Marco className="cl" titulo="Clipping" rotulo={rotuloMes(c.n)} volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      <Tarjeta heroe area={AREA} className="cl-hero" etiqueta="Este mes">
        <div className="cl-hero-fila">
          <Dato grande valor={<Numero valor={cob} />} unidad="USD" etiqueta="Cobrado este mes" />
          <div className="cl-anillo" data-grafico><Anillo valor={meta ? cob / meta : 0} tamano={104} sub="del mes" area={AREA} nombre="Cobrado contra la meta del mes" /></div>
        </div>
        {c.vsMeta && <Ritmo tiempo={c.vsMeta.diasHechos / c.vsMeta.diasTotal} trabajo={meta ? cob / meta : 0} nombre="Lo cobrado contra el tiempo del mes" pie="tiempo" frase={frase} area={AREA} />}
        <div className="cl-hoy">
          <Dato valor={clipsHoy} unidad={`de ${c.mes.clipsDia}`} etiqueta="Clips hoy" />
        </div>
        <Boton variante="primario" ancho icono="mas" onClick={() => hoja.abrir()}>Registrar clips</Boton>
      </Tarjeta>

      {c.vacio ? (
        <Vacio ilustracion="clip" titulo="Arrancá la planilla" texto="Cargá tu primera campaña y tus cuentas." accion={<Boton href="#/metas/clipping/campanas">Cargar una campaña</Boton>} />
      ) : (
        <Grupo titulo="Este mes">
          <Tarjeta capa={1} className="cl-ind" etiqueta="Indicadores del mes">
            {ind.map((x) => (
              <div key={x.k} className="cl-ind-uno">
                <Dato valor={x.v} unidad={x.u} etiqueta={x.k} />
                {x.sub && <small className="t-nota">{x.sub}</small>}
              </div>
            ))}
          </Tarjeta>
        </Grupo>
      )}

      <Grupo titulo="Para decidir">
        <div className="capa-1 s-lista">
          {c.puerta && (
            <FilaHoja icono="meta" titulo={c.puerta.titulo} valor={<LuzClip luz={c.puerta.luz} />} tituloHoja={c.puerta.titulo}>
              <ul className="cl-chequeos">
                {c.puerta.chequeos.map((q) => (
                  <li key={q.texto} className={q.ok == null ? '' : q.ok ? 'ok' : 'no'}>
                    <Icono nombre={q.ok == null ? 'menos' : q.ok ? 'tilde' : 'cerrar'} lado={18} />
                    <span>{q.texto}<small className="t-nota">{q.ok == null ? 'Sin datos todavía' : q.ok ? 'Cumplido' : 'Falta'}</small></span>
                    <b className="t-dato">{q.valor}</b>
                  </li>
                ))}
              </ul>
              <p className="t-cuerpo">{c.puerta.texto}</p>
            </FilaHoja>
          )}
          <FilaHoja icono="plan" titulo={c.mes.titulo} nota={`${usd(meta)} · ${c.mes.cuentas} cuentas · ${c.mes.clipsDia} clips por día`} tituloHoja={`Mes ${c.nPlan} del roadmap`}>
            <div className="cl-mes">
              <p className="t-cuerpo">{c.fase.objetivo}</p>
              <p className="t-cuerpo">{c.mes.foco}</p>
              <span className="t-rotulo">Tareas del mes</span>
              <ul className="cl-lista">{c.mes.tareas.map((t) => <li key={t}>{t}</li>)}</ul>
              {c.mes.metrica && <p className="t-nota">Se mide con: {c.mes.metrica.charAt(0).toLowerCase()}{c.mes.metrica.slice(1)}</p>}
              <p className="t-nota">{fc(inicioMes(c.nPlan))} a {fc(finMes(c.nPlan))}{c.vsMeta ? ` · esperado a hoy ${usd(esperado)}` : ''}</p>
            </div>
          </FilaHoja>
          <Fila icono="grafico" titulo="Camino a USD 10k" href="#/metas/clipping/metricas"
            nota={c.proy ? `Hoy ${usd(cob)} por mes. Con tu ritmo, el mes 12 cierra en ${usd(c.proy.mes12)}${c.proy.falta ? ` y faltan ${usd(c.proy.falta)}` : ': pasás los USD 10k'}.` : `Hoy ${usd(cob)} por mes. La proyección aparece con el primer cobro.`} />
        </div>
      </Grupo>

      <Grupo titulo="Secciones">
        <div className="capa-1 s-lista">
          {subsVisibles(date).map(([id, nombre]) => <Fila key={id} icono={ICONO[id]} titulo={nombre} nota={nota[id]} valor={valor[id]} href={`#/metas/clipping/${id}`} />)}
        </div>
      </Grupo>

      <HojaFila {...hoja.props} hoy={date} />
    </Marco>
  );
}
