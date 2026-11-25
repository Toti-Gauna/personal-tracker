/**
 * Trazo 2.0 · Idiomas (#/metas/ingles): en qué fase del idioma estás, el kit de respuestas de entrevista que ensayás en voz alta y lo que
 * falló al hablar (que ya es tarjeta del repaso). Mismos datos y mismas funciones que la 1.0: cada ensayo suma uno, cada falla
 * entra al motor de repaso con la escalera +1, +3, +7, +21, +60.
 */
import { useState } from 'react';
import { PLAN, diaSemanaCorto, faseIngles, inicioDe } from '../../data/plan';
import { ensayarRespuesta, sumarFallaIngles } from '../../state/plan';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Segmentado } from '../kit/controles';
import { Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja, Lista } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, useT0 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

const TIPOS_FALLA = ['fluidez', 'gramática', 'pronunciación', 'vocabulario'] as const;
const TIPO_TXT: [string, string][] = TIPOS_FALLA.map((x) => [x, x.charAt(0).toUpperCase() + x.slice(1)]);

/** Lo que falló al hablar: la lista y el campo para sumar una. */
function Fallas({ hoy }: { hoy: string }) {
  const fallas = useStore((s) => s.plan.fallasIngles);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<string>(TIPOS_FALLA[0]);
  const agregar = () => {
    if (!texto.trim()) return;
    sumarFallaIngles(hoy, texto.trim(), tipo);
    aviso({ titulo: 'Ya es tarjeta', sub: 'Entra al repaso de inglés', tono: 'hecho' });
    setTexto('');
  };
  return (
    <div className="pt-campo-hoja">
      <CampoTexto etiqueta="Qué falló al hablar" valor={texto} onCambio={setTexto} />
      <Segmentado etiqueta="Tipo" opciones={TIPO_TXT} valor={tipo} onCambio={setTipo} />
      <Boton variante="primario" icono="mas" deshabilitado={!texto.trim()} onClick={agregar}>Agregar</Boton>
      <p className="t-nota">Entran al mismo motor de repaso que matemática: escalera +1, +3, +7, +21, +60.</p>
      {fallas.length > 0 && (
        <ul className="capa-1 pt-revs">
          {[...fallas].reverse().map((x, i) => <li key={i}><span className="t-rotulo">{x.tipo}</span><span className="t-cuerpo">{x.texto}</span></li>)}
        </ul>
      )}
    </div>
  );
}

export default function InglesV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const t0 = useT0();
  const plan = useStore((s) => s.plan);
  const f = faseIngles(date, t0);
  const fases = PLAN.ingles.fases;
  const ent = plan.entrevistas.filter((x) => x.fecha >= date).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const ens = plan.respuestas.filter((r) => r.veces > 0).length;
  const ensayar = () => {
    const r = [...plan.respuestas].sort((a, b) => a.veces - b.veces)[0];
    ensayarRespuesta(date, r?.id);
    if (r) aviso({ titulo: 'Respuesta ensayada', sub: r.texto, tono: 'hecho' });
  };

  const INFO = (
    <>
      <p className="t-cuerpo-l">Un idioma por año: inglés hasta el Cambridge C1 y, desde el 27 de diciembre de 2027, francés.</p>
      <p className="t-cuerpo">Las respuestas se practican en el bloque de búsqueda laboral, sobre todo el día antes de una entrevista. Cada vez que tildás una, suma un ensayo.</p>
      <p className="t-cuerpo">Lo que falló al hablar entra al mismo motor de repaso que matemática: escalera +1, +3, +7, +21, +60.</p>
    </>
  );

  return (
    <Marco className="tr" titulo="Idiomas" rotulo={f.nombre} volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      <Tarjeta heroe area={AREA.ingles} etiqueta="La fase de ahora" className="tr-heroe">
        <p className="t-rotulo">Ahora</p>
        <p className="t-seccion">{f.nombre}</p>
        <p className="t-cuerpo">{f.texto}</p>
      </Tarjeta>

      <Grupo titulo="Fases">
        <div className="capa-1 s-lista">
          {fases.map((x) => (
            <Fila key={x.id} area={AREA.ingles} titulo={x.nombre} extremo={x.id === f.id ? <span className="tr-aqui">Ahora</span> : <span className="t-dato tr-desde">{dm(inicioDe(x, t0))}</span>} />
          ))}
          <Fila icono="idioma" titulo="El roadmap de idiomas y libros" href="#/estudio/idiomas" />
        </div>
      </Grupo>

      <Grupo titulo="Respuestas de entrevista" extremo={<span className="t-rotulo">{ens} de {plan.respuestas.length} ensayadas</span>}>
        <Boton variante="primario" ancho icono="play" onClick={ensayar}>Ensayar en voz alta</Boton>
        <div className="capa-1 s-lista">
          <FilaHoja icono="documento" titulo={ent ? `Para el ${diaSemanaCorto(ent.fecha)} ${Number(ent.fecha.slice(8))}` : 'Kit de entrevista'} nota="Tildá una cada vez que la ensayes" valor={`${ens} de ${plan.respuestas.length}`} hecho={plan.respuestas.length > 0 && ens >= plan.respuestas.length} tituloHoja="Kit de entrevista">
            <Lista items={plan.respuestas.map((r) => ({ clave: r.id, etiqueta: r.texto, nota: r.veces > 0 ? `Ensayada ${r.veces} ${r.veces === 1 ? 'vez' : 'veces'}` : 'Sin ensayar', marcada: r.veces > 0 }))} onCambio={(k) => ensayarRespuesta(date, k)} area={AREA.ingles} festejo={false} />
          </FilaHoja>
        </div>
      </Grupo>

      <Grupo titulo="Lo que falló">
        <div className="capa-1 s-lista">
          <FilaHoja icono="alerta" titulo="Fallas al hablar" nota="Cada una ya es tarjeta" valor={String(plan.fallasIngles.length)} tituloHoja="Lo que falló · ya es tarjeta">
            <Fallas hoy={date} />
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}
