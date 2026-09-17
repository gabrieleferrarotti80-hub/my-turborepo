import { useState } from 'react';
import { 
    collection, 
    doc, 
    writeBatch, 
    serverTimestamp, 
    query, 
    where, 
    getDocs 
} from 'firebase/firestore';

/**
 * Confronta due task per vedere se ci sono state modifiche rilevanti.
 */
const areTasksModified = (bozzaTask, liveTask) => {
    try {
        // 1. Confronto Date
        const bozzaStart = new Date(bozzaTask.dataInizio).getTime();
        const liveStart = liveTask.dataInizio?.toDate ? liveTask.dataInizio.toDate().getTime() : new Date(liveTask.dataInizio).getTime();
        if (bozzaStart !== liveStart) return true;

        const bozzaEnd = new Date(bozzaTask.dataFine).getTime();
        const liveEnd = liveTask.dataFine?.toDate ? liveTask.dataFine.toDate().getTime() : new Date(liveTask.dataFine).getTime();
        if (bozzaEnd !== liveEnd) return true;

        // 2. Confronto Risorse
        const bozzaRisorse = JSON.stringify(bozzaTask.risorseAssegnate || {});
        const liveRisorse = JSON.stringify(liveTask.risorseAssegnate || {});
        if (bozzaRisorse !== liveRisorse) return true;

        // 3. Confronto Stato (es. da 'bozza' a 'assegnato')
        if (bozzaTask.stato !== liveTask.stato) return true;

        return false; // Nessuna modifica trovata
    } catch (e) {
        console.error("Errore nel confronto task:", e, bozzaTask, liveTask);
        return true; 
    }
};


/**
 * Hook per gestire la pubblicazione della "Programmazione" (piano vivo)
 * nel "Cronoprogramma" (snapshot), calcolando le differenze.
 */
export const usePublishManager = (db, companyID) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Pubblica il piano vivo nel cronoprogramma.
     * 1. Carica il cronoprogramma 'live' esistente.
     * 2. Confronta la programmazione 'vivo' con il 'live'.
     * 3. Scrive il NUOVO cronoprogramma 'live' con i tag 'diffStato'.
     * 4. NON TOCCA la programmazione 'vivo'.
     */
    const publishBozza = async (tasksDelPianoVivo) => {
        setIsPublishing(true);
        setError(null);

        if (!db || !companyID) {
            setError("ID Azienda o DB non disponibili.");
            setIsPublishing(false);
            return { success: false, message: "ID Azienda o DB mancanti" };
        }

        const batch = writeBatch(db);

        try {
            // --- 1. Carica il Cronoprogramma 'live' esistente ---
            const liveCollectionRef = collection(db, 'programmazioneLive');
            const q = query(liveCollectionRef, where("companyID", "==", companyID));
            const oldSnapshot = await getDocs(q);
            
            // Usiamo 'faseId' (ID subcantiere) come chiave univoca
            const liveMap = new Map(oldSnapshot.docs.map(doc => {
                // L'ID del documento è il faseId
                return [doc.id, doc.data()]; 
            }));
            
            console.log(`[PublishMGR] Trovati ${liveMap.size} task nel 'live' esistente.`);

            // --- 2. Confronta il Piano Vivo e prepara il Batch ---
            for (const task of tasksDelPianoVivo) {
                const faseId = task.faseId; 

                if (!faseId) {
                    console.warn("Task saltato (faseId mancante):", task.titolo);
                    continue;
                }

                const liveTask = liveMap.get(faseId);
                let diffStato = 'invariato'; // Grigio (default)

                if (!liveTask) {
                    diffStato = 'nuovo'; // Blu
                } else if (areTasksModified(task, liveTask)) {
                    diffStato = 'modificato'; // Giallo
                }
                
                // Priorità massima: se è assegnato, è Verde
                if (task.stato === 'assegnato') {
                    diffStato = 'assegnato'; // Verde
                }

                // Prepara i dati da salvare in 'programmazioneLive'
                // Usiamo il 'faseId' come ID del documento
                const liveDocRef = doc(db, 'programmazioneLive', faseId);
                
                const dataToPublish = { 
                    ...task, 
                    diffStato: diffStato, // Aggiunge il tag del diff
                    publishedAt: serverTimestamp()
                };
                
                // Rimuoviamo l'ID del documento della bozza (non ci serve)
                delete dataToPublish.id; 

                // Azione: Scrivi/Sovrascrivi il task nel Cronoprogramma
                batch.set(liveDocRef, dataToPublish);

                // Rimuovi dal map per sapere quali eliminare
                liveMap.delete(faseId);
            }

            // --- 3. Elimina i task 'orfani' dal Cronoprogramma ---
            // (Task che erano nel 'live' ma non più nel piano 'vivo')
            for (const faseIdToDelete of liveMap.keys()) {
                batch.delete(doc(db, 'programmazioneLive', faseIdToDelete));
            }
            console.log(`[PublishMGR] ${liveMap.size} task 'live' obsoleti pronti per l'eliminazione.`);


            // --- 4. Esegui ---
            await batch.commit();
            
            setIsPublishing(false);
            return { success: true };

        } catch (err) {
            console.error("Errore durante la pubblicazione del piano:", err);
            setError(err.message);
            setIsPublishing(false);
            return { success: false, error: err.message };
        }
    };

    return { isPublishing, error, publishBozza };
};