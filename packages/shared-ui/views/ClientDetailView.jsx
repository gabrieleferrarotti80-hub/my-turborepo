// packages/shared-ui/components/ClientDetailView.jsx

import React, { useMemo, useState } from 'react';
import { 
    ArrowLeftIcon, PencilIcon, MapPinIcon, IdentificationIcon,
    UserIcon, BriefcaseIcon, CalendarIcon, CheckCircleIcon,
    ClockIcon, FunnelIcon, CurrencyEuroIcon, EnvelopeIcon
} from '@heroicons/react/24/outline';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);

const DetailItem = ({ label, value, icon: Icon }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            {Icon && <Icon className="h-5 w-5 text-slate-400 mt-0.5" />}
            <div>
                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</dt>
                <dd className="text-sm font-semibold text-slate-700">{value}</dd>
            </div>
        </div>
    );
};

export const ClientDetailView = ({ client, cantieri = [], salList = [], onBack, onEdit }) => {
    const [activeFilter, setActiveFilter] = useState('tutti');
    
    // Logica incrocio dati Cantieri + SAL
    const cantieriProcessati = useMemo(() => {
        const base = cantieri.filter(c => c.clienteId === client.id);

        return base.map(cantiere => {
            const salApprovati = salList
                .filter(s => s.cantiereId === cantiere.id && s.stato === 'approvato')
                .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

            const ultimoSal = salApprovati[0];
            const valoreEffettivo = parseFloat(cantiere.valoreAppalto) || 0;

            return {
                ...cantiere,
                valoreNumerico: valoreEffettivo,
                percentualeReale: ultimoSal ? Number(ultimoSal.percentuale) : 0,
            };
        });
    }, [cantieri, salList, client.id]);

    const stats = useMemo(() => {
        const attivi = cantieriProcessati.filter(c => c.stato === 'attivo');
        const conclusi = cantieriProcessati.filter(c => c.stato === 'concluso' || c.stato === 'chiuso');
        const valoreTotale = cantieriProcessati.reduce((acc, curr) => acc + curr.valoreNumerico, 0);

        return {
            totali: cantieriProcessati.length,
            attivi: attivi.length,
            conclusi: conclusi.length,
            valoreTotale
        };
    }, [cantieriProcessati]);

    const filteredCantieri = useMemo(() => {
        if (activeFilter === 'attivi') return cantieriProcessati.filter(c => c.stato === 'attivo');
        if (activeFilter === 'conclusi') return cantieriProcessati.filter(c => c.stato === 'concluso' || c.stato === 'chiuso');
        return cantieriProcessati;
    }, [cantieriProcessati, activeFilter]);

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
            
            {/* Header Pro */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100">
                        {client.ragioneSociale?.substring(0,2).toUpperCase() || client.nome?.substring(0,1).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{client.ragioneSociale || `${client.nome} ${client.cognome}`}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5"/> {client.sedeLegale?.citta || 'Città N.D.'}</span>
                            <span className="text-xs font-bold text-indigo-600 uppercase">P.IVA: {client.piva || 'N/D'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onEdit(client)} className="flex items-center gap-2 px-5 py-2.5 text-white bg-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md">
                        <PencilIcon className="h-4 w-4" /> Modifica
                    </button>
                    <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 text-slate-600 bg-slate-50 rounded-xl font-bold text-sm border border-slate-200 transition-all">
                        <ArrowLeftIcon className="h-4 w-4" /> Indietro
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Dati Fiscali e Referenti Dinamici */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Dati Fiscali</h3>
                            <div className="space-y-4">
                                <DetailItem label="P.IVA / CF" value={client.piva || client.cf} icon={IdentificationIcon} />
                                <DetailItem label="Codice SDI" value={client.sdi} />
                                <DetailItem label="PEC" value={client.pec} icon={EnvelopeIcon} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Referenti e Contatti</h3>
                            <div className="space-y-4">
                                {client.referente?.nome && (
                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                        <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">Principale</p>
                                        <p className="text-sm font-bold text-slate-800">{client.referente.nome} {client.referente.cognome}</p>
                                        <p className="text-xs text-slate-500 font-medium break-all">{client.referente.email}</p>
                                    </div>
                                )}
                                {/* Lista Referenti aggiunti dalle offerte */}
                                {client.referenti && client.referenti.map((ref, idx) => (
                                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-bold text-slate-800">{ref.nome} {ref.cognome}</p>
                                            {ref.context && <span className="text-[8px] font-bold bg-orange-100 text-orange-700 px-1 py-0.5 rounded uppercase">{ref.context}</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 break-all">{ref.email}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sezione Cantieri */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => setActiveFilter('tutti')} className={`p-4 rounded-2xl border transition-all ${activeFilter === 'tutti' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>
                            <p className="text-[10px] font-black uppercase opacity-70">Lavori Totali</p>
                            <p className="text-xl font-black">{stats.totali}</p>
                        </button>
                        <button onClick={() => setActiveFilter('attivi')} className={`p-4 rounded-2xl border transition-all ${activeFilter === 'attivi' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500'}`}>
                            <p className="text-[10px] font-black uppercase opacity-70">In Corso</p>
                            <p className="text-xl font-black">{stats.attivi}</p>
                        </button>
                        <button onClick={() => setActiveFilter('conclusi')} className={`p-4 rounded-2xl border transition-all ${activeFilter === 'conclusi' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`}>
                            <p className="text-[10px] font-black uppercase opacity-70">Conclusi</p>
                            <p className="text-xl font-black">{stats.conclusi}</p>
                        </button>
                        <div className="p-4 rounded-2xl bg-slate-800 text-white text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400">Valore Portafoglio</p>
                            <p className="text-xl font-black text-emerald-400">{formatCurrency(stats.valoreTotale)}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Cantiere</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Valore Appalto</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Progresso (SAL)</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase">Stato</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCantieri.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-900">{c.nomeCantiere}</div>
                                            <div className="text-xs text-slate-500">{c.indirizzo || 'N.D.'}</div>
                                        </td>
                                        <td className="px-6 py-5 font-bold text-slate-700">{formatCurrency(c.valoreNumerico)}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1">
                                                <span>SAL Approvato</span>
                                                <span>{c.percentualeReale}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${c.percentualeReale}%` }}></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${c.stato === 'attivo' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {c.stato}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};