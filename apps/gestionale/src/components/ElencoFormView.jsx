// src/components/ElencoFormView.jsx

import React from 'react';
// highlight-start
import { useFirebaseData } from 'shared-core';;
import { FormList } from 'shared-ui'; // Da pacchetto condiviso
// highlight-end
import { ArrowPathIcon } from '@heroicons/react/24/solid';

const ElencoFormView = () => {
    // 1. Recupera la lista dei form e lo stato di caricamento dal contesto
    const { forms, loadingData } = useFirebaseData();

    // 2. Mostra un messaggio di caricamento se i dati non sono pronti
    if (loadingData) {
        return (
            <div className="text-center p-8">
                <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
                <p>Caricamento form in corso...</p>
            </div>
        );
    }

    // 3. Passa la lista di form al componente 'FormList' per la visualizzazione
    //    Nota: NON passiamo la prop 'onSelectForm', così i nomi non saranno cliccabili.
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Elenco Moduli Disponibili</h1>
            <FormList forms={forms || []} />
        </div>
    );
};

export default ElencoFormView;