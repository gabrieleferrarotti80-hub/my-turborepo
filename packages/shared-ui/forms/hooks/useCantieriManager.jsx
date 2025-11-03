import { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export const useCantieriManager = (db, userAziendaId, companies) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Aggiunge un nuovo cantiere al database.
     */
    const addCantiere = async (datiCantiere) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!userAziendaId) throw new Error("ID azienda non trovato.");
            
            const companyName = companies.find(c => c.id === userAziendaId)?.name || 'N/A';

            const datiFinali = {
                ...datiCantiere,
                companyID: userAziendaId,
                companyName: companyName,
                stato: 'attivo',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'cantieri'), datiFinali);
            return { success: true, message: 'Cantiere aggiunto con successo!' };
        } catch (err) {
            console.error("Errore nell'aggiunta del cantiere:", err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };
    
    /**
     * Aggiunge un nuovo sub-cantiere (fase di lavoro) a un cantiere esistente.
     * @param {object} subcantiereData - Dati raccolti dal form (es. nome, cantiereId).
     */
    const addSubcantiere = async (subcantiereData) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!subcantiereData.cantiereId || !subcantiereData.descrizione) {
                throw new Error("Cantiere principale e descrizione sono obbligatori.");
            }

            const subcantieriRef = collection(doc(db, 'cantieri', subcantiereData.cantiereId), 'subcantieri');
            
            await addDoc(subcantieriRef, {
                descrizione: subcantiereData.descrizione,
                stato: subcantiereData.stato,
                cantiereGenitoreId: subcantiereData.cantiereId,
                companyID: userAziendaId,
                dataCreazione: serverTimestamp()
            });
            
            return { success: true, message: 'Sub-cantiere aggiunto con successo!' };

        } catch (error) {
            console.error("Errore nell'aggiunta del sub-cantiere:", error);
            setError(error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Aggiorna lo stato di un sub-cantiere.
     * @param {string} cantiereId - ID del cantiere genitore.
     * @param {string} subcantiereId - ID del sub-cantiere da aggiornare.
     * @param {string} nuovoStato - Il nuovo stato (es. 'completato').
     */
    const updateStatoSubcantiere = async (cantiereId, subcantiereId, nuovoStato) => {
        setIsLoading(true);
        setError(null);
        try {
            const subcantiereRef = doc(db, 'cantieri', cantiereId, 'subcantieri', subcantiereId);
            await updateDoc(subcantiereRef, {
                stato: nuovoStato
            });
            return { success: true, message: 'Stato aggiornato con successo.' };
        } catch (err) {
            console.error("Errore nell'aggiornamento dello stato:", err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };
    
    return {
        addCantiere,
        addSubcantiere,
        updateStatoSubcantiere,
        isLoading,
        error,
    };
};