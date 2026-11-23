/**
 * Trazo 2.0 · las pistas de fondo (#/metas/pista/secundaria y /comercial) como tarjetas. La secundaria son tus apps, hechas por
 * Claude Code de fondo, una por vez; la comercial son showcases para marcas reales, en un pipeline de cinco estados.
 */
import { useMemo, useState } from 'react';
import { ESTADOS_COMERCIAL, ESTADO_COMERCIAL_TXT, periodosSecundarias, type EstadoComercial } from '../../data/fondo';
import { puntosIman } from '../../data/iman';
import { medir } from '../../data/periodos';
import { V122 } from '../../data/v12-2';
import { useStore } from '../../state/store';
import { Boton, Chip } from '../kit/controles';
import { Estado, Fila } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { rango } from '../plan/datos';
import { areaDe } from '../plan/TarjetaPeriodo';
import { FilaHoja } from './piezas';
import { Portada } from './Portada';
import './proyecto.css';

const INFO_SEC = (
  <>
    <p className="t-cuerpo-l">Tus apps, hechas por Claude Code de fondo, una por vez.</p>
    <p className="t-cuerpo">No usan horas de foco ni suman a las 72 h: se revisan 1 hora por semana, en la revisión del domingo.</p>
  </>
);
const INFO_COM = (
  <>
    <p className="t-cuerpo-l">Showcases premium para marcas reales, uno por ventana que no es proyecto principal.</p>
    <p className="t-cuerpo">Se revisan solo en el cierre del día y en la sesión del fin de semana. Ninguno cae en el PNPT ni dentro de un proyecto principal.</p>
  </>
);

export function PistaV2({ tipo, hoy }: { tipo: string; hoy: string }) {
  const esSec = tipo === 'secundaria';
  return (
    <Marco className="pt" titulo={esSec ? 'Pista secundaria' : 'Pista comercial'} info={esSec ? INFO_SEC : INFO_COM} volver={{ href: '#/metas/fondo', nombre: 'De fondo' }}
      acciones={<Boton tamano="s" variante="fantasma" icono="siguiente" href={`#/metas/pista/${esSec ? 'comercial' : 'secundaria'}`}>{esSec ? 'Comercial' : 'Secundaria'}</Boton>}>
      {esSec ? <Secundarias hoy={hoy} /> : <Comerciales hoy={hoy} />}
    </Marco>
  );
}

function Secundarias({ hoy }: { hoy: string }) {
  const plan = useStore((s) => s.plan);
  const apps = useMemo(() => periodosSecundarias(plan).map((p) => medir(p, hoy)), [plan, hoy]);
  return (
    <>
      <div className="pt-apps">
        {apps.map((a) => {
          const n = puntosIman(plan.iman?.[a.id]).filter((p) => p.ok).length;
          return (
            <a key={a.id} className="capa-1 pt-app" href={`#/metas/fondo/${a.id}`}>
              <Portada id={a.id} area={areaDe(a)} className="pt-mini"><b className="t-encabezado pt-app-nombre">{a.nombre}</b></Portada>
              {' '}<span className="pt-app-pie"><Estado estado={a.estado} />{' '}<span className="t-dato">{rango(a.inicio, a.fin, hoy)}</span>{' '}<span className="t-nota">Imán {n}/8</span></span>
            </a>
          );
        })}
      </div>
      <p className="t-nota pt-pie">Desde el 7 sep 2027 la pista queda libre: se elige el 29 ago.</p>
      <div className="capa-1 s-lista">
        <FilaHoja icono="estrella" titulo="Ver a futuro" valor={String(V122.backlog.length)} tituloHoja="Ver a futuro">
          <ul className="capa-1 pt-revs">{V122.backlog.map((b) => <li key={b.nombre}><span className="t-cuerpo">{b.nombre}{b.destacado ? ' ⭐' : ''}</span></li>)}</ul>
        </FilaHoja>
      </div>
    </>
  );
}

function Comerciales({ hoy }: { hoy: string }) {
  const plan = useStore((s) => s.plan);
  const por = (e: EstadoComercial) => V122.comerciales.filter((c) => (plan.fondo?.[c.id]?.estado ?? 'planned') === e);
  const primero = ESTADOS_COMERCIAL.find((e) => por(e).length > 0) ?? 'planned';
  const [estado, setEstado] = useState<EstadoComercial>(primero);
  const xs = por(estado);
  const [todos, setTodos] = useState(false);
  const leads = V122.comerciales.reduce((s, c) => s + (plan.fondo?.[c.id]?.leads?.length ?? 0), 0);
  return (
    <>
      <div className="pt-etapas" role="group" aria-label="Estado del showcase">
        {ESTADOS_COMERCIAL.map((e) => <Chip key={e} activo={estado === e} onCambio={() => { setEstado(e); setTodos(false); }}>{`${ESTADO_COMERCIAL_TXT[e]} · ${por(e).length}`}</Chip>)}
      </div>
      {xs.length === 0
        ? <p className="capa-1 pt-vacio t-cuerpo">Ninguno por ahora.</p>
        : (
          <div className="capa-1 s-lista">
            {(todos ? xs : xs.slice(0, 4)).map((c) => {
              const marca = c.marca ?? plan.fondo?.[c.id]?.marca;
              const l = plan.fondo?.[c.id]?.leads?.length ?? 0;
              return <Fila key={c.id} icono="paquete" titulo={`#${c.n} · ${marca ?? 'A definir'}`} nota={`${rango(c.inicio, c.fin, hoy)}${plan.fondo?.[c.id]?.pausado ? ' · en pausa' : ''}`} valor={l ? `${l} leads` : undefined} href={`#/metas/fondo/${c.id}`} />;
            })}
          </div>
        )}
      {xs.length > 4 && <div className="pt-acciones"><Boton tamano="s" variante="fantasma" icono={todos ? 'arriba' : 'abajo'} onClick={() => setTodos(!todos)}>{todos ? 'Ver menos' : `Ver los ${xs.length}`}</Boton></div>}
      <p className="t-nota pt-pie">Leads en total: {leads}.</p>
    </>
  );
}
