// src/components/RapportiniManager.jsx (Versione Finale e Corretta)

import React, { useState, useMemo } from 'react';
// highlight-start
import { useFirebaseData } from 'shared-core';; // Percorso relativo aggiornato
import { FormList, FormReader } from 'shared-ui'; // Import da shared-ui
// highlight-end
import { ArrowPathIcon } from '@heroicons/react/24/solid';

const RapportiniManager = () => {
    // 1. Recupera i dati necessari, incluso il ruolo, l'ID azienda, la lista completa dei form
    //    e la lista delle autorizzazioni.
    const { userRole, userAziendaId, forms, aziendeForm, loadingData } = useFirebaseData();

    // Stato per la visualizzazione del singolo form (quando viene selezionato dalla lista)
    const [selectedFormId, setSelectedFormId] = useState(null);

    // 2. Logica di filtraggio per calcolare i form autorizzati
    const authorizedForms = useMemo(() => {
        // Se sei il proprietario, vedi tutti i form senza filtri.
        if (userRole === 'proprietario') {
            return forms || [];
        }

        // Se sei un utente di un'azienda, filtriamo la lista.
        const safeAziendeForm = aziendeForm || [];
        const safeForms = forms || [];

        // Troviamo il documento di autorizzazione per l'azienda dell'utente corrente.
        const authorizations = safeAziendeForm.find(auth => auth.id === userAziendaId);
        
        // Se non ci sono autorizzazioni definite per questa azienda, non può vedere nessun form.
        if (!authorizations) {
            return [];
        }
        
        const authorizedFormIds = authorizations.authorizedCompanyIds || [];
        
        // Filtriamo la lista completa dei form, mostrando solo quelli il cui ID
        // è presente nella lista delle autorizzazioni.
        return safeForms.filter(form => authorizedFormIds.includes(form.id));

    }, [forms, aziendeForm, userRole, userAziendaId]); // Questo calcolo si aggiorna solo se i dati cambiano

    // --- LOGICA DI VISUALIZZAZIONE ---

    if (loadingData) {
        return (
            <div className="p-8 text-center">
                <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
                <p>Caricamento moduli...</p>
            </div>
        );
    }

    // Se un form è stato selezionato (da qualsiasi utente), mostra il FormReader per compilarlo.
    if (selectedFormId) {
        return (
            <FormReader 
                formId={selectedFormId} 
                onBack={() => setSelectedFormId(null)}
                onSaveSuccess={() => {
                    alert('Modulo compilato!');
                    setSelectedFormId(null);
                }}
            />
        );
    }

    // Altrimenti, mostra la lista dei form (che sarà completa per il proprietario
    // e filtrata per tutti gli altri).
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Moduli Operativi Disponibili</h1>
            <FormList 
                forms={authorizedForms} 
                onSelectForm={setSelectedFormId} 
            />
        </div>
    );
};

export default RapportiniManager;