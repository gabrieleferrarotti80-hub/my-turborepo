// packages/shared-core/hooks/useElaborazioneFormLogic.js

import { useState, useEffect, useMemo, useCallback } from 'react';

export const useElaborazioneFormLogic = (offerta, onSubmit, onApprove) => {

    const [formData, setFormData] = useState({
        scontoProposto: 0,
        costiAnalisi: {},
        tempistichePreviste: '', // Durata cantiere
        dataInizioPresunta: '',  // 🌟 Data inizio per agenda
        personaleCoinvolto: '',  // 🌟 Squadre per agenda
        noteApprovazione: '',    // 🌟 Note per il revisore/approvatore
        docCMECompilatoFiles: [], 
        statoDocumenti: {},
        datiSopralluogoReport: {},
        approvazioneNecessaria: false,
        utenteApprovazioneId: '',
    });

    const [pendingFiles, setPendingFiles] = useState({
        costi: [],
        documenti: {} 
    });

    const [isStatoDocumentiOpen, setIsStatoDocumentiOpen] = useState(false);
    const [isSopralluogoOpen, setIsSopralluogoOpen] = useState(false);

    useEffect(() => {
        if (offerta) {
            // Recuperiamo lo sconto suggerito dal computo se esiste
            const scontoComputo = offerta.datiComputo?.scontoApplicato || offerta.datiAnalisi?.computoMetrico?.ribassoGara || 0;

            if (offerta.datiElaborazione) {
                setFormData(prev => ({
                    ...prev,
                    ...offerta.datiElaborazione,
                    // Se lo sconto nell'elaborazione è 0 o mancante, suggeriamo quello del computo
                    scontoProposto: offerta.datiElaborazione.scontoProposto || scontoComputo,
                    docCMECompilatoFiles: [],
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    scontoProposto: scontoComputo
                }));
            }

            if (offerta.datiSopralluogoReport) {
                 setFormData(prev => ({ ...prev, datiSopralluogoReport: offerta.datiSopralluogoReport }));
            }
        }
    }, [offerta]);

    const costiTotali = useMemo(() => {
        return formData.costiAnalisi?.totale || formData.costiAnalisi?.costiTotali || 0; 
    }, [formData.costiAnalisi]);

    const valoreScontato = useMemo(() => {
        const valoreIniziale = offerta?.datiAnalisi?.valoreEconomico || 0;
        return valoreIniziale * (1 - (formData.scontoProposto || 0) / 100);
    }, [offerta?.datiAnalisi?.valoreEconomico, formData.scontoProposto]);

    const utilePrevisto = useMemo(() => {
        return valoreScontato - costiTotali;
    }, [valoreScontato, costiTotali]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []);

    const handleSubmit = useCallback((dataToSubmit = formData, files = pendingFiles) => { 
        onSubmit(dataToSubmit, files); 
    }, [formData, onSubmit, pendingFiles]); 

    const handleStatoDocumentiSave = useCallback(({ automatici, manualFileObjects }) => {
        setFormData(prev => ({
            ...prev,
            statoDocumenti: {
                automatici: automatici,
                manualiRef: Object.keys(manualFileObjects || {}) 
            }
        }));
        setPendingFiles(prev => ({ ...prev, documenti: manualFileObjects || {} }));
        setIsStatoDocumentiOpen(false);
    }, []);

    const handleSopralluogoSave = useCallback((editedData) => {
        setFormData(prev => ({ ...prev, datiSopralluogoReport: editedData }));
        setIsSopralluogoOpen(false);
    }, []);

    const handleApproveClick = useCallback(async () => {
        if (offerta?.id && typeof onApprove === 'function') {
            try {
                await onApprove(offerta.id);
            } catch (error) {
                 console.error("Errore durante l'approvazione dall'hook:", error);
            }
        }
    }, [offerta?.id, onApprove]);

    return {
        formData, setFormData,
        handleSubmit, handleChange,
        valoreScontato, costiTotali, utilePrevisto,
        isStatoDocumentiOpen, setIsStatoDocumentiOpen,
        isSopralluogoOpen, setIsSopralluogoOpen,
        handleStatoDocumentiSave,
        handleSopralluogoSave,
        handleApproveClick,
        pendingFiles 
    };
};