import React from 'react';
import { CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export const GestioneRiconsegneView = ({ 
    riconsegne, 
    accettaRestituzione, 
    rifiutaRestituzione, 
    onActionComplete,
    onBack // ✅ Questa è la prop fondamentale
}) => {

    const getNomeArticolo = (a) => a.articoloNome || a.attrezzaturaNome || 'Articolo Sconosciuto';
    const getNomeUtente = (a) => a.assegnatoA_Nome || a.utenteNome || 'Utente Sconosciuto';
    const getSeriale = (a) => a.articoloSeriale || a.attrezzaturaSeriale || '';
    
    const getDataRichiesta = (a) => {
        if (a.dataRichiestaRestituzione) {
            return a.dataRichiestaRestituzione.toDate ? a.dataRichiestaRestituzione.toDate() : new Date(a.dataRichiestaRestituzione);
        }
        if (a.storico && Array.isArray(a.storico)) {
            const evento = a.storico.find(e => e.statoNuovo === 'restituzione richiesta');
            if (evento && evento.timestamp) return evento.timestamp.toDate();
        }
        return null;
    };

    const handleAccetta = async (item) => {
        if(window.confirm(`Confermi il rientro in magazzino di: ${getNomeArticolo(item)}?`)) {
            const result = await accettaRestituzione(item.id, item.articoloId);
            onActionComplete(result.message);
        }
    };

    const handleRifiuta = async (item) => {
        if (!rifiutaRestituzione) return alert("Funzione rifiuta non disponibile");
        if(window.confirm(`Vuoi rifiutare la restituzione e lasciare l'oggetto in uso a ${getNomeUtente(item)}?`)) {
            const result = await rifiutaRestituzione(item.id);
            onActionComplete(result.message);
        }
    };

    return (
        <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-xl">
            
            {/* ✅ TASTO RETURN AGGIUNTO QUI */}
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 text-indigo-600 mb-6 hover:text-indigo-800 hover:underline transition-colors"
            >
                <ArrowLeftIcon className="h-4 w-4"/>
                Torna al Menu
            </button>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Gestione Riconsegne</h2>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {riconsegne?.length || 0} Richieste
                </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Attrezzatura</th>
                            <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Restituito da</th>
                            <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data Richiesta</th>
                            <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {riconsegne && riconsegne.length > 0 ? (
                            riconsegne.map(item => {
                                const data = getDataRichiesta(item);
                                return (
                                    <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="py-4 px-4 text-sm font-medium text-gray-900">
                                            {getNomeArticolo(item)}
                                            {getSeriale(item) && <span className="text-gray-500 block text-xs">S/N: {getSeriale(item)}</span>}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {getNomeUtente(item)}
                                            {item.noteRestituzione && (
                                                <div className="text-xs italic text-gray-400 mt-1">"{item.noteRestituzione}"</div>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-500">
                                            {data ? data.toLocaleDateString() : 'N/D'}
                                        </td>
                                        <td className="py-4 px-4 text-sm font-medium">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleRifiuta(item)} 
                                                    title="Rifiuta (Resta in uso)"
                                                    className="bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded-lg transition-colors border border-red-200"
                                                >
                                                    <XCircleIcon className="h-5 w-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleAccetta(item)} 
                                                    title="Accetta (Torna in magazzino)"
                                                    className="bg-green-100 text-green-700 hover:bg-green-200 p-2 rounded-lg transition-colors border border-green-200"
                                                >
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="4" className="py-12 px-4 text-center text-gray-500 italic">Nessuna richiesta di riconsegna in attesa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};