/**
 * Ola 27 · el clipping está pausado mientras no tenga un bloque en la rutina. Se reactiva cuando le asignás uno
 * (Ajustes · Bloques pendientes). Nada se borra: la planilla y las campañas siguen ahí. Estado de módulo que el store sincroniza.
 */
let activo = false;
export const clippingActivo = () => activo;
export const setClippingActivo = (v: boolean) => { activo = v; };
