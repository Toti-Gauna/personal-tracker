/**
 * Trazo 2.0 · el cold recall (#/recall/<id>): el día 2, antes del test, escribís sin mirar lo de ayer y lo comparás punto por punto
 * con el capítulo. Primero escribir (con cuánto creés que recordás), después comparar: Trazo marca lo que aparece en tu texto y vos
 * corregís. Guarda con `saveColdRecall`, igual que la 1.0.
 */
import { useEffect, useMemo, useState } from 'react';
import { compareAnswer } from '../../data/compare';
import { dailyReview } from '../../data/study';
import { PUNTOS_CAP } from '../../data/study-catalog';
import type { StudyState } from '../../data/study-types';
import { useStore } from '../../state/store';
import { saveColdRecall } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Casilla, Contador } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Dato, Fila, Vacio } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { haptico } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import { Inmersiva, areaDeFrente, plural } from './comun';

/**
 * Contra qué se compara: los puntos clave del capítulo (los tuyos o los del libro). Es el calentamiento del test del día 2, así que
 * todavía no hay test ni tesis. Sin capítulo (un libro sin unidades), tus puntos o tus tarjetas.
 */
function puntosDe(study: StudyState, actId: string, unit?: number) {
  const key = `${actId}:${unit}`;
  const capitulo = study.points[key]?.length ? study.points[key] : unit != null ? PUNTOS_CAP[actId]?.[unit] ?? [] : [];
  if (capitulo.length) return { puntos: capitulo, fuente: 'el capítulo' };
  const cards = study.cards.filter((c) => c.activityId === actId && c.unit === unit);
  if (cards.length) return { puntos: cards.map((c) => `${c.front} :: ${c.back}`), fuente: 'tus tarjetas' };
  return { puntos: [] as string[], fuente: '' };
}

const INFO = (
  <>
    <p className="t-cuerpo-l">Escribí todo lo que recuerdes de ayer, sin mirar. No importa el orden ni que esté perfecto.</p>
    <p className="t-cuerpo">Dictar con el teclado también vale. Antes de comparar decís cuánto creés que recordás: sirve para ver si la sensación de saber te engaña.</p>
    <p className="t-cuerpo">Después Trazo marca lo que aparece en lo que escribiste y vos corregís. Lo que olvidaste vuelve mañana como tarjeta; por debajo del límite, también una relectura corta.</p>
  </>
);

export default function RecallV2({ ruta, day }: PropsV2) {
  const itemId = ruta.param;
  const study = useStore((s) => s.study);
  const item = study.reviews.find((r) => r.id === itemId && r.kind === 'cold');
  const pendientes = study.reviews.filter((r) => r.kind === 'cold' && (r.doneOn === day.date || (!r.doneOn && r.due <= day.date)));
  const [texto, setTexto] = useState('');
  // Cuánto creés que recordás, antes de comparar: alimenta la calibración (creías contra recordaste).
  const [creia, setCreia] = useState(80);
  const [fase, setFase] = useState<'escribir' | 'comparar' | 'resultado'>('escribir');
  const [inicio] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (fase !== 'escribir') return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fase]);

  const base = useMemo(() => (item ? puntosDe(study, item.activityId, item.unit) : { puntos: [], fuente: '' }), [item, study]);
  const [puntos, setPuntos] = useState<string[]>(base.puntos);
  const [nuevos, setNuevos] = useState('');
  const [agregar, setAgregar] = useState(false);
  const [verTexto, setVerTexto] = useState(false);
  const [marcas, setMarcas] = useState<boolean[]>([]);
  const grupoHoy = useMemo(() => dailyReview(study, day.date).groups.find((g) => g.pending.length > 0), [study, day.date]);
  const tarjetasHoy = !!grupoHoy;
  const focus = useStore((s) => s.focus);
  const enSesion = !!focus?.tramos && focus.date === day.date;

  if (!item) {
    return (
      <Inmersiva titulo="Cold recall" salir={{ href: '#/repaso', nombre: 'Repaso' }}>
        <Vacio ilustracion="buscar" titulo="No encontré ese cold recall" texto="Puede que ya lo hayas hecho." accion={<Boton variante="primario" href="#/repaso">Ir a Repaso</Boton>} />
      </Inmersiva>
    );
  }
  const area = areaDeFrente(study, study.activities.find((x) => x.id === item.activityId)?.front);
  const titulo = item.label.replace(/^Cold recall · /, '');
  const seg = Math.floor((ahora - inicio) / 1000);
  const rules = study.rules;
  const ok = marcas.filter(Boolean).length;
  const pct = puntos.length ? ok / puntos.length : 0;
  const pctN = Math.round(pct * 100);
  const idx = pendientes.findIndex((r) => r.id === item.id);
  const salir = enSesion && focus ? { href: `#/sesion/${focus.activityId}`, nombre: 'la sesión' } : { href: '#/estudio', nombre: 'Estudio' };
  const dif = creia - pctN;

  const comparar = () => {
    haptico('leve');
    // Trazo marca solo lo que aparece en lo que escribiste; vos corregís.
    setMarcas(puntos.map((p) => {
      const [, back = p] = p.split('::');
      return compareAnswer(texto, p.includes('::') ? back : p).coverage >= 0.6;
    }));
    setFase('comparar');
  };
  const sumar = () => {
    const ps = nuevos.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!ps.length) return;
    const all = [...puntos, ...ps];
    setPuntos(all);
    setMarcas(all.map((p, i) => marcas[i] ?? compareAnswer(texto, p.split('::').pop() ?? p).coverage >= 0.6));
    setNuevos('');
    setAgregar(false);
  };
  const guardar = () => {
    const s = saveColdRecall(day.date, item.id, puntos, marcas, creia / 100);
    haptico('exito');
    aviso({ titulo: `Cold recall · ${Math.round(s * 100)} %`, sub: s >= rules.coldSkipAt ? 'Lo tenés: no hace falta releer' : s < rules.rereadBelow ? 'Mañana: lo olvidado como tarjeta y una relectura corta' : 'Lo olvidado vuelve mañana como tarjeta', tono: 'hecho' });
    if (enSesion) history.length > 1 ? history.back() : (location.hash = '#/estudio');
    else if (grupoHoy) location.hash = `#/tarjetas/${grupoHoy.frontId}`;
    else if (item.unit != null) location.hash = `#/test/${item.activityId}/${item.unit}`;
    else history.length > 1 ? history.back() : (location.hash = '#/estudio');
  };

  const consejo = pct >= rules.coldSkipAt
    ? `Llegaste al ${Math.round(rules.coldSkipAt * 100)} %: no hace falta releer. Seguí con el test.`
    : pct < rules.rereadBelow
      ? `Quedó debajo del ${Math.round(rules.rereadBelow * 100)} %: lo que olvidaste vuelve mañana como tarjeta y el motor te agenda releer esas partes.`
      : 'Lo que olvidaste vuelve mañana como tarjeta.';

  const hojaAgregar = (
    <Hoja abierta={agregar} onCerrar={() => setAgregar(false)} titulo="Agregar puntos"
      pie={<Boton variante="primario" ancho icono="mas" deshabilitado={nuevos.trim() ? false : 'Escribí al menos un punto.'} onClick={sumar}>Agregar puntos</Boton>}>
      <div className="se-hoja">
        <CampoTexto etiqueta="Un punto clave por línea" multilinea valor={nuevos} onCambio={setNuevos} placeholder="Punto clave (o «tema :: detalle»)" nota="Quedan guardados para los próximos repasos." />
      </div>
    </Hoja>
  );

  const progreso = <div className="se-barra-test"><Barra valor={Math.max(0, idx)} max={Math.max(1, pendientes.length)} nombre="Cold recalls de hoy" area={area} /></div>;

  // ——— Escribir ———
  if (fase === 'escribir') {
    return (
      <Inmersiva titulo="Cold recall" area={area} salir={salir} info={INFO} progreso={progreso}
        pie={<Boton variante="primario" ancho icono="siguiente" deshabilitado={texto.trim() ? false : 'Escribí lo que recuerdes para comparar.'} onClick={comparar}>Comparar</Boton>}>
        <p className="t-rotulo se-kicker">{idx + 1} de {pendientes.length} · día 2, antes del test</p>
        <h2 className="t-seccion">{titulo}</h2>
        <p className="t-nota">Escribí todo lo que recuerdes de ayer, sin mirar.</p>
        <div className="se-cuaderno"><CampoTexto etiqueta="Lo que recordás" multilinea valor={texto} onCambio={setTexto} /></div>
        <p className="t-rotulo se-tiempo"><span className="t-dato">{Math.floor(seg / 60)} min {seg % 60} s</span></p>
        <div className="capa-1 se-creia">
          <span className="se-creia-txt"><b className="t-cuerpo-l">¿Cuánto creés que recordás?</b><small className="t-nota">Antes de comparar</small></span>
          <Contador etiqueta="Cuánto creés que recordás" valor={creia} min={0} max={100} paso={5} unidad="%" onCambio={setCreia} />
        </div>
      </Inmersiva>
    );
  }

  // ——— Comparar: marcás lo que recordaste ———
  if (fase === 'comparar') {
    return (
      <Inmersiva titulo="Cold recall" area={area} salir={salir} info={INFO} progreso={progreso}
        pie={<Boton variante="primario" ancho icono="siguiente" deshabilitado={puntos.length ? false : 'Agregá los puntos clave para seguir.'} onClick={() => { haptico('leve'); setFase('resultado'); }}>Ver cómo te fue</Boton>}>
        {puntos.length === 0 ? (
          <Vacio ilustracion="escribir" titulo="Sin puntos clave todavía" texto="Ahora sí abrí el libro y anotá los puntos clave, uno por línea: quedan para los próximos repasos."
            accion={<Boton variante="secundario" icono="mas" onClick={() => setAgregar(true)}>Agregar puntos</Boton>} />
        ) : (
          <Grupo titulo="Marcá lo que recordaste" extremo={<span className="se-extremo">
            <Boton soloIcono tamano="s" variante="fantasma" icono="mas" etiqueta="Agregar un punto que falta" onClick={() => setAgregar(true)} />
            <Boton soloIcono tamano="s" variante="fantasma" icono="ojo" etiqueta="Ver lo que escribiste" onClick={() => setVerTexto(true)} />
          </span>}>
            <div className="capa-1 pt-check">
              {puntos.map((p, i) => {
                const [t, d] = p.split('::').map((x) => x.trim());
                return <Casilla key={i} marcada={!!marcas[i]} festejo={false} etiqueta={t} nota={d ? d[0].toUpperCase() + d.slice(1) : undefined}
                  onCambio={() => setMarcas((m) => puntos.map((_, j) => (j === i ? !m[j] : !!m[j])))} />;
              })}
            </div>
          </Grupo>
        )}
        {hojaAgregar}
        <Hoja abierta={verTexto} onCerrar={() => setVerTexto(false)} titulo="Lo que escribiste"><p className="t-cuerpo-l se-texto">{texto}</p></Hoja>
      </Inmersiva>
    );
  }

  // ——— Resultado: cuánto recordaste contra cuánto creías ———
  return (
    <Inmersiva titulo="Cold recall" area={area} salir={salir} info={INFO} progreso={progreso}
      pie={<Boton variante="primario" ancho icono="siguiente" onClick={guardar}>
        {tarjetasHoy ? 'Seguir con las tarjetas' : item.unit != null ? 'Seguir con el test' : 'Guardar y seguir'}
      </Boton>}>
      <p className="t-rotulo se-kicker">{titulo}</p>
      <div className="capa-heroe se-heroe">
        <div className="se-resultado" role="group" aria-label="Resultado">
          <span className="se-resultado-num"><b className="t-heroe"><Numero valor={pctN} sufijo=" %" /></b></span>
          <div className="se-resultado-texto"><b className="t-encabezado">{ok} de {plural(puntos.length, 'punto', 'puntos')}</b><span className="t-nota">Contra {base.fuente || 'tus puntos clave'}</span></div>
        </div>
      </div>
      <div className="se-calib" role="group" aria-label="Creías contra recordaste">
        <Dato valor={`${creia} %`} etiqueta="Creías recordar" />
        <Dato valor={`${pctN} %`} etiqueta="Recordaste" />
        <Dato valor={`${dif > 0 ? '−' : dif < 0 ? '+' : ''}${Math.abs(dif)}`} unidad="pts" etiqueta={dif > 0 ? 'Te sobreestimaste' : dif < 0 ? 'Te subestimaste' : 'Justo'} />
      </div>
      <p className="t-cuerpo-l se-consejo">{consejo}</p>
      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <Fila icono="editar" titulo="Corregir las marcas" onClick={() => setFase('comparar')} />
          <Fila icono="grafico" titulo="Ver qué más se te olvida" href={`#/flojo/${encodeURIComponent(item.unit != null ? `${item.activityId}:${item.unit}` : '')}`} />
        </div>
      </Grupo>
    </Inmersiva>
  );
}
