// packages/shared-ui/views/OffertaWorkspaceView.jsx

import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, updateDoc, serverTimestamp, collection, addDoc, setDoc } from 'firebase/firestore';

import { AnalisiPreliminareForm } from '../forms/AnalisiPreliminareForm';
import { ElaborazioneForm } from '../forms/ElaborazioneForm';
import { RevisioneInvioForm } from '../forms/RevisioneInvioForm';
import { PreventivoBuilderPro } from '../components/PreventivoBuilder/PreventivoBuilderPro';
import { RichiestaOffertaForm } from 'shared-ui'; 

// 🌟 1. IMPORTA LA NUOVA VISTA
import { PianificazioneOperativaView } from './PianificazioneOperativaView'; 

import { 
    CheckCircleIcon, DocumentTextIcon, BuildingOfficeIcon, 
    TagIcon, ArrowLeftIcon 
} from '@heroicons/react/24/outline';

export const OffertaWorkspaceView = (props) => {
    const {
        offerta, formSubmissions, isSaving, clienteSelezionato, personnel,
        availableForms = [], documentiAziendali = [],
        onAddReferente, onCreaAppuntamento, companyId, currentUser,
        sopralluogoFormTemplate, onLogProroga, onArchivia, onSetInviata,
        onPrepareEmailDraft, onAccettaOfferta, onRifiutaOfferta, onBack,
        onConvertiInCantiere, onAggiornaCantiere
    } = props;

    const { db, data } = useFirebaseData();

    const idCercato = offerta.companyID || companyId;
    const currentCompany = data?.companies?.find(c => c.id === idCercato);
    const isProPlan = currentCompany?.companyFeatures?.isPro === true;

    const maxFase = offerta.faseCorrente || 1;
    const [viewingFase, setViewingFase] = useState(maxFase);
    const [showComputoAvanzato, setShowComputoAvanzato] = useState(false);

    const [showRdoModal, setShowRdoModal] = useState(false);
    const [datiInizialiRdo, setDatiInizialiRdo] = useState(null);

    const [showPianificazione, setShowPianificazione] = useState(false);

    const cantieriOriginali = data?.cantieri || [];
    const fornitori = data?.fornitori || [];
    const subappaltatori = data?.subappaltatori || [];
    const noleggiatori = data?.noleggiatori || [];
    const catalogo = Array.isArray(data?.catalogo_risorse) ? data.catalogo_risorse : [];

    const cantieriPerRdo = [
        { 
            id: `GARA_${offerta.id}`, 
            nomeCantiere: `📌 GARA: ${offerta.nomeOfferta || 'Offerta in corso'}`,
            indirizzo: clienteSelezionato?.citta || 'In fase di gara'
        },
        ...cantieriOriginali
    ];

    useEffect(() => { setViewingFase(maxFase); }, [maxFase]);

    const handleSaveWBS = async (righe, totali, isDraft = false) => {
        try {
            const offertaRef = doc(db, 'offerte', offerta.id);
            await updateDoc(offertaRef, {
                'datiAnalisi.computoMetrico': righe,
                'datiAnalisi.valoreEconomico': totali.totaleVendita,
                'datiAnalisi.costiPrevisti': totali.totaleCosti,
                'datiAnalisi.utilePrevisto': totali.utileNetto,
                'datiComputo.scontoApplicato': totali.ribassoGara || 0,
                updatedAt: serverTimestamp()
            });
            
            if (isDraft) {
                alert("☁️ Bozza salvata con successo!");
            } else {
                alert("✅ Computo completato!");
                setShowComputoAvanzato(false); 
            }
        } catch (error) {
            console.error("Errore salvataggio WBS:", error);
        }
    };

    const handleSaveRdoRapida = async (payload, files) => {
        try {
            const finalData = { ...payload, companyID: idCercato, preventiviRicevuti: 0, fornitoreVincenteId: null, allegati: [], offertaCollegataId: offerta.id };
            await addDoc(collection(db, 'richieste_offerta'), finalData);
            alert("✅ RDO creata!");
            setShowRdoModal(false);
        } catch (error) {
            console.error("Errore RDO:", error);
        }
    };

    if (showComputoAvanzato) {
        return (
            <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
                {showRdoModal && (
                    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                            <RichiestaOffertaForm onBack={() => setShowRdoModal(false)} onSave={handleSaveRdoRapida} cantieri={cantieriPerRdo} fornitori={fornitori} subappaltatori={subappaltatori} noleggiatori={noleggiatori} catalogo={catalogo} datiIniziali={datiInizialiRdo} />
                        </div>
                    </div>
                )}
                <header className="bg-slate-900 shrink-0 sticky top-0 z-10 shadow-md px-6 py-4 flex items-center justify-between">
                    <button onClick={() => setShowComputoAvanzato(false)} className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-sm bg-slate-800 px-4 py-2 rounded-xl transition-all">
                        <ArrowLeftIcon className="h-5 w-5" /> Torna alla Fase 2
                    </button>
                    <h1 className="text-xl font-black text-white">Studio Tecnico Estimo</h1>
                    <div className="text-emerald-400 font-bold text-xs bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">{offerta.nomeOfferta}</div>
                </header>
                <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full pb-20">
                    <PreventivoBuilderPro offertaId={offerta.id} righeIniziali={offerta.datiAnalisi?.computoMetrico || []} onSave={handleSaveWBS} onRequestRDO={(d) => { setDatiInizialiRdo(d); setShowRdoModal(true); }} />
                </main>
            </div>
        );
    }

    // 🌟 2. GESTIONE VISTA PIANIFICAZIONE OPERATIVA
    if (showPianificazione) {
        return (
            <PianificazioneOperativaView 
                offerta={offerta} 
                onBack={() => setShowPianificazione(false)} 
                onGoToGantt={() => {
                    alert("In costruzione: Presto andrai alla simulazione Gantt!"); 
                    // Qui aggiungeremo il passaggio alla Fase 2 dell'organizzazione
                }}
            />
        );
    }

    const steps = [
        { id: 'analisi', name: 'Analisi Preliminare', number: 1 },
        { id: 'elaborazione', name: 'Elaborazione Tecnica', number: 2 },
        { id: 'invio', name: 'Revisione ed Esito', number: 3 }
    ];

    const getStatusBadge = (s) => {
        const styles = {
            in_elaborazione: "bg-amber-100 text-amber-800 border-amber-200",
            in_approvazione: "bg-purple-100 text-purple-800 border-purple-200",
            pronta_per_invio: "bg-blue-100 text-blue-800 border-blue-200",
            inviata: "bg-sky-100 text-sky-800 border-sky-200",
            accettata: "bg-emerald-100 text-emerald-800 border-emerald-200"
        };
        return <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${styles[s] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{s?.replace(/_/g, ' ') || 'Nuova'}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-screen">
            
            <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-sm px-6 py-4">
                <div className="max-w-6xl mx-auto">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-4"><ArrowLeftIcon className="h-4 w-4" /> Torna alla lista Offerte</button>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <DocumentTextIcon className="h-8 w-8 text-indigo-600 bg-indigo-50 p-1.5 rounded-lg" />
                            <h1 className="text-2xl font-black text-slate-800">{offerta.nomeOfferta || 'Offerta'}</h1>
                        </div>
                        {getStatusBadge(offerta.stato)}
                    </div>
                    
                    <nav aria-label="Progress" className="mt-8 mb-10 w-full max-w-4xl mx-auto px-4 sm:px-8">
                        <ol role="list" className="flex items-center justify-between w-full relative">
                            <div className="absolute top-4 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
                            
                            <div 
                                className="absolute top-4 left-0 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500" 
                                style={{ width: `${((viewingFase - 1) / (steps.length - 1)) * 100}%` }}
                            ></div>

                            {steps.map((step) => {
                                const stepNumber = step.number;
                                const isCompleted = maxFase > stepNumber || ['accettata', 'rifiutata', 'archiviata', 'convertita_in_cantiere'].includes(offerta.stato);
                                const isCurrent = viewingFase === stepNumber && !['accettata', 'rifiutata', 'archiviata', 'convertita_in_cantiere'].includes(offerta.stato);
                                const isClickable = stepNumber <= maxFase;

                                return (
                                    <li key={step.name} className="relative flex flex-col items-center">
                                        <div 
                                            onClick={() => isClickable && setViewingFase(stepNumber)}
                                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                                            isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 
                                            isCurrent ? 'bg-white border-indigo-600 text-indigo-600 shadow-md scale-110' : 
                                            'bg-white border-slate-300 text-slate-400'
                                        } ${isClickable ? 'cursor-pointer hover:ring-4 hover:ring-indigo-100' : 'cursor-not-allowed opacity-50'}`}>
                                            {isCompleted && !isCurrent ? (
                                                <CheckCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                                            ) : (
                                                <span className={`text-xs font-black rounded-full w-full h-full flex items-center justify-center ${isCurrent || isCompleted ? 'bg-transparent' : 'bg-white'}`}>{step.number}</span>
                                            )}
                                        </div>
                                        
                                        <div className="absolute top-10 text-center w-28 sm:w-40">
                                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-tight block ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                                                {step.name}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full mt-6 pb-20">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                    {viewingFase === 1 && <AnalisiPreliminareForm datiIniziali={offerta} clienteSelezionato={clienteSelezionato} personnel={personnel} documentiAziendali={documentiAziendali} onSubmit={formSubmissions.handleAnalisiSubmit} onAddReferente={onAddReferente} isSaving={isSaving} availableForms={availableForms} onCreaAppuntamento={onCreaAppuntamento} />}
                    
                    {viewingFase === 2 && (
                        <ElaborazioneForm 
                            offerta={offerta} personnel={personnel} isSaving={isSaving} companyId={companyId} currentUser={currentUser} sopralluogoFormTemplate={sopralluogoFormTemplate} 
                            onGoBack={() => setViewingFase(1)} onOpenComputoAvanzato={() => setShowComputoAvanzato(true)} isPro={isProPlan}
                            onOpenPianificazione={() => setShowPianificazione(true)} // 🌟 3. PASSA LA PROP AL FORM
                            onApproveOffer={formSubmissions.handleApproveOffer}
                            
                            onSubmit={async (fData, files) => {
                                await formSubmissions.handleElaborazioneSubmit(fData, files);
                                
                                if (fData.approvazioneNecessaria && fData.utenteApprovazioneId) {
                                    try {
                                        const eventoId = `REQ_APP_${offerta.id}`;
                                        const eventoRef = doc(db, 'eventi', eventoId);
                                        
                                        await setDoc(eventoRef, {
                                            titolo: `📩 APPROVAZIONE: ${offerta.nomeOfferta || 'Gara'}`,
                                            data: new Date(), 
                                            descrizione: fData.riepilogoAgenda, 
                                            note: fData.riepilogoAgenda,     
                                            dettagli: fData.riepilogoAgenda, 
                                            companyId: idCercato,
                                            offertaId: offerta.id,
                                            tipo: 'approvazione',
                                            color: '#9333ea', 
                                            assegnatoA: fData.utenteApprovazioneId,
                                            creatoDa: currentUser?.uid,
                                            stato: 'pendente',
                                            updatedAt: serverTimestamp()
                                        }, { merge: true });
                                        
                                    } catch (err) {
                                        console.error("Errore sincronizzazione agenda:", err);
                                    }
                                }

                                if (!fData.approvazioneNecessaria) setViewingFase(3); 
                            }} 
                        />
                    )}
                    
                    {viewingFase === 3 && <RevisioneInvioForm offerta={offerta} user={currentUser} onLogProroga={onLogProroga} onArchivia={onArchivia} onSetInviata={onSetInviata} onPrepareEmailDraft={onPrepareEmailDraft} isSaving={isSaving} onAccettaOfferta={onAccettaOfferta} onRifiutaOfferta={onRifiutaOfferta} onGoBack={() => setViewingFase(2)} onConvertiInCantiere={onConvertiInCantiere} onAggiornaCantiere={onAggiornaCantiere} />}
                </div>
            </main>
        </div>
    );
};
