/** Trazo 2.0 · #/v2/kit: la galería de controles (tanda 1.4), todos vivos y con estado. */
import { useState, type ReactNode } from 'react';
import { Boton, CampoFecha, CampoHora, CampoTexto, Casilla, Chip, Contador, Interruptor, Segmentado, Selector } from '../kit/controles';
import '../tokens.css';
import '../base.css';
import './lenguaje.css';

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="mu-seccion" aria-label={titulo}>
      <div className="mu-cabeza"><h2 className="t-rotulo">{titulo}</h2>{nota && <span className="t-rotulo">{nota}</span>}</div>
      {children}
    </section>
  );
}

export default function Kit({ hoy }: { hoy: string }) {
  const [cargando, setCargando] = useState(false);
  const [metas, setMetas] = useState({ a: true, b: false, c: false });
  const [sonido, setSonido] = useState(true);
  const [vibra, setVibra] = useState(false);
  const [vista, setVista] = useState<'semana' | 'mes' | 'anio'>('semana');
  const [areas, setAreas] = useState<string[]>(['ing']);
  const [peso, setPeso] = useState<number | null>(null);
  const [series, setSeries] = useState<number | null>(3);
  const [nombre, setNombre] = useState('');
  const [link, setLink] = useState('github.com/toti');
  const [despierta, setDespierta] = useState('04:00');
  const [duerme, setDuerme] = useState('21:00');
  const [examen, setExamen] = useState<string | null>(null);
  const [rutina, setRutina] = useState<'completo' | 'corto' | 'tarde' | null>('completo');
  const probar = () => { setCargando(true); setTimeout(() => setCargando(false), 1600); };
  const linkMal = link.trim() !== '' && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(link.trim());
  return (
    <>
      <Seccion titulo="Botones" nota="4 variantes · 2 tamaños">
        <div className="capa-1 kt-pila">
          <Boton variante="primario" icono="tilde" onClick={probar} cargando={cargando}>{cargando ? 'Guardando' : 'Guardar peso'}</Boton>
          <Boton icono="exportar">Exportar</Boton>
          <Boton variante="fantasma" icono="deshacer">Deshacer</Boton>
          <Boton variante="peligro" icono="borrar">Borrar</Boton>
          <div className="kt-fila">
            <Boton tamano="s" icono="mas">Meta</Boton>
            <Boton tamano="s" variante="fantasma">Hoy no</Boton>
            <Boton soloIcono icono="ajustes" etiqueta="Ajustes" />
            <Boton soloIcono icono="opciones" etiqueta="Más opciones" variante="fantasma" />
          </div>
          <Boton variante="primario" ancho deshabilitado="Cargá el peso para guardarlo.">Guardar peso</Boton>
        </div>
        <p className="t-nota">Deshabilitado nunca es gris lleno: se apaga y dice por qué.</p>
      </Seccion>

      <Seccion titulo="Casillas" nota="hecho = el trazo">
        <div className="capa-1 kt-lista">
          <Casilla marcada={metas.a} onCambio={(v) => setMetas({ ...metas, a: v })} etiqueta="Lote 1.1 · Ingest & cleaning" nota="programación · 2 h" area="var(--a-ing)" />
          <Casilla marcada={metas.b} onCambio={(v) => setMetas({ ...metas, b: v })} etiqueta="Inglés · modo entrevista" nota="16:30 · 30 min" area="var(--a-idi)" />
          <Casilla marcada={metas.c} onCambio={(v) => setMetas({ ...metas, c: v })} etiqueta="Dormir a las 21:00" area="var(--a-salud)" />
          <Casilla marcada={false} onCambio={() => {}} etiqueta="Examen (se habilita el 12 dic)" deshabilitada />
        </div>
      </Seccion>

      <Seccion titulo="Interruptores">
        <div className="capa-1 kt-lista">
          <Interruptor prendido={sonido} onCambio={setSonido} etiqueta="Sonidos" nota="Campana al terminar un bloque" />
          <Interruptor prendido={vibra} onCambio={setVibra} etiqueta="Vibrar" />
        </div>
      </Seccion>

      <Seccion titulo="Segmentado y chips">
        <Segmentado etiqueta="Vista" valor={vista} onCambio={setVista} opciones={[['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']]} />
        <div className="kt-fila">
          {([['ing', 'Ingeniería'], ['idi', 'Inglés'], ['salud', 'Salud'], ['economia', 'Economía']] as const).map(([a, n]) => (
            <Chip key={a} area={`var(--a-${a})`} activo={areas.includes(a)} onCambio={(v) => setAreas(v ? [...areas, a] : areas.filter((x) => x !== a))}>{n}</Chip>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Contadores">
        <div className="kt-pila-llana">
          <Contador etiqueta="Peso" valor={peso} onCambio={setPeso} paso={0.1} decimales={1} unidad="kg" min={30} max={250} inicial={88.4} />
          <Contador etiqueta="Series" valor={series} onCambio={setSeries} min={1} max={10} />
        </div>
      </Seccion>

      <Seccion titulo="Campos">
        <CampoTexto etiqueta="Nombre de la rutina" valor={nombre} onCambio={setNombre} placeholder="Mi rutina" maximo={30} />
        <CampoTexto etiqueta="Link del paquete" icono="enlace" modo="url" valor={link} onCambio={setLink} error={linkMal ? 'No parece un link. Probá con github.com/…' : undefined} nota="Se muestra en Open source." />
        <div className="kt-dos">
          <CampoHora etiqueta="Me levanto" valor={despierta} onCambio={setDespierta} />
          <CampoHora etiqueta="Me acuesto" valor={duerme} onCambio={setDuerme} />
        </div>
        <CampoFecha etiqueta="Examen" valor={examen} onCambio={setExamen} hoy={hoy} min={hoy} nota="Desde hoy en adelante." />
        <Selector etiqueta="Rutina de hoy" valor={rutina} onCambio={setRutina} opciones={[
          { valor: 'completo', etiqueta: 'Día completo', nota: '04:00 · bloque 1 de 4 h' },
          { valor: 'corto', etiqueta: 'Día corto', nota: '05:00 · bloque 1 de 3 h 10' },
          { valor: 'tarde', etiqueta: 'Día tarde', nota: 'El estudio, a la tarde' },
        ]} />
      </Seccion>
    </>
  );
}
