import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

// ✅ MODIFICA: Ora importiamo dal pacchetto condiviso 'shared-core'
import { auth, db } from 'shared-core';
import { 
    parseUser, 
    parseCompany, 
    parseClient, 
    parseAttrezzatura, 
    parseAssegnazione, 
    parseArchivioAttrezzatura,
    parseCantiere,
    parseAssegnazioneCantiere,
    parseReport,
    parseReportTecnico, 
    parseFormAzienda, 
    parseForm, 
    parseDocumento, 
    parseEvento,
    parseNotifica
} from 'shared-core';

const '../context/shared-core/context/FirebaseContext.jsx' = createContext(null);

export const useFirebaseData = () => {
    const context = useContext('../context/shared-core/context/FirebaseContext.jsx');
    if (!context) {
        throw new Error('useFirebaseData deve essere usato all\'interno di un FirebaseProvider');
    }
    return context;
};

export const FirebaseProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userAziendaId, setUserAziendaId] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    
    // STATI PER TUTTE LE COLLEZIONI
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [attrezzature, setAttrezzature] = useState([]);
    const [assegnazioni, setAssegnazioni] = useState([]);
    const [archivioAttrezzature, setArchivioAttrezzature] = useState([]);
    const [cantieri, setCantieri] = useState([]);
    const [assegnazioniCantieri, setAssegnazioniCantieri] = useState([]);
    const [reports, setReports] = useState([]);
    const [reportTecnico, setReportTecnico] = useState([]);
    const [aziendeForm, setAziendeForm] = useState([]);
    const [forms, setForms] = useState([]);
    const [documenti, setDocumenti] = useState([]);
    const [eventi, setEventi] = useState([]);
    const [notifiche, setNotifiche] = useState([]);

    const handleCompanyChange = useCallback((companyId) => {
        setUserAziendaId(companyId === 'all' ? null : companyId);
    }, []);

    // Autenticazione
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = parseUser({ id: docSnap.id, ...docSnap.data() });
                        setUser(currentUser);
                        setUserRole(userData.ruolo);
                        setUserAziendaId(userData.companyID || null);
                    } else {
                        setUser(null); setUserRole('guest'); setUserAziendaId(null);
                    }
                    setLoadingAuth(false);
                });
                return () => unsubscribeUser();
            } else {
                setUser(null); setUserRole('guest'); setUserAziendaId(null);
                setLoadingAuth(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Caricamento Dati
    useEffect(() => {
        if (loadingAuth || !user) {
            return;
        }

        const companyIdFilter = (userRole === 'proprietario' && !userAziendaId) ? null : userAziendaId;
        
        if (!companyIdFilter && userRole !== 'proprietario') {
            setLoadingData(false);
            setCompanies([]); setUsers([]); setClients([]); setAttrezzature([]);
            setAssegnazioni([]); setArchivioAttrezzature([]); setCantieri([]);
            setAssegnazioniCantieri([]); setReports([]); setReportTecnico([]);
            setAziendeForm([]); setForms([]); setDocumenti([]); setEventi([]); setNotifiche([]);
            return;
        }

        const subscriptions = [
            { name: 'companies', setter: setCompanies, parser: parseCompany, global: true },
            { name: 'forms', setter: setForms, parser: parseForm, global: true },
            { name: 'aziendeForm', setter: setAziendeForm, parser: parseFormAzienda, global: true },
            { name: 'users', setter: setUsers, parser: parseUser },
            { name: 'clients', setter: setClients, parser: parseClient },
            { name: 'attrezzature', setter: setAttrezzature, parser: parseAttrezzatura },
            { name: 'assegnazioniMagazzino', setter: setAssegnazioni, parser: parseAssegnazione },
            { name: 'archivioAttrezzatura', setter: setArchivioAttrezzature, parser: parseArchivioAttrezzatura },
            { name: 'cantieri', setter: setCantieri, parser: parseCantiere },
            { name: 'assegnazioniCantieri', setter: setAssegnazioniCantieri, parser: parseAssegnazioneCantiere },
            { name: 'reports', setter: setReports, parser: parseReport },
            { name: 'reportTecnico', setter: setReportTecnico, parser: parseReportTecnico },
            { name: 'documenti', setter: setDocumenti, parser: parseDocumento },
            { name: 'eventi', setter: setEventi, parser: parseEvento },
            { 
                name: 'notifiche', 
                setter: setNotifiche, 
                parser: parseNotifica,
                customQuery: (ref, user) => query(ref, where("destinatarioId", "==", user.uid))
            },
        ];
        
        setLoadingData(true);
        let loadedCount = 0;
        const totalSubscriptions = subscriptions.length;

        const unsubscribes = subscriptions.map(({ name, setter, parser, global = false, customQuery }) => {
            const collectionRef = collection(db, name);
            let q;
            
            if (customQuery) {
                q = customQuery(collectionRef, user);
            } else {
                q = (companyIdFilter && !global) ? query(collectionRef, where("companyID", "==", companyIdFilter)) : collectionRef;
            }
            
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => parser({ id: doc.id, ...doc.data() }));
                setter(data);
                if (loadedCount < totalSubscriptions) {
                    loadedCount++;
                    if (loadedCount === totalSubscriptions) {
                        setLoadingData(false);
                    }
                }
            }, (error) => {
                console.error(`Errore nel caricamento di ${name}:`, error);
                if (loadedCount < totalSubscriptions) { loadedCount++; if (loadedCount === totalSubscriptions) { setLoadingData(false); } }
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user, userRole, userAziendaId, loadingAuth]);

    const value = useMemo(() => ({
        user, userRole, userAziendaId, loadingAuth, loadingData,
        companies, users, clients, attrezzature, assegnazioni, archivioAttrezzature,
        cantieri, assegnazioniCantieri, reports, reportTecnico, aziendeForm, forms,
        documenti, eventi, 
        notifiche,
        db, auth, 
        handleCompanyChange
    }), [
        user, userRole, userAziendaId, loadingAuth, loadingData,
        companies, users, clients, attrezzature, assegnazioni, archivioAttrezzature,
        cantieri, assegnazioniCantieri, reports, reportTecnico, aziendeForm, forms,
        documenti, eventi, 
        notifiche,
        handleCompanyChange
    ]);

    return (
        <'../context/shared-core/context/FirebaseContext.jsx'.Provider value={value}>
            {children}
        </'../context/shared-core/context/FirebaseContext.jsx'.Provider>
    );
};