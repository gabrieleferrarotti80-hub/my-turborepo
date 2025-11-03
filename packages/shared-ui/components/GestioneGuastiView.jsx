// Percorso: packages/shared-ui/components/GestioneGuastiView.jsx (CORREZIONE FINALE)

import React from 'react';
import { CheckCircleIcon, WrenchScrewdriverIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';
// ❌ RIMOSSO: import { useGuastiManager } from 'shared-core'; // Causa l'errore

// ✅ AGGIUNTO: Riceve le funzioni di business come props.
export const GestioneGuastiView = ({ 
    segnalazioni, 
    articoliInRiparazione, 
    onActionComplete,
    accettaSegnalazione, // Funzione Manager da AssegnazioniView
    risolviRiparazione,  // Funzione Manager da AssegnazioniView
    dismettiArticolo     // Funzione Manager da AssegnazioniView
}) => {
    
    // ❌ RIMOSSA: Destrutturazione degli hook manager.
    // const { accettaSegnalazione, risolviRiparazione, dismettiArticolo } = useGuastiManager();

    // Funzione generica per gestire le azioni e mostrare un messaggio di feedback
    // Le funzioni passate come 'action' sono ora le props ricevute.
    const handleAction = async (action, item) => {
        // Logica di conferma UI per la Dismissione
        if (action === dismettiArticolo) {
            console.log(`AZIONE DI DISMISSIONE: Richiesta conferma per dismettere l'articolo "${item.nome}".`);
            // Qui andrebbe l'interfaccia modale reale...
            if (!window.confirm(`Sei sicuro di voler dismettere l'articolo ${item.nome}?`)) {
                return; // Annulla l'azione se l'utente annulla il modale/conferma
            }
        }
        
        // ✅ Chiama la funzione manager ricevuta come prop
        const result = await action(item);
        onActionComplete(result.message);
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* Sezione 1: Segnalazioni da Accettare */}
            <div className="bg-white p-6 rounded-2xl shadow-xl">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Segnalazioni da Gestire</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attrezzatura</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segnalato da</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Segnalazione</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {segnalazioni?.length > 0 ? (
                                segnalazioni.map(assegnazione => (
                                    <tr key={assegnazione.id}>
                                        {/* ... (Dati della riga) ... */}
                                        <td className="py-4 px-4 text-sm font-medium">
                                            {/* ✅ Chiama handleAction con la prop accettaSegnalazione */}
                                            <button onClick={() => handleAction(accettaSegnalazione, assegnazione)} className="text-green-600 hover:text-green-900 flex items-center gap-1">
                                                <CheckCircleIcon className="h-5 w-5" /> Accetta
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="py-8 px-4 text-center text-gray-500">Nessuna nuova segnalazione.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sezione 2: Articoli in Riparazione */}
            <div className="bg-white p-6 rounded-2xl shadow-xl">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Attrezzature in Riparazione</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attrezzatura</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seriale</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {articoliInRiparazione?.length > 0 ? (
                                articoliInRiparazione.map(articolo => (
                                    <tr key={articolo.id}>
                                        {/* ... (Dati della riga) ... */}
                                        <td className="py-4 px-4 text-sm font-medium flex items-center gap-4">
                                            {/* ✅ Chiama handleAction con le props risolviRiparazione e dismettiArticolo */}
                                            <button onClick={() => handleAction(risolviRiparazione, articolo)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                                                <WrenchScrewdriverIcon className="h-5 w-5" /> Riparato
                                            </button>
                                            <button onClick={() => handleAction(dismettiArticolo, articolo)} className="text-red-600 hover:text-red-900 flex items-center gap-1">
                                                <ArchiveBoxXMarkIcon className="h-5 w-5" /> Dismetti
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" className="py-8 px-4 text-center text-gray-500">Nessun articolo attualmente in riparazione.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};