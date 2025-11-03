import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.jsx';
import './index.css';

import { ThemeProvider } from 'shared-ui';
import { FirebaseProvider } from 'shared-core';

// ✅ CORREZIONE: La "lista della spesa" è ora definita qui, fuori dal render.
// Viene creata UNA SOLA VOLTA e non causerà più loop.
const GESTIONALE_COLLECTIONS = [
    'users', 'clients', 'companies', 'attrezzature', 'assegnazioniMagazzino',
    'archivioAttrezzatura', 'cantieri', 'assegnazioniCantieri', 'reports', 
    'reportTecnico', 'aziendeForm', 'forms', 'documenti', 'notifiche', 
    'eventi', 'rapportinoTemplates', 'userAssegnazioni','offerte','presenze','statoCorrente',
    'segnalazioniErrori'
];

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <ThemeProvider>
            {/* La prop 'collectionsToSub' ora riceve sempre la stessa istanza dell'array */}
            <FirebaseProvider collectionsToSub={GESTIONALE_COLLECTIONS}>
                <App />
            </FirebaseProvider>
        </ThemeProvider>
    </React.StrictMode>
);