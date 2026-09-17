import React from 'react';
import { ArrowLeftIcon, BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
const formatDate = (date) => date ? date.toLocaleDateString('it-IT') : 'N/D';

export const ScadenziarioDashboard = ({
    scadenze,
    totali,
    filtroPeriodo,
    setFiltroPeriodo,
    onNavigateBack
}) => {
    
    // Helper per colore scadenza
    const getDateClass = (date) => {
        if (!date) return 'text-gray-500';
        const today = new Date();
        today.setHours(0,0,0,0);
        return date < today ? 'text-red-600 font-bold' : 'text-gray-700';
    };

    return (
        <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-full">
            
            {/* Header */}
            <button onClick={onNavigateBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Torna alla Dashboard</span>
            </button>
            
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
                    <CalendarDaysIcon className="h-8 w-8 text-indigo-600" /> Scadenziario
                </h1>
                
                {/* Filtri Periodo */}
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {['tutte', 'scadute', 'mese_corrente', 'prossimi_30'].map(key => (
                        <button
                            key={key}
                            onClick={() => setFiltroPeriodo(key)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                filtroPeriodo === key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {key === 'tutte' && 'Tutte'}
                            {key === 'scadute' && 'Scadute'}
                            {key === 'mese_corrente' && 'Questo Mese'}
                            {key === 'prossimi_30' && 'Prossimi 30gg'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Card Totali */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Da Incassare</h3>
                        <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totali.entrate)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Da Pagare</h3>
                        <ArrowTrendingDownIcon className="h-6 w-6 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totali.uscite)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Saldo Previsto</h3>
                        <BanknotesIcon className="h-6 w-6 text-indigo-500" />
                    </div>
                    <p className={`text-2xl font-bold ${totali.saldo >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                        {formatCurrency(totali.saldo)}
                    </p>
                </div>
            </div>

            {/* Lista Scadenze */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Controparte</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importo</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {scadenze.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nessuna scadenza trovata per il periodo selezionato.</td></tr>
                        ) : (
                            scadenze.map((item) => (
                                <tr key={`${item.tipo}-${item.id}`} className="hover:bg-gray-50">
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${getDateClass(item.dataScadenza)}`}>
                                        {formatDate(item.dataScadenza)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            item.tipo === 'entrata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {item.tipo === 'entrata' ? 'ENTRATA' : 'USCITA'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.controparte}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.descrizione}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                                        item.tipo === 'entrata' ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                        {item.tipo === 'uscita' && '- '}{formatCurrency(item.importo)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                        {item.stato}
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