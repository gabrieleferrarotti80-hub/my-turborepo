import { useState } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp, deleteField } from 'firebase/firestore';

export const useAssegnazioniManager = (db, user) => {
    const [isLoading, setIsLoading] = useState(false);

    // =========================================================
    // 👷 AZIONI UTENTE (App Mobile - Preposto/Operaio)
    // =========================================================

    // 1. Conferma ricezione (Da "Da Confermare" -> "In Uso")
    const confermaPresaInCarico = async (assegnazioneId) => {
        setIsLoading(true);
        try {
            const ref = doc(db, 'assegnazioniMagazzino', assegnazioneId);
            await updateDoc(ref, { 
                statoWorkflow: 'in uso',
                stato: 'in uso', // ✅ FIX: Allineato lo stato principale
                confermaRicezione: true, // ✅ FIX: Coerenza booleana
                dataConferma: serverTimestamp(),
                storico: arrayUnion({
                    timestamp: new Date(),
                    stato: 'in uso',
                    azione: 'Conferma Ricezione',
                    autore: user?.uid || 'unknown'
                })
            });
            return { success: true, message: "Dotazione confermata." };
        } catch (error) {
            console.error(error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Richiedi Restituzione (Da "In Uso" -> "Restituzione Richiesta")
    const richiediRestituzione = async (item, note = '') => {
        setIsLoading(true);
        try {
            const id = item.id || item; 
            const ref = doc(db, 'assegnazioniMagazzino', id);
            
            await updateDoc(ref, {
                statoWorkflow: 'restituzione richiesta',
                stato: 'restituzione richiesta', // ✅ FIX
                noteRestituzione: note, 
                dataRichiestaRestituzione: serverTimestamp(),
                storico: arrayUnion({
                    timestamp: new Date(),
                    stato: 'restituzione richiesta',
                    note: note,
                    autore: user?.uid || 'unknown'
                })
            });
            return { success: true, message: "Richiesta di restituzione inviata." };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Segnala Guasto (Da "In Uso" -> "Guasto Segnalato")
    const segnalaGuasto = async (item, note) => {
        setIsLoading(true);
        try {
            const id = item.id || item;
            const ref = doc(db, 'assegnazioniMagazzino', id);

            await updateDoc(ref, {
                statoWorkflow: 'guasto segnalato', 
                stato: 'guasto segnalato', // ✅ FIX
                noteGuasto: note,                  
                dataGuasto: serverTimestamp(),
                storico: arrayUnion({
                    timestamp: new Date(),
                    stato: 'guasto segnalato',
                    note: note,
                    autore: user?.uid || 'unknown'
                })
            });
            return { success: true, message: "Guasto segnalato all'ufficio." };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================
    // 👔 AZIONI AMMINISTRAZIONE (Gestionale - Ufficio)
    // =========================================================

    // 4. Accetta Segnalazione (Da "Guasto Segnalato" -> "In Riparazione")
    const accettaSegnalazione = async (id) => {
        setIsLoading(true);
        try {
            const ref = doc(db, 'assegnazioniMagazzino', id);
            await updateDoc(ref, {
                statoWorkflow: 'in riparazione',
                stato: 'in riparazione', // ✅ FIX
                dataPresaInCarico: serverTimestamp()
            });
            return { success: true, message: "Articolo mandato in riparazione." };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // 5. Risolvi Riparazione (Da "In Riparazione" -> "Conclusa/Disponibile")
    const risolviRiparazione = async (id, esito) => {
        setIsLoading(true);
        try {
            const ref = doc(db, 'assegnazioniMagazzino', id);
            await updateDoc(ref, {
                statoWorkflow: 'conclusa', 
                stato: 'restituito', // ✅ FIX: Segna come restituito per l'HR
                esitoRiparazione: esito,
                dataRisoluzione: serverTimestamp(),
                dataRientro: serverTimestamp(), // ✅ FIX: Inseriamo il rientro
                noteGuasto: deleteField(),
                dataGuasto: deleteField()
            });
            return { success: true, message: "Riparazione conclusa: articolo rientrato." };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // 6. Accetta Restituzione (Da "Restituzione Richiesta" -> "Conclusa/Disponibile")
    const accettaRestituzione = async (assegnazioneId, articoloId) => {
        setIsLoading(true);
        try {
            const assRef = doc(db, 'assegnazioniMagazzino', assegnazioneId);
            await updateDoc(assRef, {
                statoWorkflow: 'conclusa',
                stato: 'restituito', // ✅ FIX: Ora HR sa che è tornato!
                dataFine: serverTimestamp(),
                dataRientro: serverTimestamp(), // ✅ FIX: Fondamentale per spostarlo nello "Storico"
                noteRestituzione: deleteField(), 
                dataRichiestaRestituzione: deleteField()
            });

            if (articoloId) {
                const artRef = doc(db, 'attrezzature', articoloId);
                await updateDoc(artRef, {
                    stato: 'disponibile',
                    assegnatoA: null
                });
            }

            return { success: true, message: "Restituzione accettata. Articolo in magazzino." };
        } catch (error) {
            console.error(error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        confermaPresaInCarico,
        richiediRestituzione,
        segnalaGuasto,
        accettaSegnalazione,
        risolviRiparazione,
        accettaRestituzione
    };
};