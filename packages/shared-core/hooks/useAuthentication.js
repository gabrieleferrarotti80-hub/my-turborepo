// Percorso: packages/shared-core/hooks/useAuthentication.js

import { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebaseData } from '../context/FirebaseContext';

export const useAuthentication = () => {
    const { auth, db } = useFirebaseData();
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const handleLogout = useCallback(async () => {
        try { if (auth) await signOut(auth); }
        catch (error) { console.error("Errore logout:", error); }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setCurrentUser(null);
                setLoadingAuth(false);
            } else if (!user.ruolo) { // Solo se non è già arricchito
                const fetchUserData = async () => {
                    const userDocRef = doc(db, 'users', user.uid);
                    try {
                        const docSnap = await getDoc(userDocRef);
                        if (docSnap.exists()) {
                            // Arricchisce l'utente e SOLO ORA il caricamento è finito
                            setCurrentUser({ ...user, ...docSnap.data() });
                        } else {
                            setCurrentUser({ ...user, ruolo: 'guest' });
                        }
                    } catch (error) {
                        setCurrentUser({ ...user, ruolo: 'guest' });
                    } finally {
                        setLoadingAuth(false); // Caricamento terminato in ogni caso
                    }
                };
                fetchUserData();
            }
        });
        return () => unsubscribe();
    }, [auth, db]);

    return useMemo(() => ({ currentUser, loadingAuth, handleLogout }), [currentUser, loadingAuth, handleLogout]);
};