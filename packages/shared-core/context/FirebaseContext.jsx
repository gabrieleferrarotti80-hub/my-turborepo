import { auth, db, storage } from '../firebaseConfig';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import * as parsers from '../data/dataParsers'; 

const FirebaseContext = createContext(null);

export const useFirebaseData = () => {
    const context = useContext(FirebaseContext);
    if (!context) throw new Error('useFirebaseData deve essere usato all\'interno di un FirebaseProvider');
    return context;
};

// --- CONFIGURAZIONE SOTTOSCRIZIONI (UNIFICATA E CORRETTA) ---
const subscriptionsConfig = {
    companies: { parser: parsers.parseCompany, global: true },
    forms: { parser: parsers.parseForm, global: true },
    aziendeForm: { parser: parsers.parseFormAzienda, global: true },
    users: { parser: parsers.parseUser }, 
    clients: { parser: parsers.parseClient },
    attrezzature: { parser: parsers.parseAttrezzatura },
    archivioAttrezzatura: { parser: parsers.parseArchivioAttrezzatura },
    cantieri: { parser: parsers.parseCantiere },
    assegnazioniCantieri: { parser: parsers.parseAssegnazioneCantiere },
    reports: { parser: parsers.parseReport },
    reportTecnico: { parser: parsers.parseReportTecnico },
    documenti: { parser: parsers.parseDocumento },
    eventi: { parser: parsers.parseEvento }, 
    notifiche: { parser: parsers.parseNotifica, customQuery: (ref, user) => query(ref, where("destinatarioId", "==", user?.uid)) },
    assegnazioniMagazzino: { parser: parsers.parseAssegnazione },
    rapportinoTemplates: { parser: parsers.parseRapportinoTemplate },
    offerte: { parser: parsers.parseOfferta },
    sicurezza_pos: { parser: parsers.parseGeneric },
    presenze: { parser: parsers.parseEvento },
    segnalazioniErrori: { parser: parsers.parseEvento },
    scadenze_mezzi: { parser: parsers.parseGeneric },
    richieste_ferie: { parser: parsers.parseGeneric },
    sal: { parser: parsers.parseGeneric },
    noleggiatori: { parser: parsers.parseGeneric },
    userAssegnazioni: { collectionName: 'assegnazioniMagazzino', parser: parsers.parseAssegnazione, customQuery: (ref, user) => query(ref, where("userId", "==", user?.uid)) },
    
    // --- Moduli Programmazione ---
    subcantieri: { parser: parsers.parseSubcantiere },
    programmazione: { parser: parsers.parseProgrammazione },
    programmazioneLive: { parser: parsers.parseProgrammazione },

    // --- Modulo Fatturazione ---
    fatture: { parser: parsers.parseFattura },

    // --- Modulo Fornitori & Acquisti ---
    fornitori: { parser: parsers.parseGeneric },
    fatture_acquisto: { parser: parsers.parseGeneric },
    preventivi_fornitori: { parser: parsers.parseGeneric },
    ordini_acquisto: { parser: parsers.parseGeneric },
    ddt_acquisti: { parser: parsers.parseGeneric },
    movimenti_magazzino: { parser: parsers.parseGeneric },
    subappaltatori: { parser: parsers.parseGeneric },
    
    // Catalogo Risorse
    catalogo_risorse: { global: true, parser: parsers.parseGeneric },
    catalogo_pending: { global: true, parser: parsers.parseGeneric },

    statoCorrente: { 
        collectionName: 'presenze', 
        parser: (data) => data,
        customQuery: (ref, user) => 
            query(
                ref, 
                where("userId", "==", user.uid), 
                orderBy("timestampInizio", "desc"), 
                limit(1) 
            )
    },

    userPresenze: {
       collectionName: 'presenze',
       parser: (data) => data,
       customQuery: (ref, user) => 
           query(
               ref, 
               where("userId", "==", user.uid), 
               orderBy("timestampInizio", "desc"), 
               limit(60) 
           )
    }
}; // <--- UNICA CHIUSURA CORRETTA DELL'OGGETTO

export const FirebaseProvider = ({ children, collectionsToSub = [] }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userAziendaId, setUserAziendaId] = useState(null); 
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [data, setData] = useState({});
    const [companyFeatures, setCompanyFeatures] = useState(null);
    const initialLoadComplete = useRef(false);
    const expectedLoads = useRef(0);
    const currentLoads = useRef(0);

    const handleCompanyChange = useCallback((companyId) => {
        setUserAziendaId(companyId === 'all' || !companyId ? null : companyId);
        initialLoadComplete.current = false;
        setLoadingData(true);
    }, []);

    // Effetto Autenticazione
    useEffect(() => {
        let unsubUser = () => {}; 
        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
            unsubUser(); 

            if (authUser) {
                const userDocRef = doc(db, 'users', authUser.uid);
                unsubUser = onSnapshot(userDocRef, (docSnap) => { 
                    if (docSnap.exists()) {
                        const userData = parsers.parseUser({ id: docSnap.id, ...docSnap.data() }); 
                        setUser({ ...userData, ...authUser }); 

                        const newRole = userData.ruolo?.toLowerCase() || null;
                        setUserRole(newRole);
                        
                        if (userAziendaId === null && newRole !== 'proprietario') {
                            const initialCompanyId = userData.companyID || null;
                            setUserAziendaId(initialCompanyId);
                        } else if (newRole !== 'proprietario') { 
                            setUserAziendaId(userData.companyID || null);
                        }
                    } else {
                        setUser(null); setUserRole(null); setUserAziendaId(null);
                    }
                    setLoadingAuth(false);
                }, (error) => { 
                    setUser(null); setUserRole(null); setUserAziendaId(null);
                    setLoadingAuth(false);
                });
            } else {
                setUser(null); setUserRole(null); setUserAziendaId(null);
                setCompanyFeatures(null); 
                setData({}); 
                setLoadingAuth(false);
                initialLoadComplete.current = false;
            }
        });
        return () => {
            unsubscribeAuth();
            unsubUser();
        };
    }, [db, userAziendaId]); 

    // Effetto Features
    useEffect(() => {
        const isSuperAdminView = userRole === 'proprietario' && !userAziendaId;

        if (isSuperAdminView) {
            setCompanyFeatures({}); 
            return;
        }
        if (!userAziendaId) {
            setCompanyFeatures(null); 
            return;
        }

        const companyDocRef = doc(db, 'companies', userAziendaId);
        const unsubscribe = onSnapshot(companyDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const features = docSnap.data().enabledFeatures || {};
                setCompanyFeatures(features);
            } else {
                setCompanyFeatures(null); 
            }
        }, (error) => { 
            setCompanyFeatures(null);
        });

        return () => unsubscribe();
    }, [userAziendaId, userRole, db]);

    // Effetto Dati
    useEffect(() => {
        if (loadingAuth) return () => {}; 
        
        if (!user) {
            setLoadingData(false);
            return () => {}; 
        }
        
        if (userRole !== 'proprietario' && !userAziendaId) {
            setData({}); 
            setLoadingData(false); 
            return () => {};
        }

        const isSuperAdminView = userRole === 'proprietario' && !userAziendaId;
        const activeSubscriptions = collectionsToSub.filter(name => subscriptionsConfig[name]);
        
        if (activeSubscriptions.length === 0) {
            setLoadingData(false);
            initialLoadComplete.current = true;
            return () => {}; 
        }

        expectedLoads.current = activeSubscriptions.length;
        currentLoads.current = 0;
        initialLoadComplete.current = false;
        setLoadingData(true);

        const unsubscribers = [];

        activeSubscriptions.forEach(name => {
            const config = subscriptionsConfig[name];
            const collectionName = config.collectionName || name;
            const collectionRef = collection(db, collectionName);
            let q; 
            
            if (isSuperAdminView || config.global) {
                q = collectionRef;
            } else if (config.customQuery && user) {
                q = config.customQuery(collectionRef, user);
            } else if (userAziendaId) {
                q = query(collectionRef, where("companyID", "==", userAziendaId));
            } else {
                q = null; 
            }

            if (q) {
                let firstSnapshotReceived = false; 
                 
                const unsub = onSnapshot(q, (snapshot) => {
                    const collectionData = snapshot.docs.map(doc => {
                        try {
                            const parser = config.parser || ((d) => d);
                            return parser({ id: doc.id, ...doc.data() });
                        } catch (parseError) {
                            return null; 
                        }
                    }).filter(Boolean); 

                    if (name === 'statoCorrente') {
                        const singoloStato = collectionData.length > 0 ? collectionData[0] : null;
                        setData(prev => ({ ...prev, [name]: singoloStato }));
                    } else {
                        setData(prev => ({ ...prev, [name]: collectionData }));
                    }

                    if (!firstSnapshotReceived) {
                        firstSnapshotReceived = true;
                        currentLoads.current += 1;
                        if (currentLoads.current >= expectedLoads.current && !initialLoadComplete.current) {
                            setLoadingData(false);
                            initialLoadComplete.current = true;
                        }
                    }
                }, (error) => { 
                    setData(prev => ({ ...prev, [name]: [] })); 
                     if (!firstSnapshotReceived) {
                        firstSnapshotReceived = true;
                        currentLoads.current += 1;
                        if (currentLoads.current >= expectedLoads.current && !initialLoadComplete.current) {
                            setLoadingData(false);
                            initialLoadComplete.current = true;
                        }
                    }
                });
                unsubscribers.push(unsub);
            } else {
                currentLoads.current += 1;
                if (currentLoads.current >= expectedLoads.current && !initialLoadComplete.current) {
                    setLoadingData(false);
                    initialLoadComplete.current = true;
                }
            }
        });
            
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, userRole, userAziendaId, loadingAuth, collectionsToSub, db]);
// Calcola il valore del context
   const value = useMemo(() => {
        const effectiveUserRole = (userRole === 'proprietario' && userAziendaId) ? 'titolare-azienda' : userRole;

        const getCantieriAssegnati = () => {
                if (!user || !data?.assegnazioniCantieri || !data?.cantieri) return [];
                try {
                    const assignedCantiereIds = new Set(
                        (data.assegnazioniCantieri || [])
                        .filter(ass => (ass.teamMemberIds || []).includes(user.uid))
                        .map(ass => ass.cantiereId)
                    );
                    return (data.cantieri || []).filter(cantiere => assignedCantiereIds.has(cantiere.id));
                } catch(e) {
                        return [];
                }
        };

        return {
            user, 
            userRole, 
            effectiveUserRole, 
            userAziendaId, 
            companyID: userAziendaId,
            loadingAuth, 
            loadingData, 
            
            ...data, 
            
            // 🌟 FIX: Aggiungiamo db, auth e storage dentro l'oggetto data
            data: { 
                ...data, 
                cantieriAssegnati: getCantieriAssegnati(),
                db: db,          // <--- La modifica fondamentale!
                auth: auth,
                storage: storage 
            }, 
            
            db, 
            auth, 
            storage, 
            handleCompanyChange, 
            companyFeatures, 
        };
    }, [user, userRole, userAziendaId, loadingAuth, loadingData, data, companyFeatures, handleCompanyChange, db, storage]);
    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
};