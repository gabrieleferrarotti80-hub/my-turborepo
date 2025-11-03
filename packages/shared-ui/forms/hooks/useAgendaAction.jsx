// packages/shared-core/hooks/useAgendaAction.jsx

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { eventoSchema } from '../data/schemas.js';

export const useAgendaAction = (db, userAziendaId, user) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getUserId = () => user?.uid || user?.id;

    const aggiornaStatoEvento = async (docId, nuovoStato, messaggio = '') => {
        setIsLoading(true);
        setError(null);
        try {
            const userId = getUserId();
            if (!userId) throw new Error("ID Utente non trovato.");
            const docRef = doc(db, 'eventi', docId);
            const nuovoEventoStorico = {
                azione: nuovoStato,
                da: userId,
                data: new Date(),
                ...(messaggio && { messaggio })
            };
            await updateDoc(docRef, {
                stato: nuovoStato,
                storico: arrayUnion(nuovoEventoStorico)
            });
            return { success: true, message: 'Stato evento aggiornato.' };
        } catch (err) {
            console.error(`Errore durante l'aggiornamento dello stato a ${nuovoStato}:`, err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const confermaEvento = (docId) => aggiornaStatoEvento(docId, 'confermato');
    const rifiutaEvento = (docId) => aggiornaStatoEvento(docId, 'rifiutato');
    const proponiModifica = (docId, messaggio) => aggiornaStatoEvento(docId, 'modifica_proposta', messaggio);

    const addEvento = async (eventoData) => {
        setIsLoading(true);
        setError(null);
        try {
            const creatoreId = getUserId();
            // ✅ Utilizza la variabile corretta 'userAziendaId' fornita dall'hook
            if (!userAziendaId || !creatoreId) {
                throw new Error("Utente non valido o azienda non selezionata.");
            }

            // ✅ Logica basata esclusivamente sull'array 'partecipanti'
            let partecipantiFinali = eventoData.partecipanti || [];
            const creatorePresente = partecipantiFinali.some(p => p.userId === creatoreId);
            if (!creatorePresente) {
                partecipantiFinali.push({ userId: creatoreId, ruolo: 'organizzatore' });
            }

            const isAssignedToOther = partecipantiFinali.some(p => p.userId !== creatoreId);

            const newEvento = {
                ...eventoSchema,
                ...eventoData,
                start: new Date(eventoData.start),
                end: eventoData.end ? new Date(eventoData.end) : null,
                companyID: userAziendaId, // ✅ Usa la variabile corretta
                stato: isAssignedToOther ? 'da_confermare' : 'confermato',
                partecipanti: partecipantiFinali,
                storico: [{ azione: 'creazione', da: creatoreId, data: new Date() }],
                createdAt: serverTimestamp(),
                formTemplateId: eventoData.formTemplateId || null,
                offertaId: eventoData.offertaId || null,
            };
            
            delete newEvento.tecnicoId; // Rimuove la vecchia proprietà per pulizia

            const docCollectionRef = collection(db, 'eventi');
            const newDocRef = await addDoc(docCollectionRef, newEvento);

            const altriPartecipanti = partecipantiFinali.filter(p => p.userId !== creatoreId);
            if (altriPartecipanti.length > 0) {
                const notificheCollectionRef = collection(db, 'notifiche');
                for (const partecipante of altriPartecipanti) {
                    await addDoc(notificheCollectionRef, {
                        destinatarioId: partecipante.userId,
                        messaggio: `Ti è stato assegnato un nuovo evento: "${eventoData.title}"`,
                        tipo: 'nuovo_evento',
                        riferimentoId: newDocRef.id,
                        letta: false,
                        createdAt: serverTimestamp(),
                    });
                }
            }
            
            return { success: true, message: 'Evento aggiunto con successo!' };
        } catch (err) {
            console.error("Errore durante l'aggiunta dell'evento:", err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const updateEvento = async (docId, eventoData) => {
        console.log(`%c[useAgendaAction] updateEvento INIZIATO per docId: ${docId}`, 'color: cyan', eventoData); // Log A
        setIsLoading(true);
        setError(null);
        try {
            const userId = getUserId();
            if (!userId) throw new Error("ID Utente non trovato.");
            
            const docRef = doc(db, 'eventi', docId);
            const eventoStorico = {
                azione: 'modifica',
                da: userId,
                data: new Date()
            };

            // Prepara i dati da aggiornare
            const datiAggiornati = {
                ...eventoData,
                start: new Date(eventoData.start), // Assicura che siano oggetti Date
                end: eventoData.end ? new Date(eventoData.end) : null,
                storico: arrayUnion(eventoStorico),
                updatedAt: serverTimestamp(), // Aggiungiamo sempre updatedAt
                ...(eventoData.formTemplateId !== undefined && { formTemplateId: eventoData.formTemplateId || null }),
                ...(eventoData.offertaId !== undefined && { offertaId: eventoData.offertaId || null }),

            }
            
            // Rimuoviamo campi che non dovrebbero essere in eventoData se arrivano dal form
            delete datiAggiornati.id; 
            delete datiAggiornati.companyID; // companyID non dovrebbe cambiare
            delete datiAggiornati.createdAt; // createdAt non dovrebbe cambiare

            await updateDoc(docRef, datiAggiornati);

            console.log(`%c[useAgendaAction] updateEvento COMPLETATO con successo per docId: ${docId}`, 'color: cyan; font-weight: bold;'); // Log B
            return { success: true, message: 'Evento modificato con successo!' };
        } catch (err) {
            console.error(`%c[useAgendaAction] ERRORE durante updateEvento per docId: ${docId}`, 'color: red', err); // Log C
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Funzione dedicata per confermare l'evento (stato: confermato)
    const confirmEvento = async (docId) => {
        return aggiornaStatoEvento(docId, 'confermato');
    };
    
// --- ✅ NUOVA FUNZIONE ---
    const creaNotaInvioMail = async (userId, offerta) => {
         console.log(`[useAgendaAction] Creazione nota invio email per offerta ${offerta?.id} per utente ${userId}`);
         if (!userId || !offerta?.id || !offerta?.nomeOfferta) {
            return { success: false, message: "Dati insufficienti per creare la nota." };
         }

         // Imposta la data/ora per la nota (es. tra 1 ora o domani)
         const oraNota = new Date();
         oraNota.setHours(oraNota.getHours() + 1); // Nota tra 1 ora

         const eventoData = {
            title: `Invia email per Gara "${offerta.nomeOfferta}"`,
            start: oraNota,
            end: null, // È una nota
            description: `Ricordati di inviare l'email preparata per la partecipazione alla gara "${offerta.nomeOfferta}" (ID: ${offerta.id}). Controlla la cartella Bozze.`,
            partecipanti: [{ userId: userId, ruolo: 'responsabile' }], // Assegna all'utente loggato
            offertaId: offerta.id,
            tipo: 'nota_invio_email', // Tipo specifico
         };

         // Riutilizza addEvento per creare la nota
         return await addEvento(eventoData);
    };
    // --- FINE NUOVA FUNZIONE ---

    // Funzione dedicata per rifiutare l'evento (stato: rifiutato)
    const rejectEvento = async (docId) => {
        return aggiornaStatoEvento(docId, 'rifiutato');
    };

    const deleteEvento = async (docId) => {
        // Questa funzione rimane invariata
        setIsLoading(true);
        setError(null);
        try {
            const docRef = doc(db, 'eventi', docId);
            await deleteDoc(docRef);
            return { success: true, message: 'Evento eliminato con successo.' };
        } catch (err) {
            console.error("Errore durante l'eliminazione dell'evento:", err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // --- ✅ FUNZIONE MANCANTE AGGIUNTA ---
    /**
     * Crea una nota in agenda per l'approvazione di un'offerta.
     * @param {string} utenteId - ID dell'utente che deve approvare.
     * @param {object} offerta - L'oggetto offerta (serve per id e nome).
     * @param {object} riepilogo - Oggetto con { valore, sconto, utile, tempistiche }.
     */
    const creaNotaApprovazione = async (utenteId, offerta, riepilogo) => {
        console.log(`[useAgendaAction] Creazione nota approvazione per utente ${utenteId}`);
        
        // Calcola il giorno successivo per la scadenza
        const domani = new Date();
        domani.setDate(domani.getDate() + 1);
        domani.setHours(9, 0, 0, 0); // Imposta alle 9:00 del mattino

        // Costruisci la descrizione dal riepilogo
        const descrizione = `
Richiesta approvazione per l'offerta: ${offerta.nomeOfferta} (ID: ${offerta.id})
Riepilogo:
- Valore: ${riepilogo.valore || 'N/D'} €
- Sconto: ${riepilogo.sconto || 0} %
- Utile Previsto: ${riepilogo.utile ? riepilogo.utile.toFixed(2) : 'N/D'} €
- Tempistiche: ${riepilogo.tempistiche || 'N/D'}
        `.trim();

        // Prepara l'oggetto evento
        const eventoData = {
            title: `Approvazione Offerta: ${offerta.nomeOfferta}`,
            start: domani, // Giorno successivo
            end: null, // È una nota, non un impegno con durata
            description: descrizione,
            partecipanti: [{ userId: utenteId, ruolo: 'approvatore' }],
            offertaId: offerta.id, // Collega l'offerta
            tipo: 'nota_approvazione', // Tipo specifico
            // companyID e creatore verranno aggiunti da addEvento
        };

        // Riutilizza la funzione addEvento per creare la nota
        // addEvento gestirà già isLoading, setError, companyID, creatore, ecc.
        return await addEvento(eventoData);
    };
    // --- FINE FUNZIONE AGGIUNTA ---


    return { 
        addEvento, 
        updateEvento, 
        deleteEvento, 
        confermaEvento, 
        rifiutaEvento, 
        proponiModifica, 
        // --- ✅ ESPORTAZIONE MANCANTE AGGIUNTA ---
        creaNotaApprovazione,
        creaNotaInvioMail,
        isLoading, 
        error 
    };
};