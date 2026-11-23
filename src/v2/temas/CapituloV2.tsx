/**
 * Trazo 2.0 · un capítulo de un libro de Matemática (#/estudio/mate/libro/<id>/<n>): dónde quedaste y lo que sigue (estudiando →
 * test → tesis → repasos), las tarjetas del capítulo (y cómo importarlas), los tests, los repasos agendados, los puntos clave del
 * cold recall y el historial. Mismos datos y mismas acciones que la 1.0.
 */
import { useRef, useState } from 'react';
import { cuando, estadoCapitulo, historial, tarjetasDe, type DiaHistorial } from '../../data/estado-capitulo';
import { actShort, parseCardsText } from '../../data/study';
import { PUNTOS_CAP } from '../../data/study-catalog';
import type { Activity, ReviewItem } from '../../data/study-types';
import { ir } from '../../lib/routes';
import { getState, useStore } from '../../state/store';
import { addCards, seguirEstudiando, terminarEstudio, volverAEstudiar } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { areaV2, fch } from './datos';
import '../proyecto/proyecto.css';
import './temas.css';
import { cuantos } from '../reglas';

const QUE: Record<ReviewItem['kind'], string> = { cold: 'Cold recall', tesis: 'Tesis', releer: 'Releer lo que falló', retest: 'Re-test', ejercicios: 'Repaso con ejercicios', examen: 'Examen corto' };

export default function CapituloV2({ day, id, n }: { day: PropsV2['day']; id: string; n: number }) {
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const a = study.activities.find((x) => x.id === id && x.units?.length);
  const hoy = day.date;
  if (!a) {
    return (
      <Marco className="tm" titulo="Libro" volver={{ href: '#/estudio/mate', nombre: 'Matemática' }}>
        <Vacio ilustracion="buscar" titulo="No encontré ese libro" accion={<Boton variante="secundario" href="#/estudio/mate">Ver Matemática</Boton>} />
      </Marco>
    );
  }
  if (!a.units?.some((u) => u.n === n)) {
    return (
      <Marco className="tm" titulo="Capítulo" volver={{ href: `#/estudio/mate/libro/${a.id}`, nombre: actShort(a) }}>
        <Vacio ilustracion="buscar" titulo="No existe ese capítulo" accion={<Boton variante="secundario" href={`#/estudio/mate/libro/${a.id}`}>Ver {actShort(a)}</Boton>} />
      </Marco>
    );
  }
  const front = study.fronts.find((f) => f.id === a.front);
  const area = areaV2(front?.color, 'var(--a-ing)');
  const etiqueta = a.unitLabel ?? 'Cap.';
  const c = estadoCapitulo(study, a, n, hoy);
  const cards = tarjetasDe(study, a.id, n);
  const h = historial(study, days, a, n);
  const puntos = study.points[`${a.id}:${n}`]?.length ? study.points[`${a.id}:${n}`] : PUNTOS_CAP[a.id]?.[n] ?? [];
  const total = a.units.length;
  const nombre = `${etiqueta} ${n} · ${c.unit.title}`;
  const ok = (titulo: string, sub: string) => aviso({ titulo, sub, tono: 'info' });
  const hecho = (getState().days[hoy]?.studyDone ?? []).includes(`learn:${a.id}:${n}`);
  const nuevas = cards.filter((x) => !x.srs || x.srs.state === 'new').length;
  const pendientes = c.repasos.filter((r) => !r.doneOn).length;
  return (
    <Marco className="tm" titulo={`${etiqueta} ${n}`} rotulo={`${c.etiqueta.split(' · ')[0]} · ${n} de ${total}`} volver={{ href: `#/estudio/mate/libro/${a.id}`, nombre: actShort(a) }}
      info={(
        <>
          <p className="t-cuerpo-l">Un capítulo pasa por estudiar, test, tesis y repasos.</p>
          <p className="t-cuerpo">Nada avanza solo: lo de estudiar lo marcás vos. Al día siguiente van el cold recall y el test completo; con 85 % pasás a la tesis y a los repasos (días 8, 22 y 61).</p>
          <p className="t-cuerpo">Las tarjetas salen del cold recall, la tesis y los errores del test, o las importás acá (un .txt de Anki o una por línea).</p>
        </>
      )}>
      <Tarjeta heroe area={area} className="tm-aca">
        <b className="t-seccion">{c.unit.title}</b>
        {c.proximo && <p className="t-nota">{c.estado === 'estudiando' ? 'Cuando lo termines, marcalo: mañana van el cold recall y el test.' : `Sigue: ${c.proximo.que.toLowerCase()} (${cuando(c.proximo.fecha, hoy)}).`}</p>}
        {c.estado === 'estudiando' && (
          <div className="tm-acciones">
            <Boton variante="primario" ancho onClick={() => { const e = terminarEstudio(hoy, a.id, n); if (e) aviso({ titulo: e, tono: 'atencion' }); else ok('Capítulo estudiado', 'Mañana: cold recall y test completo'); }}>Lo terminé</Boton>
            <Boton variante="secundario" ancho icono={hecho ? 'tilde' : undefined} onClick={() => { seguirEstudiando(hoy, a.id, n); ok('Sigue el mismo capítulo', `${nombre}: mañana continúa, sin test todavía`); }}>Sigo estudiándolo</Boton>
          </div>
        )}
        {(c.estado === 'test' || c.estado === 'retest') && (
          <div className="tm-acciones">
            <Boton variante="primario" ancho icono="editar" onClick={() => ir(`test/${a.id}/${n}`)}>Cargar el resultado</Boton>
            {c.estado === 'test' && !c.tests.length && <Boton variante="secundario" ancho onClick={() => { if (volverAEstudiar(a.id, n)) ok('Volvió a "estudiando"', `${nombre}: se sacaron el cold recall y el test`); }}>Todavía no lo terminé</Boton>}
          </div>
        )}
        {c.estado === 'tesis' && c.tesis && <div className="tm-acciones"><Boton variante="primario" ancho icono="editar" onClick={() => ir(`tesis/${c.tesis!.id}`)}>Escribir la tesis</Boton></div>}
        {c.estado === 'pendiente' && <p className="t-nota">Todavía no: se estudia después de los anteriores.</p>}
        {(c.estado === 'repasos' || c.estado === 'cerrado' || c.estado === 'flojo') && <p className="t-nota">{c.estado === 'cerrado' ? 'Cerrado: pasó todos sus repasos.' : 'Los repasos aparecen en el día cuando vencen.'}</p>}
      </Tarjeta>

      <Grupo titulo="Tarjetas" extremo={<span className="t-rotulo">{cards.length}</span>}>
        <div className="capa-1 s-lista">
          {cards.length > 0 && <Fila icono="tarjetas" titulo="Repasar" nota={`${cards.length} ${cards.length === 1 ? 'tarjeta' : 'tarjetas'}`} href={`#/tarjetas/cap:${a.id}:${n}`} />}
          {cards.length > 0 && (
            <FilaHoja icono="documento" titulo="Ver las tarjetas" valor={`${nuevas} ${nuevas === 1 ? 'nueva' : 'nuevas'}`}>
              <ul className="capa-1 tm-tarjetas">{cards.map((x) => <li key={x.id}><b className="t-cuerpo">{x.front}</b><span className="t-nota">{x.back}</span></li>)}</ul>
            </FilaHoja>
          )}
          <ImportarTarjetas a={a} n={n} hoy={hoy} vacio={cards.length === 0} />
        </div>
      </Grupo>

      <Grupo titulo="Tests" extremo={c.mejor != null ? <span className="t-rotulo">Mejor {c.mejor} %</span> : undefined}>
        <div className="capa-1 s-lista">
          {c.tests.length
            ? c.tests.map((t, i) => <Fila key={i} icono="certificado" titulo={`${i ? 'Re-test' : 'Test'} · ${t.score} de ${t.total}`} nota={`${fch(t.date)}${t.approved ? ' · aprobado' : ''}`} valor={`${Math.round((t.score / t.total) * 100)} %`} />)
            : <Fila icono="certificado" titulo="Test del capítulo" nota={c.unit.test.desc} />}
        </div>
      </Grupo>

      <Grupo titulo="Detalle">
      <div className="capa-1 s-lista">
        {c.repasos.length > 0 && (
          <FilaHoja icono="repaso" titulo="Repasos agendados" valor={cuantos(pendientes, 'pendiente', 'pendientes')}>
            <ol className="capa-1 pt-revs">{c.repasos.map((r) => <li key={r.id}><span className="t-rotulo">{fch(r.due)}</span><span className="t-cuerpo">{QUE[r.kind]}</span><span className="t-nota">{r.doneOn ? `Hecho el ${fch(r.doneOn)}` : cuando(r.due, hoy)}</span></li>)}</ol>
          </FilaHoja>
        )}
        {puntos.length > 0 && (
          <FilaHoja icono="meta" titulo="Puntos clave del cold recall" valor={cuantos(puntos.length, 'punto', 'puntos')} tituloHoja="Puntos clave">
            <ul className="capa-1 tm-tarjetas">{puntos.map((p) => { const [t, d] = p.split('::').map((x) => x.trim()); return <li key={p}><b className="t-cuerpo">{t}</b>{d && <span className="t-nota">{d}</span>}</li>; })}</ul>
          </FilaHoja>
        )}
        <FilaHoja icono="calendario" titulo="Historial" valor={h.length ? `${h.length} ${h.length === 1 ? 'día' : 'días'}` : 'vacío'}>
          <Historial h={h} />
        </FilaHoja>
      </div>
      </Grupo>

      <nav className="pt-vecinos" aria-label="Otros capítulos">
        {n > 1 ? <Boton variante="fantasma" icono="atras" href={`#/estudio/mate/libro/${a.id}/${n - 1}`}>{etiqueta} {n - 1}</Boton> : <span />}
        {n < total ? <Boton variante="fantasma" icono="siguiente" href={`#/estudio/mate/libro/${a.id}/${n + 1}`}>{etiqueta} {n + 1}</Boton> : <span />}
      </nav>
    </Marco>
  );
}

function Historial({ h }: { h: DiaHistorial[] }) {
  if (!h.length) return <p className="t-cuerpo">Todavía no hay días con estudio de este capítulo. Se arma solo con las sesiones, los tests, las tesis y las tarjetas.</p>;
  return <ol className="capa-1 pt-revs">{h.slice(0, 30).map((d) => <li key={d.fecha}><span className="t-rotulo">{fch(d.fecha)}{d.min ? ` · ${d.min} min` : ''}</span>{d.eventos.map((e, i) => <span key={i} className="t-cuerpo">{e}</span>)}</li>)}</ol>;
}

/** Importar tarjetas a este capítulo: un .txt de Anki (frente y dorso con tab) o líneas con :: y [[ ]]. */
function ImportarTarjetas({ a, n, hoy, vacio }: { a: Activity; n: number; hoy: string; vacio: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const archivo = useRef<HTMLInputElement>(null);
  const cargar = (t: string, origen: string) => {
    const st = getState().study;
    const deck = st.fronts.find((f) => f.id === a.front)?.name ?? 'General';
    const cs = parseCardsText(t);
    if (!cs.length) { aviso({ titulo: 'No encontré tarjetas', sub: 'Una por línea con :: o [[ ]], o un .txt de Anki (frente<tab>dorso)', tono: 'atencion' }); return; }
    addCards(hoy, cs.map((c) => ({ ...c, deck, frontId: a.front, activityId: a.id, unit: n, source: origen })));
    setTexto('');
    setAbierta(false);
    aviso({ titulo: `${cs.length} ${cs.length === 1 ? 'tarjeta' : 'tarjetas'} en el cap. ${n}`, sub: `Entran de a ${st.rules.newPerDay} nuevas por día en el repaso`, tono: 'hecho' });
  };
  return (
    <>
      <Fila icono="importar" titulo="Importar tarjetas" nota={vacio ? 'Todavía sin tarjetas' : undefined} onClick={() => setAbierta(true)} />
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Importar tarjetas"
        pie={<Boton variante="primario" deshabilitado={texto.trim() ? false : 'Pegá algo para cargar'} onClick={() => cargar(texto, `${actShort(a)} · cap. ${n}`)}>Cargar</Boton>}>
        <div className="tm-importar">
          <p className="t-nota">Pegá un .txt de Anki (frente y dorso separados por tab) o una tarjeta por línea: <span className="t-dato">pregunta :: respuesta</span> o una frase con <span className="t-dato">[[palabra]]</span>.</p>
          <CampoTexto etiqueta="Tarjetas" multilinea valor={texto} onCambio={setTexto} placeholder="¿Qué es un número racional? :: El cociente de dos enteros con divisor distinto de cero." />
          <Boton variante="secundario" icono="importar" onClick={() => archivo.current?.click()}>Elegir archivo</Boton>
          <input ref={archivo} type="file" accept=".txt,.tsv,.csv,text/plain" hidden aria-label="Archivo de tarjetas" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const rd = new FileReader();
            rd.onload = () => cargar(String(rd.result ?? ''), `${actShort(a)} · cap. ${n} · ${f.name.replace(/\.[^.]+$/, '')}`);
            rd.readAsText(f);
            e.target.value = '';
          }} />
        </div>
      </Hoja>
    </>
  );
}
