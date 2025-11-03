import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export const useSegnalazioniGuasti = (db, userAziendaId) => {
    const [segnalazioni, setSegnalazioni] = useState([]);
    const [loadingSegnalazioni, setLoadingSegnalazioni] = useState(true);

    useEffect(() => {
        if (!db || !userAziendaId) {
            setLoadingSegnalazioni(false);
            return;
        };

        const q = query(
            collection(db, 'assegnazioniMagazzino'),
            where('companyID', '==', userAziendaId),
            where('statoAssegnazione', '==', 'guasto')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSegnalazioni = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                };
            });
            setSegnalazioni(fetchedSegnalazioni);
            setLoadingSegnalazioni(false);
        }, (error) => {
            console.error("Errore nel caricamento delle segnalazioni:", error);
            setLoadingSegnalazioni(false);
        });

        return () => unsubscribe();
    }, [db, userAziendaId]);

    return { segnalazioni, loadingSegnalazioni };
};