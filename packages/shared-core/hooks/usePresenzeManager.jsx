import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';

const toTimestamp = (dateString) => {
    return Timestamp.fromDate(new Date(dateString));
};

export const usePresenzeManager = (db, user, userAziendaId) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const UID = user?.uid || user?.id;

    const creaNuovoStato = async (stato, datiAggiuntivi = {}) => {
        setIsSaving(true);
        setError(null);
        if (!UID || !userAziendaId) {
            setError(new Error("Utente non valido"));
            setIsSaving(false);
            return { success: false, message: "Utente non valido" };
        }

        try {
            await addDoc(collection(db, 'presenze'), {
                userId: UID,
                companyID: userAziendaId,
                stato: stato,
                // 🌟 FIX: Usa il Timestamp sincronizzato del device per evitare latenze e "buchi" di null in rete
                timestampInizio: Timestamp.now(), 
                timestampFine: null,
                ...datiAggiuntivi
            });
            setIsSaving(false);
            return { success: true, message: `Stato "${stato}" registrato!` };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    const checkIn = async () => {
        setIsSaving(true);
        setError(null);
        
        if (!UID || !userAziendaId) {
            setIsSaving(false);
            return { success: false, message: "Utente non valido" };
        }

        try {
            // Chiusura Automatica a mezzanotte dei giorni precedenti (Mantenuto)
            const qAperte = query(
                collection(db, 'presenze'),
                where('userId', '==', UID),
                where('timestampFine', '==', null)
            );
            const snapshot = await getDocs(qAperte);
            
            const oggi = new Date();
            oggi.setHours(0, 0, 0, 0);

            const chiusurePromises = [];
            
            snapshot.forEach((docSnap) => {
                const dataPresenza = docSnap.data();
                if (dataPresenza.stato === 'lavoro' && dataPresenza.timestampInizio) {
                    const dInizio = dataPresenza.timestampInizio.toDate();
                    if (dInizio < oggi) {
                        const fineForzata = new Date(dInizio);
                        fineForzata.setHours(23, 59, 59, 999);
                        chiusurePromises.push(
                            updateDoc(doc(db, 'presenze', docSnap.id), {
                                timestampFine: Timestamp.fromDate(fineForzata),
                                note: (dataPresenza.note ? dataPresenza.note + " | " : "") + "[Chiusura automatica 23:59]"
                            })
                        );
                    }
                }
            });

            if (chiusurePromises.length > 0) {
                await Promise.all(chiusurePromises);
            }

            return await creaNuovoStato('lavoro');
            
        } catch (err) {
            console.error("Errore checkIn:", err);
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    const checkOut = async (idStatoCorrente) => {
        setIsSaving(true);
        setError(null);
        try {
            const docRef = doc(db, 'presenze', idStatoCorrente);
            await updateDoc(docRef, {
                // 🌟 FIX: Rimosso serverTimestamp()! 
                // Usando il tempo di Firebase c'era un istante in cui ritornava 'null' al frontend distruggendo l'App. 
                // Ora usa il tempo sincronizzato, che chiude la pratica senza latenze.
                timestampFine: Timestamp.now() 
            });
            setIsSaving(false);
            return { success: true, message: "Lavoro terminato!" };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    const segnalaMalattia = async (dataInizio, dataFine, note = '') => {
        return await creaNuovoStato('malattia', {
            timestampInizio: toTimestamp(dataInizio),
            dataFinePrevista: toTimestamp(dataFine),
            note: note
        });
    };

    const segnalaInfortunio = async (dataInizio, dataFine, note = '') => {
        return await creaNuovoStato('infortunio', {
            timestampInizio: toTimestamp(dataInizio),
            dataFinePrevista: toTimestamp(dataFine),
            note: note
        });
    };
    
    const segnalaPioggia = async (note = '') => {
        return await creaNuovoStato('pioggia', { note: note });
    };
    
    const prorogaAssenza = async (idStatoCorrente, nuovaDataFine, note = '') => {
        setIsSaving(true);
        setError(null);
         try {
            const docRef = doc(db, 'presenze', idStatoCorrente);
            await updateDoc(docRef, {
                dataFinePrevista: toTimestamp(nuovaDataFine),
                note: note, 
                prorogata: true
            });
            setIsSaving(false);
            return { success: true, message: "Assenza prorogata." };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    const segnalaErrore = async (nota, dataRiferimento) => {
        setIsSaving(true);
        setError(null);
        if (!UID || !userAziendaId) {
            setError(new Error("Utente non valido"));
            setIsSaving(false);
            return { success: false, message: "Utente non valido" };
        }
        const dataRiferimentoTs = (dataRiferimento?.toDate) ? dataRiferimento : Timestamp.fromDate(dataRiferimento || new Date()); 

        try {
            await addDoc(collection(db, 'segnalazioniErrori'), {
                userId: UID,
                companyID: userAziendaId,
                tipo: 'presenze',
                nota: nota,
                timestamp: serverTimestamp(), 
                dataRiferimento: dataRiferimentoTs, 
                stato: 'da_gestire'
            });
            setIsSaving(false);
            return { success: true, message: "Segnalazione inviata!" };
        } catch (err) {
            setError(err);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    return { 
        isSaving, error, checkIn, checkOut,
        segnalaMalattia, segnalaInfortunio, segnalaPioggia, prorogaAssenza, segnalaErrore
    };
};