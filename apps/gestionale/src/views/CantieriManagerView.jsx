import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData, useOfferteManager } from 'shared-core'; 
import { 
    MagnifyingGlassIcon, MapPinIcon, 
    BuildingOfficeIcon, ChevronRightIcon, InboxArrowDownIcon,
    ListBulletIcon, ArchiveBoxIcon, FunnelIcon,
    BoltIcon // 🌟 AGGIUNTA L'ICONA PER L'URGENZA
} from '@heroicons/react/24/solid';

import { CantiereDashboard } from '../CantiereDashboard'; 
import { AggiungiCantiereForm } from '../AggiungiCantiereForm'; 
import { GlobalReportLavori } from '../components/cantieri/GlobalReportLavori.jsx'; 

const CantieriManagerView = () => {
    const { data, userAziendaId, userRole, user, db } = useFirebaseData();
    const cantieri = data?.cantieri || [];
    const offerte = data?.offerte || [];
    const clients = data?.clients || [];
    const fatture = data?.fatture || []; 

    const { segnaOffertaConvertita } = useOfferteManager(db, user, userAziendaId);
    
    const [activeTab, setActiveTab] = useState('attivi'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [statoFilter, setStatoFilter] = useState('tutti'); 

    const offerteDaConvertire = useMemo(() => {
        // 🌟 FILTRO BLINDATO: Prende le accettate, MA esclude SEMPRE i Pronto Intervento
        return offerte.filter(o => o.stato === 'accettata' && !o.isFastTrack);
    }, [offerte]);

    const [selectedCantiereId, setSelectedCantiereId] = useState(() => {
        const savedId = localStorage.getItem('selectedCantiereId');
        return savedId || null;
    });

    useEffect(() => {
        const savedId = localStorage.getItem('selectedCantiereId');
        if (savedId) {
            localStorage.removeItem('selectedCantiereId');
        }
    }, []);

    const [showAddForm, setShowAddForm] = useState(false);
    const [offertaInConversione, setOffertaInConversione] = useState(null); 
    
    // 🌟 NUOVO STATO: Ricorda se abbiamo cliccato "Pronto Intervento"
    const [isFastTrackMode, setIsFastTrackMode] = useState(false); 

    const [viewGlobalLog, setViewGlobalLog] = useState(false);

    const isAmministrazione = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);

    const handleIniziaConversione = (offerta) => {
        setOffertaInConversione(offerta);
        setIsFastTrackMode(false); // 🌟 Assicura che la conversione standard NON sia un'emergenza
        setShowAddForm(true); 
    };

    const handleSaveSuccess = async (nuovoCantiereId) => {
        if (offertaInConversione) {
            await segnaOffertaConvertita(offertaInConversione.id, nuovoCantiereId);
            setOffertaInConversione(null);
        }
        setShowAddForm(false);
    };

    if (viewGlobalLog && isAmministrazione) {
        return (
            <GlobalReportLavori 
                reports={data?.reports || []}
                cantieri={cantieri}
                users={data?.users || []}
                userRole={userRole}
                onBack={() => setViewGlobalLog(false)}
            />
        );
    }

    if (selectedCantiereId) {
        return (
            <CantiereDashboard 
                cantiereId={selectedCantiereId} 
                onBack={() => {
                    setSelectedCantiereId(null);
                    localStorage.removeItem('cantiereActiveTab'); 
                }} 
            />
        );
    }

    const filteredCantieri = cantieri
        .filter(c => activeTab === 'attivi' ? !c.chiuso : c.chiuso)
        .filter(c => statoFilter === 'tutti' || (c.stato || 'attivo') === statoFilter)
        .filter(c => 
            (c.nomeCantiere || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.cliente || c.nomeCliente || c.enteAppaltante || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.codice || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="p-6 space-y-6 animate-fade-in h-full flex flex-col">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BuildingOfficeIcon className="h-7 w-7 text-indigo-600" />
                        Gestione Cantieri
                    </h1>
                    <p className="text-gray-500 mt-1">Gestione operativa commesse e reportistica.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    
                    {/* 🌟 IL NUOVO PULSANTE PRONTO INTERVENTO */}
                    <button 
                        onClick={() => {
                            setOffertaInConversione(null); // Nessuna offerta da convertire
                            setIsFastTrackMode(true);      // Attiva levetta urgenza
                            setShowAddForm(true);          // Apri il modale
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md border border-rose-700 active:scale-95"
                    >
                        <BoltIcon className="h-5 w-5" />
                        Pronto Intervento
                    </button>

                    {isAmministrazione && (
                        <button 
                            onClick={() => setViewGlobalLog(true)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors border border-indigo-200"
                        >
                            <ListBulletIcon className="h-5 w-5" />
                            Vista Globale Lavori
                        </button>
                    )}

                    <div className="relative">
                        <select 
                            value={statoFilter}
                            onChange={(e) => setStatoFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold text-gray-700 appearance-none h-full"
                        >
                            <option value="tutti">Tutti gli stati</option>
                            <option value="attivo">Operativi (Attivi)</option>
                            <option value="sospeso">Sospesi</option>
                            <option value="da_fatturare">Da Fatturare</option>
                        </select>
                        <FunnelIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Cerca per titolo o cliente..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>

            <div className="flex gap-6 border-b border-gray-200">
                <button
                    onClick={() => { setActiveTab('attivi'); setStatoFilter('tutti'); }}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'attivi' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <BuildingOfficeIcon className="h-4 w-4" />
                    Cantieri Attivi
                </button>
                <button
                    onClick={() => { setActiveTab('storico'); setStatoFilter('tutti'); }}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'storico' ? 'border-gray-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <ArchiveBoxIcon className="h-4 w-4" />
                    Storico / Chiusi
                </button>
            </div>

            {activeTab === 'attivi' && offerteDaConvertire.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 animate-fade-in">
                    <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2 mb-3">
                        <InboxArrowDownIcon className="h-6 w-6" />
                        Pronti per l'Avvio ({offerteDaConvertire.length})
                    </h2>
                    <p className="text-sm text-blue-600 mb-4">Hai delle gare aggiudicate o dei preventivi accettati. Convertili per avviare il cantiere.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {offerteDaConvertire.map(offerta => (
                            <div key={offerta.id} className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 flex justify-between items-center hover:border-blue-300 transition-colors">
                                <div className="overflow-hidden pr-2">
                                    <p className="font-bold text-gray-900 truncate">{offerta.nomeOfferta}</p>
                                    <p className="text-xs text-gray-500 truncate">{clients.find(c => c.id === offerta.clienteId)?.nome || offerta.enteAppaltante || 'Cliente N/D'}</p>
                                </div>
                                <button
                                    onClick={() => handleIniziaConversione(offerta)}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm"
                                >
                                    Converti
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filteredCantieri.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                    <ArchiveBoxIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Nessun cantiere trovato con questi filtri.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10 overflow-y-auto">
                    {filteredCantieri.map(cantiere => {
                        const appalto = Number(cantiere.valoreAppalto || 0);
                        const fatturatoCantiere = fatture
                            .filter(f => f.cantiereId === cantiere.id && (f.stato || '').toLowerCase() !== 'annullata')
                            .reduce((acc, f) => acc + Number(f.totaleDocumento || f.imponibile || 0), 0);
                        
                        const percFatturata = appalto > 0 ? Math.min((fatturatoCantiere / appalto) * 100, 100) : 0;
                        const isInteramenteFatturato = appalto > 0 && fatturatoCantiere >= appalto;

                        let badgeClass = 'bg-green-100 text-green-700 border-green-200';
                        let badgeText = 'Attivo';
                        if (cantiere.chiuso) { badgeClass = 'bg-gray-100 text-gray-600 border-gray-200'; badgeText = 'Chiuso'; }
                        else if (cantiere.stato === 'sospeso') { badgeClass = 'bg-orange-100 text-orange-700 border-orange-200'; badgeText = 'Sospeso'; }
                        else if (cantiere.stato === 'da_fatturare') { badgeClass = 'bg-red-100 text-red-700 border-red-200'; badgeText = 'Da Fatturare'; }

                        return (
                            <div 
                                key={cantiere.id} 
                                onClick={() => setSelectedCantiereId(cantiere.id)}
                                className={`bg-white group border ${activeTab === 'storico' ? 'border-gray-200 hover:border-gray-400 opacity-80 hover:opacity-100' : 'border-gray-200 hover:border-indigo-300'} rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[180px]`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase truncate max-w-[65%] ${activeTab === 'storico' ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-700'}`}>
                                            {cantiere.cliente || cantiere.nomeCliente || cantiere.enteAppaltante || 'Senza Cliente'}
                                        </span>
                                        <span className={`${badgeClass} px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border`}>
                                            {badgeText}
                                        </span>
                                    </div>
                                    
                                    <h3 className={`font-bold text-lg mb-1 transition-colors line-clamp-2 ${activeTab === 'storico' ? 'text-gray-700 group-hover:text-gray-900' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                                        {cantiere.nomeCantiere}
                                    </h3>
                                    
                                    <div className="flex items-center text-gray-500 text-sm mb-4">
                                        <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                                        <span className="truncate">{cantiere.indirizzo || 'Nessun indirizzo'}</span>
                                    </div>
                                </div>

                                <div className="mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Avanzamento Fatturato</span>
                                        <span className={`text-[10px] font-black ${isInteramenteFatturato ? 'text-green-600' : 'text-indigo-600'}`}>
                                            {percFatturata.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                            className={`h-1.5 rounded-full ${isInteramenteFatturato ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${percFatturata}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between items-center mt-1.5">
                                        <span className="text-xs font-bold text-gray-800">€ {fatturatoCantiere.toLocaleString('it-IT')}</span>
                                        <span className="text-[10px] text-gray-400">su € {appalto.toLocaleString('it-IT')}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showAddForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-fade-in-down">
                        <AggiungiCantiereForm 
                            onClose={() => setShowAddForm(false)} 
                            onBack={() => setShowAddForm(false)}
                            onSaveSuccess={handleSaveSuccess}
                            offertaDaConvertire={offertaInConversione} 
                            db={db}
                            userAziendaId={userAziendaId}
                            clients={clients}
                            companies={data?.companies || []}
                            initialFastTrack={isFastTrackMode} // 🌟 PASSIAMO LA NUOVA PROP QUI
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CantieriManagerView;