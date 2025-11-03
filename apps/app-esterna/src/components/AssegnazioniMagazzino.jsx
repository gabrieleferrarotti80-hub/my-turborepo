import React from 'react';

export const AssegnazioniMagazzino = ({ assegnazioni, onConferma, onRestituzione, onSegnalaGuasto }) => {
    
    const cellClasses = "px-6 py-4 whitespace-nowrap text-sm text-gray-800";
    const headerClasses = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";

    if (!assegnazioni || assegnazioni.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Le Tue Assegnazioni</h2>
                <p className="text-gray-500 italic">Nessuna attrezzatura attualmente assegnata.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Le Tue Assegnazioni</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className={headerClasses}>Attrezzatura</th>
                            <th scope="col" className={headerClasses}>Stato</th>
                            <th scope="col" className={headerClasses}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {assegnazioni.map((item) => (
                            <tr key={item.id}>
                                <td className={cellClasses}>
                                    <div className="font-medium">{item.attrezzaturaNome}</div>
                                    <div className="text-gray-500">Seriale: {item.attrezzaturaSeriale || 'N/D'}</div>
                                </td>
                                <td className={cellClasses}>
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        item.statoWorkflow === 'da confermare' ? 'bg-yellow-100 text-yellow-800' :
                                        item.statoWorkflow === 'in uso' ? 'bg-green-100 text-green-800' :
                                        'bg-blue-100 text-blue-800' // Per 'restituzione richiesta' o 'guasto'
                                    }`}>
                                        {item.statoWorkflow}
                                    </span>
                                </td>
                                <td className={`${cellClasses} space-x-2`}>
                                    {item.statoWorkflow === 'da confermare' && (
                                        <button 
                                            onClick={() => onConferma(item.id)} 
                                            className="text-indigo-600 hover:text-indigo-900 font-medium">
                                            Conferma
                                        </button>
                                    )}
                                    {item.statoWorkflow === 'in uso' && (
                                        <>
                                            <button 
                                                onClick={() => onRestituzione(item)} 
                                                className="text-blue-600 hover:text-blue-900 font-medium">
                                                Restituisci
                                            </button>
                                            <button 
                                                onClick={() => onSegnalaGuasto(item)} 
                                                className="text-red-600 hover:text-red-900 font-medium">
                                                Segnala Guasto
                                            </button>
                                        </>
                                    )}
                                    {(item.statoWorkflow === 'restituzione richiesta' || item.statoWorkflow === 'guasto segnalato') && (
                                         <span className="text-sm text-gray-500 italic">In attesa di gestione</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};