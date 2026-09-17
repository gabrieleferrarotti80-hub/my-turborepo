import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.jsx';
import './index.css';

import { ThemeProvider } from 'shared-ui';
import { FirebaseProvider } from 'shared-core';

// ✅ CORREZIONE: La "lista della spesa" è ora definita qui, fuori dal render.
const GESTIONALE_COLLECTIONS = [
    'users', 'clients', 'companies', 'attrezzature', 'assegnazioniMagazzino',
    'archivioAttrezzatura', 'cantieri', 'assegnazioniCantieri', 'reports', 
    'reportTecnico', 'aziendeForm', 'forms', 'documenti', 'notifiche', 
    'eventi', 'rapportinoTemplates', 'userAssegnazioni','offerte','presenze','statoCorrente',
    'segnalazioniErrori','programmazioneLive','movimenti_magazzino','scadenze_mezzi','richieste_ferie','sal','sicurezza_pos','assegnazioniMagazzino',

    // --- AGGIUNTE PER LA PROGRAMMAZIONE ---
    'programmazione',
    'subcantieri',
    
    // --- ✅ AGGIUNTA PER LA FATTURAZIONE ---
    'fatture',
    'fornitori',
    'fatture_acquisto',
    'preventivi_fornitori',
    'ordini_acquisto',
    'ddt_acquisti',
    'subappaltatori',
    'noleggiatori',
    'catalogo_risorse',
    'catalogo_pending'
    // -------------------------------------
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