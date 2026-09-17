// packages/shared-ui/views/OfferteDashboard.jsx

import React from 'react';
import { NuovaOffertaForm } from '../forms/NuovaOffertaForm';
import { 
    DocumentPlusIcon, 
    PaperAirplaneIcon, 
    ArchiveBoxIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export const OfferteDashboard = ({
    offerte = [],
    clients = [],
    onSelectOfferta,
    onAddOfferta,
    isSaving,
    isCompanySelected,
    onNavigate
}) => {
    // Calcolo metriche
    const elaborateCount = offerte.filter(o => o.stato === 'inviata' || o.stato === 'in_approvazione' || o.stato === 'pronta_per_invio').length;
    const archivioCount = offerte.filter(o => ['accettata', 'rifiutata', 'archiviata', 'convertita_in_cantiere'].includes(o.stato)).length;

    return (
        <div className="container mx-auto p-6 space-y-6 animate-fade-in max-w-7xl">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestione Offerte e Preventivi</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Crea nuove offerte, monitora gli invii e consulta l'archivio.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CARD 1: NUOVA OFFERTA */}
                <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <DocumentPlusIcon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Nuova Offerta</h3>
                    </div>
                    
                    <div className="flex-1">
                        {isCompanySelected ? (
                            <>
                                <p className="text-xs text-slate-500 mb-5 font-medium">Seleziona il cliente per iniziare a redigere un nuovo preventivo.</p>
                                <NuovaOffertaForm clients={clients} onSubmit={onAddOfferta} isSaving={isSaving} />
                            </>
                        ) : (
                            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3 mt-2">
                                <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold">Azione bloccata</p>
                                    <p className="mt-1">Seleziona un'azienda specifica dal menu in alto a sinistra per creare un'offerta.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLONNA DESTRA: METRICHE E NAVIGAZIONE */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* CARD 2: ELABORATE / IN CORSO */}
                    <div 
                        onClick={() => onNavigate('visualizza_elaborate')} 
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <PaperAirplaneIcon className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-black text-slate-800">{elaborateCount}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">In Corso / Inviate</h3>
                            <p className="text-sm text-slate-500 font-medium">Offerte in attesa di approvazione interna o inviate al cliente per accettazione.</p>
                        </div>
                        <div className="mt-6 text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Vedi lista &rarr;
                        </div>
                    </div>

                    {/* CARD 3: ARCHIVIO */}
                    <div 
                        onClick={() => onNavigate('visualizza_archivio')} 
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors">
                                    <ArchiveBoxIcon className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-black text-slate-800">{archivioCount}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Archivio Storico</h3>
                            <p className="text-sm text-slate-500 font-medium">Consulta le offerte passate: accettate (convertite in cantiere), rifiutate o chiuse.</p>
                        </div>
                        <div className="mt-6 text-sm font-bold text-slate-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Esplora archivio &rarr;
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};