// File: packages/shared-core/hooks/usePresenzeManager.jsx

import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Funzione helper per convertire date (da un input) in Timestamp
const toTimestamp = (dateString) => {
    return Timestamp.fromDate(new Date(dateString));
};

export const usePresenzeManager = (db, user, userAziendaId) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const UID = user?.uid;

    // Funzione generica per creare un nuovo stato
    const creaNuovoStato = async (stato, datiAggiuntivi = {}) => {
        setIsSaving(true);
        setError(null);
        if (!UID || !userAziendaId) {
            console.error("--- 🕵️ DEBUG HOOK ---", { UID, userAziendaId }); // Log di errore
            setError(new Error("Utente non valido"));
            setIsSaving(false);
            return { success: false, message: "Utente non valido" };
        }

        try {
            await addDoc(collection(db, 'presenze'), {
                userId: UID,
                companyID: userAziendaId,
                stato: stato,
               timestampInizio: Timestamp.now(),
                timestampFine: null,
                ...datiAggiuntivi
            });
            setIsSaving(false);
            return { success: true, message: `Stato "${stato}" registrato!` };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    // 1. INIZIA LAVORO
    const checkIn = async () => {
        return await creaNuovoStato('lavoro');
    };

    // 2. TERMINA LAVORO
    const checkOut = async (idStatoCorrente) => {
        setIsSaving(true);
        setError(null);
        try {
            const docRef = doc(db, 'presenze', idStatoCorrente);
            await updateDoc(docRef, {
                timestampFine: serverTimestamp()
            });
            setIsSaving(false);
            return { success: true, message: "Lavoro terminato!" };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    // 3. SEGNALA MALATTIA
    const segnalaMalattia = async (dataInizio, dataFine, note = '') => {
        return await creaNuovoStato('malattia', {
            timestampInizio: toTimestamp(dataInizio),
            dataFinePrevista: toTimestamp(dataFine),
            note: note
        });
    };

    // 4. SEGNALA INFORTUNIO
    const segnalaInfortunio = async (dataInizio, dataFine, note = '') => {
        return await creaNuovoStato('infortunio', {
            timestampInizio: toTimestamp(dataInizio),
            dataFinePrevista: toTimestamp(dataFine),
            note: note
        });
    };
    
    // 5. SEGNALA PIOGGIA
    const segnalaPioggia = async (note = '') => {
        return await creaNuovoStato('pioggia', {
            note: note,
            // (La pioggia potrebbe finire automaticamente a fine giornata)
        });
    };
    
    // 6. PROROGA ASSENZA
    const prorogaAssenza = async (idStatoCorrente, nuovaDataFine, note = '') => {
        setIsSaving(true);
        setError(null);
         try {
            const docRef = doc(db, 'presenze', idStatoCorrente);
            await updateDoc(docRef, {
                dataFinePrevista: toTimestamp(nuovaDataFine),
                note: note, // Sovrascrive o aggiunge nota
                prorogata: true
            });
            setIsSaving(false);
            return { success: true, message: "Assenza prorogata." };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };
// 7. SEGNALA ERRORE
const segnalaErrore = async (nota, dataRiferimento) => {
    setIsSaving(true);
    setError(null);
    if (!UID || !userAziendaId) {
        setError(new Error("Utente non valido"));
        setIsSaving(false);
        return { success: false, message: "Utente non valido" };
    }
    const dataRiferimentoTs = (dataRiferimento?.toDate) 
        ? dataRiferimento  // È già un Timestamp
        : Timestamp.fromDate(dataRiferimento || new Date()); // Converte da Date

    try {
        await addDoc(collection(db, 'segnalazioniErrori'), {
            userId: UID,
            companyID: userAziendaId,
            tipo: 'presenze',
            nota: nota,
            timestamp: serverTimestamp(), // Data di creazione (OGGI)
            dataRiferimento: dataRiferimentoTs, // ❗ 3. Data dell'errore (IERI)
            stato: 'da_gestire'
        });
        setIsSaving(false);
        return { success: true, message: "Segnalazione inviata!" };
    } catch (err) {
        setError(err);
        setIsSaving(false);
        return { success: false, message: err.message };
    }
};

return { 
    isSaving, 
    error,
    checkIn,
    checkOut,
    segnalaMalattia,
    segnalaInfortunio,
    segnalaPioggia,
    prorogaAssenza,
    segnalaErrore // <-- ❗ RITORNA LA NUOVA FUNZIONE
};
};