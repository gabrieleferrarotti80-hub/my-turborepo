// File: packages/shared-core/hooks/useAttrezzaturaManager.jsx
import React, { useState } from "react";
import { doc, updateDoc, collection } from "firebase/firestore"; 

// ✅ CORREZIONE: Usa percorsi relativi per gli altri moduli interni al pacchetto!
import { formatForFirestore } from '../data/dataParsers.js';
import { attrezzaturaSchema } from '../data/schemas.js';


// L'hook accetta il DB come dipendenza iniettata (Passo 4)
export const useAttrezzaturaManager = (db) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    // Funzione per aggiornare un articolo esistente
    const updateAttrezzatura = async (attrezzaturaId, formData) => {
        if (!db) {
            setIsError(true);
            setMessage("Errore: Connessione al database mancante.");
            return false;
        }

        setIsLoading(true);
        setIsError(false);
        setMessage('');

        try {
            const datiPuliti = formatForFirestore(formData, attrezzaturaSchema);
            const docRef = doc(db, 'attrezzature', attrezzaturaId);
            
            await updateDoc(docRef, datiPuliti);
            
            setMessage("Articolo modificato con successo.");
            return true;
        } catch (error) {
            console.error("Errore nell'aggiornamento dell'articolo:", error);
            setIsError(true);
            setMessage(`Errore di salvataggio: ${error.message}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    
    // Puoi aggiungere qui addAttrezzatura, deleteAttrezzatura, ecc.
    // ...

    return {
        updateAttrezzatura,
        isLoading,
        message,
        isError,
    };
};