// Percorso: packages/shared-core/hooks/useCompaniesManager.js

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebaseData } from '../context/FirebaseContext.jsx';

export const useCompaniesManager = () => {
    const { db } = useFirebaseData();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    /**
     * Funzione che contatta il backend per creare una nuova azienda e un utente titolare.
     */
    const addCompanyWithUser = async (companyData, userData) => {
        console.log("--- [START] Invio dati al backend per creazione ---");
        setIsLoading(true);
        setMessage('');
        setIsError(false);

        try {
            // Chiamata all'endpoint del tuo server backend
            const response = await fetch('/api/createUserAndCompany', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ companyData, userData }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Errore di comunicazione con il server.');
            }
            
            setMessage(result.message);
            setIsError(false);
            return true;

        } catch (error) {
            console.error("--- [ERROR] Errore nella chiamata al backend ---", error);
            setMessage(error.message);
            setIsError(true);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Aggiorna le funzionalità abilitate per una specifica azienda.
     */
    const updateCompanyFeatures = async (companyId, newFeatures) => {
        // LOG 1: Controlla se la funzione viene chiamata e con quali dati.
        console.log("%c[MANAGER] 1. Funzione 'updateCompanyFeatures' chiamata.", "color: orange; font-weight: bold;", { companyId, newFeatures });

        if (!companyId) {
            console.error("[MANAGER] 🔥 ERRORE: ID azienda non fornito. Operazione annullata.");
            setMessage("ID azienda mancante. Impossibile salvare.");
            setIsError(true);
            return;
        }

        setIsLoading(true);
        setMessage('');
        setIsError(false);

        const companyDocRef = doc(db, 'companies', companyId);

        try {
            // LOG 2: Verifica che stia per eseguire l'aggiornamento su Firestore.
            console.log("[MANAGER] 2. Tento di eseguire 'updateDoc' su Firestore...");
            
            await updateDoc(companyDocRef, {
                enabledFeatures: newFeatures
            });

            // LOG 3: Conferma del successo dell'operazione.
            console.log("%c[MANAGER] 3. ✅ SUCCESSO: 'updateDoc' completato.", "color: green; font-weight: bold;");
            setMessage('Permessi aggiornati con successo!');
            setIsError(false);

        } catch (error) {
            // LOG 4: Cattura qualsiasi errore specifico di Firestore.
            console.error("%c[MANAGER] 4. 🔥 ERRORE FIRESTORE:", "color: red; font-weight: bold;", error);
            setMessage(`Errore durante il salvataggio: ${error.message}`);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return { addCompanyWithUser, updateCompanyFeatures, isLoading, message, isError };
};