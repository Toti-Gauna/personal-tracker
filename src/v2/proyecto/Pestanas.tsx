/**
 * Trazo 2.0 · las pestañas "Ficha" y "Stack" de un bloque. La ficha es lo que el plan dice del bloque (qué es, cómo se
 * construye, qué dice al mercado), en tres grupos; el stack, los entornos y las tecnologías con su marca (nueva, reusada o movida).
 */
import { herramientasDe } from '../../data/herramientas';
import { bloqueExtPorId } from '../../data/plan-extendido';
import { fichaV7 } from '../../data/proyectos-v7';
import type { Tramo } from '../../data/plan';
import { Icono } from '../iconos';
import { Fila } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { fichaFilas } from './datos';
import { FilaHoja } from './piezas';

export function FichaTab({ id }: { id: string }) {
  const grupos = fichaFilas(id);
  const estrella = grupos.some((g) => g.filas.some((f) => f.lista?.some((x) => x.estrella)));
  return (
    <>
      {grupos.map((g) => (
        <Grupo key={g.grupo} titulo={g.grupo}>
          <dl className="capa-1 pt-ficha">
            {g.filas.map((f) => (
              <div key={f.etiqueta} className="pt-ficha-fila">
                <dt className="t-rotulo">{f.etiqueta}</dt>
                <dd>
                  {f.texto && <p className="t-cuerpo">{f.texto}</p>}
                  {f.lista && <ul className="pt-items">{f.lista.map((x) => <li key={x.t} className={x.estrella ? 'estrella' : undefined}>{x.estrella && <Icono nombre="estrella" lado={14} titulo="Estrella" />}{x.t}</li>)}</ul>}
                  {f.nota && <p className="t-nota">{f.nota}</p>}
                </dd>
              </div>
            ))}
          </dl>
        </Grupo>
      ))}
      {estrella && <p className="t-nota pt-pie"><Icono nombre="estrella" lado={14} /> Herramienta o demo estrella, dentro del alcance.</p>}
    </>
  );
}

const MARCA_TXT = { nueva: 'Nueva', reusada: 'Reusada', movida: 'Movida' } as const;
const fh = (d: string) => `${Number(d.slice(8))}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** ¿Este bloque tiene algo que mostrar en la pestaña Stack? */
export function tieneStack(id: string, t?: Tramo) {
  return !!(bloqueExtPorId(id)?.tecnologias?.length || fichaV7(id)?.stack || t?.stack?.length || t?.perfil);
}

export function StackTab({ id, t }: { id: string; t?: Tramo }) {
  const b = bloqueExtPorId(id);
  const tec = b?.tecnologias ?? [];
  const st = fichaV7(id)?.stack;
  const marcadas = tec.filter((x) => x.marca);
  const resto = tec.length ? tec.filter((x) => !x.marca).map((x) => ({ nombre: x.nombre, opcional: x.opcional })) : (t?.stack ?? []).map((nombre) => ({ nombre, opcional: false }));
  const herr = herramientasDe(id);
  return (
    <>
      {t?.perfil && <Grupo titulo="Perfil al cerrar"><p className="capa-1 pt-perfil t-cuerpo-l">{t.perfil}</p></Grupo>}
      {st?.ambientes.length ? (
        <Grupo titulo="Entornos">
          <dl className="capa-1 pt-ficha">
            {st.ambientes.map((a) => <div key={a.ambiente} className="pt-ficha-fila"><dt className="t-rotulo">{a.ambiente}</dt><dd><p className="t-cuerpo">{a.texto}</p></dd></div>)}
          </dl>
          {st.nota && <p className="t-nota pt-pie">{st.nota}</p>}
        </Grupo>
      ) : null}
      {marcadas.length > 0 && (
        <Grupo titulo="Tecnología nueva">
          <div className="capa-1 s-lista">
            {marcadas.map((x) => <Fila key={x.nombre} titulo={x.nombre} nota={x.nota} valor={<span className={`pt-marca ${x.marca}`}>{MARCA_TXT[x.marca!]}{x.desde ? ` · ${x.desde}` : ''}</span>} />)}
          </div>
          <p className="t-nota pt-pie">Una tecnología nueva por proyecto como máximo, y ninguna en bloques con certificación.</p>
        </Grupo>
      )}
      {resto.length > 0 && (
        <Grupo titulo={marcadas.length ? 'Parte del trabajo' : 'Qué aprendés'}>
          <div className="pt-chips">{resto.map((x) => <span key={x.nombre} className="hy-chip">{x.nombre}{x.opcional ? ' †' : ''}</span>)}</div>
          {resto.some((x) => x.opcional) && <p className="t-nota pt-pie">† Propuesta a confirmar.</p>}
        </Grupo>
      )}
      {b?.recortarPrimero?.length ? <p className="t-nota pt-pie">Si {id} se pasa de horas, se recorta primero: {b.recortarPrimero.join(' y ')}.</p> : null}
      {b?.historial?.length ? (
        <div className="capa-1 s-lista">
          <FilaHoja icono="documento" titulo="Historial de cambios" valor={String(b.historial.length)}>
            <ol className="capa-1 pt-revs">{b.historial.map((h, i) => <li key={i}><span className="t-rotulo">{fh(h.fecha)}</span><span className="t-cuerpo">{h.cambio}</span><span className="t-nota">{h.motivo}</span></li>)}</ol>
          </FilaHoja>
        </div>
      ) : null}
      {herr.length > 0 && (
        <Grupo titulo="Open source">
          <div className="capa-1 s-lista">
            {herr.map(({ h, v }) => <Fila key={h.id + v.id} icono="paquete" titulo={`${h.nombre} ${v.id}`} nota={v.linea} href="#/metas/open-source" />)}
          </div>
        </Grupo>
      )}
    </>
  );
}
