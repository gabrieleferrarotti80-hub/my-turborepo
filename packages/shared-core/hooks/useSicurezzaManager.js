import { useState } from 'react';
import { 
    collection, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, query, where, getDocs, orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useSicurezzaManager = (db, storage, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);

    // --- POS (Piano Operativo Sicurezza) ---
    
    // Carica un POS per un cantiere
    const uploadPOS = async (cantiereId, file, note) => {
        setIsLoading(true);
        try {
            const path = `sicurezza/${companyID}/pos/${cantiereId}_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'sicurezza_pos'), {
                companyID,
                cantiereId,
                nomeFile: file.name,
                url,
                note: note || '',
                caricatoDa: user.uid,
                createdAt: serverTimestamp()
            });

            setIsLoading(false);
            return { success: true, message: "POS caricato correttamente." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- DPI (Dispositivi Protezione Individuale) ---

    // Questa funzione verrà chiamata dall'APP quando l'utente firma
   const confermaRicezioneDPI = async (assegnazioneId, blobFirma) => {
    setIsLoading(true);
    try {
        // 1. Upload della firma nello Storage
        const path = `sicurezza/${companyID}/firme_dpi/${assegnazioneId}_firma.png`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blobFirma);
        const firmaUrl = await getDownloadURL(storageRef);

        // 2. Aggiornamento del documento Firestore
        const docRef = doc(db, 'assegnazioniMagazzino', assegnazioneId);
        
        await updateDoc(docRef, {
            confermaRicezione: true,
            dataConferma: serverTimestamp(),
            firmaUrl: firmaUrl,
            
            // 🔴 QUESTE RIGHE MANCAVANO:
            stato: 'in uso',           // Aggiorniamo lo stato logico
            statoWorkflow: 'in uso'    // Aggiorniamo lo stato per il workflow visivo
        });

        setIsLoading(false);
        return { success: true, message: "DPI Confermato e Firmato!" };
    } catch (error) {
        console.error("Errore firma:", error);
        setIsLoading(false);
        return { success: false, message: error.message };
    }
};

    return {
        isLoading,
        uploadPOS,
        confermaRicezioneDPI
    };
};