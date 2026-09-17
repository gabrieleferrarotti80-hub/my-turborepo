import { useState } from 'react';
import { collection, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';

export const useCantieriManager = (db, userAziendaId, companies) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Aggiunge un nuovo cantiere e tutti i suoi subcantieri (fasi)
     * in un'unica operazione atomica (batch), ereditando le risorse dal preventivo analitico.
     */
    const addCantiere = async (datiCantiere, fasiPreventivo) => {
        setIsLoading(true);
        setError(null);
        
        if (!userAziendaId) {
            setError("ID azienda non trovato.");
            setIsLoading(false);
            return { success: false, message: "ID azienda non trovato." };
        }
        if (!fasiPreventivo || fasiPreventivo.length === 0) {
            setError("È necessaria almeno una fase di lavoro.");
            setIsLoading(false);
            return { success: false, message: "È necessaria almeno una fase di lavoro." };
        }

        const batch = writeBatch(db);

        try {
            const companyName = companies?.find(c => c.id === userAziendaId)?.name || 'N/A';

            // --- 1. Prepara il Cantiere Principale ---
            const cantiereRef = doc(collection(db, 'cantieri'));
            const cantiereId = cantiereRef.id; 

            const datiCantiereFinali = {
                ...datiCantiere,
                companyID: userAziendaId,
                companyName: companyName,
                stato: 'attivo',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            batch.set(cantiereRef, datiCantiereFinali);

            // --- 2. Prepara i Subcantieri (Fasi) ereditando dal preventivo ---
            for (const fase of fasiPreventivo) {
                
                // Ricaviamo il numero di interventi previsti
                const nInterventi = Number(fase.numeroInterventi) || 1;
                
                // Formattiamo le risorse in modo che il programmatore dell'agenda le capisca
                const personaleFormattato = (fase.costi?.manodopera || []).map(m => ({
                    qualifica: m.descrizione,
                    numeroOperatori: Number(m.numeroPersone) || 1,
                    orePreviste: Number(m.quantita) || 0
                }));

                const automezziFormattati = (fase.costi?.mezzi || []).map(m => ({
                    mezzo: m.descrizione,
                    quantita: Number(m.quantita) || 1
                }));

                const attrezzatureFormattate = (fase.costi?.attrezzature || []).map(a => ({
                    attrezzatura: a.descrizione,
                    quantita: Number(a.quantita) || 1
                }));

                // Materiali e Subappalti per l'Ufficio Acquisti / Magazzino
                const distintaMateriali = (fase.costi?.materiali || []).map(mat => ({
                    articolo: mat.descrizione,
                    quantita: Number(mat.quantita) || 1,
                    unitaMisura: mat.unitaMisura || ''
                }));

                const subappaltiFormattati = (fase.costi?.subappalti || []).map(sub => ({
                    azienda: sub.descrizione,
                    lavorazione: sub.lavorazione,
                    importoPrevisto: Number(sub.costoUnitario) || 0
                }));

                // Scriviamo nella collezione root "subcantieri" come da tua architettura
                const subcantiereRef = doc(collection(db, 'subcantieri'));
                
                const datiSubcantiere = {
                    nomeSubcantiere: fase.titolo || 'Fase di Lavoro', // Ereditato dal preventivo
                    masterId: fase.masterId || null, // Stele di Rosetta mantenuta!
                    cantiereGenitoreId: cantiereId, 
                    cantiereId: cantiereId,       
                    companyID: userAziendaId,   
                    
                    // Gestione interventi ricorsivi
                    interventiPrevisti: nInterventi,
                    interventiEseguiti: 0,
                    
                    durataStimata: 8, // Default 1 giorno, eventualmente personalizzabile
                    stato: 'da_programmare',
                    dataCreazione: serverTimestamp(),
                    
                    // Risorse ereditate per l'operatività in cantiere
                    risorseRichieste: { 
                        personale: personaleFormattato,
                        automezzi: automezziFormattati,
                        attrezzature: attrezzatureFormattate,
                    },

                    // Dati per l'ufficio acquisti
                    distintaBase: {
                        materiali: distintaMateriali,
                        subappalti: subappaltiFormattati
                    },
                    
                    // Budget per controllo di gestione (margini della singola fase)
                    budgetFase: {
                        costoPrevisto: Number(fase.prezzoVendita) || 0, // o i costi interni, a seconda di cosa vuoi tracciare
                    }
                };
                
                batch.set(subcantiereRef, datiSubcantiere);
            }

            // --- 3. Esegui il Batch in sicurezza ---
            await batch.commit();

            return { 
                success: true, 
                message: 'Cantiere e fasi aggiunti con successo!', 
                id: cantiereId 
            };

        } catch (err) {
            console.error("Errore nell'aggiunta del cantiere (batch):", err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };
    
    /**
     * Aggiunge un nuovo sub-cantiere (fase di lavoro) a un cantiere esistente (Aggiunto in corso d'opera)
     */
    const addSubcantiere = async (subcantiereData) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!subcantiereData.cantiereId || !subcantiereData.descrizione) {
                throw new Error("Cantiere principale e descrizione sono obbligatori.");
            }

            const subcantieriRef = collection(doc(db, 'cantieri', subcantiereData.cantiereId), 'subcantieri');
            
            await addDoc(subcantieriRef, {
                descrizione: subcantiereData.descrizione,
                stato: subcantiereData.stato,
                cantiereGenitoreId: subcantiereData.cantiereId,
                companyID: userAziendaId,
                dataCreazione: serverTimestamp()
            });
            
            return { success: true, message: 'Sub-cantiere aggiunto con successo!' };

        } catch (error) {
            console.error("Errore nell'aggiunta del sub-cantiere:", error);
            setError(error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Aggiorna lo stato di un sub-cantiere.
     */
    const updateStatoSubcantiere = async (cantiereId, subcantiereId, nuovoStato) => {
        setIsLoading(true);
        setError(null);
        try {
            const subcantiereRef = doc(db, 'cantieri', cantiereId, 'subcantieri', subcantiereId);
            await updateDoc(subcantiereRef, {
                stato: nuovoStato
            });
            return { success: true, message: 'Stato aggiornato con successo.' };
        } catch (err) {
            console.error("Errore nell'aggiornamento dello stato:", err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };
    
    return {
        addCantiere, 
        addSubcantiere,
        updateStatoSubcantiere,
        isLoading,
        error,
    };
};