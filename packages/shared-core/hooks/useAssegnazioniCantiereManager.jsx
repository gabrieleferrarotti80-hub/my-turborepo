import { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import { assegnazioneCantiereSchema } from '../data/schemas.js';

export const useAssegnazioniCantiereManager = (db, user, userAziendaId, users = [], cantieri = [], subcantieri = []) => {
    const [isLoading, setIsLoading] = useState(false);

    const cantieriMap = new Map(cantieri.map(c => [c.id, c.nomeCantiere]));
    const subcantieriMap = new Map(subcantieri.map(s => [s.id, s.nomeSubcantiere]));
    const usersMap = new Map(users.map(u => [u.id, `${u.nome} ${u.cognome}`]));

    // 🌟 Riconosce e salva anche il Tecnico
    const buildTeamObject = (tecnicoId, prepostoId, operaiIds) => {
        const team = [];
        if (tecnicoId) {
            team.push({ userId: tecnicoId, ruolo: 'tecnico', nome: usersMap.get(tecnicoId) || 'N/D' });
        }
        if (prepostoId) {
            team.push({ userId: prepostoId, ruolo: 'preposto', nome: usersMap.get(prepostoId) || 'N/D' });
        }
        (operaiIds || []).forEach(id => {
            team.push({ userId: id, ruolo: 'operaio', nome: usersMap.get(id) || 'N/D' });
        });
        return team;
    };

    const createAssegnazioneCantiere = async (dati) => {
        setIsLoading(true);
        if (!dati.cantiereId || !dati.faseId || !dati.dataInizio) {
            setIsLoading(false);
            return { success: false, message: "Cantiere, Fase e Data Inizio sono obbligatori." };
        }

        const batch = writeBatch(db);
        
        try {
            const team = buildTeamObject(dati.tecnicoId, dati.prepostoId, dati.operaiIds);
            const teamMemberIds = [
                dati.tecnicoId,
                dati.prepostoId, 
                ...(dati.operaiIds || []), 
                ...(dati.ulterioriDipendentiIds || [])
            ].filter(Boolean);

            const nomeCantiere = cantieriMap.get(dati.cantiereId) || 'Cantiere';
            const nomeFase = subcantieriMap.get(dati.faseId) || 'Fase';

            const newAssegnazioneRef = doc(collection(db, 'assegnazioniCantieri'));
            const assegnazioneData = {
                ...assegnazioneCantiereSchema,
                id: newAssegnazioneRef.id,
                companyID: userAziendaId,
                cantiereId: dati.cantiereId,
                nomeCantiere: nomeCantiere,
                faseId: dati.faseId,
                tecnicoId: dati.tecnicoId || '',
                prepostoId: dati.prepostoId || '',
                operaiIds: dati.operaiIds || [],
                ulterioriDipendentiIds: dati.ulterioriDipendentiIds || [],
                team: team,
                teamMemberIds: teamMemberIds,
                automezziIds: dati.automezziIds || [],
                dataInizio: dati.dataInizio ? Timestamp.fromDate(new Date(dati.dataInizio)) : null,
                dataFine: dati.dataFine ? Timestamp.fromDate(new Date(dati.dataFine)) : null,
                durataOre: dati.durataOre || 8,
                stato: 'attiva',
                assegnatoDaId: user.uid,
                dataAssegnazione: serverTimestamp(),
            };
            batch.set(newAssegnazioneRef, assegnazioneData);

            const progTaskRef = doc(db, 'programmazione', newAssegnazioneRef.id);
            const progTaskData = {
                cantiereId: dati.cantiereId,
                faseId: dati.faseId,
                titolo: nomeFase,
                dataInizio: new Date(dati.dataInizio),
                dataFine: dati.dataFine ? new Date(dati.dataFine) : null,
                durataOre: dati.durataOre || 8,
                risorseAssegnate: {
                    personale: teamMemberIds,
                    automezzi: dati.automezziIds || [],
                    attrezzature: [], 
                },
                stato: 'assegnato',
                assegnazioneId: newAssegnazioneRef.id,
                companyID: userAziendaId,
            };
            batch.set(progTaskRef, progTaskData);
            
            const progLiveTaskRef = doc(db, 'programmazioneLive', dati.faseId);
            const progLiveTaskData = {
                ...progTaskData,
                diffStato: 'assegnato',
                publishedAt: serverTimestamp()
            };
            batch.set(progLiveTaskRef, progLiveTaskData);

            await batch.commit();
            setIsLoading(false);
            return { success: true, message: "Assegnazione creata e sincronizzata nel programmatore." };

        } catch (err) {
            console.error("Errore creazione assegnazione:", err);
            setIsLoading(false);
            return { success: false, message: `Errore: ${err.message}` };
        }
    };

    const updateAssegnazioneCantiere = async (assignmentId, datiParziali) => {
        setIsLoading(true);
        const batch = writeBatch(db);

        try {
            const assegnazioneRef = doc(db, 'assegnazioniCantieri', assignmentId);
            const snap = await getDoc(assegnazioneRef);
            
            if (!snap.exists()) {
                setIsLoading(false);
                return { success: false, message: "Assegnazione non trovata nel database." };
            }

            const oldData = snap.data();
            const updatesAss = { updatedAt: serverTimestamp(), updatedBy: user.uid };
            const updatesProg = {};

            if (datiParziali.dataInizio !== undefined) {
                updatesAss.dataInizio = datiParziali.dataInizio ? Timestamp.fromDate(new Date(datiParziali.dataInizio)) : null;
                updatesProg.dataInizio = datiParziali.dataInizio ? new Date(datiParziali.dataInizio) : null;
            }
            if (datiParziali.dataFine !== undefined) {
                updatesAss.dataFine = datiParziali.dataFine ? Timestamp.fromDate(new Date(datiParziali.dataFine)) : null;
                updatesProg.dataFine = datiParziali.dataFine ? new Date(datiParziali.dataFine) : null;
            }

            if (datiParziali.durataOre !== undefined) {
                updatesAss.durataOre = datiParziali.durataOre;
                updatesProg.durataOre = datiParziali.durataOre;
            }
            if (datiParziali.stato !== undefined) {
                updatesAss.stato = datiParziali.stato;
                updatesProg.stato = datiParziali.stato === 'attiva' ? 'assegnato' : datiParziali.stato;
            }

            const isSquadraModificata = datiParziali.tecnicoId !== undefined || datiParziali.prepostoId !== undefined || datiParziali.operaiIds !== undefined || datiParziali.ulterioriDipendentiIds !== undefined;
            if (isSquadraModificata) {
                updatesAss.tecnicoId = datiParziali.tecnicoId || '';
                updatesAss.prepostoId = datiParziali.prepostoId || '';
                updatesAss.operaiIds = datiParziali.operaiIds || [];
                updatesAss.ulterioriDipendentiIds = datiParziali.ulterioriDipendentiIds || [];
                updatesAss.team = buildTeamObject(updatesAss.tecnicoId, updatesAss.prepostoId, updatesAss.operaiIds);
                
                const teamIds = [updatesAss.tecnicoId, updatesAss.prepostoId, ...updatesAss.operaiIds, ...updatesAss.ulterioriDipendentiIds].filter(Boolean);
                updatesAss.teamMemberIds = teamIds;
                updatesProg['risorseAssegnate.personale'] = teamIds;
            }

            if (datiParziali.automezziIds !== undefined) {
                updatesAss.automezziIds = datiParziali.automezziIds;
                updatesProg['risorseAssegnate.automezzi'] = datiParziali.automezziIds;
            }
            if (datiParziali.cantiereId !== undefined) {
                updatesAss.cantiereId = datiParziali.cantiereId;
                updatesAss.nomeCantiere = cantieriMap.get(datiParziali.cantiereId) || 'Cantiere';
                updatesProg.cantiereId = datiParziali.cantiereId;
            }
            if (datiParziali.faseId !== undefined) {
                updatesAss.faseId = datiParziali.faseId;
                updatesProg.faseId = datiParziali.faseId;
                updatesProg.titolo = subcantieriMap.get(datiParziali.faseId) || 'Fase';
            }

            batch.update(assegnazioneRef, updatesAss);

            const progRef = doc(db, 'programmazione', assignmentId);
            const progSnap = await getDoc(progRef);
            if (progSnap.exists()) batch.update(progRef, updatesProg);

            const faseTarget = datiParziali.faseId !== undefined ? datiParziali.faseId : oldData.faseId;
            if (faseTarget) {
                const liveRef = doc(db, 'programmazioneLive', faseTarget);
                const liveSnap = await getDoc(liveRef);
                if (liveSnap.exists()) {
                    batch.update(liveRef, { ...updatesProg, diffStato: 'assegnato', publishedAt: serverTimestamp() });
                }
            }

            await batch.commit();
            setIsLoading(false);
            return { success: true, message: "Dati aggiornati con successo!" };

        } catch (err) {
            console.error("Errore aggiornamento assegnazione:", err);
            setIsLoading(false);
            return { success: false, message: `Errore: ${err.message}` };
        }
    };

    const deleteAssegnazioneCantiere = async (assignmentId, faseId) => {
        setIsLoading(true);
        if (!faseId) console.warn("Manca faseId per l'eliminazione, il 'cronoprogramma' potrebbe non essere pulito.");
        
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'assegnazioniCantieri', assignmentId));
            batch.delete(doc(db, 'programmazione', assignmentId));
            if(faseId) batch.delete(doc(db, 'programmazioneLive', faseId));

            await batch.commit();
            setIsLoading(false);
            return { success: true, message: "Assegnazione eliminata." };

        } catch(err) {
            console.error(err);
            setIsLoading(false);
            return { success: false, message: `Errore: ${err.message}` };
        }
    };

    return { createAssegnazioneCantiere, updateAssegnazioneCantiere, deleteAssegnazioneCantiere, isLoading };
};