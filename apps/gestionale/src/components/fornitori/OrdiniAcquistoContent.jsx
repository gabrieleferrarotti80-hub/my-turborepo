import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { 
    DocumentTextIcon, TruckIcon, CheckCircleIcon, 
    MagnifyingGlassIcon, PrinterIcon, ClockIcon,
    CalendarIcon, MapPinIcon, PaperClipIcon, PencilSquareIcon, UserIcon, CheckBadgeIcon,
    BanknotesIcon, XMarkIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ModuloRegistrazioneDDT } from './ModuloRegistrazioneDDT.jsx'; 

export const OrdiniAcquistoContent = () => {
    const { db, companyID, storage, data, user } = useFirebaseData();
    const [ordini, setOrdini] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const dipendenti = data?.users || [];
    
    // 🌟 Estraiamo i fornitori per il controllo incrociato
    const fornitoriInAlbo = data?.fornitori || [];

    const [selectedOrdine, setSelectedOrdine] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [showModuloDDT, setShowModuloDDT] = useState(false);
    const [showFatturaModal, setShowFatturaModal] = useState(false);
    const [fatturaForm, setFatturaForm] = useState({ numero: '', data: '', importo: '' });
    
    const [editForm, setEditForm] = useState({ 
        dataConsegna: '', oraConsegna: '', luogoConsegna: '', responsabileId: '' 
    });
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [ddtList, setDdtList] = useState([]);

    useEffect(() => {
        if (!db) return;
        let q = companyID 
            ? query(collection(db, 'ordini_acquisto'), where('companyID', '==', companyID)) 
            : collection(db, 'ordini_acquisto');

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime());
            setOrdini(list);
            
            if (selectedOrdine) {
                const updated = list.find(o => o.id === selectedOrdine.id);
                if (updated) setSelectedOrdine(updated);
            }
        });

        return () => unsubscribe();
    }, [db, companyID]);

    useEffect(() => {
        if (!db || !selectedOrdine) {
            setDdtList([]);
            return;
        }
        
        const qDDT = query(collection(db, 'ddt_acquisti'), where('ordineId', '==', selectedOrdine.id));
        const unsubscribeDDT = onSnapshot(qDDT, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDdtList(list);
        });

        return () => unsubscribeDDT();
    }, [db, selectedOrdine]);

    const ordiniFiltrati = ordini.filter(o => 
        (o.fornitoreNome || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (o.numeroOrdine || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.cantiereNome || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const apriOrdine = (ordine) => {
        setSelectedOrdine(ordine);
        setEditForm({
            dataConsegna: ordine.dataConsegna || '',
            oraConsegna: ordine.oraConsegna || '',
            luogoConsegna: ordine.luogoConsegna || ordine.cantiereNome || '',
            responsabileId: ordine.responsabileId || ''
        });
        setFatturaForm({ numero: '', data: '', importo: '' });
        setIsEditing(false);
        setFilesToUpload([]);
    };

    // 🌟 LOGICA: Controlla se il fornitore di questo ordine è presente in Albo
    const isFornitoreNonRegistrato = selectedOrdine && !fornitoriInAlbo.some(f => f.id === selectedOrdine.fornitoreId || f.ragioneSociale === selectedOrdine.fornitoreNome);

    // 🌟 FUNZIONE: Aggiunta rapida in Albo
    const handleAggiuntaRapidaAlbo = async () => {
        try {
            const isEmail = String(selectedOrdine.fornitoreId).includes('@');
            const nuovoFornitore = {
                companyID,
                ragioneSociale: selectedOrdine.fornitoreNome,
                email: isEmail ? selectedOrdine.fornitoreId : '',
                partitaIva: 'Da Completare',
                telefono: '',
                indirizzo: '',
                categorie: ['Generico'],
                stato: 'attivo',
                dataInserimento: new Date().toISOString(),
                creatoDa: user?.uid || 'Sistema'
            };

            // 1. Crea il fornitore nell'Albo
            const docRef = await addDoc(collection(db, 'fornitori'), nuovoFornitore);

            // 2. Aggiorna l'ordine per agganciarlo al nuovo ID ufficiale
            await updateDoc(doc(db, 'ordini_acquisto', selectedOrdine.id), {
                fornitoreId: docRef.id
            });

            alert("✅ Fornitore registrato con successo nell'Albo aziendale!");
        } catch (error) {
            console.error("Errore aggiunta in albo:", error);
            alert("Errore durante la registrazione del fornitore.");
        }
    };

    const handleSaveDetails = async () => {
        setIsSaving(true);
        try {
            let allegatiAggiornati = [...(selectedOrdine.allegati || [])];

            if (filesToUpload.length > 0 && storage) {
                for (const file of filesToUpload) {
                    const fileSafeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                    const fileRef = ref(storage, `ordini_acquisto/${selectedOrdine.id}/${Date.now()}_${fileSafeName}`);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    allegatiAggiornati.push({ name: file.name, url, type: file.type, size: file.size, caricatoIl: new Date().toISOString() });
                }
            }

            const respScelto = dipendenti.find(d => d.id === editForm.responsabileId);
            const nomeResponsabile = respScelto ? `${respScelto.nome} ${respScelto.cognome}` : '';

            const docRef = doc(db, 'ordini_acquisto', selectedOrdine.id);
            await updateDoc(docRef, {
                dataConsegna: editForm.dataConsegna,
                oraConsegna: editForm.oraConsegna,
                luogoConsegna: editForm.luogoConsegna,
                responsabileId: editForm.responsabileId,
                responsabileNome: nomeResponsabile,
                allegati: allegatiAggiornati
            });

            const isNuovaConsegna = editForm.dataConsegna && (editForm.dataConsegna !== selectedOrdine.dataConsegna || editForm.oraConsegna !== selectedOrdine.oraConsegna);

            if (isNuovaConsegna && editForm.responsabileId) {
                const oraAvvio = editForm.oraConsegna || '08:00'; 
                const dataInizioObj = new Date(`${editForm.dataConsegna}T${oraAvvio}:00`);
                const dataFineObj = new Date(dataInizioObj.getTime() + (60 * 60 * 1000)); 

                const dataInizioISO = dataInizioObj.toISOString();
                const dataFineISO = dataFineObj.toISOString();

                await addDoc(collection(db, 'eventi'), {
                    companyID,
                    titolo: `🚚 Ricezione Merce: ${selectedOrdine.fornitoreNome}`,
                    descrizione: `Ordine ${selectedOrdine.numeroOrdine} in arrivo a: ${editForm.luogoConsegna}.\nOrario previsto: ${oraAvvio}\nTotale Ordine: € ${selectedOrdine.totale}`,
                    dataInizio: dataInizioISO,
                    dataFine: dataFineISO,
                    start: dataInizioISO,
                    end: dataFineISO,
                    data: editForm.dataConsegna,
                    tipologia: 'logistica',
                    stato: 'confermato',
                    creatoDa: user?.uid || 'Sistema',
                    partecipanti: [{ userId: editForm.responsabileId, ruolo: 'tecnico' }]
                });

                await addDoc(collection(db, 'notifiche'), {
                    companyID,
                    userId: editForm.responsabileId,
                    titolo: '📦 Consegna Assegnata',
                    messaggio: `Devi ricevere merce da ${selectedOrdine.fornitoreNome} il ${new Date(editForm.dataConsegna).toLocaleDateString()} alle ore ${oraAvvio}. Luogo: ${editForm.luogoConsegna}`,
                    letta: false,
                    dataCreazione: new Date().toISOString(),
                    tipo: 'info'
                });

                const luogoUpper = (editForm.luogoConsegna || '').toUpperCase();
                if (luogoUpper.includes('SEDE') || luogoUpper.includes('MAGAZZINO') || luogoUpper.includes('UFFICIO')) {
                    const adminDaAvvisare = dipendenti.filter(d => (d.ruolo === 'magazziniere' || d.ruolo === 'proprietario') && d.id !== editForm.responsabileId);
                    for (const admin of adminDaAvvisare) {
                        await addDoc(collection(db, 'notifiche'), {
                            companyID, userId: admin.id, titolo: '🏢 Consegna in Sede',
                            messaggio: `Previsto scarico in Sede da ${selectedOrdine.fornitoreNome}. Resp: ${nomeResponsabile}`,
                            letta: false, dataCreazione: new Date().toISOString(), tipo: 'alert'
                        });
                    }
                }
            }
            setIsEditing(false);
            setFilesToUpload([]);
            alert("✅ Dettagli aggiornati con successo!");
        } catch (error) {
            console.error("Errore salvataggio:", error);
            alert("Errore durante l'aggiornamento dell'ordine.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutorizzaFattura = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const pulisciImporto = String(fatturaForm.importo).replace(/\s/g, '').replace(',', '.');
            const importoFatturaNum = parseFloat(pulisciImporto) || 0;
            const totaleOrdineNum = parseFloat(selectedOrdine.totale) || 0;
            
            const dataFatturaStandard = fatturaForm.data 
                ? new Date(`${fatturaForm.data}T12:00:00Z`).toISOString() 
                : new Date().toISOString();
            
            await updateDoc(doc(db, 'ordini_acquisto', selectedOrdine.id), {
                stato: 'chiuso_fatturato',
                datiFattura: {
                    numero: fatturaForm.numero,
                    data: dataFatturaStandard,
                    importoFattura: importoFatturaNum,
                    differenzaImporto: importoFatturaNum - totaleOrdineNum,
                    autorizzatoDa: user?.uid || 'Sconosciuto',
                    dataAutorizzazione: new Date().toISOString()
                }
            });

            await addDoc(collection(db, 'fatture_acquisto'), {
                companyID,
                tipoDocumento: 'fattura_fornitore',
                numero: fatturaForm.numero,
                data: dataFatturaStandard,
                importoTotale: importoFatturaNum,
                fornitoreId: selectedOrdine.fornitoreId || '',
                fornitoreNome: selectedOrdine.fornitoreNome || 'Sconosciuto',
                cantiereId: selectedOrdine.cantiereId || '',
                cantiereNome: selectedOrdine.cantiereNome || 'Generico/Sede',
                ordineId: selectedOrdine.id,
                numeroOrdine: selectedOrdine.numeroOrdine,
                stato: 'da_pagare', 
                dataRegistrazione: new Date().toISOString(),
                autorizzatoDa: user?.uid || 'Sistema'
            });

            const titolari = dipendenti.filter(d => d.ruolo === 'proprietario' || d.ruolo === 'amministrazione');
            for (const admin of titolari) {
                await addDoc(collection(db, 'notifiche'), {
                    companyID, userId: admin.id, titolo: '💶 Nuova Fattura Autorizzata',
                    messaggio: `La fattura ${fatturaForm.numero} di ${selectedOrdine.fornitoreNome} è stata autorizzata. Importo: € ${importoFatturaNum.toLocaleString('it-IT')}`,
                    letta: false, dataCreazione: new Date().toISOString(), tipo: 'info'
                });
            }

            setShowFatturaModal(false);
            alert("✅ Fattura registrata, inviata in amministrazione e Ordine chiuso!");
        } catch (error) {
            console.error("Errore autorizzazione fattura:", error);
            alert("Errore durante la registrazione della fattura.");
        } finally {
            setIsSaving(false);
        }
    };

    if (selectedOrdine) {
        return (
            <div className="p-4 md:p-8 min-h-screen bg-slate-50 animate-fade-in relative">
                <button onClick={() => setSelectedOrdine(null)} className="mb-6 font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors print:hidden">
                    &larr; Torna all'elenco Ordini
                </button>

                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
                    
                    <div className="p-8 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800">Ordine: {selectedOrdine.numeroOrdine}</h1>
                            <p className="text-slate-500 mt-1">Generato il {new Date(selectedOrdine.dataCreazione).toLocaleDateString('it-IT')}</p>
                            
                            <span className={`inline-flex mt-3 items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                selectedOrdine.stato === 'chiuso_fatturato' ? 'bg-blue-100 text-blue-700' :
                                selectedOrdine.stato === 'consegnato' ? 'bg-emerald-100 text-emerald-700' : 
                                'bg-amber-100 text-amber-700'
                            }`}>
                                {selectedOrdine.stato === 'chiuso_fatturato' ? <BanknotesIcon className="h-4 w-4"/> : 
                                 selectedOrdine.stato === 'consegnato' ? <CheckCircleIcon className="h-4 w-4"/> : 
                                 <ClockIcon className="h-4 w-4"/>}
                                {selectedOrdine.stato.replace(/_/g, ' ')}
                            </span>
                        </div>
                        
                        <div className="flex gap-2 print:hidden">
                            {selectedOrdine.stato !== 'consegnato' && selectedOrdine.stato !== 'chiuso_fatturato' && (
                                <button onClick={() => setShowModuloDDT(true)} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-md transition-colors">
                                    <CheckBadgeIcon className="h-5 w-5"/> Registra Arrivo Merce
                                </button>
                            )}
                            {selectedOrdine.stato === 'consegnato' && (
                                <button onClick={() => setShowFatturaModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-colors animate-pulse-once">
                                    <BanknotesIcon className="h-5 w-5"/> Autorizza Pagamento
                                </button>
                            )}
                            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md">
                                <PrinterIcon className="h-5 w-5"/> Stampa PDF
                            </button>
                        </div>
                    </div>

                    {selectedOrdine.stato === 'chiuso_fatturato' && selectedOrdine.datiFattura && (
                        <div className="bg-blue-50 p-6 border-b border-blue-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <CheckBadgeIcon className="h-5 w-5 text-blue-600"/> Ordine Chiuso e Autorizzato
                                </h3>
                                <p className="text-sm text-blue-700 font-medium">
                                    Fattura N. <strong>{selectedOrdine.datiFattura.numero}</strong> del {
                                        selectedOrdine.datiFattura.data ? new Date(selectedOrdine.datiFattura.data).toLocaleDateString('it-IT') : 'N/D'
                                    }
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Importo Fatturato</p>
                                <p className="text-2xl font-black text-blue-900">
                                    € {Number(selectedOrdine.datiFattura.importoFattura || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                                </p>
                                {Number(selectedOrdine.datiFattura.differenzaImporto) !== 0 && !isNaN(selectedOrdine.datiFattura.differenzaImporto) && (
                                    <p className={`text-xs font-bold mt-1 ${selectedOrdine.datiFattura.differenzaImporto > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        Differenza vs Ordine: {selectedOrdine.datiFattura.differenzaImporto > 0 ? '+' : ''}€ {Number(selectedOrdine.datiFattura.differenzaImporto).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 relative">
                        {!isEditing && selectedOrdine.stato !== 'consegnato' && selectedOrdine.stato !== 'chiuso_fatturato' && (
                            <button onClick={() => setIsEditing(true)} className="print:hidden absolute top-4 right-4 text-xs font-bold flex items-center gap-1 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
                                <PencilSquareIcon className="h-4 w-4"/> Pianifica Consegna
                            </button>
                        )}

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><DocumentTextIcon className="h-4 w-4"/> Fornitore</h3>
                                <p className="text-xl font-bold text-indigo-900">{selectedOrdine.fornitoreNome}</p>
                                <p className="text-sm text-slate-500 font-medium mt-1">Rif: {selectedOrdine.descrizione}</p>
                            </div>
                            
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><PaperClipIcon className="h-4 w-4"/> Documenti Preventivo</h3>
                                {isEditing ? (
                                    <input type="file" multiple onChange={(e) => setFilesToUpload(Array.from(e.target.files))} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                ) : (
                                    <div className="space-y-2">
                                        {selectedOrdine.allegati && selectedOrdine.allegati.length > 0 ? (
                                            selectedOrdine.allegati.map((all, i) => (
                                                <a key={i} href={all.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-lg truncate transition-colors">
                                                    <DocumentTextIcon className="h-5 w-5 shrink-0"/> {all.name}
                                                </a>
                                            ))
                                        ) : <p className="text-sm text-slate-400 italic">Nessun documento allegato.</p>}
                                    </div>
                                )}
                            </div>

                            {ddtList.length > 0 && (
                                <div className="pt-4 border-t border-slate-200">
                                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                                        <TruckIcon className="h-4 w-4"/> Bolle e DDT Ricevuti
                                    </h3>
                                    <div className="space-y-3">
                                        {ddtList.map(ddt => (
                                            <div key={ddt.id} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <a href={ddt.fileUrl || ddt.fotoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors">
                                                        <DocumentTextIcon className="h-5 w-5 shrink-0"/> DDT N° {ddt.numeroDDT || 'N/D'}
                                                    </a>
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${ddt.conformita === 'conforme' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                                                        {ddt.conformita}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                                                    <UserIcon className="h-3 w-3"/> Caricato da {ddt.registratoDaNome || ddt.nomeCaricatore}
                                                </p>
                                                {ddt.note && ddt.conformita !== 'conforme' && (
                                                    <div className="mt-3 p-2 bg-white rounded-lg border border-red-200 text-xs font-medium text-red-600 flex items-start gap-1.5">
                                                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5"/>
                                                        <p><strong>Nota Cantiere:</strong> {ddt.note}</p>
                                                    </div>
                                                )}
                                                {ddt.note && ddt.conformita === 'conforme' && (
                                                    <p className="text-xs text-slate-500 mt-2 bg-white p-2 rounded-lg border border-slate-200">{ddt.note}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`p-6 rounded-xl border ${isEditing ? 'bg-indigo-50/50 border-indigo-200 shadow-inner' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><CalendarIcon className="h-4 w-4"/> Data e Ora Consegna</h3>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <input type="date" value={editForm.dataConsegna} onChange={e => setEditForm({...editForm, dataConsegna: e.target.value})} className="w-2/3 p-2.5 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                                            <input type="time" value={editForm.oraConsegna} onChange={e => setEditForm({...editForm, oraConsegna: e.target.value})} className="w-1/3 p-2.5 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" title="Orario di consegna" />
                                        </div>
                                    ) : (
                                        <p className="text-lg font-bold text-slate-800">
                                            {selectedOrdine.dataConsegna ? (
                                                <>
                                                    {new Date(selectedOrdine.dataConsegna).toLocaleDateString('it-IT')} 
                                                    {selectedOrdine.oraConsegna && <span className="text-indigo-600 ml-2">ore {selectedOrdine.oraConsegna}</span>}
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">Da programmare</span>
                                            )}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPinIcon className="h-4 w-4"/> Destinazione Merce</h3>
                                    {isEditing ? (
                                        <textarea rows="2" value={editForm.luogoConsegna} onChange={e => setEditForm({...editForm, luogoConsegna: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Es: Sede Centrale..."></textarea>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{selectedOrdine.luogoConsegna || selectedOrdine.cantiereNome || "N/D"}</p>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><UserIcon className="h-4 w-4"/> Resp. Ricezione</h3>
                                    {isEditing ? (
                                        <select value={editForm.responsabileId} onChange={e => setEditForm({...editForm, responsabileId: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 bg-white">
                                            <option value="">-- Seleziona Responsabile --</option>
                                            {dipendenti.map(dip => (
                                                <option key={dip.id} value={dip.id}>{dip.nome} {dip.cognome}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm font-bold text-indigo-700">
                                            {selectedOrdine.responsabileNome || <span className="text-slate-400 italic font-normal">Nessun responsabile</span>}
                                        </p>
                                    )}
                                </div>

                                {isEditing && (
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Annulla</button>
                                        <button onClick={handleSaveDetails} disabled={isSaving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700 disabled:opacity-50">
                                            {isSaving ? 'Salvataggio...' : 'Conferma'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <h3 className="text-lg font-black text-slate-800 mb-4">Riepilogo Economico Ordine</h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-100 text-slate-600">
                                    <tr>
                                        <th className="p-4 font-bold uppercase text-xs">Descrizione</th>
                                        <th className="p-4 font-bold uppercase text-xs text-center">Q.tà</th>
                                        <th className="p-4 font-bold uppercase text-xs text-right">Prezzo Unit.</th>
                                        <th className="p-4 font-bold uppercase text-xs text-right">Totale Riga</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedOrdine.righe?.map((riga, idx) => (
                                        <tr key={idx}>
                                            <td className="p-4 font-medium text-slate-800">{riga.descrizione}</td>
                                            <td className="p-4 text-center text-slate-600">{riga.quantita} {riga.unitaMisura}</td>
                                            <td className="p-4 text-right text-slate-600">€ {Number(riga.prezzoUnitario).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                            <td className="p-4 text-right font-bold text-slate-800">€ {Number(riga.totaleRiga).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50">
                                    <tr>
                                        <td colSpan="3" className="p-4 text-right font-black uppercase tracking-wider text-slate-500">Totale Previsito Ordine</td>
                                        <td className="p-4 text-right font-black text-xl text-indigo-700">€ {Number(selectedOrdine.totale).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {showModuloDDT && (
                        <ModuloRegistrazioneDDT 
                            ordine={selectedOrdine} db={db} storage={storage} companyID={companyID} user={user}
                            onChiudi={() => setShowModuloDDT(false)} onSuccess={() => setShowModuloDDT(false)}
                        />
                    )}

                    {showFatturaModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                                <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <BanknotesIcon className="h-6 w-6"/> Autorizza Fattura
                                    </h2>
                                    <button onClick={() => setShowFatturaModal(false)} className="p-1 hover:bg-blue-700 rounded-full"><XMarkIcon className="h-6 w-6"/></button>
                                </div>
                                <form onSubmit={handleAutorizzaFattura} className="p-6 space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                                        Verifica che l'importo della fattura corrisponda all'ordine (<strong>€ {Number(selectedOrdine.totale).toLocaleString('it-IT')}</strong>).
                                    </div>

                                    {/* 🌟 BLOCCO AVVISO FORNITORE MANCANTE 🌟 */}
                                    {isFornitoreNonRegistrato && (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                                            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-amber-800 font-medium">
                                                    <strong>Attenzione:</strong> Questo fornitore ({selectedOrdine.fornitoreNome}) non è presente nel tuo Albo Ufficiale.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleAggiuntaRapidaAlbo}
                                                    className="mt-2 text-[11px] font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-700 transition-colors"
                                                >
                                                    + Aggiungi rapidamente all'Albo
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Numero Fattura</label>
                                        <input type="text" required value={fatturaForm.numero} onChange={e => setFatturaForm({...fatturaForm, numero: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-blue-500 font-bold" placeholder="Es. FPA-2026/12"/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fattura</label>
                                            <input type="date" required value={fatturaForm.data} onChange={e => setFatturaForm({...fatturaForm, data: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-blue-500"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Importo Totale (€)</label>
                                            <input type="text" required value={fatturaForm.importo} onChange={e => setFatturaForm({...fatturaForm, importo: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-blue-500 font-bold text-blue-700 bg-blue-50" placeholder="0,00"/>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowFatturaModal(false)} className="flex-1 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Annulla</button>
                                        <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">
                                            {isSaving ? 'Salvataggio...' : 'Conferma e Chiudi'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ordini di Acquisto (ODA)</h1>
                <p className="text-slate-500 mt-1 font-medium">Archivio ordini, ricezione merci e autorizzazione pagamenti.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-indigo-600"/> Elenco Ordini Emessi
                    </h3>
                    <div className="relative w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Cerca ordine, fornitore..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm divide-y divide-slate-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Documento</th>
                                <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Fornitore</th>
                                <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Destinazione</th>
                                <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Importo</th>
                                <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center">Stato</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ordiniFiltrati.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">Nessun ordine presente.</td></tr>
                            ) : (
                                ordiniFiltrati.map(ordine => (
                                    <tr key={ordine.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-slate-900">{ordine.numeroOrdine}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{new Date(ordine.dataCreazione).toLocaleDateString()}</p>
                                        </td>
                                        <td className="p-4 font-bold text-indigo-700">{ordine.fornitoreNome}</td>
                                        <td className="p-4 text-slate-600 font-medium truncate max-w-[200px]">{ordine.cantiereNome}</td>
                                        <td className="p-4 text-right font-black text-slate-800">€ {Number(ordine.totale).toLocaleString('it-IT')}</td>
                                        <td className="p-4 text-center">
                                            {ordine.stato === 'chiuso_fatturato' ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                    <BanknotesIcon className="h-3 w-3"/> Fatturato
                                                </span>
                                            ) : ordine.stato === 'consegnato' ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                    <CheckBadgeIcon className="h-3 w-3"/> Consegnato
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                    <TruckIcon className="h-3 w-3"/> In Attesa
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => apriOrdine(ordine)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                                Apri Dettaglio
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};