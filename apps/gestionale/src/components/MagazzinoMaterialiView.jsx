// Percorso: apps/gestionale/src/components/MagazzinoMaterialiView.jsx

import React, { useState, useEffect } from 'react';
// Correzione: Importa l'hook unificato useArticoliManager
import { useArticoliManager } from 'shared-core';
import { AddMaterialeForm, ImportMaterialiView } from 'shared-ui'; 

export const MagazzinoMaterialiView = () => {
    // Lo stato 'view' determina cosa mostrare: la lista, il form di aggiunta o la vista di importazione
    const [view, setView] = useState('list'); // 'list', 'add', 'import'
    
    // Correzione: Usa l'hook unificato useArticoliManager
    const { 
        addArticolo, // Usiamo addArticolo per aggiungere sia attrezzature che materiali
        importArticoliBatch, // Funzione generica per importazione massiva (da implementare in useArticoliManager)
        isLoading, 
        error, 
        successMessage 
    } = useArticoliManager();

    const handleSaveMateriale = async (materialeData) => {
        // Correzione: Chiama la funzione addArticolo, aggiungendo il tipoArticolo come 'materiale'
        const success = await addArticolo({
            ...materialeData,
            tipoArticolo: 'materiale', // Identifica il dato come materiale
        });
        
        if (success) {
            // Se il salvataggio va a buon fine, torna alla lista dopo un breve ritardo per mostrare il messaggio
            setTimeout(() => setView('list'), 2000);
        }
    };

    const handleImportMateriali = async (materialiList) => {
        // Correzione: Chiama la funzione generica importArticoliBatch, assicurandoci che ogni elemento abbia tipoArticolo: 'materiale'
        const materialiPerImport = materialiList.map(item => ({
            ...item,
            tipoArticolo: 'materiale',
        }));

        const success = await importArticoliBatch(materialiPerImport);
        
        if (success) {
            setTimeout(() => setView('list'), 2000);
        }
    };
    
    // Contenuto da renderizzare in base allo stato 'view'
    let content;
    switch(view) {
        case 'add':
            content = <AddMaterialeForm onSubmit={handleSaveMateriale} onCancel={() => setView('list')} isLoading={isLoading} />;
            break;
        case 'import':
            // Correzione: Passiamo la funzione aggiornata handleImportMateriali
            content = <ImportMaterialiView onImport={handleImportMateriali} onCancel={() => setView('list')} isLoading={isLoading} />;
            break;
        case 'list':
        default:
            content = (
                <div className="p-8 bg-white rounded-lg shadow-md animate-fade-in">
                    {/* Questo è un placeholder. Qui andrà la tabella con la lista dei materiali */}
                    <div className="flex justify-between items-center mb-6">
                         <h1 className="text-2xl font-bold">Elenco Materiali Magazzino</h1>
                         <div className="flex gap-4">
                             <button onClick={() => setView('add')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                 Aggiungi Materiale
                             </button>
                             <button onClick={() => setView('import')} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                 Importa da Excel
                             </button>
                         </div>
                    </div>
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <p className="text-gray-500">La tabella con la lista dei materiali verrà implementata qui.</p>
                    </div>
                </div>
            );
    }
    
    return (
        <div className="p-8">
            {/* Area per mostrare i messaggi di successo o errore */}
            {successMessage && <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800 text-center">{successMessage}</div>}
            {error && <div className="mb-4 p-3 rounded-md bg-red-100 text-red-800 text-center">Errore: {error}</div>}
            
            {content}
        </div>
    );
};