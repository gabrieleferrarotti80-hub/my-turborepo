// packages/shared-ui/forms/RevisioneInvioForm.jsx
import React, { useState, useEffect } from 'react';
import { useRevisioneLogic } from 'shared-core'; 

import { ControlloDocumentaleModal } from '../components/ControlloDocumentaleModal';
import { ScadenzaAlertModal } from '../components/ScadenzaAlertModal';
import { ConfermaInvioModal } from '../components/ConfermaInvioModal';
import { FileUploadZone } from '../components/FileUploadZone'; 

import { 
    PaperClipIcon, DocumentCheckIcon, EnvelopeIcon, ComputerDesktopIcon,
    ExclamationTriangleIcon, CheckBadgeIcon, CheckCircleIcon, XCircleIcon,
    ArchiveBoxXMarkIcon, ArrowLeftIcon, PlayIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

const fieldGroupStyle = "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5";
const inputStyle = "w-full p-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all";
const labelStyle = "block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1";

export const RevisioneInvioForm = ({
    offerta, user, onLogProroga, onArchivia, onSetInviata,
    onPrepareEmailDraft, isSaving, onAccettaOfferta, onRifiutaOfferta, onGoBack,
    onConvertiInCantiere, onAggiornaCantiere
}) => {
    
    const {
        isControlloDocOpen, isScadenzaAlertOpen, isConfermaInvioOpen,
        isInvioPiattaformaChecked, documentiStatus, isScaduta,
        handleControlloDocClick, handleCloseControlloDoc, handleProrogaConfirm,
        handleArchiviaConfirm, handleInvioPiattaformaChange, handleConfermaInvioYes, handleConfermaInvioNo,
    } = useRevisioneLogic(offerta, user, onLogProroga, onArchivia, onSetInviata);

    const [isInvioMailChecked, setIsInvioMailChecked] = useState(false);
    const [additionalFiles, setAdditionalFiles] = useState([]);
    
    const emailReferenteIniziale = offerta?.datiAnalisi?.referente?.email || '';
    const [emailTo, setEmailTo] = useState(emailReferenteIniziale);
    const [emailSubject, setEmailSubject] = useState(`Partecipazione a Gara: ${offerta?.nomeOfferta || ''}`);

    const valoreOriginale = parseFloat(offerta?.datiAnalisi?.valoreEconomico || 0);
    const scontoProposto = parseFloat(offerta?.datiElaborazione?.scontoProposto || 0);
    const valoreCalcolato = valoreOriginale * (1 - scontoProposto / 100);

    const [acceptStep, setAcceptStep] = useState(false);
    const [isEditingValue, setIsEditingValue] = useState(false);
    const [valoreFinale, setValoreFinale] = useState(valoreCalcolato);

    useEffect(() => { setValoreFinale(valoreCalcolato); }, [valoreCalcolato]);

    const isGiaInviata = offerta?.stato === 'inviata';
    const isSoloAccettata = offerta?.stato === 'accettata';
    const isConvertitaSenzaCantiere = offerta?.stato === 'convertita_in_cantiere' && !offerta?.cantiereId;
    
    // ✅ NUOVO STATO: Offerta perfettamente convertita e con cantiere agganciato
    const isConvertitaConCantiere = offerta?.stato === 'convertita_in_cantiere' && !!offerta?.cantiereId;
    
    const mostraRecuperoCantiere = isSoloAccettata || isConvertitaSenzaCantiere;
    const hasEsitoFinale = ['accettata', 'rifiutata', 'archiviata', 'convertita_in_cantiere'].includes(offerta?.stato);

    const handleInvioMailChange = (e) => {
        setIsInvioMailChecked(e.target.checked);
        if (!e.target.checked) setAdditionalFiles([]);
    };

    const handlePrepareDraftClick = () => {
        const emailData = { to: emailTo, subject: emailSubject };
        const foundDocuments = documentiStatus.filter(doc => doc.status === 'found' && doc.fileDetails);
        if (onPrepareEmailDraft) onPrepareEmailDraft(offerta.id, emailData, additionalFiles, foundDocuments);
    };

    return (
        <>
            <div className="space-y-8 animate-fade-in pb-10">
                <div className="border-b border-slate-200 pb-4 mb-6">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Fase 3: Revisione ed Esito</h2>
                    <p className="text-sm text-slate-500 font-medium">Controlla i documenti finali, invia l'offerta e registra l'esito della trattativa.</p>
                </div>

                {mostraRecuperoCantiere && (
                    <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-fade-in">
                        <div className="bg-indigo-100 p-4 rounded-full text-indigo-600">
                            <CheckBadgeIcon className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-indigo-900">
                                {isConvertitaSenzaCantiere ? 'Cantiere Non Trovato' : 'Offerta Già Accettata'}
                            </h3>
                            <p className="text-indigo-700 font-medium text-sm mt-1 max-w-md mx-auto">
                                Questa offerta risulta chiusa positivamente, ma il sistema non trova il Cantiere Operativo collegato.
                            </p>
                        </div>
                        <button 
                            onClick={() => onConvertiInCantiere(offerta.id)}
                            className="flex items-center gap-2 mt-4 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all transform active:scale-95"
                        >
                            <PlayIcon className="h-5 w-5" />
                            Genera Cantiere Adesso
                        </button>
                    </div>
                )}

                {/* ✅ NUOVO BOX VERDE DI SINCRONIZZAZIONE */}
                {isConvertitaConCantiere && (
                    <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-fade-in">
                        <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                            <CheckCircleIcon className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-emerald-900">Cantiere Operativo</h3>
                            <p className="text-emerald-700 font-medium text-sm mt-1 max-w-md mx-auto">
                                Questa offerta è già stata convertita. Se hai modificato costi o dati nell'offerta, puoi riallineare il Cantiere per aggiornare Budget e Costi previsti.
                            </p>
                        </div>
                        <button 
                            onClick={() => onAggiornaCantiere(valoreFinale)}
                            className="flex items-center gap-2 mt-4 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all transform active:scale-95"
                        >
                            <ArrowPathIcon className="h-5 w-5" />
                            Sincronizza Dati Cantiere
                        </button>
                    </div>
                )}

                <div className={fieldGroupStyle}>
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                        <DocumentCheckIcon className="h-5 w-5"/> Verifica Preliminare
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button type="button" onClick={handleControlloDocClick} disabled={isSaving || isGiaInviata || hasEsitoFinale} className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            Controllo Documentale e Scadenze
                        </button>
                        {isScaduta && offerta?.logProroghe?.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200 w-full sm:w-auto"><ExclamationTriangleIcon className="h-5 w-5" /><span className="font-medium">Gara scaduta ma con proroga.</span></div>
                        )}
                        {isGiaInviata && !hasEsitoFinale && (
                            <div className="flex items-center gap-2 text-sm text-sky-700 bg-sky-50 px-4 py-2 rounded-lg border border-sky-200 w-full sm:w-auto"><CheckBadgeIcon className="h-5 w-5" /><span className="font-bold">Inviata al cliente. In attesa di esito.</span></div>
                        )}
                        {hasEsitoFinale && !mostraRecuperoCantiere && !isConvertitaConCantiere && (
                            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 w-full sm:w-auto"><CheckCircleIcon className="h-5 w-5" /><span className="font-bold uppercase">Trattativa conclusa ({offerta.stato.replace(/_/g, ' ')})</span></div>
                        )}
                    </div>
                </div>

                <div className={fieldGroupStyle}>
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                        <EnvelopeIcon className="h-5 w-5"/> Preparazione all'Invio
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isInvioPiattaformaChecked ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'} ${(isSaving || isGiaInviata || isInvioMailChecked || hasEsitoFinale) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input type="checkbox" id="invioPiattaforma" checked={isInvioPiattaformaChecked} onChange={handleInvioPiattaformaChange} className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:cursor-not-allowed" disabled={isSaving || isGiaInviata || isInvioMailChecked || hasEsitoFinale} />
                            <div><p className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><ComputerDesktopIcon className="h-4 w-4"/> Piattaforma Esterna</p><p className="text-xs text-slate-500 mt-1">Caricamento diretto su portali.</p></div>
                        </label>
                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isInvioMailChecked ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'} ${(isSaving || isGiaInviata || isInvioPiattaformaChecked || hasEsitoFinale) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input type="checkbox" id="invioMail" checked={isInvioMailChecked} onChange={handleInvioMailChange} className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:cursor-not-allowed" disabled={isSaving || isGiaInviata || isInvioPiattaformaChecked || hasEsitoFinale} />
                            <div><p className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><EnvelopeIcon className="h-4 w-4"/> Invio Email Automatico</p><p className="text-xs text-slate-500 mt-1">Prepara una bozza email con allegati.</p></div>
                        </label>
                    </div>

                    {isInvioMailChecked && !isGiaInviata && !hasEsitoFinale && (
                        <div className="mt-6 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelStyle}>Destinatario (Opzionale)</label>
                                    <input type="email" placeholder="email@cliente.it" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className={inputStyle} disabled={isSaving} />
                                </div>
                                <div>
                                    <label className={labelStyle}>Oggetto</label>
                                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className={inputStyle} disabled={isSaving} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className={labelStyle}>Documenti Inclusi</p>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 min-h-[100px]">
                                        {documentiStatus.length > 0 ? (
                                            <ul className="space-y-1 text-sm font-medium">
                                                {documentiStatus.map(doc => <li key={doc.id} className={`flex items-center gap-2 ${doc.status === 'found' ? 'text-emerald-600' : 'text-red-500'}`}>{doc.status === 'found' ? <CheckCircleIcon className="h-4 w-4"/> : <XCircleIcon className="h-4 w-4"/>}{doc.label}</li>)}
                                            </ul>
                                        ) : <p className="text-xs text-slate-400 italic">Nessun doc verificato.</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelStyle}>File Aggiuntivi Manuali</label>
                                    <FileUploadZone onFilesSelected={setAdditionalFiles} isUploading={isSaving} />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-indigo-100">
                                <button 
                                    type="button" 
                                    onClick={handlePrepareDraftClick} 
                                    disabled={isSaving || !emailSubject} 
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Attendere...' : 'Genera Bozza e Invia'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {isGiaInviata && !hasEsitoFinale && (
                    <div className="bg-slate-800 p-8 rounded-3xl shadow-xl space-y-6 text-center animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-sky-500 to-red-500"></div>
                        
                        <div>
                            <h3 className="text-2xl font-black text-white mb-2">Qual è l'esito della trattativa?</h3>
                            <p className="text-slate-300 text-sm">Il cliente ha risposto? Registra la decisione finale.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                            {!acceptStep ? (
                                <>
                                    <button type="button" onClick={() => setAcceptStep(true)} disabled={isSaving} className="flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-1">
                                        <CheckCircleIcon className="h-6 w-6" /> OFFERTA ACCETTATA
                                    </button>
                                    <button type="button" onClick={() => onRifiutaOfferta(offerta.id)} disabled={isSaving} className="flex items-center justify-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-1">
                                        <XCircleIcon className="h-6 w-6" /> OFFERTA RIFIUTATA
                                    </button>
                                </>
                            ) : (
                                <div className="w-full bg-slate-900 p-6 rounded-2xl border border-slate-700 animate-fade-in text-left shadow-inner">
                                    <h4 className="text-emerald-400 font-black text-lg mb-6 flex items-center gap-2">
                                        <CheckCircleIcon className="h-6 w-6" /> Conferma Chiusura Positiva
                                    </h4>
                                    
                                    {!isEditingValue ? (
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Valore di Chiusura Previsto</p>
                                                <p className="text-3xl font-black text-white">{valoreCalcolato.toLocaleString('it-IT', {minimumFractionDigits:2})} €</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                                <button type="button" onClick={() => setAcceptStep(false)} className="px-5 py-3.5 text-slate-400 hover:text-white rounded-xl font-bold text-sm transition-colors">
                                                    Annulla
                                                </button>
                                                <button type="button" onClick={() => setIsEditingValue(true)} className="px-5 py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors flex-1 md:flex-none border border-slate-600">
                                                    Rinegoziata? Modifica
                                                </button>
                                                <button type="button" onClick={() => onAccettaOfferta(offerta.id, valoreCalcolato)} className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-sm transition-colors shadow-lg shadow-emerald-500/20 flex-1 md:flex-none">
                                                    Salva e Conferma
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-800 p-5 rounded-xl border border-slate-600">
                                            <div className="w-full md:w-1/2">
                                                <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 block">Nuovo Valore Finale Concordato (€)</label>
                                                <input 
                                                    type="number" value={valoreFinale} onChange={(e) => setValoreFinale(e.target.value)} 
                                                    className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-lg"
                                                    step="0.01" min="0"
                                                />
                                            </div>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button type="button" onClick={() => setIsEditingValue(false)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors flex-1 md:flex-none">
                                                    Indietro
                                                </button>
                                                <button type="button" onClick={() => onAccettaOfferta(offerta.id, valoreFinale)} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-sm transition-colors shadow-lg shadow-emerald-500/20 flex-1 md:flex-none">
                                                    Salva e Conferma
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                 
                <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    {onGoBack && !hasEsitoFinale && (
                        <button type="button" onClick={onGoBack} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
                            <ArrowLeftIcon className="h-5 w-5" /> Torna ad Elaborazione
                        </button>
                    )}
                    {offerta.stato !== 'archiviata' && !hasEsitoFinale && (
                        <button type="button" onClick={() => onArchivia(offerta.id)} disabled={isSaving} className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 w-full md:w-auto transition-colors disabled:opacity-50">
                            <ArchiveBoxXMarkIcon className="h-4 w-4" /> {isSaving ? 'Archiviazione...' : 'Archivia per Annullamento'}
                        </button>
                    )}
                </div>
            </div>
            <ControlloDocumentaleModal isOpen={isControlloDocOpen} onClose={handleCloseControlloDoc} documentiStatus={documentiStatus} />
            <ScadenzaAlertModal isOpen={isScadenzaAlertOpen} onProrogaConfirm={handleProrogaConfirm} onArchiviaConfirm={handleArchiviaConfirm} />
            <ConfermaInvioModal isOpen={isConfermaInvioOpen} onConfirmYes={handleConfermaInvioYes} onConfirmNo={handleConfermaInvioNo} />
        </>
    );
};