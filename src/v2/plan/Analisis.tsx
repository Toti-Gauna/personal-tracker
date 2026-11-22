/** Trazo 2.0 · Análisis (#/metas/analisis): las pantallas que miran el plan desde afuera, juntas. Todavía son de la 1.0. */
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';

export function Analisis() {
  return (
    <Marco className="pl" titulo="Análisis" volver={{ href: '#/metas', nombre: 'Plan' }} intro="Cómo viene el plan contra lo que estimaste.">
      <Grupo titulo="Horas y fechas">
        <div className="capa-1 s-lista">
          <Fila icono="grafico" titulo="Calibración" nota="Real contra estimado" href="#/metas/calibracion" />
          <Fila icono="calendario" titulo="Diferencia contra el roadmap" nota="Cuánto se corre" href="#/metas/diferencia" />
          <Fila icono="ritmo" titulo="Impacto" nota="Qué cambia" href="#/metas/impacto" />
          <Fila icono="racha" titulo="Evolución" nota="Día a día" href="#/metas/evolucion" />
        </div>
      </Grupo>
      <Grupo titulo="Rutinas del plan">
        <div className="capa-1 s-lista">
          <Fila icono="repaso" titulo="Revisión semanal" nota="Los domingos" href="#/metas/revision" />
          <Fila icono="trabajo" titulo="Búsqueda" nota="Embudo y entrevistas" href="#/metas/trabajo" />
          <Fila icono="adelantado" titulo="Sprint de búsqueda" nota="Dos semanas intensas" href="#/metas/sprint" />
          <Fila icono="hardware" titulo="Compras y trámites" nota="Antes de cada fase" href="#/metas/compras" />
        </div>
      </Grupo>
    </Marco>
  );
}
