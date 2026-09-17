import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/solid';

export const GestioneFerieView = ({ richieste = [], onGestisci }) => {
    const [filter, setFilter] = useState('in_attesa'); // in_attesa, storico

    const filtered = richieste.filter(r => 
        filter === 'in_attesa' ? r.stato === 'in_attesa' : r.stato !== 'in_attesa'
    );

    const formatDate = (d) => {
        if (!d) return '-';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleDateString('it-IT');
    };
    
    // Helper per formattare data e ora
    const formatDateTime = (d) => {
        if (!d) return '';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarDaysIcon className="h-8 w-8 text-blue-600"/> Gestione Ferie & Permessi
                </h1>
                
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setFilter('in_attesa')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'in_attesa' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Da Approvare ({richieste.filter(r => r.stato === 'in_attesa').length})
                    </button>
                    <button 
                        onClick={() => setFilter('storico')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'storico' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Storico
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dipendente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                            
                            {/* ✅ Nuova Colonna Esito (visibile solo nello storico) */}
                            {filter === 'storico' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Esito / Data</th>
                            )}
                            
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nessuna richiesta trovata.</td></tr>
                        ) : (
                            filtered.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{req.nomeUtente}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                            req.tipo === 'ferie' ? 'bg-blue-100 text-blue-800' :
                                            req.tipo === 'malattia' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {req.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDate(req.dataInizio)} - {formatDate(req.dataFine)}
                                        {req.ore > 0 && <span className="ml-2 font-bold text-gray-500">({req.ore}h)</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs" title={req.note}>{req.note || '-'}</td>
                                    
                                   {/* ✅ Cella Esito con Nome e Data */}
                                    {filter === 'storico' && (
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {req.updatedAt && (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700">
                                                        {req.nomeApprovatore || 'Admin'}
                                                    </span>
                                                    <span className="text-gray-400">
                                                        {formatDateTime(req.updatedAt)}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        {req.stato === 'in_attesa' ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onGestisci(req.id, 'approvata')} className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors" title="Approva">
                                                    <CheckCircleIcon className="h-8 w-8"/>
                                                </button>
                                                <button onClick={() => onGestisci(req.id, 'rifiutata')} className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors" title="Rifiuta">
                                                    <XCircleIcon className="h-8 w-8"/>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                req.stato === 'approvata' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {req.stato.toUpperCase()}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};