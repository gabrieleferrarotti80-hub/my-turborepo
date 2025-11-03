// packages/shared-core/hooks/useDocumentiManager.jsx

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, doc, deleteDoc,query,where,getDocs } from 'firebase/firestore';
// ✅ Import aggiunti per la logica di upload
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useDocumentiManager = (db, storage, user, companyId) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const addDocumento = async (documentoData) => { /* ... tua logica esistente ... */ };
    const deleteDocumento = async (docId, storagePath) => { /* ... tua logica esistente ... */ };

    const getCompanyDocuments = useCallback(async () => {
        if (!companyId) {
            console.warn("[useDocumentiManager] Impossibile recuperare documenti: companyId non fornito.");
            return [];
        }
        
        console.log(`[useDocumentiManager] Caricamento documenti per company: ${companyId}`);
        try {
            // Assumiamo che i documenti siano in una collezione 'documenti'
            // e che abbiano un campo 'companyId'
            const q = query(
                collection(db, 'documenti'), 
                where('companyId', '==', companyId)
            );
            
            const querySnapshot = await getDocs(q);
            const documents = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Converte i timestamp di Firestore in Date JS
                scadenza: doc.data().scadenza?.toDate ? doc.data().scadenza.toDate() : null
            }));
            
            console.log(`[useDocumentiManager] Trovati ${documents.length} documenti aziendali.`);
            return documents;
            
        } catch (err) {
            console.error("Errore in getCompanyDocuments:", err);
            handleError(err); // Assumendo che tu abbia un handleError
            return [];
        }
    }, [db, companyId]); // Aggiungi 'handleError' 

    // --- ✅ FUNZIONE MANCANTE AGGIUNTA QUI ---
    /**
     * Carica un array di file su Firebase Storage in una cartella specifica.
     * @param {Array<File>} files - L'array di oggetti File da caricare.
     * @param {string} path - Il percorso di base su Storage dove salvare i file (es. 'offerte/id_offerta').
     * @returns {Promise<Array<{downloadURL: string, fileName: string}>>} Una promessa che si risolve con un array di oggetti contenenti gli URL per il download.
     */
    const uploadFiles = async (files, path) => {
        if (!files || files.length === 0) return [];
        setIsLoading(true);
        setError(null);

        try {
            const uploadPromises = files.map(file => {
                const storageRef = ref(storage, `${path}/${file.name}`);
                return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });

            const downloadURLs = await Promise.all(uploadPromises);
            
            setIsLoading(false);
            // Restituisce un array di oggetti per un uso più flessibile
            return files.map((file, index) => ({
                downloadURL: downloadURLs[index],
                fileName: file.name,
            }));

        } catch (err) {
            console.error("Errore durante l'upload dei file:", err);
            setError("Errore durante il caricamento dei file.");
            setIsLoading(false);
            throw err; // Rilancia l'errore per essere gestito dal chiamante
        }
    };

    return { 
        isLoading, 
        error, 
        addDocumento, 
        deleteDocumento, 
        getCompanyDocuments,
        uploadFiles // ✅ Esporta la nuova funzione
    };
};