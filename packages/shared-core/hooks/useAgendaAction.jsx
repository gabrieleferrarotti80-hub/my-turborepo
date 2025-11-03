// packages/shared-core/hooks/useAgendaAction.jsx

import { useState } from 'react';
// ✅ IMPORTA getDoc
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, getDoc } from 'firebase/firestore'; 
import { eventoSchema } from '../data/schemas.js';

export const useAgendaAction = (db, userAziendaId, user) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getUserId = () => user?.uid || user?.id;

    const aggiornaStatoEvento = async (docId, nuovoStato, messaggio = '') => {
        // ... (questa funzione rimane invariata)
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
    // ❌ La funzione 'proponiModifica' (riga 45) è stata rimossa. La sua logica è ora in 'updateEvento'.

    const addEvento = async (eventoData) => {
        // ... (questa funzione rimane invariata)
        setIsLoading(true);
        setError(null);
        try {
            const creatoreId = getUserId();
            if (!userAziendaId || !creatoreId) {
                throw new Error("Utente non valido o azienda non selezionata.");
            }
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
                companyID: userAziendaId, 
                stato: isAssignedToOther ? 'da_confermare' : 'confermato',
                partecipanti: partecipantiFinali,
                storico: [{ azione: 'creazione', da: creatoreId, data: new Date() }],
                createdAt: serverTimestamp(),
                formTemplateId: eventoData.formTemplateId || null,
                offertaId: eventoData.offertaId || null,
            };
            delete newEvento.tecnicoId; 
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

    // --- ✅ FUNZIONE 'updateEvento' SOSTITUITA CON LOGICA INTELLIGENTE ---
    const updateEvento = async (docId, eventoData) => {
        console.log(`%c[useAgendaAction] updateEvento "Intelligente" INIZIATO per docId: ${docId}`, 'color: blue', eventoData);
        setIsLoading(true);
        setError(null);
        try {
            const userId = getUserId(); // Chi sta modificando?
            if (!userId) throw new Error("ID Utente non trovato.");

            const docRef = doc(db, 'eventi', docId);

            // --- 1. Recupera l'evento corrente per capire i ruoli e lo stato
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error("Evento non trovato.");
            }
            const eventoCorrente = docSnap.data();

            // --- 2. Determina ruoli e contesto
            const organizzatore = eventoCorrente.partecipanti.find(p => p.ruolo === 'organizzatore');
            const isOrganizzatore = organizzatore?.userId === userId;
            // Un 'invitato' è chiunque sia partecipante MA non organizzatore
            const isInvitato = eventoCorrente.partecipanti.some(p => p.userId === userId && p.ruolo !== 'organizzatore'); 

            let nuovoStato = eventoCorrente.stato;
            let azioneStorico = 'modifica'; // Azione di default
            let notificaDestinatario = null;
            let notificaMessaggio = '';

            // --- 3. Applica la logica di negoziazione
            if (isInvitato && (eventoCorrente.stato === 'da_confermare' || eventoCorrente.stato === 'modifica_proposta')) {
                // CASO A: Il Preposto (invitato) propone una modifica
                nuovoStato = 'modifica_proposta'; // Imposta lo stato a "proposta"
                azioneStorico = 'modifica_proposta';
                if (organizzatore) {
                    notificaDestinatario = organizzatore.userId; // Notifica all'Admin
                    notificaMessaggio = `Il tecnico ha proposto una modifica per: "${eventoData.title}"`;
                }
            } else if (isOrganizzatore && eventoCorrente.stato === 'modifica_proposta') {
                // CASO B: L'Admin risponde a una proposta (facendo una controproposta)
                nuovoStato = 'da_confermare'; // Rimanda "da confermare" al tecnico
                azioneStorico = 'controproposta';
                const invitati = eventoCorrente.partecipanti.filter(p => p.ruolo !== 'organizzatore');
                if (invitati.length > 0) {
                    // TODO: Notificare a tutti gli invitati, per ora solo al primo
                    notificaDestinatario = invitati[0].userId; 
                    notificaMessaggio = `L'amministratore ha modificato l'evento: "${eventoData.title}"`;
                }
            } else if (isOrganizzatore && eventoCorrente.stato === 'confermato') {
                // CASO C: L'Admin modifica un evento già confermato (es. sposta orario)
                nuovoStato = 'da_confermare'; // L'evento deve essere riconfermato dal tecnico
                azioneStorico = 'modifica';
                const invitati = eventoCorrente.partecipanti.filter(p => p.ruolo !== 'organizzatore');
                 if (invitati.length > 0) {
                    notificaDestinatario = invitati[0].userId; 
                    notificaMessaggio = `L'evento "${eventoData.title}" è stato modificato e richiede riconferma.`;
                }
            }
            // (Altrimenti, è una modifica standard, es. utente che modifica un suo evento personale,
            // o admin che modifica un evento 'da_confermare' -> lo stato non cambia)

            const eventoStorico = {
                azione: azioneStorico,
                da: userId,
                data: new Date()
            };

            // Prepara i dati da aggiornare
            const datiAggiornati = {
                ...eventoData, // Contiene i nuovi: title, start, end, description, partecipanti
                start: new Date(eventoData.start), 
                end: eventoData.end ? new Date(eventoData.end) : null,
                stato: nuovoStato, // <-- STATO DI NEGOZIAZIONE AGGIORNATO
                storico: arrayUnion(eventoStorico),
                updatedAt: serverTimestamp(),
                // (Mantiene i campi specifici come formTemplateId e offertaId se presenti in eventoData)
                ...(eventoData.formTemplateId !== undefined && { formTemplateId: eventoData.formTemplateId || null }),
                ...(eventoData.offertaId !== undefined && { offertaId: eventoData.offertaId || null }),
            };
            
            // Pulisci campi che non devono essere sovrascritti
            delete datiAggiornati.id; 
            delete datiAggiornati.companyID; 
            delete datiAggiornati.createdAt; 

            await updateDoc(docRef, datiAggiornati);

            // --- 4. Invia la notifica se necessario
            if (notificaDestinatario) {
                const notificheCollectionRef = collection(db, 'notifiche');
                await addDoc(notificheCollectionRef, {
                    destinatarioId: notificaDestinatario,
                    messaggio: notificaMessaggio,
                    tipo: 'modifica_evento', // Tipo notifica
                    riferimentoId: docId,
                    letta: false,
                    createdAt: serverTimestamp(),
                });
            }

            console.log(`%c[useAgendaAction] updateEvento COMPLETATO con successo per docId: ${docId}`, 'color: blue; font-weight: bold;');
            return { success: true, message: 'Evento modificato con successo!' };
        } catch (err) {
            console.error(`%c[useAgendaAction] ERRORE durante updateEvento per docId: ${docId}`, 'color: red', err);
            setError(err);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };
    // --- FINE FUNZIONE 'updateEvento' SOSTITUITA ---


    const creaNotaInvioMail = async (userId, offerta) => {
        // ... (questa funzione rimane invariata)
         console.log(`[useAgendaAction] Creazione nota invio email per offerta ${offerta?.id} per utente ${userId}`);
         if (!userId || !offerta?.id || !offerta?.nomeOfferta) {
            return { success: false, message: "Dati insufficienti per creare la nota." };
         }
         const oraNota = new Date();
         oraNota.setHours(oraNota.getHours() + 1); 
         const eventoData = {
            title: `Invia email per Gara "${offerta.nomeOfferta}"`,
            start: oraNota,
            end: null, 
            description: `Ricordati di inviare l'email preparata per la partecipazione alla gara "${offerta.nomeOfferta}" (ID: ${offerta.id}). Controlla la cartella Bozze.`,
            partecipanti: [{ userId: userId, ruolo: 'responsabile' }], 
            offertaId: offerta.id,
            tipo: 'nota_invio_email', 
         };
         return await addEvento(eventoData);
    };

    const rejectEvento = async (docId) => {
        // ... (questa funzione rimane invariata)
        return aggiornaStatoEvento(docId, 'rifiutato');
    };

    const deleteEvento = async (docId) => {
        // ... (questa funzione rimane invariata)
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

    const creaNotaApprovazione = async (utenteId, offerta, riepilogo) => {
        // ... (questa funzione rimane invariata)
        console.log(`[useAgendaAction] Creazione nota approvazione per utente ${utenteId}`);
        const domani = new Date();
        domani.setDate(domani.getDate() + 1);
        domani.setHours(9, 0, 0, 0); 
        const descrizione = `
Richiesta approvazione per l'offerta: ${offerta.nomeOfferta} (ID: ${offerta.id})
Riepilogo:
- Valore: ${riepilogo.valore || 'N/D'} €
- Sconto: ${riepilogo.sconto || 0} %
- Utile Previsto: ${riepilogo.utile ? riepilogo.utile.toFixed(2) : 'N/D'} €
- Tempistiche: ${riepilogo.tempistiche || 'N/D'}
        `.trim();
        const eventoData = {
            title: `Approvazione Offerta: ${offerta.nomeOfferta}`,
            start: domani, 
            end: null, 
            description: descrizione,
            partecipanti: [{ userId: utenteId, ruolo: 'approvatore' }],
            offertaId: offerta.id, 
            tipo: 'nota_approvazione', 
        };
        return await addEvento(eventoData);
    };

    return { 
        addEvento, 
        updateEvento, // Ora è la funzione "intelligente"
        deleteEvento, 
        confermaEvento, 
        rifiutaEvento, 
        // ❌ 'proponiModifica' rimosso dal return
        creaNotaApprovazione,
        creaNotaInvioMail,
        isLoading, 
        error 
    };
};