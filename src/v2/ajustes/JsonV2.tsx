/**
 * Trazo 2.0 · JSON del día (#/json): el día completo para pegarlo y commitearlo en data/days/. Se copia o se baja de un toque; el
 * texto entero se lee en una hoja (también sirve para copiarlo a mano si el teléfono no deja).
 */
import { useMemo, useState } from 'react';
import { dayJson } from '../../data/export';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { descargar } from './piezas';
import './ajustes.css';

export default function JsonV2({ day }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const names = useStore((s) => s.goals.bimesterNames);
  const train = useStore((s) => s.train);
  const clipping = useStore((s) => s.clipping);
  const [ver, setVer] = useState(false);
  const texto = useMemo(() => JSON.stringify(dayJson(day, settings, days, names, train, clipping), null, 2), [day, settings, days, names, train, clipping]);
  const archivo = `${day.date}.json`;
  const lineas = texto.split('\n').length;
  const kb = Math.max(0.1, Math.round((new Blob([texto]).size / 1024) * 10) / 10);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      aviso({ titulo: 'JSON copiado', sub: `Pegalo como data/days/${archivo}`, tono: 'hecho' });
    } catch {
      aviso({ titulo: 'No se pudo copiar', sub: 'Abrí el JSON y copialo a mano.', tono: 'atencion', accion: { etiqueta: 'Ver el JSON', run: () => setVer(true) } });
    }
  };

  return (
    <Marco className="ax" titulo="JSON del día" volver={{ href: '#/hoy', nombre: 'Hoy' }}
      info={<p className="t-cuerpo-l">Copialo y pegalo para que quede commiteado en data/days/{archivo}.</p>}>
      <Tarjeta heroe area="var(--a-economia)" etiqueta="El día en JSON" className="ax-copia">
        <span className="t-rotulo">Se guarda como</span>
        <b className="t-encabezado ax-ruta">data/days/{archivo}</b>
        <div className="ax-datos">
          <Dato valor={lineas} etiqueta="líneas" />
          <Dato valor={String(kb).replace('.', ',')} unidad="KB" etiqueta="tamaño" />
        </div>
        <Boton variante="primario" ancho icono="copiar" onClick={copiar}>Copiar JSON</Boton>
      </Tarjeta>
      <Boton ancho icono="exportar" onClick={() => descargar(texto + '\n', archivo)}>Descargar {archivo}</Boton>
      <Grupo titulo="Más">
        <div className="capa-1 s-lista"><Fila icono="json" titulo="Ver el JSON" valor={`${lineas} líneas`} onClick={() => setVer(true)} /></div>
      </Grupo>
      <Hoja abierta={ver} onCerrar={() => setVer(false)} titulo={archivo} alto="completa">
        <pre className="ax-pre" tabIndex={0} aria-label={`Contenido de ${archivo}`}>{texto}</pre>
      </Hoja>
    </Marco>
  );
}
