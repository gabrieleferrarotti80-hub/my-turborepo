import { useState } from 'react';
import { 
    collection, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp 
} from 'firebase/firestore';

export const useSALManager = (db, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 1. AGGIUNGI SAL ---
    const addSAL = async (datiSAL) => {
        setIsLoading(true);
        setError(null);
        try {
            // Validazione minima
            if (!datiSAL.cantiereId || !datiSAL.importo) {
                throw new Error("Dati mancanti (Cantiere o Importo).");
            }

            await addDoc(collection(db, 'sal'), {
                ...datiSAL,
                companyID,
                // 🌟 FLUSSO STATI: 'bozza', 'emesso', 'approvato', 'fatturato', 'pagato'
                stato: datiSAL.stato || 'bozza', 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user.uid
            });

            setIsLoading(false);
            return { success: true, message: "SAL registrato con successo." };
        } catch (err) {
            console.error("Errore addSAL:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 2. MODIFICA SAL ---
    const updateSAL = async (id, datiAggiornati) => {
        setIsLoading(true);
        setError(null);
        try {
            const docRef = doc(db, 'sal', id);
            await updateDoc(docRef, {
                ...datiAggiornati,
                updatedAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, message: "SAL aggiornato." };
        } catch (err) {
            console.error("Errore updateSAL:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 3. ELIMINA SAL ---
    const deleteSAL = async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            await deleteDoc(doc(db, 'sal', id));
            setIsLoading(false);
            return { success: true, message: "SAL eliminato." };
        } catch (err) {
            console.error("Errore deleteSAL:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    return {
        isLoading,
        error,
        addSAL,
        updateSAL,
        deleteSAL
    };
};