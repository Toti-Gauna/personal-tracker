/**
 * Trazo 2.0 · el motor de repaso (#/motor y #/motor/importar): la escalera de un capítulo (días 1, 2, 3, 8, 22 y 61), las reglas que
 * se ajustan, el estado de tus tarjetas y cómo traer más (un bloque pegado o un mazo de Anki). Cada ajuste escribe con `setRules`, y
 * las tarjetas nuevas con `addCards`, igual que la 1.0.
 */
import { useEffect, useRef, useState } from 'react';
import { cardFront, parseCardsText } from '../../data/study';
import { DIA, MAX_TRIES } from '../../data/study-catalog';
import { addDays } from '../../data/time';
import { useStore } from '../../state/store';
import { addCards, setRules } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Interruptor, Segmentado, Selector } from '../kit/controles';
import { Barra, Dato } from '../kit/superficies';
import { Icono } from '../iconos';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { areaDeFrente, plural } from './comun';
import '../proyecto/proyecto.css';
import './sesiones.css';

/** Días del capítulo: 1 → 2 → 3 → 8 → 22 → 61. */
const ESCALERA: [number, string][] = [
  [DIA.estudiar, 'Estudiar'], [DIA.test, 'Cold recall y test'], [DIA.tesis, 'Tesis'], [DIA.e8, 'Repetir'], [DIA.e22, 'Repetir'], [DIA.e61, 'Examen'],
];

const INFO = (
  <>
    <p className="t-cuerpo-l">Así decide Trazo qué repasás cada día. Todo se ajusta acá y vale para todos los frentes.</p>
    <p className="t-cuerpo">Cada capítulo vuelve en los días 1, 2, 3, 8, 22 y 61: estudiar, cold recall y test, tesis, repetir dos veces y un examen.</p>
    <p className="t-cuerpo">El tope diario cuida que repasar no te coma el día. Lo que no entra pasa a mañana, empezando por lo más olvidado.</p>
  </>
);

/** Un ajuste con sus valores posibles (si el guardado no está entre ellos, se suma para que se vea). */
function Regla<T extends number>({ titulo, nota, valor, opciones, fmt, onCambio }: { titulo: string; nota: string; valor: T; opciones: T[]; fmt: (v: T) => string; onCambio: (v: T) => void }) {
  const todas = opciones.includes(valor) ? opciones : [...opciones, valor].sort((a, b) => a - b);
  return (
    <div className="se-regla">
      <span className="se-regla-txt"><b className="t-cuerpo-l">{titulo}</b><small className="t-nota">{nota}</small></span>
      <Segmentado etiqueta={titulo} valor={String(valor)} onCambio={(v) => onCambio(Number(v) as T)} opciones={todas.map((o) => [String(o), fmt(o)])} />
    </div>
  );
}

export default function MotorEstudioV2({ ruta, day }: PropsV2) {
  const seccion = ruta.param;
  const study = useStore((s) => s.study);
  const r = study.rules;
  const [bloque, setBloque] = useState('');
  const [mazo, setMazo] = useState(study.fronts[0]?.id ?? '');
  const [fuente, setFuente] = useState('');
  const detectadas = parseCardsText(bloque);
  const [pegarAbierto, setPegarAbierto] = useState(seccion === 'importar');
  const traer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seccion === 'importar') traer.current?.scrollIntoView?.();
  }, [seccion]);

  const cards = study.cards;
  const nuevas = cards.filter((c) => !c.srs || c.srs.state === 'new').length;
  const aprendiendo = cards.filter((c) => c.srs && (c.srs.state === 'learning' || c.srs.state === 'relearning')).length;
  const maduras = cards.filter((c) => c.srs?.state === 'review' && c.srs.s >= 21).length;
  const enRepaso = cards.length - nuevas - aprendiendo - maduras;
  const desde = addDays(day.date, -30);
  const log = study.log.filter((l) => l.date >= desde);
  const ret = (ids?: Set<string>) => {
    const ls = ids ? log.filter((l) => ids.has(l.cardId)) : log;
    return ls.length ? Math.round((ls.filter((l) => l.grade > 1).length / ls.length) * 100) : null;
  };
  const total = ret();
  const frente = study.fronts.find((f) => f.id === mazo);

  const importar = (texto: string, origen: string) => {
    const cs = parseCardsText(texto);
    if (!cs.length) return aviso({ titulo: 'No encontré tarjetas', sub: 'Una por línea con :: o [[ ]], o un .txt de Anki', tono: 'atencion' });
    addCards(day.date, cs.map((c) => ({ ...c, deck: frente?.name ?? 'General', frontId: frente?.id, source: fuente.trim() || origen })));
    aviso({ titulo: `${plural(cs.length, 'tarjeta nueva', 'tarjetas nuevas')}`, sub: `Mazo ${frente?.name}. Entran de a ${r.newPerDay} por día.`, tono: 'hecho' });
    setBloque('');
  };
  const archivo = (f?: File) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importar(String(rd.result ?? ''), f.name.replace(/\.[^.]+$/, ''));
    rd.readAsText(f);
  };

  return (
    <Marco titulo="Motor de repaso" intro="Así decide Trazo qué repasás cada día." volver={{ href: '#/repaso', nombre: 'Repaso' }} info={INFO} className="se-motor">
      <Grupo titulo="De estudiar a recordar">
        <ol className="capa-1 se-escalera">
          {ESCALERA.map(([d, t], i) => (
            <li key={i}>
              <span className="se-escalon"><small className="t-rotulo">Día</small><b className="t-dato">{d}</b></span>
              <span className="se-escalera-txt"><b>{t}</b></span>
            </li>
          ))}
        </ol>
      </Grupo>

      <Grupo titulo="Reglas">
        <div className="capa-1 se-reglas">
          <Regla titulo="Releer cuando falla" nota="Cold recall por debajo de este número o tarjeta fallada 2 veces" valor={r.rereadBelow} opciones={[0.6, 0.65, 0.7, 0.75, 0.8]}
            fmt={(v) => `${Math.round(v * 100)} %`} onCambio={(v) => setRules({ rereadBelow: v })} />
          <Regla titulo="Retención buscada" nota="Cuánto querés recordar; más alto, más repasos" valor={r.retention} opciones={[0.85, 0.88, 0.9, 0.92, 0.95]}
            fmt={(v) => `${Math.round(v * 100)} %`} onCambio={(v) => setRules({ retention: v })} />
          <Regla titulo="Tarjetas nuevas por día" nota="El resto espera al día siguiente" valor={r.newPerDay} opciones={[5, 10, 15, 20, 30]} fmt={String} onCambio={(v) => setRules({ newPerDay: v })} />
          <Regla titulo="Tope de repaso por día, en minutos" nota="Si vence más, entran primero las más olvidadas y el resto pasa a mañana" valor={r.cap} opciones={[10, 15, 20, 25, 30]}
            fmt={String} onCambio={(v) => setRules({ cap: v })} />
          <div className="se-regla"><Interruptor prendido={r.shortenIfPerfect} onCambio={(v) => setRules({ shortenIfPerfect: v })} etiqueta="Saltear lo que ya sabés" nota="Ejercicios espaciados más cortos si el anterior salió perfecto" /></div>
        </div>
        <div className="capa-1 s-lista">
          <FilaHoja icono="documento" titulo="Reglas fijas" valor="2" tituloHoja="Reglas fijas">
            <dl className="capa-1 pt-ficha">
              <div className="pt-ficha-fila"><dt className="t-rotulo">Cold recall antes del test · día {DIA.test}</dt><dd className="t-cuerpo">5 min contra el capítulo; con {Math.round(r.coldSkipAt * 100)} % o más no hace falta releer.</dd></div>
              <div className="pt-ficha-fila"><dt className="t-rotulo">Test sin aprobar · {MAX_TRIES} veces</dt><dd className="t-cuerpo">Releer al día siguiente y re-test al otro; a la {MAX_TRIES === 3 ? 'tercera' : `${MAX_TRIES}.ª`} vez, el tema queda flojo.</dd></div>
            </dl>
          </FilaHoja>
        </div>
      </Grupo>

      <Grupo titulo={`Tus ${cards.length} tarjetas`}>
        <div className="capa-1 se-estado">
          <Dato valor={total == null ? '—' : `${total} %`} etiqueta="Retención de los últimos 30 días" />
          {cards.length > 0 && (
            <>
              <div className="se-estado-barra" role="img" aria-label={`${nuevas} nuevas, ${aprendiendo} aprendiendo, ${enRepaso} en repaso, ${maduras} maduras`} data-grafico>
                {nuevas > 0 && <span className="nueva" style={{ flexGrow: nuevas }} />}
                {aprendiendo > 0 && <span className="aprende" style={{ flexGrow: aprendiendo }} />}
                {enRepaso > 0 && <span className="repaso" style={{ flexGrow: enRepaso }} />}
                {maduras > 0 && <span className="madura" style={{ flexGrow: maduras }} />}
              </div>
              <ul className="se-leyenda t-nota">
                <li><i className="nueva" aria-hidden="true" /><b className="t-dato">{nuevas}</b> nuevas</li>
                <li><i className="aprende" aria-hidden="true" /><b className="t-dato">{aprendiendo}</b> aprendiendo</li>
                <li><i className="repaso" aria-hidden="true" /><b className="t-dato">{enRepaso}</b> en repaso</li>
                <li><i className="madura" aria-hidden="true" /><b className="t-dato">{maduras}</b> maduras</li>
              </ul>
            </>
          )}
          <ul className="se-mazos">
            {study.fronts.map((f) => {
              const ids = new Set(cards.filter((c) => cardFront(c, study.fronts) === f.id).map((c) => c.id));
              const v = ret(ids);
              return (
                <li key={f.id}>
                  <span className="se-mazo-nombre"><i className="area-punto" style={{ ['--area' as string]: areaDeFrente(study, f.id) }} />{f.name}</span>
                  <Barra valor={v ?? 0} max={100} nombre={`Retención de ${f.name}`} area={areaDeFrente(study, f.id)} />
                  <span className="t-dato se-mazo-valor">{v == null ? (ids.size ? '—' : '0') : `${v} %`}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Grupo>

      <div ref={traer} className="se-traer">
        <Grupo titulo="Traer tarjetas">
          <div className="capa-1 s-lista">
            <label className="s-fila s-tocable se-archivo">
              <span className="s-fila-icono"><Icono nombre="importar" lado={20} /></span>
              <span className="s-fila-texto"><b>Importar de Anki</b><small>Archivo de texto exportado, al mazo {frente?.name ?? 'elegido'}</small></span>
              <Icono nombre="siguiente" lado={18} className="icono s-chevron" />
              <input type="file" accept=".txt,.tsv,.csv,text/plain" aria-label="Importar de Anki" onChange={(e) => { archivo(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button type="button" className="s-fila s-tocable" aria-expanded={pegarAbierto} onClick={() => setPegarAbierto((v) => !v)}>
              <span className="s-fila-icono"><Icono nombre="copiar" lado={20} /></span>
              <span className="s-fila-texto"><b>Pegar un bloque</b><small>Una tarjeta por línea con :: o [[ ]]</small></span>
              <Icono nombre={pegarAbierto ? 'arriba' : 'abajo'} lado={18} className="icono s-chevron" />
            </button>
          </div>
          {pegarAbierto && (
            <div className="se-pegar">
              <Selector etiqueta="Mazo" valor={mazo} onCambio={setMazo} opciones={study.fronts.map((f) => ({ valor: f.id, etiqueta: f.name }))} />
              <CampoTexto etiqueta="Fuente" valor={fuente} onCambio={setFuente} placeholder="Opcional" />
              <CampoTexto etiqueta="Bloque de tarjetas" multilinea valor={bloque} onCambio={setBloque} placeholder={'Menos por menos :: da positivo.\nRestar un número es sumar su [[opuesto]].'} />
              <Boton variante="primario" ancho icono="mas" deshabilitado={detectadas.length ? false : 'Pegá al menos una tarjeta.'} onClick={() => importar(bloque, 'Bloque pegado')}>
                {detectadas.length ? `Agregar ${plural(detectadas.length, 'tarjeta', 'tarjetas')}` : 'Agregar tarjetas'}
              </Boton>
            </div>
          )}
        </Grupo>
      </div>
    </Marco>
  );
}
