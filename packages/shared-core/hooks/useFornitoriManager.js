import { useState } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const useFornitoriManager = (db, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- GESTIONE FORNITORI ---

    const addFornitore = async (datiFornitore) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, 'fornitori'), {
                ...datiFornitore,
                companyID,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, id: docRef.id, message: "Fornitore aggiunto." };
        } catch (err) {
            console.error(err);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const updateFornitore = async (id, dati) => {
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'fornitori', id), {
                ...dati,
                updatedAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, message: "Fornitore aggiornato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const deleteFornitore = async (id) => {
        if (!confirm("Eliminare questo fornitore?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'fornitori', id));
            setIsLoading(false);
            return { success: true, message: "Fornitore eliminato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- GESTIONE FATTURE ACQUISTO ---

    const addFatturaAcquisto = async (datiFattura) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, 'fatture_acquisto'), {
                ...datiFattura,
                stato: 'da_pagare', // Default
                companyID,
                registratoDa: user.uid,
                createdAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, id: docRef.id, message: "Fattura registrata." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const updateFatturaAcquisto = async (id, datiAggiornati) => {
        setIsLoading(true);
        try {
            // Se c'è un file nuovo, avremmo già fatto l'upload nell'orchestratore
            // Qui aggiorniamo solo i metadati su Firestore
            await updateDoc(doc(db, 'fatture_acquisto', id), {
                ...datiAggiornati,
                updatedAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, message: "Fattura aggiornata." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const updateStatoFatturaAcquisto = async (id, nuovoStato) => {
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'fatture_acquisto', id), { stato: nuovoStato });
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const deleteFatturaAcquisto = async (id) => {
        if (!confirm("Eliminare questa fattura?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'fatture_acquisto', id));
            setIsLoading(false);
            return { success: true, message: "Fattura eliminata." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- ✅ GESTIONE PREVENTIVI & ORDINI ---

    const addPreventivo = async (dati) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, 'preventivi_fornitori'), {
                ...dati,
                tipo: 'preventivo', // preventivo | ordine
                stato: 'in_valutazione', // in_valutazione | accettato | rifiutato
                companyID,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, message: "Preventivo registrato.", id: docRef.id };
        } catch (err) {
            console.error(err);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const updatePreventivoOrdine = async (id, collectionName, dati) => {
        setIsLoading(true);
        try {
            await updateDoc(doc(db, collectionName, id), {
                ...dati,
                updatedAt: serverTimestamp()
            });
            setIsLoading(false);
            return { success: true, message: "Documento aggiornato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const deleteDocumentoAcquisto = async (id, collectionName) => {
        if (!confirm("Eliminare questo documento?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, collectionName, id));
            setIsLoading(false);
            return { success: true, message: "Documento eliminato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // 🔥 LA MAGIA: Trasforma Preventivo in Ordine
    const convertiPreventivoInOrdine = async (preventivoId, datiPreventivo) => {
        setIsLoading(true);
        try {
            // 1. Crea il nuovo Ordine copiando i dati
            const ordineRef = doc(collection(db, 'ordini_acquisto'));
            const datiOrdine = {
                ...datiPreventivo,
                id: ordineRef.id,
                tipo: 'ordine',
                stato: 'inviato', // Nuovo stato iniziale per l'ordine
                preventivoOrigineId: preventivoId,
                dataOrdine: serverTimestamp(), // La data di conferma è oggi
                numeroOrdine: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`, // (TODO: Implementare contatore reale come per le fatture)
                companyID,
                createdBy: user.uid,
                createdAt: serverTimestamp()
            };
            
            // Rimuovi ID vecchi o campi non necessari
            delete datiOrdine.dataPreventivo; 

            await setDoc(ordineRef, datiOrdine);

            // 2. Aggiorna il Preventivo originale come "Accettato" e linkalo
            await updateDoc(doc(db, 'preventivi_fornitori', preventivoId), {
                stato: 'accettato',
                ordineCollegatoId: ordineRef.id,
                updatedAt: serverTimestamp()
            });

            setIsLoading(false);
            return { success: true, message: "Ordine generato con successo!", id: ordineRef.id };
        } catch (err) {
            console.error(err);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // ✅ LINK DDT -> ORDINE
    const linkDDTToOrdine = async (ddtId, ordineId) => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Aggiorna il DDT
            const ddtRef = doc(db, 'ddt_acquisti', ddtId);
            await updateDoc(ddtRef, {
                ordineId: ordineId,
                stato: 'associato_ordine', // Nuovo stato
                dataRiconciliazione: serverTimestamp()
            });

            // (Opzionale) 2. Potremmo aggiornare anche l'ordine per dire "ha dei DDT collegati"
            // ma per ora basta il collegamento unidirezionale per la visualizzazione.

            setIsLoading(false);
            return { success: true, message: "DDT collegato all'ordine con successo." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    };

    

    return {
        isLoading,
        error,
        addFornitore,
        updateFornitore,
        deleteFornitore,
        addFatturaAcquisto,
        updateFatturaAcquisto,
        updateStatoFatturaAcquisto,
        deleteFatturaAcquisto,
        addPreventivo,
        updatePreventivoOrdine,
        deleteDocumentoAcquisto,
        linkDDTToOrdine,
        convertiPreventivoInOrdine
    };
};