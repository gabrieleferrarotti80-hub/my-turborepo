// packages/shared-core/context/FirebaseContext.jsx
import { auth, db, storage } from '../firebaseConfig';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import * as parsers from '../data/dataParsers'; // Importa tutti i parser

const FirebaseContext = createContext(null);

export const useFirebaseData = () => {
 	const context = useContext(FirebaseContext);
 	if (!context) throw new Error('useFirebaseData deve essere usato all\'interno di un FirebaseProvider');
 	return context;
};

// --- ❗ OGGETTO CONFIG CORRETTO (SENZA DUPLICATI) ---
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
 	notifiche: { parser: parsers.parseNotifica, customQuery: (ref, user) => query(ref, where("destinatarioId", "==", user?.uid)) }, // Usa user.uid
 	assegnazioniMagazzino: { parser: parsers.parseAssegnazione },
 	rapportinoTemplates: { parser: parsers.parseRapportinoTemplate },
 	offerte: { parser: parsers.parseOfferta },
 	presenze: {
 	 	parser: parsers.parseEvento,
 	},
 	segnalazioniErrori: {
 	 	parser: parsers.parseEvento, 
 	},
 	userAssegnazioni: { collectionName: 'assegnazioniMagazzino', parser: parsers.parseAssegnazione, customQuery: (ref, user) => query(ref, where("userId", "==", user?.uid)) }, // Usa user.uid
 	
    // --- UNICA DEFINIZIONE DI 'statoCorrente' ---
   statoCorrente: { 
        collectionName: 'presenze', 
        parser: (data) => data,
        customQuery: (ref, user) => 
            query(
                ref, 
                where("userId", "==", user.uid), 
                // 👈 FILTRO "lavoro" RIMOSSO
                orderBy("timestampInizio", "desc"), 
                limit(1) 
            )
    },

userPresenze: {
        collectionName: 'presenze',
       parser: (data) => data,// Assicurati che 'parseEvento' sia corretto
        customQuery: (ref, user) => 
            query(
                ref, 
                where("userId", "==", user.uid), 
                orderBy("timestampInizio", "desc"), 
                limit(60) // Come da tua documentazione 
            )
    },
    // NOTA: userPresenze non era nel tuo ultimo file, l'ho rimosso per coerenza
    // Se ti serve, la sua query dovrebbe anche usare user.uid
}

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
 	 	console.log('[FirebaseContext] Company ID cambiato a:', companyId === 'all' || !companyId ? null : companyId);
		initialLoadComplete.current = false;
		setLoadingData(true);
 	}, []);

 	// Effetto per l'autenticazione
	useEffect(() => {
		console.log('[FirebaseContext] Avvio listener autenticazione...');
		let unsubUser = () => {}; 
		const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
			console.log('[FirebaseContext] Stato autenticazione cambiato:', authUser ? `Utente ${authUser.uid}` : 'Nessun utente');
			unsubUser(); 

			if (authUser) {
				const userDocRef = doc(db, 'users', authUser.uid);
				unsubUser = onSnapshot(userDocRef, (docSnap) => { 
					if (docSnap.exists()) {
						const userData = parsers.parseUser({ id: docSnap.id, ...docSnap.data() }); 
						console.log('[FirebaseContext] Dati utente ricevuti:', userData);
                        
                        // --- ❗ CORREZIONE SOVRASCRITTURA UID ---
                        // Invertiamo l'ordine: userData prima, authUser dopo.
                        // authUser (con .uid) sovrascrive userData (che non ha .uid)
                        // L'oggetto finale avrà:
                        // user.id = "pzEK9E..." (dal documento)
                        // user.uid = "pzEK9E..." (da authUser)
						setUser({ ...userData, ...authUser }); 
                        // --- FINE CORREZIONE ---

						const newRole = userData.ruolo?.toLowerCase() || null;
						setUserRole(newRole);
						
                        if (userAziendaId === null && newRole !== 'proprietario') {
							const initialCompanyId = userData.companyID || null;
							setUserAziendaId(initialCompanyId);
							console.log('[FirebaseContext] Impostato companyID iniziale da utente:', initialCompanyId);
						} else if (newRole !== 'proprietario') { 
                            setUserAziendaId(userData.companyID || null);
                            console.log('[FirebaseContext] CompanyID utente non proprietario:', userData.companyID || null);
                        } else {
							console.log('[FirebaseContext] Mantenuto companyID esistente per proprietario:', userAziendaId);
						}
					} else {
						console.warn(`[FirebaseContext] Documento utente non trovato per UID: ${authUser.uid}`);
						setUser(null); setUserRole(null); setUserAziendaId(null);
					}
					setLoadingAuth(false);
				}, (error) => { 
					console.error("[FirebaseContext] Errore snapshot dati utente:", error);
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
			console.log('[FirebaseContext] Pulizia listener autenticazione e utente.');
			unsubscribeAuth();
			unsubUser();
		};
	}, []); // ❗ NOTA: userAziendaId rimosso dalle dipendenze, gestito solo da handleCompanyChange


 	// Effetto per caricare le feature
	useEffect(() => {
		const isSuperAdminView = userRole === 'proprietario' && !userAziendaId;
		console.log(`[FirebaseContext] Aggiornamento features. Ruolo: ${userRole}, AziendaID: ${userAziendaId}, SuperAdminView: ${isSuperAdminView}`);

		if (isSuperAdminView) {
			setCompanyFeatures({}); 
			console.log('[FirebaseContext] Vista SuperAdmin: Feature impostate a {}.');
			return;
		}
		if (!userAziendaId) {
			setCompanyFeatures(null); 
			console.log('[FirebaseContext] Nessuna azienda selezionata: Feature impostate a null.');
			return;
		}

		console.log(`[FirebaseContext] Caricamento features per azienda: ${userAziendaId}`);
		const companyDocRef = doc(db, 'companies', userAziendaId);
		const unsubscribe = onSnapshot(companyDocRef, (docSnap) => {
			if (docSnap.exists()) {
				const features = docSnap.data().enabledFeatures || {};
				setCompanyFeatures(features);
				console.log(`[FirebaseContext] Features caricate per ${userAziendaId}:`, features);
			} else {
				console.warn(`[FirebaseContext] Documento azienda ${userAziendaId} non trovato. Features impostate a null.`);
				setCompanyFeatures(null); 
			}
		}, (error) => { 
			console.error(`[FirebaseContext] Errore snapshot features azienda ${userAziendaId}:`, error);
			setCompanyFeatures(null);
		});

		return () => {
			console.log(`[FirebaseContext] Pulizia listener features azienda ${userAziendaId}.`);
			unsubscribe();
		};
	}, [userAziendaId, userRole]);


 	// Effetto Principale per Caricamento Dati
 	useEffect(() => {
 	 	console.log('[FirebaseContext] Esecuzione effetto caricamento dati. loadingAuth:', loadingAuth, 'User:', !!user);
 	 	
 	 	if (loadingAuth) {
 	 	 	return () => {}; 
 	 	}
        
 	 	if (!user) {
            setLoadingData(false);
            return () => {}; 
 	 	}
        
 	 	if (userRole !== 'proprietario' && !userAziendaId) {
 	 	 	console.log('[FirebaseContext] Utente non proprietario senza azienda selezionata. Reset dati.');
 	 	 	setData({}); 
 	 	 	setLoadingData(false); 
 	 	 	return () => {};
 	 	}

 	 	const isSuperAdminView = userRole === 'proprietario' && !userAziendaId;
 	 	console.log(`[FirebaseContext] Vista SuperAdmin attiva: ${isSuperAdminView}`);

 	 	const activeSubscriptions = collectionsToSub.filter(name => subscriptionsConfig[name]);
 	 	if (activeSubscriptions.length === 0) {
 	 	 	console.log('[FirebaseContext] Nessuna collezione valida richiesta. Caricamento completato.');
 	 	 	setLoadingData(false);
			initialLoadComplete.current = true;
 	 	 	return () => {}; 
 	 	}

 	 	console.log('[FirebaseContext] Inizio iscrizione collezioni:', activeSubscriptions);

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

 	 	 	console.log(`[FirebaseContext] 🪵 Configurazione per '${name}':`, config);
 	 	 	
 	 	 	if (isSuperAdminView || config.global) {
 	 	 	 	q = collectionRef;
 	 	 	 	console.log(`[FirebaseContext] 🪵 '${name}' è globale o SuperAdmin: Query = collection('${collectionName}')`);
 	 	 	} else if (config.customQuery && user) {
 	 	 	 	q = config.customQuery(collectionRef, user);
 	 	 	 	console.log(`[FirebaseContext] 🪵 '${name}' usa customQuery`);
 	 	 	} else if (userAziendaId) {
 	 	 	 	q = query(collectionRef, where("companyID", "==", userAziendaId));
 	 	 	 	console.log(`[FirebaseContext] 🪵 '${name}' filtrata per companyID=${userAziendaId}`);
 	 	 	} else {
 	 	 	 	console.warn(`[FirebaseContext] Query non definita per ${name}, userAziendaId mancante.`);
 	 	 	 	q = null; 
 	 	 	}

 	 	 	if (q) {
 	 	 	 	console.log(`[FirebaseContext] 🪵 Sottoscrizione a '${name}'...`); 
 	 	 	 	let firstSnapshotReceived = false; 
                 
 	 	 	 	const unsub = onSnapshot(q, (snapshot) => {
 	 	 	 	 	console.log(`[FirebaseContext] 🪵 Ricevuto snapshot per '${name}'. Numero documenti: ${snapshot.size}`);
 	 	 	 	 	
 	 	 	 	 	const collectionData = snapshot.docs.map(doc => {
 	 	 	 	 	 	try {
 	 	 	 	 	 	 	return config.parser({ id: doc.id, ...doc.data() });
 	 	 	 	 	 	} catch (parseError) {
 	 	 	 	 	 	 	console.error(`[FirebaseContext] 🪵 Errore parsing documento ${doc.id} in '${name}':`, parseError, doc.data());
 	 	 	 	 	 	 	return null; 
 	 	 	 	 	 	}
 	 	 	 	 	}).filter(Boolean); 

 	 	 	 	 	// --- ❗ SOLUZIONE 2: MODIFICARE QUESTA PARTE ---
 	 	 	 	 	if (name === 'statoCorrente') {
                        // Se è statoCorrente, prendi il primo elemento o null
 	 	 	 	 	 	const singoloStato = collectionData.length > 0 ? collectionData[0] : null;
                        console.log(`[FirebaseContext] 🪵 Dati '${name}' (singolo):`, singoloStato);
 	 	 	 	 	 	setData(prev => ({ ...prev, [name]: singoloStato }));
 	 	 	 	 	} else {
                        // Altrimenti, salva l'array come al solito
 	 	 	 	 	 	console.log(`[FirebaseContext] 🪵 Dati '${name}' dopo parsing:`, collectionData);
 	 	 	 	 	 	setData(prev => ({ ...prev, [name]: collectionData }));
 	 	 	 	 	}
                    // --- FINE SOLUZIONE 2 ---
					if (!firstSnapshotReceived) {
						firstSnapshotReceived = true;
						currentLoads.current += 1;
						console.log(`[FirebaseContext] ⏳ Caricamento ${name} completato (${currentLoads.current}/${expectedLoads.current})`);
						if (currentLoads.current >= expectedLoads.current && !initialLoadComplete.current) {
							console.log("🏁 TUTTI i dati iniziali sono stati caricati. Loading completato.");
							setLoadingData(false);
							initialLoadComplete.current = true;
						}
					}
 	 	 	 	}, (error) => { 
 	 	 	 	 	console.error(`[FirebaseContext] 🪵 Errore onSnapshot per '${name}':`, error);
 	 	 	 	 	setData(prev => ({ ...prev, [name]: [] })); 
                     if (!firstSnapshotReceived) {
                        firstSnapshotReceived = true;
                        currentLoads.current += 1;
                        console.error(`[FirebaseContext] ⏳ Caricamento ${name} FALLITO (${currentLoads.current}/${expectedLoads.current})`);
                        if (currentLoads.current >= expectedLoads.current && !initialLoadComplete.current) {
                            console.log("🏁 TUTTI i dati iniziali sono stati tentati (con errori). Loading completato.");
                            setLoadingData(false);
                            initialLoadComplete.current = true;
                        }
                    }
 	 	 	 	});
 	 	 	 	unsubscribers.push(unsub);
 	 	 	} else {
				currentLoads.current += 1;
				console.log(`[FirebaseContext] ⏳ Sottoscrizione a ${name} saltata (${currentLoads.current}/${expectedLoads.current})`);
				if (currentLoads.current >= expectedLoads.current && !initialLoadComplete.current) {
					console.log("🏁 TUTTI i dati iniziali sono stati caricati/saltati. Loading completato.");
					setLoadingData(false);
					initialLoadComplete.current = true;
				}
			}
 	 	});
 	 	 	
 	 	return () => {
 	 	 	console.log('[FirebaseContext] Pulizia sottoscrizioni dati...');
 	 	 	unsubscribers.forEach(unsub => unsub());
 	 	};
 	}, [user, userRole, userAziendaId, loadingAuth, collectionsToSub]);


 	// Calcola il valore del context
 	const value = useMemo(() => {
 	 	const effectiveUserRole = (userRole === 'proprietario' && userAziendaId) ? 'titolare-azienda' : userRole;

 	 	const getCantieriAssegnati = () => {
 	 	 	 	if (!user || !data?.assegnazioniCantieri || !data?.cantieri) return [];
 	 	 	 	try {
 	 	 	 	 	const assignedCantiereIds = new Set(
 	 	 	 	 	 	(data.assegnazioniCantieri || [])
                        // --- ❗ CORREZIONE ID: user.uid (ora è corretto) ---
 	 	 	 	 	 	.filter(ass => (ass.teamMemberIds || []).includes(user.uid))
 	 	 	 	 	 	.map(ass => ass.cantiereId)
 	 	 	 	 	);
 	 	 	 	 	return (data.cantieri || []).filter(cantiere => assignedCantiereIds.has(cantiere.id));
 	 	 	 	} catch(e) {
 	 	 	 	 	 	console.error("Errore in getCantieriAssegnati:", e);
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
 	 	 	data: { ...data, cantieriAssegnati: getCantieriAssegnati() }, 
 	 	 	db, 
 	 	 	auth, 
 	 	 	storage, 
 	 	 	handleCompanyChange, 
 	 	 	companyFeatures, 
 	 	};
 	}, [user, userRole, userAziendaId, loadingAuth, loadingData, data, companyFeatures, handleCompanyChange]);

 	return (
 	 	<FirebaseContext.Provider value={value}>
 	 	 	{children}
 	 	</FirebaseContext.Provider>
 	);
};