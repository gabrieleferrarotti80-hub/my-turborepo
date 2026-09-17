// packages/shared-core/hooks/useOfferteManager.jsx

import { useState, useCallback } from 'react';
import { doc, setDoc, updateDoc, collection, serverTimestamp, arrayUnion, addDoc } from 'firebase/firestore';
import { useDocumentiManager } from './useDocumentiManager';
import { useClientsManager } from './useClientsManager';
import { useAgendaAction } from './useAgendaAction.jsx'; 
import { offertaSchema } from '../data/schemas';

export const useOfferteManager = (db, storage, user, companyId) => {
   console.log("🕵️‍♂️ [DEBUG useOfferteManager] Valore DB Principale:", db);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleError = useCallback((err) => {
        console.error("❌ [useOfferteManager] Errore:", err);
        setError(err.message || "Si è verificato un errore.");
        setIsSaving(false);
    }, []);
console.log("🕵️‍♂️ [DEBUG useOfferteManager] Sto passando DB ai manager interni. DB è:", db);
    const documentiManager = useDocumentiManager(db, storage, user, companyId);
    const clientsManager = useClientsManager(db, user);
    const agendaAction = useAgendaAction(db, companyId, user); 

    const updateOfferta = async (offertaId, datiDaAggiornare) => {
        const offertaRef = doc(db, 'offerte', offertaId);
        await updateDoc(offertaRef, {
            ...datiDaAggiornare,
            updatedAt: serverTimestamp(),
        });
    };

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
            setIsSaving(false); 
            return { success: true, id: newOffertaRef.id }; 
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message }; 
        }
    }, [db, user, companyId, handleError]);

    // --- FASE 1: SALVATAGGIO ANALISI E AGENDA ---
    const salvaAnalisiPreliminare = useCallback(async (offertaId, datiForm, nomeOfferta, clienteNome) => {
        setIsSaving(true);
        setError(null);
        try {
            const { documentiGaraFiles, ...datiAnalisiPuliti } = datiForm;
            let documentiGaraFinali = datiAnalisiPuliti.documentiGara || [];

            if (documentiGaraFiles && documentiGaraFiles.length > 0) {
                if (!storage) throw new Error("Firebase Storage non è inizializzato.");
                const uploadedDocs = await documentiManager.uploadFiles(documentiGaraFiles, `offerte/${offertaId}/documenti_gara`);
                const nuoviDocumenti = uploadedDocs.map((doc, index) => ({
                    url: doc.downloadURL,
                    name: doc.fileName,
                    categoria: documentiGaraFiles[index].categoria || 'altro',
                    caricatoIl: new Date().toISOString()
                }));
                documentiGaraFinali = [...documentiGaraFinali, ...nuoviDocumenti];
            }

            if (datiAnalisiPuliti.necessitaSopralluogo && datiAnalisiPuliti.dataSopralluogo && datiAnalisiPuliti.assegnatarioSopralluogo) {
                const dataStr = datiAnalisiPuliti.dataSopralluogo; 
                const oraStr = datiAnalisiPuliti.oraSopralluogo || '09:00'; 
                const [hours, minutes] = oraStr.split(':').map(Number);
                const eventDate = new Date(dataStr);
                eventDate.setHours(hours, minutes, 0, 0);
                const endDate = new Date(eventDate);
                endDate.setHours(hours + 2, minutes, 0, 0); 

                const eventoData = {
                    title: `Sopralluogo: ${clienteNome || 'Cliente'} - ${nomeOfferta || 'Offerta'}`,
                    description: datiAnalisiPuliti.noteInterne || "Sopralluogo tecnico per preventivo.",
                    start: eventDate, 
                    end: endDate,
                    tipo: 'sopralluogo',
                    partecipanti: [{ userId: datiAnalisiPuliti.assegnatarioSopralluogo, ruolo: 'tecnico' }],
                    offertaId: offertaId,
                    titolo: `Sopralluogo: ${clienteNome || 'Cliente'} - ${nomeOfferta || 'Offerta'}`,
                    descrizione: datiAnalisiPuliti.noteInterne || "Sopralluogo tecnico per preventivo.",
                    data: dataStr, 
                    dataStringa: dataStr,
                    orario: oraStr,
                    orarioInizio: oraStr,
                    oraPrevista: oraStr,
                    assegnatoA: datiAnalisiPuliti.assegnatarioSopralluogo, 
                    userId: datiAnalisiPuliti.assegnatarioSopralluogo,
                    dipendenteId: datiAnalisiPuliti.assegnatarioSopralluogo,
                    completato: false
                };
                await agendaAction.addEvento(eventoData);
                datiAnalisiPuliti.statoSopralluogo = 'assegnato';
                datiAnalisiPuliti.tecnicoAssegnato = datiAnalisiPuliti.assegnatarioSopralluogo;
            }

            datiAnalisiPuliti.documentiGara = documentiGaraFinali;

            const datiDaSalvare = {
               datiAnalisi: datiAnalisiPuliti,
               stato: 'in_elaborazione',
               faseCorrente: 2, 
            };

            await updateOfferta(offertaId, datiDaSalvare);
            setIsSaving(false);
            return { success: true, message: "Analisi preliminare salvata." };

        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [db, handleError, documentiManager, storage, agendaAction]);

    // --- FASE 2: SALVATAGGIO ELABORAZIONE E NOTIFICA ---
    const salvaElaborazione = useCallback(async (offertaId, datiElaborazione) => {
        setIsSaving(true);
        setError(null);
        try {
            const { docCMECompilatoFiles, ...datiPuliti } = datiElaborazione;
            let cmeFinali = datiPuliti.docCMECompilato || [];

            if (docCMECompilatoFiles && docCMECompilatoFiles.length > 0) {
                if (!storage) throw new Error("Firebase Storage non è inizializzato.");
                const uploadedDocs = await documentiManager.uploadFiles(docCMECompilatoFiles, `offerte/${offertaId}/cme_compilato`);
                const nuoviDocumenti = uploadedDocs.map(doc => ({
                    url: doc.downloadURL,
                    name: doc.fileName,
                    caricatoIl: new Date().toISOString()
                }));
                cmeFinali = [...cmeFinali, ...nuoviDocumenti];
            }

            datiPuliti.docCMECompilato = cmeFinali;
            const nuovoStato = datiPuliti.approvazioneNecessaria ? 'in_approvazione' : 'pronta_per_invio';

            const datiDaSalvare = {
                datiElaborazione: datiPuliti,
                stato: nuovoStato,
                faseCorrente: 2, 
            };

            await updateOfferta(offertaId, datiDaSalvare);

            // ✅ PAYLOAD NOTIFICA "UNIVERSALE" A DOPPIA CHIAVE
            if (nuovoStato === 'in_approvazione' && datiPuliti.utenteApprovazioneId) {
                try {
                    const notificheRef = collection(db, 'notifiche');
                    const payloadNotifica = {
                        // Chiavi in Italiano (Nuovo Standard)
                        userId: datiPuliti.utenteApprovazioneId, 
                        mittenteId: user?.uid || user?.id || 'sistema',
                        titolo: "Richiesta Approvazione Preventivo",
                        messaggio: "Una nuova offerta è in attesa della tua approvazione per l'invio al cliente.",
                        tipo: "approvazione_offerta", 
                        offertaId: offertaId, 
                        companyID: companyId || null,
                        letta: false,
                        
                        // Chiavi in Inglese (Fallback per vecchi componenti UI)
                        destinatarioId: datiPuliti.utenteApprovazioneId,
                        title: "Richiesta Approvazione Preventivo",
                        message: "Una nuova offerta è in attesa della tua approvazione per l'invio al cliente.",
                        type: "approvazione_offerta",
                        companyId: companyId || null,
                        read: false,
                        
                        data: serverTimestamp(),
                        createdAt: serverTimestamp()
                    };
                    
                    await addDoc(notificheRef, payloadNotifica);
                } catch (notifErr) {
                    console.error("❌ ERRORE NOTIFICA:", notifErr);
                }
            }

            setIsSaving(false);
            return { success: true, message: "Dati elaborazione salvati." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    }, [db, handleError, documentiManager, storage, user, companyId]);

    // --- ALTRE FUNZIONI (RIMANGONO INVARIATE) ---
    const approvaOfferta = useCallback(async (offertaId) => {
         setIsSaving(true);
         setError(null);
        try {
            await updateOfferta(offertaId, { stato: 'pronta_per_invio', faseCorrente: 3, dataApprovazione: serverTimestamp() });
            setIsSaving(false);
            return { success: true, message: "Offerta approvata." };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    }, [handleError]);

    const inviaOfferta = useCallback(async (offertaId, daPiattaforma = false) => {
        setIsSaving(true); setError(null);
        try {
            if (!offertaId) throw new Error("ID Offerta mancante.");
            await updateDoc(doc(db, 'offerte', offertaId), { stato: 'inviata', faseCorrente: 3, dataInvio: serverTimestamp(), inviataDaPiattaforma: daPiattaforma, updatedAt: serverTimestamp() });
            setIsSaving(false);
            return { success: true, message: "Offerta inviata." };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    }, [db, handleError]);

    const accettaOfferta = useCallback(async (offertaId) => {
        setIsSaving(true); setError(null);
        try {
            await updateOfferta(offertaId, { stato: 'convertita_in_cantiere', dataEsito: serverTimestamp() });
            setIsSaving(false); return { success: true, message: "Offerta convertita." };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    }, [handleError]);

    const rifiutaOfferta = useCallback(async (offertaId) => {
        setIsSaving(true); setError(null);
        try {
            await updateOfferta(offertaId, { stato: 'rifiutata', dataEsito: serverTimestamp() });
            setIsSaving(false); return { success: true, message: "Offerta rifiutata." };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    }, [handleError]);

    const archiveOfferta = useCallback(async (offertaId) => {
        setIsSaving(true); setError(null);
        try {
            await updateOfferta(offertaId, { stato: 'archiviata' });
            setIsSaving(false); return { success: true, message: "Offerta archiviata." };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    }, [handleError]);

    const logProroga = useCallback(async (offertaId, userId) => {
        setIsSaving(true); setError(null);
        try {
            await updateDoc(doc(db, 'offerte', offertaId), { logProroghe: arrayUnion({ userId: userId, timestamp: new Date().toISOString() }) });
            setIsSaving(false); return { success: true, message: "Proroga registrata." };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    }, [db, handleError]); 

    const aggiungiReferenteCliente = useCallback(async (clienteId, datiReferente, nomeOfferta) => {
        setError(null); 
        try {
             await clientsManager.addReferente(clienteId, datiReferente, { context: `Offerta: ${nomeOfferta}` });
             return { success: true };
        } catch(err) { handleError(err); return { success: false, message: err.message }; }
    }, [clientsManager, handleError]);

    const salvaSopralluogoReport = async (offertaId, reportData) => {
        setIsSaving(true); setError(null);
        try {
            await updateDoc(doc(db, 'offerte', offertaId), {
                datiSopralluogoReport: { ...reportData, salvatoIl: new Date().toISOString(), salvatoDa: user?.uid || user?.id || 'sconosciuto' },
            });
            setIsSaving(false); return { success: true, message: 'Report salvato!' };
        } catch (err) { handleError(err); return { success: false, message: err.message }; }
    };

    return {
        isSaving, error, addOfferta, archiveOfferta, salvaAnalisiPreliminare,
        aggiungiReferenteCliente, salvaElaborazione, approvaOfferta,
        salvaSopralluogoReport, logProroga, inviaOfferta, accettaOfferta, rifiutaOfferta
    };
};