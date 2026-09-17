import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useAziendaManager = (db, storage, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const updateDatiAzienda = async (dati, logoFile) => {
        setIsLoading(true);
        setError(null);
        try {
            const aziendaRef = doc(db, 'companies', companyID);
            let logoUrl = dati.logoUrl; // Mantieni vecchio logo se non cambia

            // Upload Logo se presente
            if (logoFile && storage) {
                const path = `logos/${companyID}_${Date.now()}_logo`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, logoFile);
                logoUrl = await getDownloadURL(storageRef);
            }

            await updateDoc(aziendaRef, {
                ragioneSociale: dati.ragioneSociale,
                piva: dati.piva,
                codiceFiscale: dati.codiceFiscale,
                indirizzo: dati.indirizzo,
                citta: dati.citta,
                cap: dati.cap,
                email: dati.email,
                telefono: dati.telefono,
                sitoWeb: dati.sitoWeb,
                iban: dati.iban,
                banca: dati.banca,
                logoUrl: logoUrl,
                // Settings generici
                costSettings: dati.costSettings || {}, 
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            });

            setIsLoading(false);
            return { success: true, message: "Dati aziendali aggiornati." };
        } catch (err) {
            console.error("Errore update azienda:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    return {
        isLoading,
        error,
        updateDatiAzienda
    };
};