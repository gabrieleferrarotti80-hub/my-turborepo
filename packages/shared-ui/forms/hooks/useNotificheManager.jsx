import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

export const useNotificheManager = (db) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const markAsRead = async (notificaId) => {
        setIsUpdating(true);
        try {
            const docRef = doc(db, 'notifiche', notificaId);
            await updateDoc(docRef, {
                letta: true
            });
        } catch (error) {
            console.error("Errore nel segnare la notifica come letta:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return { markAsRead, isUpdating };
};