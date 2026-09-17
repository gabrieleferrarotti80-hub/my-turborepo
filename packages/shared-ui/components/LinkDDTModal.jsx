import React, { useState, useMemo } from 'react';
import { XMarkIcon, LinkIcon, CheckCircleIcon, BuildingOfficeIcon } from '@heroicons/react/24/solid';

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('it-IT');
};

export const LinkDDTModal = ({
    isOpen,
    onClose,
    onConfirm,
    ddt,          
    ordini = [],  
    fornitori = [] 
}) => {
    
    const [selectedOrdineId, setSelectedOrdineId] = useState('');

    // Filtra e Ordina gli ordini
    const ordiniSuggeriti = useMemo(() => {
        if (!ddt) return [];
        
        return [...ordini].sort((a, b) => {
            // Priorità 1: Stesso Cantiere
            const aMatch = a.cantiereId === ddt.cantiereId;
            const bMatch = b.cantiereId === ddt.cantiereId;
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            
            // Priorità 2: Data più recente
            const dateA = a.dataOrdine?.toDate ? a.dataOrdine.toDate() : new Date(a.dataOrdine || 0);
            const dateB = b.dataOrdine?.toDate ? b.dataOrdine.toDate() : new Date(b.dataOrdine || 0);
            return dateB - dateA;
        });
    }, [ddt, ordini]);

    if (!isOpen || !ddt) return null;

    const handleSubmit = () => {
        if (!selectedOrdineId) {
            alert("Seleziona un ordine.");
            return;
        }
        onConfirm(ddt.id, selectedOrdineId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <LinkIcon className="h-6 w-6 text-indigo-600" />
                        Collega DDT a Ordine
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </div>

                {/* Body Scrollabile */}
                <div className="p-6 overflow-y-auto">
                    
                    {/* Info DDT */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 space-y-1">
                        <p><span className="font-semibold">DDT del:</span> {formatDate(ddt.createdAt)}</p>
                        <p><span className="font-semibold">Cantiere:</span> {ddt.nomeCantiere}</p>
                        <p><span className="font-semibold">Note:</span> {ddt.note || '-'}</p>
                    </div>

                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Seleziona Ordine Corrispondente</h3>

                    {/* LISTA INTERATTIVA (Sostituisce la Select) */}
                    <div className="space-y-2">
                        {ordiniSuggeriti.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">Nessun ordine trovato.</p>
                        ) : (
                            ordiniSuggeriti.map(o => {
                                const nomeFornitore = fornitori.find(f => f.id === o.fornitoreId)?.ragioneSociale || 'Fornitore N/D';
                                const isMatch = o.cantiereId === ddt.cantiereId;
                                const isSelected = selectedOrdineId === o.id;
                                
                                return (
                                    <div 
                                        key={o.id} 
                                        onClick={() => setSelectedOrdineId(o.id)}
                                        className={`
                                            relative p-4 rounded-lg border-2 cursor-pointer transition-all
                                            ${isSelected 
                                                ? 'border-indigo-600 bg-indigo-50' 
                                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    {o.numeroOrdine || 'Ordine senza numero'}
                                                </p>
                                                <p className="text-sm text-gray-600">{nomeFornitore}</p>
                                                <p className="text-xs text-gray-400 mt-1">{formatDate(o.dataOrdine)} • € {o.totale}</p>
                                            </div>
                                            
                                            {/* Badge Cantiere Corrispondente */}
                                            {isMatch && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <BuildingOfficeIcon className="h-3 w-3" /> Stesso Cantiere
                                                </span>
                                            )}
                                        </div>

                                        {/* Icona di selezione */}
                                        {isSelected && (
                                            <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                                                <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100">
                        Annulla
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!selectedOrdineId}
                        className={`px-4 py-2 text-white rounded-md text-sm font-medium
                            ${!selectedOrdineId ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                        `}
                    >
                        Collega Ordine
                    </button>
                </div>

            </div>
        </div>
    );
};