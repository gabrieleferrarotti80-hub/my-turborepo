// packages/shared-core/hooks/useClientsManager.jsx

import { useState } from 'react';
// Import aggiunti per la nuova funzione
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import { clientSchema } from '../data/schemas.js';

// ✅ CORREZIONE: Aggiunto 'user' per ottenere il companyID corretto
export const useClientsManager = (db, user) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const addClient = async (formData, companyId) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            if (!companyId) throw new Error("ID Azienda non fornito.");

            const dataToSave = JSON.parse(JSON.stringify(formData));

            if (dataToSave.tipoCliente === 'Privato') {
                dataToSave.ragioneSociale = '';
            } else {
                dataToSave.nome = dataToSave.ragioneSociale || '';
                dataToSave.cognome = '';
            }

            const nestedObjectKeys = ['referente', 'sedeLegale', 'sedeOperativa'];
            for (const key of nestedObjectKeys) {
                const finalNestedObject = { ...clientSchema[key] };
                if (dataToSave[key]) {
                    for (const nestedKey in clientSchema[key]) {
                        const formValue = dataToSave[key][nestedKey];
                        if (formValue !== undefined && formValue !== null) {
                            finalNestedObject[nestedKey] = formValue;
                        }
                    }
                }
                dataToSave[key] = finalNestedObject;
            }
            
            const finalData = {
                ...clientSchema,
                ...dataToSave,
                companyID: companyId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'clients'), finalData);
            
            setMessage('Cliente aggiunto con successo!');
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("Errore nell'aggiunta del cliente:", error);
            setMessage(error.message);
            setIsError(true);
            setIsLoading(false);
            return false;
        }
    };

    const updateClient = async (clientId, formData) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            const docRef = doc(db, 'clients', clientId);
            await updateDoc(docRef, { ...formData, updatedAt: serverTimestamp() });
            setMessage('Cliente aggiornato con successo!');
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("Errore nell'aggiornamento del cliente:", error);
            setMessage(error.message);
            setIsError(true);
            setIsLoading(false);
            return false;
        }
    };
    
    const importClientsBatch = async (clientsData) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            if (!db) throw new Error("Connessione al database non disponibile.");
            if (!clientsData || clientsData.length === 0) throw new Error("Nessun dato valido da importare.");

            const batch = writeBatch(db);
            let validClientsCount = 0;

            clientsData.forEach(client => {
                const dataToSave = JSON.parse(JSON.stringify(client));
                
                if (!dataToSave.companyID) {
                    console.warn(`Cliente "${dataToSave.nome || dataToSave.ragioneSociale}" saltato: companyID mancante.`);
                    return;
                }

                if (dataToSave.tipoCliente === 'Privato') {
                    dataToSave.ragioneSociale = '';
                } else {
                    dataToSave.nome = dataToSave.ragioneSociale || '';
                    dataToSave.cognome = '';
                }
                
                const finalData = {
                    ...clientSchema,
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                
                delete finalData.azienda;

                const newClientRef = doc(collection(db, 'clients'));
                batch.set(newClientRef, finalData);
                validClientsCount++;
            });

            if (validClientsCount === 0) {
                throw new Error("Nessun cliente valido da importare dopo la validazione.");
            }

            await batch.commit();
            
            const successMessage = `Importazione completata con successo! Aggiunti ${validClientsCount} clienti.`;
            setMessage(successMessage);
            return { success: true, message: successMessage };

        } catch (error) {
            console.error("Errore durante l'importazione massiva dei clienti:", error);
            setMessage(error.message);
            setIsError(true);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // --- FUNZIONE MANCANTE AGGIUNTA QUI ---
    /**
     * Aggiunge un nuovo referente a un cliente esistente.
     * @param {string} clienteId - L'ID del documento del cliente.
     * @param {object} datiReferente - L'oggetto con i dati del nuovo referente.
     * @param {object} metadata - Metadati opzionali, come il contesto.
     */
    const addReferente = async (clienteId, datiReferente, metadata = {}) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            // Nota: a differenza delle altre funzioni, questa non ha bisogno di user.companyID
            // perché il filtro viene già applicato a monte dal FirebaseContext.
            const clientRef = doc(db, 'clients', clienteId);
            
            const newReferente = { ...datiReferente, context: metadata.context || '' };

            // Usa arrayUnion per aggiungere il nuovo referente all'array 'referenti'
            await updateDoc(clientRef, {
                referenti: arrayUnion(newReferente),
                updatedAt: serverTimestamp()
            });

            setMessage('Referente aggiunto con successo!');
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("Errore nell'aggiunta del referente:", error);
            setMessage(error.message);
            setIsError(true);
            setIsLoading(false);
            return false;
        }
    };

    // ✅ CORREZIONE: 'addReferente' aggiunto all'oggetto restituito
    return { addClient, updateClient, importClientsBatch, addReferente, isLoading, message, isError };
};