// File: packages/shared-core/hooks/usePresenzeAdminManager.js
import { useState } from 'react';
import { doc, writeBatch, collection, Timestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// Funzione helper per convertire la stringa del giorno in un oggetto Date
const parseDayString = (dayString, monthDate) => {
    const [year, month, day] = dayString.split('-').map(Number);
    // Creiamo una data all'inizio del giorno (nel fuso orario locale)
    return new Date(year, month - 1, day, 0, 0, 0);
};

// Funzione helper per creare il payload del documento
const createPayload = (userId, companyID, adminUserId, dayDate, newValue) => {
    const basePayload = {
        userId: userId,
        companyID: companyID,
        modifiedBy: adminUserId, // Audit: Chi ha fatto la modifica
        modifiedAt: Timestamp.now(), // Audit: Quando
        stato: 'lavoro', // Default
        timestampInizio: null,
        timestampFine: null,
        dataFinePrevista: null,
        note: 'Modifica manuale da gestionale'
    };

    const startOfDay = Timestamp.fromDate(dayDate);
    // Imposta la fine a 23:59:59 di quel giorno
    const endOfDay = new Date(dayDate.getTime());
    endOfDay.setHours(23, 59, 59);

    if (!isNaN(parseFloat(newValue))) {
        // È un numero (ore)
        basePayload.stato = 'lavoro';
        basePayload.timestampInizio = startOfDay;
        // Simula la fine aggiungendo le ore all'inizio
        const endDate = new Date(dayDate.getTime() + (parseFloat(newValue) * 3600 * 1000));
        basePayload.timestampFine = Timestamp.fromDate(endDate);
    } else if (newValue.toUpperCase() === 'M') {
        basePayload.stato = 'malattia';
        basePayload.timestampInizio = startOfDay;
        basePayload.dataFinePrevista = Timestamp.fromDate(endOfDay);
    } else if (newValue.toUpperCase() === 'I') {
        basePayload.stato = 'infortunio';
        basePayload.timestampInizio = startOfDay;
        basePayload.dataFinePrevista = Timestamp.fromDate(endOfDay);
    } else {
        // Altri casi (es. 'F' per Ferie)
        return null; 
    }
    return basePayload;
};


export const usePresenzeAdminManager = (db) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const saveGridChanges = async (changes, adminUserId, companyID, monthDate) => {
        setIsSaving(true);
        setError(null);
        
        // Usiamo un WriteBatch per eseguire tutte le modifiche in una sola transazione
        const batch = writeBatch(db);

        try {
            for (const change of changes) {
                const { userId, giornoString, newValue, originalDocId } = change;
                
                // Converte la stringa 'YYYY-MM-DD' in un oggetto Date per il giorno
                const dayDate = parseDayString(giornoString, monthDate);

                // 1. Caso: L'utente ha cancellato la cella (N/D) e c'era un documento
                if (newValue.toUpperCase() === 'N/D' || newValue === '') {
                    if (originalDocId) {
                        // Esisteva un documento, lo eliminiamo
                        const docRef = doc(db, 'presenze', originalDocId);
                        batch.delete(docRef);
                    }
                    // Se non c'era (era 'N/D' e rimane 'N/D'), non facciamo nulla.
                
                } else {
                    // 2. Caso: L'utente ha inserito un valore ('M', 'I', '8.0')
                    const payload = createPayload(userId, companyID, adminUserId, dayDate, newValue);
                    if (!payload) continue; // Valore non valido (es. "abc")

                    let docRef;
                    if (originalDocId) {
                        // C'era già un documento, lo sovrascriviamo (UPDATE)
                        docRef = doc(db, 'presenze', originalDocId);
                        batch.set(docRef, payload); // Usiamo SET per sovrascrivere completamente
                    } else {
                        // Non c'era un documento, ne creiamo uno nuovo (CREATE)
                        docRef = doc(collection(db, 'presenze'));
                        batch.set(docRef, payload);
                    }
                }
            }

            // Esegui tutte le operazioni in blocco
            await batch.commit();
            setIsSaving(false);
            return { success: true };

        } catch (err) {
            console.error("Errore durante il salvataggio delle modifiche:", err);
            setError(err.message);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    return { saveGridChanges, isSaving, error };
};