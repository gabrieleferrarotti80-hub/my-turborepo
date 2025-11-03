// packages/shared-ui/forms/components/GaraPrivataFields.jsx
import React from 'react';
import { CalendarDaysIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { DocumentiChecklist } from '../components/DocumentiChecklist';
import { FileUploadZone } from '../components/FileUploadZone';

// Stili (puoi mantenerli o importarli)
const fieldGroupStyle = "mb-6 border border-gray-200 p-4 rounded-lg shadow-sm";
const labelStyle = "block text-sm font-semibold text-gray-800 mb-2";
const selectStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const inputStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const buttonStyle = "mt-4 w-full flex justify-center items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"; // Stile bottone

export const GaraPrivataFields = ({
    formData,
    setFormData,
    datiAnalisi,
    personnel = [],
    isSaving,
    isAltriChecked,
    canCreaAppuntamento, 
    handleChange, 
    handleSopralluogoChange,
    handleAltriDocumentiChange,
    handleCreaAppuntamentoClick,
    availableForms = [], // La prop che ci interessa
}) => {
    
    // ✅ POSIZIONE CORRETTA: Prima di qualsiasi altra logica o calcolo del componente.
    console.log('[GARA FIELDS] Available Forms ricevuti:', availableForms.length, availableForms[0]?.nome); 

    // Calcola se il bottone "Crea Appuntamento" deve essere abilitato
    // Ora include il controllo su formTemplateId
const isCreaAppuntamentoEnabled = !!(
        formData.sopralluogo.necessario &&
        formData.sopralluogo.personaleId &&
        formData.sopralluogo.data &&
        // --- ✅ CORREZIONE QUI ---
        formData.sopralluogo.formTemplateSopralluogoId 
        // --- FINE CORREZIONE ---
    );

    return (
        <>
            {/* Documenti da Produrre */}
            <div className={fieldGroupStyle}>
                <h3 className={labelStyle}>Documenti da Produrre</h3>
                <DocumentiChecklist
                    items={formData.documentiRichiesti}
                    setItems={(newItems) => setFormData(prev => ({...prev, documentiRichiesti: newItems}))}
                />
                {isAltriChecked && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Specificare altri documenti (max 5):</h4>
                        {(formData.altriDocumentiCustom || []).map((doc, index) => (
                            <input
                                key={index} type="text" placeholder={`Documento opzionale ${index + 1}`}
                                value={doc} onChange={(e) => handleAltriDocumentiChange(index, e.target.value)}
                                className={`${inputStyle} mt-1 text-sm`} disabled={isSaving}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Documenti di Gara (categorizzati) */}
            <div className={fieldGroupStyle}>
                <h3 className={labelStyle}>Documenti di Gara</h3>
                <div className="space-y-4">
                    {/* FileUploadZone Generali */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Documenti Generali</label>
                        <FileUploadZone
                            onFilesSelected={(files) => setFormData(prev => ({...prev, docGaraGeneraliFiles: files}))}
                            savedFiles={datiAnalisi?.docGaraGenerali}
                            isUploading={isSaving}
                        />
                        {formData.docGaraGeneraliFiles?.length > 0 && (
                            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                {formData.docGaraGeneraliFiles.map(file => ( <li key={file.name} className="flex items-center gap-1"><PaperClipIcon className="h-4 w-4 text-gray-400" />{file.name}</li> ))}
                            </ul>
                        )}
                    </div>
                     {/* FileUploadZone Economici */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Documenti Economici</label>
                        <FileUploadZone
                            onFilesSelected={(files) => setFormData(prev => ({...prev, docGaraEconomiciFiles: files}))}
                            savedFiles={datiAnalisi?.docGaraEconomici}
                            isUploading={isSaving}
                        />
                        {formData.docGaraEconomiciFiles?.length > 0 && (
                            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                {formData.docGaraEconomiciFiles.map(file => ( <li key={file.name} className="flex items-center gap-1"><PaperClipIcon className="h-4 w-4 text-gray-400" />{file.name}</li> ))}
                            </ul>
                        )}
                    </div>
                    {/* FileUploadZone Tecnici */}
                     <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Documenti Tecnici</label>
                        <FileUploadZone
                            onFilesSelected={(files) => setFormData(prev => ({...prev, docGaraTecniciFiles: files}))}
                            savedFiles={datiAnalisi?.docGaraTecnici}
                            isUploading={isSaving}
                        />
                        {formData.docGaraTecniciFiles?.length > 0 && (
                            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                {formData.docGaraTecniciFiles.map(file => ( <li key={file.name} className="flex items-center gap-1"><PaperClipIcon className="h-4 w-4 text-gray-400" />{file.name}</li> ))}
                            </ul>
                        )}
                    </div>
                    {/* FileUploadZone CME */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">CME (Computo Metrico Estimativo)</label>
                        <FileUploadZone
                            onFilesSelected={(files) => setFormData(prev => ({...prev, docCMEFiles: files}))}
                            savedFiles={datiAnalisi?.docCME}
                            isUploading={isSaving}
                        />
                        {formData.docCMEFiles?.length > 0 && (
                            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                {formData.docCMEFiles.map(file => ( <li key={file.name} className="flex items-center gap-1"><PaperClipIcon className="h-4 w-4 text-gray-400" />{file.name}</li> ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Sopralluogo */}
            <div className={fieldGroupStyle}>
                <h3 className={labelStyle}>Sopralluogo</h3>
                {/* Radio Necessario */}
                 <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2">
                        <input type="radio" name="sopralluogoNecessario" checked={!formData.sopralluogo.necessario} onChange={() => handleSopralluogoChange('necessario', false)} disabled={isSaving}/> No
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="sopralluogoNecessario" checked={formData.sopralluogo.necessario} onChange={() => handleSopralluogoChange('necessario', true)} disabled={isSaving}/> Sì
                    </label>
                </div>

                {/* Campi aggiuntivi se necessario */}
                {formData.sopralluogo.necessario && (
                    <div className="mt-4 space-y-3 animate-fade-in">
                        {/* Select Personale */}
                    <div>
                        <label htmlFor="personaleIdSopralluogo" className="block text-sm font-medium text-gray-700 mb-1">Assegna a:</label>
                        <select 
                            id="personaleIdSopralluogo" 
                            value={formData.sopralluogo.personaleId || ''} 
                            // --- ✅ ASSICURATI CHE SIA ESATTAMENTE COSÌ ---
                            onChange={e => handleSopralluogoChange('personaleId', e.target.value)} 
                            // --- FINE CORREZIONE ---
                            className={selectStyle} disabled={isSaving} required
                        >
                                <option value="">-- Seleziona Personale --</option>
                                {(personnel || []).map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                            </select>
                        </div>
                        {/* Input Indirizzo */}
                         <div>
                             <label htmlFor="indirizzoSopralluogo" className="block text-sm font-medium text-gray-700 mb-1">Indirizzo:</label>
                             <input
                                id="indirizzoSopralluogo" type="text" placeholder="Indirizzo Sopralluogo..."
                                value={formData.sopralluogo.indirizzo || ''} // Aggiunto fallback ''
                                // --- ✅ CORREZIONE QUI ---
                                onChange={e => handleSopralluogoChange('indirizzo', e.target.value)}
                                // --- FINE CORREZIONE ---
                                className={inputStyle} disabled={isSaving}
                            />
                         </div>
                        {/* Input Data */}
                        <div>
                             <label htmlFor="dataSopralluogo" className="block text-sm font-medium text-gray-700 mb-1">Data e Ora:</label>
                             <input
                                id="dataSopralluogo" type="datetime-local"
                                value={formData.sopralluogo.data || ''} // Aggiunto fallback ''
                                // --- ✅ CORREZIONE QUI ---
                                onChange={e => handleSopralluogoChange('data', e.target.value)}
                                // --- FINE CORREZIONE ---
                                className={inputStyle} disabled={isSaving} required
                            />
                        </div>

                        {/* ✅ --- MENU A TENDINA TEMPLATE AGGIUNTO --- */}
                       <div>
                            <label htmlFor="formTemplateIdSopralluogo" /* ... */>
                                Template Report da Usare:
                            </label>
                            <select
                                id="formTemplateIdSopralluogo"
                                value={formData.sopralluogo.formTemplateSopralluogoId || ''}
                                // --- ✅ CORREZIONE QUI: Passa la chiave corretta ---
                                onChange={e => handleSopralluogoChange('formTemplateSopralluogoId', e.target.value)}
                                // --- FINE CORREZIONE ---
                                className={selectStyle}
                                disabled={isSaving}
                                required
                            >
                                <option value="">-- Seleziona Template Report --</option>
                                {/* Mappa sull'array 'availableForms' ricevuto come prop */}
                                {(availableForms || []).map(formTemplate => (
                                    // Assumiamo che ogni template abbia 'id' e 'nome'
                                    <option key={formTemplate.id} value={formTemplate.id}>
                                        {formTemplate.nome || formTemplate.id} {/* Mostra il nome o l'ID */}
                                    </option>
                                ))}
                                {/* Aggiungi opzione se l'array è vuoto o non caricato */}
                                {(!availableForms || availableForms.length === 0) && (
                                    <option disabled>Nessun template form trovato.</option>
                                )}
                            </select>
                        </div>
                        {/* ✅ --- FINE MENU A TENDINA --- */}

                        {/* Bottone Crea Appuntamento */}
                        <button
                            type="button"
                            onClick={handleCreaAppuntamentoClick}
                            // ✅ Usa la variabile calcolata per abilitare/disabilitare
                            disabled={!isCreaAppuntamentoEnabled || isSaving}
                            className={`${buttonStyle} ${isCreaAppuntamentoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            <CalendarDaysIcon className="h-5 w-5" />
                            {isSaving ? 'Creazione...' : 'Crea Appuntamento in Agenda'}
                        </button>
                        {/* Messaggio se bottone disabilitato */}
                        {!isCreaAppuntamentoEnabled && !isSaving && (
                             <p className="text-xs text-center text-gray-500 mt-1">Seleziona personale, data/ora e template report per creare l'appuntamento.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Dettagli Economici e Scadenze */}
            <div className={fieldGroupStyle}>
                 <h3 className={labelStyle}>Dettagli Economici e Scadenze</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="valoreEconomico" className="block text-sm font-medium text-gray-700 mb-1">Valore Economico (€):</label>
                        <input id="valoreEconomico" type="number" name="valoreEconomico" placeholder="Valore Lordo (€)" value={formData.valoreEconomico} onChange={handleChange} className={inputStyle} disabled={isSaving} step="0.01"/>
                    </div>
                    <div>
                        <label htmlFor="scadenzaGara" className="block text-sm font-medium text-gray-700 mb-1">Scadenza Gara:</label>
                        <input id="scadenzaGara" type="datetime-local" name="scadenza" title="Scadenza Gara" value={formData.scadenza} onChange={handleChange} className={inputStyle} disabled={isSaving}/>
                    </div>
                 </div>
            </div>

            {/* Manifestazione di Interesse */}
             <div className="flex items-center gap-3 mt-4">
                 <input type="checkbox" id="manifestazioneInteresse" name="manifestazioneInteresse" checked={formData.manifestazioneInteresse} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" disabled={isSaving}/>
                 <label htmlFor="manifestazioneInteresse" className="text-sm font-medium text-gray-800">Richiede Manifestazione di Interesse</label>
             </div>
        </>
    );
};