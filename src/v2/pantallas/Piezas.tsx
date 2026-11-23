/** Trazo 2.0 · #/v2/piezas: avisos, hojas, confirmación, lectura del avance, esqueletos y vacíos (tanda 1.5), vivos. */
import { useEffect, useState, type ReactNode } from 'react';
import { Boton } from '../kit/controles';
import { aviso, confirmar } from '../kit/capas';
import { Hoja, Info, Termino } from '../kit/hoja';
import { Anillo, Barra, ConCarga, Dato, EsqueletoLista, EsqueletoTarjeta, Estado, Fila, Pista, Ritmo, Tarjeta, Vacio } from '../kit/superficies';
import { Icono } from '../iconos';

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="mu-seccion" aria-label={titulo}>
      <div className="mu-cabeza"><h2 className="t-rotulo">{titulo}</h2>{nota && <span className="t-rotulo">{nota}</span>}</div>
      {children}
    </section>
  );
}

export default function Piezas() {
  const [hoja, setHoja] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [hecho, setHecho] = useState(0.62);
  const [borrado, setBorrado] = useState<string | null>(null);
  useEffect(() => { if (!cargando) return; const t = setTimeout(() => setCargando(false), 1800); return () => clearTimeout(t); }, [cargando]);
  const borrar = async () => {
    const si = await confirmar({ titulo: '¿Borrar el pomodoro "Clásico"?', texto: 'Se borra de tus formatos. Lo que ya estudiaste con él queda.', accion: 'Borrar', peligro: true });
    setBorrado(si ? 'Borrado' : 'Cancelado');
    if (si) aviso({ titulo: 'Pomodoro borrado', tono: 'info', deshacer: () => setBorrado('Recuperado') });
  };
  return (
    <>
      <Seccion titulo="Héroe y datos" nota="un héroe por pantalla">
        <Tarjeta heroe area="var(--a-ing)" etiqueta="PetrIA v1.0">
          <div className="pz-heroe">
            <Anillo nombre="PetrIA v1.0" valor={hecho} tamano={112} sub="hecho" area="var(--a-ing)" />
            <div className="pz-heroe-texto">
              <span className="t-rotulo">Fase 1 · bloque P1</span>
              <b className="t-seccion">PetrIA v1.0</b>
              <Estado estado={hecho >= 1 ? 'hecho' : 'atrasado'} />
            </div>
          </div>
          <Ritmo nombre="Ritmo de PetrIA v1.0" tiempo={0.74} trabajo={hecho} area="var(--a-ing)" frase={hecho >= 0.64 ? 'Vas en plan.' : 'Vas 1 día atrás: hoy tocan 2 lotes.'} />
          <div className="pz-botones">
            <Boton tamano="s" icono="menos" onClick={() => setHecho((x) => Math.max(0, +(x - 0.12).toFixed(2)))}>Menos</Boton>
            <Boton tamano="s" icono="mas" onClick={() => setHecho((x) => Math.min(1, +(x + 0.12).toFixed(2)))}>Más</Boton>
          </div>
        </Tarjeta>
        <div className="pz-datos capa-1">
          <Dato valor="193,5" unidad="h" etiqueta="Planificadas" />
          <Dato valor="12" etiqueta="Racha" unidad="días" delta={{ valor: '+3', sentido: 'sube', nota: 'esta semana' }} />
          <Dato valor="8" etiqueta="Para el límite" unidad="días" />
        </div>
        <div className="capa-1 pz-barras">
          <div><span className="t-nota">Postulaciones · 12 de 35</span><Barra nombre="Postulaciones" valor={12} max={35} /></div>
          <div><span className="t-nota">Lotes · 11 de 11</span><Barra nombre="Lotes" valor={11} max={11} /></div>
        </div>
      </Seccion>

      <Seccion titulo="Estados">
        <div className="pz-fila">{(['proximo', 'en-plan', 'adelantado', 'pausado', 'atrasado', 'vencido', 'hecho'] as const).map((e) => <Estado key={e} estado={e} />)}</div>
      </Seccion>

      <Seccion titulo="Filas">
        <div className="capa-1 s-lista">
          <Fila icono="ajustes" titulo="Ajustes" nota="Tema oscuro · 6 áreas · rutinas" href="#/ajustes" />
          <Fila icono="calendario" titulo="Próxima fecha límite" nota="v1.0 MVP" valor="1 dic" />
          <Fila area="var(--a-idi)" titulo="Inglés · modo entrevista" nota="16:30 · 30 min" extremo={<Estado estado="en-plan" />} />
        </div>
      </Seccion>

      <Seccion titulo="Avisos y confirmación" nota="abajo, sobre la barra">
        <div className="pz-fila">
          <Boton tamano="s" icono="tilde" onClick={() => aviso({ titulo: 'Lote 1.1 hecho', sub: '+0,43 % de mejora hoy', tono: 'hecho' })}>Hecho</Boton>
          <Boton tamano="s" icono="info" onClick={() => aviso({ titulo: 'Copia guardada', sub: 'trazo-2026-11-23.json' })}>Info</Boton>
          <Boton tamano="s" icono="atencion" onClick={() => aviso({ titulo: 'PetrIA va atrasada', sub: 'Trazo sugiere correr lo que sigue.', tono: 'atencion', accion: { etiqueta: 'Ver', run: () => {} } })}>Atención</Boton>
          <Boton tamano="s" icono="alerta" onClick={() => aviso({ titulo: 'No se pudo leer el archivo', sub: 'Tus datos están bien. Probá con otro JSON.', tono: 'error' })}>Error</Boton>
        </div>
        <div className="pz-fila">
          <Boton variante="peligro" icono="borrar" onClick={borrar}>Borrar pomodoro</Boton>
          {borrado && <span className="t-nota">{borrado}</span>}
        </div>
        <p className="t-nota">Deslizá un aviso hacia el costado para sacarlo. Con el dedo encima, no se va.</p>
      </Seccion>

      <Seccion titulo="Hoja y ⓘ" nota="arrastrá para cerrar o agrandar">
        <div className="pz-fila">
          <Boton icono="opciones" onClick={() => setHoja(true)}>Abrir hoja</Boton>
          <span className="t-cuerpo-l pz-info">Períodos <Info titulo="Cómo funcionan los períodos"><p className="t-cuerpo-l">Cada meta es un período. La barra dice cuánto trabajo está hecho; la marca, cuánto tiempo pasó.</p><p className="t-cuerpo">Si algo se atrasa, Trazo sugiere correr lo que sigue y no cambia nada hasta que lo confirmes.</p></Info></span>
          <span className="t-cuerpo-l"><Termino termino="Ritmo" /></span>
        </div>
        <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo="Hoy" pie={<><Boton onClick={() => setHoja(false)}>Cerrar</Boton><Boton variante="primario" onClick={() => setHoja(false)}>Listo</Boton></>}>
          <div className="s-lista capa-2">
            <Fila icono="pomodoro" titulo="Pomodoros" nota="4 formatos" onClick={() => setHoja(false)} />
            <Fila icono="json" titulo="JSON del día" nota="Para el repo" onClick={() => setHoja(false)} />
            <Fila icono="importar" titulo="Importar" nota="Lo que te devuelve Claude" onClick={() => setHoja(false)} />
            <Fila icono="calendario" titulo="Adaptar el día" nota="Mover lo flexible" onClick={() => setHoja(false)} />
          </div>
        </Hoja>
      </Seccion>

      <Seccion titulo="Pista">
        <div className="pz-fila">
          <Pista texto="Semana 1 de 52 del plan"><span className="pz-chip-dato"><Icono nombre="calendario" lado={16} /><span className="t-dato">1/52</span></span></Pista>
          <span className="t-nota">Pasá el mouse o mantené apretado.</span>
        </div>
      </Seccion>

      <Seccion titulo="Esqueletos" nota="mientras carga">
        <Boton tamano="s" icono="repaso" onClick={() => setCargando(true)}>Cargar de nuevo</Boton>
        <ConCarga cargando={cargando} nombre="el plan" esqueleto={<div className="pz-pila"><EsqueletoTarjeta /><EsqueletoLista filas={3} /></div>}>
          <div className="pz-pila">
            <Tarjeta><div className="pz-heroe"><Anillo nombre="Fase 1" valor={0.04} tamano={64} grosor={7} /><div className="pz-heroe-texto"><b className="t-encabezado">Fase 1 · AI Full-stack</b><span className="t-nota">21 nov – 14 ene · 4 % hecho</span></div></div></Tarjeta>
            <div className="capa-1 s-lista">
              <Fila area="var(--a-ing)" titulo="PetrIA" nota="21 nov – 9 dic" extremo={<Estado estado="atrasado" />} />
              <Fila area="var(--a-ing)" titulo="Claude Architect" nota="10 – 12 dic" extremo={<Estado estado="proximo" />} />
              <Fila area="var(--a-economia)" titulo="Math W1" nota="15 ene – 3 feb" extremo={<Estado estado="proximo" />} />
            </div>
          </div>
        </ConCarga>
      </Seccion>

      <Seccion titulo="Vacíos" nota="qué es + una acción">
        <div className="capa-1"><Vacio ilustracion="plan" titulo="Todavía sin metas para P10" texto="Armalas a mano o importalas con un JSON." accion={<Boton variante="primario" icono="mas">Agregar meta</Boton>} /></div>
      </Seccion>
    </>
  );
}
