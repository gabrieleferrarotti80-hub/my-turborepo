import { useState } from 'react';
import { 
    collection, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, runTransaction 
} from 'firebase/firestore';

export const useManutenzioniManager = (db, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 1. CREA NUOVA SCADENZA ---
    const addScadenza = async (dati) => {
        setIsLoading(true);
        setError(null);
        try {
            await addDoc(collection(db, 'scadenze_mezzi'), {
                ...dati,
                companyID,
                stato: 'attiva', // attiva | completata
                createdAt: serverTimestamp(),
                createdBy: user.uid
            });
            setIsLoading(false);
            return { success: true, message: "Scadenza programmata con successo." };
        } catch (err) {
            console.error(err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 2. REGISTRA MANUTENZIONE (Chiude la scadenza) ---
    const completaManutenzione = async (scadenzaId, datiEsecuzione) => {
        setIsLoading(true);
        try {
            const scadenzaRef = doc(db, 'scadenze_mezzi', scadenzaId);
            
            await runTransaction(db, async (t) => {
                const docSnap = await t.get(scadenzaRef);
                if (!docSnap.exists()) throw new Error("Scadenza non trovata");
                const scadenzaData = docSnap.data();

                // 1. Segna come completata
                t.update(scadenzaRef, {
                    stato: 'completata',
                    dataEsecuzione: datiEsecuzione.data,
                    costo: Number(datiEsecuzione.costo),
                    noteEsecuzione: datiEsecuzione.note,
                    eseguitaDa: user.uid,
                    updatedAt: serverTimestamp()
                });

                // 2. (Opzionale) Crea voce costo nel bilancio commessa?
                // Se l'attrezzatura è assegnata a un cantiere, potremmo imputare il costo.
                // Per ora lo teniamo come costo generale del mezzo.

                // 3. Se è ricorrente, crea la prossima scadenza automaticamente
                if (scadenzaData.ricorrenzaMesi) {
                    const nuovaData = new Date(datiEsecuzione.data);
                    nuovaData.setMonth(nuovaData.getMonth() + Number(scadenzaData.ricorrenzaMesi));
                    
                    const nuovaRef = doc(collection(db, 'scadenze_mezzi'));
                    t.set(nuovaRef, {
                        ...scadenzaData,
                        dataScadenza: nuovaData.toISOString().split('T')[0],
                        stato: 'attiva',
                        createdAt: serverTimestamp(),
                        // Pulisci i dati dell'esecuzione precedente
                        dataEsecuzione: null,
                        costo: null,
                        noteEsecuzione: null
                    });
                }
            });

            setIsLoading(false);
            return { success: true, message: "Manutenzione registrata." };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const deleteScadenza = async (id) => {
        try {
            await deleteDoc(doc(db, 'scadenze_mezzi', id));
            return { success: true, message: "Eliminata." };
        } catch (err) { return { success: false, message: err.message }; }
    };

    return {
        isLoading,
        error,
        addScadenza,
        completaManutenzione,
        deleteScadenza
    };
};