import { useState } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const schemaSubappaltatore = {
    ragioneSociale: "",
    partitaIva: "",
    codiceFiscale: "",
    categoria: "Edili", 
    
    // Sede
    indirizzo: "",
    cap: "",
    citta: "",
    provincia: "",
    
    // Contatti & Amministrazione
    referente: "",
    telefono: "",
    cellulareReferente: "",
    email: "",
    pec: "",
    sdi: "",
    iban: "",
    
    // Scadenze Documentali
    scadenzaDURC: "",
    scadenzaVisura: "",
    scadenzaRCT: "",
    scadenzaAntimafia: "",
    
    note: "",
    companyID: "",
    createdAt: null,
    updatedAt: null
};

export const useSubappaltatoriManager = (db, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const salvaSubappaltatore = async (dati) => {
        setIsLoading(true);
        setError(null);
        try {
            let subId = dati.id;
            const subRef = subId ? doc(db, 'subappaltatori', subId) : doc(collection(db, 'subappaltatori'));
            
            const payload = {
                ...schemaSubappaltatore,
                ...dati,
                companyID: companyID,
                updatedAt: serverTimestamp()
            };

            if (!subId) {
                payload.id = subRef.id;
                payload.createdBy = user.uid;
                payload.createdAt = serverTimestamp();
                await setDoc(subRef, payload);
            } else {
                await updateDoc(subRef, payload);
            }

            setIsLoading(false);
            return { success: true, id: subRef.id };
        } catch (err) {
            console.error("Errore salvataggio subappaltatore:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const eliminaSubappaltatore = async (subId) => {
        if (!confirm("Sei sicuro di voler eliminare questo subappaltatore?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'subappaltatori', subId));
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false };
        }
    };

    return { isLoading, error, salvaSubappaltatore, eliminaSubappaltatore };
};