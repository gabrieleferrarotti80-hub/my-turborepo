// apps/gestionale/src/components/offerte/OfferteContent.jsx

import React, { useState, useCallback, useMemo } from 'react';
// ✅ Importa useAgendaManager
import { useFirebaseData, useOfferteManager, useClientsManager, useDocumentiManager, useAgendaManager, getPermissionsByRole } from 'shared-core';
import { OfferteDashboard, OffertaWorkspaceView, OfferteSidebar, OfferteListView } from 'shared-ui';
import { AziendaSelector } from '../AziendaSelector';
import { faHome, faTasks, faArchive, faFileAlt, faCogs, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

export const OfferteContent = ({ onNavigateBack, selectedCompanyId }) => {
   
    // ✅ Ottieni l'intero contesto Firebase
    const firebaseData = useFirebaseData();
    // Estrai i dati necessari
    const { db, storage, user, userRole, companyFeatures, data, loadingData } = firebaseData; // Aggiunto loadingData

    const offerte = data?.offerte || [];
    const clients = data?.clients || [];
    const personnel = data?.users || [];

    // --- ✅ AGGIUNGI QUESTA DEFINIZIONE ---
    // Funzione da passare a useAnalisiFormLogic (anche se attualmente fa solo log)
    const handleCreaAppuntamentoValidation = useCallback((sopralluogoData) => {
        console.log("[OfferteContent] Ricevuta validazione per creare appuntamento (dal bottone specifico):", sopralluogoData);
        // Al momento non fa nulla qui, la creazione avviene in handleAnalisiSubmit
        // Potresti usarla per mostrare un feedback all'utente
    }, []); // Non ha dipendenze specifiche se fa solo log
    // --- FINE AGGIUNTA ---

    // Logica di filtraggio template (invariata)
    const availableForms = useMemo(() => {
        console.log(`[FORMS-LOG] 📌 Inizio calcolo template. Azienda ID: ${selectedCompanyId}`);
        const allForms = data?.forms || [];
        const allAziendaForms = data?.aziendeForm || [];
        console.log(`[FORMS-LOG] 1. Forms totali caricati (data.forms): ${allForms.length}`);
        console.log(`[FORMS-LOG] 1. Autorizzazioni totali caricate (data.aziendeForm): ${allAziendaForms.length}`);
        if (!selectedCompanyId || allForms.length === 0) return [];
        const authorizedFormDocs = allAziendaForms.filter(authDoc =>
            Array.isArray(authDoc.authorizedCompanyIds) && authDoc.authorizedCompanyIds.includes(selectedCompanyId));
        console.log(`[FORMS-LOG] 2. Documenti in aziendeForm che autorizzano l'azienda ${selectedCompanyId}: ${authorizedFormDocs.length}`);
        const authorizedFormIds = new Set(authorizedFormDocs.map(doc => doc.formId).filter(id => !!id));
        console.log("[FORMS-LOG] 3. Set di ID Form autorizzati (lunghezza):", authorizedFormIds.size);
        console.log("[FORMS-LOG] 3. ID autorizzati:", Array.from(authorizedFormIds));
        if (authorizedFormIds.size === 0) return [];
        const filteredForms = allForms.filter(form => authorizedFormIds.has(form.id));
        if (filteredForms.length > 0) {
            console.log(`[FORMS-LOG] 4. Struttura Template Trovato (id/nome):`, { id: filteredForms[0].id, nome: filteredForms[0].nome });
        }
        console.log(`[FORMS-LOG] ✅ Trovati ${filteredForms.length} template form autorizzati. FINE LOG`);
        return filteredForms;
    }, [data?.forms, data?.aziendeForm, selectedCompanyId]);


    // ✅ Inizializza TUTTI i manager necessari
    const agendaManager = useAgendaManager(firebaseData);
    const offerteManager = useOfferteManager(db, user, selectedCompanyId); // Passa companyId corretto
    const clientsManager = useClientsManager(db, user);
    const documentiManager = useDocumentiManager(db, storage, user, selectedCompanyId); // Passa companyId
   

    // Permissions (invariato)
    const permissions = getPermissionsByRole(userRole);
    const isSuperAdmin = userRole === 'proprietario' && !selectedCompanyId;
    const hasPermission = permissions?.canManageOfferte;
    const hasFeature = companyFeatures?.['offerte_management'] === true;
    const isAuthorized = hasPermission && (isSuperAdmin || hasFeature);

    // State (invariato)
    const [activeOfferta, setActiveOfferta] = useState(null);
    const [activeView, setActiveView] = useState('principale');

    // Navigation Handlers (invariati)
    const handleSelectOfferta = useCallback((offerta) => {
        setActiveOfferta(offerta);
        let viewToGo = 'analisi';
        if (offerta.faseCorrente === 2 || ['elaborata', 'in_approvazione', 'approvata'].includes(offerta.stato)) {
            viewToGo = 'elaborazione';
        } else if (offerta.faseCorrente === 3 || offerta.stato === 'inviata') {
            viewToGo = 'invio';
        }
        setActiveView(viewToGo);
    }, []);

    const handleSidebarNavigate = useCallback((viewId) => {
        if (['principale', 'in_analisi'].includes(viewId)) {
            setActiveOfferta(null);
        }
        setActiveView(viewId);
    }, []);

    // Action Handlers
    const handleAddReferente = useCallback(async (clienteId, datiReferente) => {
        if (!activeOfferta) return { success: false, message: "Nessuna offerta attiva" }; // Aggiunto return
        try {
            const result = await clientsManager.addReferente(clienteId, datiReferente, { context: `Offerta: ${activeOfferta.nomeOfferta}` });
            if (!result.success) throw new Error(result.message); // Gestisci fallimento
            console.log("Nuovo referente aggiunto!");
            // Potrebbe servire aggiornare stato locale/ri-fetchare
            return { success: true };
        } catch (error) {
             console.error("Errore aggiunta referente:", error);
             alert(`Errore aggiunta referente: ${error.message}`);
             return { success: false, message: error.message }; // Restituisci errore
        }
    }, [activeOfferta, clientsManager]);

    const handleAddOfferta = useCallback(async ({ nomeOfferta, clienteId }) => {
        try {
            const result = await offerteManager.addOfferta(nomeOfferta, clienteId); // Aspetta oggetto risultato
            if (result.success && result.id) {
                const nuovaOfferta = {
                    id: result.id,
                    nomeOfferta,
                    clienteId,
                    stato: 'bozza',
                    faseCorrente: 1,
                    datiAnalisi: {},
                };
                handleSelectOfferta(nuovaOfferta);
            } else {
                throw new Error(result.message || "ID offerta non restituito."); // Gestisci fallimento
            }
        } catch (error) {
            console.error("Errore creazione offerta:", error);
            alert(`Errore creazione offerta: ${error.message}`);
        }
    }, [offerteManager, handleSelectOfferta]);

    // ✅ --- handleAnalisiSubmit MODIFICATO ---
    const handleAnalisiSubmit = useCallback(async (formData) => {
        // --- DEBUG LOG ---
    console.log("handleAnalisiSubmit - formData ricevuto:", JSON.stringify(formData, null, 2)); 
    // Controlla specificamente l'oggetto sopralluogo
    console.log("handleAnalisiSubmit - formData.sopralluogo:", formData?.sopralluogo); 
    // --- FINE DEBUG ---
        if (!activeOfferta || !selectedCompanyId) {
            alert("Errore: Offerta attiva o azienda non selezionata.");
            return;
        }
        try {
            // Helper per upload file (invariato)
            const uploadFilesByCategory = async (files, category) => {
                if (!files || files.length === 0) return [];
                const path = `offerte/${activeOfferta.id}/documenti_gara/${category}`;
                const uploadResults = await documentiManager.uploadFiles(files, path);
                return uploadResults.map(res => ({
                    url: res.downloadURL ?? res.fileURL ?? null,
                    nome: res.fileName ?? 'nome-file-sconosciuto',
                    path: res.filePath ?? null
                }));
            };

            // Upload files (invariato)
            const [uploadedGenerali, uploadedEconomici, uploadedTecnici, uploadedCME] = await Promise.all([
                uploadFilesByCategory(formData.docGaraGeneraliFiles, 'generali'),
                uploadFilesByCategory(formData.docGaraEconomiciFiles, 'economici'),
                uploadFilesByCategory(formData.docGaraTecniciFiles, 'tecnici'),
                uploadFilesByCategory(formData.docCMEFiles, 'cme')
            ]);

            // Prepara dati sanificati (invariato)
            const scadenzaDate = formData.scadenza ? new Date(formData.scadenza) : null;
            const datiSanificati = {
                tipoGara: formData.tipoGara ?? '',
                tipologiaLavoro: formData.tipologiaLavoro ?? '',
                documentiRichiesti: formData.documentiRichiesti ?? [],
                altriDocumentiCustom: formData.altriDocumentiCustom ?? [],
                docGaraGenerali: uploadedGenerali,
                docGaraEconomici: uploadedEconomici,
                docGaraTecnici: uploadedTecnici,
                docCME: uploadedCME,
                // Assicurati che 'sopralluogo' contenga tutti i dati necessari (data, personaleId, formTemplateId)
                sopralluogo: formData.sopralluogo?.necessario ? formData.sopralluogo : null,
                valoreEconomico: formData.valoreEconomico ?? '',
                manifestazioneInteresse: formData.manifestazioneInteresse ?? false,
                referente: {
                    ...(formData.referente || {}),
                    scadenza: scadenzaDate && !isNaN(scadenzaDate) ? scadenzaDate : null
                }
            };

            console.log("✅ Dati Analisi pronti. Invio a useOfferteManager...", datiSanificati);
            // --- DEBUG LOG ---
    console.log("handleAnalisiSubmit - controllo sopralluogo:", {
        data: datiSanificati.sopralluogo?.data,
        personaleId: datiSanificati.sopralluogo?.personaleId,
        templateId: datiSanificati.sopralluogo?.formTemplateSopralluogoId
    });
    // --- FINE DEBUG ---
            // 1. Salva l'offerta
            const saveOfferResult = await offerteManager.salvaAnalisiPreliminare(activeOfferta.id, datiSanificati);

            // 2. Se salvataggio OK E c'è un sopralluogo da fissare...
            if (saveOfferResult.success && datiSanificati.sopralluogo?.data && datiSanificati.sopralluogo?.personaleId && datiSanificati.sopralluogo?.formTemplateSopralluogoId) {

                // 3. Prepara i dati per l'evento agenda
                const eventoData = {
                    title: `Sopralluogo per ${activeOfferta.nomeOfferta}`,
                    start: new Date(datiSanificati.sopralluogo.data),
                    end: null, // O calcola durata
                    description: `Sopralluogo relativo all'offerta ${activeOfferta.id}. Indirizzo: ${datiSanificati.sopralluogo.indirizzo || 'N/D'}`,
                    partecipanti: [{ userId: datiSanificati.sopralluogo.personaleId, ruolo: 'tecnico' }],
                    formTemplateId: datiSanificati.sopralluogo.formTemplateSopralluogoId,
                    offertaId: activeOfferta.id,
                    // companyID verrà aggiunto da addEvento
                };

                // 4. CHIAMA agendaManager per creare l'evento
                console.log("[OfferteContent] Tentativo creazione evento sopralluogo...");
               const createEventResult = await agendaManager.onAddEvent(eventoData);

                if (!createEventResult.success) {
                    console.error("Errore creazione evento:", createEventResult.message);
                    alert(`Analisi salvata, ma errore nella creazione dell'appuntamento: ${createEventResult.message}`);
                } else {
                    console.log("[OfferteContent] Evento sopralluogo creato con successo.");
                    alert("Analisi preliminare salvata e appuntamento per sopralluogo creato!");
                }
            } else if (!saveOfferResult.success) {
                console.error("Errore salvataggio analisi:", saveOfferResult.message);
                alert(`Errore nel salvataggio dell'analisi preliminare: ${saveOfferResult.message}`);
                // Non procedere se il salvataggio iniziale fallisce
                return;
            } else {
                // Salvataggio offerta ok, ma nessun sopralluogo o dati incompleti
                alert("Dati analisi preliminare salvati con successo!");
            }

            // Aggiorna stato locale e naviga in ogni caso di successo (anche senza sopralluogo)
            setActiveOfferta(prev => ({
                ...prev,
                datiAnalisi: datiSanificati,
                stato: 'analisi_preliminare', // Aggiorna lo stato qui
                faseCorrente: 1 // O 2 se si passa direttamente
            }));
            setActiveView('elaborazione'); // Vai alla fase successiva

        } catch (error) {
            console.error("Errore complesso durante il salvataggio dell'analisi:", error);
            alert(`Errore durante il salvataggio: ${error.message}`);
        }
    }, [activeOfferta, selectedCompanyId, offerteManager, documentiManager, agendaManager]); // Aggiunto agendaManager

    // ❌ --- ELIMINATA LA FUNZIONE handleCreaAppuntamentoSopralluogo ---

    // Handler Elaborazione Submit (invariato)
    const handleElaborazioneSubmit = useCallback(async (formData) => {
        // ... (logica esistente per upload file, preparazione dati, chiamata a salvaElaborazione) ...
        if (!activeOfferta || !selectedCompanyId) return; // Aggiunto controllo
        console.log("[OfferteContent] Ricevuto submit Elaborazione:", formData);
        try {
            let uploadedCMECompilato = [];
            if (formData.docCMECompilatoFiles?.length > 0) {
                 const path = `offerte/${activeOfferta.id}/elaborazione/cme_compilato`;
                 const results = await documentiManager.uploadFiles(formData.docCMECompilatoFiles, path);
                 uploadedCMECompilato = results.map(res => ({ url: res.downloadURL ?? res.fileURL ?? null, nome: res.fileName ?? 'nome-file-sconosciuto', path: res.filePath ?? null }));
            }
            // TODO: Upload file Analisi Costi se presente

            const datiDaSalvare = {
                 ...formData,
                 docCMECompilato: uploadedCMECompilato,
            };
            delete datiDaSalvare.docCMECompilatoFiles;

            const valoreIniziale = activeOfferta.datiAnalisi?.valoreEconomico || 0;
            const costiTotaliCalc = datiDaSalvare.costiAnalisi?.totale || 0;
            const sconto = datiDaSalvare.scontoProposto || 0;
            const utilePrevistoCalc = (valoreIniziale * (1 - sconto / 100)) - costiTotaliCalc;

            const riepilogo = {
                 nomeOfferta: activeOfferta.nomeOfferta,
                 valore: valoreIniziale,
                 sconto: sconto,
                 utile: utilePrevistoCalc,
                 tempistiche: datiDaSalvare.tempistichePreviste
            };

            // Chiamata corretta al manager delle offerte
            const saveElabResult = await offerteManager.salvaElaborazione(activeOfferta.id, datiDaSalvare, riepilogo);
             if (!saveElabResult.success) throw new Error(saveElabResult.message); // Gestisci fallimento

            // Crea nota in agenda se necessario
            if (datiDaSalvare.approvazioneNecessaria && datiDaSalvare.utenteApprovazioneId) {
                // Assicurati che `creaNotaApprovazione` esista in agendaManager e gestisca gli errori
                const notaResult = await agendaManager.creaNotaApprovazione(datiDaSalvare.utenteApprovazioneId, activeOfferta, riepilogo);
                if (!notaResult.success) {
                   console.warn("Nota approvazione non creata:", notaResult.message);
                   // Non bloccare, ma avvisa
                   alert("Elaborazione salvata, ma errore creazione nota approvazione.");
                }
            }

            setActiveOfferta(prev => ({
                 ...prev,
                 datiElaborazione: datiDaSalvare,
                 stato: datiDaSalvare.approvazioneNecessaria ? 'in_approvazione' : 'elaborata',
                 faseCorrente: 2
            }));
            alert("Dati elaborazione salvati con successo!");
             // Decidi se navigare automaticamente o no
             // setActiveView('invio');

        } catch (error) {
             console.error("Errore durante il salvataggio dell'elaborazione:", error);
             alert(`Errore durante il salvataggio: ${error.message}`);
        }
    }, [activeOfferta, selectedCompanyId, offerteManager, documentiManager, agendaManager, personnel]);

    // Handler Approva Offerta (invariato)
    const handleApproveOffer = useCallback(async () => {
        if (!activeOfferta || activeOfferta.stato !== 'in_approvazione') {
             alert("Errore: Offerta non selezionata o non in stato di approvazione.");
             return;
        }
        try {
            const approveResult = await offerteManager.approvaOfferta(activeOfferta.id);
            if (!approveResult.success) throw new Error(approveResult.message); // Gestisci fallimento

            setActiveOfferta(prev => ({
                 ...prev,
                 stato: 'approvata',
                 faseCorrente: 3
            }));
            alert("Offerta approvata con successo!");
             setActiveView('invio');

        } catch (error) {
             console.error("Errore durante l'approvazione dell'offerta:", error);
             alert(`Errore durante l'approvazione: ${error.message}`);
        }
    }, [activeOfferta, offerteManager]);

    // --- ✅ NUOVI HANDLERS PER LA FASE 3 ---
    const handleLogProroga = useCallback(async (offertaId, userId) => {
        if (!offertaManager || !offertaId || !userId) return;
        try {
            const result = await offerteManager.logProroga(offertaId, userId);
            if (!result.success) throw new Error(result.message);
            // Aggiorna lo stato locale per riflettere la proroga loggata
            setActiveOfferta(prev => prev && prev.id === offertaId ? {
                 ...prev,
                 logProroghe: [...(prev.logProroghe || []), { userId, timestamp: new Date() }] // Aggiunta locale temporanea
            } : prev);
            alert("Proroga registrata con successo!");
            // Non serve navigare, l'utente può ora aprire il controllo documentale
        } catch (error) {
            console.error("Errore registrazione proroga:", error);
            alert(`Errore: ${error.message}`);
        }
    }, [offerteManager]);

    const handleArchiviaOfferta = useCallback(async (offertaId) => {
        if (!offerteManager || !offertaId) return;
        if (!confirm("Sei sicuro di voler archiviare questa offerta?")) return; // Aggiunta conferma
        try {
            const result = await offerteManager.archiveOfferta(offertaId);
            if (!result.success) throw new Error(result.message);
            alert("Offerta archiviata con successo!");
            // Torna alla dashboard principale dopo l'archiviazione
            setActiveOfferta(null);
            setActiveView('principale');
        } catch (error) {
            console.error("Errore archiviazione offerta:", error);
            alert(`Errore: ${error.message}`);
        }
    }, [offerteManager]);

    const handleSetInviata = useCallback(async (offertaId, daPiattaforma) => {
        if (!offerteManager || !offertaId) return;
        try {
            const result = await offerteManager.inviaOfferta(offertaId, daPiattaforma);
            if (!result.success) throw new Error(result.message);
            // Aggiorna lo stato locale
             setActiveOfferta(prev => prev && prev.id === offertaId ? {
                 ...prev,
                 stato: 'inviata',
                 inviataDaPiattaforma: daPiattaforma,
                 dataInvio: new Date() // Data locale temporanea
            } : prev);
            alert("Offerta contrassegnata come inviata!");
            // Rimani sulla stessa vista per vedere lo stato aggiornato
        } catch (error) {
            console.error("Errore impostazione 'inviata':", error);
            alert(`Errore: ${error.message}`);
        }
    }, [offerteManager]);

    // --- ✅ NUOVO HANDLER: onPrepareEmailDraft ---
    const handlePrepareEmailDraft = useCallback(async (offertaId, emailData, additionalFiles, foundDocuments) => {
        console.log("[OfferteContent] Preparazione Bozza Email per Offerta:", offertaId);
        console.log("[OfferteContent] Preparazione Bozza Email per Offerta:", offertaId);
        console.log("Dati Email:", emailData);
        console.log("File Aggiuntivi Selezionati:", additionalFiles); // Oggetti File
        console.log("Documenti Richiesti Trovati:", foundDocuments); // Oggetti { ..., fileDetails: { url, nome, ... } }

        // Trova l'offerta attiva per nome, etc.
        const offertaCorrente = offerte.find(o => o.id === offertaId);
        if (!offertaCorrente) {
             alert("Errore: Offerta non trovata.");
             return;
        }

        // --- 1. Gestione Allegati ---
        let allAttachments = [];

        // Aggiungi i documenti richiesti trovati
        foundDocuments.forEach(doc => {
            if (doc.fileDetails?.url) {
                // Se abbiamo già l'URL (es. da file automatici o caricati precedentemente)
                allAttachments.push({ name: doc.fileDetails.nome || doc.label, url: doc.fileDetails.url });
            } else if (doc.fileDetails?.path) {
                // Se abbiamo solo il path (potrebbe servire generare URL temporaneo?)
                 console.warn(`Documento ${doc.label} ha solo un path: ${doc.fileDetails.path}. Gestione URL non implementata.`);
                 // Potresti dover usare getDownloadURL(ref(storage, doc.fileDetails.path)) qui
                 allAttachments.push({ name: doc.fileDetails.nome || doc.label, path: doc.fileDetails.path }); // Placeholder
                console.log("Allegati totali da includere:", allAttachments);
                }
        });

        // Gestisci upload file aggiuntivi (se ce ne sono)
        if (additionalFiles.length > 0) {
            // Mostra stato caricamento (potresti voler aggiungere uno stato 'isUploadingDraft')
            alert("Caricamento allegati aggiuntivi in corso..."); 
            try {
                 const path = `offerte/${offertaId}/allegati_email_invio`;
                 // Assicurati che documentiManager sia disponibile
                 if (!documentiManager) throw new Error("Documenti Manager non inizializzato.");

                 const uploadResults = await documentiManager.uploadFiles(additionalFiles, path);
                 uploadResults.forEach(res => {
                     allAttachments.push({ name: res.fileName, url: res.downloadURL ?? res.fileURL });
                 });
                 console.log("Allegati aggiuntivi caricati:", uploadResults);
            } catch (error) {
                 console.error("Errore caricamento allegati aggiuntivi:", error);
                 alert(`Errore durante il caricamento degli allegati aggiuntivi: ${error.message}`);
                 return; // Interrompi se l'upload fallisce
            }
        }
        
        console.log("Allegati totali da includere:", allAttachments);

        // --- 2. Preparazione Dati Email per API (Placeholder) ---
        const emailPayload = {
            to: emailData.to,
            subject: emailData.subject,
            // Body: potresti generarlo qui o passarlo da RevisioneInvioForm
            body: `Gentile ${offertaCorrente?.datiAnalisi?.referente?.nome || ''},\n\nIn allegato trova la documentazione relativa alla nostra partecipazione alla gara "${offertaCorrente?.nomeOfferta || ''}".\n\nCordiali saluti.`, 
            attachments: allAttachments // Array di oggetti { name, url } o { name, path }
        };

        // --- 3. Creazione Nota Agenda ---
        try {
             // Assicurati che agendaManager sia disponibile e abbia il metodo
             if (!agendaManager?.creaNotaInvioMail) throw new Error("Agenda Manager o creaNotaInvioMail non disponibile.");
             
             // Passa l'ID dell'utente loggato e l'offerta corrente
             const notaResult = await agendaManager.creaNotaInvioMail(user.uid, offertaCorrente);
             if (!notaResult.success) {
                  console.warn("Nota agenda per invio email non creata:", notaResult.message);
                  alert("Bozza preparata (simulato), ma errore creazione nota agenda.");
             } else {
                 console.log("Nota agenda per invio email creata.");
             }
        } catch (error) {
             console.error("Errore durante la creazione della nota agenda:", error);
             alert(`Bozza preparata (simulato), ma errore durante la creazione della nota agenda: ${error.message}`);
             // Non interrompere necessariamente, la bozza potrebbe essere creata comunque
        }
        

        // --- 4. Chiamata API Creazione Bozza (Placeholder/Simulazione) ---
        console.log("--- SIMULAZIONE CREAZIONE BOZZA GMAIL ---");
        console.log("Payload:", emailPayload);
        // Qui chiameresti la tua funzione (es. via backend/cloud function)
        // await createGmailDraft(emailPayload); 
        alert("Bozza Email preparata (simulato) e nota in agenda creata. Controlla la tua console per i dettagli.");
        
        // Cosa fare dopo? Potremmo voler aggiornare lo stato dell'offerta?
        // Secondo lo schema, lo stato cambia solo alla conferma della nota.
        // Potremmo disabilitare il bottone o cambiare il testo.

    }, [offerte, user, documentiManager, agendaManager]); // Aggiungi dipendenze
    // --- FINE NUOVI HANDLERS ---

    // Oggetto handlers (invariato)
    const formSubmissions = {
        handleAnalisiSubmit,
        handleElaborazioneSubmit,
        handleApproveOffer,
        handleLogProroga,
        handleArchiviaOfferta,
        handleSetInviata,
        // Aggiungi handler Fase 3 qui
    };

    // Filtro offerte (invariato)
    const offerteInLavorazione = offerte.filter(o =>
        !['archiviata', 'rifiutata', 'accettata'].includes(o.stato)
    );

    // Render logic (invariato)
  const renderMainContent = () => {
        if (activeOfferta) {
            
            // --- Logica Esistente ---
            const sopralluogoTemplateId = activeOfferta.datiAnalisi?.sopralluogo?.formTemplateSopralluogoId;
            const sopralluogoFormTemplate = availableForms.find(f => f.id === sopralluogoTemplateId);
            
            // --- RIMUOVI IL BLOCCO DI LOG propsPerWorkspace e lo spread operator ---
            // console.log("%c[OfferteContent] -> Invio props a OffertaWorkspaceView:", "color: blue; font-weight: bold;", propsPerWorkspace);
            
            // --- Passa le props ESPLICITAMENTE ---
            return (
                <OffertaWorkspaceView
                    offerta={activeOfferta}
                    faseAttivaId={activeView}
                    formSubmissions={formSubmissions}
                    isSaving={offerteManager.isSaving}
                    clienteSelezionato={clients.find(c => c.id === activeOfferta.clienteId)}
                    personnel={personnel}
                    onAddReferente={handleAddReferente}
                    companyId={selectedCompanyId}
                    currentUser={user}
                    availableForms={availableForms}
                    onCreaAppuntamento={handleCreaAppuntamentoValidation}
                    // Passa la prop direttamente
                    sopralluogoFormTemplate={sopralluogoFormTemplate} 
                    onLogProroga={handleLogProroga}
                    onArchivia={handleArchiviaOfferta}
                    onSetInviata={handleSetInviata}
                    onPrepareEmailDraft={handlePrepareEmailDraft}
                />
            );
        }

        switch (activeView) {
            case 'in_analisi':
                return <OfferteListView title="Offerte in Lavorazione" offerte={offerteInLavorazione} onSelectOfferta={handleSelectOfferta} />;
            case 'principale':
            default:
                return <OfferteDashboard offerte={offerte} clients={clients} onSelectOfferta={handleSelectOfferta} onAddOfferta={handleAddOfferta} isSaving={offerteManager.isSaving} isCompanySelected={!!selectedCompanyId} />;
        }
    };

    // Sidebar setup (invariato)
    const dashboardFasi = [
        { id: 'principale', label: 'Menu Principale', icon: faHome },
        { id: 'in_analisi', label: 'In Lavorazione', icon: faTasks },
    ];
    const workspaceFasi = [
        { id: 'analisi', label: '1. Analisi', icon: faFileAlt },
        { id: 'elaborazione', label: '2. Elaborazione', icon: faCogs },
        { id: 'invio', label: '3. Revisione/Invio', icon: faPaperPlane },
    ];
    const sidebarFasi = !activeOfferta ? dashboardFasi : workspaceFasi;

    // Auth check (invariato)
    if (!isAuthorized) {
        return (
            <div className="flex h-screen bg-gray-100 items-center justify-center p-4 text-center">
                <div><h2 className="text-xl font-bold">Accesso Negato</h2><p className="text-gray-600 mt-2">Permessi insufficienti.</p></div>
            </div>
        );
    }

    // Main layout (invariato)
    return (
        <div className="flex h-screen bg-gray-100">
            <OfferteSidebar
                fasi={sidebarFasi}
                faseAttivaId={activeView}
                onSelectFase={handleSidebarNavigate}
                AziendaSelectorComponent={userRole === 'proprietario' ? AziendaSelector : null}
                onBackToMainDashboard={onNavigateBack}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Aggiunto controllo loadingData qui */}
                {loadingData ? (
                    <div className="p-8 text-center">Caricamento dati offerte...</div>
                ) : (
                    renderMainContent()
                )}
            </div>
        </div>
    );
};