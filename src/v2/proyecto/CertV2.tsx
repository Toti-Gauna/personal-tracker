/**
 * Trazo 2.0 · una certificación (#/metas/cert/<id>): la cuenta regresiva al examen con su fecha (se reserva y queda fija),
 * si estás listo según los simulacros, el plan día por día (hoy resaltado), los recursos, el resultado y la renovación.
 * En la 1.0 el "examen en N días" y la fecha aparecían tres veces; acá una sola vez, arriba.
 */
import { useState } from 'react';
import { certV12, estadoCert } from '../../data/certs-v12';
import { claveHito } from '../../data/periodos-plan';
import { cargarMock, marcarHito, reservarExamen } from '../../state/plan';
import { useStore } from '../../state/store';
import { fp } from '../../ui/periodos';
import { Icono } from '../iconos';
import { tituloCorto } from './datos';
import { Boton, CampoFecha, CampoTexto, Casilla } from '../kit/controles';
import { Anillo, Estado, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { FilaHoja } from './piezas';
import { Portada } from './Portada';
import './proyecto.css';
import { cuantos } from '../reglas';

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada certificación tiene un examen en una fecha.</p>
    <p className="t-cuerpo">Cuando reservás el turno, la fecha queda fija: nada del plan la corre.</p>
    <p className="t-cuerpo">Para estar listo, el mejor de tus dos últimos simulacros tiene que llegar al puntaje que pide cada certificación.</p>
  </>
);

export function CertV2({ id, hoy }: { id: string; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const c = certV12(id);
  const [pct, setPct] = useState('');
  const [fecha, setFecha] = useState<string | null>(() => plan.reservas?.[id]?.examen ?? c?.examen ?? hoy);
  if (!c) {
    return (
      <Marco titulo="Certificación" volver={{ href: '#/metas', nombre: 'Plan' }}>
        <Vacio ilustracion="buscar" titulo="No hay una certificación con ese nombre" accion={<Boton variante="primario" href="#/metas">Ir al plan</Boton>} />
      </Marco>
    );
  }
  const e = estadoCert(c, plan, hoy);
  const n = Number(pct.replace(',', '.'));
  const valido = pct.trim() !== '' && n >= 0 && n <= 100;
  const numerica = typeof e.meta === 'number';
  const avance = numerica && e.ultimo != null ? Math.min(1, e.ultimo / (e.meta as number)) : 0;
  const cargar = () => { if (valido) { cargarMock(id, hoy, n); setPct(''); } };
  return (
    <Marco className="pt" titulo={tituloCorto(c.nombre)} info={INFO} volver={{ href: `#/metas/proyecto/${c.bloque}`, nombre: c.bloqueNombre }}>
      <Portada id={id} tipo="cert" area="var(--a-ing)">
        {e.aprobada ? (
          <>
            <span className="t-rotulo">Aprobada</span>
            <div className="pt-hero-fila"><Estado estado="hecho" /><span className="t-dato">{fp(e.aprobada)}</span></div>
          </>
        ) : (
          <>
            <span className="t-rotulo">Examen · {fp(e.examen)}</span>
            <div className="pt-cuenta">
              {e.diasAlExamen >= 0
                ? <><b className="t-heroe"><Numero valor={e.diasAlExamen} /></b><span className="t-cuerpo-l">{e.diasAlExamen === 1 ? 'día' : 'días'}</span></>
                : <span className="t-titulo">Examen pasado</span>}
              {e.reservado && <span className="s-estado"><Icono nombre="candado" lado={16} />Reservado</span>}
            </div>
          </>
        )}
      </Portada>
      {tituloCorto(c.nombre) !== c.nombre && <p className="t-cuerpo-l pt-que">{c.nombre}</p>}
      {e.hoy && <Tarjeta className="pt-hoy" area="var(--a-ing)"><p className="t-rotulo">Hoy</p><p className="t-cuerpo-l">{e.hoy.texto}</p></Tarjeta>}

      <Grupo titulo="Estás listo cuando" extremo={e.listo ? <span className="t-rotulo">Listo</span> : undefined}>
        <Tarjeta className="pt-listo">
          {numerica ? (
            <>
              <Anillo valor={avance} tamano={92} grosor={8} etiqueta={e.ultimo != null ? `${e.ultimo}` : '—'} sub="%" area="var(--a-ing)" nombre={e.ultimo != null ? `Mejor de los últimos dos simulacros: ${e.ultimo} %` : 'Sin simulacros'} />
              <div className="pt-listo-texto">
                <p className="t-cuerpo-l">{e.ultimo == null ? 'Todavía sin simulacros.' : e.listo ? 'Llegaste al puntaje.' : (e.meta as number) - e.ultimo === 1 ? 'Falta 1 punto.' : `Faltan ${(e.meta as number) - e.ultimo} puntos.`}</p>
                <p className="t-nota">La meta es {e.meta as number} % sostenido en dos simulacros.</p>
              </div>
            </>
          ) : <p className="t-cuerpo-l">{e.meta ?? 'Sin criterio'}</p>}
        </Tarjeta>
        {e.mocks.length > 0 && <div className="pt-chips pt-mocks">{e.mocks.map((m, i) => <span key={i} className="hy-chip"><b className="t-dato">{m.pct} %</b> <small>{fp(m.fecha)}</small></span>)}</div>}
        <div className="pt-campo-hoja pt-cargar">
          <CampoTexto etiqueta="Puntaje del simulacro (%)" valor={pct} onCambio={setPct} modo="decimal" />
          <div className="pt-acciones">
            <Boton variante="primario" deshabilitado={!valido} onClick={cargar}>Cargar simulacro</Boton>
            {e.mocks.length > 0 && <Boton variante="fantasma" icono="deshacer" onClick={() => cargarMock(id, hoy, null)}>Borrar el último</Boton>}
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Fecha del examen">
        <div className="capa-1 pt-reserva">
          <CampoFecha etiqueta="Fecha del turno" valor={fecha} onCambio={setFecha} hoy={hoy} nota={e.reservado ? 'Reservada: es una fecha fija, nada la corre.' : 'Sin reservar. Al reservarla, queda fija.'} />
          <div className="pt-acciones">
            <Boton variante={e.reservado ? 'secundario' : 'primario'} icono="candado" deshabilitado={!fecha || (e.reservado && fecha === e.examen)} onClick={() => fecha && reservarExamen(id, fecha, hoy)}>{e.reservado ? 'Cambiar la reserva' : 'Reservé para esa fecha'}</Boton>
            {e.reservado && <Boton variante="fantasma" icono="deshacer" onClick={() => reservarExamen(id, null, hoy)}>Deshacer</Boton>}
          </div>
          {c.fallback && <p className="t-nota">Si no llegás: {c.fallback}.</p>}
        </div>
      </Grupo>

      <Grupo titulo="Resultado">
        <div className="capa-1 pt-check">
          <Casilla marcada={!!e.aprobada} etiqueta={e.aprobada ? `Aprobada el ${fp(e.aprobada)}` : 'Aprobada'} nota={e.renovacion ? `${e.renovacion.vence ? `Vence el ${fp(e.renovacion.vence)} · ` : ''}${e.renovacion.nota}` : undefined} onCambio={() => marcarHito(claveHito.cert(id), e.aprobada ? null : hoy)} />
        </div>
      </Grupo>

      <Grupo titulo="Preparación" extremo={<span className="t-rotulo">{c.horas} h</span>}>
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="El plan día por día" valor={cuantos(c.plan.length, 'paso', 'pasos')}>
            <ol className="capa-1 pt-revs">{c.plan.map((x) => <li key={x.fecha + x.texto} className={x.fecha === hoy ? 'hoy' : undefined}><span className="t-rotulo">{fp(x.fecha)}{x.fecha === hoy ? ' · hoy' : ''}</span><span className="t-cuerpo">{x.texto}</span></li>)}</ol>
          </FilaHoja>
          <FilaHoja icono="documento" titulo="Recursos" valor={`${c.recursos.length}`}>
            <ul className="capa-1 pt-revs">{c.recursos.map((r) => <li key={r}><span className="t-cuerpo">{r}</span></li>)}</ul>
          </FilaHoja>
          {c.miniProyecto && (
            <FilaHoja icono="cohete" titulo="Mini proyecto" valor={fp(c.miniProyecto.fecha)} tituloHoja={c.miniProyecto.nombre}>
              <p className="t-cuerpo pt-pie">{c.miniProyecto.texto}</p>
            </FilaHoja>
          )}
        </div>
        <p className="t-nota pt-pie">{[c.opcional ? 'Opcional' : null, c.requiere ? `Requiere ${c.requiere}` : null, c.costo ? `${c.costo}${c.costoVerificado ? '' : ' (sin verificar)'}` : null].filter(Boolean).join(' · ')}</p>
      </Grupo>
    </Marco>
  );
}
