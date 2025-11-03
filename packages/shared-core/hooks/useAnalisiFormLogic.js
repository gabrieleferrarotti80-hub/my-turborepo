import { useState, useEffect, useMemo, useCallback } from 'react';

// Spostiamo queste costanti qui, fuori dal componente
const initialDocumentiRichiesti = [
    { id: 'durc', label: 'DURC', checked: false },
    { id: 'dichiarazioni_sostitutive', label: 'Dichiarazioni Sostitutive', checked: false },
    { id: 'visura_camerale', label: 'Visura Camerale', checked: false },
    { id: 'soa', label: 'SOA', checked: false },
    { id: 'iso', label: 'ISO', checked: false },
    { id: 'casellario_giudiziario', label: 'Casellario Giudiziario', checked: false },
    { id: 'carichi_pendenti', label: 'Carichi Pendenti', checked: false },
    { id: 'contributo_anac', label: 'Contributo ANAC', checked: false },
    { id: 'certificato_antimafia', label: 'Certificato Antimafia', checked: false },
    { id: 'manifestazione_interesse_doc', label: 'Manifestazione di Interesse', checked: false },
    { id: 'altri', label: 'Altri documenti', checked: false },
];

const formatDateForInput = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    const pad = (num) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const useAnalisiFormLogic = (datiIniziali, onSubmit, onCreaAppuntamento) => {
    const [formData, setFormData] = useState({
        referente: null, tipoGara: '', tipologiaLavoro: '',
        documentiRichiesti: initialDocumentiRichiesti,
        altriDocumentiCustom: Array(5).fill(''),
        docGaraGeneraliFiles: [],
        docGaraEconomiciFiles: [],
        docGaraTecniciFiles: [],
        docCMEFiles: [],
        sopralluogo: { necessario: false, personaleId: '', indirizzo: '', data: '', formTemplateSopralluogoId: '' },
        valoreEconomico: '', scadenza: '', manifestazioneInteresse: false,
    });
    const [isReferenteModalOpen, setIsReferenteModalOpen] = useState(false);

    const datiAnalisi = useMemo(() => datiIniziali.datiAnalisi || {}, [datiIniziali]);

    // Popolamento iniziale del form
    useEffect(() => {
        console.log("[useAnalisiFormLogic] useEffect - Popolamento iniziale con datiAnalisi:", datiAnalisi);
        const referenteSalvato = datiAnalisi.referente || null;
        const scadenzaTimestamp = referenteSalvato?.scadenza;
        const scadenzaDate = scadenzaTimestamp?.toDate ? scadenzaTimestamp.toDate() : null;

        let documentiNormalizzati = [...initialDocumentiRichiesti].map(doc => ({...doc, checked: false}));
        const documentiSalvati = datiAnalisi.documentiRichiesti;
        if (Array.isArray(documentiSalvati)) {
            // ... (logica normalizzazione documenti invariata) ...
             if (typeof documentiSalvati[0] === 'string') {
                const etichette = new Set(documentiSalvati);
                documentiNormalizzati = initialDocumentiRichiesti.map(doc => ({ ...doc, checked: etichette.has(doc.label) }));
            } else if (documentiSalvati.length > 0 && typeof documentiSalvati[0] === 'object') {
                const salvatiMap = new Map(documentiSalvati.map(doc => [doc.id, doc.checked]));
                documentiNormalizzati = initialDocumentiRichiesti.map(doc => ({
                    ...doc,
                    checked: salvatiMap.get(doc.id) || false
                }));
            }
        }

        setFormData(prev => ({ // Usa una funzione per evitare race condition se datiAnalisi cambia velocemente
            ...prev, // Mantieni stato precedente (es. files in caricamento se serve)
            referente: referenteSalvato,
            tipoGara: datiAnalisi.tipoGara || '',
            tipologiaLavoro: datiAnalisi.tipologiaLavoro || '',
            documentiRichiesti: documentiNormalizzati,
            altriDocumentiCustom: datiAnalisi.altriDocumentiCustom || Array(5).fill(''),
            // Non resettare i files qui a meno che non sia intenzionale
            // docGaraGeneraliFiles: [],
            // docGaraEconomiciFiles: [],
            // docGaraTecniciFiles: [],
            // docCMEFiles: [],
            sopralluogo: {
                necessario: datiAnalisi.sopralluogo?.necessario || false,
                personaleId: datiAnalisi.sopralluogo?.personaleId || '',
                indirizzo: datiAnalisi.sopralluogo?.indirizzo || '',
                data: datiAnalisi.sopralluogo?.data || '', // Assicurati che il formato sia compatibile con datetime-local se salvato come stringa
                formTemplateSopralluogoId: datiAnalisi.sopralluogo?.formTemplateSopralluogoId || ''
            },
            valoreEconomico: datiAnalisi.valoreEconomico || '',
            scadenza: formatDateForInput(scadenzaDate),
            manifestazioneInteresse: datiAnalisi.manifestazioneInteresse || false,
        }));
        console.log("[useAnalisiFormLogic] useEffect - Stato formData dopo popolamento:", formData); // Log dopo l'aggiornamento (potrebbe mostrare stato precedente!)
    }, [datiAnalisi]);

    // Handler per campi BASE
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        // ✅ Log specifico per i campi base
        console.log(`[useAnalisiFormLogic] handleChange (BASE) - Campo: ${name}, Valore:`, type === 'checkbox' ? checked : value);
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }, []);

    // Handler SPECIFICO per campi SOPRALLUOGO
    const handleSopralluogoChange = useCallback((field, value) => {
        // ✅ Log specifico per i campi sopralluogo
        console.log(`[useAnalisiFormLogic] handleSopralluogoChange - Campo: ${field}, Valore:`, value);
        setFormData(prev => ({
            ...prev,
            sopralluogo: { ...prev.sopralluogo, [field]: value }
        }));
    }, []);

    // Handler per 'altriDocumentiCustom'
    const handleAltriDocumentiChange = useCallback((index, value) => {
        console.log(`[useAnalisiFormLogic] handleAltriDocumentiChange - Index: ${index}, Valore:`, value);
        const newInputs = [...(formData.altriDocumentiCustom || Array(5).fill(''))]; // Assicura array
        newInputs[index] = value;
        setFormData(prev => ({ ...prev, altriDocumentiCustom: newInputs }));
    }, [formData.altriDocumentiCustom]);

    // Handler per submit GENERALE
    const handleSubmit = useCallback((e) => {
        if (e) e.preventDefault();
        console.log("[useAnalisiFormLogic] ---- Inizio handleSubmit PRINCIPALE ----");
        console.log("[useAnalisiFormLogic] handleSubmit - Dati pronti per onSubmit:", JSON.stringify(formData, null, 2));
        // Aggiungi qui eventuali validazioni generali del form prima di chiamare onSubmit
        if (!formData.tipoGara || !formData.tipologiaLavoro /* ...altri campi obbligatori... */) {
            alert("Completa tutti i campi obbligatori prima di salvare.");
            console.warn("[useAnalisiFormLogic] handleSubmit - Validazione generale FALLITA.");
            console.log("[useAnalisiFormLogic] ---- Fine handleSubmit PRINCIPALE (FALLITO) ----");
            return;
        }
        console.log("[useAnalisiFormLogic] handleSubmit - Chiamo onSubmit...");
        onSubmit(formData);
        console.log("[useAnalisiFormLogic] ---- Fine handleSubmit PRINCIPALE (OK) ----");
    }, [formData, onSubmit]);

    // Stato derivato per abilitare/disabilitare bottone "Crea Appuntamento"
    const canCreaAppuntamento = useMemo(() => {
        const isValid = !!(
            formData.sopralluogo.necessario &&
            formData.sopralluogo.personaleId &&
            formData.sopralluogo.data &&
            formData.sopralluogo.formTemplateSopralluogoId
        );
        // ✅ Log per vedere quando cambia questo stato derivato
        console.log(`[useAnalisiFormLogic] useMemo canCreaAppuntamento calcolato: ${isValid}`, formData.sopralluogo);
        return isValid;
    }, [formData.sopralluogo]);

    // Handler per click bottone "Crea Appuntamento in Agenda"
    const handleCreaAppuntamentoClick = useCallback(() => {
        console.log("[useAnalisiFormLogic] ---- Inizio handleCreaAppuntamentoClick ----");
        console.log("[useAnalisiFormLogic] Stato formData.sopralluogo al momento del click:", JSON.stringify(formData.sopralluogo, null, 2));

        // Validazione diretta
        const sopralluogoValido = !!(
            formData.sopralluogo.necessario &&
            formData.sopralluogo.personaleId &&
            formData.sopralluogo.data &&
            formData.sopralluogo.formTemplateSopralluogoId
        );
        console.log("[useAnalisiFormLogic] Risultato validazione DIRETTA:", sopralluogoValido);
        console.log("[useAnalisiFormLogic] Valore di canCreaAppuntamento (useMemo):", canCreaAppuntamento); // Log per confronto

        // Verifica callback
        console.log("[useAnalisiFormLogic] Tipo di onCreaAppuntamento:", typeof onCreaAppuntamento);
        const isCallbackValid = typeof onCreaAppuntamento === 'function';
        console.log("[useAnalisiFormLogic] Callback onCreaAppuntamento è una funzione valida?", isCallbackValid);

        console.log("[useAnalisiFormLogic] Sto per entrare nell'if/else...");

        if (sopralluogoValido && isCallbackValid) {
            console.log("✅ [useAnalisiFormLogic] Validazione DATI e CALLBACK OK. Procedo...");
            // Mostra solo feedback, la creazione avviene in OfferteContent dopo handleSubmit
            alert("Dati sopralluogo validi. Puoi salvare il form generale per creare l'appuntamento.");
            // Non chiamare onCreaAppuntamento qui!
        }
        else if (sopralluogoValido && !isCallbackValid) {
             alert("Errore interno: la funzione per creare l'appuntamento (onCreaAppuntamento) non è disponibile.");
             console.error("❌ [useAnalisiFormLogic] Validazione DATI OK, ma CALLBACK FALLITA! `onCreaAppuntamento` non è una funzione.");
        }
        else { // Dati non validi
            alert("Completa i dati del sopralluogo (personale, data e template form) prima di creare l'appuntamento.");
            console.warn("❌ [useAnalisiFormLogic] Validazione DATI FALLITA.");
        }

        console.log("[useAnalisiFormLogic] ---- Fine handleCreaAppuntamentoClick ----");

    }, [formData.sopralluogo, onCreaAppuntamento, canCreaAppuntamento]); // Aggiunto canCreaAppuntamento per il log

    // Stato derivato 'altri' (invariato)
    const isAltriChecked = useMemo(() =>
        Array.isArray(formData.documentiRichiesti) &&
        formData.documentiRichiesti.find(d => d.id === 'altri')?.checked
    , [formData.documentiRichiesti]);

    // Return (invariato)
    return {
        formData,
        setFormData,
        datiAnalisi,
        isReferenteModalOpen,
        setIsReferenteModalOpen,
        handleSubmit,
        handleChange,
        handleSopralluogoChange,
        handleAltriDocumentiChange,
        handleCreaAppuntamentoClick,
        canCreaAppuntamento,
        isAltriChecked
    };
};