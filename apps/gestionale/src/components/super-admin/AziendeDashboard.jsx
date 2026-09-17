import React, { useState } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, updateDoc } from 'firebase/firestore';
import { 
    BuildingOffice2Icon, 
    UserGroupIcon, 
    CheckBadgeIcon, 
    MagnifyingGlassIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export const AziendeDashboard = ({ onEditCompany }) => {
    const { data, db } = useFirebaseData();
    const companies = data?.companies || [];
    const users = data?.users || [];

    const [searchTerm, setSearchTerm] = useState('');

    const filteredCompanies = companies.filter(c => 
        (c.ragioneSociale || c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.piva || c.partitaIva || '').includes(searchTerm)
    );

    const toggleProPlan = async (companyId, currentStatus, e) => {
        // Blocca il click sulla riga quando si preme l'interruttore
        e.stopPropagation(); 
        
        if (window.confirm(`Sei sicuro di voler ${currentStatus ? 'REVOCARE' : 'ATTIVARE'} il piano PRO per questa azienda?`)) {
            try {
                const companyRef = doc(db, 'companies', companyId);
                await updateDoc(companyRef, {
                    'companyFeatures.isPro': !currentStatus
                });
            } catch (error) {
                console.error("Errore aggiornamento piano:", error);
                alert("Si è verificato un errore durante l'aggiornamento.");
            }
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <div className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Aziende Clienti</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Gestisci i tuoi tenant e i loro abbonamenti SaaS.</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><BuildingOffice2Icon className="h-6 w-6"/></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totale Clienti</p>
                            <p className="text-2xl font-black text-slate-800 leading-none">{companies.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><CheckBadgeIcon className="h-6 w-6"/></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clienti PRO</p>
                            <p className="text-2xl font-black text-emerald-600 leading-none">
                                {companies.filter(c => c.companyFeatures?.isPro).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca per Ragione Sociale o P.IVA..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-white sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Azienda (Tenant)</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Partita IVA</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Utenti Attivi</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Piano Attuale</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/50">Piano PRO</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Dettagli</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-50/50 divide-y divide-slate-100">
                            {filteredCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">Nessuna azienda trovata.</td>
                                </tr>
                            ) : (
                                filteredCompanies.map(company => {
                                    const isPro = company.companyFeatures?.isPro === true;
                                    const isSuspended = company.companyFeatures?.isSuspended === true; // 🌟 Variabile Sospensione
                                    const companyUsers = users.filter(u => u.aziendaId === company.id || u.companyID === company.id).length;

                                    return (
                                        <tr 
                                            key={company.id} 
                                            onClick={() => onEditCompany(company.id)}
                                            // 🌟 IF SOSPESA -> SFONDO GIALLO. ALTRIMENTI -> BIANCO
                                            className={`transition-colors cursor-pointer group ${
                                                isSuspended 
                                                ? 'bg-amber-50 hover:bg-amber-100/80 border-l-4 border-l-amber-400' 
                                                : 'hover:bg-white border-l-4 border-l-transparent'
                                            }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {/* 🌟 IF SOSPESA -> ICONA GIALLA */}
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border transition-colors ${
                                                        isSuspended
                                                        ? 'bg-amber-100 text-amber-600 border-amber-200 group-hover:bg-amber-500 group-hover:text-white'
                                                        : 'bg-indigo-100 text-indigo-600 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white'
                                                    }`}>
                                                        {(company.ragioneSociale || company.companyName || 'A')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                            {company.ragioneSociale || company.companyName || 'Azienda Senza Nome'}
                                                            {/* 🌟 BADGE SOSPESA */}
                                                            {isSuspended && (
                                                                <span className="flex items-center gap-1 bg-amber-200 text-amber-800 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                                                    <ExclamationTriangleIcon className="h-3 w-3" /> Sospesa
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400">ID: {company.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md border ${isSuspended ? 'text-amber-800 bg-amber-100/50 border-amber-200' : 'text-slate-600 bg-slate-200/50 border-slate-200'}`}>
                                                    {company.piva || company.partitaIva || 'N/D'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`flex items-center justify-center gap-1.5 font-bold ${isSuspended ? 'text-amber-700' : 'text-slate-600'}`}>
                                                    <UserGroupIcon className="h-4 w-4 opacity-70" /> {companyUsers}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isPro ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                                                        <CheckBadgeIcon className="h-4 w-4" /> PRO
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full border ${isSuspended ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                                                        Basic
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center bg-indigo-50/20" onClick={(e) => e.stopPropagation()}>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={isPro}
                                                        onChange={(e) => toggleProPlan(company.id, isPro, e)}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                                </label>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ChevronRightIcon className={`h-5 w-5 inline-block transition-colors ${isSuspended ? 'text-amber-400 group-hover:text-amber-700' : 'text-slate-300 group-hover:text-indigo-600'}`} />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};