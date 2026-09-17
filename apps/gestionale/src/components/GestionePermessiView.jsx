import React, { useState } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, updateDoc } from 'firebase/firestore';
import { 
    ShieldCheckIcon, 
    BuildingOfficeIcon, 
    MagnifyingGlassIcon,
    CubeIcon,
    UsersIcon,
    BriefcaseIcon,
    DocumentTextIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

export const GestionePermessiView = () => {
    const { data, db } = useFirebaseData();
    const companies = data?.companies || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');

    const filteredCompanies = companies.filter(c => 
        (c.ragioneSociale || c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.piva || c.partitaIva || '').includes(searchTerm)
    );

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    const availableModules = [
        { id: 'magazzino', name: 'Magazzino & Materiali', desc: 'Gestione giacenze, DDT, scorte e resi.', icon: CubeIcon, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
        { id: 'personale', name: 'Risorse Umane', desc: 'Gestione presenze, ferie, permessi e cartellini.', icon: UsersIcon, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
        { id: 'cantieri', name: 'Gestione Cantieri', desc: 'Rapportini giornalieri, SAL e avanzamento lavori.', icon: BriefcaseIcon, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
        { id: 'fatturazione', name: 'Fatturazione & Finanza', desc: 'Emissione fatture, note di credito e scadenziario.', icon: DocumentTextIcon, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
        { id: 'programmazione', name: 'Programmazione', desc: 'Gantt, calendario e assegnazioni mezzi/personale.', icon: CalendarDaysIcon, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
        { id: 'sicurezza', name: 'Sicurezza & DPI', desc: 'Consegna DPI, scadenze visite mediche e patentini.', icon: ShieldCheckIcon, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200' },
    ];

    // Funzione per il singolo modulo
    const handleToggleModule = async (moduleId, currentStatus) => {
        if (!selectedCompanyId) return;
        try {
            const companyRef = doc(db, 'companies', selectedCompanyId);
            await updateDoc(companyRef, {
                [`activeModules.${moduleId}`]: !currentStatus
            });
            setSaveStatus(`Modulo aggiornato!`);
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (error) {
            console.error("Errore aggiornamento permessi:", error);
            alert("Errore durante l'aggiornamento del modulo.");
        }
    };

    // 🌟 NUOVA FUNZIONE: Aggiornamento Massivo (Attiva/Disattiva Tutti)
    const handleToggleAll = async (enableAll) => {
        if (!selectedCompanyId) return;
        try {
            // Prepariamo un oggetto con tutte le modifiche da fare in un colpo solo
            const updates = {};
            availableModules.forEach(mod => {
                updates[`activeModules.${mod.id}`] = enableAll;
            });

            const companyRef = doc(db, 'companies', selectedCompanyId);
            await updateDoc(companyRef, updates);
            
            setSaveStatus(enableAll ? 'Tutti i moduli attivati!' : 'Tutti i moduli disattivati!');
            setTimeout(() => setSaveStatus(''), 2500);
        } catch (error) {
            console.error("Errore aggiornamento massivo:", error);
            alert("Errore durante l'aggiornamento simultaneo dei moduli.");
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
            
            <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col border-r border-slate-200 bg-slate-50 shrink-0">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BuildingOfficeIcon className="h-5 w-5 text-indigo-500" />
                        Seleziona Tenant
                    </h2>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca azienda..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredCompanies.length === 0 ? (
                        <p className="text-center text-xs font-bold text-slate-400 p-4">Nessuna azienda trovata.</p>
                    ) : (
                        filteredCompanies.map(company => {
                            const isSelected = selectedCompanyId === company.id;
                            const isSuspended = company.companyFeatures?.isSuspended === true;
                            
                            return (
                                <button
                                    key={company.id}
                                    onClick={() => setSelectedCompanyId(company.id)}
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                                        isSelected 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'hover:bg-slate-200/60 text-slate-700'
                                    }`}
                                >
                                    <div className="truncate pr-2">
                                        <p className={`text-sm font-black truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                            {company.ragioneSociale || company.companyName || 'Azienda Senza Nome'}
                                        </p>
                                        <p className={`text-[10px] font-bold mt-0.5 truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            P.IVA: {company.piva || company.partitaIva || 'N/D'}
                                        </p>
                                    </div>
                                    {isSuspended ? (
                                        <ExclamationTriangleIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`} />
                                    ) : company.companyFeatures?.isPro ? (
                                        <CheckBadgeIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} />
                                    ) : null}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                {selectedCompany ? (
                    <div className="flex-1 flex flex-col overflow-y-auto animate-fade-in h-full">
                        
                        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {selectedCompany.ragioneSociale || selectedCompany.companyName}
                                </h1>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                    ID: {selectedCompany.id}
                                    {selectedCompany.companyFeatures?.isPro && (
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <CheckBadgeIcon className="h-3 w-3" /> Piano PRO
                                        </span>
                                    )}
                                    {selectedCompany.companyFeatures?.isSuspended && (
                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <ExclamationTriangleIcon className="h-3 w-3" /> Sospesa
                                        </span>
                                    )}
                                </p>
                            </div>

                            {saveStatus && (
                                <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up">
                                    <CheckCircleIcon className="h-4 w-4 text-emerald-400" /> {saveStatus}
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8">
                            {/* 🌟 BARRA DEGLI STRUMENTI CON I NUOVI TASTI */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheckIcon className="h-5 w-5 text-indigo-500" />
                                    Moduli Attivabili
                                </h3>
                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                    <button 
                                        onClick={() => handleToggleAll(true)}
                                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        Attiva Tutti
                                    </button>
                                    <button 
                                        onClick={() => handleToggleAll(false)}
                                        className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5"
                                    >
                                        Disattiva Tutti
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {availableModules.map(mod => {
                                    const isEnabled = selectedCompany.activeModules?.[mod.id] === true;
                                    const Icon = mod.icon;

                                    return (
                                        <div 
                                            key={mod.id} 
                                            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                                                isEnabled 
                                                ? `bg-white border-slate-300 shadow-sm` 
                                                : 'bg-slate-50 border-slate-200 opacity-75 grayscale-[0.5]'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${isEnabled ? mod.bg : 'bg-slate-200'} ${isEnabled ? mod.color : 'text-slate-500'}`}>
                                                        <Icon className="h-6 w-6" />
                                                    </div>
                                                    <h4 className={`font-black text-lg ${isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
                                                        {mod.name}
                                                    </h4>
                                                </div>
                                                
                                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={isEnabled}
                                                        onChange={() => handleToggleModule(mod.id, isEnabled)}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-sm"></div>
                                                </label>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 leading-relaxed ml-12">
                                                {mod.desc}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                            <ShieldCheckIcon className="h-16 w-16 text-indigo-200 mb-4" />
                            <h3 className="text-xl font-black text-slate-800">Nessun Tenant Selezionato</h3>
                            <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs">
                                Seleziona un'azienda dalla lista a sinistra per configurare i suoi accessi e accendere o spegnere i moduli del gestionale.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};