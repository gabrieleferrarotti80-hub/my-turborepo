import { useState } from 'react';
import { useFirebaseData } from '../context/FirebaseContext';
// Importa 'deleteDoc'
import { collection, doc, addDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';

/**
 * Hook per la gestione della "Modalità Bozza" (Simulatore) della programmazione.
 * Lavora esclusivamente sulla collezione 'programmazione'.
 */
export const useProgrammazioneManager = () => {
    // db e userAziendaId sono definiti qui, al livello superiore
    const { db, userAziendaId } = useFirebaseData();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const progCollectionRef = collection(db, 'programmazione');

    /**
     * Crea un nuovo blocco di lavoro in modalità bozza.
     */
    const createTask = async (taskData) => {
        setIsLoading(true);
        setError(null);
        try {
            // Pulisce i dati da salvare
            const dataToSave = {
                faseId: taskData.faseId,
                cantiereId: taskData.cantiereId,
                titolo: taskData.titolo,
                dataInizio: taskData.dataInizio,
                dataFine: taskData.dataFine,
                durataOre: taskData.durataOre, // ✅ Salva la durata
                risorseAssegnate: taskData.risorseAssegnate,
                dipendeDa: taskData.dipendeDa || null,
                noteOperative: taskData.noteOperative || '',
                companyID: userAziendaId,
                stato: 'bozza',
                createdAt: new Date(),
            };

            await addDoc(progCollectionRef, dataToSave);
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            console.error("Errore createTask:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, error: err.message };
        }
    };

    /**
     * Aggiorna i dettagli di un blocco esistente (da TaskEditorModal).
     */
    const updateTask = async (taskId, updatedData) => {
        setIsLoading(true);
setError(null);
        try {
            const taskRef = doc(db, 'programmazione', taskId);
            
            // Filtra i dati da salvare
            const dataToSave = {
                titolo: updatedData.titolo,
                dataInizio: updatedData.dataInizio,
                dataFine: updatedData.dataFine,
                noteOperative: updatedData.noteOperative,
                risorseAssegnate: updatedData.risorseAssegnate, 
                stato: updatedData.stato,
                durataOre: updatedData.durataOre // ✅ Salva la durata
            };

            await updateDoc(taskRef, dataToSave);
            
            setIsLoading(false);
            return { success: true }; 
        
        } catch (err) {
             console.error("Errore updateTask:", err);
             setError(err.message);
             setIsLoading(false);
             return { success: false, error: err.message };
        }
    };

    /**
     * Elimina un task dalla programmazione.
     */
    const deleteTask = async (taskId) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!taskId) {
                throw new Error("ID del task non fornito.");
            }
            const taskRef = doc(db, 'programmazione', taskId);
            await deleteDoc(taskRef);

            console.log(`[MGR] Task ${taskId} eliminato con successo.`);
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            console.error("Errore durante l'eliminazione del task:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, error: err.message };
        }
    };

    /**
     * Sposta un blocco (drag-and-drop sul calendario) e ri-valuta i conflitti.
     */
    // ✅ FIRMA CORRETTA (6 argomenti)
const moveTaskAndDetectConflicts = async (taskId, newStartDate, newEndDate, risorseAggiornate, extraDataToSave, allTasks) => {
        // --- ✅ LOG AGGIUNTO QUI ---
        console.log("--- DEBUG: useProgrammazioneManager ---");
        console.log("1. taskId RICEVUTO:", taskId);
        console.log("2. newStartDate RICEVUTO:", newStartDate);
        console.log("3. newEndDate RICEVUTO:", newEndDate);
        console.log("4. risorseAggiornate RICEVUTO:", risorseAggiornate);
        console.log("5. extraDataToSave RICEVUTO:", extraDataToSave);
        console.log("6. allTasks RICEVUTO (DEVE ESSERE UN ARRAY):", allTasks);
        // --- FINE LOG ---
        
        setIsLoading(true);
        setError(null);
        
        // 1. Logica di rilevamento conflitti
       const detectConflicts = (movedTask, tasks) => {
            const conflicts = new Set();
            // ✅ 'risorseAggiornate' è ora l'oggetto corretto
            const { risorseAssegnate: resA } = movedTask; 

            if (!tasks || typeof tasks.find !== 'function') {
                console.error("moveTaskAndDetectConflicts: 'tasks' non è un array", tasks);
                return conflicts; 
            }
            
            for (const task of tasks) {
                if (task.id === movedTask.id) continue;
                const taskStart = task.dataInizio;
                const taskEnd = task.dataFine;
                const movedStart = newStartDate;
                const movedEnd = newEndDate;

                if (!taskStart || !taskEnd || !movedStart || !movedEnd) continue;
                const hasTimeOverlap = (movedStart < taskEnd) && (movedEnd > taskStart);
                if (!hasTimeOverlap) continue;

                const { risorseAssegnate: resB } = task;
                // ✅ Questa logica ora funziona perché 'resA' è corretto
                const hasResourceOverlap = [
                    ...(resA?.personale || []), 
                    ...(resA?.automezzi || []), 
                    ...(resA?.attrezzature || [])
                ].some(id => 
                    [
                        ...(resB?.personale || []), 
                        ...(resB?.automezzi || []), 
                        ...(resB?.attrezzature || [])
                    ].includes(id)
                );

                if (hasResourceOverlap) {
                    conflicts.add(task.id);
                    conflicts.add(movedTask.id);
                }
            }
            return Array.from(conflicts);
        };

        // 2. Prepariamo i dati
        
        // ✅ 2. 'allTasks' è il 6° argomento
        if (!allTasks || typeof allTasks.find !== 'function') {
            const errorMsg = "Errore critico: 'allTasks' non è un array.";
            console.error(errorMsg, allTasks);
            setError(errorMsg);
            setIsLoading(false);
            return { success: false, error: errorMsg };
        }
        
        // 🛑 ELIMINATA LA VECCHIA LOGICA 'taskOriginale' e 'risorseAggiornate'
        
        const movedTaskData = {
            id: taskId,
            dataInizio: newStartDate,
            dataFine: newEndDate,
            risorseAssegnate: risorseAggiornate, // ✅ Usa direttamente il 4° argomento
        };

        // 3. Eseguiamo il rilevamento
        const conflictIds = detectConflicts(movedTaskData, allTasks);
        
        // 4. Eseguiamo l'aggiornamento su DB
        try {
            const batch = writeBatch(db);

            // Resetta conflitti vecchi
            for (const task of allTasks) {
                if (task.stato === 'conflitto_risorsa' && !conflictIds.includes(task.id)) {
                    const taskRef = doc(db, 'programmazione', task.id);
                    batch.update(taskRef, { stato: 'bozza' });
                }
            }
            
            // Aggiorna il task spostato
            const movedTaskRef = doc(db, 'programmazione', taskId);
            batch.update(movedTaskRef, {
                dataInizio: newStartDate, 
                dataFine: newEndDate,
                risorseAssegnate: risorseAggiornate, // ✅ Usa l'argomento corretto
                stato: conflictIds.includes(taskId) ? 'conflitto_risorsa' : 'bozza',
                durataOre: extraDataToSave.durataOre 
            });

            // Imposta i nuovi conflitti
            for (const id of conflictIds) {
                if (id === taskId) continue;
                const conflictTaskRef = doc(db, 'programmazione', id);
                batch.update(conflictTaskRef, { stato: 'conflitto_risorsa' });
            }

            await batch.commit();
            setIsLoading(false);
            return { success: true, conflicts: conflictIds };

        } catch (err) {
            console.error("Errore moveTask:", err);
            setError(err.message);
            setIsLoading(false);
            return { success: false, error: err.message };
        }
    };

    // 3. Esportiamo le funzioni
    return {
        isLoading,
        error,
        createTask,
        updateTask,
        moveTaskAndDetectConflicts,
        deleteTask,
    };
};