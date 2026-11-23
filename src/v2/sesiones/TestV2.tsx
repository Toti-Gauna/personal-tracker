/**
 * Trazo 2.0 · el test de una unidad (#/test/<actividad>/<n>) y el test final de un libro (#/test/<actividad>/final). Un solo
 * hilo: o cargás cuántos te salieron (en la app), o resolvés de a un ejercicio y la app corrige (en papel con banco de
 * ejercicios), o marcás los que fallaste (en papel sin banco). Después, el resultado y qué pasa mañana. Las mismas reglas que la
 * 1.0: se aprueba con 85 %, a la tercera vez sin aprobar el tema queda flojo, y se escribe con `saveTest` / `guardarTestFinal`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkAnswer, testExercises } from '../../data/ejercicios';
import { libroPorId } from '../../data/libros';
import { approves, parseCorrection, testOf, unitName, unitShort } from '../../data/study';
import { LADDER, MAX_TRIES, PASS } from '../../data/study-catalog';
import { ERR_TYPES, type ErrType } from '../../data/study-types';
import { addDays, fmtFecha } from '../../data/time';
import { useStore } from '../../state/store';
import { guardarTestFinal, saveTest } from '../../state/study';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Contador, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { festejar, haptico } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import { Inmersiva, areaDeFrente, plural } from './comun';

const ERR: Record<ErrType, [string, string]> = {
  concepto: ['Concepto', 'No entendí la idea'],
  tecnica: ['Técnica', 'Sé la idea, fallé el procedimiento'],
  descuido: ['Descuido', 'Signo, cuenta o apuro'],
  enunciado: ['Enunciado', 'Leí mal lo que pedía'],
};
const TIPOS: ErrType[] = ['descuido', 'tecnica', 'concepto', 'enunciado'];
/** Bien → descuido → técnica → concepto → enunciado → bien. */
const CICLO: (ErrType | null)[] = [null, ...TIPOS];
const zero = (): Record<ErrType, number> => ({ concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 });
const y = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');
/** "del cap. 1", "de los caps. 1 y 2"; con "Unidad": "de la unidad 1", "de las unidades 1 y 2". */
const anteriores = (n: number, unidad: boolean) => {
  const xs = y(Array.from({ length: n - 1 }, (_, i) => String(i + 1)));
  return unidad ? (n === 2 ? 'de la unidad 1' : `de las unidades ${xs}`) : n === 2 ? 'del cap. 1' : `de los caps. ${xs}`;
};
const fecha = (d: string) => fmtFecha(d).split(' ').slice(0, 2).join(' ').toLowerCase();
const dia = (d: string) => fmtFecha(d).split(' ')[0].toLowerCase();
const corte = Math.round(PASS * 100);

const INFO = (
  <>
    <p className="t-cuerpo-l">Un test completo, sin apuntes. Se aprueba con {corte} %.</p>
    <p className="t-cuerpo">Con {corte} % o más, mañana va la tesis y el capítulo vuelve en los repasos de los días 8, 22 y 61.</p>
    <p className="t-cuerpo">Con menos, releés lo que falló y en dos días hacés el re-test, con ejercicios nuevos. A la tercera vez sin aprobar, el tema queda marcado como flojo y sigue igual a la tesis.</p>
    <p className="t-cuerpo">Los ejercicios que fallás vuelven como tarjetas.</p>
    <p className="t-cuerpo">En papel sin ejercicios en la app: tocá cada ejercicio que fallaste para marcar el tipo de error (descuido, técnica, concepto o enunciado).</p>
  </>
);

/** Aprobado es el trazo (hecho); no aprobado, una píldora con borde: ninguno es alarma. */
function Veredicto({ ok }: { ok: boolean }) {
  return ok
    ? <span className="s-estado hecho"><Icono nombre="tilde" lado={16} />Aprobado · corte {corte} %</span>
    : <span className="s-estado"><Icono nombre="atencion" lado={16} />No aprobado · corte {corte} %</span>;
}

/** El resultado grande: el porcentaje contando y su veredicto. */
function Resultado({ pct, ok, nota, refNumero }: { pct: number; ok: boolean; nota: string; refNumero?: React.Ref<HTMLSpanElement> }) {
  return (
    <div className="se-resultado" role="group" aria-label="Resultado">
      <span className="se-resultado-num" ref={refNumero}><b className="t-heroe"><Numero valor={pct} sufijo=" %" /></b></span>
      <div className="se-resultado-texto"><Veredicto ok={ok} /><span className="t-nota">{nota}</span></div>
    </div>
  );
}

/** Cuántos ejercicios salieron bien, con − y +. */
function Puntaje({ score, total, onCambio, etiqueta }: { score: number; total: number; onCambio: (v: number) => void; etiqueta: string }) {
  return (
    <div className="se-puntaje">
      <span className="t-rotulo">{etiqueta}</span>
      <Contador etiqueta={etiqueta} valor={score} min={0} max={total} unidad={`de ${total}`} onCambio={onCambio} />
    </div>
  );
}

/** Los tipos de error no pueden sumar más que los fallados: si bajan los fallados, se recortan desde el último tipo. */
export function ajustarErrores(e: Record<ErrType, number>, fallados: number): Record<ErrType, number> {
  const r = { ...e };
  let sobra = ERR_TYPES.reduce((s, k) => s + r[k], 0) - Math.max(0, fallados);
  for (const k of [...ERR_TYPES].reverse()) { if (sobra <= 0) break; const q = Math.min(r[k], sobra); r[k] -= q; sobra -= q; }
  return r;
}

/** Por qué fallaste: cuántos de cada tipo (entre todos, no más que los que fallaste). */
function Errores({ fallados, errors, onCambio, detalle }: { fallados: number; errors: Record<ErrType, number>; onCambio: (k: ErrType, v: number) => void; detalle: boolean }) {
  return (
    <Grupo titulo={`¿Por qué fallaste ${fallados === 1 ? 'el que fallaste' : `los ${fallados}`}?`}>
      <div className="capa-1 se-errores">
        {ERR_TYPES.map((k) => (
          <div className="se-err" key={k}>
            <span className="se-err-txt"><b>{ERR[k][0]}</b>{detalle && <small>{ERR[k][1]}</small>}</span>
            <div className="se-err-cont"><Contador etiqueta={ERR[k][0]} valor={errors[k]} min={0} max={fallados - ERR_TYPES.reduce((s, x) => s + (x === k ? 0 : errors[x]), 0)} onCambio={(v) => onCambio(k, v)} /></div>
          </div>
        ))}
      </div>
    </Grupo>
  );
}

export default function TestV2({ ruta, day }: PropsV2) {
  const [actId, nStr] = (ruta.param ?? '').split('/');
  return nStr === 'final' ? <TestFinal day={day} actId={actId} /> : <TestUnidad day={day} actId={actId} nStr={nStr} />;
}

function NoHay({ texto }: { texto: string }) {
  return (
    <Inmersiva titulo="Test" salir={{ href: '#/estudio', nombre: 'Estudio' }}>
      <Vacio ilustracion="buscar" titulo={texto} texto="Puede que el capítulo ya no esté en tu plan." accion={<Boton variante="primario" href="#/estudio">Ir a Estudio</Boton>} />
    </Inmersiva>
  );
}

function TestUnidad({ day, actId, nStr }: { day: PropsV2['day']; actId: string; nStr: string }) {
  const study = useStore((s) => s.study);
  const focus = useStore((s) => s.focus);
  const a = study.activities.find((x) => x.id === actId);
  const unit = a?.units?.find((u) => u.n === Number(nStr));
  const [modo, setModo] = useState<'app' | 'papel'>(a?.testMode ?? 'app');
  const t = unit ? testOf(unit) : null;
  const total = t?.total ?? 0;
  const [score, setScore] = useState(total);
  const [errors, setErrors] = useState(zero);
  const [perEx, setPerEx] = useState<(ErrType | null)[]>(() => Array.from({ length: total }, () => null));
  const [guardado, setGuardado] = useState<{ approved: boolean; flojo: boolean } | null>(null);
  // El intento se fija al abrir: guardar suma uno al estado, y el resultado tiene que seguir hablando de este intento.
  const [intento] = useState(() => (unit ? (study.units[actId]?.[unit.n]?.tests.length ?? 0) : 0));
  const ex = useMemo(() => (unit && t ? testExercises(actId, unit.n, t.nuevos, t.prev, intento) : []), [actId, unit, t?.nuevos, t?.prev, intento]); // eslint-disable-line react-hooks/exhaustive-deps
  const [resp, setResp] = useState<string[]>(() => Array.from({ length: total }, () => ''));
  const [tipo, setTipo] = useState<ErrType[]>(() => Array.from({ length: total }, () => 'descuido'));
  const [claude, setClaude] = useState<(ErrType | null)[] | null>(null);
  const [i, setI] = useState(0);
  const [fase, setFase] = useState<'hacer' | 'resultado'>('hacer');
  const [hojaTodos, setHojaTodos] = useState(false);
  const [verMal, setVerMal] = useState(false);
  const [hojaClaude, setHojaClaude] = useState(false);
  const [pegar, setPegar] = useState('');
  const numero = useRef<HTMLSpanElement>(null);

  useEffect(() => { if (guardado?.approved) festejar(numero.current); else if (guardado) haptico('leve'); }, [guardado]);

  if (!a || !unit || !t) return <NoHay texto="No encontré ese test" />;
  const front = study.fronts.find((f) => f.id === a.front);
  const area = areaDeFrente(study, a.front);
  const papel = modo === 'papel';

  // En papel con ejercicios, la app corrige lo que cargás (o la corrección de Claude). Sin banco de ejercicios, marcás a mano los que fallaste.
  const conEj = ex.length === total && total > 0;
  const bien = conEj ? ex.map((e, k) => (claude ? (claude[k] ? false : true) : checkAnswer(resp[k], e))) : [];
  const mal = bien.flatMap((b, k) => (b === false ? [k] : []));
  const sinResponder = bien.filter((b) => b == null).length;
  const tipoDe = (k: number) => claude?.[k] ?? tipo[k];
  const papelErr = zero();
  if (conEj) mal.forEach((k) => papelErr[tipoDe(k)]++);
  else perEx.forEach((e) => e && papelErr[e]++);
  const sc = papel ? (conEj ? bien.filter((b) => b === true).length : total - perEx.filter(Boolean).length) : score;
  const er = papel ? papelErr : ajustarErrores(errors, total - score);
  const pct = total ? Math.round((sc / total) * 100) : 0;
  const ok = approves(sc, total);
  const fallados = total - sc;
  const cargados = ERR_TYPES.reduce((s, k) => s + er[k], 0);
  const reTest = fecha(addDays(day.date, LADDER.retest.days));
  const prev = intento;
  // A la tercera vez sin aprobar, el tema queda marcado como flojo y sigue a la tesis.
  const ultimo = prev + 1 >= MAX_TRIES;
  const reprobado = ultimo
    ? 'Tercera vez sin aprobar: el tema queda marcado como flojo. Mañana va la tesis y vuelve en los repasos.'
    : `Mañana releés lo que falló y el ${reTest} hacés el re-test (intento ${prev + 2} de ${MAX_TRIES}), con ejercicios nuevos.`;
  const cap = unitShort(a, unit.n).toLowerCase();
  const esUnidad = /^unidad/.test(cap);
  const delCap = `${esUnidad ? 'de la' : 'del'} ${cap}`;
  const que = `${plural(t.nuevos, 'ejercicio nuevo', 'ejercicios nuevos')} ${delCap}${t.prev ? ` y ${t.prev} ${anteriores(unit.n, esUnidad)}` : ''}`;
  const graves = (['tecnica', 'concepto', 'enunciado'] as ErrType[]).filter((k) => er[k] > 0);
  const nGraves = graves.reduce((s2, k) => s2 + er[k], 0);
  const tipos = (['descuido', 'tecnica', 'concepto', 'enunciado'] as ErrType[]).filter((k) => er[k] > 0).map((k) => (k === 'descuido' ? (er[k] > 1 ? 'descuidos' : 'un descuido') : ERR[k][0].toLowerCase()));
  const enSesion = focus?.activityId === a.id && focus.date === day.date;
  const salir = enSesion ? { href: `#/sesion/${a.id}`, nombre: 'la sesión' } : { href: '#/estudio', nombre: 'Estudio' };
  const titulo = prev ? 'Re-test' : 'Test';

  // Lo que va a pasar, en una línea mientras cargás y completo cuando guardás.
  const corto = ok ? 'Aprobado: mañana va la tesis.' : ultimo ? 'Tercera vez sin aprobar: el tema queda flojo.' : `Re-test el ${reTest}, intento ${prev + 2} de ${MAX_TRIES}.`;
  const completo = papel && conEj
    ? `${ok ? `Aprobado. La tesis ${delCap} queda para mañana (${dia(addDays(day.date, LADDER.tesis.days))}).` : `No llegaste al ${corte} %. ${reprobado}`} ${mal.length ? `${mal.length === 1 ? 'El error vuelve como tarjeta' : `Los ${mal.length} errores vuelven como tarjetas`} mañana.` : 'Sin errores.'}`
    : ok
      ? `${cargados ? `${!er.concepto && !er.enunciado ? 'Solo ' : 'Con '}${y(tipos)}` : 'Sin errores'}: aprobado. La tesis queda para mañana y arranca por esos errores${nGraves ? `; ${nGraves === 1 ? 'el error' : 'los errores'} de ${y(graves.map((k) => ERR[k][0].toLowerCase()))} ${nGraves === 1 ? 'entra' : 'entran'} en tus próximos repasos` : ''}.`
      : `Con menos de ${corte} %: ${reprobado}`;

  const guardar = () => {
    const wrong = papel && conEj ? mal.map((k) => ({ q: ex[k].q, a: ex[k].a, type: tipoDe(k), ...(ex[k].tema ? { tema: ex[k].tema } : {}) })) : undefined;
    const per = papel ? (conEj ? bien.map((b, k) => (b === false ? tipoDe(k) : null)) : perEx) : undefined;
    const r = saveTest(day.date, a.id, unit.n, { score: sc, total, errors: er, mode: modo, perEx: per, wrong });
    setGuardado(r);
    aviso({
      titulo: r.approved ? `Aprobado · ${pct} %` : r.flojo ? `${pct} % · tema flojo` : `${pct} % · re-test el ${reTest}`,
      sub: r.approved ? 'La tesis queda para mañana' : r.flojo ? 'Mañana, la tesis; vuelve en los repasos' : 'Mañana releés lo que falló',
      tono: r.approved ? 'hecho' : 'info',
    });
  };
  const ciclo = (k: number) => { haptico('leve'); setPerEx((p) => p.map((e, j) => (j !== k ? e : CICLO[(CICLO.indexOf(e) + 1) % CICLO.length]))); };
  const otroTipo = (k: number) => {
    haptico('leve');
    if (claude) setClaude((c) => c!.map((e, j) => (j === k ? TIPOS[(TIPOS.indexOf(e ?? 'descuido') + 1) % 4] : e)));
    else setTipo((tp) => tp.map((e, j) => (j === k ? TIPOS[(TIPOS.indexOf(e) + 1) % 4] : e)));
  };
  const aplicar = () => {
    const r = parseCorrection(pegar, total);
    if (conEj) { setClaude(r.perEx); setFase('resultado'); } else setPerEx(r.perEx);
    setPegar('');
    setHojaClaude(false);
  };
  const respondidas = resp.filter((r) => r.trim()).length;

  const filaClaude = papel && (
    <Grupo titulo="Más">
      <div className="capa-1 s-lista"><Fila icono="copiar" titulo="Que lo corrija Claude" nota="Pegás su corrección" onClick={() => setHojaClaude(true)} /></div>
    </Grupo>
  );
  const hojas = (
    <>
      <Hoja abierta={hojaClaude} onCerrar={() => setHojaClaude(false)} titulo="Que lo corrija Claude"
        pie={<Boton variante="primario" ancho icono="tilde" deshabilitado={pegar.trim() ? false : 'Pegá primero la corrección.'} onClick={aplicar}>Aplicar corrección</Boton>}>
        <div className="se-hoja">
          <p className="t-cuerpo">Le mandás la foto de la hoja en el chat. Te devuelve el puntaje y el tipo de cada error en un bloque para pegar acá.</p>
          <CampoTexto etiqueta="La corrección de Claude" multilinea valor={pegar} onCambio={setPegar} placeholder={'17/20\n4: descuido\n11: técnica\n17: descuido'} />
        </div>
      </Hoja>
      <Hoja abierta={hojaTodos} onCerrar={() => setHojaTodos(false)} titulo={`Los ${total} ejercicios`} alto="completa"
        pie={<Boton variante="secundario" ancho icono="exportar" onClick={() => window.print()}>Imprimir la hoja</Boton>}>
        <div className="capa-1 s-lista">
          {ex.map((e, k) => <Fila key={k} titulo={`${k + 1}. ${e.q}`} nota={resp[k].trim() ? `Tu resultado: ${resp[k]}` : 'Sin responder'} onClick={() => { setI(k); setFase('hacer'); setHojaTodos(false); }} />)}
        </div>
      </Hoja>
    </>
  );

  // ——— Guardado: el resultado y lo que sigue ———
  if (guardado) {
    return (
      <Inmersiva titulo={titulo} area={area} salir={salir} info={INFO}
        pie={<><Boton variante="primario" ancho icono="siguiente" href="#/estudio">Volver a Estudio</Boton>{enSesion && <Boton variante="secundario" ancho href={`#/sesion/${a.id}`}>Seguir la sesión</Boton>}</>}>
        <p className="t-rotulo se-kicker">{unitName(a, unit)}</p>
        <Tarjeta heroe area={area} className="se-heroe">
          <Resultado pct={pct} ok={ok} nota={`${sc} de ${total} bien`} refNumero={numero} />
        </Tarjeta>
        <p className="t-cuerpo-l se-sigue">{completo}</p>
      </Inmersiva>
    );
  }

  // ——— Uno por vez (en papel, con banco de ejercicios) ———
  if (papel && conEj && fase === 'hacer') {
    const e = ex[i];
    const ultimoEj = i === total - 1;
    return (
      <Inmersiva titulo={titulo} area={area} salir={salir} info={INFO}
        progreso={<div className="se-barra-test"><Barra valor={respondidas} max={total} nombre="Ejercicios respondidos" area={area} /></div>}
        pie={<Boton variante="primario" ancho icono={ultimoEj ? 'tilde' : 'siguiente'} onClick={() => { haptico('leve'); if (ultimoEj) setFase('resultado'); else setI(i + 1); }}>{ultimoEj ? 'Ver resultado' : 'Siguiente'}</Boton>}>
        <Segmentado etiqueta="Dónde lo hacés" valor={modo} onCambio={setModo} opciones={[['app', 'En la app'], ['papel', 'En papel']]} />
        <div className="capa-2 se-ejercicio" key={i}>
          <p className="t-rotulo se-ej-cab"><span>Ejercicio {i + 1} de {total}</span><span className="t-dato">{respondidas} respondidos</span></p>
          <p className="se-pregunta t-seccion">{e.q}</p>
          <CampoTexto etiqueta="Tu resultado" valor={resp[i]} onCambio={(v) => setResp((r) => r.map((x, k) => (k === i ? v : x)))} modo="text" />
        </div>
        <div className="se-nav">
          {i > 0 ? <Boton variante="secundario" icono="atras" onClick={() => setI(i - 1)}>Anterior</Boton> : <span />}
          <Boton variante="fantasma" icono="linea" onClick={() => setHojaTodos(true)}>Ver todos</Boton>
        </div>
        {filaClaude}
        {hojas}
      </Inmersiva>
    );
  }

  // ——— Cargar el resultado ———
  return (
    <Inmersiva titulo={titulo} area={area} salir={salir} info={INFO}
      pie={<><p className="t-nota se-corto">{corto}</p><Boton variante="primario" ancho icono="tilde" onClick={guardar}>{papel ? 'Guardar test' : 'Guardar resultado'}</Boton></>}>
      <p className="t-rotulo se-kicker">{front?.name} · {prev ? `intento ${prev + 1} de ${MAX_TRIES}` : 'día 2'}</p>
      <h2 className="t-seccion">{unitName(a, unit)}</h2>
      {!papel && <p className="t-nota">{que} · {t.min} min, sin apuntes.</p>}
      {!(papel && conEj) && <Segmentado etiqueta="Dónde lo hacés" valor={modo} onCambio={setModo} opciones={[['app', 'En la app'], ['papel', 'En papel']]} />}

      <Tarjeta heroe area={area} className="se-heroe">
        <Resultado pct={pct} ok={ok} nota={`${sc} de ${total} bien${sinResponder ? ` · ${sinResponder} sin responder` : ''}`} refNumero={numero} />
        {!papel && <Puntaje score={score} total={total} etiqueta="Ejercicios bien resueltos" onCambio={setScore} />}
      </Tarjeta>

      {!papel && fallados > 0 && <Errores fallados={fallados} errors={er} detalle onCambio={(k, v) => setErrors({ ...er, [k]: v })} />}

      {papel && conEj && (
        <Grupo titulo="Los que fallaste" extremo={<Boton tamano="s" variante="fantasma" icono="editar" onClick={() => setFase('hacer')}>Revisar respuestas</Boton>}>
          {mal.length > 0 ? (
            <>
              <div className="capa-1 s-lista">
                {(verMal ? mal : mal.slice(0, 5)).map((k) => (
                  <Fila key={k} titulo={`${k + 1}. ${ex[k].q}`} nota={claude ? undefined : `Tu resultado: ${resp[k]} · era ${ex[k].a}`}
                    extremo={<button type="button" className="se-tipo" aria-label={`Ejercicio ${k + 1}: ${ERR[tipoDe(k)][0]}. Tocá para cambiar el tipo`} onClick={() => otroTipo(k)}>{ERR[tipoDe(k)][0]}</button>} />
                ))}
              </div>
              {mal.length > 5 && <Boton variante="fantasma" icono={verMal ? 'arriba' : 'abajo'} onClick={() => setVerMal((v) => !v)}>{verMal ? 'Ver menos' : `Ver los ${mal.length - 5} que faltan`}</Boton>}
            </>
          ) : <p className="t-cuerpo capa-1 se-sin-errores">Sin errores.</p>}
        </Grupo>
      )}

      {papel && !conEj && (
        <Grupo titulo="Marcá los que fallaste" extremo={<span className="t-rotulo">Tocá cada uno</span>}>
          <p className="t-nota">{unit.test.desc}</p>
          <div className="se-grilla">
            {perEx.map((e, k) => (
              <button key={k} type="button" className={`se-celda${e ? ' mal' : ''}`} onClick={() => ciclo(k)} aria-label={`Ejercicio ${k + 1}: ${e ? ERR[e][0] : 'bien'}`}>
                <span className="t-dato">{k + 1}</span>
                <b>{e ? ERR[e][0] : <Icono nombre="tilde" lado={16} />}</b>
              </button>
            ))}
          </div>
        </Grupo>
      )}
      {filaClaude}
      {hojas}
    </Inmersiva>
  );
}

/** Ola 20 · test final de un libro: todo el libro, sin el libro. Con 85 % o más, mañana la tesis final. */
function TestFinal({ day, actId }: { day: PropsV2['day']; actId: string }) {
  const study = useStore((s) => s.study);
  const a = study.activities.find((x) => x.id === actId);
  const l = a?.libro ? libroPorId(a.libro) : undefined;
  const total = l?.final?.preguntas ?? 20;
  const [score, setScore] = useState(total);
  const [errors, setErrors] = useState(zero);
  const [hecho, setHecho] = useState<boolean | null>(null);
  const numero = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (hecho) festejar(numero.current); else if (hecho === false) haptico('leve'); }, [hecho]);
  if (!a || !a.final) return <NoHay texto="No encontré ese test final" />;
  const area = areaDeFrente(study, a.front);
  const fin = study.finales?.[a.id];
  const pct = Math.round((score / total) * 100);
  const ok = approves(score, total);
  const fallados = total - score;
  const errOk = ajustarErrores(errors, fallados);
  const volver = { href: l ? `#/estudio/libro/${l.id}` : '#/estudio', nombre: l ? 'el libro' : 'Estudio' };
  const guardar = () => {
    const r = guardarTestFinal(day.date, a.id, { score, total, errors: errOk, mode: 'app' });
    setHecho(r.approved);
    aviso({ titulo: r.approved ? `Test final aprobado · ${pct} %` : `${pct} % · se repite`, sub: r.approved ? 'Mañana, la tesis final' : 'Repasá lo que falló y repetilo', tono: r.approved ? 'hecho' : 'info' });
  };
  const info = (
    <>
      <p className="t-cuerpo-l">Todo el libro, sin el libro. Se aprueba con {corte} %.</p>
      <p className="t-cuerpo">Con {corte} % o más, mañana va la tesis final y después el artefacto. Con menos, repasás lo que falló y lo repetís.</p>
    </>
  );
  return (
    <Inmersiva titulo="Test final" area={area} salir={volver} info={info}
      pie={fin?.aprobadoOn
        ? <Boton variante="primario" ancho icono="siguiente" href={volver.href}>Volver al libro</Boton>
        : hecho == null
          ? <><p className="t-nota se-corto">{ok ? 'Aprobado: mañana va la tesis final.' : 'No aprobado: se repite.'}</p><Boton variante="primario" ancho icono="tilde" onClick={guardar}>Guardar resultado</Boton></>
          : <Boton variante="primario" ancho icono="siguiente" href={volver.href}>Volver al libro</Boton>}>
      <p className="t-rotulo se-kicker">{fin?.tests.length ? `Intento ${fin.tests.length + 1}` : 'Todo el libro'} · {l?.final?.min ?? 40} min</p>
      <h2 className="t-seccion">{a.final.title}</h2>
      <p className="t-nota">{a.final.desc}</p>
      {fin?.aprobadoOn ? (
        <Tarjeta capa={1}><p className="t-cuerpo-l se-sigue">Ya lo aprobaste. Sigue la tesis final y, después, el artefacto.</p></Tarjeta>
      ) : (
        <>
          <Tarjeta heroe area={area} className="se-heroe">
            <Resultado pct={pct} ok={ok} nota={`${score} de ${total} bien`} refNumero={numero} />
            {hecho == null && <Puntaje score={score} total={total} etiqueta="Preguntas bien respondidas" onCambio={setScore} />}
          </Tarjeta>
          {hecho == null && fallados > 0 && <Errores fallados={fallados} errors={errOk} detalle={false} onCambio={(k, v) => setErrors({ ...errOk, [k]: v })} />}
          {hecho != null && <p className="t-cuerpo-l se-sigue">{hecho ? 'Aprobado. Mañana, la tesis final.' : 'No llegaste. Repasá lo que falló y repetilo.'}</p>}
        </>
      )}
    </Inmersiva>
  );
}
