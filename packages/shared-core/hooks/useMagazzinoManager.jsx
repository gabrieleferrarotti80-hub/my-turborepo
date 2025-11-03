// packages/shared-core/hooks/useMagazzinoManager.jsx

import { useState } from 'react';
import {
    collection,
    runTransaction,
    doc,
    Timestamp,
    query,
    where,
    getDocs,
    arrayUnion
} from 'firebase/firestore';

/**
 * Hook unificato per le AZIONI di gestione del magazzino dal LATO GESTIONALE.
 * Fornisce funzioni transazionali per garantire l'integrità dei dati.
 */
export const useMagazzinoManager = (db, user) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const creaAssegnazione = async (attrezzatura, utente, companyID) => {
        setIsLoading(true);
        try {
            if (attrezzatura.stato !== 'disponibile') {
                throw new Error(`L'attrezzatura "${attrezzatura.nome}" non è disponibile.`);
            }
            const attrezzaturaRef = doc(db, 'attrezzature', attrezzatura.id);
            const newAssegnazioneRef = doc(collection(db, 'assegnazioniMagazzino'));

            await runTransaction(db, async (transaction) => {
                const assegnazioneData = {
                    id: newAssegnazioneRef.id,
                    attrezzaturaID: attrezzatura.id,
                    attrezzaturaNome: attrezzatura.nome,
                    attrezzaturaSeriale: attrezzatura.seriale,
                    utenteID: utente.id,
                    utenteNome: `${utente.nome} ${utente.cognome}`,
                    companyID: companyID,
                    dataAssegnazione: Timestamp.now(),
                    statoWorkflow: 'da confermare',
                    storico: [{
                        timestamp: Timestamp.now(),
                        statoNuovo: 'da confermare',
                        eseguitoDa: user.uid,
                        note: 'Assegnazione creata da gestionale.'
                    }]
                };
                transaction.set(newAssegnazioneRef, assegnazioneData);
                transaction.update(attrezzaturaRef, { stato: 'assegnato' });
            });
            return { success: true, message: `Assegnazione per "${attrezzatura.nome}" creata.` };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const accettaRestituzione = async (assegnazione) => {
        const assegnazioneRef = doc(db, 'assegnazioniMagazzino', assegnazione.id);
        const attrezzaturaRef = doc(db, 'attrezzature', assegnazione.attrezzaturaID);

        try {
            const archivioQuery = query(collection(db, 'archivioAttrezzatura'), where("attrezzaturaID", "==", assegnazione.attrezzaturaID));
            const archivioSnapshot = await getDocs(archivioQuery);
            const archivioDocRef = archivioSnapshot.empty ? null : archivioSnapshot.docs[0].ref;

            await runTransaction(db, async (t) => {
                const assegnazioneDoc = await t.get(assegnazioneRef);
                if (!assegnazioneDoc.exists()) throw new Error("Assegnazione non più valida.");

                if (archivioDocRef) {
                    t.update(archivioDocRef, {
                        eventi: arrayUnion({
                            tipo: 'restituzione',
                            timestamp: Timestamp.now(),
                            utente: user.uid,
                            dettagli: `Articolo restituito da ${assegnazione.utenteNome} e reso disponibile.`
                        })
                    });
                }

                t.delete(assegnazioneRef);
                t.update(attrezzaturaRef, { stato: 'disponibile' });
            });
            return { success: true, message: "Restituzione completata. L'attrezzatura è di nuovo disponibile." };
        } catch (error) {
            console.error("Errore durante l'accettazione della restituzione:", error);
            return { success: false, message: error.message };
        }
    };

    const accettaSegnalazione = async (assegnazione) => {
        const assegnazioneRef = doc(db, 'assegnazioniMagazzino', assegnazione.id);
        const attrezzaturaRef = doc(db, 'attrezzature', assegnazione.attrezzaturaID);
        const archivioAssegnazioneRef = doc(collection(db, 'archivioAssegnazioniMagazzino'));

        try {
            const archivioQuery = query(collection(db, 'archivioAttrezzatura'), where("attrezzaturaID", "==", assegnazione.attrezzaturaID));
            const archivioSnapshot = await getDocs(archivioQuery);
            const archivioDocRef = archivioSnapshot.empty ? null : archivioSnapshot.docs[0].ref;

            await runTransaction(db, async (t) => {
                const assegnazioneDoc = await t.get(assegnazioneRef);
                if (!assegnazioneDoc.exists()) throw new Error("Assegnazione non più valida.");

                const isGuasto = assegnazione.statoWorkflow === 'guasto segnalato';
                const nuovoStatoAttrezzatura = isGuasto ? 'in riparazione' : 'perso/rubato';

                if (archivioDocRef) {
                    t.update(archivioDocRef, {
                        eventi: arrayUnion({
                            tipo: isGuasto ? 'guasto_accettato' : 'furto_accettato',
                            timestamp: Timestamp.now(),
                            utente: user.uid,
                            dettagli: `Segnalazione da ${assegnazione.utenteNome} accettata. Stato impostato a: ${nuovoStatoAttrezzatura}.`
                        })
                    });
                }
                
                t.set(archivioAssegnazioneRef, { ...assegnazioneDoc.data(), statoWorkflow: 'conclusa', dataArchiviazione: Timestamp.now() });
                t.delete(assegnazioneRef);
                t.update(attrezzaturaRef, { stato: nuovoStatoAttrezzatura });
            });
            return { success: true, message: "Segnalazione gestita e archiviata." };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };
    
    const risolviRiparazione = async (attrezzatura) => {
        const attrezzaturaRef = doc(db, 'attrezzature', attrezzatura.id);
        try {
            const archivioQuery = query(collection(db, 'archivioAttrezzatura'), where("attrezzaturaID", "==", attrezzatura.id));
            const archivioSnapshot = await getDocs(archivioQuery);
            const archivioDocRef = archivioSnapshot.empty ? null : archivioSnapshot.docs[0].ref;

            await runTransaction(db, async (t) => {
                t.update(attrezzaturaRef, { stato: 'disponibile' });

                if (archivioDocRef) {
                    t.update(archivioDocRef, {
                        eventi: arrayUnion({
                            tipo: 'riparazione',
                            timestamp: Timestamp.now(),
                            utente: user.uid,
                            dettagli: `Articolo riparato e reso disponibile.`
                        })
                    });
                }
            });
            return { success: true, message: `L'articolo "${attrezzatura.nome}" è stato riparato.` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const dismettiArticolo = async (attrezzatura) => {
        const attrezzaturaRef = doc(db, 'attrezzature', attrezzatura.id);
        const dismissioneRef = doc(collection(db, 'dismissioniMagazzino'));
        try {
            const archivioQuery = query(collection(db, 'archivioAttrezzatura'), where("attrezzaturaID", "==", attrezzatura.id));
            const archivioSnapshot = await getDocs(archivioQuery);
            const archivioDocRef = archivioSnapshot.empty ? null : archivioSnapshot.docs[0].ref;

            await runTransaction(db, async (t) => {
                t.set(dismissioneRef, { ...attrezzatura, dataDismissione: Timestamp.now(), utenteDismissione: user.uid });
                t.delete(attrezzaturaRef);
                
                if (archivioDocRef) {
                    t.update(archivioDocRef, {
                        eventi: arrayUnion({
                            tipo: 'dismissione',
                            timestamp: Timestamp.now(),
                            utente: user.uid,
                            dettagli: `Articolo dismesso e rimosso dall'inventario.`
                        })
                    });
                }
            });
            return { success: true, message: `L'articolo "${attrezzatura.nome}" è stato dismesso.` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    return {
        isLoading,
        message,
        creaAssegnazione,
        accettaRestituzione,
        accettaSegnalazione,
        risolviRiparazione,
        dismettiArticolo,
    };
};