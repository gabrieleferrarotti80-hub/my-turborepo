import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// Funzione di utilità per arricchire i dati grezzi con informazioni dettagliate.
const enrichData = (itemsRaw, articoli, users) => {
    if (!itemsRaw || !articoli || !users) {
        return [];
    }

    return itemsRaw.map(item => {
        const articoloCorrispondente = articoli.find(a => a.id === item.articolo?.id);
        const dipendenteCorrispondente = users.find(u => u.id === item.dipendente?.id);
        
        return {
            ...item,
            articolo: articoloCorrispondente || item.articolo || {},
            dipendente: dipendenteCorrispondente || item.dipendente || {},
        };
    });
};

export const useRiconsegneData = (db, userAziendaId) => {
    const [riconsegne, setRiconsegne] = useState([]);
    const [archivio, setArchivio] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !userAziendaId) {
            setLoading(false);
            return;
        }

        const unsubscribes = [];
        let dataLoaded = { riconsegne: false, articoli: false, users: false, archivio: false };
        let allRiconsegne = [];
        let allArticoli = [];
        let allUsers = [];
        let allArchivio = [];

        const checkAndSetData = () => {
            if (dataLoaded.riconsegne && dataLoaded.articoli && dataLoaded.users && dataLoaded.archivio) {
                const enrichedRiconsegne = enrichData(allRiconsegne, allArticoli, allUsers);
                const enrichedArchivio = enrichData(allArchivio, allArticoli, allUsers);
                
                setRiconsegne(enrichedRiconsegne);
                setArchivio(enrichedArchivio);
                setLoading(false);
                console.log("Dati di riconsegne e archivio arricchiti e caricati.");
            }
        };

        // Listener 1: Riconsegne
        const qRiconsegne = query(
            collection(db, 'assegnazioniMagazzino'),
            where('companyID', '==', userAziendaId),
            where('statoAssegnazione', '==', 'in riconsegna')
        );
        unsubscribes.push(onSnapshot(qRiconsegne, (snapshot) => {
            allRiconsegne = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataLoaded.riconsegne = true;
            checkAndSetData();
        }));

        // Listener 2: Archivio Assegnazioni
        const qArchivio = query(
            collection(db, 'archivioAssegnazioniMagazzino'),
            where('companyID', '==', userAziendaId)
        );
        unsubscribes.push(onSnapshot(qArchivio, (snapshot) => {
            allArchivio = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataLoaded.archivio = true;
            checkAndSetData();
        }));

        // Listener 3: Articoli
        const qArticoli = query(collection(db, 'magazzino'), where('companyID', '==', userAziendaId));
        unsubscribes.push(onSnapshot(qArticoli, (snapshot) => {
            allArticoli = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataLoaded.articoli = true;
            checkAndSetData();
        }));

        // Listener 4: Utenti
        const qUsers = query(collection(db, 'users'), where('companyID', '==', userAziendaId));
        unsubscribes.push(onSnapshot(qUsers, (snapshot) => {
            allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataLoaded.users = true;
            checkAndSetData();
        }));

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [db, userAziendaId]);

    return { riconsegne, archivio, loading };
};