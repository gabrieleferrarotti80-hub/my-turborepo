import { useState, useCallback } from 'react';
import { 
    collection, 
    doc, 
    setDoc, 
    updateDoc, 
    serverTimestamp, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    getDoc,      
    writeBatch   
} from 'firebase/firestore';

const fatturaSchema = {
    numeroFattura: "",
    dataEmissione: null,
    stato: "Da Inviare",
    clienteId: "",
    ragioneSocialeCliente: "",
    indirizzoCliente: "",
    pivaCliente: "",
    codiceFiscaleCliente: "",
    cantiereId: null,
    offertaId: null,
    riferimentoLavori: "",
    righe: [],
    imponibile: 0,
    aliquotaIva: 22,
    importoIva: 0,
    totaleDocumento: 0,
    metodoPagamento: "Bonifico Bancario",
    scadenzaPagamento: null,
    note: "",
    companyID: "",
    createdBy: "",
    createdAt: null,
    updatedAt: null,
    
    // --- DATI CLIENTE DETTAGLIATI ---
    capCliente: "",
    cittaCliente: "",
    provinciaCliente: "",
    sdiCliente: "",       
    pecCliente: "",
};

export const useFatturazioneManager = (db, user, companyID) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleError = (err) => {
        console.error("Errore in useFatturazioneManager:", err);
        setError(err.message);
        setIsLoading(false);
    };

    // --- FUNZIONE HELPER PER IL NUMERO AUTOMATICO ---
    const calcolaProssimoNumero = async () => {
        try {
            const annoCorrente = new Date().getFullYear().toString();
            const fattureRef = collection(db, 'fatture');
            
            const q = query(
                fattureRef, 
                where("companyID", "==", companyID),
                orderBy("createdAt", "desc"), 
                limit(1)
            );
            
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return `${annoCorrente}-001`; 
            }

            const ultimaFattura = snapshot.docs[0].data();
            const ultimoNumeroStr = ultimaFattura.numeroFattura || "";

            if (ultimoNumeroStr.startsWith(annoCorrente)) {
                const parti = ultimoNumeroStr.split(/[-/]/); 
                const progressivo = parseInt(parti[parti.length - 1], 10); 
                
                if (!isNaN(progressivo)) {
                    const nuovoProgressivo = String(progressivo + 1).padStart(3, '0');
                    return `${annoCorrente}-${nuovoProgressivo}`;
                }
            }

            const dataUltima = ultimaFattura.createdAt?.toDate();
            if (dataUltima && dataUltima.getFullYear() < new Date().getFullYear()) {
                 return `${annoCorrente}-001`; 
            }

            return ""; 

        } catch (e) {
            console.warn("Impossibile calcolare il prossimo numero automaticamente:", e);
            return "";
        }
    };


    // 1. ✅ CREA FATTURA (Sincronizzata col SAL)
    const createFattura = async (datiFattura) => {
        setIsLoading(true);
        setError(null);
        
        if (!companyID || !user) {
            handleError(new Error("Utente o Azienda non validi."));
            return { success: false, message: "Utente o Azienda non validi." };
        }

        try {
            const newFatturaRef = doc(collection(db, 'fatture'));
            
            let numeroFinale = datiFattura.numeroFattura;
            if (!numeroFinale || numeroFinale.trim() === "") {
                numeroFinale = await calcolaProssimoNumero();
            }

            const batch = writeBatch(db);

            const datiFinali = {
                ...fatturaSchema,
                ...datiFattura,
                numeroFattura: numeroFinale, 
                id: newFatturaRef.id,
                companyID: companyID,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // Se creiamo la fattura già con lo stato "Pagata"
            if (datiFinali.stato === 'Pagata') {
                if (!datiFinali.dataIncasso) datiFinali.dataIncasso = new Date().toISOString().split('T')[0];
                
                if (datiFinali.salId) {
                    const salRef = doc(db, 'sal', datiFinali.salId);
                    batch.update(salRef, {
                        stato: 'Pagato',
                        dataPagamento: datiFinali.dataIncasso,
                        updatedAt: serverTimestamp()
                    });
                }
            }

            batch.set(newFatturaRef, datiFinali);
            await batch.commit();
            
            setIsLoading(false);
            return { success: true, id: newFatturaRef.id, message: `Fattura ${numeroFinale} creata con successo.` };
            
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    };
    
    // 2. ✅ AGGIORNA FATTURA DA FORM (Sincronizzata col SAL e Retroattiva)
    const updateFattura = async (fatturaId, datiAggiornati) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!fatturaId) throw new Error("ID fattura mancante.");
            const fatturaRef = doc(db, 'fatture', fatturaId);
            
            // Leggiamo la fattura attuale per recuperare il salId (se nascosto nel form) e i vecchi dati
            const fatturaSnap = await getDoc(fatturaRef);
            const fatturaEsistente = fatturaSnap.exists() ? fatturaSnap.data() : {};
            
            const batch = writeBatch(db);
            
            const updatePayload = {
                ...datiAggiornati,
                updatedAt: serverTimestamp()
            };

            // Se la stiamo salvando come Pagata (utile per riallineare le vecchie fatture)
            if (datiAggiornati.stato === 'Pagata') {
                if (!datiAggiornati.dataIncasso && !fatturaEsistente.dataIncasso) {
                    updatePayload.dataIncasso = new Date().toISOString().split('T')[0];
                }
                
                const salIdDaAggiornare = datiAggiornati.salId || fatturaEsistente.salId;
                if (salIdDaAggiornare) {
                    const salRef = doc(db, 'sal', salIdDaAggiornare);
                    batch.update(salRef, {
                        stato: 'Pagato',
                        dataPagamento: updatePayload.dataIncasso || fatturaEsistente.dataIncasso || new Date().toISOString().split('T')[0],
                        updatedAt: serverTimestamp()
                    });
                }
            }

            batch.update(fatturaRef, updatePayload);
            await batch.commit();

            setIsLoading(false);
            return { success: true, message: "Fattura aggiornata con successo." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    };

    // 3. ✅ AGGIORNA STATO DA BOTTONE RAPIDO (Sincronizzata col SAL)
    const updateStatoFattura = async (fatturaId, nuovoStato) => {
        setIsLoading(true);
        setError(null);
        try {
            const fatturaRef = doc(db, 'fatture', fatturaId);
            
            const fatturaSnap = await getDoc(fatturaRef);
            if (!fatturaSnap.exists()) throw new Error("Fattura non trovata.");
            const fatturaData = fatturaSnap.data();

            const batch = writeBatch(db);

            const updateFatturaData = {
                stato: nuovoStato,
                updatedAt: serverTimestamp()
            };

            if (nuovoStato === 'Pagata') {
                updateFatturaData.dataIncasso = new Date().toISOString().split('T')[0];
            }

            batch.update(fatturaRef, updateFatturaData);

            if (nuovoStato === 'Pagata' && fatturaData.salId) {
                const salRef = doc(db, 'sal', fatturaData.salId);
                batch.update(salRef, {
                    stato: 'Pagato',
                    dataPagamento: new Date().toISOString().split('T')[0],
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();

            setIsLoading(false);
            return { success: true, message: `Stato fattura aggiornato a ${nuovoStato}.` };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    };

    // 4. ELIMINA FATTURA
    const deleteFattura = async (fatturaId) => {
        setIsLoading(true);
        setError(null);
        try {
            if (!fatturaId) throw new Error("ID fattura mancante.");
            await deleteDoc(doc(db, 'fatture', fatturaId));
            setIsLoading(false);
            return { success: true, message: "Fattura eliminata." };
        } catch (err) {
            handleError(err);
            return { success: false, message: err.message };
        }
    };

    return { 
        isLoading, 
        error, 
        createFattura, 
        updateFattura,      
        updateStatoFattura, 
        deleteFattura,
        calcolaProssimoNumero 
    };
};