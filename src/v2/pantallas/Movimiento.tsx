/** Trazo 2.0 · #/v2/movimiento: el sistema de movimiento vivo (tanda 1.6). Tocá una tarjeta: crece hasta su pantalla. */
import { useRef, useState, type ReactNode } from 'react';
import { Boton, Casilla } from '../kit/controles';
import { Anillo, Estado, Fila } from '../kit/superficies';
import { Escalonado, Numero } from '../movimiento/componentes';
import { festejar, inferirTransicion, nombreTransicion, reducido } from '../movimiento/movimiento';

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="mu-seccion" aria-label={titulo}>
      <div className="mu-cabeza"><h2 className="t-rotulo">{titulo}</h2>{nota && <span className="t-rotulo">{nota}</span>}</div>
      {children}
    </section>
  );
}

const BLOQUES = [
  { id: 'P1', nombre: 'PetrIA', fechas: '21 nov – 9 dic', valor: 0.11, area: 'var(--a-ing)', estado: 'atrasado' as const },
  { id: 'CW1', nombre: 'Claude Architect', fechas: '10 – 12 dic', valor: 0, area: 'var(--a-ing)', estado: 'proximo' as const },
  { id: 'W1', nombre: 'Math W1', fechas: '15 ene – 3 feb', valor: 0, area: 'var(--a-economia)', estado: 'proximo' as const },
];

const EJEMPLOS: [string, string][] = [['#/metas/periodos', '#/metas/periodos/P1'], ['#/metas/periodos/P1', '#/metas/periodos'], ['#/hoy', '#/estudio'], ['#/metas/linea', '#/metas/periodos']];

/** El detalle de un bloque: su héroe lleva el mismo nombre de transición que la tarjeta, y por eso "crece" desde ella. */
function Detalle({ id }: { id: string }) {
  const b = BLOQUES.find((x) => x.id === id) ?? BLOQUES[0];
  return (
    <>
      <a className="mv-volver" href="#/v2/movimiento" data-transicion="zoom-out">Movimiento</a>
      <div className="capa-heroe s-tarjeta mv-heroe" style={{ viewTransitionName: nombreTransicion(b.id), ['--area' as string]: b.area }}>
        <Anillo nombre={b.nombre} valor={b.valor} tamano={132} sub="hecho" area={b.area} />
        <span className="t-rotulo">Bloque {b.id} · {b.fechas}</span>
        <b className="t-titulo">{b.nombre}</b>
        <Estado estado={b.estado} />
      </div>
      <Escalonado className="capa-1 s-lista mv-detalle-lista" clave={b.id}>
        <Fila icono="calendario" titulo="Próxima fecha límite" valor="1 dic" />
        <Fila icono="reloj" titulo="Horas" nota="plan 193,5 h" valor="0 h" />
        <Fila icono="paquete" titulo="Versiones" nota="v0.1 · v1.0 · v1.1 · v2.0 · v3.0" />
      </Escalonado>
      <p className="t-nota">Volver hace el camino inverso: el héroe se achica hasta su tarjeta.</p>
    </>
  );
}

export default function Movimiento({ sub }: { sub?: string }) {
  const [horas, setHoras] = useState(193.5);
  const [racha, setRacha] = useState(12);
  const [mejora, setMejora] = useState(1.28);
  const [vuelta, setVuelta] = useState(0);
  const [hecho, setHecho] = useState(0.9);
  const [tildes, setTildes] = useState([false, false, false]);
  const anillo = useRef<HTMLDivElement>(null);
  if (sub) return <Detalle id={sub} />;
  return (
    <>
      <Seccion titulo="Pantallas" nota="tocá una tarjeta">
        <div className="mv-tarjetas">
          {BLOQUES.map((b) => (
            <a key={b.id} className="s-tarjeta capa-1 s-tocable mv-tarjeta" href={`#/v2/movimiento/${b.id}`} data-transicion="zoom-in" style={{ viewTransitionName: nombreTransicion(b.id), ['--area' as string]: b.area }}>
              <Anillo nombre={b.nombre} valor={b.valor} tamano={48} grosor={6} area={b.area} etiqueta=" " />
              <span className="mv-tarjeta-texto"><b className="t-encabezado">{b.nombre}</b><small className="t-nota">{b.fechas}</small></span>
              <Estado estado={b.estado} />
            </a>
          ))}
        </div>
        <ul className="capa-1 mu-lista mv-direcciones">
          {EJEMPLOS.map(([a, b]) => <li key={a + b}><span className="t-nota t-dato">{a.slice(2)} → {b.slice(2)}</span><span className="t-rotulo">{inferirTransicion(a, b)}</span></li>)}
        </ul>
        <p className="t-nota">Más hondo entra desde la derecha; volver, desde la izquierda; las pestañas se funden. La barra de abajo no se mueve.</p>
      </Seccion>

      <Seccion titulo="Números" nota="cuentan hasta su valor">
        <div className="capa-1 mv-numeros">
          <div><b className="t-heroe"><Numero valor={horas} decimales={1} /></b><span className="t-rotulo">horas</span></div>
          <div><b className="t-heroe"><Numero valor={racha} /></b><span className="t-rotulo">racha</span></div>
          <div><b className="t-heroe"><Numero valor={mejora} decimales={2} prefijo="+" sufijo=" %" /></b><span className="t-rotulo">mejora</span></div>
        </div>
        <div className="pz-fila">
          <Boton tamano="s" icono="mas" onClick={() => { setHoras((h) => +(h + 12.5).toFixed(1)); setRacha((r) => r + 1); setMejora((m) => +(m + 0.43).toFixed(2)); }}>Sumar</Boton>
          <Boton tamano="s" icono="repaso" onClick={() => { setHoras(0); setRacha(0); setMejora(0); }}>A cero</Boton>
        </div>
      </Seccion>

      <Seccion titulo="Listas" nota="entran escalonadas">
        <Boton tamano="s" icono="repaso" onClick={() => setVuelta((v) => v + 1)}>Repetir</Boton>
        <Escalonado className="capa-1 s-lista" clave={vuelta}>
          {['Rutina de la mañana', 'Bloque 1 · deep focus', 'Abi + correr', 'Trabajo actual', 'Programación · PetrIA', 'Búsqueda laboral'].map((t, i) => <Fila key={t} area={['var(--a-rutina)', 'var(--a-ing)', 'var(--a-salud)', 'var(--a-eclipse)', 'var(--a-ing)', 'var(--a-economia)'][i]} titulo={t} nota={['04:00', '04:30', '08:30', '10:00', '12:00', '13:30'][i]} />)}
        </Escalonado>
      </Seccion>

      <Seccion titulo="Festejo" nota="terminar algo se siente">
        <div className="capa-1 kt-lista">
          {['Lote 1.1 · Ingest & cleaning', 'Inglés · modo entrevista', 'Dormir a las 21:00'].map((t, i) => (
            <Casilla key={t} etiqueta={t} marcada={tildes[i]} onCambio={(v) => setTildes(tildes.map((x, j) => (j === i ? v : x)))} area={['var(--a-ing)', 'var(--a-idi)', 'var(--a-salud)'][i]} />
          ))}
        </div>
        <div className="capa-1 mv-terminar">
          <div ref={anillo}><Anillo nombre="v1.0 MVP" valor={hecho} tamano={88} grosor={8} area="var(--a-ing)" /></div>
          <div className="pz-pila">
            <b className="t-encabezado">v1.0 MVP</b>
            <Boton variante="primario" tamano="s" icono="tilde" deshabilitado={hecho >= 1 ? 'Ya está hecha.' : false} onClick={() => { setHecho(1); festejar(anillo.current, { cantidad: 14, alcance: 64 }); }}>Terminar versión</Boton>
            {hecho >= 1 && <Boton tamano="s" variante="fantasma" icono="deshacer" onClick={() => setHecho(0.9)}>Deshacer</Boton>}
          </div>
        </div>
      </Seccion>

      <p className="t-nota mv-reducido">Movimiento reducido del teléfono: {reducido() ? 'prendido · todo pasa a un fundido corto' : 'apagado'}.</p>
    </>
  );
}
