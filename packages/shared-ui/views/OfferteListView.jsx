// packages/shared-ui/views/OfferteListView.jsx

import React from 'react';
import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export const OfferteListView = ({ title, offerte = [], onSelectOfferta, onBack }) => {

    // Helper per colorare i badge in base allo stato
    const getStatusBadge = (stato) => {
        switch (stato) {
            case 'in_elaborazione':
                return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-amber-200">In Elaborazione</span>;
            case 'in_approvazione':
                return <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-purple-200">In Approvazione</span>;
            case 'pronta_per_invio':
                return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-blue-200">Pronta Invio</span>;
            case 'inviata':
                return <span className="bg-sky-100 text-sky-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-sky-200">Inviata</span>;
            case 'accettata':
            case 'convertita_in_cantiere':
                return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-emerald-200">Convertita</span>;
            case 'rifiutata':
                return <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-red-200">Rifiutata</span>;
            default:
                return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-slate-200">{stato?.replace(/_/g, ' ') || 'Sconosciuto'}</span>;
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6 animate-fade-in max-w-6xl">
            {/* HEADER */}
            <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                {onBack && (
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeftIcon className="h-6 w-6 text-slate-500" />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h1>
                    <p className="text-sm text-slate-500 font-medium">Seleziona un'offerta dalla lista per gestirne i dettagli o l'avanzamento.</p>
                </div>
            </div>

            {/* TABELLA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Titolo Offerta</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Creazione</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Stato Attuale</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {offerte.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-10 text-center text-slate-400 font-medium">
                                    Nessuna offerta trovata in questa categoria.
                                </td>
                            </tr>
                        ) : (
                            offerte.map(offerta => (
                                <tr 
                                    key={offerta.id} 
                                    onClick={() => onSelectOfferta(offerta)}
                                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <DocumentTextIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            <div>
                                                <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{offerta.nomeOfferta}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {offerta.id?.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Assumiamo che ci sia un createdAt, gestiamo il fallback in sicurezza */}
                                        <span className="text-xs text-slate-600 font-medium">
                                            {offerta.createdAt?.toDate ? offerta.createdAt.toDate().toLocaleDateString('it-IT') : 'Data N.D.'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(offerta.stato)}
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