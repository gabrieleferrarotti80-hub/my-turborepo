// apps/gestionale/src/CantiereDashboard.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData, useAnalisiCommessaManager, useCantiereReportGenerator } from 'shared-core';
import { doc, updateDoc } from 'firebase/firestore';
import { 
    ArrowLeftIcon, ChartPieIcon, ClipboardDocumentListIcon, MapIcon, 
    DocumentTextIcon, BanknotesIcon, TruckIcon, WrenchScrewdriverIcon,
    ArchiveBoxIcon, ExclamationTriangleIcon, CheckIcon
} from '@heroicons/react/24/outline';

// Importazione Componenti Esterni
import { CantiereContabilita } from './components/cantieri/CantiereContabilita';
import ReportView from './ReportView'; 
import { CantiereReportDetailView } from 'shared-ui'; 

// Importazione dei nuovi Widget (che creeremo a breve)
import { CantiereInfoWidget } from './components/cantieri/widgets/CantiereInfoWidget';
import { DocumentiCantiereWidget } from './components/cantieri/widgets/DocumentiCantiereWidget';
import { CantiereSubappaltiWidget } from './components/cantieri/widgets/CantiereSubappaltiWidget';
import { CantiereNoleggiWidget } from './components/cantieri/widgets/CantiereNoleggiWidget';
import { AnalisiEconomicaWidget } from './components/cantieri/widgets/AnalisiEconomicaWidget';

export const CantiereDashboard = ({ cantiereId, onBack }) => {
    const { data, users, userAziendaId, user, db: safeDb, storage } = useFirebaseData();
    const cantiere = data?.cantieri?.find(c => c.id === cantiereId);
    
    const subappaltatori = data?.subappaltatori || [];
    
    const offertaCollegata = useMemo(() => {
        if (!cantiere?.offertaCollegataId || !data?.offerte) return null;
        return data.offerte.find(o => o.id === cantiere.offertaCollegataId);
    }, [cantiere?.offertaCollegataId, data?.offerte]);

    const currentCompany = (data?.companies || []).find(c => c.id === userAziendaId);
    const settings = currentCompany?.costSettings || {};

    const { analisi, setFiltroCantiereId, setDateRange } = useAnalisiCommessaManager(
        data?.cantieri || [], data?.fatture || [], data?.fatture_acquisto || [], 
        data?.presenze || [], data?.offerte || [], data?.programmazione || [], 
        data?.users || [], data?.attrezzature || [], settings, 
        data?.assegnazioniCantieri || [], data?.movimenti_magazzino || [], 
        data?.reports || [], data?.sal || [] 
    );

    useEffect(() => {
        if (setFiltroCantiereId) setFiltroCantiereId(cantiereId);
        if (setDateRange) setDateRange({ start: "2020-01-01", end: "2099-12-31" });
    }, [cantiereId, setFiltroCantiereId, setDateRange]);

    const handleUpdateCantiere = async (updatedFields) => {
        try {
            const cantiereRef = doc(safeDb, 'cantieri', cantiereId);
            const now = new Date();
            const timestampString = now.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
            const operatorName = user ? `${user.nome || ''} ${user.cognome || ''}`.trim() : 'Operatore';
            await updateDoc(cantiereRef, { ...updatedFields, lastModifiedAt: now, lastModifiedString: timestampString, lastModifiedBy: operatorName });
        } catch (error) { 
            console.error(error); alert("Errore salvataggio cantiere."); 
        }
    };

    // LOGICA CHIUSURA
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

   const checkChiusura = useMemo(() => {
        if (!cantiere) return null;
        
        // 1. Trova il Valore Appalto (Se è 0, lo va a pescare dall'offerta collegata!)
        let appalto = Number(cantiere.valoreAppalto || 0);
        if (appalto === 0 && data?.offerte) {
            const offerta = data.offerte.find(o => o.id === cantiere.offertaCollegataId || o.id === cantiere.offertaId);
            if (offerta) {
                appalto = Number(offerta?.datiAnalisi?.valoreEconomico || 0);
            }
        }
        
        // 2. Calcola i SAL già emessi
        const salList = (data?.sal || []).filter(s => s.cantiereId === cantiereId);
        const totaleSal = salList.reduce((acc, s) => acc + Number(s.importo || s.importoCertificato || 0), 0);
        
        // 3. Calcola il Fatturato (FIX: Somma solo l'Imponibile, non il Totale con IVA!)
        const fattureCantiere = (data?.fatture || []).filter(f => f.cantiereId === cantiereId && (f.stato || '').toLowerCase() !== 'annullata');
        const totaleFatturato = fattureCantiere.reduce((acc, f) => acc + Number(f.imponibile || 0), 0);

        // 4. Calcola il rimanente reale
        const rimanenteFatture = Math.max(0, appalto - totaleFatturato);

        return { appalto, totaleSal, totaleFatturato, rimanenteFatture };
    }, [cantiere, data?.sal, data?.fatture, cantiereId, data?.offerte]);

    const handleConfermaChiusura = async () => {
        setIsClosing(true);
        const nuovoStato = checkChiusura.rimanenteFatture > 0 ? 'da_fatturare' : 'chiuso';
        await handleUpdateCantiere({ stato: nuovoStato, chiuso: true, dataChiusura: new Date().toISOString() });
        setIsClosing(false); setShowCloseModal(false);
        alert(`✅ Cantiere archiviato con successo!\n(Stato Finale: ${nuovoStato.replace('_', ' ').toUpperCase()})`);
        onBack();
    };

    const rawReports = (data?.reports || []).filter(r => r.cantiereId === cantiereId);
    const { fullReport } = useCantiereReportGenerator(
        cantiere ? [cantiere] : [], data?.assegnazioniCantieri || [], rawReports, 
        data?.reportTecnico || [], data?.users || [], data?.attrezzature || []
    );
    const summaryReports = fullReport && fullReport.length > 0 ? [fullReport[0]] : [];

    const [activeTab, setActiveTab] = useState(() => {
        const savedTab = localStorage.getItem('cantiereActiveTab');
        if (savedTab) { localStorage.removeItem('cantiereActiveTab'); return savedTab; }
        return 'info';
    });

    if (!cantiere) return <div className="p-8 text-center text-gray-500">Caricamento cantiere...</div>;

    const tabs = [
        { id: 'info', label: 'Info Cantiere', icon: DocumentTextIcon }, 
        { id: 'report_cantiere', label: 'Report Lavori', icon: ClipboardDocumentListIcon },
        { id: 'mappe', label: 'Mappe', icon: MapIcon }, 
        { id: 'subappalti', label: 'Subappalti', icon: WrenchScrewdriverIcon }, 
        { id: 'noleggi', label: 'Noleggi', icon: TruckIcon }, 
        { id: 'contabilita', label: 'Sal/Contabilità', icon: BanknotesIcon },
        { id: 'analisi_commessa', label: 'Analisi Commessa', icon: ChartPieIcon },
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in relative">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center sticky top-0 z-10 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeftIcon className="h-5 w-5" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{cantiere.nomeCantiere}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">{cantiere.indirizzo} <span className="text-gray-300">•</span> {cantiere.cliente}</p>
                    </div>
                </div>
                {cantiere.stato !== 'da_fatturare' && cantiere.stato !== 'chiuso' && (
                    <button onClick={() => setShowCloseModal(true)} className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl hover:bg-black font-bold shadow-md transition-colors text-sm whitespace-nowrap active:scale-95">
                        <ArchiveBoxIcon className="h-5 w-5" /> Termina Cantiere
                    </button>
                )}
            </div>

            <div className="bg-white px-6 border-b border-gray-200">
                <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`group flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} /> {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto pb-10">
                {activeTab === 'info' && ( 
                    <>
                        <CantiereInfoWidget cantiere={cantiere} onUpdate={handleUpdateCantiere} user={user} offertaCollegata={offertaCollegata} users={data?.users || []} />
                        <DocumentiCantiereWidget cantiere={cantiere} db={safeDb} storage={storage} />
                    </> 
                )}
                {activeTab === 'report_cantiere' && ( 
                    <div className="p-6">
                        {summaryReports.length > 0 ? (
                            <CantiereReportDetailView report={summaryReports[0]} rawReports={rawReports} onBack={() => setActiveTab('info')} /> 
                        ) : (
                            <div className="text-center text-gray-500 p-12 bg-white rounded-xl shadow-sm border border-gray-200"><p className="text-lg font-semibold">Nessun report</p></div>
                        )}
                    </div> 
                )}
                {activeTab === 'mappe' && <div className="p-4 h-full"><ReportView preSelectedCantiereId={cantiere.id} hideHeader={true} defaultView="mappa" hideTabs={true} reports={rawReports} /></div>}
                {activeTab === 'subappalti' && <CantiereSubappaltiWidget cantiere={cantiere} subappaltatori={subappaltatori} fattureAcquisto={data?.fatture_acquisto || []} storage={storage} onUpdate={handleUpdateCantiere} />}
                {activeTab === 'noleggi' && <CantiereNoleggiWidget cantiere={cantiere} noleggiatori={data?.noleggiatori || []} fattureAcquisto={data?.fatture_acquisto || []} onUpdate={handleUpdateCantiere} />}
                {activeTab === 'contabilita' && <div className="p-6 h-full"><CantiereContabilita cantiere={cantiere} /></div>}
                {activeTab === 'analisi_commessa' && <AnalisiEconomicaWidget cantiere={cantiere} analisiReale={{ kpi: analisi }} />}
            </div>

            {/* MODALE CHIUSURA E CONTROLLO FATTURAZIONE */}
            {showCloseModal && checkChiusura && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-down border border-gray-200">
                        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                            <div className={`p-3 rounded-full shrink-0 ${checkChiusura.rimanenteFatture > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                {checkChiusura.rimanenteFatture > 0 ? <ExclamationTriangleIcon className="h-8 w-8" /> : <CheckIcon className="h-8 w-8" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Termina Cantiere</h3>
                                <p className="text-sm text-gray-500 mt-1">Stai per archiviare "{cantiere.nomeCantiere}"</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Riepilogo Finanziario</p>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-sm text-gray-600">Valore Appalto Originale</span>
                                    <span className="font-bold text-gray-900">€ {checkChiusura.appalto.toLocaleString('it-IT')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-sm text-gray-600">SAL Emessi (Verbali)</span>
                                    <span className="font-bold text-indigo-600">€ {checkChiusura.totaleSal.toLocaleString('it-IT')}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-sm text-gray-600">Fatture Generate</span>
                                    <span className="font-bold text-green-600">€ {checkChiusura.totaleFatturato.toLocaleString('it-IT')}</span>
                                </div>
                            </div>
                            {checkChiusura.rimanenteFatture > 0 ? (
                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-orange-800">
                                    <p className="text-sm font-bold mb-1">⚠️ Attenzione: Credito Rimanente!</p>
                                    <p className="text-xs">Risultano ancora <strong>€ {checkChiusura.rimanenteFatture.toLocaleString('it-IT')}</strong> da fatturare. Confermando, il cantiere passerà ad <strong>Amministrazione</strong> nello stato "Da Fatturare".</p>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-800">
                                    <p className="text-sm font-bold mb-1">✅ Nessuna pendenza rilevata</p>
                                    <p className="text-xs">L'intero valore dell'appalto risulta essere stato fatturato. Confermando, il cantiere verrà <strong>chiuso definitivamente e archiviato</strong>.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button onClick={() => setShowCloseModal(false)} disabled={isClosing} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Annulla</button>
                            <button onClick={handleConfermaChiusura} disabled={isClosing} className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 flex items-center gap-2 ${checkChiusura.rimanenteFatture > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-800 hover:bg-black'}`}>
                                {isClosing ? 'Archiviazione...' : (checkChiusura.rimanenteFatture > 0 ? 'Termina e Invia ad Amministrazione' : 'Chiudi Definitivamente')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};