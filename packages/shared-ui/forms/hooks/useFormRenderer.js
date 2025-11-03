// packages/shared-core/hooks/useFormRenderer.js
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebaseData } from '../context/FirebaseContext';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- FUNZIONE HELPER: LEGGE VALORI ANNIDATI ---
const getNestedValue = (obj, path) => {
    if (!obj || !path) return null;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : null, obj);
};

// --- FUNZIONE HELPER: APRE FOTOCAMERA/SELETTORE FILE ---
const openFilePicker = (acceptType) => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptType;
        input.capture = 'environment';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) { resolve(file); }
            else { reject(new Error("Acquisizione file fallita o annullata.")); }
        };
        input.oncancel = () => { reject(new Error("Acquisizione file annullata dall'utente.")); };
        input.onerror = (err) => {
             console.error("[openFilePicker] Errore input file:", err);
             reject(new Error("Errore durante l'accesso alla fotocamera/file."));
        };
        input.click();
    });
};


export const useFormRenderer = (formTemplateId, options = {}) => {
    const { offertaId, initialData = {} } = options;
    const { db,storage } = useFirebaseData();

    const [templateStructure, setTemplateStructure] = useState(null);
    const [formData, setFormData] = useState(initialData || {});
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(true); // Stato UNICO di caricamento
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [error, setError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});

    // --- 1. Carica la struttura del template ---
    useEffect(() => {
        if (!formTemplateId) {
            setError("Nessun ID template fornito.");
            setIsLoadingTemplate(false);
            return;
        }

        const fetchTemplate = async () => {
            setTemplateStructure(null);
            // Usa initialData qui per il reset quando il template cambia
            setFormData(initialData || {});
            setError(null);
            setIsLoadingTemplate(true);
            try {
                const templateRef = doc(db, 'forms', formTemplateId);
                const docSnap = await getDoc(templateRef);
                if (docSnap.exists()) {
                    setTemplateStructure(docSnap.data().formStructure);
                    console.log("[useFormRenderer] Template caricato.");
                    if (!offertaId) {
                        // Se non c'è offerta, il caricamento finisce qui
                        setIsLoadingTemplate(false);
                        console.log("[useFormRenderer] Fetch template completato (senza offerta).");
                    } else {
                        console.log("[useFormRenderer] In attesa popolamento dati offerta...");
                        // Altrimenti, isLoading resta true
                    }
                } else {
                    setError(`Template non trovato con ID: ${formTemplateId}`);
                    setIsLoadingTemplate(false);
                }
            } catch (err) {
                setError(`Errore caricamento template: ${err.message}`);
                console.error("Errore fetchTemplate:", err);
                setIsLoadingTemplate(false);
            }
        };
        fetchTemplate();
    // ✅ RIMOSSO initialData dalle dipendenze! Dipende solo da formTemplateId e db.
    }, [formTemplateId, db]);


    // --- 2. Carica dati offerta e pre-compila campi ---
    useEffect(() => {
        // Esegui solo se abbiamo template, offertaId e db
        if (!templateStructure || !offertaId || !db) {
            // Se templateStructure è null ma non c'è offertaId, il primo effect ha già gestito isLoading
            // Se templateStructure c'è ma non offertaId, non fare nulla qui
            return;
        }

        // Se siamo qui e isLoadingTemplate è true, stiamo aspettando questo effect
        // Se siamo qui e isLoadingTemplate è false, significa che il template è cambiato e dobbiamo ripopolare

        const populateInitialData = async () => {
            console.log("[useFormRenderer] Pre-compilo i dati per l'offerta:", offertaId);
            setError(null);
            // Assicurati che loading sia true mentre popoliamo, anche se il template era già caricato
            setIsLoadingTemplate(true);

            try {
                const offertaRef = doc(db, 'offerte', offertaId);
                const offertaSnap = await getDoc(offertaRef);
                if (!offertaSnap.exists()) {
                    setError(`Documento offerta non trovato: ${offertaId}`);
                    return; // Finisce nel finally
                }

                const offertaData = offertaSnap.data();
                const populatedData = {};
                for (const [fieldId, fieldConfig] of Object.entries(templateStructure)) {
                    let valueToSet = undefined;
                    let isPopulated = false;
                    // --- Gestione layout-bundle e legacy ---
                    if (fieldConfig.type === 'layout-bundle') {
                         const targetPath = fieldConfig.bundlePath?.[0];
                         if (targetPath?.collection === 'offerte' && targetPath.targetField) { valueToSet = getNestedValue(offertaData, targetPath.targetField); isPopulated = true; }
                         else if (fieldConfig.bundleComponentType === 'date') { valueToSet = new Date().toISOString().substring(0, 10); isPopulated = true; }
                    } else { /* ... gestione legacy ... */ }

                    // Salvataggio dati popolati
                    if (valueToSet !== undefined && valueToSet !== null) { populatedData[fieldId] = valueToSet; }
                    else if (isPopulated) { populatedData[fieldId] = ''; }
                }
                console.log("[useFormRenderer] Dati popolati finali:", populatedData);
                // Applica i dati popolati sopra a initialData (se fornito) e allo stato precedente
                setFormData(prev => ({ ...(initialData || {}), ...prev, ...populatedData }));

            } catch (error) {
                setError(`Errore pre-compilazione: ${error.message}`);
                console.error("Errore populateInitialData:", error);
            } finally {
                // ✅ IMPOSTA isLoadingTemplate a false QUI, SEMPRE ALLA FINE
                setIsLoadingTemplate(false);
                console.log("[useFormRenderer] Popolamento dati offerta completato (isLoadingTemplate: false).");
            }
        };

        populateInitialData();

    // ✅ CORREZIONE: RIMOSSO initialData dalle dipendenze!
    }, [templateStructure, offertaId, db]);


    // --- 3. Handler handleChange ---
    const handleChange = useCallback((fieldId, value) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    // --- 4. Handler handleFileUpload ---
    const handleFileUpload = useCallback(async (fieldId, acceptType) => {
        setIsUploadingFiles(true); // Indica che un upload è in corso (generico)
        setUploadProgress(prev => ({ ...prev, [fieldId]: 0 })); // Resetta progresso per questo campo (opzionale)
        setError(null);

        try {
            const file = await openFilePicker(acceptType);
            if (!file || typeof file.name !== 'string') {
                throw new Error("File non valido o selezione annullata.");
            }
            console.log(`[useFormRenderer] File ottenuto per ${fieldId}:`, file.name);

            // --- Logica di Upload REALE su Firebase Storage ---
            if (!storage) {
                throw new Error("Istanza di Firebase Storage non disponibile.");
            }

            // Crea un percorso univoco per il file nello Storage
            // Es: sopralluoghi/BJpRWddpxrjkdQYxEJKR/photo-123/167..._nomefile.jpg
            const uniqueFileName = `${Date.now()}_${file.name}`;
            const storagePath = `sopralluoghi/${offertaId || 'senza-offerta'}/${fieldId}/${uniqueFileName}`;
            const storageRef = ref(storage, storagePath);

            console.log(`[useFormRenderer] Inizio upload su Storage: ${storagePath}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            // (Opzionale) Monitora il progresso dell'upload
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [fieldId]: progress }));
                    console.log(`[useFormRenderer] Upload ${fieldId}: ${progress}%`);
                },
                (uploadError) => {
                    // Gestisce errori durante l'upload
                    console.error(`[useFormRenderer] Errore durante l'upload per ${fieldId}:`, uploadError);
                    // Rilancia l'errore per farlo catturare dal blocco catch principale
                    throw new Error(`Upload fallito: ${uploadError.code}`);
                },
                async () => {
                    // Upload completato con successo
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log(`[useFormRenderer] Upload completato per ${fieldId}. URL:`, downloadURL);

                        // --- Salvataggio URL in formData (Array) ---
                        setFormData(prev => {
                            const currentFiles = prev[fieldId] ? (Array.isArray(prev[fieldId]) ? prev[fieldId] : [prev[fieldId]]) : [];
                            return { ...prev, [fieldId]: [...currentFiles, downloadURL] };
                        });
                        setIsUploadingFiles(false); // Fine upload per QUESTO file
                        setUploadProgress(prev => ({ ...prev, [fieldId]: 100 })); // Segna come completo (opzionale)

                    } catch (getUrlError) {
                         console.error(`[useFormRenderer] Errore nel recuperare il download URL per ${fieldId}:`, getUrlError);
                         setError(`Errore recupero URL file: ${getUrlError.message}`);
                         setIsUploadingFiles(false); // Anche se l'upload è riuscito, c'è stato un errore dopo
                    }
                }
            );
            // Non c'è bisogno di aspettare qui se si usa l'observer on()

        } catch (err) {
             if (err.message.includes("annullata")) {
                 console.log("[useFormRenderer] Acquisizione/Selezione file annullata.");
             } else {
                 setError(`Errore acquisizione/upload per ${fieldId}: ${err.message}`);
                 console.error(`Errore per ${fieldId}:`, err);
             }
             setIsUploadingFiles(false); // Assicura che lo stato di upload termini in caso di errore iniziale
             setUploadProgress(prev => ({ ...prev, [fieldId]: -1 })); // Indica errore (opzionale)
        }
        // Rimosso finally qui, gestito dall'observer dell'uploadTask
    }, [storage, offertaId, setFormData]); // Dipende da storage, offertaId, setFormData

    // --- 5. Funzione getFormData ---
    const getFormData = useCallback(() => formData, [formData]);

    // --- 6. Ritorna lo stato e gli handler ---
    return {
        templateStructure,
        formData,
        isLoading: isLoadingTemplate, // Stato unico di caricamento
        isUploadingFiles,
        error,
        handleChange,
        handleFileUpload,
        getFormData,
    };
};