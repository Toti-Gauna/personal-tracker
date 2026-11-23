/**
 * Trazo 2.0 · Compras y trámites (#/metas/compras): el hardware y las cuentas que hay que tener antes de cada fase, y los trámites.
 * Arriba cuánto va hecho y lo próximo que vence; abajo, una fila por fase que abre su lista de casillas. Mismos datos y mismas
 * funciones que la 1.0 (`estadoCompras`, `marcarCompra`): marcar una compra la guarda con su fecha, desmarcarla la borra.
 */
import { cuenta, estadoCompras, type EstadoFase } from '../../data/compras';
import { marcarCompra } from '../../state/plan';
import { useStore } from '../../state/store';
import { Anillo, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja, Lista, hechasDe } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, dma, fh } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Lo que hay que comprar o tramitar antes de cada fase.</p>
    <p className="t-cuerpo">Cada fase trae la fecha límite del roadmap y el proyecto que lo necesita. Trazo te avisa 30 días antes con lo que falta; los trámites, desde ya.</p>
    <p className="t-cuerpo">Lo diferido y lo opcional se ven, pero no cuentan como pendiente.</p>
  </>
);

/** Cuándo vence una fase, en pocas palabras. */
function cuandoDe(f: EstadoFase, hoy: string): string {
  if (f.antes == null) return f.periodo ?? 'Arrancar ya';
  const fecha = fh(f.antes, hoy);
  return f.dias! < 0 && f.pendientes ? `Venció el ${fecha}` : `Antes del ${fecha}`;
}

function Fase({ f, hoy }: { f: EstadoFase; hoy: string }) {
  const vencida = f.pendientes > 0 && f.dias != null && f.dias < 0;
  const verbo = f.id === 'tramites' ? 'Hecho' : 'Comprado';
  return (
    <FilaHoja icono={f.id === 'tramites' ? 'documento' : 'hardware'} titulo={f.nombre} nota={<span className={vencida ? 'tr-vencida' : undefined}>{cuandoDe(f, hoy)}</span>} valor={<Anillo nombre={`${f.nombre}: ${hechasDe(f.total - f.pendientes, f.total)}`} valor={f.total ? (f.total - f.pendientes) / f.total : 0} tamano={30} grosor={5} area={AREA.programacion} etiqueta="" />} tituloHoja={f.nombre}>
      <p className="t-cuerpo pt-pie">Para {f.para}.</p>
      <Lista
        items={f.items.map((i) => ({
          clave: i.id,
          etiqueta: i.nombre,
          nota: [i.costo, i.nota, i.propuesta ? 'Propuesta a confirmar (†)' : null, i.opcional ? 'Opcional' : null, i.diferido ? `Diferido: ${i.diferido}` : null, i.hecho ? `${verbo} el ${dma(i.hecho.fecha)}` : null].filter(Boolean).join(' · ') || undefined,
          marcada: !!i.hecho,
        }))}
        onCambio={(k) => { const i = f.items.find((x) => x.id === k)!; marcarCompra(k, i.hecho ? null : { fecha: hoy }); }}
      />
      {f.items.some((i) => !cuenta(i)) && <p className="t-nota pt-pie">Lo diferido y lo opcional no cuentan como pendiente.</p>}
    </FilaHoja>
  );
}

export default function ComprasV2({ today }: PropsV2) {
  const plan = useStore((s) => s.plan);
  const fases = estadoCompras(plan, today);
  const total = fases.reduce((s, f) => s + f.total, 0);
  const pendientes = fases.reduce((s, f) => s + f.pendientes, 0);
  const proxima = fases.filter((f) => f.pendientes > 0 && f.antes != null).sort((a, b) => a.antes!.localeCompare(b.antes!))[0];
  return (
    <Marco className="tr" titulo="Hardware y trámites" volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe area={AREA.programacion} etiqueta="Cómo van las compras" className="tr-heroe">
        <div className="tr-heroe-fila">
          <Anillo nombre={`${total - pendientes} de ${total} compras y trámites hechos`} valor={total ? (total - pendientes) / total : 0} tamano={96} area={AREA.programacion} etiqueta={String(pendientes)} sub={pendientes === 1 ? 'falta' : 'faltan'} />
          <p className="t-cuerpo-l">
            {proxima ? (proxima.dias! < 0 ? `${proxima.nombre} venció el ${dm(proxima.antes!)}.` : `${proxima.nombre} vence el ${dm(proxima.antes!)}.`) : pendientes ? 'Los trámites, desde ya.' : 'Todo al día.'}
          </p>
        </div>
      </Tarjeta>

      <Grupo titulo="Por fase">
        <div className="capa-1 s-lista">
          {fases.map((f) => <Fase key={f.id} f={f} hoy={today} />)}
        </div>
      </Grupo>
    </Marco>
  );
}
