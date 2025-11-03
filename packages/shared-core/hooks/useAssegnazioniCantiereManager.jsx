import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { assegnazioneCantiereSchema } from '../data/schemas.js';

export const useAssegnazioniCantieriManager = (db, user, userAziendaId, users, cantieri) => {
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Crea un nuovo documento di assegnazione cantiere.
     * @param {object} datiAssegnazione - Dati dal form ({ cantiereId, prepostoId, operaiIds, automezziIds }).
     * @returns {{success: boolean, message: string}} Esito dell'operazione.
     */
    const createAssegnazioneCantiere = async (datiAssegnazione) => {
        setIsLoading(true);
        try {
            const { cantiereId, prepostoId, operaiIds, automezziIds } = datiAssegnazione;

            // Validazione dei dati
            if (!cantiereId || !prepostoId) {
                throw new Error("Cantiere e preposto sono obbligatori.");
            }
            if (!userAziendaId) {
                throw new Error("ID Azienda non trovato. Selezionare un'azienda.");
            }

            // Denormalizzazione dei dati per una facile lettura
            const cantiereSelezionato = cantieri.find(c => c.id === cantiereId);
            const prepostoSelezionato = users.find(u => u.id === prepostoId);

            if (!cantiereSelezionato || !prepostoSelezionato) {
                throw new Error("Cantiere o preposto non validi.");
            }

            // --- ✅ LOGICA MIGLIORATA ---

            // 1. Crea l'array di ID per le query efficienti (`array-contains`)
            const teamMemberIds = [prepostoId, ...(operaiIds || [])];

            // 2. Crea l'array di oggetti "partecipanti" per avere dati ricchi e flessibili
            const partecipanti = [
                // Aggiungi il preposto
                {
                    userId: prepostoId,
                    nome: `${prepostoSelezionato.nome} ${prepostoSelezionato.cognome}`,
                    ruoloAssegnazione: 'preposto'
                },
                // Aggiungi gli operai mappando sull'array `users` per trovare i loro nomi
                ...(operaiIds || []).map(operaioId => {
                    const operaio = users.find(u => u.id === operaioId);
                    return {
                        userId: operaioId,
                        nome: operaio ? `${operaio.nome} ${operaio.cognome}` : 'N/A',
                        ruoloAssegnazione: 'operaio'
                    };
                })
            ];

            // 3. Costruisci l'oggetto finale pulito e generico
            const datiFinali = {
                ...assegnazioneCantiereSchema,
                cantiereId,
                nomeCantiere: cantiereSelezionato.nomeCantiere,
                teamMemberIds,      // <-- Per query efficienti
                partecipanti,       // <-- Per dati ricchi e flessibili
                automezziIds: automezziIds || [],
                companyID: userAziendaId,
                assegnatoDaId: user.uid,
                dataAssegnazione: serverTimestamp(),
                stato: 'attiva',
            };

            await addDoc(collection(db, 'assegnazioniCantieri'), datiFinali);
            
            return { success: true, message: 'Assegnazione al cantiere creata con successo!' };
        } catch (error) {
            console.error("Errore nella creazione dell'assegnazione cantiere:", error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createAssegnazioneCantiere,
        isLoading,
    };
};