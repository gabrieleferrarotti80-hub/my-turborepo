import { useState } from 'react';
import { 
    collection, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, runTransaction, writeBatch 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useMagazzinoManager = (db, storage, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 1. AGGIUNGI ATTREZZATURA ---
    const addAttrezzatura = async (datiAttrezzatura, file) => {
        setIsLoading(true);
        setError(null);
        try {
            let fotoUrl = null;
            let storagePath = null;
            if (file && storage) {
                const path = `magazzino/${companyID}/attrezzature/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, file);
                fotoUrl = await getDownloadURL(storageRef);
                storagePath = path;
            }
            const attrezzaturaRef = doc(collection(db, 'attrezzature'));
            const archivioRef = doc(collection(db, 'archivioAttrezzatura'));
            const now = serverTimestamp();

            await runTransaction(db, async (transaction) => {
                transaction.set(attrezzaturaRef, {
                    ...datiAttrezzatura, companyID, fotoUrl, storagePath,
                    stato: 'disponibile', tipoArticolo: 'attrezzatura',
                    createdAt: now, updatedAt: now, createdBy: user.uid
                });
                transaction.set(archivioRef, {
                    attrezzaturaID: attrezzaturaRef.id,
                    seriale: datiAttrezzatura.seriale || 'N/A',
                    nome: datiAttrezzatura.nome, companyID,
                    eventi: [{ tipo: 'creazione', timestamp: new Date(), utente: user.uid, dettagli: `Attrezzatura creata.` }]
                });
            });
            setIsLoading(false);
            return { success: true, message: "Attrezzatura creata con successo!", id: attrezzaturaRef.id };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 2. AGGIUNGI MATERIALE ---
    const addMateriale = async (datiMateriale) => {
        setIsLoading(true);
        setError(null);
        try {
            const statoIniziale = datiMateriale.cantiereId ? 'in_cantiere' : 'disponibile';
            const docRef = await addDoc(collection(db, 'attrezzature'), {
                ...datiMateriale, companyID, tipoArticolo: 'materiale', stato: statoIniziale,
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: user.uid
            });
            if (datiMateriale.cantiereId) {
                 await addDoc(collection(db, 'movimenti_magazzino'), {
                    materialeId: docRef.id, nomeMateriale: datiMateriale.nome, cantiereId: datiMateriale.cantiereId,
                    quantita: datiMateriale.quantita, tipo: 'carico_diretto_cantiere', companyID,
                    operatoreId: user.uid, createdAt: serverTimestamp(), note: 'Caricamento manuale'
                });
            }
            setIsLoading(false);
            return { success: true, message: "Materiale aggiunto!", id: docRef.id };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 3. PROCESSA DDT ---
    const processaDDT = async (ddt, ordine) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!ddt || !ordine) throw new Error("Dati mancanti.");
            if (!ordine.righe || ordine.righe.length === 0) throw new Error("Ordine vuoto.");
            const batch = writeBatch(db);
            const isDestinazioneCantiere = ddt.cantiereId && ddt.cantiereId !== 'MAGAZZINO_SEDE';
            
            for (const riga of ordine.righe) {
                const tipoArticolo = ddt.tipoOggetto === 'attrezzatura' ? 'attrezzatura' : 'materiale';
                const articoloRef = doc(collection(db, 'attrezzature'));
                let statoIniziale = 'disponibile', cantiereAssegnato = null, nomeCantiereAssegnato = null;

                if (tipoArticolo === 'materiale' && isDestinazioneCantiere) {
                    statoIniziale = 'in_cantiere'; cantiereAssegnato = ddt.cantiereId; nomeCantiereAssegnato = ddt.nomeCantiere;
                }

                const datiArticolo = {
                    nome: riga.descrizione || 'Articolo', tipoArticolo,
                    categoria: tipoArticolo === 'attrezzatura' ? 'Attrezzatura Generica' : 'Materiale',
                    quantita: Number(riga.quantita) || 1, unitaMisura: riga.unitaMisura || 'pz',
                    costoUnitario: Number(riga.prezzoUnitario) || 0,
                    ddtId: ddt.id, ordineId: ordine.id, cantiereId: cantiereAssegnato, 
                    nomeCantiere: nomeCantiereAssegnato, companyID, stato: statoIniziale,
                    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: user.uid
                };
                batch.set(articoloRef, datiArticolo);

                const movimentoRef = doc(collection(db, 'movimenti_magazzino'));
                batch.set(movimentoRef, {
                    materialeId: articoloRef.id, nomeMateriale: datiArticolo.nome,
                    cantiereId: cantiereAssegnato, nomeCantiere: nomeCantiereAssegnato,
                    quantita: datiArticolo.quantita, tipo: isDestinazioneCantiere ? 'trasferimento_cantiere' : 'carico_acquisto', 
                    companyID, operatoreId: user.uid, createdAt: serverTimestamp(), note: `Carico automatico`
                });
            }
            batch.update(doc(db, 'ddt_acquisti', ddt.id), { stato: 'processato', dataProcessamento: serverTimestamp() });
            await batch.commit();
            setIsLoading(false);
            return { success: true, message: "DDT processato." };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

   // --- 4. GESTIONE GUASTI ---
    const accettaSegnalazione = async (assegnazioneId, attrezzaturaId) => {
        setIsLoading(true);
        try {
            if (!attrezzaturaId || !assegnazioneId) throw new Error("ID mancanti.");
            const batch = writeBatch(db);
            
            batch.update(doc(db, 'attrezzature', attrezzaturaId), { stato: 'in riparazione', updatedAt: serverTimestamp() });
            
            batch.update(doc(db, 'assegnazioniMagazzino', assegnazioneId), {
                statoWorkflow: 'in riparazione',
                stato: 'in riparazione', // ✅ FIX
                dataRientro: serverTimestamp() // Inizia il "rientro" fisico
            });
            await batch.commit();
            setIsLoading(false);
            return { success: true, message: "Guasto accettato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

   const risolviRiparazione = async (assegnazioneId, attrezzaturaId, noteIntervento, costoRiparazione) => {
        setIsLoading(true);
        try {
            if (!attrezzaturaId || !assegnazioneId) throw new Error("ID mancanti.");
            const batch = writeBatch(db);
            
            batch.update(doc(db, 'attrezzature', attrezzaturaId), { stato: 'disponibile', assegnatoA: null, updatedAt: serverTimestamp() });

            batch.update(doc(db, 'assegnazioniMagazzino', assegnazioneId), {
                statoWorkflow: 'conclusa', 
                stato: 'restituito', // ✅ FIX: Assegnazione terminata, l'oggetto è in magazzino
                dataRientro: serverTimestamp(), // ✅ FIX: Assicura che HR lo veda come restituito
                dataRiparazione: serverTimestamp(),
                noteRiparazione: noteIntervento || 'Riparazione completata.',
                costo: costoRiparazione || 0
            });

            batch.set(doc(collection(db, 'scadenze_mezzi')), {
                mezzoId: attrezzaturaId, tipoScadenza: 'Riparazione Guasto',
                dataScadenza: new Date().toISOString().split('T')[0], dataEsecuzione: new Date().toISOString(),
                stato: 'completata', costo: Number(costoRiparazione) || 0, noteEsecuzione: noteIntervento,
                eseguitaDa: user.uid, companyID, createdAt: serverTimestamp()
            });
            await batch.commit();
            setIsLoading(false);
            return { success: true, message: "Riparazione conclusa." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const dismettiArticolo = async (id) => {
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'attrezzature', id), { stato: 'dismesso', updatedAt: serverTimestamp() });
            setIsLoading(false);
            return { success: true, message: "Articolo dismesso." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 5. ASSEGNA MATERIALE ---
    const assegnaMaterialeCantiere = async (dati) => {
        setIsLoading(true);
        setError(null);
        try {
            const { materialeId, cantiereId, nomeCantiere, quantita } = dati;
            const sourceRef = doc(db, 'attrezzature', materialeId);
            
            await runTransaction(db, async (t) => {
                const sourceDoc = await t.get(sourceRef);
                if (!sourceDoc.exists()) throw new Error("Materiale non trovato.");
                const sourceData = sourceDoc.data();
                const qtaDisponibile = Number(sourceData.quantita);
                const qtaDaSpostare = Number(quantita);

                if (qtaDisponibile < qtaDaSpostare) throw new Error(`Giacenza insufficiente.`);
                t.update(sourceRef, { quantita: qtaDisponibile - qtaDaSpostare, updatedAt: serverTimestamp() });

                const destRef = doc(collection(db, 'attrezzature'));
                t.set(destRef, {
                    ...sourceData, quantita: qtaDaSpostare, cantiereId, nomeCantiere,
                    stato: 'in_cantiere', provenienzaId: materialeId, updatedAt: serverTimestamp(), createdAt: serverTimestamp()
                });

                t.set(doc(collection(db, 'movimenti_magazzino')), {
                    tipo: 'trasferimento_cantiere', materialeId, nomeMateriale: sourceData.nome, 
                    cantiereId, nomeCantiere, quantita: qtaDaSpostare, costoUnitario: Number(sourceData.costoUnitario || 0), 
                    valoreTotale: qtaDaSpostare * Number(sourceData.costoUnitario || 0),
                    companyID, operatoreId: user.uid, createdAt: serverTimestamp()
                });
            });
            setIsLoading(false);
            return { success: true, message: "Materiale trasferito." };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 6. RESTITUISCI AVANZO ---
    const restituisciMateriale = async (dati) => { return restituisciAvanzo(dati.materialeId, dati.quantita, dati.note); };

    const restituisciAvanzo = async (materialeId, quantitaResa, note) => {
        setIsLoading(true);
        setError(null);
        try {
            const matRef = doc(db, 'attrezzature', materialeId);
            await runTransaction(db, async (transaction) => {
                const matDoc = await transaction.get(matRef);
                if (!matDoc.exists()) throw new Error("Materiale non trovato.");
                const data = matDoc.data();
                const quantitaConsumata = Number(data.quantita) - Number(quantitaResa);
                if (quantitaConsumata < 0) throw new Error("Resa superiore all'iniziale.");

                if (quantitaConsumata > 0) {
                    transaction.set(doc(collection(db, 'movimenti_magazzino')), {
                        materialeId, nomeMateriale: data.nome, cantiereId: data.cantiereId, nomeCantiere: data.nomeCantiere,
                        quantita: quantitaConsumata, tipo: 'scarico_effettivo', companyID, operatoreId: user.uid,
                        createdAt: serverTimestamp(), note: `Consumo calcolato su reso`
                    });
                }
                transaction.update(matRef, {
                    quantita: Number(quantitaResa), cantiereId: null, nomeCantiere: null,
                    stato: 'disponibile', updatedAt: serverTimestamp(), note: (data.note || '') + `\n[RESO] Rientrato: ${quantitaResa}.`
                });
            });
            setIsLoading(false);
            return { success: true, message: "Reso registrato." };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 7. UPDATE & DELETE ---
    const updateArticolo = async (id, dati) => {
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'attrezzature', id), { ...dati, updatedAt: serverTimestamp() });
            setIsLoading(false);
            return { success: true, message: "Articolo aggiornato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const deleteArticolo = async (id) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'attrezzature', id));
            setIsLoading(false);
            return { success: true, message: "Articolo eliminato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 8. SCARICA MATERIALE ---
    const scaricaMateriale = async (datiScarico) => {
        setIsLoading(true);
        try {
            const materialeRef = doc(db, 'attrezzature', datiScarico.materialeId);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(materialeRef);
                if(!docSnap.exists()) throw new Error("Non trovato");
                const nuovaQta = Number(docSnap.data().quantita) - Number(datiScarico.quantita);
                if(nuovaQta < 0) throw new Error("Giacenza insufficiente");
                
                transaction.update(materialeRef, { quantita: nuovaQta });
                transaction.set(doc(collection(db, 'movimenti_magazzino')), { ...datiScarico, tipo: 'scarico_manuale', companyID, createdAt: serverTimestamp() });
            });
            setIsLoading(false);
            return { success: true, message: "Scarico registrato." };
        } catch (err) {
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    // --- 9. ASSEGNAZIONI MULTIPLE ---
    const creaAssegnazioniMultiple = async (articoli, datiAssegnazione) => {
        setIsLoading(true);
        setError(null);
        try {
            const batch = writeBatch(db);

            articoli.forEach(articolo => {
                const assegnazioneRef = doc(collection(db, 'assegnazioniMagazzino'));
                batch.set(assegnazioneRef, {
                    ...datiAssegnazione,
                    companyID,
                    articoloId: articolo.id,
                    articoloNome: articolo.nome || articolo.modello || 'Articolo Sconosciuto',
                    categoria: articolo.categoria || 'attrezzatura',
                    dataAssegnazione: serverTimestamp(),
                    stato: 'da confermare',         
                    statoWorkflow: 'da confermare', 
                    confermaRicezione: false, 
                    isDPI: datiAssegnazione.isDPI || false, 
                    creatoDa: user.uid
                });

                if (datiAssegnazione.tipo === 'attrezzatura' || articolo.tipoArticolo === 'attrezzatura') {
                    const articoloRef = doc(db, 'attrezzature', articolo.id);
                    batch.update(articoloRef, {
                        stato: 'in_uso',
                        assegnatoA: datiAssegnazione.assegnatoA, 
                        dataUltimaAssegnazione: serverTimestamp()
                    });
                }
            });

            await batch.commit();
            setIsLoading(false);
            return { success: true, message: `${articoli.length} articoli assegnati con successo.` };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, message: err.message };
        }
    };

    const addArticolo = addAttrezzatura; // Alias

    return {
        isLoading, error, addAttrezzatura, addArticolo, addMateriale,
        processaDDT, assegnaMaterialeCantiere, restituisciMateriale,
        restituisciAvanzo, updateArticolo, deleteArticolo, scaricaMateriale,
        accettaSegnalazione, risolviRiparazione, dismettiArticolo, creaAssegnazioniMultiple
    };
};