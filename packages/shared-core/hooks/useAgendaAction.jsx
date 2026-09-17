// packages/shared-core/hooks/useAgendaAction.jsx

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, getDoc } from 'firebase/firestore'; 
import { eventoSchema } from '../data/schemas.js';

export const useAgendaAction = (db, userAziendaId, user) => {
    console.log("🕵️‍♂️ [DEBUG useAgendaAction] Valore DB:", db);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getUserId = () => user?.uid || user?.id;
    const getUserName = () => `${user?.nome || ''} ${user?.cognome || ''}`.trim() || 'Un utente';

    const getEventActors = (eventoData) => {
        const creatoreId = eventoData.createdBy || eventoData.partecipanti?.find(p => p.ruolo === 'organizzatore')?.userId;
        const assegnatarioId = eventoData.assegnatoA || eventoData.userId || eventoData.partecipanti?.find(p => p.userId !== creatoreId)?.userId;
        return { creatoreId, assegnatarioId };
    };

 // 🚀 NUOVO MOTORE NOTIFICHE UNIVERSALE E "CORAZZATO" CON DEBUG ESTREMO
    const inviaNotifica = async (destinatarioId, titolo, messaggio, tipo, riferimentoId = null) => {
        if (!destinatarioId) return;
        try {
            const payload = {
                // Identificativi utente
                destinatarioId: destinatarioId,
                userId: destinatarioId, 
                // Identificativi azienda
                companyID: userAziendaId,
                companyId: userAziendaId,
                // Contenuto testuale
                titolo: titolo,
                title: titolo,
                messaggio: messaggio,
                message: messaggio,
                tipo: tipo,
                type: tipo,
                // Metadati operativi
                riferimentoId: riferimentoId,
                eventId: riferimentoId,
                letta: false,
                read: false,
                createdAt: serverTimestamp(),
                data: serverTimestamp() 
            };

            console.log("🔔 [DEBUG NOTIFICHE - INVIO] Sto creando una notifica con questo payload:", JSON.stringify(payload, null, 2));

            const docRef = await addDoc(collection(db, 'notifiche'), payload);
            console.log(`🔔 [DEBUG NOTIFICHE - SUCCESSO] Notifica creata nel DB con ID: ${docRef.id}`);
        } catch (err) {
            console.error("🔔 [DEBUG NOTIFICHE - ERRORE] Errore durante l'invio:", err);
        }
    };

    const addEvento = async (eventoData) => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUserId = getUserId();
            if (!userAziendaId || !currentUserId) throw new Error("Utente o azienda non validi.");
            
            let partecipantiFinali = eventoData.partecipanti || [];
            if (!partecipantiFinali.some(p => p.userId === currentUserId)) {
                partecipantiFinali.push({ userId: currentUserId, ruolo: 'organizzatore' });
            }
            
            const isAssignedToOther = partecipantiFinali.some(p => p.userId !== currentUserId);
            
            const newEvento = {
                ...eventoSchema,
                ...eventoData,
                start: new Date(eventoData.start),
                end: eventoData.end ? new Date(eventoData.end) : null,
                companyID: userAziendaId, 
                stato: isAssignedToOther ? 'da_confermare' : 'confermato',
                partecipanti: partecipantiFinali,
                storico: [{ azione: 'creazione', da: currentUserId, data: new Date() }],
                createdAt: serverTimestamp(),
                createdBy: currentUserId, 
                formTemplateId: eventoData.formTemplateId || null,
                offertaId: eventoData.offertaId || null,
            };
            
            const docRef = await addDoc(collection(db, 'eventi'), newEvento);
            
            // Invio Notifica Creazione
            const altriPartecipanti = partecipantiFinali.filter(p => p.userId !== currentUserId);
            for (const p of altriPartecipanti) {
                await inviaNotifica(
                    p.userId, 
                    "Nuovo Appuntamento", 
                    `${getUserName()} ti ha assegnato un appuntamento: "${eventoData.title || eventoData.titolo}"`, 
                    "nuovo_evento", 
                    docRef.id
                );
            }
            return { success: true, message: 'Evento creato con successo!' };
        } catch (err) {
            setError(err);
            return { success: false, message: err.message };
        } finally { setIsLoading(false); }
    };

    const confermaEvento = async (docId) => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUserId = getUserId();
            const docRef = doc(db, 'eventi', docId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) throw new Error("Evento non trovato.");
            
            const evento = docSnap.data();
            const { creatoreId, assegnatarioId } = getEventActors(evento);

            await updateDoc(docRef, {
                stato: 'confermato',
                storico: arrayUnion({ azione: 'conferma', da: currentUserId, data: new Date() })
            });

            // Invio Notifica Conferma
            const notificaDestinatario = currentUserId === creatoreId ? assegnatarioId : creatoreId;
            if (notificaDestinatario && notificaDestinatario !== currentUserId) {
                await inviaNotifica(
                    notificaDestinatario, 
                    "Appuntamento Confermato", 
                    `${getUserName()} ha CONFERMATO l'appuntamento: "${evento.title || evento.titolo}"`, 
                    "evento_confermato", 
                    docId
                );
            }
            return { success: true, message: 'Evento confermato!' };
        } catch (err) {
            setError(err);
            return { success: false, message: err.message };
        } finally { setIsLoading(false); }
    };

    const rifiutaEvento = async (docId) => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUserId = getUserId();
            const docRef = doc(db, 'eventi', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const evento = docSnap.data();
                const { creatoreId, assegnatarioId } = getEventActors(evento);

                // Invio Notifica Annullamento
                const notificaDestinatario = currentUserId === creatoreId ? assegnatarioId : creatoreId;
                if (notificaDestinatario && notificaDestinatario !== currentUserId) {
                    await inviaNotifica(
                        notificaDestinatario, 
                        "Appuntamento Annullato", 
                        `${getUserName()} ha RIFIUTATO e annullato l'appuntamento: "${evento.title || evento.titolo}"`, 
                        "evento_annullato"
                    );
                }
                await deleteDoc(docRef);
            }
            return { success: true, message: 'L\'appuntamento è stato annullato.' };
        } catch (err) {
            setError(err);
            return { success: false, message: err.message };
        } finally { setIsLoading(false); }
    };

    const updateEvento = async (docId, eventoData) => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUserId = getUserId();
            const docRef = doc(db, 'eventi', docId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) throw new Error("Evento non trovato.");
            const eventoCorrente = docSnap.data();

            const { creatoreId, assegnatarioId } = getEventActors(eventoCorrente);
            const isCreator = currentUserId === creatoreId;

            let nuovoStato = 'confermato';
            let azioneStorico = 'modifica';
            let notificaDestinatario = null;
            let notificaMessaggio = '';
            let notificaTitolo = 'Appuntamento Modificato';

            if (creatoreId !== assegnatarioId && assegnatarioId) {
                if (isCreator) {
                    nuovoStato = 'da_confermare';
                    azioneStorico = 'controproposta';
                    notificaDestinatario = assegnatarioId;
                    notificaTitolo = "Modifica Appuntamento";
                    notificaMessaggio = `${getUserName()} ha modificato l'appuntamento: "${eventoData.title || eventoCorrente.title || ''}". Attende una tua conferma.`;
                } else {
                    nuovoStato = 'modifica_proposta';
                    azioneStorico = 'modifica_proposta';
                    notificaDestinatario = creatoreId;
                    notificaTitolo = "Proposta Modifica Orario";
                    notificaMessaggio = `${getUserName()} ha PROPOSTO UNA MODIFICA per l'appuntamento: "${eventoData.title || eventoCorrente.title || ''}".`;
                }
            }

            const datiAggiornati = {
                ...eventoData, 
                start: new Date(eventoData.start), 
                end: eventoData.end ? new Date(eventoData.end) : null,
                stato: nuovoStato, 
                storico: arrayUnion({ azione: azioneStorico, da: currentUserId, data: new Date() }),
                updatedAt: serverTimestamp(),
                
                partecipanti: eventoCorrente.partecipanti || [],
                assegnatoA: eventoCorrente.assegnatoA || null,
                userId: eventoCorrente.userId || null,
                createdBy: eventoCorrente.createdBy || null,
            };
            
            Object.keys(datiAggiornati).forEach(key => {
                if (datiAggiornati[key] === undefined) delete datiAggiornati[key];
            });
            delete datiAggiornati.id; delete datiAggiornati.companyID; delete datiAggiornati.createdAt; 

            await updateDoc(docRef, datiAggiornati);

            // Invio Notifica Modifica
            if (notificaDestinatario && notificaDestinatario !== currentUserId) {
                await inviaNotifica(
                    notificaDestinatario, 
                    notificaTitolo, 
                    notificaMessaggio, 
                    "modifica_evento", 
                    docId
                );
            }
            return { success: true, message: 'Modifica salvata e inviata alla controparte!' };
        } catch (err) {
            setError(err);
            return { success: false, message: err.message };
        } finally { setIsLoading(false); }
    };

    const deleteEvento = async (docId) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'eventi', docId));
            return { success: true, message: 'Evento eliminato.' };
        } catch (err) {
            setError(err);
            return { success: false, message: err.message };
        } finally { setIsLoading(false); }
    };

    const creaNotaInvioMail = async (userId, offerta) => {
         const oraNota = new Date(); oraNota.setHours(oraNota.getHours() + 1); 
         return await addEvento({
            title: `Invia email per Gara "${offerta.nomeOfferta}"`,
            start: oraNota, description: `Ricordati di inviare l'email.`,
            partecipanti: [{ userId: userId, ruolo: 'organizzatore' }], 
            offertaId: offerta.id, tipo: 'nota_invio_email', 
         });
    };

    const creaNotaApprovazione = async (utenteId, offerta, riepilogo) => {
        const domani = new Date(); domani.setDate(domani.getDate() + 1); domani.setHours(9, 0, 0, 0); 
        return await addEvento({
            title: `Approvazione Offerta: ${offerta.nomeOfferta}`,
            start: domani, 
            description: `Richiesta approvazione.\nValore: ${riepilogo.valore} €`,
            partecipanti: [{ userId: utenteId, ruolo: 'approvatore' }],
            offertaId: offerta.id, tipo: 'nota_approvazione', 
        });
    };

    return { addEvento, updateEvento, deleteEvento, confermaEvento, rifiutaEvento, creaNotaApprovazione, creaNotaInvioMail, isLoading, error };
};