/**
 * Una versión nueva de Trazo. El service worker nuevo se instala y toma el control solo, pero la pantalla que tenés abierta sigue
 * con el código viejo hasta que se recarga (por eso, después de un deploy, hacía falta cerrar y abrir la app dos veces). Acá se
 * avisa cuando eso pasa, con un botón que recarga: nada se recarga solo, para no cortar lo que estés escribiendo.
 */
import { aviso } from '../v2/kit/capas';

interface ServiceWorkerContainerLike {
  controller: unknown;
  addEventListener: (tipo: 'controllerchange', f: () => void) => void;
  removeEventListener: (tipo: 'controllerchange', f: () => void) => void;
}

/** Empieza a escuchar. Devuelve cómo dejar de hacerlo. La primera instalación no avisa: no hay versión vieja que reemplazar. */
export function avisarVersionNueva(
  sw: ServiceWorkerContainerLike | undefined = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker,
  recargar: () => void = () => window.location.reload(),
): () => void {
  if (!sw) return () => {};
  const habiaVersion = !!sw.controller;
  let avisado = false;
  const alCambiar = () => {
    if (!habiaVersion || avisado) return;
    avisado = true;
    // Dura mucho: si se va sola, seguirías con la versión vieja sin saberlo.
    aviso({ titulo: 'Hay una versión nueva', sub: 'Actualizá para verla.', accion: { etiqueta: 'Actualizar', run: recargar }, duracion: 10 * 60_000 });
  };
  sw.addEventListener('controllerchange', alCambiar);
  return () => sw.removeEventListener('controllerchange', alCambiar);
}
