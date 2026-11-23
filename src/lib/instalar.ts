/**
 * Instalar Trazo como app. El navegador ofrece la instalación una sola vez (`beforeinstallprompt`): se guarda al arrancar
 * para pedirla después desde Ajustes. main.tsx importa este módulo para que el evento no se pierda.
 */
interface BeforeInstall extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let diferido: BeforeInstall | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); diferido = e as BeforeInstall; });
}

/** Pide la instalación si el navegador la ofreció; `false` si hay que explicarla a mano. */
export async function pedirInstalacion(): Promise<boolean> {
  if (!diferido) return false;
  await diferido.prompt();
  diferido = null;
  return true;
}
