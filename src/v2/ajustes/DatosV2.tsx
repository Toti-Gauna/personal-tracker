/**
 * Trazo 2.0 · Copia de seguridad (#/ajustes-datos): todo lo de la app en un archivo, y restaurarlo. Restaurar reemplaza lo que hay en
 * el teléfono, así que se valida el archivo como en la 1.0 y se pregunta antes (con `confirmar`, ya no con el cuadro del navegador).
 */
import { useRef } from 'react';
import { reviewsJson, testsJson } from '../../data/debiles';
import { markBackup } from '../../state/profile';
import { getState, resetState, setState, useStore } from '../../state/store';
import { confirmar, aviso } from '../kit/capas';
import { Boton, fechaLarga } from '../kit/controles';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { descargar } from './piezas';
import './ajustes.css';

function Info() {
  const filas = useStore((s) => s.clipping.registro.length);
  const campanas = useStore((s) => s.clipping.campanas.length);
  const cuentas = useStore((s) => s.clipping.cuentas.length);
  return (
    <>
      <p className="t-cuerpo-l">Trazo guarda todo en este teléfono. La copia es un archivo con todo: días, tarjetas, metas, entrenos y ajustes.</p>
      <p className="t-cuerpo">Sirve para guardarlo o pasarlo a otro teléfono. Lo que va al repo es el JSON de cada día, desde el cierre.</p>
      <p className="t-cuerpo">Incluye la planilla del clipping: {filas} {filas === 1 ? 'fila' : 'filas'}, {campanas} {campanas === 1 ? 'campaña' : 'campañas'} y {cuentas} {cuentas === 1 ? 'cuenta' : 'cuentas'}. También se exporta sola desde Plan → Clipping → Registro.</p>
      <p className="t-cuerpo">Restaurar reemplaza todo lo que hay acá por lo que trae el archivo. Antes te pregunta.</p>
    </>
  );
}

export default function DatosV2({ today }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const entrada = useRef<HTMLInputElement>(null);
  const tarjetas = useStore((s) => s.study.cards.length);
  const dias = useStore((s) => Object.keys(s.days).length);
  const sesiones = useStore((s) => s.train.sessions.length);

  const bajar = () => {
    descargar(JSON.stringify({ trazo: 1, exportado: today, estado: getState() }, null, 1), `trazo-copia-${today}.json`);
    markBackup(today);
    aviso({ titulo: 'Copia descargada', sub: `trazo-copia-${today}.json`, tono: 'hecho' });
  };

  const bajarDatos = () => {
    const st = getState().study;
    descargar(JSON.stringify(reviewsJson(st), null, 1), 'reviews.json');
    descargar(JSON.stringify(testsJson(st), null, 1), 'tests.json');
    aviso({ titulo: 'reviews.json y tests.json', sub: 'Tus intentos y tus tests, para el repo', tono: 'hecho' });
  };

  const restaurar = (f?: File) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      let j;
      try {
        j = JSON.parse(String(rd.result));
        if (j?.trazo !== 1 || !j.estado?.settings) throw new Error('formato');
      } catch {
        aviso({ titulo: 'No es una copia de Trazo', sub: 'Elegí el archivo trazo-copia-….json. No se cambió nada.', tono: 'atencion' });
        return;
      }
      const ok = await confirmar({ titulo: '¿Restaurar esta copia?', texto: 'Esto reemplaza todo lo que hay en este teléfono por lo que trae la copia. No se puede deshacer.', accion: 'Restaurar copia', peligro: true });
      if (!ok) return;
      try { localStorage.setItem('trazo.v1', JSON.stringify(j.estado)); } catch { /* sin storage */ }
      resetState(j.estado);
      setState((s) => s);
      aviso({ titulo: 'Copia restaurada', sub: 'Recargá la app para ver todo al día', tono: 'hecho', accion: { etiqueta: 'Recargar', run: () => window.location.reload() } });
    };
    rd.onerror = () => aviso({ titulo: 'No se pudo leer el archivo', sub: 'No se cambió nada.', tono: 'atencion' });
    rd.readAsText(f);
  };

  return (
    <Marco className="ax" titulo="Copia de seguridad" volver={{ href: '#/ajustes', nombre: 'Ajustes' }} info={<Info />}>
      <Tarjeta heroe area="var(--a-economia)" etiqueta="Última copia" className="ax-copia">
        <span className="t-rotulo">Última copia</span>
        <b className="t-seccion">{settings.lastBackup ? fechaLarga(settings.lastBackup) : 'Sin copias'}</b>
        <div className="ax-datos">
          <Dato valor={dias} etiqueta="días" />
          <Dato valor={tarjetas} etiqueta="tarjetas" />
          <Dato valor={sesiones} etiqueta="entrenos" />
        </div>
        <Boton variante="primario" ancho icono="exportar" onClick={bajar}>Descargar copia</Boton>
      </Tarjeta>
      <Boton ancho icono="importar" onClick={() => entrada.current?.click()}>Restaurar desde un archivo</Boton>
      <input ref={entrada} type="file" accept="application/json,.json" hidden aria-label="Archivo de la copia" onChange={(e) => { restaurar(e.target.files?.[0]); e.target.value = ''; }} />
      <Grupo titulo="Más">
        <div className="capa-1 s-lista"><Fila icono="documento" titulo="Reviews y tests" nota="Dos archivos, para el repo" onClick={bajarDatos} extremo={<span />} /></div>
      </Grupo>
    </Marco>
  );
}
