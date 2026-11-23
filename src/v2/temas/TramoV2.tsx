/**
 * Trazo 2.0 · un tramo de Matemática (#/estudio/mate/<id>): una ventana (W1, WQ1…) o un tramo diario. Dónde estás, qué libro
 * manda, el nivel de salida (que se tilda acá), la puerta que abre el proyecto siguiente y las reglas de refuerzo en una hoja.
 */
import { PLAN, T0_PLAN } from '../../data/plan';
import { PLAN_EXT, ROL_REFUERZO } from '../../data/plan-extendido';
import { PUERTA, TEXTO_LUZ, avanceSalida, estadoEn, refuerzoPara, rutaMate, salidaDe, type ItemMate } from '../../data/plan-vistas';
import { resumenLibro } from '../../data/estado-capitulo';
import { actShort, arranco } from '../../data/study';
import type { Activity } from '../../data/study-types';
import { tildarSalida } from '../../state/plan';
import { useStore } from '../../state/store';
import { Boton } from '../kit/controles';
import { Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja, Lista, hechasDe } from '../proyecto/piezas';
import { contarPalabras } from '../reglas';
import type { PropsV2 } from '../registro';
import { fch, pct } from './datos';
import '../proyecto/proyecto.css';
import './temas.css';

/** Los libros de la app que nombra un tramo ("CONAMAT Aritmética" → conamat). */
export function librosDelTramo(it: Pick<ItemMate, 'principal'>, activities: Activity[]) {
  const norm = (x: string) => x.toLowerCase().replace(/·/g, ' ').replace(/\s+/g, ' ').trim();
  return it.principal.map((p) => activities.find((a) => !!a.units?.length && norm(a.title) === norm(p))).filter((a): a is Activity => !!a);
}

const MOTIVOS: [string, string][] = [['concepto', 'Fallás por concepto'], ['tecnica', 'Fallás por técnica'], ['enunciado', 'No entendés el enunciado'], ['profundidad', 'Querés más profundidad']];

export default function TramoV2({ day, id }: { day: PropsV2['day']; id: string }) {
  const hoy = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const study = useStore((s) => s.study);
  useStore((s) => s.plan.extrasApagados);
  const items = rutaMate(t0);
  const it = items.find((x) => x.id === id);
  if (!it) {
    return (
      <Marco className="tm" titulo="Tramo" volver={{ href: '#/estudio/mate', nombre: 'Matemática' }}>
        <Vacio ilustracion="buscar" titulo="No encontré ese tramo" texto="Puede que el plan haya cambiado." accion={<Boton variante="secundario" href="#/estudio/mate">Ver Matemática</Boton>} />
      </Marco>
    );
  }
  const i = items.indexOf(it);
  const est = estadoEn(it, hoy);
  const gate = PLAN.programacion.puertas[it.id];
  const examen = plan.proyectos[it.id]?.examen;
  const libros = librosDelTramo(it, study.activities);
  const crit = it.tipo === 'ventana' ? salidaDe(it.id) : [];
  const av = avanceSalida(plan, it.id);
  const hechos = new Set(plan.salida?.[it.id] ?? []);
  const titulo = contarPalabras(it.nombre) <= 3 ? it.nombre : `Tramo ${it.id}`;
  const luz = examen ? (examen.puntaje >= 85 ? 'verde' : examen.puntaje >= 65 ? 'amarillo' : 'rojo') : null;
  return (
    <Marco className="tm" titulo={titulo} rotulo={`${est === 'actual' ? 'Estás acá' : est === 'hecho' ? 'Pasó' : 'Todavía no'} · ${fch(it.inicio)} – ${fch(it.fin)}`} volver={{ href: '#/estudio/mate', nombre: 'Matemática' }}
      info={(
        <>
          <p className="t-cuerpo-l">{it.tipo === 'ventana' ? 'Semanas de matemática intensiva: los bloques de programación pasan a matemática.' : `Matemática diaria en libro y papel${it.horas ? `: ${it.horas} h en total` : ''}.`}</p>
          <p className="t-cuerpo">{PLAN_EXT.matematica.principio}</p>
          <p className="t-cuerpo">Regla: {pct(PUERTA.verde)} o más aprueba; de {pct(PUERTA.amarillo)} a 84 %, refuerzo y retest; con menos, vuelve al tema.</p>
        </>
      )}>
      <Tarjeta heroe area="var(--a-economia)" className="tm-aca">
        <span className="t-rotulo">Al terminarlo sos</span>
        <b className="t-seccion">{it.perfil}</b>
        <div className="tm-datos">
          <Dato valor={it.semanas} etiqueta={it.semanas === 1 ? 'semana' : 'semanas'} />
          {it.horas ? <Dato valor={it.horas} unidad="h" etiqueta="de estudio" /> : null}
        </div>
      </Tarjeta>

      <Grupo titulo={libros.length ? 'Los libros' : 'Qué libro manda'}>
        <div className="capa-1 s-lista">
          {libros.length
            ? libros.map((a) => {
              const r = resumenLibro(study, a, hoy);
              const empezo = arranco(study, a);
              const antes = study.activities.find((x) => x.id === a.despuesDe);
              const nota = !empezo ? `Arranca al terminar ${antes ? actShort(antes) : 'el anterior'}` : r.enCurso ? `${a.unitLabel ?? 'Cap.'} ${r.enCurso.n} · ${r.enCurso.unit.title} · ${r.enCurso.etiqueta}` : 'Todos los capítulos aprobados';
              return <Fila key={a.id} icono="matematica" titulo={actShort(a)} nota={nota} valor={`${r.aprobados}/${r.total}`} href={`#/estudio/mate/libro/${a.id}`} />;
            })
            : it.principal.map((t) => <Fila key={t} icono="documento" titulo={t} />)}
        </div>
        <p className="t-nota pt-pie">Habilita: {it.habilita.join(', ')}</p>
      </Grupo>

      {(crit.length > 0 || gate || it.refuerzo.length > 0) && (
        <Grupo titulo="Para pasar">
          <div className="capa-1 s-lista">
            {crit.length > 0 && (
              <FilaHoja icono="meta" titulo="Nivel de salida" valor={hechasDe(av.hechos, av.total)} hecho={av.completo} tituloHoja={`Nivel de salida · ${it.id}`}>
                <Lista items={crit.map((c, k) => ({ clave: String(k), etiqueta: c, marcada: hechos.has(k) }))} onCambio={(k) => tildarSalida(it.id, Number(k))} area="var(--a-economia)" />
                <p className="t-nota pt-pie">
                  {av.completo ? 'Nivel de salida completo: listo para el test de la puerta.'
                    : examen && examen.puntaje >= 85 ? `Puerta aprobada por el test (${examen.puntaje} %), pero ${av.total - av.hechos === 1 ? 'te falta 1 criterio' : `te faltan ${av.total - av.hechos} criterios`} de salida: repasalos antes del proyecto.`
                      : 'Tildá cada criterio cuando lo puedas hacer sin ayuda; con todos, hacé el test de la puerta (85 %).'}
                </p>
              </FilaHoja>
            )}
            <FilaHoja icono="alerta" titulo="Reglas y refuerzo" tituloHoja="Si un test sale mal">
              <ul className="capa-1 tm-semaforo">
                <li className="verde"><i aria-hidden="true" /><span><b className="t-cuerpo">85 % o más</b><span className="t-nota">{TEXTO_LUZ.verde}</span></span></li>
                <li className="amarillo"><i aria-hidden="true" /><span><b className="t-cuerpo">65 a 84 %</b><span className="t-nota">{TEXTO_LUZ.amarillo}</span></span></li>
                <li className="rojo"><i aria-hidden="true" /><span><b className="t-cuerpo">Menos de 65 %</b><span className="t-nota">{TEXTO_LUZ.rojo}</span></span></li>
              </ul>
              <ul className="capa-1 tm-roles">
                {MOTIVOS.map(([k, t]) => {
                  const rs = refuerzoPara(it, k);
                  return <li key={k}><b className="t-cuerpo">{t}</b><span className="t-nota">{rs.length ? rs.map((r) => r.titulo).join(' · ') : 'Retest con más cuidado; no hace falta otro libro.'}</span></li>;
                })}
              </ul>
              <h3 className="t-rotulo tm-sub">Refuerzo: se abre por tema y tipo de error, nunca en lugar del libro</h3>
              <ul className="capa-1 tm-roles">{it.refuerzo.map((r) => <li key={r.titulo}><b className="t-cuerpo">{r.titulo}</b><span className="t-nota">{ROL_REFUERZO[r.rol]}</span></li>)}</ul>
            </FilaHoja>
          </div>
        </Grupo>
      )}

      {gate && (
        <Tarjeta className="tm-puerta" area="var(--a-economia)">
          <p className="t-rotulo">Puerta de {gate}</p>
          <p className="t-cuerpo">{examen ? `Test cargado: ${examen.puntaje} % el ${fch(examen.fecha)}. ${TEXTO_LUZ[luz!]}` : `Sin aprobar con 85 % o más, ${gate} no arranca: la programación sigue siendo matemática y se descuenta del colchón.`}</p>
          <Boton variante={examen ? 'secundario' : 'primario'} href={`#/metas/proyecto/${it.id}`}>{examen ? 'Ver la puerta' : 'Cargar el test'}</Boton>
        </Tarjeta>
      )}

      <nav className="pt-vecinos" aria-label="Otros tramos">
        {items[i - 1] ? <Boton variante="fantasma" icono="atras" href={`#/estudio/mate/${items[i - 1].id}`}>{items[i - 1].id}</Boton> : <span />}
        {items[i + 1] ? <Boton variante="fantasma" icono="siguiente" href={`#/estudio/mate/${items[i + 1].id}`}>{items[i + 1].id}</Boton> : <span />}
      </nav>
    </Marco>
  );
}
