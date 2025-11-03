import React from 'react';
// ✅ Importa useFirebaseData per leggere i forms disponibili
import { useFirebaseData, useAnalisiFormLogic } from 'shared-core';
import { ReferenteModal } from '../components/ReferenteModal';
import { GaraPrivataFields } from '../components/GaraPrivataFields';

// Stili
const fieldGroupStyle = "mb-6 border border-gray-200 p-4 rounded-lg shadow-sm";
const labelStyle = "block text-sm font-semibold text-gray-800 mb-2";
const selectStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";

export const AnalisiPreliminareForm = ({
    datiIniziali = {},
    clienteSelezionato,
    personnel = [],
    onSubmit,
    onAddReferente,
    isSaving = false,
    onCreaAppuntamento,
    // ✅ 1. RICEVI LA PROP availableForms (verrà passata da OffertaWorkspaceView)
    availableForms = [], // Aggiunto valore di default per sicurezza
}) => {

    // Hook logico (invariato)
    const {
        formData, setFormData,
        datiAnalisi, // Dati letti dall'offerta esistente
        isReferenteModalOpen, setIsReferenteModalOpen,
        handleSubmit, handleChange,
        handleSopralluogoChange, handleAltriDocumentiChange,
        handleCreaAppuntamentoClick,
        canCreaAppuntamento, isAltriChecked
    } = useAnalisiFormLogic(datiIniziali, onSubmit, onCreaAppuntamento);

    return (
        <>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Dati Analisi Preliminare</h2>

                {/* Cliente */}
                <div className={fieldGroupStyle}>
                    <label className={labelStyle}>Cliente</label>
                    <div className="p-3 border rounded-md bg-gray-100 text-gray-800 font-medium">
                        {clienteSelezionato ? (clienteSelezionato.ragioneSociale || `${clienteSelezionato.nome} ${clienteSelezionato.cognome}`) : 'Caricamento...'}
                    </div>
                    {clienteSelezionato && (
                        <div className="mt-4">
                            <label className={labelStyle}>Referente Selezionato</label>
                            <div className="p-3 border rounded-md bg-gray-50 flex justify-between items-center">
                                <span>{formData.referente ? `${formData.referente.nome} ${formData.referente.cognome}` : 'Nessuno'}</span>
                                <button type="button" onClick={() => setIsReferenteModalOpen(true)} className="text-indigo-600 hover:underline text-sm font-semibold" disabled={isSaving}>
                                    Gestisci
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tipologia Offerta */}
                <div className={fieldGroupStyle}>
                    <label htmlFor="tipoGara" className={labelStyle}>Tipologia Offerta</label>
                    <select id="tipoGara" name="tipoGara" onChange={handleChange} value={formData.tipoGara} disabled={isSaving} required className={selectStyle}>
                        <option value="">Seleziona...</option>
                        <option value="Gara Privata">Gara Privata</option>
                        <option value="Gara Pubblica">Gara Pubblica</option>
                        <option value="Preventivo Privati">Preventivo Privati</option>
                        <option value="Nuovo sublavoro">Nuovo sublavoro</option>
                    </select>
                    <label htmlFor="tipologiaLavoro" className={`${labelStyle} mt-4`}>Tipologia di Lavoro</label>
                    <select
                        id="tipologiaLavoro" name="tipologiaLavoro" value={formData.tipologiaLavoro}
                        onChange={handleChange} disabled={isSaving} required className={selectStyle}
                    >
                        <option value="">Seleziona il tipo di lavoro...</option>
                        <option value="manutenzione_verde">Manutenzione del Verde</option>
                        <option value="urbanizzazione">Urbanizzazione</option>
                        <option value="edilizia">Edilizia</option>
                        <option value="potature">Potature</option>
                    </select>
                </div>

                {/* Render Condizionale Gara Privata */}
                {formData.tipoGara === 'Gara Privata' && (
                    <GaraPrivataFields
                        formData={formData}
                        setFormData={setFormData}
                        datiAnalisi={datiAnalisi}
                        personnel={personnel}
                        isSaving={isSaving}
                        isAltriChecked={isAltriChecked}
                        canCreaAppuntamento={canCreaAppuntamento}
                        // Non passiamo più handleChange qui, GaraPrivataFields usa i suoi handler specifici
                        handleChange={handleChange}
                        handleSopralluogoChange={handleSopralluogoChange}
                        handleAltriDocumentiChange={handleAltriDocumentiChange}
                        handleCreaAppuntamentoClick={handleCreaAppuntamentoClick}
                        // ✅ 2. PASSA availableForms a GaraPrivataFields
                        availableForms={availableForms}
                    />
                )}

                {/* Pulsante Salva */}
                <div className="flex justify-end mt-8 border-t pt-6">
                    <button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isSaving ? 'Salvataggio in corso...' : 'Salva Dati Analisi'}
                    </button>
                </div>
            </form>

            {/* Modal Referente */}
            <ReferenteModal
                isOpen={isReferenteModalOpen}
                onClose={() => setIsReferenteModalOpen(false)}
                cliente={clienteSelezionato}
                onSelectReferente={(ref) => setFormData(prev => ({...prev, referente: ref}))}
                onAddReferente={(data) => {
                    if (clienteSelezionato) {
                        onAddReferente(clienteSelezionato.id, data);
                    }
                }}
            />
        </>
    );
};