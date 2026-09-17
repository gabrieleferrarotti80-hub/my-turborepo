// src/components/ElencoFormView.jsx

import React from 'react';
// highlight-start
import { useFirebaseData } from 'shared-core';;
import { FormList } from 'shared-ui'; // Da pacchetto condiviso
// highlight-end
import { ArrowPathIcon } from '@heroicons/react/24/solid';

const ElencoFormView = () => {
    // --- ✅ INIZIO CORREZIONE ---
    // 1. Recupera l'oggetto 'data' principale
    const { data, loadingData } = useFirebaseData();

    // 2. Estrai 'forms' dall'oggetto 'data'
    const forms = data?.forms;
    // --- FINE CORREZIONE ---

    // 3. Mostra un messaggio di caricamento se i dati non sono pronti
    if (loadingData) {
        return (
            <div className="text-center p-8">
                <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
                <p>Caricamento form in corso...</p>
            </div>
        );
    }

    // 4. Passa la lista di form (ora corretta) al componente 'FormList'
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Elenco Moduli Disponibili</h1>
            <FormList 
                forms={forms || []} 
                loading={loadingData} // Passa lo stato di caricamento
            />
        </div>
    );
};

export default ElencoFormView;