import React from 'react';
import { useElaborazioneFormLogic } from 'shared-core';
// ✅ CORREZIONE: Percorsi aggiornati assumendo che i componenti siano in ./components/
import { AnalisiCostiForm } from '../components/AnalisiCostiForm';
import { StatoDocumenti } from '../components/StatoDocumenti';
import { SopralluogoReportModal } from '../components/SopralluogoReportModal';
// ✅ Assumendo che FileUploadZone sia in ../components/ rispetto a /forms/
import { FileUploadZone } from '../components/FileUploadZone';
import { PaperClipIcon } from '@heroicons/react/24/outline';

// Stili
const fieldGroupStyle = "mb-6 border border-gray-200 p-4 rounded-lg shadow-sm";
const labelStyle = "block text-sm font-semibold text-gray-800 mb-2";
const inputStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const selectStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const buttonStyle = "px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed";

export const ElaborazioneForm = (props) => {

   // --- LOG 1: L'intero oggetto props ricevuto ---
    console.log("%c[ElaborazioneForm] <- Props ricevute (intero oggetto):", "color: green; font-weight: bold;", props);

    // --- LOG 2: Accesso DIRETTO alla prop PRIMA della destrutturazione ---
    console.log("%c[ElaborazioneForm] Accesso diretto a props.sopralluogoFormTemplate:", "color: orange; font-weight: bold;", props.sopralluogoFormTemplate);

    // Destruttura le props *dopo* averle loggate
    const {
        offerta,
        onSubmit,
        onApproveOffer,
        personnel = [],
        isSaving,
        companyId,
        currentUser,
        sopralluogoFormTemplate // La prop chiave
    } = props;
    // --- ✅ AGGIUNGI QUESTO LOG ---
    console.log("[ElaborazioneForm] Prop 'sopralluogoFormTemplate' ricevuta:", sopralluogoFormTemplate);
    // --- FINE LOG ---
    console.log('[ElaborazioneForm] Props ricevute:', { offerta });

    // ✅ CORREZIONE: Destrutturazione Completa
    const {
        formData, setFormData,
        handleSubmit, handleChange, // Handler principali
        valoreScontato, costiTotali, utilePrevisto, // Valori calcolati
        isAnalisiCostiOpen, setIsAnalisiCostiOpen,   // Stato e setter modal Costi
        isStatoDocumentiOpen, setIsStatoDocumentiOpen, // Stato e setter modal Documenti
        isSopralluogoOpen, setIsSopralluogoOpen,     // Stato e setter modal Sopralluogo
        handleAnalisiCostiSave, handleStatoDocumentiSave, handleSopralluogoSave, // Handler save modal
        handleApproveClick,     // Handler bottone Approva
        pendingFiles            // File in attesa di upload
    } = useElaborazioneFormLogic(offerta, onSubmit, onApproveOffer);

    // ✅ CORREZIONE: Assicura che valoreIniziale sia sempre un numero
    const valoreEconomicoRaw = offerta?.datiAnalisi?.valoreEconomico;
    const valoreIniziale = typeof valoreEconomicoRaw === 'string'
        ? parseFloat(valoreEconomicoRaw) || 0
        : valoreEconomicoRaw || 0;

    // Variabili sicure
    const datiSopralluogoOriginali = offerta?.datiSopralluogoReport || {};
    const documentiRichiestiOriginali = offerta?.datiAnalisi?.documentiRichiesti || [];
    const cmeOriginalUrl = offerta?.datiAnalisi?.docCME?.[0]?.url;

    // Logica bottone Approva
    const showApproveButton =
        offerta?.stato === 'in_approvazione' &&
        currentUser &&
        (currentUser.role === 'titolare-azienda' || currentUser.uid === formData.utenteApprovazioneId);

    // Testo bottone Salva
    const submitButtonText = formData.approvazioneNecessaria
        ? 'Salva e Invia per Approvazione'
        : 'Salva Elaborazione';

    // Submit handler che passa formData e pendingFiles
    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleSubmit(formData, pendingFiles); // handleSubmit è quello destrutturato dall'hook
    };

    console.log('[ElaborazioneForm] Valore Iniziale Calcolato (come numero):', valoreIniziale);

    return (
        <>
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Elaborazione Offerta</h2>

                {/* --- SEZIONE RIEPILOGO FINANZIARIO --- */}
                <div className={fieldGroupStyle}>
                    <h3 className={labelStyle}>Riepilogo Finanziario</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <label className="text-sm text-gray-600">Valore Iniziale</label>
                            {/* Ora valoreIniziale è garantito essere un numero */}
                            <p className="text-lg font-bold">{valoreIniziale.toFixed(2)} €</p>
                        </div>
                        <div>
                            <label htmlFor="scontoProposto" className="text-sm text-gray-600">Sconto Proposto (%)</label>
                            <input
                                type="number" id="scontoProposto" name="scontoProposto"
                                value={formData.scontoProposto} onChange={handleChange}
                                className={inputStyle} disabled={isSaving} step="0.01" min="0" max="100"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Costi Totali (da Analisi)</label>
                            <p className="text-lg font-bold text-red-600">{costiTotali.toFixed(2)} €</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Utile Previsto</label>
                            <p className={`text-lg font-bold ${utilePrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {utilePrevisto.toFixed(2)} €
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- SEZIONE PULSANTI AZIONE --- */}
                <div className={fieldGroupStyle}>
                    <h3 className={labelStyle}>Azioni e Documenti</h3>
                    <div className="flex flex-wrap gap-4">
                        <button type="button" onClick={() => setIsSopralluogoOpen(true)} className={buttonStyle} disabled={!offerta || isSaving}>
                            Report di Sopralluogo
                        </button>
                        <a href={cmeOriginalUrl} target="_blank" rel="noopener noreferrer"
                           className={`${buttonStyle} ${!cmeOriginalUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                           aria-disabled={!cmeOriginalUrl} onClick={(e) => !cmeOriginalUrl && e.preventDefault()}>
                            Visualizza CME Analisi
                        </a>
                        <button type="button" onClick={() => setIsAnalisiCostiOpen(true)} className={buttonStyle} disabled={!offerta || isSaving}>
                            Analisi dei Costi
                        </button>
                        <button type="button" onClick={() => setIsStatoDocumentiOpen(true)} className={buttonStyle} disabled={!offerta || isSaving}>
                            Stato Documenti
                        </button>
                    </div>
                </div>

                {/* --- SEZIONE CME COMPILATO E TEMPISTICHE --- */}
                <div className={fieldGroupStyle}>
                    <h3 className={labelStyle}>Dettagli Esecutivi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Carica CME Compilato</label>
                            <FileUploadZone
                                onFilesSelected={(files) => setFormData(prev => ({...prev, docCMECompilatoFiles: files}))}
                                // savedFiles={formData.datiElaborazione?.docCMECompilato} // TODO: Implementare visualizzazione file salvati
                                isUploading={isSaving}
                            />
                            {formData.docCMECompilatoFiles && formData.docCMECompilatoFiles.length > 0 && (
                                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                    {formData.docCMECompilatoFiles.map(f => (
                                     <li key={f.name} className="flex items-center gap-1">
                                        <PaperClipIcon className="h-4 w-4 text-gray-400" /> {f.name}
                                    </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label htmlFor="tempistichePreviste" className="block text-sm font-medium text-gray-700 mb-1">Tempistiche Previste</label>
                            <input
                                type="text" id="tempistichePreviste" name="tempistichePreviste"
                                placeholder="Es. 3 settimane lavorative"
                                value={formData.tempistichePreviste} onChange={handleChange}
                                className={inputStyle} disabled={isSaving}
                            />
                        </div>
                    </div>
                </div>

                {/* --- SEZIONE APPROVAZIONE --- */}
                <div className={fieldGroupStyle}>
                    <h3 className={labelStyle}>Approvazione</h3>
                    <div className="flex items-center gap-3 mb-4">
                        <input
                            type="checkbox" id="approvazioneNecessaria" name="approvazioneNecessaria"
                            checked={formData.approvazioneNecessaria} onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" disabled={isSaving}
                        />
                        <label htmlFor="approvazioneNecessaria" className="text-sm font-medium text-gray-800">Richiede Approvazione</label>
                    </div>
                    {formData.approvazioneNecessaria && (
                        <div className="animate-fade-in">
                            <label htmlFor="utenteApprovazioneId" className="block text-sm font-medium text-gray-700 mb-1">Seleziona Utente per Approvazione</label>
                            <select
                                id="utenteApprovazioneId" name="utenteApprovazioneId"
                                value={formData.utenteApprovazioneId} onChange={handleChange}
                                className={selectStyle} disabled={isSaving} required
                            >
                                <option value="">-- Seleziona Utente --</option>
                                {personnel.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome} {p.cognome} ({p.ruolo || 'N/D'})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* --- Pulsanti Azione (Salva / Approva) --- */}
                <div className="flex justify-end items-center gap-4 mt-8 border-t pt-6">
                    {showApproveButton && (
                         <button
                            type="button"
                            onClick={handleApproveClick} // Chiama l'handler dall'hook
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md disabled:opacity-50"
                            disabled={isSaving}
                        >
                            Approva Offerta
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSaving || (formData.approvazioneNecessaria && !formData.utenteApprovazioneId)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Salvataggio...' : submitButtonText}
                    </button>
                </div>

                {/* DEBUG */}
                 <pre className="mt-4 p-2 bg-gray-100 text-xs overflow-auto">
                    {JSON.stringify({formData, pendingFiles}, null, 2)}
                </pre>

            </form>

            {/* --- I MODAL --- */}
            <SopralluogoReportModal
                isOpen={isSopralluogoOpen}
                onClose={() => setIsSopralluogoOpen(false)}
                onSave={handleSopralluogoSave}
                datiReport={datiSopralluogoOriginali}
                formTemplate={sopralluogoFormTemplate}
            />
            <AnalisiCostiForm
                isOpen={isAnalisiCostiOpen}
                onClose={() => setIsAnalisiCostiOpen(false)}
                onSave={handleAnalisiCostiSave}
                initialValues={formData.costiAnalisi}
            />
            <StatoDocumenti
                isOpen={isStatoDocumentiOpen}
                onClose={() => setIsStatoDocumentiOpen(false)}
                onSave={handleStatoDocumentiSave}
                documentiRichiesti={documentiRichiestiOriginali}
                companyId={companyId}
            />
        </>
    );
};