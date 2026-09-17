import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export const useHRManager = (db, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 1. INVIA RICHIESTA (Tecnico) ---
    const inviaRichiestaFerie = async (dati) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!dati.dataInizio || !dati.dataFine || !dati.tipo) {
                throw new Error("Compila tutti i campi obbligatori.");
            }

            await addDoc(collection(db, 'richieste_ferie'), {
                companyID,
                userId: user.uid,
                nomeUtente: user.displayName || user.email,
                tipo: dati.tipo, // ferie, permesso, malattia
                dataInizio: dati.dataInizio,
                dataFine: dati.dataFine,
                ore: dati.ore || 0, // Se permesso orario
                note: dati.note || '',
                stato: 'in_attesa',
                createdAt: serverTimestamp()
            });

            setIsLoading(false);
            return { success: true, message: "Richiesta inviata all'amministrazione." };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 2. APPROVA/RIFIUTA (Amministrazione) ---
   const gestisciRichiesta = async (richiestaId, nuovoStato, noteAdmin = '') => {
        setIsLoading(true);
        try {
            const ref = doc(db, 'richieste_ferie', richiestaId);
            
            // Determina il nome leggibile dell'admin
            const nomeAdmin = user.nome && user.cognome 
                ? `${user.nome} ${user.cognome}` 
                : (user.displayName || user.email);

            await updateDoc(ref, {
                stato: nuovoStato, 
                approvatoDa: user.uid,
                // ✅ NUOVO CAMPO: Salviamo il nome
                nomeApprovatore: nomeAdmin, 
                noteAdmin: noteAdmin,
                updatedAt: serverTimestamp()
            });
            
            setIsLoading(false);
            return { success: true, message: `Richiesta ${nuovoStato}.` };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    return {
        isLoading,
        error,
        inviaRichiestaFerie,
        gestisciRichiesta
    };
};