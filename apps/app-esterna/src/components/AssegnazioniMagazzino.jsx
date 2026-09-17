import React from 'react';
import { ShieldCheckIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export const AssegnazioniMagazzino = ({ 
    assegnazioni, 
    onConferma, 
    onFirmaDPI, 
    onRestituzione, 
    onSegnalaGuasto 
}) => {
    
    const cellClasses = "px-6 py-4 whitespace-nowrap text-sm text-gray-800 align-middle";
    const headerClasses = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";

    if (!assegnazioni || assegnazioni.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Le Tue Dotazioni</h2>
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    Nessuna attrezzatura o DPI attualmente assegnato.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircleIcon className="h-6 w-6 text-green-600"/>
                Le Tue Dotazioni
            </h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className={headerClasses}>Articolo</th>
                            <th scope="col" className={headerClasses}>Tipo</th>
                            <th scope="col" className={headerClasses}>Stato Attuale</th>
                            <th scope="col" className={headerClasses}>Azioni Richieste</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {assegnazioni.map((item) => {
                            // --- 1. IDENTIFICAZIONE TIPO ---
                            const isDPI = (item.categoria && item.categoria.toLowerCase() === 'dpi') || item.isDPI === true;
                            
                            // --- 2. DETERMINAZIONE STATO REALE (PENDING vs ACTIVE) ---
                            
                            // È PENDING (Da confermare) se:
                            // - DPI: Manca la firma (confermaRicezione è false/null)
                            // - Attrezzatura: Lo stato è 'attiva' (default) o 'da confermare'
                            const isPending = isDPI 
                                ? !item.confermaRicezione 
                                : (item.statoWorkflow === 'da confermare' || item.statoWorkflow === 'attiva');

                            // È ACTIVE (In Uso) se:
                            // - Non è pending
                            // - E non è in stato di gestione speciale (restituzione/guasto)
                            const isSpecialState = item.statoWorkflow === 'restituzione richiesta' || item.statoWorkflow === 'guasto segnalato';
                            const isActive = !isPending && !isSpecialState;

                            return (
                                <tr key={item.id} className={isPending ? "bg-yellow-50" : ""}>
                                    
                                    {/* COLONNA 1: ARTICOLO */}
                                    <td className={cellClasses}>
                                        <div className="font-bold text-gray-900 text-base">
                                            {item.articoloNome || item.attrezzaturaNome || 'Articolo Sconosciuto'}
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">
                                            {item.articoloSeriale ? `S/N: ${item.articoloSeriale}` : 'Nessun seriale'}
                                        </div>
                                    </td>
                                    
                                    {/* COLONNA 2: TIPO */}
                                    <td className={cellClasses}>
                                        {isDPI ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 font-bold text-xs uppercase border border-purple-200">
                                                <ShieldCheckIcon className="h-3 w-3"/> DPI
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-bold text-xs uppercase border border-gray-200">
                                                Attrezzatura
                                            </span>
                                        )}
                                    </td>

                                    {/* COLONNA 3: STATO VISIVO */}
                                    <td className={cellClasses}>
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide ${
                                            isPending ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse' :
                                            isActive ? 'bg-green-100 text-green-800 border border-green-200' :
                                            'bg-blue-100 text-blue-800 border border-blue-200'
                                        }`}>
                                            {isPending ? 'DA CONFERMARE' : 
                                             item.statoWorkflow === 'restituzione richiesta' ? 'RESO RICHIESTO' :
                                             item.statoWorkflow === 'guasto segnalato' ? 'GUASTO' :
                                             'IN USO'}
                                        </span>
                                    </td>
                                    
                                    {/* COLONNA 4: AZIONI */}
                                    <td className={cellClasses}>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            
                                            {/* CASO 1: DEVE ESSERE CONFERMATO */}
                                            {isPending && (
                                                isDPI ? (
                                                    // Bottone Firma per DPI
                                                    <button 
                                                        onClick={() => onFirmaDPI(item)} 
                                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 flex items-center gap-1"
                                                    >
                                                        <ShieldCheckIcon className="h-4 w-4"/>
                                                        Firma Ora
                                                    </button>
                                                ) : (
                                                    // Bottone Conferma Semplice per Attrezzatura
                                                    <button 
                                                        onClick={() => onConferma(item)} 
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 flex items-center gap-1"
                                                    >
                                                        <CheckCircleIcon className="h-4 w-4"/>
                                                        Conferma
                                                    </button>
                                                )
                                            )}

                                            {/* CASO 2: È ATTIVO (Già confermato) */}
                                            {isActive && (
                                                <>
                                                    <button 
                                                        onClick={() => onRestituzione(item)} 
                                                        className="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                                                    >
                                                        Restituisci
                                                    </button>
                                                    <button 
                                                        onClick={() => onSegnalaGuasto(item)} 
                                                        className="text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                                                    >
                                                        Segnala Guasto
                                                    </button>
                                                </>
                                            )}

                                            {/* CASO 3: IN GESTIONE */}
                                            {isSpecialState && (
                                                <span className="flex items-center gap-1 text-gray-500 text-xs italic">
                                                    <ExclamationTriangleIcon className="h-3 w-3"/> In lavorazione...
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};