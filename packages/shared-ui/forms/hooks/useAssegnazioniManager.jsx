// packages/shared-core/hooks/useAssegnazioniManager.jsx

import { doc, updateDoc, runTransaction, arrayUnion, Timestamp } from 'firebase/firestore';

// ✅ Hook aggiornato, ora solo per le AZIONI dell'utente finale.
export const useAssegnazioniManager = (db, user) => {

    // ❌ RIMOSSO: La funzione 'fetchUserAssignments' è stata rimossa. 
    // I dati ora provengono da useFirebaseData().userAssegnazioni.

    // L'utente conferma di aver ricevuto l'attrezzatura
    const confermaPresaInCarico = async (assegnazioneId) => {
        const assegnazioneRef = doc(db, 'assegnazioniMagazzino', assegnazioneId);
        const evento = { 
            timestamp: Timestamp.now(), 
            statoPrecedente: 'da confermare', 
            statoNuovo: 'in uso', 
            utente: user.uid, 
            note: 'Presa in carico confermata dall\'utente.' 
        };
        try {
            await updateDoc(assegnazioneRef, { 
                statoWorkflow: 'in uso',
                dataConferma: Timestamp.now(),
                storico: arrayUnion(evento) 
            });
            return { success: true, message: "Presa in carico confermata." };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    // L'utente richiede di poter restituire l'attrezzatura
    const richiediRestituzione = async (assegnazione, note) => {
        const assegnazioneRef = doc(db, 'assegnazioniMagazzino', assegnazione.id);
        const evento = { 
            timestamp: Timestamp.now(), 
            statoPrecedente: 'in uso', 
            statoNuovo: 'restituzione richiesta', 
            utente: user.uid, 
            note: `Richiesta di restituzione: ${note || 'Nessuna nota.'}`
        };
        try {
            // ✅ Mantenuta logica da useRiconsegneManager per coerenza
            await runTransaction(db, async (t) => t.update(assegnazioneRef, {
                statoWorkflow: 'restituzione richiesta',
                storico: arrayUnion(evento)
            }));
            return { success: true, message: "Richiesta di restituzione inviata." };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    /**
     * ✅ AGGIORNATO: Un dipendente segnala un guasto/furto per un'assegnazione attiva.
     * Logica proveniente da useGuastiManager, ora più flessibile.
     * @param {object} assegnazione - L'oggetto completo dell'assegnazione.
     * @param {string} tipoSegnalazione - 'guasto segnalato' o 'furto segnalato'.
     * @param {string} noteAggiuntive - Note opzionali dall'utente.
     */
    const segnalaGuasto = async (assegnazione, tipoSegnalazione, noteAggiuntive) => {
        if (!assegnazione || !assegnazione.id) {
            return { success: false, message: "Dati dell'assegnazione non validi." };
        }
        const assegnazioneRef = doc(db, 'assegnazioniMagazzino', assegnazione.id);
        const eventoStorico = {
            timestamp: Timestamp.now(),
            statoPrecedente: assegnazione.statoWorkflow,
            statoNuovo: tipoSegnalazione,
            utente: user.uid,
            note: `Segnalazione: ${noteAggiuntive || 'Nessuna nota.'}`
        };
        try {
            await runTransaction(db, async (transaction) => {
                transaction.update(assegnazioneRef, {
                    statoWorkflow: tipoSegnalazione,
                    storico: arrayUnion(eventoStorico)
                });
            });
            return { success: true, message: "Segnalazione inviata con successo." };
        } catch (error) {
            console.error("Errore durante la segnalazione del guasto:", error);
            return { success: false, message: error.message };
        }
    };

    return {
        confermaPresaInCarico,
        richiediRestituzione,
        segnalaGuasto,
    };
};