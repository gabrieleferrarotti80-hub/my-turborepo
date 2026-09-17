import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    ArrowLeftIcon, ClipboardDocumentListIcon, MapPinIcon, CalculatorIcon, 
    DocumentTextIcon, ArrowPathIcon, DocumentCheckIcon, BriefcaseIcon
} from '@heroicons/react/24/outline';

import { Step1InfoLead } from './Step1InfoLead';
import { Step2Sopralluogo } from './Step2Sopralluogo';
import { Step3PreventivoAnalitico } from './preventivo-fasi/Step3PreventivoAnalitico';
import { Step4Preventivo } from './Step4Preventivo';

export const WorkspacePrivato = ({ offerta, cliente, azienda, dipendenti, attrezzature, fornitori, noleggiatori, subappaltatori, currentUser, storage, safeDb, companyID, eventi, forms, reports, onBack, onUpdate, onConvertiCantiere }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [activeStep, setActiveStep] = useState(1);

    const [datiLead, setDatiLead] = useState(offerta.datiLead || { indirizzoCantiere: '', descrizione: '' });
    const [documentiCliente, setDocumentiCliente] = useState(offerta.documentiCliente || []);
    const [dataSopralluogo, setDataSopralluogo] = useState(offerta.datiSopralluogo?.data || '');
    const [tecnicoSopralluogo, setTecnicoSopralluogo] = useState(offerta.datiSopralluogo?.tecnicoId || '');
    const [noteSopralluogo, setNoteSopralluogo] = useState(offerta.datiSopralluogo?.note || '');
    const [selectedFormId, setSelectedFormId] = useState('');

    const [fasi, setFasi] = useState(offerta.fasi || [
        { 
            id: Date.now(), 
            titolo: '', 
            quantitaFase: 1, 
            umFase: 'a corpo',
            masterId: null, 
            numeroInterventi: 1, 
            prezzoVendita: 0, 
            costi: { materiali: [], noli: [], mezzi: [], attrezzature: [], manodopera: [], subappalti: [], altro: [] } 
        }
    ]);

    const [datiPdf, setDatiPdf] = useState(offerta.datiPreventivo || {
        numero: azienda?.numeratori?.preventivi || 'AUTO', 
        data: new Date().toISOString().split('T')[0],
        oggetto: offerta.nomeOfferta || '', 
        righe: [], 
        note: azienda?.testiDefault?.notePreventivo || '', 
        pagamento: azienda?.testiDefault?.metodoPagamento || '',
        sconto: 0, totaleImponibile: 0, totaleIva: 0, totale: 0
    });

    const defaultSpeseGen = azienda?.impostazioni?.percentualeSpeseGenerali || 15;
    const [percSpeseGenerali, setPercSpeseGenerali] = useState(offerta.percSpeseGenerali ?? defaultSpeseGen);
    const [percUtile, setPercUtile] = useState(offerta.percUtile ?? 20);
    const [approvatoreId, setApprovatoreId] = useState('');

    const coloreTema = azienda?.grafica?.colorePrimario || '#4f46e5';
    const isOwnerOrAdmin = ['proprietario', 'amministrazione'].includes(currentUser?.ruolo?.toLowerCase());

    const approvatoriPossibili = useMemo(() => {
        if (!dipendenti) return [];
        return dipendenti.filter(d => ['proprietario', 'amministrazione'].includes(d.ruolo?.toLowerCase()));
    }, [dipendenti]);

    const eventoCollegato = useMemo(() => {
        if (!eventi || eventi.length === 0) return null;
        return eventi.filter(e => e.offertaId === offerta.id && e.tipo === 'sopralluogo').sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0]; 
    }, [eventi, offerta.id]);

    const reportsOfferta = useMemo(() => {
        if (!reports || reports.length === 0) return [];
        return reports.filter(r => r.offertaId === offerta.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }, [reports, offerta.id]);

    const tuttiMateriali = useMemo(() => {
        return fornitori?.flatMap(f => (f.listino || []).map(item => {
            const desc = item.descrizione || item.nome || item.articolo || item.prodotto || '';
            if (!desc.trim()) return null; 
            return { ...item, descrizione: desc, prezzo: Number(item.prezzo || item.costo || item.costoUnitario || 0), fornitoreId: f.id, fornitoreNome: f.ragioneSociale || 'Azienda', unitaMisura: item.unitaMisura || '' };
        }).filter(Boolean)) || [];
    }, [fornitori]);

    const tuttiNoleggi = useMemo(() => {
        return noleggiatori?.flatMap(n => (n.listino || []).map(item => {
            const desc = item.descrizione || item.nome || item.mezzo || item.macchinario || item.titolo || '';
            if (!desc.trim()) return null; 
            return { ...item, descrizione: desc, prezzo: Number(item.prezzo || item.costo || item.costoGiornaliero || item.costoUnitario || 0), noleggiatoreId: n.id, noleggiatoreNome: n.ragioneSociale || 'Azienda' };
        }).filter(Boolean)) || [];
    }, [noleggiatori]);

    const magazzinoMateriali = useMemo(() => {
        return (attrezzature || []).filter(a => {
            const cat = (a.categoria || a.tipologia || '').toLowerCase();
            return cat.includes('mat') || cat.includes('cons') || cat.includes('art');
        });
    }, [attrezzature]);

    const magazzinoMezzi = useMemo(() => {
        return (attrezzature || []).filter(a => {
            const cat = (a.categoria || a.tipologia || '').toLowerCase();
            return cat === 'automezzo' || cat === 'macchina operatrice';
        });
    }, [attrezzature]);

    const magazzinoAttrezzature = useMemo(() => {
        return (attrezzature || []).filter(a => {
            const cat = (a.categoria || a.tipologia || '').toLowerCase();
            const isMat = cat.includes('mat') || cat.includes('cons') || cat.includes('art');
            const isMezzo = cat === 'automezzo' || cat === 'macchina operatrice';
            return !isMat && !isMezzo;
        });
    }, [attrezzature]);

    const tariffeAziendali = useMemo(() => {
        let tariffe = {};
        const impostazioni = azienda?.impostazioni || {};
        if (impostazioni.costoOrarioOperaio) tariffe['operaio'] = Number(impostazioni.costoOrarioOperaio);
        if (impostazioni.costoOrarioTecnico) tariffe['tecnico'] = Number(impostazioni.costoOrarioTecnico);
        if (impostazioni.costoOrarioPreposto) tariffe['preposto'] = Number(impostazioni.costoOrarioPreposto);

        if (Array.isArray(azienda?.costiOrari)) {
            azienda.costiOrari.forEach(item => {
                const nome = item.ruolo || item.nome || item.qualifica;
                const costo = item.costo || item.prezzo || item.valore || 0;
                if (nome) tariffe[nome.toLowerCase()] = Number(costo);
            });
        }
        return tariffe;
    }, [azienda]);

    const ruoliAziendali = useMemo(() => {
        const ruoliDipendenti = dipendenti ? dipendenti.map(d => d.ruolo).filter(Boolean) : [];
        const ruoliTariffe = Object.keys(tariffeAziendali);
        const ruoliUnici = [...new Set([...ruoliDipendenti.map(r => r.toLowerCase()), ...ruoliTariffe])];
        const ruoliEsclusi = ['cliente', 'proprietario', 'admin', 'amministrazione'];
        
        return ruoliUnici
            .filter(r => !ruoliEsclusi.includes(r.toLowerCase()))
            .map(r => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase());
    }, [dipendenti, tariffeAziendali]);

    // --- SINCRONIZZAZIONE AUTOMATICA: Fasi -> PDF ---
    useEffect(() => {
        const nuoveRighePdf = fasi.map(f => {
            const qta = Number(f.quantitaFase) || 1;
            const prezzoUnitario = Number(f.prezzoVendita) / qta;
            
            let descrizioneEstesa = f.titolo || 'Nuova Lavorazione';
            if (f.umFase && f.umFase.toLowerCase() !== 'a corpo') {
                descrizioneEstesa += ` (${f.umFase})`;
            }

            // 🌟 NOVITÀ: Aggiunta del numero di interventi se > 1
            const nInterventi = Number(f.numeroInterventi) || 1;
            if (nInterventi > 1) {
                descrizioneEstesa += `\n* Include ${nInterventi} interventi/cicli programmati.`;
            }

            return {
                id: f.id,
                descrizione: descrizioneEstesa,
                quantita: qta,
                prezzo: Number(prezzoUnitario.toFixed(2)),
                iva: 22
            };
        });
        setDatiPdf(prev => ({ ...prev, righe: nuoveRighePdf }));
    }, [fasi]);

    useEffect(() => {
        let imponibile = 0; let iva = 0;
        datiPdf.righe.forEach(r => { const tot = (Number(r.quantita)||0)*(Number(r.prezzo)||0); imponibile += tot; iva += tot*((Number(r.iva)||0)/100); });
        imponibile -= (Number(datiPdf.sconto)||0); if (imponibile < 0) imponibile = 0;
        setDatiPdf(prev => ({ ...prev, totaleImponibile: imponibile, totaleIva: iva, totale: imponibile + iva }));
    }, [datiPdf.righe, datiPdf.sconto]);

    const totaleCosti = useMemo(() => {
        return fasi.reduce((acc, fase) => {
            const calcolaCat = (arr) => (arr || []).reduce((s, curr) => {
                const nPersone = curr.numeroPersone !== undefined ? Number(curr.numeroPersone) : 1;
                return s + (nPersone * (Number(curr.quantita) || 0) * (Number(curr.costoUnitario) || 0));
            }, 0);
            
            const costoBaseFase = calcolaCat(fase.costi.materiali) + calcolaCat(fase.costi.noli) + calcolaCat(fase.costi.mezzi) + calcolaCat(fase.costi.attrezzature) + calcolaCat(fase.costi.manodopera) + calcolaCat(fase.costi.subappalti) + calcolaCat(fase.costi.altro);
            const interventi = Number(fase.numeroInterventi) || 1;
            
            return acc + (costoBaseFase * interventi);
        }, 0);
    }, [fasi]);

    const importoSpeseGenerali = totaleCosti * (percSpeseGenerali / 100);
    const costoPieno = totaleCosti + importoSpeseGenerali;
    const importoUtileAtteso = costoPieno * (percUtile / 100);
    const prezzoVenditaSuggerito = costoPieno + importoUtileAtteso;
    const utileReale = datiPdf.totaleImponibile - costoPieno;
    const percUtileReale = costoPieno > 0 ? (utileReale / costoPieno) * 100 : 0;

    const hasPreventiviVerbali = useMemo(() => {
        return fasi.some(f => (f.costi.subappalti || []).some(s => !s.preventivoUfficiale));
    }, [fasi]);

    const handleUploadFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !storage) return;
        setUploadingDoc(true);
        try {
            const timestampId = Date.now().toString();
            const fileRef = ref(storage, `offerte/${offerta.id}/${timestampId}_${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            const nuovoDoc = { id: timestampId, nome: file.name, url: url, data: new Date().toISOString() };
            const nuoviDocs = [...documentiCliente, nuovoDoc];
            setDocumentiCliente(nuoviDocs);
            await onUpdate(offerta.id, { documentiCliente: nuoviDocs });
        } catch (err) { alert("Errore caricamento: " + err.message); }
        setUploadingDoc(false);
    };

    const handleSaveAll = async (nuovoStato = null, showNotification = true) => {
        setIsSaving(true);
        try {
            const updates = {
                datiLead, documentiCliente,
                datiSopralluogo: { data: dataSopralluogo, tecnicoId: tecnicoSopralluogo, note: noteSopralluogo },
                fasi, 
                datiPreventivo: datiPdf,
                budgetCosti: totaleCosti,
                valoreChiusura: datiPdf.totaleImponibile,
                nomeOfferta: datiPdf.oggetto || offerta.nomeOfferta,
                percSpeseGenerali, percUtile
            };
            if (nuovoStato) updates.stato = nuovoStato;
            await onUpdate(offerta.id, updates);
            if (showNotification) alert("Salvataggio completato!");
        } catch(e) { alert("Errore salvataggio."); }
        setIsSaving(false);
    };

    const richiediApprovazione = async () => {
        if (!approvatoreId) return alert("Seleziona a chi inviare la richiesta di approvazione.");
        setIsSaving(true);
        try {
            await handleSaveAll('in_approvazione', false);
            const nomeCli = cliente?.ragioneSociale || `${cliente?.nome || ''} ${cliente?.cognome || ''}` || 'Cliente N.D.';
            const payloadTask = {
                companyID: companyID, titolo: `APPROVARE: Preventivo ${nomeCli}`, tipo: 'task', 
                descrizione: `Verifica e approva il preventivo per il lavoro: ${offerta.nomeOfferta}.\n\nImporto: €${datiPdf.totaleImponibile.toFixed(2)}\nMargine Previsto: €${utileReale.toFixed(2)} (${percUtileReale.toFixed(1)}%)`,
                indirizzo: datiLead.indirizzoCantiere || '', dataInizio: new Date().toISOString(), dataFine: new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString(), 
                assegnatoA: approvatoreId, creatoDa: currentUser?.uid || currentUser?.id || 'Sistema', stato: 'da_fare', colore: '#8b5cf6', 
                offertaId: offerta.id, clienteId: offerta.clienteId, partecipanti: [{ userId: approvatoreId, ruolo: 'approvatore' }], createdAt: serverTimestamp()
            };
            await addDoc(collection(safeDb, 'eventi'), payloadTask);
            await addDoc(collection(safeDb, 'notifiche'), {
                userId: approvatoreId, titolo: "Nuovo Preventivo da Approvare", messaggio: `Il preventivo "${offerta.nomeOfferta}" richiede la tua approvazione.`, letta: false, createdAt: serverTimestamp()
            });
            alert("Richiesta di approvazione inviata!");
        } catch (error) { alert("Errore nell'invio."); }
        setIsSaving(false);
    };

    const creaEventoAgenda = async (statoEvento) => {
        if (!tecnicoSopralluogo || !dataSopralluogo) return alert("Seleziona una data e un Tecnico.");
        setIsSaving(true);
        try {
            const statoOfferta = statoEvento === 'da_confermare' ? 'attesa_conferma_tecnico' : 'sopralluogo_fissato';
            await onUpdate(offerta.id, { datiSopralluogo: { data: dataSopralluogo, tecnicoId: tecnicoSopralluogo, note: noteSopralluogo }, stato: statoOfferta });
            const dInizio = new Date(dataSopralluogo);
            const dFine = new Date(dInizio.getTime() + 60 * 60 * 1000); 
            const nomeCli = cliente?.ragioneSociale || `${cliente?.nome || ''} ${cliente?.cognome || ''}` || 'Cliente N.D.';
            
            const payloadEvento = {
                companyID: companyID, titolo: `Sopralluogo: ${nomeCli}`, tipo: 'sopralluogo', descrizione: `Lavoro: ${offerta.nomeOfferta}\n\nNote Cliente: ${datiLead.descrizione || 'Nessuna'}`,
                indirizzo: datiLead.indirizzoCantiere || '', dataInizio: dInizio.toISOString(), dataFine: dFine.toISOString(),
                assegnatoA: tecnicoSopralluogo, creatoDa: currentUser?.uid || currentUser?.id || 'Admin', stato: statoEvento, colore: '#f59e0b', 
                offertaId: offerta.id, clienteId: offerta.clienteId, partecipanti: [{ userId: tecnicoSopralluogo, ruolo: 'tecnico' }, { userId: currentUser?.uid || currentUser?.id, ruolo: 'organizzatore' }], createdAt: serverTimestamp()
            };
            await addDoc(collection(safeDb, 'eventi'), payloadEvento);

            await addDoc(collection(safeDb, 'notifiche'), {
                companyID: companyID, aziendaId: companyID, userId: tecnicoSopralluogo, 
                titolo: statoEvento === 'da_confermare' ? "Nuova richiesta di Sopralluogo" : "Nuovo Sopralluogo Fissato", 
                messaggio: `Sei stato incaricato per un sopralluogo in data ${dInizio.toLocaleDateString('it-IT')} per il cliente ${nomeCli}.`, 
                letta: false, createdAt: serverTimestamp(), tipo: 'agenda'
            });

            alert("Operazione completata!");
        } catch (error) { alert("Errore in agenda."); }
        setIsSaving(false);
    };

    const creaReportApp = async () => {
        if (!selectedFormId || !tecnicoSopralluogo) return alert("Seleziona un modello e un tecnico.");
        const template = forms.find(f => f.id === selectedFormId);
        setIsSaving(true);
        try {
            await addDoc(collection(safeDb, 'reports'), {
                companyID: companyID, aziendaId: companyID, offertaId: offerta.id, cantiereId: '', 
                templateId: template.id, formTemplateId: template.id, nomeForm: template.titolo || template.nome || 'Modulo Sopralluogo',
                titolo: `Sopralluogo: ${offerta.nomeOfferta}`, assegnatoA: tecnicoSopralluogo, nomeTecnico: dipendenti.find(d => d.id === tecnicoSopralluogo)?.nome || 'Tecnico',
                stato: 'da_compilare', createdAt: serverTimestamp(),
                datiPrecompilati: { cliente: cliente?.ragioneSociale || `${cliente?.nome || ''} ${cliente?.cognome || ''}`, indirizzo: datiLead.indirizzoCantiere, descrizioneRichiesta: datiLead.descrizione }
            });
            alert("Modulo assegnato!");
            setSelectedFormId('');
        } catch(e) { alert("Errore durante la generazione del modulo."); }
        setIsSaving(false);
    };

   const handleConvertAndSave = async () => { 
        const confermato = window.confirm("Complimenti! 🎉 Vuoi convertire questa offerta in un Cantiere Attivo?");
        if (!confermato) return;
        setIsSaving(true);
        try {
            // 1. Salviamo prima lo stato attuale per sicurezza
            await handleSaveAll('convertita_in_cantiere', false); 
            
            // 2. Passiamo alla conversione i dati REALI che l'utente ha inserito, non quelli della prop 'offerta'
            // Aggiungiamo 'fasi' come quinto parametro per essere sicuri
            await onConvertiCantiere(offerta, datiPdf, datiLead, totaleCosti, fasi);
            
            // Nota: La navigazione verso la vista "Cantieri" deve essere gestita nel componente padre (OfferteContent)
        } catch (error) { 
            console.error(error); 
            alert("Errore durante la creazione del cantiere."); 
        }
        setIsSaving(false);
    };

    const handleRigaChangePdf = (id, field, value) => setDatiPdf(prev => ({ ...prev, righe: prev.righe.map(r => r.id === id ? { ...r, [field]: value } : r) }));
    const handleAddRigaPdf = () => setDatiPdf(prev => ({ ...prev, righe: [...prev.righe, { id: Date.now(), descrizione: '', quantita: 1, prezzo: 0, iva: 22 }] }));
    const handleRemoveRigaPdf = (id) => setDatiPdf(prev => ({ ...prev, righe: prev.righe.filter(r => r.id !== id) }));
    
    const handleApplicaPrezzoSuggerito = () => {
        const confermato = window.confirm("Questo aggiornerà il prezzo di VENDITA di tutte le singole Fasi, calcolandolo con le % di Spese Generali e Utile indicate qui a lato. Procedere?");
        if (!confermato) return;

        const nuoveFasi = fasi.map(f => {
            const interventi = Number(f.numeroInterventi) || 1;
            const calcolaCat = (arr) => (arr || []).reduce((s, curr) => {
                const nPersone = curr.numeroPersone !== undefined ? Number(curr.numeroPersone) : 1;
                return s + (nPersone * (Number(curr.quantita) || 0) * (Number(curr.costoUnitario) || 0));
            }, 0);
            
            const costoBase = calcolaCat(f.costi.materiali) + calcolaCat(f.costi.noli) + calcolaCat(f.costi.mezzi) + calcolaCat(f.costi.attrezzature) + calcolaCat(f.costi.manodopera) + calcolaCat(f.costi.subappalti) + calcolaCat(f.costi.altro);
            const costoTotFase = costoBase * interventi;
            
            const speseGenFase = costoTotFase * (percSpeseGenerali / 100);
            const pienoFase = costoTotFase + speseGenFase;
            const utileFase = pienoFase * (percUtile / 100);
            const prezzoSuggFase = pienoFase + utileFase;

            return { ...f, percSpeseGenerali, percUtile, prezzoVendita: prezzoSuggFase.toFixed(2) };
        });

        setFasi(nuoveFasi); 
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <button onClick={onBack} className="text-slate-500 font-bold hover:text-slate-800 flex items-center gap-2 mb-2"><ArrowLeftIcon className="h-4 w-4"/> Torna alla Bacheca</button>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><BriefcaseIcon className="h-7 w-7 text-indigo-600"/> Lavoro: {offerta.nomeOfferta}</h2>
                    </div>
                    <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-xl shadow-inner border border-slate-200 gap-1">
                        <button onClick={() => setActiveStep(1)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeStep === 1 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>1. Info</button>
                        <button onClick={() => setActiveStep(2)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeStep === 2 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>2. Sopralluogo</button>
                        <button onClick={() => setActiveStep(3)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeStep === 3 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>3. Computo a Fasi</button>
                        <button onClick={() => setActiveStep(4)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeStep === 4 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>4. Preventivo PDF</button>
                    </div>
                </div>
            </div>

            {activeStep === 1 && <Step1InfoLead datiLead={datiLead} setDatiLead={setDatiLead} documentiCliente={documentiCliente} handleUploadFile={handleUploadFile} uploadingDoc={uploadingDoc} onNext={() => setActiveStep(2)} />}
            
            {activeStep === 2 && <Step2Sopralluogo offerta={offerta} eventoCollegato={eventoCollegato} dataSopralluogo={dataSopralluogo} setDataSopralluogo={setDataSopralluogo} tecnicoSopralluogo={tecnicoSopralluogo} setTecnicoSopralluogo={setTecnicoSopralluogo} dipendenti={dipendenti} noteSopralluogo={noteSopralluogo} setNoteSopralluogo={setNoteSopralluogo} isSaving={isSaving} creaEventoAgenda={creaEventoAgenda} selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId} forms={forms} creaReportApp={creaReportApp} reportsOfferta={reportsOfferta} onNext={() => setActiveStep(3)} />}

            {activeStep === 3 && (
                <Step3PreventivoAnalitico 
                    fasi={fasi}
                    setFasi={setFasi}
                    magazzinoMateriali={magazzinoMateriali}
                    tuttiMateriali={tuttiMateriali}
                    fornitori={fornitori}
                    tuttiNoleggi={tuttiNoleggi}
                    noleggiatori={noleggiatori}
                    magazzinoMezzi={magazzinoMezzi}
                    magazzinoAttrezzature={magazzinoAttrezzature}
                    ruoliAziendali={ruoliAziendali}
                    tariffeAziendali={tariffeAziendali}
                    subappaltatori={subappaltatori}
                    percSpeseGenerali={percSpeseGenerali}
                    percUtile={percUtile}
                    onNext={() => { handleSaveAll('in_preventivazione', false); setActiveStep(4); }}
                />
            )}

            {activeStep === 4 && (
                <Step4Preventivo 
                    offerta={offerta} cliente={cliente} azienda={azienda} datiLead={datiLead}
                    datiPdf={datiPdf} setDatiPdf={setDatiPdf}
                    totaleCosti={totaleCosti} percSpeseGenerali={percSpeseGenerali} setPercSpeseGenerali={setPercSpeseGenerali}
                    percUtile={percUtile} setPercUtile={setPercUtile}
                    approvatoreId={approvatoreId} setApprovatoreId={setApprovatoreId} approvatoriPossibili={approvatoriPossibili}
                    isOwnerOrAdmin={isOwnerOrAdmin} hasPreventiviVerbali={hasPreventiviVerbali} isSaving={isSaving}
                    handleSaveAll={handleSaveAll} richiediApprovazione={richiediApprovazione} handleConvertAndSave={handleConvertAndSave}
                    handleRigaChangePdf={handleRigaChangePdf} handleAddRigaPdf={handleAddRigaPdf} handleRemoveRigaPdf={handleRemoveRigaPdf} 
                    handleApplicaPrezzoSuggerito={handleApplicaPrezzoSuggerito}
                    coloreTema={coloreTema} costoPieno={costoPieno} importoSpeseGenerali={importoSpeseGenerali} importoUtileAtteso={importoUtileAtteso} prezzoVenditaSuggerito={prezzoVenditaSuggerito} utileReale={utileReale} percUtileReale={percUtileReale}
                />
            )}
        </div>
    );
};