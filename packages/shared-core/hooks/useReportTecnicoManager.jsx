// File: packages/shared-core/hooks/useReportTecnicoManager.jsx

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Hook di sola scrittura (Action Hook) per i Report Tecnici compilati.
 */
export const useReportTecnicoManager = (db, user, userAziendaId) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Salva un nuovo report tecnico compilato nel database.
     * @param {object} formData - Dati del modulo compilato.
     * @param {string} cantiereId - ID del cantiere selezionato.
     * @param {string} formId - ID del modulo (template) usato.
     * @returns {{success: boolean, message: string}} Esito dell'operazione.
     */
    const saveReportTecnico = async (formData, cantiereId, formId) => {
        setIsSaving(true);
        setError(null);
        try {
            if (!db || !user || !user.uid || !userAziendaId) {
                throw new Error("Connessione non pronta, utente non valido o ID azienda mancante.");
            }

            // Prepara l'oggetto dati come richiesto
            const reportData = {
                ...formData, // Dati dinamici dal modulo
                cantiereId: cantiereId,
                formId: formId,
                userId: user.uid,
                companyID: userAziendaId,
                createdAt: serverTimestamp() // Timestamp di Firestore
            };

            // Salva nella collezione 'reportTecnici'
            await addDoc(collection(db, 'reportTecnici'), reportData);
            
            setIsSaving(false);
            return { success: true, message: 'Report tecnico salvato con successo!' };

        } catch (err) {
            console.error("Errore nel salvataggio del report tecnico:", err);
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        } finally {
            setIsSaving(false);
        }
    };

    return { saveReportTecnico, isSaving, error };
};