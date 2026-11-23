import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './v2/tokens.css';
import './v2/raiz.css';
import './v2/base.css';
import './lib/instalar';
import { App } from './App';
import { pintarTema, temaV2 } from './v2/marco/tema';

// La interfaz es una sola: todo el CSS cuelga de html[data-ui="v2"] (index.html ya lo trae; esto cubre cualquier otra entrada).
document.documentElement.dataset.ui = 'v2';
pintarTema(temaV2());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
