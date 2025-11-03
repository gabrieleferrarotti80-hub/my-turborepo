// packages/shared-core/hooks/useRapportiniManager.jsx

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// Rimossi gli import di storage perché non sono usati in questa versione.

/**
 * ✅ REFACTORED: Hook di sola scrittura (Action Hook) per i rapportini.
 * La logica di caricamento dei template è stata spostata nel FirebaseContext.
 */
// ✅ MODIFICA: Aggiunto 'user' come parametro, per coerenza con gli altri manager hook.
export const useRapportiniManager = (db, user, userAziendaId) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Salva un nuovo rapportino compilato nel database.
     * @param {object} rapportinoData - I dati del rapportino dal form.
     * @returns {{success: boolean, message: string}} Esito dell'operazione.
     */
    const saveRapportino = async (rapportinoData) => {
        setIsSaving(true);
        setError(null);
        try {
            // ✅ MODIFICA: Aggiunto controllo anche sull'utente.
            if (!db || !user || !userAziendaId) {
                throw new Error("Connessione non pronta, utente non valido o ID azienda mancante.");
            }

            await addDoc(collection(db, 'rapportiniCompilati'), {
                ...rapportinoData,
                companyID: userAziendaId,
                // ✅ MODIFICA: Aggiunto l'ID dell'utente che ha creato il rapportino.
                userId: user.uid, 
                dataCreazione: serverTimestamp()
            });
            return { success: true, message: 'Rapportino salvato con successo!' };
        } catch (err) {
            console.error("Errore nel salvataggio del rapportino:", err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsSaving(false);
        }
    };

    return { saveRapportino, isSaving, error };
};