// Percorso: packages/shared-core/hooks/usePersonnelManager.js

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Nota: non abbiamo più bisogno di 'validateUserFormSchema' qui perché la validazione
// o l'abbiamo già fatta nel form o la fa il backend.
// L'argomento 'auth' non è più necessario per le funzioni di creazione.

export const usePersonnelManager = (db, storage) => { // 'auth' rimosso dagli argomenti
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const addPersonnel = async (userData, companyID, filesToUpload = []) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            if (!companyID) throw new Error("ID Azienda non fornito.");

            // 1. GESTIONE FILE (lato client, come prima)
            const uploadedDocuments = await Promise.all(
                filesToUpload.map(async (file) => {
                    // Creiamo un UID fittizio per il percorso, verrà sovrascritto dopo
                    const tempPath = `users/temp-${Date.now()}/documents/${file.name}`;
                    const fileRef = ref(storage, tempPath);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    return { nome: file.name, url };
                })
            );
            
            // Aggiungiamo i documenti caricati ai dati dell'utente
            const finalUserData = { ...userData, documenti: uploadedDocuments };

            // 2. CHIAMATA AL BACKEND
            const response = await fetch('/api/createEmployee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeData: finalUserData, companyID }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            setMessage('Personale aggiunto con successo!');
            setIsError(false);
            return { success: true, message: 'Personale aggiunto con successo!' };

        } catch (error) {
            setMessage(error.message);
            setIsError(true);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const updatePersonnel = async (userId, updatedData) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, updatedData);

            setMessage('Dati del dipendente aggiornati con successo!');
            setIsError(false);
            return { success: true, message: 'Dati aggiornati' };
        } catch (error) {
            setMessage(error.message);
            setIsError(true);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const importPersonnelBatch = async (personnelData) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const response = await fetch('/api/importEmployeesBatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personnelData }),
            });

            const result = await response.json();
            if (!response.ok && response.status !== 207) { // 207 è successo parziale
                throw new Error(result.message);
            }

            setMessage(result.message);
            setIsError(result.errors && result.errors.length > 0);
            return result;

        } catch (error) {
            setMessage(error.message);
            setIsError(true);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { addPersonnel, updatePersonnel, importPersonnelBatch, isLoading, message, isError };
};