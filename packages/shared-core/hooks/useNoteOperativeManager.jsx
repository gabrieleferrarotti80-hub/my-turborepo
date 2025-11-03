import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebaseData } from '../context/FirebaseContext';

export const useNoteOperativeManager = () => {
    const { db, storage, user, userAziendaId } = useFirebaseData();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Funzione per ottenere la geolocalizzazione
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("La geolocalizzazione non è supportata da questo browser."));
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }),
                (err) => reject(new Error(`Errore di geolocalizzazione: ${err.message}`))
            );
        });
    };

    // Funzione principale esposta all'UI
    const addNotaOperativa = async (note, files) => {
        if (!user || !userAziendaId) {
            setError("Utente non valido o azienda non selezionata.");
            return { success: false, message: "Utente non valido." };
        }
        if (!files || files.length === 0) {
            return { success: false, message: "Devi aggiungere almeno una foto." };
        }

        setIsSaving(true);
        setError(null);

        try {
            // 1. Ottieni la geolocalizzazione
            const location = await getCurrentLocation();

            // 2. Carica le foto su Firebase Storage
            const uploadPromises = files.map(file => {
                const fileRef = ref(storage, `noteOperative/${userAziendaId}/${user.uid}/${Date.now()}_${file.name}`);
                return uploadBytes(fileRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            const photoUrls = await Promise.all(uploadPromises);

            // 3. Prepara il documento da salvare
            const newNota = {
                note: note || '',
                photoUrls,
                geolocation: location,
                createdAt: serverTimestamp(), // Firestore userà l'orario del server
                companyID: userAziendaId,
                userID: user.uid,
            };

            // 4. Salva il documento in Firestore
            await addDoc(collection(db, 'noteOperative'), newNota);

            setIsSaving(false);
            return { success: true, message: "Nota operativa salvata con successo!" };

        } catch (err) {
            console.error("Errore nel salvataggio della nota operativa:", err);
            setError(err.message);
            setIsSaving(false);
            return { success: false, message: err.message };
        }
    };

    return { addNotaOperativa, isSaving, error };
};