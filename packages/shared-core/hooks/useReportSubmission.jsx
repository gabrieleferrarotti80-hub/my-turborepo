import { useState, useRef } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { reportSchema } from '../data/schemas.js';
import { formatForFirestore } from '../data/dataParsers.js';

export const useReportSubmission = ({ db, storage, user, company, selectedCantiere, tipologiaAzione, setMessage }) => {
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const photoInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const API_ENDPOINT = 'https://salvarilevazionecantiere-test.cloudfunctions.net/salvaRilevazioneCantiere';

    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleVideoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file); 
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setMessage("Posizione acquisita con successo!");
                },
                (error) => {
                    console.error("Errore nel recupero della posizione:", error);
                    setMessage("Impossibile recuperare la posizione.");
                }
            );
        } else {
            setMessage("Geolocalizzazione non supportata dal browser.");
        }
    };

    const handleFormSubmit = async (nota = "") => {
        if (!selectedCantiere || !user || !user.uid) {
            setMessage("Dati utente o cantiere mancanti.");
            return;
        }

        if (!photo && !location) {
            setMessage("Aggiungi almeno una foto o la posizione prima di inviare.");
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            let photoUrl = '';
            let videoUrl = '';
            
            if (photo) {
                const isVideo = photo.type.startsWith('video/');
                const storageRef = ref(storage, `uploads/${user.uid}/${selectedCantiere}/${Date.now()}_${photo.name}`);
                const snapshot = await uploadBytes(storageRef, photo);
                const url = await getDownloadURL(snapshot.ref);

                if (isVideo) {
                    videoUrl = url;
                } else {
                    photoUrl = url;
                }
            }
            
            const reportDataGrezzi = {
                cantiereId: selectedCantiere,
                tecnicoId: user.uid,
                nota: nota,
                posizione: location,
                fotoUrls: photoUrl ? [photoUrl] : [],
                videoUrls: videoUrl ? [videoUrl] : [],
                dataReport: Timestamp.now(),
                stato: 'inviato',
                companyId: company?.id, 
                azione: tipologiaAzione, 
                userId: user.uid,
            };

            const datiPuliti = formatForFirestore(reportDataGrezzi, reportSchema);

            if (API_ENDPOINT) {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datiPuliti) 
                });

                if (!response.ok) {
                    throw new Error(`Errore HTTP: ${response.status}`);
                }

                const result = await response.json();
                console.log("Report inviato con successo (CF):", result);
                setMessage("Report inviato con successo!");
            } else {
                console.warn("API_ENDPOINT non definito, salvataggio solo su Firestore.");
                await addDoc(collection(db, 'reports'), datiPuliti); 
                setMessage("Report inviato con successo su Firestore.");
            }

            setPhoto(null);
            setPhotoPreview(null);
            setLocation(null);
        } catch (error) {
            console.error("Errore nell'invio del report:", error);
            setMessage(`Errore: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return {
        photo,
        photoPreview,
        handlePhotoCapture,
        handleVideoCapture,
        handleLocation,
        handleFormSubmit,
        loading,
        location,
        photoInputRef,
        videoInputRef
    };
};