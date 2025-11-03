import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState } from 'react';

// ✅ CORREZIONE: L'hook ora accetta tutte le dipendenze necessarie
export const useReportsManager = (db, storage, user, userAziendaId) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // ✅ AGGIUNTA: La funzione per creare un nuovo report
    const addReport = async (cantiereId, reportType, note, file, location, isLavoroTerminato = false) => {
        if (!user || !userAziendaId) {
            return { success: false, message: "Utente non valido o azienda non selezionata." };
        }
        if (!file) {
            return { success: false, message: "Nessun file fornito per il report." };
        }

        setIsSaving(true);
        setError(null);

        try {
            // 1. Carica il file su Storage
            const fileRef = ref(storage, `reports/${userAziendaId}/${cantiereId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // 2. Prepara il documento per Firestore
            const newReport = {
                cantiereId,
                tipologia: reportType,
                note: note || '',
                fileUrl: downloadURL,
                fileName: file.name,
                location,
                createdAt: serverTimestamp(),
                companyID: userAziendaId,
                 userId: user?.uid || user?.id,
};
           

            // Aggiungi il campo condizionale se il lavoro è terminato
            if (isLavoroTerminato) {
                newReport.chiusuraLavori = true;
            }

            // 3. Salva il documento
            await addDoc(collection(db, 'reports'), newReport);

            setIsSaving(false);
            return { success: true, message: "Report salvato con successo!" };

        } catch (err) {
            console.error("Errore nel salvataggio del report:", err);
            setError(err.message);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };
    
    const updateReport = async (reportId, updatedData) => {
        try {
            const reportRef = doc(db, 'reports', reportId);
            await updateDoc(reportRef, updatedData);
            return { success: true, message: 'Report aggiornato con successo!' };
        } catch (error) {
            console.error("Errore durante l'aggiornamento del report:", error);
            return { success: false, message: error.message };
        }
    };

    const deleteReport = async (reportId) => {
        try {
            const reportRef = doc(db, 'reports', reportId);
            await deleteDoc(reportRef);
            return { success: true, message: 'Report eliminato con successo.' };
        } catch (error) {
            console.error("Errore durante l'eliminazione del report:", error);
            return { success: false, message: error.message };
        }
    };

    // ✅ CORREZIONE: Ora esportiamo tutte le funzioni necessarie
    return { addReport, updateReport, deleteReport, isSaving, error };
};