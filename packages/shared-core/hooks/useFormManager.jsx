import { useState } from 'react';
// ✅ AGGIUNTO: Import delle funzioni necessarie per la lettura
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export const useFormManager = (db) => {
    // ⚠️ MODIFICATO: Lo stato è ora più generico per essere usato da più funzioni
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const addFormTemplate = async (templateData, userAziendaId) => {
        setIsLoading(true);
        setError(null);

        if (!templateData.title.trim() || templateData.sections.length === 0) {
            setError('Titolo e almeno una sezione sono obbligatori.');
            setIsLoading(false);
            return { success: false, message: 'Dati incompleti.' };
        }

        if (!userAziendaId) {
            setError('ID Azienda non fornito.');
            setIsLoading(false);
            return { success: false, message: 'ID Azienda mancante.' };
        }

        try {
            const dataToSave = {
                ...templateData,
                aziendaId: userAziendaId,
                dataCreazione: serverTimestamp()
            };
            // ⚠️ CORRETTO: Usa la collezione 'forms' per coerenza
            await addDoc(collection(db, 'forms'), dataToSave);
            return { success: true, message: 'Modello salvato con successo!' };
        } catch (err) {
            console.error("Errore nel salvataggio del modello:", err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * ✅ AGGIUNTO: Funzione per recuperare la struttura di un singolo form.
     * @param {string} formId - L'ID del form da recuperare.
     * @returns {Promise<{success: boolean, data?: object, message?: string}>} Esito dell'operazione.
     */
    const getFormStructure = async (formId) => {
        setIsLoading(true);
        setError(null);
        try {
            const formDocRef = doc(db, 'forms', formId);
            const formDocSnap = await getDoc(formDocRef);

            if (formDocSnap.exists()) {
                return { success: true, data: formDocSnap.data() };
            } else {
                return { success: false, message: 'Modulo non trovato.' };
            }
        } catch (err) {
            console.error("Errore nel recupero della struttura del form:", err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ AGGIORNATO: L'hook ora esporta anche la nuova funzione di lettura.
    return { addFormTemplate, getFormStructure, isLoading, error };
};