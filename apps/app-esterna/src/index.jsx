import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.jsx';

// Importa i provider necessari dai pacchetti condivisi
import { FirebaseProvider } from 'shared-core';
import { ThemeProvider } from 'shared-ui';

const root = createRoot(document.getElementById('root'));

// ✅ QUESTA È LA LISTA CORRETTA E MINIMALE PER L'APP ESTERNA
const externalAppCollections = [
    'cantieri',
    'assegnazioniCantieri',
    'documenti',
    'eventi',
    'reports',
    'reportTecnico',
    'rapportinoTemplates',
    'notifiche',
    'userAssegnazioni', 
    'users',
    'forms', // <-- ❗ ASSICURATI CHE SIA QUI
    'aziendeForm', // <-- ❗ E ANCHE QUI
    'statoCorrente',
    'userPresenze'
];

root.render(
  <StrictMode>
    <ThemeProvider>
      {/* Ora passiamo la lista corretta e leggera */}
      <FirebaseProvider collectionsToSub={externalAppCollections}>
        <App />
      </FirebaseProvider>
    </ThemeProvider>
  </StrictMode>
);