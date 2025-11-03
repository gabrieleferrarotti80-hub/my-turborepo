import { useState, useEffect, useMemo, useCallback } from 'react';

// ✅ Assicurati che l'hook riceva anche 'onApprove' come terzo argomento
export const useElaborazioneFormLogic = (offerta, onSubmit, onApprove) => {

    // Stato principale del form
    const [formData, setFormData] = useState({
        scontoProposto: 0,
        costiAnalisi: {},
        tempistichePreviste: '',
        docCMECompilatoFiles: [], // File object temporanei per l'upload
        statoDocumenti: {},
        datiSopralluogoReport: {},
        approvazioneNecessaria: false,
        utenteApprovazioneId: '',
    });

    // Stato per i File object separati in attesa di upload dai modal
    const [pendingFiles, setPendingFiles] = useState({
        costi: [],
        documenti: {} // { docId: File }
    });


    // Stato dei modal
    const [isAnalisiCostiOpen, setIsAnalisiCostiOpen] = useState(false);
    const [isStatoDocumentiOpen, setIsStatoDocumentiOpen] = useState(false);
    const [isSopralluogoOpen, setIsSopralluogoOpen] = useState(false);

    // Popolamento iniziale
    useEffect(() => {
        // ✅ --- AGGIUNTO CONTROLLO ---
        // Esegui la logica solo se 'offerta' esiste
        if (offerta) {
            // Popola da datiElaborazione se esiste
            if (offerta.datiElaborazione) {
                // Fai attenzione a non sovrascrivere i file in attesa se ricarichi
                setFormData(prev => ({
                    ...prev,
                    ...offerta.datiElaborazione,
                    // Resetta i campi file se necessario o gestisci lo stato pre-esistente
                    docCMECompilatoFiles: [],
                }));
            }
            // Popola da datiSopralluogoReport se esiste
            if (offerta.datiSopralluogoReport) {
                 setFormData(prev => ({ ...prev, datiSopralluogoReport: offerta.datiSopralluogoReport }));
            }
            // Potresti voler resettare il form a uno stato iniziale se l'offerta cambia
            // e non ha dati salvati per questa fase.
            // else {
            //    setFormData({ /*... stato iniziale vuoto ...*/ });
            //    setPendingFiles({ costi: [], documenti: {} });
            // }
        }
        // ✅ --- FINE CONTROLLO ---

    // ✅ Aggiornata dipendenza all'intero oggetto 'offerta'
    }, [offerta]);

    // Calcoli derivati
    const costiTotali = useMemo(() => {
        return formData.costiAnalisi?.totale || 0; // Già corretto con ?.
    }, [formData.costiAnalisi]);

    const valoreScontato = useMemo(() => {
        // ✅ Aggiunto optional chaining ?. per sicurezza
        const valoreIniziale = offerta?.datiAnalisi?.valoreEconomico || 0;
        return valoreIniziale * (1 - (formData.scontoProposto || 0) / 100);
     // ✅ Aggiornata dipendenza
    }, [offerta?.datiAnalisi?.valoreEconomico, formData.scontoProposto]);

    const utilePrevisto = useMemo(() => {
        return valoreScontato - costiTotali;
    }, [valoreScontato, costiTotali]);

    // Handlers
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []);

   // --- ✅ CORREGGI QUESTA FUNZIONE ---
    const handleSubmit = useCallback(() => { // Rimuovi il parametro 'e'
        // Non serve e.preventDefault() qui
        
        // Passa i dati (formData e pendingFiles dallo scope dell'hook) 
        // alla funzione onSubmit ricevuta come prop (da OfferteContent)
        onSubmit(formData, pendingFiles); 
        
    }, [formData, onSubmit, pendingFiles]); // Dipendenze corrette
    // --- FINE CORREZIONE ---
    // Handlers per i modal che separano dati JSON da File object
    const handleAnalisiCostiSave = useCallback(({ costiData, fileObjects }) => {
        console.log("Dati Analisi Costi salvati:", costiData);
        setFormData(prev => ({ ...prev, costiAnalisi: costiData }));
        setPendingFiles(prev => ({ ...prev, costi: fileObjects || [] }));
        setIsAnalisiCostiOpen(false);
    }, []);

    const handleStatoDocumentiSave = useCallback(({ automatici, manualFileObjects }) => {
        console.log("Dati Stato Documenti salvati:", { automatici, manualFileObjects });
        setFormData(prev => ({
            ...prev,
            statoDocumenti: {
                automatici: automatici,
                manualiRef: Object.keys(manualFileObjects || {}) // Salva riferimento ai file manuali
            }
        }));
        setPendingFiles(prev => ({ ...prev, documenti: manualFileObjects || {} }));
        setIsStatoDocumentiOpen(false);
    }, []);

    const handleSopralluogoSave = useCallback((editedData) => {
        console.log("Dati Sopralluogo corretti salvati:", editedData);
        setFormData(prev => ({ ...prev, datiSopralluogoReport: editedData }));
        setIsSopralluogoOpen(false);
    }, []);

    const handleApproveClick = useCallback(async () => {
         // ✅ Aggiunto optional chaining ?. per sicurezza
        if (offerta?.id && typeof onApprove === 'function') {
            try {
                await onApprove(offerta.id);
                console.log("Offerta approvata (chiamata da hook)");
            } catch (error) {
                 console.error("Errore durante l'approvazione dall'hook:", error);
            }
        } else {
             console.warn("Impossibile approvare: ID offerta mancante o funzione onApprove non fornita.");
        }
    // ✅ Aggiornata dipendenza
    }, [offerta?.id, onApprove]);

    // Ritorna tutto ciò che serve alla UI
    return {
        formData, setFormData,
        handleSubmit, handleChange,
        valoreScontato, costiTotali, utilePrevisto,
        isAnalisiCostiOpen, setIsAnalisiCostiOpen,
        isStatoDocumentiOpen, setIsStatoDocumentiOpen,
        isSopralluogoOpen, setIsSopralluogoOpen,
        handleAnalisiCostiSave, handleStatoDocumentiSave,
        handleSopralluogoSave,
        handleApproveClick,
        pendingFiles // ✅ Ritorna i file in attesa
    };
};