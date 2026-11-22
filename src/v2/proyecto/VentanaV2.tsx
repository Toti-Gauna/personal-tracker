/**
 * Trazo 2.0 · una ventana de matemática (#/metas/ventana/<id>): sus hitos con el rango de días, el tema y los capítulos del
 * libro que cubren; se tildan de a uno y la ventana no se cierra con hitos sin tildar.
 */
import { claveHito } from '../../data/periodos-plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { marcarHito } from '../../state/plan';
import { useStore } from '../../state/store';
import { fp } from '../../ui/PeriodoTarjeta';
import { Boton } from '../kit/controles';
import { Estado, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { diaMes } from './datos';
import { Lista, hechasDe } from './piezas';
import { Portada } from './Portada';
import './proyecto.css';

const LIBRO: Record<string, string> = { conamat: 'Conamat · Aritmética', 'conamat-algebra': 'Conamat · Álgebra' };

const INFO = (
  <>
    <p className="t-cuerpo-l">Una ventana es un tramo del plan dedicado a matemática.</p>
    <p className="t-cuerpo">Cada hito es un tema con sus capítulos del libro. Tildalo cuando lo puedas hacer sin ayuda.</p>
    <p className="t-cuerpo">La ventana se cierra con todos los hitos tildados; después el test de la puerta (85 %) abre el proyecto siguiente.</p>
  </>
);

export function VentanaV2({ id, hoy }: { id: string; hoy: string }) {
  const hitos = useStore((s) => s.plan.hitos);
  const b = PLAN_EXT.bloques.find((x) => x.id === id);
  if (!b?.hitos?.length) {
    return (
      <Marco titulo="Ventana" volver={{ href: '#/metas', nombre: 'Plan' }}>
        <Vacio ilustracion="plan" titulo="Esa ventana no tiene hitos" accion={<Boton variante="primario" href="#/metas">Ir al plan</Boton>} />
      </Marco>
    );
  }
  const ok = (i: number) => !!hitos[claveHito.mate(id, i)]?.hecho;
  const hechos = b.hitos.filter((_, i) => ok(i)).length;
  const cerrada = hitos[claveHito.bloque(id)]?.hecho;
  const puede = hechos === b.hitos.length;
  return (
    <Marco className="pt" titulo={b.nombre} info={INFO} volver={{ href: `#/metas/proyecto/${id}`, nombre: 'Ventana' }}>
      <Portada id={id} tipo="ventana" area="var(--a-economia)">
        <span className="t-rotulo">Matemática</span>
        <div className="pt-hero-fila">{cerrada ? <Estado estado="hecho" /> : null}<span className="t-dato">{b.fechas ? `${fp(b.fechas.inicio)} – ${fp(b.fechas.fin)}` : ''}</span></div>
      </Portada>
      <Grupo titulo="Hitos" extremo={<span className="t-rotulo">{hechasDe(hechos, b.hitos.length)}</span>}>
        <Lista
          area="var(--a-economia)"
          items={b.hitos.map((h, i) => ({
            clave: String(i),
            etiqueta: h.tema,
            nota: `Días ${h.dias[0]}–${h.dias[1]}${h.hitoAConfirmar ? ' · a confirmar' : ''}`,
            marcada: ok(i),
          }))}
          onCambio={(k) => { const i = Number(k); marcarHito(claveHito.mate(id, i), ok(i) ? null : hoy); }}
        />
      </Grupo>

      <Grupo titulo="Qué tenés que poder hacer">
        <ul className="capa-1 pt-revs">
          {b.hitos.map((h) => (
            <li key={h.tema}>
              <span className="t-rotulo">{h.tema} · {diaMes(h.inicio)} al {diaMes(h.fin)}</span>
              <span className="t-cuerpo">{h.hito}</span>
              {h.capitulos && <span className="t-nota">{LIBRO[h.capitulos.actividad] ?? h.capitulos.actividad}, capítulos {h.capitulos.desde} a {h.capitulos.hasta}{h.capitulosAConfirmar ? ' (a confirmar)' : ''}</span>}
            </li>
          ))}
        </ul>
      </Grupo>

      {b.mate?.salida?.length ? (
        <Grupo titulo="Al cerrar la ventana">
          <ul className="capa-1 pt-revs">{b.mate.salida.map((s) => <li key={s}><span className="t-cuerpo">{s}</span></li>)}</ul>
        </Grupo>
      ) : null}

      <div className="pt-cerrar">
        {cerrada
          ? <><p className="t-cuerpo">Ventana cerrada el {fp(cerrada)}.</p><Boton variante="fantasma" icono="deshacer" onClick={() => marcarHito(claveHito.bloque(id), null)}>Reabrir</Boton></>
          : <Boton variante="primario" icono="tilde" ancho deshabilitado={puede ? false : `Faltan ${b.hitos.length - hechos} ${b.hitos.length - hechos === 1 ? 'hito' : 'hitos'}`} onClick={() => marcarHito(claveHito.bloque(id), hoy)}>Cerrar la ventana</Boton>}
      </div>
    </Marco>
  );
}
