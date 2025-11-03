// packages/shared-core/hooks/useRevisioneLogic.js
import { useState, useMemo, useCallback, useEffect } from 'react';

export const useRevisioneLogic = (
    offerta,
    user,
    onLogProroga, // Callback per registrare la proroga
    onArchivia,   // Callback per archiviare l'offerta
    onSetInviata  // Callback per impostare lo stato a 'inviata'
) => {
    // Stato per la visibilità dei modal
    const [isControlloDocOpen, setIsControlloDocOpen] = useState(false);
    const [isScadenzaAlertOpen, setIsScadenzaAlertOpen] = useState(false);
    const [isConfermaInvioOpen, setIsConfermaInvioOpen] = useState(false);

    // Stato per la checkbox "Invio da piattaforma"
    const [isInvioPiattaformaChecked, setIsInvioPiattaformaChecked] = useState(
        offerta?.inviataDaPiattaforma || false // Popola dallo stato esistente se c'è
    );

    // Popola stato checkbox se l'offerta cambia
    useEffect(() => {
        setIsInvioPiattaformaChecked(offerta?.inviataDaPiattaforma || false);
    }, [offerta]);


    // --- Stato Derivato ---

    // Calcola se l'offerta è scaduta
    const isScaduta = useMemo(() => {
        const scadenzaString = offerta?.datiAnalisi?.referente?.scadenza; // Legge la data/ora di scadenza
        if (!scadenzaString) return false; // Se non c'è scadenza, non è scaduta

        try {
            // Converte la stringa (es. '2025-10-31T11:47' o Timestamp Firestore) in Data
            const scadenzaDate = scadenzaString.toDate ? scadenzaString.toDate() : new Date(scadenzaString);
             // Confronta con la data e ora attuali
            return scadenzaDate < new Date();
        } catch (error) {
            console.error("Errore nel parsing della data di scadenza:", error);
            return false; // In caso di errore, considerala non scaduta
        }
    }, [offerta?.datiAnalisi?.referente?.scadenza]);

    // --- ✅ Logica documentiStatus AGGIORNATA (con dettagli file) ---
    const documentiStatus = useMemo(() => {
        const richiesti = offerta?.datiAnalisi?.documentiRichiesti?.filter(doc => doc.checked) || [];
        if (richiesti.length === 0) return [];

        const datiAnalisi = offerta?.datiAnalisi || {};
        const datiElaborazione = offerta?.datiElaborazione || {};
        const statoDocumentiSalvati = datiElaborazione.statoDocumenti || {};
        
        // Collezione di tutti i file potenzialmente disponibili
        const allAvailableFiles = [
             ...(datiAnalisi.docGaraGenerali || []),
             ...(datiAnalisi.docGaraEconomici || []),
             ...(datiAnalisi.docGaraTecnici || []),
             ...(datiAnalisi.docCME || []),
             ...(datiElaborazione.docCMECompilato || []),
             ...(statoDocumentiSalvati.automatici || []), // Assumiamo contengano { url, nome, tipo, ... }
             // Aggiungere qui i file caricati manualmente se salviamo i loro URL/path nell'offerta
             // ...(statoDocumentiSalvati.manuali || []) 
        ];
        
        // Funzione helper per trovare un file in base all'ID/tipo richiesto
        const findFileById = (docId) => {
            // Logica di match (potrebbe servire raffinarla in base ai tuoi dati)
            // Es: Cerca per 'tipo' se presente, altrimenti cerca per ID specifico come 'cme'
            let foundFile = allAvailableFiles.find(file => file.tipo === docId); 
            
            // Logica specifica per CME (controlla entrambi i caricamenti)
            if (!foundFile && docId === 'cme') {
                 foundFile = allAvailableFiles.find(file => file.path?.includes('/cme/') || file.path?.includes('/cme_compilato/'));
            }
             // Potresti aggiungere altra logica di matching qui se necessario
            
            return foundFile; // Ritorna l'oggetto file trovato { url, nome, ... } o undefined
        }

        return richiesti.map(docRichiesto => {
            const foundFile = findFileById(docRichiesto.id);
            let status = 'missing'; 
            
            if (foundFile) {
                status = 'found';
                // TODO: Aggiungere logica 'expired' se i file hanno scadenza
            }

            return {
                ...docRichiesto,
                status: status,
                // ✅ Include l'oggetto file se trovato
                fileDetails: foundFile || null 
            };
        });
    }, [offerta?.datiAnalisi, offerta?.datiElaborazione]); 
    // --- FINE Logica documentiStatus AGGIORNATA ---


    // --- Handlers ---

    // Apre il controllo documentale o l'alert scadenza
    const handleControlloDocClick = useCallback(() => {
        if (isScaduta && !offerta?.logProroghe?.length > 0) { // Mostra alert solo se scaduta E non c'è già una proroga registrata
            setIsScadenzaAlertOpen(true);
        } else {
            setIsControlloDocOpen(true);
        }
    }, [isScaduta, offerta?.logProroghe]);

    // Chiude il modal controllo documentale
    const handleCloseControlloDoc = useCallback(() => {
        setIsControlloDocOpen(false);
    }, []);

    // Conferma l'uso della proroga
    const handleProrogaConfirm = useCallback(async () => {
        if (offerta?.id && user?.uid && onLogProroga) {
            try {
                await onLogProroga(offerta.id, user.uid);
                setIsScadenzaAlertOpen(false);
                setIsControlloDocOpen(true); // Apre il controllo doc dopo aver loggato la proroga
            } catch (error) {
                console.error("Errore durante il log della proroga:", error);
                alert("Errore durante la registrazione della proroga.");
            }
        }
    }, [offerta?.id, user?.uid, onLogProroga]);

    // Conferma l'archiviazione
    const handleArchiviaConfirm = useCallback(async () => {
        if (offerta?.id && onArchivia) {
            try {
                await onArchivia(offerta.id);
                setIsScadenzaAlertOpen(false);
                // L'offerta verrà rimossa o il suo stato cambierà,
                // gestito da OfferteContent
            } catch (error) {
                console.error("Errore durante l'archiviazione:", error);
                alert("Errore durante l'archiviazione dell'offerta.");
            }
        }
    }, [offerta?.id, onArchivia]);

    // Gestisce il cambio della checkbox "Invio da piattaforma"
    const handleInvioPiattaformaChange = useCallback((e) => {
        const isChecked = e.target.checked;
        setIsInvioPiattaformaChecked(isChecked);
        if (isChecked) {
            setIsConfermaInvioOpen(true); // Apre il modal di conferma
        } else if (offerta?.id && onSetInviata) {
            // Se deselezionata, potremmo voler ANNULLARE lo stato inviata?
            // Al momento non facciamo nulla, ma potresti chiamare onSetInviata(offerta.id, false)
            console.log("Checkbox 'Invio da piattaforma' deselezionata.");
             // onSetInviata(offerta.id, false); // OPZIONALE: Annulla lo stato inviata
        }
    }, [offerta?.id, onSetInviata]);

    // Conferma l'invio da piattaforma
    const handleConfermaInvioYes = useCallback(async () => {
        if (offerta?.id && onSetInviata) {
            try {
                await onSetInviata(offerta.id, true); // Imposta come inviata da piattaforma
                setIsConfermaInvioOpen(false);
            } catch (error) {
                console.error("Errore durante l'impostazione 'inviata':", error);
                alert("Errore durante il salvataggio dello stato.");
            }
        }
    }, [offerta?.id, onSetInviata]);

    // Annulla l'invio da piattaforma (dal modal)
    const handleConfermaInvioNo = useCallback(() => {
        setIsConfermaInvioOpen(false);
        setIsInvioPiattaformaChecked(false); // Deseleziona la checkbox
    }, []);

    return {
        // Stati dei modal
        isControlloDocOpen,
        isScadenzaAlertOpen,
        isConfermaInvioOpen,
        // Stato checkbox
        isInvioPiattaformaChecked,
        // Dati derivati
        documentiStatus,
        isScaduta, // Esponiamo anche questo se serve alla UI
        // Handlers
        handleControlloDocClick,
        handleCloseControlloDoc,
        handleProrogaConfirm,
        handleArchiviaConfirm,
        handleInvioPiattaformaChange,
        handleConfermaInvioYes,
        handleConfermaInvioNo,
        // Setter (se servono dall'esterno, altrimenti rimuovi)
        // setIsControlloDocOpen,
        // setIsScadenzaAlertOpen,
        // setIsConfermaInvioOpen,
    };
};