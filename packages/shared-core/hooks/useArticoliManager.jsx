// packages/shared-core/src/hooks/useArticoliManager.js
import { useState } from 'react';
import { collection, serverTimestamp, query, where, getDocs, doc, runTransaction, arrayUnion, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
// Assicurati che validateAttrezzaturaSchema sia aggiornato per gestire Articoli E Materiali
import { validateAttrezzaturaSchema } from '../data/dataValidators.js';

export const useArticoliManager = (db, user, userAziendaId) => {
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Aggiunge un nuovo articolo (Attrezzatura o Materiale).
     * @param {object} datiArticolo - Dati del form (deve contenere 'tipoArticolo').
     * @param {File} [documentoFile] - Documento opzionale per l'articolo.
     */
    const addArticolo = async (datiArticolo, documentoFile) => {
        setIsLoading(true);
        try {
            // La validazione ora gestisce la logica di Attrezzatura vs. Materiale
            validateAttrezzaturaSchema(datiArticolo); 

            if (!db || !userAziendaId) throw new Error("Errore di connessione o ID azienda non trovato.");

            // Controllo Unicità (solo se è Attrezzatura e ha un seriale)
            if (datiArticolo.tipoArticolo === 'attrezzatura' && datiArticolo.seriale) {
                const q = query(collection(db, 'attrezzature'), where('companyID', '==', userAziendaId), where('seriale', '==', datiArticolo.seriale));
                const existing = await getDocs(q);
                if (!existing.empty) {
                    throw new Error(`Errore: Il seriale '${datiArticolo.seriale}' esiste già.`);
                }
            }
            
            // Le collezioni rimangono le stesse, gestiranno articoli di tipo diverso
            const attrezzaturaRef = doc(collection(db, 'attrezzature'));
            const archivioRef = doc(collection(db, 'archivioAttrezzatura'));
            
            // Definisce lo stato iniziale in base al tipo
            const statoIniziale = datiArticolo.tipoArticolo === 'attrezzatura' ? 'disponibile' : 'magazzino';
            const quantitaIniziale = datiArticolo.tipoArticolo === 'materiale' ? datiArticolo.quantita : 1;
            
            await runTransaction(db, async (transaction) => {
                const now = serverTimestamp();
                
                transaction.set(attrezzaturaRef, {
                    ...datiArticolo,
                    companyID: userAziendaId,
                    stato: statoIniziale, // 'disponibile' o 'magazzino'
                    quantita: quantitaIniziale, // Aggiunto il campo quantità
                    documenti: [],
                    createdAt: now,
                    updatedAt: now,
                });

                transaction.set(archivioRef, {
                    attrezzaturaID: attrezzaturaRef.id,
                    seriale: datiArticolo.seriale || 'N/A', // Il seriale può non esserci per i materiali
                    companyID: userAziendaId,
                    eventi: [{
                        tipo: 'creazione',
                        timestamp: now,
                        utente: user.uid,
                        dettagli: `${datiArticolo.tipoArticolo.charAt(0).toUpperCase() + datiArticolo.tipoArticolo.slice(1)} creato nel sistema.`
                    }]
                });
            });

            // Logica per caricamento documenti (rimane invariata, è perfetta)
            if (documentoFile) {
                const storage = getStorage();
                // Utilizza 'attrezzaturaRef.id' che è valido sia per attrezzi che per materiali
                const filePath = `documenti_articoli/${userAziendaId}/${attrezzaturaRef.id}/${documentoFile.name}`; 
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, documentoFile);
                const fileURL = await getDownloadURL(fileRef);
                const documentoData = { nome: documentoFile.name, url: fileURL };
                await runTransaction(db, async t => t.update(attrezzaturaRef, { documenti: arrayUnion(documentoData) })); // Usare arrayUnion se supporta upload multipli, altrimenti solo [documentoData]
            }

            return { success: true, message: `${datiArticolo.tipoArticolo.charAt(0).toUpperCase() + datiArticolo.tipoArticolo.slice(1)} aggiunto con successo!` };

        } catch (error) {
            console.error("Errore nell'aggiunta dell'articolo:", error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Aggiorna un articolo (Attrezzatura o Materiale)
     */
    const updateArticolo = async (articoloId, datiDaAggiornare) => {
        setIsLoading(true);
        try {
            if (!db || !userAziendaId) throw new Error("Errore di connessione.");
            
            const attrezzaturaRef = doc(db, 'attrezzature', articoloId);
            
            await runTransaction(db, async (transaction) => {
                // ... (La logica di aggiornamento è perfetta e rimane invariata)
                const archivioQuery = query(collection(db, 'archivioAttrezzatura'), where("attrezzaturaID", "==", articoloId));
                const archivioSnapshot = await getDocs(archivioQuery);
                
                transaction.update(attrezzaturaRef, {
                    ...datiDaAggiornare,
                    updatedAt: serverTimestamp(),
                });

                if (!archivioSnapshot.empty) {
                    const archivioDocRef = archivioSnapshot.docs[0].ref;
                    transaction.update(archivioDocRef, {
                        eventi: arrayUnion({
                            tipo: 'modifica',
                            timestamp: serverTimestamp(),
                            utente: user.uid,
                            dettagli: `Dati aggiornati.`
                        })
                    });
                }
            });

            return { success: true, message: "Articolo aggiornato con successo." };
        } catch (error) {
            console.error("Errore durante l'aggiornamento:", error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Elimina un articolo (Attrezzatura o Materiale).
     */
    const deleteArticolo = async (articolo) => {
        setIsLoading(true);
        try {
            if (!db || !articolo?.id) throw new Error("Dati insufficienti per l'eliminazione.");
            
            // Controllo dello stato solo per le Attrezzature, non per i Materiali
            if (articolo.tipoArticolo === 'attrezzatura' && articolo.stato === 'in uso') {
                 throw new Error("Non è possibile eliminare un'attrezzatura assegnata.");
            }

            // ... (Il resto della logica di eliminazione con transazione e cancellazione Storage rimane invariato ed è corretto)
            const attrezzaturaRef = doc(db, 'attrezzature', articolo.id);
            const archivioQuery = query(collection(db, 'archivioAttrezzatura'), where("attrezzaturaID", "==", articolo.id));
            const archivioSnapshot = await getDocs(archivioQuery);
            const archivioDocRef = !archivioSnapshot.empty ? archivioSnapshot.docs[0].ref : null;

            await runTransaction(db, async (transaction) => {
                transaction.delete(attrezzaturaRef);
                if (archivioDocRef) {
                    transaction.delete(archivioDocRef);
                }
            });
            
            // Cancellazione dei documenti in Storage
            if (articolo.documenti && articolo.documenti.length > 0) {
                const storage = getStorage();
                for (const docInfo of articolo.documenti) {
                    const filePath = `documenti_articoli/${userAziendaId}/${articolo.id}/${docInfo.nome}`;
                    const fileRef = ref(storage, filePath);
                    try {
                        await deleteObject(fileRef);
                    } catch (storageError) {
                        if (storageError.code !== 'storage/object-not-found') throw storageError;
                    }
                }
            }

            return { success: true, message: "Articolo e suo storico eliminati con successo." };
        } catch (error) {
            console.error("Errore nell'eliminazione dell'articolo:", error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { addArticolo, updateArticolo, deleteArticolo, isLoading };
};