/**
 * Trazo 2.0 · unidades y tests del bimestre (#/unidades): qué incluye cada test y qué toca hoy en cada unidad (cold recall, test,
 * tesis, estudio). Una pestaña por libro con capítulos; cada unidad es una fila con su estado de hoy y, al tocarla, su hoja con lo que
 * incluye el test y el botón para abrirlo.
 */
import { useState } from 'react';
import { bimester } from '../../data/derive';
import { actShort, testOf, unitName, unitStatus } from '../../data/study';
import type { Activity, Unit } from '../../data/study-types';
import { useStore } from '../../state/store';
import { areaDeFrente, plural } from './comun';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Fila, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import '../proyecto/proyecto.css';
import './sesiones.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada unidad pasa por el mismo camino: estudiar, cold recall, test, tesis y repetir.</p>
    <p className="t-cuerpo">La fila dice qué toca hoy en esa unidad. Tocala para ver qué incluye su test y abrirlo.</p>
    <p className="t-cuerpo">Se aprueba con 85 %. Con menos, releés lo que falló y hacés un re-test; a la tercera vez sin aprobar, el tema queda flojo.</p>
  </>
);

/** El estado de hoy de una unidad: "hoy" es la marca (acá estás); lo flojo, una píldora con borde. */
function Estadito({ label, tone }: { label: string; tone: '' | 'on' | 'hoy' | 'flojo' }) {
  if (label === '✓') return <span className="se-est on"><Icono nombre="tilde" lado={16} /><span className="v2-oculto">Hecha</span></span>;
  if (tone === 'hoy') return <span className="se-est hoy">{label}</span>;
  if (tone === 'flojo') return <span className="s-estado se-est-flojo"><Icono nombre="atencion" lado={16} />{label}</span>;
  return <span className={`se-est${tone === 'on' ? ' on' : ''}`}>{label}</span>;
}

export default function UnidadesV2({ day }: PropsV2) {
  const study = useStore((s) => s.study);
  const settings = useStore((s) => s.settings)!;
  const names = useStore((s) => s.goals.bimesterNames);
  const conUnidades = study.activities.filter((a) => a.units?.length && !a.archivada);
  const [tab, setTab] = useState(conUnidades[0]?.id);
  const [abierta, setAbierta] = useState<{ a: Activity; u: Unit } | null>(null);
  const [final, setFinal] = useState(false);
  const a = conUnidades.find((x) => x.id === tab) ?? conUnidades[0];
  const bim = bimester(settings.startDate, day.date, names);
  const area = areaDeFrente(study, a?.front);
  const aprobadas = a ? a.units!.filter((u) => study.units[a.id]?.[u.n]?.approvedOn).length : 0;
  const st = abierta ? unitStatus(abierta.a, study, abierta.u.n, day.date) : null;
  const t = abierta ? testOf(abierta.u) : null;

  return (
    <Marco titulo="Unidades y tests" rotulo={`Bimestre ${bim.n} · ${bim.name}`} volver={{ href: '#/estudio', nombre: 'Estudio' }} info={INFO} className="se-unidades">
      {!a ? (
        <Vacio ilustracion="estudio" titulo="Sin libros con capítulos" texto="Sumá un libro o un curso con unidades para ver sus tests." accion={<Boton variante="primario" href="#/actividad">Nueva actividad</Boton>} />
      ) : (
        <>
          <div className="se-tabs" role="tablist" aria-label="Libro">
            {conUnidades.map((x) => {
              const ok = x.units!.filter((u) => study.units[x.id]?.[u.n]?.approvedOn).length;
              return (
                <button key={x.id} type="button" role="tab" aria-selected={x.id === a.id} onClick={() => setTab(x.id)}>
                  {actShort(x)}<span className="t-dato">{ok}/{x.units!.length}</span>
                </button>
              );
            })}
          </div>
          <div className="se-resumen">
            <Barra valor={aprobadas} max={a.units!.length} nombre={`Unidades aprobadas de ${actShort(a)}`} area={area} />
            <span className="t-nota"><b className="t-dato">{aprobadas}</b> de {plural(a.units!.length, 'unidad aprobada', 'unidades aprobadas')}</span>
          </div>
          <Grupo titulo="Unidades">
            <ol className="capa-1 s-lista se-unid">
              {a.units!.map((u) => {
                const s = unitStatus(a, study, u.n, day.date);
                return (
                  <li key={u.n}>
                    <Fila titulo={<><span className="t-dato se-n">{String(u.n).padStart(2, '0')}</span>{u.title}</>} nota={s.label === '—' ? undefined : <Estadito {...s} />} valor={s.label === '—' ? '—' : undefined} onClick={() => setAbierta({ a, u })} />
                  </li>
                );
              })}
            </ol>
          </Grupo>
          {a.final && (
            <Grupo titulo="Cierre del bimestre">
              <div className="capa-1 s-lista"><Fila icono="certificado" titulo={a.final.title} nota="Qué incluye" onClick={() => setFinal(true)} /></div>
            </Grupo>
          )}
          <Hoja abierta={final} onCerrar={() => setFinal(false)} titulo={a.final?.title ?? 'Cierre'}>
            <p className="t-cuerpo-l">{a.final?.desc}</p>
          </Hoja>
        </>
      )}
      <Hoja abierta={!!abierta} onCerrar={() => setAbierta(null)} titulo={abierta ? unitName(abierta.a, abierta.u) : 'Unidad'}
        pie={abierta && <Boton variante="primario" ancho icono="siguiente" href={`#/test/${abierta.a.id}/${abierta.u.n}`}>Abrir el test</Boton>}>
        {abierta && st && t && (
          <div className="se-hoja">
            <p className="t-rotulo">Hoy</p>
            <div><Estadito {...st} /></div>
            <p className="t-rotulo">Qué incluye el test</p>
            <p className="t-cuerpo-l">{abierta.u.test.desc}</p>
            <p className="t-nota">{plural(t.total, 'ejercicio', 'ejercicios')}{t.prev ? `, ${t.prev} de capítulos anteriores` : ''} · {t.min} min · se aprueba con 85 %.</p>
          </div>
        )}
      </Hoja>
    </Marco>
  );
}
