/**
 * Trazo 2.0 · la hoja del simulacro dirigido (#/flojo/simulacro): los 40 ejercicios repartidos según lo flojo, para imprimir.
 * Al imprimir queda solo el título y la hoja: el resto (barra, botón, datos) no sale en el papel.
 */
import { useMemo } from 'react';
import { simulacro } from '../../data/debiles';
import { chapterExercises } from '../../data/ejercicios';
import { useStore } from '../../state/store';
import { Boton } from '../kit/controles';
import { Dato, Tarjeta, Vacio } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { fuerzasDe } from './datos';
import './temas.css';

export default function SimulacroV2() {
  const st = useStore((s) => s.study);
  const { a, hoja } = useMemo(() => {
    const { a: act, f } = fuerzasDe(st);
    return { a: act, hoja: simulacro(f).flatMap((x) => chapterExercises(x.unit, x.n, `simulacro:${x.unit}:${st.log.length}`)) };
  }, [st]);
  const titulo = a?.final?.title ?? 'Simulacro';
  return (
    <Marco className="tm tm-sim" titulo="Simulacro" volver={{ href: '#/flojo/examenes', nombre: 'Exámenes' }}
      info={(
        <>
          <p className="t-cuerpo-l">Los 40 ejercicios del examen, con más de lo flojo y menos de lo que ya dominás.</p>
          <p className="t-cuerpo">{titulo}: sin apuntes y en 90 minutos. Se aprueba con 85 %.</p>
          <p className="t-cuerpo">Las respuestas: pedíselas a Claude con la foto de la hoja, o corregí cada capítulo en su test.</p>
        </>
      )}>
      {hoja.length === 0 ? (
        <Vacio ilustracion="datos" titulo="No hay ejercicios para armar" texto="El simulacro usa el banco de ejercicios de Aritmética." accion={<Boton variante="secundario" href="#/flojo/examenes">Volver a Exámenes</Boton>} />
      ) : (
        <>
          <Tarjeta heroe area="var(--a-eclipse)" className="tm-no-imprimir tm-sim-cab">
            <div className="tm-datos dos">
              <Dato valor={hoja.length} etiqueta="Ejercicios" />
              <Dato valor={90} unidad="min" etiqueta="Tiempo" />
            </div>
            <Boton variante="primario" ancho icono="exportar" onClick={() => window.print()}>Imprimir hoja</Boton>
          </Tarjeta>
          <p className="t-cuerpo tm-solo-imprimir">{titulo}: {hoja.length} ejercicios, más de lo flojo. Sin apuntes, 90 minutos. Aprobás con 85 %.</p>
          <ol className="capa-1 tm-hoja" aria-label="Ejercicios del simulacro">
            {hoja.map((e, i) => <li key={i}><span className="t-dato">{i + 1}</span><span className="t-cuerpo">{e.q}</span></li>)}
          </ol>
        </>
      )}
    </Marco>
  );
}
