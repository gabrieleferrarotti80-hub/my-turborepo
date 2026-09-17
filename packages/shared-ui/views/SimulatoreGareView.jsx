// packages/shared-ui/views/SimulatoreGareView.jsx

import React, { useState, useEffect } from 'react';
import { 
    BeakerIcon, ArrowLeftIcon, CloudArrowUpIcon, 
    DocumentTextIcon, BuildingOfficeIcon, PlayIcon, ArrowPathIcon,
    ArchiveBoxIcon, ArrowRightIcon, ForwardIcon, CheckCircleIcon // <--- Eccole qui!
} from '@heroicons/react/24/outline';

import { useFirebaseData } from 'shared-core';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

import { SimulatorePreventivoBuilder } from '../components/PreventivoBuilder/SimulatorePreventivoBuilder';
import { SimulatoreGanttView } from './SimulatoreGanttView';
import { SimulatoreFabbisogniView } from '../components/PreventivoBuilder/SimulatoreFabbisogniView';
import { SimulatoreReportView } from './SimulatoreReportView'; 

const STEPS_CONFIG = [
    { id: 0, label: "Setup" }, { id: 1, label: "Computo Estimo" }, { id: 2, label: "Fabbisogni" }, 
    { id: 3, label: "Gantt (Opz.)" }, { id: 4, label: "Revisione Sconti" }, { id: 5, label: "Report & Chiusura" }
];

const parseNum = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined || val === '') return 0;
    let str = val.toString();
    if (str.includes('.') && str.includes(',')) { str = str.replace(/\./g, '').replace(',', '.'); } 
    else if (str.includes(',') && !str.includes('.')) { str = str.replace(',', '.'); }
    const parsed = parseFloat(str); return isNaN(parsed) ? 0 : parsed;
};

export const SimulatoreGareView = ({ onExit }) => {
    const { db, user, data } = useFirebaseData();
    const companiesList = data?.companies || [];

    const [step, setStep] = useState(0); 
    const [maxStep, setMaxStep] = useState(0); 
    const [datiSetup, setDatiSetup] = useState({ nomeProgetto: 'Nuova Simulazione', cliente: '', budgetStimato: 0, aziendaTargetId: '', nomeAziendaEsterna: '' });
    const [risultatoEconomico, setRisultatoEconomico] = useState(null);
    const [risultatoOperativo, setRisultatoOperativo] = useState(null); 
    const [showToast, setShowToast] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [idSimulazioneSalvata, setIdSimulazioneSalvata] = useState(null);
    const [filtroCategoria, setFiltroCategoria] = useState(null);

    const [bozzeInSospeso, setBozzeInSospeso] = useState([]);
    const [simulazioniCompletate, setSimulazioniCompletate] = useState([]);
    const [isLoadingBozze, setIsLoadingBozze] = useState(false);
    const [activeTab, setActiveTab] = useState('bozze'); 

    const goToStep = (newStep) => { setStep(newStep); setMaxStep(prev => Math.max(prev, newStep)); };

    useEffect(() => {
        const fetchSimulazioni = async () => {
            if (!user || !db) return;
            setIsLoadingBozze(true);
            try {
                const q = query(collection(db, "simulazioni_consulenza"), where("metadata.autoreId", "==", user.uid));
                const snapshot = await getDocs(q);
                const allSims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                allSims.sort((a,b) => (b.metadata.ultimoAggiornamento?.toMillis() || 0) - (a.metadata.ultimoAggiornamento?.toMillis() || 0));
                
                setBozzeInSospeso(allSims.filter(s => s.metadata.status === 'bozza_tecnica'));
                setSimulazioniCompletate(allSims.filter(s => s.metadata.status === 'completata'));
            } catch (error) { console.error(error); } finally { setIsLoadingBozze(false); }
        };
        if (step === 0) fetchSimulazioni(); 
    }, [user, db, step]);

    const salvaSuFirebase = async (dE, dO, stato) => {
        if (!db || !user) return;
        setIsSaving(true);
        try {
            const payload = { setup: datiSetup, datiEconomici: dE, datiOperativi: dO, metadata: { autoreId: user.uid, autoreNome: user.displayName || user.email, ultimoAggiornamento: serverTimestamp(), status: stato } };
            if (idSimulazioneSalvata) { await updateDoc(doc(db, "simulazioni_consulenza", idSimulazioneSalvata), payload); } 
            else { payload.metadata.dataCreazione = serverTimestamp(); const docRef = await addDoc(collection(db, "simulazioni_consulenza"), payload); setIdSimulazioneSalvata(docRef.id); }
            setShowToast(true); setTimeout(() => setShowToast(false), 3000);
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const caricaSimulazione = (simulazione) => {
        setDatiSetup(simulazione.setup); 
        let dE = simulazione.datiEconomici;
        if (dE && dE.totali && !dE.totali.costoComplessivo) {
            const cc = dE.totali.totaleVendita - dE.totali.utileNetto;
            dE.totali.costoComplessivo = cc;
            dE.totali.moltiplicatoreCosti = dE.totali.totaleCosti > 0 ? cc / dE.totali.totaleCosti : 1;
        }
        setRisultatoEconomico(dE); 
        setRisultatoOperativo(simulazione.datiOperativi || null); 
        setIdSimulazioneSalvata(simulazione.id);
        
        let targetMaxStep = 1;
        if (dE?.righe?.length > 0) {
            targetMaxStep = 4;
            if (simulazione.datiOperativi || simulazione.metadata?.status === 'completata') {
                targetMaxStep = 5;
            }
        }
        setMaxStep(targetMaxStep); 

        if (simulazione.metadata?.status === 'completata') setStep(5);
        else setStep(1);
    };

    const handlePreventivoCompletato = (righe, totali, isB) => {
        const cc = totali.totaleVendita - totali.utileNetto;
        const m = totali.totaleCosti > 0 ? cc / totali.totaleCosti : 1;
        const nuoviDati = { righe, totali: { ...totali, costoComplessivo: cc, moltiplicatoreCosti: m } };
        setRisultatoEconomico(nuoviDati);
        if (isB) salvaSuFirebase(nuoviDati, risultatoOperativo, 'bozza_tecnica');
        else goToStep(2);
    };

    const handleScontoChange = (id, valStr) => {
        let sc = Math.abs(parseNum(valStr));
        const molt = risultatoEconomico.totali.moltiplicatoreCosti || 1;
        const righe = risultatoEconomico.righe.map(r => {
            if (r.id === id) {
                const b = parseNum(r.prezzoGaraOriginale); const q = (parseNum(r.quantita)||0)*(parseNum(r.numeroInterventi)||1);
                const cc = (parseNum(r.costoUnitarioBase)*q)*molt; const pV = b - (b*(sc/100));
                return { ...r, scontoProposto: sc, prezzoVenditaUnitario: pV, marginePercentuale: cc>0 ? (((pV*q)-cc)/cc)*100 : 0 };
            }
            return r;
        });
        let vT = 0; righe.forEach(r => vT += parseNum(r.prezzoVenditaUnitario)*((parseNum(r.quantita)||0)*(parseNum(r.numeroInterventi)||1)));
        setRisultatoEconomico({ righe, totali: { ...risultatoEconomico.totali, totaleVendita: vT, utileNetto: vT - risultatoEconomico.totali.costoComplessivo } });
    };

    const applicaScontoGlobale = (sc) => {
        let clean = Math.abs(parseNum(sc)); const m = risultatoEconomico.totali.moltiplicatoreCosti || 1;
        const righe = risultatoEconomico.righe.map(r => {
            const b = parseNum(r.prezzoGaraOriginale); const q = (parseNum(r.quantita)||0)*(parseNum(r.numeroInterventi)||1);
            const cc = (parseNum(r.costoUnitarioBase)*q)*m; const pV = b - (b*(clean/100));
            return { ...r, scontoProposto: clean, prezzoVenditaUnitario: pV, marginePercentuale: cc>0 ? (((pV*q)-cc)/cc)*100 : 0 };
        });
        let vT = 0; righe.forEach(r => vT += parseNum(r.prezzoVenditaUnitario)*((parseNum(r.quantita)||0)*(parseNum(r.numeroInterventi)||1)));
        setRisultatoEconomico({ righe, totali: { ...risultatoEconomico.totali, totaleVendita: vT, utileNetto: vT - risultatoEconomico.totali.costoComplessivo } });
    };

    return (
        <div className="flex flex-col h-full min-h-screen bg-slate-100 font-sans print:bg-white print:block">
            <header className="bg-indigo-900 border-b border-indigo-800 shrink-0 sticky top-0 z-20 shadow-md px-6 py-4 print:hidden">
                <div className="max-w-screen-2xl mx-auto flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4"><button onClick={() => step > 0 ? setStep(step - 1) : onExit()} className="p-2 rounded-full hover:bg-indigo-800 text-indigo-200"><ArrowLeftIcon className="h-5 w-5" /></button><h1 className="text-xl font-black text-white flex items-center gap-2"><BeakerIcon className="h-6 w-6 text-fuchsia-400" /> Simulatore</h1></div>
                    <div className="flex gap-2 items-center bg-indigo-950/50 p-1.5 rounded-full border border-indigo-800">
                        {STEPS_CONFIG.map((s) => (
                            <button key={s.id} onClick={() => s.id <= maxStep && setStep(s.id)} disabled={s.id > maxStep} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === s.id ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/50' : s.id <= maxStep ? 'hover:bg-indigo-800 text-indigo-200' : 'text-indigo-800 opacity-50'}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === s.id ? 'bg-white text-fuchsia-600' : 'bg-indigo-700 text-indigo-100'}`}>{s.id + 1}</div>
                                <span className="hidden lg:inline">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto max-w-screen-2xl mx-auto w-full p-6 relative print:p-0 print:overflow-visible print:max-w-none">
                {step === 0 && (
                    <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
                        <div className="bg-white rounded-3xl shadow-xl p-10">
                            <BeakerIcon className="h-16 w-16 text-fuchsia-600 mb-6" />
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Nuova Analisi</h2>
                            <div className="space-y-5 mb-10">
                                <div><label className="text-xs font-black uppercase text-slate-500">Scenario</label><input type="text" value={datiSetup.nomeProgetto} onChange={e => setDatiSetup({...datiSetup, nomeProgetto: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-xl" /></div>
                                <div><label className="text-xs font-black uppercase text-slate-500">Cliente</label><input type="text" value={datiSetup.cliente} onChange={e => setDatiSetup({...datiSetup, cliente: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-xl" /></div>
                            </div>
                            <button onClick={() => goToStep(1)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Avvia Studio Tecnico</button>
                        </div>
                        
                        <div className="bg-slate-200/50 rounded-3xl p-8 border border-slate-200 flex flex-col">
                            <div className="flex gap-4 mb-6 border-b border-slate-300 pb-2">
                                <button onClick={() => setActiveTab('bozze')} className={`text-lg font-black flex items-center gap-2 transition-colors ${activeTab === 'bozze' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><DocumentTextIcon className="h-6 w-6" /> Bozze</button>
                                <button onClick={() => setActiveTab('completate')} className={`text-lg font-black flex items-center gap-2 transition-colors ${activeTab === 'completate' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}><ArchiveBoxIcon className="h-6 w-6" /> Archivio</button>
                            </div>

                            <div className="space-y-3 overflow-y-auto pr-2 max-h-[400px] scrollbar-thin scrollbar-thumb-slate-300">
                                {isLoadingBozze ? (
                                    <div className="flex flex-col items-center justify-center text-slate-400 py-10"><ArrowPathIcon className="animate-spin h-8 w-8 mb-2"/><p className="font-bold text-sm">Caricamento...</p></div>
                                ) : activeTab === 'bozze' ? (
                                    bozzeInSospeso.length === 0 ? <div className="text-center py-10 text-slate-400"><p className="font-bold">Nessuna bozza in sospeso</p></div> : 
                                    bozzeInSospeso.map(b => (
                                        <div key={b.id} onClick={() => caricaSimulazione(b)} className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:border-indigo-400 border border-slate-200 transition-all group active:scale-95">
                                            <div className="flex justify-between items-start mb-1"><h4 className="font-black text-slate-800 group-hover:text-indigo-600 truncate">{b.setup.nomeProgetto}</h4><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">BOZZA</span></div>
                                            <p className="text-xs text-slate-500 font-bold truncate">{b.setup.cliente}</p>
                                            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-indigo-500 font-bold flex justify-between"><span>{b.datiEconomici?.righe?.length || 0} voci</span><span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">Riprendi <ArrowRightIcon className="h-3 w-3"/></span></div>
                                        </div>
                                    ))
                                ) : (
                                    simulazioniCompletate.length === 0 ? <div className="text-center py-10 text-slate-400"><p className="font-bold">Nessuna simulazione archiviata</p></div> : 
                                    simulazioniCompletate.map(c => (
                                        <div key={c.id} onClick={() => caricaSimulazione(c)} className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:border-emerald-500 border border-slate-200 transition-all group active:scale-95">
                                            <div className="flex justify-between items-start mb-1"><h4 className="font-black text-slate-800 group-hover:text-emerald-600 truncate">{c.setup.nomeProgetto}</h4><span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">CONCLUSA</span></div>
                                            <p className="text-xs text-slate-500 font-bold truncate">{c.setup.cliente}</p>
                                            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-emerald-600 font-bold flex justify-between"><span>€ {c.datiEconomici?.totali?.totaleVendita?.toLocaleString('it-IT', {maximumFractionDigits:0})}</span><span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">Apri Report <ArrowRightIcon className="h-3 w-3"/></span></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="print:hidden h-full">
                        <SimulatorePreventivoBuilder 
                            righeIniziali={risultatoEconomico?.righe || []} 
                            onSave={handlePreventivoCompletato}
                            onSync={(righeSync) => setRisultatoEconomico(prev => prev ? { ...prev, righe: righeSync } : { righe: righeSync, totali: {} })}
                            aziendaTargetId={datiSetup.aziendaTargetId} 
                            nomeAziendaEsterna={datiSetup.nomeAziendaEsterna} 
                            filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria} 
                        />
                    </div>
                )}
                
                {step === 2 && <div className="animate-fade-in print:hidden h-full flex flex-col pb-10"><div className="flex-1"><SimulatoreFabbisogniView righe={risultatoEconomico?.righe || []} onCategoryClick={(k) => { setFiltroCategoria(k); setStep(1); }} /></div><div className="mt-8 bg-white p-6 rounded-3xl flex justify-between shadow-lg"><button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-100 rounded-xl font-bold">Torna al Computo</button><div className="flex gap-4"><button onClick={() => { setRisultatoOperativo(null); goToStep(4); }} className="px-6 py-3 bg-white border border-indigo-200 text-indigo-600 font-black rounded-xl">Salta Gantt <ForwardIcon className="h-5 w-5 inline"/></button><button onClick={() => goToStep(3)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg font-black flex items-center gap-2">Crea Gantt <ArrowRightIcon className="h-5 w-5"/></button></div></div></div>}

                {step === 3 && <div className="h-[calc(100vh-160px)] print:hidden"><SimulatoreGanttView offerta={{ nomeOfferta: datiSetup.nomeProgetto, datiAnalisi: { computoMetrico: risultatoEconomico.righe } }} datiSalvati={risultatoOperativo} onBack={() => setStep(2)} onConfirm={(d) => { setRisultatoOperativo(d); goToStep(4); }} onSaveDraft={(d) => salvaSuFirebase(risultatoEconomico, d, 'bozza_tecnica')} /></div>}

                {step === 4 && risultatoEconomico && (
                    <div className="animate-fade-in max-w-7xl mx-auto print:hidden pb-20">
                        <div className="bg-slate-900 p-8 rounded-t-3xl text-white flex justify-between items-center shadow-lg"><div><h2 className="text-2xl font-black">Revisione Sconti</h2></div><p className="text-3xl font-black text-emerald-400">€ {risultatoEconomico.totali.utileNetto.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p></div>
                        <div className="bg-white rounded-b-3xl shadow-xl overflow-hidden border">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 border-b"><tr><th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500">Lavorazione</th><th className="text-right text-[10px] uppercase font-black text-slate-500">Costo Inc. Spese</th><th className="text-center px-4 text-[10px] uppercase font-black text-sky-600 bg-sky-50">Sconto %</th><th className="px-6 py-4 text-right text-[10px] uppercase font-black text-emerald-600">Prezzo Offerta</th></tr></thead>
                                <tbody className="divide-y">
                                    {risultatoEconomico.righe.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-bold text-sm text-slate-800">{r.descrizione}</td>
                                            <td className="text-right text-rose-600 font-black">€ {((parseNum(r.costoUnitarioBase)*(parseNum(r.quantita)||0)*(parseNum(r.numeroInterventi)||1))*(risultatoEconomico.totali.moltiplicatoreCosti||1)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                            <td className="text-center bg-sky-50/30"><div className="flex justify-center items-center gap-1"><input type="text" value={r.scontoProposto} onChange={(e) => handleScontoChange(r.id, e.target.value)} className="w-16 p-2 text-center border border-sky-300 rounded-lg font-black text-sky-700 shadow-inner outline-none focus:ring-2 focus:ring-sky-500" /> <span className="text-xs font-bold text-sky-600">%</span></div></td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-700 text-lg">€ {(parseNum(r.prezzoVenditaUnitario)*(parseNum(r.quantita)||0)*(parseNum(r.numeroInterventi)||1)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-8 flex justify-between bg-white p-6 rounded-3xl border border-slate-200">
                            <button onClick={() => setStep(step === 4 && !risultatoOperativo ? 2 : 3)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-2 transition-colors"><ArrowLeftIcon className="h-5 w-5"/> Indietro</button>
                            <button onClick={() => goToStep(5)} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all text-lg">Report Finale <ArrowRightIcon className="h-6 w-6 stroke-2"/></button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <SimulatoreReportView 
                        datiSetup={datiSetup} 
                        risultatoEconomico={risultatoEconomico} 
                        risultatoOperativo={risultatoOperativo} 
                        applicaScontoGlobale={applicaScontoGlobale} 
                        onBack={() => setStep(4)} 
                        onArchivia={(nuoveNote) => salvaSuFirebase(risultatoEconomico, {...risultatoOperativo, riepilogo: {...(risultatoOperativo?.riepilogo || {}), noteTitolare: nuoveNote}}, 'completata')} 
                        isSaving={isSaving}
                    />
                )}
            </main>

            {showToast && (
                <div className="fixed bottom-8 right-8 z-[1000] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in-up print:hidden">
                    <CloudArrowUpIcon className="h-8 w-8 text-indigo-400" />
                    <p className="font-black text-sm">Dati salvati in Cloud!</p>
                </div>
            )}
        </div>
    );
};