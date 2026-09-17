// packages/shared-ui/forms/ElaborazioneForm.jsx

import React from 'react';
import { useElaborazioneFormLogic } from 'shared-core';
import { StatoDocumenti } from '../components/StatoDocumenti';
import { SopralluogoReportModal } from '../components/SopralluogoReportModal';
import { FileUploadZone } from '../components/FileUploadZone';
import { 
    PaperClipIcon, CurrencyEuroIcon, WrenchScrewdriverIcon, ClockIcon, CheckCircleIcon,
    DocumentChartBarIcon, DocumentMagnifyingGlassIcon, ClipboardDocumentCheckIcon, MapPinIcon,
    ArrowLeftIcon, LockClosedIcon, ChatBubbleBottomCenterTextIcon, CalendarIcon, UserGroupIcon,
    ExclamationTriangleIcon, SparklesIcon, BeakerIcon, ArrowRightCircleIcon
} from '@heroicons/react/24/outline';

const fieldGroupStyle = "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6";
const inputStyle = "w-full p-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all bg-slate-50 focus:bg-white";
const selectStyle = "w-full p-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all bg-white";
const actionButtonStyle = "flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all text-slate-600 gap-2 text-center group h-full";

export const ElaborazioneForm = (props) => {
    const {
        offerta, onSubmit, onApproveOffer, personnel = [], isSaving, companyId, currentUser,
        sopralluogoFormTemplate, onGoBack, onOpenComputoAvanzato, onOpenPianificazione, isPro 
    } = props;

    const {
        formData, setFormData, handleSubmit, handleChange, valoreScontato, costiTotali, utilePrevisto,
        isStatoDocumentiOpen, setIsStatoDocumentiOpen, isSopralluogoOpen, setIsSopralluogoOpen,
        handleStatoDocumentiSave, handleSopralluogoSave, handleApproveClick, pendingFiles
    } = useElaborazioneFormLogic(offerta, onSubmit, onApproveOffer);

    // --- LOGICA DATI E CHECKLIST ---
    const valoreEconomicoRaw = offerta?.datiAnalisi?.valoreEconomico;
    const valoreIniziale = typeof valoreEconomicoRaw === 'string' ? parseFloat(valoreEconomicoRaw) || 0 : valoreEconomicoRaw || 0;
    
    const datiSopralluogoOriginali = offerta?.datiSopralluogoReport || {};
    const documentiRichiestiOriginali = offerta?.datiAnalisi?.documentiRichiesti || [];
    const cmeOriginalUrl = offerta?.datiAnalisi?.docCME?.[0]?.url;

    const hasSopralluogo = Object.keys(datiSopralluogoOriginali).length > 0;
    const hasCapitolato = !!cmeOriginalUrl;
    const hasComputo = (offerta?.datiAnalisi?.computoMetrico?.length > 0) || valoreIniziale > 0;
    const hasDocumenti = documentiRichiestiOriginali.some(d => d.fileUrl || d.esenzione);

    // --- LOGICA MARGINI ---
    const percentualeCosti = valoreScontato > 0 ? (costiTotali / valoreScontato) * 100 : 0;
    const percentualeUtile = valoreScontato > 0 ? (utilePrevisto / valoreScontato) * 100 : 0;
    const isMargineNegativo = utilePrevisto < 0;
    const isMargineBasso = !isMargineNegativo && percentualeUtile < 15;

    // --- SMART VALIDATOR ---
    const validationErrors = [];
    if (!hasComputo) validationErrors.push("Devi generare il preventivo nello Studio Tecnico");
    if (!formData.dataInizioPresunta) validationErrors.push("Manca la Data di Inizio Presunta");
    if (!formData.personaleCoinvolto || formData.personaleCoinvolto.trim() === '') validationErrors.push("Manca il Personale Richiesto (Squadre)");
    if (formData.approvazioneNecessaria && !formData.utenteApprovazioneId) validationErrors.push("Seleziona un Approvatore");
    const canSave = validationErrors.length === 0;

    const showApproveButton = offerta?.stato === 'in_approvazione' && currentUser && (currentUser.role === 'titolare-azienda' || currentUser.uid === formData.utenteApprovazioneId);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!canSave) return;
        const riepilogoAgenda = `
🏗️ PROSPETTO CANTIERE: ${offerta?.nomeOfferta || 'N/D'}
------------------------------------------
📅 Inizio: ${formData.dataInizioPresunta || 'Da definire'} - ⏳ Durata: ${formData.tempistichePreviste || 'N/D'}
👥 Personale: ${formData.personaleCoinvolto || 'N/D'}
💰 Margine: € ${utilePrevisto.toLocaleString('it-IT')} (${percentualeUtile.toFixed(1)}%)
        `.trim();
        handleSubmit({ ...formData, riepilogoAgenda }, pendingFiles);
    };

    return (
        <>
            <form onSubmit={handleFormSubmit} className="space-y-8 animate-fade-in pb-10">
                
                <div className="border-b border-slate-200 pb-4 mb-6">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Fase 2: Elaborazione ed Estimo</h2>
                    <p className="text-sm text-slate-500 font-medium">Gestisci i costi analitici e l'organizzazione produttiva.</p>
                </div>

                {/* --- 1. PULSANTI SUPERIORI --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
                    <button type="button" onClick={() => setIsSopralluogoOpen(true)} className={`relative ${actionButtonStyle} ${hasSopralluogo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                        {hasSopralluogo && <CheckCircleIcon className="absolute top-2 right-2 h-5 w-5 text-emerald-500" />}
                        <MapPinIcon className={`h-6 w-6 ${hasSopralluogo ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">Esito Sopralluogo</span>
                    </button>
                    
                    <button type="button" onClick={() => cmeOriginalUrl && window.open(cmeOriginalUrl, '_blank')} className={`relative ${actionButtonStyle} ${hasCapitolato ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 border-dashed bg-slate-50'}`}>
                        {hasCapitolato && <CheckCircleIcon className="absolute top-2 right-2 h-5 w-5 text-emerald-500" />}
                        <DocumentMagnifyingGlassIcon className={`h-6 w-6 ${hasCapitolato ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className="text-xs font-bold">Apri Capitolato</span>
                    </button>

                    <button type="button" onClick={() => onOpenComputoAvanzato(offerta.id)} className={`relative ${actionButtonStyle} ${hasComputo ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-500 bg-indigo-50/50 shadow-sm'}`}>
                        {hasComputo && <CheckCircleIcon className="absolute top-2 right-2 h-5 w-5 text-emerald-500" />}
                        <WrenchScrewdriverIcon className={`h-6 w-6 ${hasComputo ? 'text-emerald-600' : 'text-indigo-600'}`} />
                        <span className="text-xs font-bold">Studio Tecnico</span>
                    </button>
                    
                    <button type="button" onClick={() => setIsStatoDocumentiOpen(true)} className={`relative ${actionButtonStyle} ${hasDocumenti ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                        {hasDocumenti && <CheckCircleIcon className="absolute top-2 right-2 h-5 w-5 text-emerald-500" />}
                        <ClipboardDocumentCheckIcon className={`h-6 w-6 ${hasDocumenti ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">Check Documenti</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* --- COLONNA SINISTRA: FINANZE --- */}
                    <div className={fieldGroupStyle}>
                        <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                            <CurrencyEuroIcon className="h-5 w-5"/> Riepilogo Finanziario
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Base d'Asta</label>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-700">€ {valoreIniziale.toLocaleString('it-IT')}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Sconto Gara (%)</label>
                                <input type="number" name="scontoProposto" value={formData.scontoProposto} onChange={handleChange} className={inputStyle} step="0.01" />
                            </div>
                        </div>

                        <div className={`p-5 rounded-2xl border transition-all duration-500 ${isMargineNegativo ? 'bg-red-50 border-red-200' : (isMargineBasso ? 'bg-amber-50 border-amber-300' : 'bg-slate-800 border-slate-700 text-white shadow-lg')}`}>
                            <div className="flex justify-between items-end mb-4">
                                <div><p className="text-[10px] font-black uppercase opacity-60">Costi Totali</p><p className="text-sm font-bold">- {costiTotali.toLocaleString('it-IT')} €</p></div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase opacity-60">Utile Previsto</p>
                                    <p className="text-2xl font-black">{utilePrevisto.toLocaleString('it-IT')} € <span className="text-xs">({percentualeUtile.toFixed(1)}%)</span></p>
                                </div>
                            </div>
                            <div className="w-full h-3 rounded-full bg-slate-200/20 overflow-hidden flex shadow-inner">
                                <div style={{ width: `${Math.min(percentualeCosti, 100)}%` }} className={`h-full transition-all duration-700 ${isMargineNegativo ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                                {!isMargineNegativo && <div style={{ width: `${percentualeUtile}%` }} className={`h-full transition-all duration-700 ${isMargineBasso ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>}
                            </div>
                        </div>
                    </div>

                    {/* --- COLONNA DESTRA: PIANIFICAZIONE E OPERATIVITÀ --- */}
                    <div className="space-y-8">
                        
                        {/* 🌟 FEATURE GATE: PIANIFICAZIONE OPERATIVA (SOLO PRO) 🌟 */}
                        <div className={`p-6 rounded-2xl border-2 transition-all duration-500 ${isPro && hasComputo ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${isPro && hasComputo ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                    {isPro ? <BeakerIcon className="h-6 w-6" /> : <LockClosedIcon className="h-6 w-6" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-sm font-black uppercase ${isPro && hasComputo ? 'text-indigo-900' : 'text-slate-500'}`}>Organizzazione Lavori</h3>
                                        {!isPro && <span className="text-[9px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-black">SOLO PRO</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                        {isPro 
                                            ? (hasComputo ? "Accorpa le lavorazioni e simula il cronoprogramma delle squadre." : "Completa il computo per sbloccare la pianificazione.")
                                            : "Pianificazione automatica, accorpamento voci e Gantt disponibili solo nel piano PRO."}
                                    </p>
                                    
                                    {isPro ? (
                                        <button type="button" onClick={onOpenPianificazione} disabled={!hasComputo} className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all transform active:scale-95 ${hasComputo ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'bg-slate-300 text-white cursor-not-allowed'}`}>
                                            Vai alla Pianificazione <ArrowRightCircleIcon className="h-5 w-5" />
                                        </button>
                                    ) : (
                                        <div className="mt-4 p-3 bg-white/50 border border-slate-200 rounded-xl flex items-center gap-2 italic text-[10px] text-slate-500">
                                            <SparklesIcon className="h-4 w-4 text-amber-500" /> In versione Base la pianificazione è manuale ("a sensazione").
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SEZIONE INPUT MANUALE (La "Sensazione") */}
                        <div className={fieldGroupStyle}>
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                                <CalendarIcon className="h-5 w-5"/> Programmazione e Squadre
                            </h3>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Inizio Presunto *</label>
                                        <input type="date" name="dataInizioPresunta" value={formData.dataInizioPresunta || ''} onChange={handleChange} className={inputStyle} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Durata Prevista</label>
                                        <input type="text" name="tempistichePreviste" value={formData.tempistichePreviste || ''} onChange={handleChange} className={inputStyle} placeholder="Es. 3 settimane" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Personale Richiesto (Squadre) *</label>
                                    <input type="text" name="personaleCoinvolto" value={formData.personaleCoinvolto || ''} onChange={handleChange} className={inputStyle} placeholder="Es. 1 Squadra Verde (2 op.)" />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase ml-1 mb-2">
                                    <span>Allegati Extra (Opzionale)</span>
                                    <DocumentChartBarIcon className="h-4 w-4 opacity-40" />
                                </label>
                                <FileUploadZone onFilesSelected={(files) => setFormData(prev => ({...prev, docCMECompilatoFiles: files}))} isUploading={isSaving} />
                            </div>
                        </div>

                        {/* SEZIONE APPROVAZIONE */}
                        <div className={`p-6 rounded-2xl border transition-colors ${formData.approvazioneNecessaria ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                            <label className="flex items-center gap-3 cursor-pointer group mb-4">
                                <input type="checkbox" name="approvazioneNecessaria" checked={formData.approvazioneNecessaria || false} onChange={handleChange} className="h-5 w-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                                <span className="text-sm font-bold text-slate-700 group-hover:text-purple-700">Richiede approvazione interna</span>
                            </label>
                            {formData.approvazioneNecessaria && (
                                <div className="space-y-4 animate-fade-in pt-2">
                                    <select name="utenteApprovazioneId" value={formData.utenteApprovazioneId || ''} onChange={handleChange} className={selectStyle} required>
                                        <option value="">-- Seleziona Approvatore --</option>
                                        {personnel.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                                    </select>
                                    <textarea name="noteApprovazione" rows={2} value={formData.noteApprovazione || ''} onChange={handleChange} placeholder="Nota per il Titolare..." className="w-full p-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer e Validator */}
                <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col md:flex-row justify-between items-end gap-4">
                    <button type="button" onClick={onGoBack} className="flex items-center gap-2 px-6 py-3.5 bg-white text-slate-700 font-bold border rounded-xl hover:bg-slate-50 transition-all"><ArrowLeftIcon className="h-5 w-5" /> Indietro</button>
                    
                    <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                        {!canSave && (
                            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-left animate-pulse">
                                <h4 className="text-[10px] font-black text-red-800 uppercase flex items-center gap-1 mb-1"><ExclamationTriangleIcon className="h-3 w-3" /> Campi Obbligatori:</h4>
                                <ul className="text-[10px] font-bold text-red-600 ml-4 list-disc">{validationErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                            </div>
                        )}
                        <div className="flex gap-4 w-full md:w-auto">
                            {showApproveButton && <button type="button" onClick={handleApproveClick} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-8 rounded-xl shadow-lg transition-all active:scale-95">Approva Offerta</button>}
                            <button type="submit" disabled={isSaving || !canSave} className={`flex-1 md:flex-none py-3.5 px-10 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 ${formData.approvazioneNecessaria ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                {isSaving ? 'Salvataggio...' : (formData.approvazioneNecessaria ? 'Invia per Approvazione' : 'Salva Elaborazione')}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <SopralluogoReportModal isOpen={isSopralluogoOpen} onClose={() => setIsSopralluogoOpen(false)} onSave={handleSopralluogoSave} datiReport={datiSopralluogoOriginali} formTemplate={sopralluogoFormTemplate} />
            <StatoDocumenti isOpen={isStatoDocumentiOpen} onClose={() => setIsStatoDocumentiOpen(false)} onSave={handleStatoDocumentiSave} documentiRichiesti={documentiRichiestiOriginali} companyId={companyId} />
        </>
    );
};