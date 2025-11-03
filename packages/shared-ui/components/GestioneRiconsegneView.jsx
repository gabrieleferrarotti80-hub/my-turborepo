// Percorso: packages/shared-ui/components/GestioneRiconsegneView.jsx (CORREZIONE FINALE)

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
// ❌ RIMOSSO: import { useRiconsegneManager } from 'shared-core'; // Causa l'errore

// ✅ AGGIUNTO: Riceve le funzioni di business come props.
export const GestioneRiconsegneView = ({ riconsegne, onActionComplete, accettaRestituzione }) => {
    
    // ❌ RIMOSSO: const { accettaRestituzione } = useRiconsegneManager();

    const handleAccetta = async (assegnazione) => {
        // ✅ Chiama la funzione manager ricevuta come prop
        const result = await accettaRestituzione(assegnazione);
        onActionComplete(result.message);
    };

    return (
        <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestione Riconsegne</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attrezzatura</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Richiesta</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {riconsegne.length > 0 ? (
                            riconsegne.map(item => (
                                <tr key={item.id}>
                                    <td className="py-4 px-4 text-sm font-medium text-gray-900">{item.attrezzaturaNome}</td>
                                    <td className="py-4 px-4 text-sm text-gray-500">{item.utenteNome}</td>
                                    <td className="py-4 px-4 text-sm text-gray-500">
                                        {item.storico?.find(e => e.statoNuovo === 'restituzione richiesta')?.timestamp?.toDate().toLocaleDateString() || 'N/D'}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-medium">
                                        <button onClick={() => handleAccetta(item)} className="text-green-600 hover:text-green-900 flex items-center gap-1">
                                            <CheckCircleIcon className="h-5 w-5" /> Accetta Restituzione
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="py-8 px-4 text-center text-gray-500">Nessuna richiesta di riconsegna.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};