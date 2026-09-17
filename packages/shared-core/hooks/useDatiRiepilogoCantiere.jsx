import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const useDatiRiepilogoCantiere = (db, cantiereId, userAziendaId) => {
    
    const [datiCantiere, setDatiCantiere] = useState({
        squadraDiOggi: [],
        fasiAperte: [],
        giacenzeCantiere: []
    });
    
    const [isLoadingRiepilogo, setIsLoadingRiepilogo] = useState(false);

    useEffect(() => {
        // 🌟 CONTROLLO DI SICUREZZA MULTI-TENANT AGGIUNTO
        if (!db || !cantiereId || !userAziendaId) {
            setDatiCantiere({ squadraDiOggi: [], fasiAperte: [], giacenzeCantiere: [] });
            return;
        }

        const fetchDatiCantiere = async () => {
            setIsLoadingRiepilogo(true);
            try {
                // ---------------------------------------------------------
                // 1. RECUPERA LA SQUADRA DI OGGI (E GLI ID DELLE FASI)
                // ---------------------------------------------------------
                const qAssegnazioni = query(
                    collection(db, 'assegnazioniCantieri'),
                    where('companyID', '==', userAziendaId), // 🔒 BLOCCO TENANT
                    where('cantiereId', '==', cantiereId),
                    where('stato', '==', 'attiva') 
                );
                const snapAssegnazioni = await getDocs(qAssegnazioni);
                
                const teamMap = new Map();
                const fasiIdsAssegnateOggi = new Set();

                // Calcoliamo la mezzanotte di oggi per fare un confronto pulito
                const oggi = new Date();
                oggi.setHours(0, 0, 0, 0);

                snapAssegnazioni.forEach(doc => {
                    const data = doc.data();
                    
                    // 🌟 FIX 1: Validazione Date! L'assegnazione include la giornata di oggi?
                    let isOggi = true;
                    if (data.dataInizio && data.dataFine) {
                        const start = data.dataInizio.toDate ? data.dataInizio.toDate() : new Date(data.dataInizio);
                        const end = data.dataFine.toDate ? data.dataFine.toDate() : new Date(data.dataFine);
                        
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999); // Fine giornata
                        
                        if (oggi < start || oggi > end) {
                            isOggi = false; // L'assegnazione è attiva, ma non per oggi!
                        }
                    }

                    // Se è prevista per oggi, salviamo il personale e le fasi
                    if (isOggi) {
                        if (data.faseId) fasiIdsAssegnateOggi.add(data.faseId);
                        
                        if (data.team && Array.isArray(data.team)) {
                            data.team.forEach(m => {
                                if (!teamMap.has(m.userId)) {
                                    teamMap.set(m.userId, {
                                        id: m.userId,
                                        nome: m.nome,
                                        ruolo: m.ruolo,
                                        ore: data.durataOre || 8 
                                    });
                                }
                            });
                        }
                    }
                });

                // Se non c'è nessuna fase lavorata oggi, restituiamo subito i risultati vuoti
                if (fasiIdsAssegnateOggi.size === 0) {
                    setDatiCantiere({
                        squadraDiOggi: Array.from(teamMap.values()),
                        fasiAperte: [],
                        giacenzeCantiere: []
                    });
                    setIsLoadingRiepilogo(false);
                    return;
                }

                // ---------------------------------------------------------
                // 2. RECUPERA LE FASI DEL CANTIERE A COLPO SICURO
                // ---------------------------------------------------------
                // 🌟 FIX 2: Togliamo i filtri di 'stato' o 'cantiereId'. Chiediamo a Firebase 
                // ESATTAMENTE gli ID dei documenti trovati al passaggio 1.
                const fasiIdsArray = Array.from(fasiIdsAssegnateOggi).slice(0, 10); // Firebase accetta max 10 elementi per la query "in"
                
                const qSubcantieri = query(
                    collection(db, 'subcantieri'),
                    where('__name__', 'in', fasiIdsArray) // "__name__" è una keyword di Firebase per indicare il Document ID
                );
                
                const snapSubcantieri = await getDocs(qSubcantieri);
                
                let fasiList = [];
                const masterIdsDaCercare = new Set();

                snapSubcantieri.forEach(doc => {
                    const data = doc.data();
                    fasiList.push({
                        id: doc.id,
                        masterId: data.masterId || null,
                        descrizione: data.nomeSubcantiere || data.nome || data.titolo || 'Fase senza nome',
                        oreDedicate: 0, 
                        quantitaProdotta: '',
                        um: 'cad', 
                        isTerminata: false
                    });
                    if (data.masterId) masterIdsDaCercare.add(data.masterId);
                });

                // ---------------------------------------------------------
                // 3. RECUPERA LE UNITA' DI MISURA DALLE VOCI MASTER
                // ---------------------------------------------------------
                if (masterIdsDaCercare.size > 0) {
                    const masterIdsArray = Array.from(masterIdsDaCercare).slice(0, 10);
                    const qMaster = query(
                        collection(db, 'listini_aziendali'),
                        where('__name__', 'in', masterIdsArray)
                    );
                    const snapMaster = await getDocs(qMaster);
                    
                    const masterMap = {};
                    snapMaster.forEach(doc => { masterMap[doc.id] = doc.data(); });

                    fasiList = fasiList.map(fase => {
                        if (fase.masterId && masterMap[fase.masterId]) {
                            return { ...fase, um: masterMap[fase.masterId].unitaMisura || 'cad' };
                        }
                        return fase;
                    });
                }

                setDatiCantiere({
                    squadraDiOggi: Array.from(teamMap.values()),
                    fasiAperte: fasiList,
                    giacenzeCantiere: []
                });

            } catch (error) {
                console.error("Errore fatale nel recupero dati riepilogo:", error);
            } finally {
                setIsLoadingRiepilogo(false);
            }
        };

        fetchDatiCantiere();

    }, [db, cantiereId, userAziendaId]); 

    return { datiCantiere, isLoadingRiepilogo };
};