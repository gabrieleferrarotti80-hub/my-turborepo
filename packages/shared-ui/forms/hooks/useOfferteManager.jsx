// File: packages/shared-core/hooks/useOfferteManager.jsx

import { useState, useCallback } from 'react';
// ✅ Import necessary Firestore functions
import { doc, setDoc, updateDoc, Timestamp, collection, serverTimestamp, addDoc } from 'firebase/firestore';
// ❌ RIMOSSO: Import di useAgendaManager (non serve più qui)
// import { useAgendaManager } from './useAgendaManager';
import { useDocumentiManager } from './useDocumentiManager';
import { useClientsManager } from './useClientsManager';
import { offertaSchema } from '../data/schemas';

// ✅ MODIFICATO: Rimosso 'storage' se non usato direttamente qui
export const useOfferteManager = (db, user, companyId) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

     const handleError = useCallback((err) => {
        console.error("Errore in useOfferteManager:", err);
        setError(err.message || "Si è verificato un errore.");
        setIsSaving(false);
    }, []);

   // ✅ NUOVA FUNZIONE: logProroga
    const logProroga = useCallback(async (offertaId, userId) => {
        setIsSaving(true);
        setError(null);
        try {
            if (!offertaId || !userId) throw new Error("ID Offerta o Utente mancanti per log proroga.");
            
            const offertaRef = doc(db, 'offerte', offertaId);
            const logEntry = {
                userId: userId,
                timestamp: serverTimestamp() // Usa serverTimestamp per coerenza
            };

            await updateDoc(offertaRef, {
                // Assicurati che 'logProroghe' sia un array nel tuo schema
                logProroghe: arrayUnion(logEntry) 
            });

            console.log(`[useOfferteManager] Proroga registrata per offerta ${offertaId} da utente ${userId}`);
            setIsSaving(false);
            return { success: true, message: "Proroga registrata." };
        } catch (err) {
            handleError(err); // Usa handleError centralizzato
            return { success: false, message: `Errore registrazione proroga: ${err.message}` };
        }
    }, [db, handleError]); // Aggiungi db e handleError alle dipendenze


    // ✅ NUOVA/MODIFICATA FUNZIONE: inviaOfferta
    // (Sostituisce o integra la tua 'salvaRevisioneEInvia' se necessario)
    const inviaOfferta = useCallback(async (offertaId, daPiattaforma = false) => {
        setIsSaving(true);
        setError(null);
        try {
            if (!offertaId) throw new Error("ID Offerta mancante per invio.");

            const offertaRef = doc(db, 'offerte', offertaId);
            await updateDoc(offertaRef, {
                stato: 'inviata',
                faseCorrente: 3, // O l'indice della fase finale
                dataInvio: serverTimestamp(),
                inviataDaPiattaforma: daPiattaforma,
                updatedAt: serverTimestamp() // Aggiorna anche updatedAt
            });

            console.log(`[useOfferteManager] Offerta ${offertaId} impostata come 'inviata'. Da piattaforma: ${daPiattaforma}`);
            setIsSaving(false);
            return { success: true, message: "Offerta contrassegnata come inviata." };
        } catch (err) {
            handleError(err);
            return { success: false, message: `Errore invio offerta: ${err.message}` };
        }
    }, [db, handleError]); // Aggiungi db e handleError

    // ✅ MODIFICATO: Passa solo 'db' e 'user' se 'storage' non serve qui
    const documentiManager = useDocumentiManager(db, null, user); // Passa null per storage se non serve
    const clientsManager = useClientsManager(db, user);

   

    const addOfferta = useCallback(async (nomeOfferta, clienteId) => {
        setIsSaving(true);
        setError(null);
        try {
            if (!companyId) throw new Error("ID Azienda non disponibile per salvare l'offerta.");

            const newOffertaRef = doc(collection(db, 'offerte'));
            const nuovaOfferta = {
                ...offertaSchema,
                id: newOffertaRef.id,
                nomeOfferta,
                clienteId,
                companyID: companyId,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(newOffertaRef, nuovaOfferta);
            setIsSaving(false); // Reset saving state on success
            return { success: true, id: newOffertaRef.id }; // Return success and ID
        } catch (err) {
            handleError(err);
            // Non fare re-throw qui, l'errore è già gestito e lo stato error è impostato
            return { success: false, message: err.message }; // Return error state
        }
        // Rimosso 'finally' perché gestiamo lo stato in try/catch
    }, [db, user, companyId, handleError]);

    // Internal helper, might not need useCallback if only used internally
    const updateOfferta = async (offertaId, datiDaAggiornare) => {
        // Rimosso controllo companyId qui se è solo un helper interno chiamato da funzioni che già controllano
        const offertaRef = doc(db, 'offerte', offertaId);
        await updateDoc(offertaRef, {
            ...datiDaAggiornare,
            updatedAt: serverTimestamp(),
        });
    };

    const salvaSopralluogoReport = async (offertaId, reportData) => {
        // ✅ Corretto: usa lo stato isSaving/setError dell'hook principale
        setIsSaving(true);
        setError(null);
        try {
            if (!offertaId || !reportData) {
                throw new Error("ID Offerta o dati del report mancanti.");
            }
            const offertaRef = doc(db, 'offerte', offertaId);
            const currentUserId = user?.uid || user?.id || 'sconosciuto';

            await updateDoc(offertaRef, {
                datiSopralluogoReport: {
                    ...reportData,
                    salvatoIl: serverTimestamp(),
                    salvatoDa: currentUserId
                },
                // stato: 'sopralluogo_completato' // Opzionale
            });

            setIsSaving(false);
            return { success: true, message: 'Report sopralluogo salvato con successo!' };
        } catch (err) {
            handleError(err); // Usa handleError centralizzato
            return { success: false, message: `Errore salvataggio report: ${err.message}` };
        }
    };

    const archiveOfferta = useCallback(async (offertaId) => {
        setIsSaving(true);
        setError(null);
        try {
            await updateOfferta(offertaId, { stato: 'archiviata' });
            setIsSaving(false);
            return { success: true, message: "Offerta archiviata." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [handleError]); // updateOfferta non è una dipendenza perché è definito nello stesso scope

    const salvaAnalisiPreliminare = useCallback(async (offertaId, datiForm) => {
        setIsSaving(true);
        setError(null);
        try {
            console.log("[useOfferteManager] Salvataggio dati Analisi Preliminare...");

            const datiDaSalvare = {
                datiAnalisi: datiForm,
                stato: 'analisi_preliminare', // O 'in_elaborazione' se il sopralluogo è contestuale
                faseCorrente: 1,
            };

            await updateOfferta(offertaId, datiDaSalvare);
            console.log("[useOfferteManager] Dati Analisi Preliminare salvati.");
            setIsSaving(false);
            return { success: true, message: "Analisi preliminare salvata." };

        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [handleError]);

    // ❌ ELIMINATA LA FUNZIONE 'creaAppuntamentoSopralluogo'

    const aggiungiReferenteCliente = useCallback(async (clienteId, datiReferente, nomeOfferta) => {
        // Questo potrebbe non aver bisogno di gestire lo stato isSaving/error
        // se ci pensa clientsManager. Gestiamo solo l'errore se fallisce.
        setError(null); // Reset local error just in case
        try {
             const result = await clientsManager.addReferente(clienteId, datiReferente, { context: `Offerta: ${nomeOfferta}` });
             if (!result.success) throw new Error(result.message || "Errore sconosciuto aggiunta referente.");
             return { success: true };
        } catch(err) {
             handleError(err); // Usa handleError per impostare lo stato di errore locale
             return { success: false, message: err.message };
        }
    }, [clientsManager, handleError]);

    const salvaElaborazione = useCallback(async (offertaId, datiElaborazione, riepilogoEmail) => {
        setIsSaving(true);
        setError(null);
        try {
            console.log("[useOfferteManager] Salvataggio dati Elaborazione...");

            const nuovoStato = datiElaborazione.approvazioneNecessaria ? 'in_approvazione' : 'elaborata';
            const datiDaSalvare = {
                datiElaborazione: datiElaborazione,
                stato: nuovoStato,
                faseCorrente: 2,
                // lastUpdated viene gestito da updateOfferta
            };

            await updateOfferta(offertaId, datiDaSalvare);
            console.log("[useOfferteManager] Dati Elaborazione salvati. Stato:", nuovoStato);

            // Trigger Email (logica invariata)
            if (nuovoStato === 'in_approvazione' && datiElaborazione.utenteApprovazioneId) {
                try {
                    // !!! RICORDA DI SOSTITUIRE IL PLACEHOLDER DELL'EMAIL !!!
                    const emailTo = 'placeholder@example.com';
                    if (emailTo && emailTo !== 'placeholder@example.com') {
                        console.log("[useOfferteManager] Aggiunta richiesta approvazione alla coda email per:", emailTo);
                        await addDoc(collection(db, 'coda_email'), {
                            to: emailTo,
                            template: 'approvazione',
                            data: {
                                ...riepilogoEmail,
                                offertaId: offertaId,
                                nomeOfferta: riepilogoEmail.nomeOfferta || 'N/D'
                            },
                            createdAt: serverTimestamp()
                        });
                    } else {
                        console.warn("[useOfferteManager] Email utente approvatore non trovata o placeholder non sostituito. Impossibile inviare email.");
                    }
                } catch (emailError) {
                    console.error("Errore durante l'aggiunta alla coda email:", emailError);
                    // Non bloccare il salvataggio per l'email, ma logga l'errore
                }
            }
            setIsSaving(false);
            return { success: true, message: "Dati elaborazione salvati." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [db, handleError]); // Aggiunto db

    const approvaOfferta = useCallback(async (offertaId) => {
         setIsSaving(true);
         setError(null);
        try {
            console.log("[useOfferteManager] Approvazione offerta:", offertaId);
            await updateOfferta(offertaId, {
                stato: 'approvata', // O 'elaborata'
                faseCorrente: 3,
                dataApprovazione: serverTimestamp()
            });
            console.log("[useOfferteManager] Offerta approvata.");
            setIsSaving(false);
            return { success: true, message: "Offerta approvata." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [handleError]);

    const salvaRevisioneEInvia = useCallback(async (offertaId, datiRevisione) => {
        setIsSaving(true);
        setError(null);
        try {
            await updateOfferta(offertaId, {
                datiRevisione: { ...datiRevisione, dataInvio: serverTimestamp() },
                stato: 'inviata',
                faseCorrente: 3, // O 4 se c'è un'altra fase
            });
            setIsSaving(false);
            return { success: true, message: "Offerta inviata." };
        } catch(err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [handleError]);

    // --- ✅ NUOVA FUNZIONE ---
    const confermaInvioEmail = useCallback(async (offertaId, userId) => {
        setIsSaving(true);
        setError(null);
        console.log(`[useOfferteManager] Conferma invio email per offerta ${offertaId} da utente ${userId}`);
        try {
            if (!offertaId || !userId) throw new Error("ID Offerta o Utente mancanti per conferma invio email.");

            const offertaRef = doc(db, 'offerte', offertaId);
            const updateData = {
                // Stato: Lo schema diceva 'Elaborata', ma 'inviata' potrebbe avere più senso?
                // Decidi quale stato è più appropriato qui. Usiamo 'inviata' per ora.
                stato: 'inviata', 
                // Potremmo usare un campo specifico per tracciare l'invio email vs piattaforma
                // inviataTramite: 'email', // Opzionale
                dataInvioEffettivo: serverTimestamp(), // Timestamp dell'invio effettivo
                inviataDa: userId, // Utente che ha confermato l'invio
                updatedAt: serverTimestamp()
            };

            await updateDoc(offertaRef, updateData);

            console.log(`[useOfferteManager] Offerta ${offertaId} aggiornata dopo conferma invio email.`);
            setIsSaving(false);
            return { success: true, message: "Stato offerta aggiornato post-invio." };
        } catch (err) {
            handleError(err);
            return { success: false, message: `Errore conferma invio email: ${err.message}` };
        }
    }, [db, handleError]); // Dipendenze
    // --- FINE NUOVA FUNZIONE ---

    return {
        isSaving,
        error,
        addOfferta,
        archiveOfferta,
        salvaAnalisiPreliminare,
        aggiungiReferenteCliente,
        // ❌ RIMOSSO 'creaAppuntamentoSopralluogo'
        salvaElaborazione,
        approvaOfferta,
        salvaRevisioneEInvia,
        salvaSopralluogoReport,
        logProroga,
        inviaOfferta,
        confermaInvioEmail,
    };
};