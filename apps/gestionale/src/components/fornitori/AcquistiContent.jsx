import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'; 
import { FatturaAcquistoForm } from 'shared-ui'; 
import { 
    DocumentTextIcon, PlusIcon, CheckCircleIcon, ExclamationCircleIcon, ClockIcon,
    MagnifyingGlassIcon, PencilIcon, TrashIcon, BanknotesIcon, ArrowLeftIcon,
    ClipboardDocumentCheckIcon, TruckIcon, ShieldCheckIcon, UserIcon, CalendarDaysIcon,
    EnvelopeOpenIcon, FunnelIcon, XMarkIcon
} from '@heroicons/react/24/outline';

export const AcquistiContent = () => {
    const { db, data, loadingData, companyID, user } = useFirebaseData();
    
    const fornitori = data?.fornitori || [];
    const fatture = data?.fatture_acquisto || [];
    const cantieri = data?.cantieri || [];
    const subappaltatori = data?.subappaltatori || [];
    const noleggiatori = data?.noleggiatori || [];
    const dipendenti = data?.users || []; 

    const [view, setView] = useState('list'); 
    const [selectedItem, setSelectedItem] = useState(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filtroCantiere, setFiltroCantiere] = useState('');
    const [filtroFornitore, setFiltroFornitore] = useState('');
    const [filtroStato, setFiltroStato] = useState(''); 
    
    const [ordineCollegato, setOrdineCollegato] = useState(null); 
    const [rdoCollegato, setRdoCollegato] = useState(null);

    // 🌟 UNIFICAZIONE DI TUTTE LE ANAGRAFICHE AZIENDALI
    const anagraficaCompleta = useMemo(() => {
        return [...fornitori, ...subappaltatori, ...noleggiatori];
    }, [fornitori, subappaltatori, noleggiatori]);

    // 🌟 SUPER-FUNZIONI DI ESTRAZIONE DATI BLINDATE 🌟
    const getNomeAzienda = React.useCallback((f) => {
        // 1. Cerchiamo l'ID in tutte le possibili chiavi salvate dal Form
        const aziendaId = f.fornitoreId || f.subappaltatoreId || f.noleggiatoreId || f.aziendaId;
        
        // 2. Se abbiamo un ID, lo cerchiamo nell'anagrafica viva
        if (aziendaId) {
            const match = anagraficaCompleta.find(a => a.id === aziendaId);
            if (match) return match.ragioneSociale || match.nome || match.fornitoreNome || 'Senza Nome';
        }
        
        // 3. Se non c'è l'ID o non lo trova (magari fornitore cancellato), usa il testo di fallback
        return f.fornitoreNome || f.subappaltatoreNome || f.noleggiatoreNome || f.fornitore || f.ragioneSociale || f.nomeAzienda || 'Sconosciuto';
    }, [anagraficaCompleta]);

    const getNomeCantiere = (f) => f.nomeCantiere || f.cantiereNome || f.cantiere || 'Generico / Sede';
    const getNumeroFattura = (f) => f.numeroFattura || f.numero || f.numeroDoc || 'Senza Numero';

    // 🌟 CREAZIONE DELLE TENDINE DINAMICHE
    const cantieriDisponibili = useMemo(() => {
        const lista = fatture.map(getNomeCantiere).filter(c => c !== 'Generico / Sede');
        return ['Generico / Sede', ...new Set(lista)].sort();
    }, [fatture]);

    const fornitoriDisponibili = useMemo(() => {
        const lista = fatture.map(getNomeAzienda).filter(n => n !== 'Sconosciuto');
        return [...new Set(lista)].sort();
    }, [fatture, getNomeAzienda]);

    const stats = useMemo(() => {
        let totaleDaPagare = 0;
        let totaleScaduto = 0;
        let totalePagatoMese = 0;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        fatture.forEach(f => {
            const statoNorm = (f.stato || '').toLowerCase().trim();
            const isPagata = statoNorm === 'pagata';
            const importo = Number(f.importoTotale || f.totaleDocumento || f.totale || f.importo || 0);
            const dataScad = f.scadenzaPagamento || f.dataScadenza;
            const dFattura = new Date(f.dataFattura || f.data || f.dataDocumento || f.createdAt || new Date());

            if (!isPagata && statoNorm !== 'annullata') {
                totaleDaPagare += importo;
                if (dataScad && new Date(dataScad) < today) {
                    totaleScaduto += importo;
                }
            }

            if (isPagata && dFattura.getMonth() === currentMonth && dFattura.getFullYear() === currentYear) {
                totalePagatoMese += importo;
            }
        });

        return { totaleDaPagare, totaleScaduto, totalePagatoMese, numFatture: fatture.length };
    }, [fatture]);

    const fattureFiltrate = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);

        return fatture.filter(f => {
            const nomeDitta = getNomeAzienda(f);
            const numFattura = getNumeroFattura(f).toLowerCase();
            const cantiereFatt = getNomeCantiere(f);
            const statoNorm = (f.stato || '').toLowerCase().trim();
            const dataScad = f.scadenzaPagamento || f.dataScadenza;
            const isScaduta = statoNorm !== 'pagata' && statoNorm !== 'annullata' && dataScad && new Date(dataScad) < today;

            const search = searchQuery.toLowerCase();
            const matchSearch = nomeDitta.toLowerCase().includes(search) || numFattura.includes(search);
            const matchCantiere = filtroCantiere === '' || cantiereFatt === filtroCantiere;
            const matchFornitore = filtroFornitore === '' || nomeDitta === filtroFornitore;
            
            let matchStato = true;
            if (filtroStato === 'pagata') matchStato = statoNorm === 'pagata';
            if (filtroStato === 'da_pagare') matchStato = statoNorm !== 'pagata' && statoNorm !== 'annullata';
            if (filtroStato === 'scaduta') matchStato = isScaduta;

            return matchSearch && matchCantiere && matchFornitore && matchStato;
        }).sort((a, b) => {
            const d1 = new Date(b.dataFattura || b.data || b.createdAt || 0);
            const d2 = new Date(a.dataFattura || a.data || a.createdAt || 0);
            return d1 - d2;
        });
    }, [fatture, searchQuery, filtroCantiere, filtroFornitore, filtroStato, getNomeAzienda]);

    const resetFiltri = () => {
        setSearchQuery('');
        setFiltroCantiere('');
        setFiltroFornitore('');
        setFiltroStato('');
    };

    useEffect(() => {
        if (view === 'detail_fattura' && selectedItem?.ordineId) {
            const fetchHistory = async () => {
                try {
                    const ordSnap = await getDoc(doc(db, 'ordini_acquisto', selectedItem.ordineId));
                    if (ordSnap.exists()) {
                        const ordData = ordSnap.data();
                        setOrdineCollegato(ordData);
                        if (ordData.rdoId) {
                            const rdoSnap = await getDoc(doc(db, 'richieste_offerta', ordData.rdoId));
                            if (rdoSnap.exists()) setRdoCollegato(rdoSnap.data());
                        }
                    }
                } catch (error) { console.error("Errore recupero storico:", error); }
            };
            fetchHistory();
        } else {
            setOrdineCollegato(null);
            setRdoCollegato(null);
        }
    }, [view, selectedItem, db]);

    const handleSaveFattura = async (fatturaData) => {
        try {
            const docId = fatturaData.id || Date.now().toString();
            await setDoc(doc(db, 'fatture_acquisto', docId), { ...fatturaData, id: docId, companyID, updatedAt: new Date().toISOString() });
            setView('list');
            alert("✅ Fattura salvata con successo!");
        } catch (error) { alert("Errore: " + error.message); }
    };

    const handleDeleteFattura = async (id) => {
        if(confirm("Eliminare questa fattura? L'azione è irreversibile.")) {
            await deleteDoc(doc(db, 'fatture_acquisto', id));
            setView('list');
        }
    };

    const segnaComePagata = async (fattura) => {
        if(confirm("Confermi di aver effettuato il pagamento per questa fattura?")) {
            await handleSaveFattura({
                ...fattura, 
                stato: 'pagata', 
                dataPagamento: new Date().toISOString(),
                pagatoDa: user?.uid || 'Sistema' 
            });
            setView('list');
        }
    };

    const getNomeUtente = (uid) => {
        if (!uid || uid === 'Sistema' || uid === 'Sconosciuto') return 'Utente di Sistema';
        const dip = dipendenti.find(d => d.id === uid);
        return dip ? `${dip.nome} ${dip.cognome}` : 'Utente Sconosciuto';
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento cruscotto acquisti...</div>;

    if (view === 'add_fattura' || view === 'edit_fattura') {
        return <FatturaAcquistoForm 
            onBack={() => setView(view === 'edit_fattura' ? 'detail_fattura' : 'list')} 
            onSave={handleSaveFattura} 
            fornitori={[...fornitori, ...subappaltatori, ...noleggiatori]} 
            subappaltatori={subappaltatori} 
            noleggiatori={noleggiatori} 
            cantieri={cantieri} 
            initialData={view === 'edit_fattura' ? selectedItem : null} 
        />;
    }

    if (view === 'detail_fattura' && selectedItem) {
        const fatt = selectedItem;
        const importoReale = Number(fatt.importoTotale || fatt.totaleDocumento || fatt.totale || fatt.importo || 0);
        const isPagata = (fatt.stato || '').toLowerCase().trim() === 'pagata';
        const dataDoc = fatt.dataFattura || fatt.data || fatt.dataDocumento || fatt.createdAt;
        const righeFattura = fatt.righe || fatt.voci || [];
        
        let stepCount = 1; 

        return (
            <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in-down">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" /> Torna allo Scadenzario
                        </button>
                        <div className="flex gap-2">
                            {!isPagata && (
                                <button onClick={() => segnaComePagata(fatt)} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-green-600 transition-colors">
                                    <BanknotesIcon className="h-5 w-5"/> Registra Pagamento
                                </button>
                            )}
                            <button onClick={() => setView('edit_fattura')} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors">
                                <PencilIcon className="h-5 w-5"/> Modifica
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900">Fattura N° {getNumeroFattura(fatt)}</h2>
                                        <p className="text-gray-500 mt-1 flex items-center gap-1"><CalendarDaysIcon className="h-4 w-4"/> Del {dataDoc ? new Date(dataDoc).toLocaleDateString('it-IT') : 'N/D'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Importo Totale</p>
                                        <p className="text-3xl font-black text-indigo-700">€ {importoReale.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPagata ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {isPagata ? 'Saldato' : 'Da Pagare'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Azienda Creditrice</p>
                                        <p className="font-bold text-gray-800 text-lg">{getNomeAzienda(fatt)}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{fatt.categoriaCosto || fatt.tipoDocumento || 'Fornitura / Servizio'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Destinazione / Centro di Costo</p>
                                        <p className="font-bold text-gray-800 text-lg">{getNomeCantiere(fatt)}</p>
                                    </div>
                                </div>
                            </div>

                            {righeFattura.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <DocumentTextIcon className="h-5 w-5 text-indigo-500"/> Dettaglio Articoli / Lavorazioni
                                        </h3>
                                    </div>
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-white border-b border-gray-100">
                                            <tr>
                                                <th className="p-4 font-bold text-gray-400 uppercase text-xs">Descrizione</th>
                                                <th className="p-4 font-bold text-gray-400 uppercase text-xs text-center">Q.tà</th>
                                                <th className="p-4 font-bold text-gray-400 uppercase text-xs text-right">Prezzo Unit.</th>
                                                <th className="p-4 font-bold text-gray-400 uppercase text-xs text-right">Totale Riga</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {righeFattura.map((riga, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-4 font-medium text-gray-800">{riga.descrizione}</td>
                                                    <td className="p-4 text-center text-gray-600">{riga.quantita} {riga.unitaMisura}</td>
                                                    <td className="p-4 text-right text-gray-600">€ {Number(riga.prezzoUnitario || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                                    <td className="p-4 text-right font-bold text-gray-900">€ {Number(riga.totaleRiga || (riga.quantita * riga.prezzoUnitario) || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                                <ClockIcon className="h-6 w-6 text-indigo-600"/> Audit Trail di Processo
                            </h3>
                            
                            <div className="relative border-l-2 border-indigo-100 ml-4 space-y-8 pb-4">
                                {rdoCollegato && (
                                    <div className="relative pl-6">
                                        <div className="absolute -left-[17px] top-0 bg-indigo-100 p-1.5 rounded-full border-4 border-white">
                                            <EnvelopeOpenIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-900">{stepCount++}. Richiesta Offerta (RDO)</h4>
                                        <div className="mt-1.5 space-y-1">
                                            <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                                <CalendarDaysIcon className="h-3.5 w-3.5"/> 
                                                {new Date(rdoCollegato.dataInserimento || rdoCollegato.dataCreazione).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                                            </p>
                                            <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1.5">
                                                <UserIcon className="h-3.5 w-3.5"/> 
                                                Lanciata da: {getNomeUtente(rdoCollegato.creatoDa)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {fatt.ordineId ? (
                                    <div className="relative pl-6">
                                        <div className="absolute -left-[17px] top-0 bg-indigo-100 p-1.5 rounded-full border-4 border-white">
                                            <ClipboardDocumentCheckIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-900">{stepCount++}. Ordine di Acquisto</h4>
                                        <div className="mt-1.5 space-y-1">
                                            {ordineCollegato?.dataCreazione && (
                                                <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                                    <CalendarDaysIcon className="h-3.5 w-3.5"/> 
                                                    {new Date(ordineCollegato.dataCreazione).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            )}
                                            <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1.5">
                                                <UserIcon className="h-3.5 w-3.5"/> 
                                                Emesso da: {getNomeUtente(ordineCollegato?.creatoDa || ordineCollegato?.aggiudicatoDa)}
                                            </p>
                                            <span className="inline-block mt-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">Rif: {fatt.numeroOrdine}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative pl-6">
                                        <div className="absolute -left-[17px] top-0 bg-gray-100 p-1.5 rounded-full border-4 border-white">
                                            <PencilIcon className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-900">{stepCount++}. Inserimento Manuale</h4>
                                        <p className="text-xs text-gray-500 mt-1">Fattura inserita manualmente, senza ordine preventivo.</p>
                                    </div>
                                )}

                                {fatt.ordineId && (
                                    <div className="relative pl-6">
                                        <div className={`absolute -left-[17px] top-0 p-1.5 rounded-full border-4 border-white ${ordineCollegato?.dataRicezioneEffettiva ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                            <TruckIcon className={`h-4 w-4 ${ordineCollegato?.dataRicezioneEffettiva ? 'text-indigo-600' : 'text-gray-400'}`} />
                                        </div>
                                        <h4 className={`font-bold text-sm ${ordineCollegato?.dataRicezioneEffettiva ? 'text-gray-900' : 'text-gray-400'}`}>{stepCount++}. Ricezione Merce (DDT)</h4>
                                        
                                        {ordineCollegato?.dataRicezioneEffettiva ? (
                                            <div className="mt-1.5 space-y-1">
                                                <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                                    <CalendarDaysIcon className="h-3.5 w-3.5"/> 
                                                    {new Date(ordineCollegato.dataRicezioneEffettiva).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                                <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1.5">
                                                    <UserIcon className="h-3.5 w-3.5"/> 
                                                    DDT Inserito da: {getNomeUtente(ordineCollegato.ricevutoDa)}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-gray-400 mt-1">In attesa di consegna fisica in cantiere.</p>
                                        )}
                                    </div>
                                )}

                                <div className="relative pl-6">
                                    <div className="absolute -left-[17px] top-0 bg-indigo-100 p-1.5 rounded-full border-4 border-white">
                                        <ShieldCheckIcon className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <h4 className="font-bold text-sm text-gray-900">{stepCount++}. Fattura Autorizzata</h4>
                                    <div className="mt-1.5 space-y-1">
                                        <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                            <CalendarDaysIcon className="h-3.5 w-3.5"/> 
                                            {new Date(fatt.dataRegistrazione || fatt.createdAt || new Date()).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                        <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1.5">
                                            <UserIcon className="h-3.5 w-3.5"/> 
                                            Verificata da: {getNomeUtente(fatt.autorizzatoDa)}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative pl-6">
                                    <div className={`absolute -left-[17px] top-0 p-1.5 rounded-full border-4 border-white ${isPagata ? 'bg-green-100' : 'bg-gray-100'}`}>
                                        <BanknotesIcon className={`h-4 w-4 ${isPagata ? 'text-green-600' : 'text-gray-400'}`} />
                                    </div>
                                    <h4 className={`font-bold text-sm ${isPagata ? 'text-green-700' : 'text-gray-400'}`}>{stepCount++}. Pagamento Erogato</h4>
                                    {isPagata ? (
                                        <div className="mt-1.5 space-y-1 bg-green-50 p-2 rounded-lg border border-green-100">
                                            <p className="text-[11px] text-green-700 font-medium flex items-center gap-1.5">
                                                <CalendarDaysIcon className="h-3.5 w-3.5"/> 
                                                Saldato il {new Date(fatt.dataPagamento || fatt.updatedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                                            </p>
                                            <p className="text-[11px] text-green-800 font-black flex items-center gap-1.5">
                                                <UserIcon className="h-3.5 w-3.5"/> 
                                                Saldato da: {getNomeUtente(fatt.pagatoDa)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-1">In attesa di disposizione di bonifico da parte dell'amministrazione.</p>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fatture di Acquisto & Spese</h1>
                    <p className="text-gray-500 mt-1">Gestisci le fatture passive, lo scadenziario e i pagamenti ai fornitori.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => { setSelectedItem(null); setView('add_fattura'); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md transition-colors">
                        <PlusIcon className="h-5 w-5"/> Registra Spesa Manuale
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div onClick={() => setFiltroStato('')} className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all ${filtroStato === '' ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-100 hover:shadow-md'}`}>
                    <div className={`p-3 rounded-xl ${filtroStato === '' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}><DocumentTextIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fatture a Sistema</p>
                        <p className="text-2xl font-extrabold text-gray-900">{stats.numFatture}</p>
                    </div>
                </div>
                <div onClick={() => setFiltroStato('da_pagare')} className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all ${filtroStato === 'da_pagare' ? 'ring-2 ring-yellow-500 border-yellow-200' : 'border-gray-100 hover:shadow-md'}`}>
                    <div className={`p-3 rounded-xl ${filtroStato === 'da_pagare' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-600'}`}><ClockIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Da Pagare (Totale)</p>
                        <p className="text-2xl font-extrabold text-gray-900">€ {stats.totaleDaPagare.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
                <div onClick={() => setFiltroStato('scaduta')} className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all relative overflow-hidden ${filtroStato === 'scaduta' ? 'ring-2 ring-red-500 border-red-200' : 'border-red-100 hover:shadow-md ring-1 ring-red-50'}`}>
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-500"></div>
                    <div className={`p-3 rounded-xl ${filtroStato === 'scaduta' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}><ExclamationCircleIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Scadute (Allarme)</p>
                        <p className="text-2xl font-extrabold text-red-700">€ {stats.totaleScaduto.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
                <div onClick={() => setFiltroStato('pagata')} className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all ${filtroStato === 'pagata' ? 'ring-2 ring-green-500 border-green-200' : 'border-gray-100 hover:shadow-md'}`}>
                    <div className={`p-3 rounded-xl ${filtroStato === 'pagata' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}><CheckCircleIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pagate questo mese</p>
                        <p className="text-2xl font-extrabold text-green-700">€ {stats.totalePagatoMese.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between">
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <FunnelIcon className="h-5 w-5 text-indigo-500 shrink-0"/>
                        <h3 className="font-bold text-gray-800 whitespace-nowrap">Filtra Documenti:</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Cerca n° o azienda..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-colors" />
                        </div>
                        <select value={filtroCantiere} onChange={(e) => setFiltroCantiere(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50 focus:bg-white text-gray-700">
                            <option value="">Tutti i Cantieri</option>
                            {cantieriDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filtroFornitore} onChange={(e) => setFiltroFornitore(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50 focus:bg-white text-gray-700">
                            <option value="">Tutte le Aziende</option>
                            {fornitoriDisponibili.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <select value={filtroStato} onChange={(e) => setFiltroStato(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 bg-gray-50 focus:bg-white text-gray-700">
                                <option value="">Tutti gli Stati</option>
                                <option value="da_pagare">Da Pagare</option>
                                <option value="scaduta">Scadute</option>
                                <option value="pagata">Pagate / Saldate</option>
                            </select>
                            {(searchQuery || filtroCantiere || filtroFornitore || filtroStato) && (
                                <button onClick={resetFiltri} title="Azzera filtri" className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100">
                                    <XMarkIcon className="h-5 w-5"/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 min-h-[400px]">
                <div className="overflow-x-auto">
                    {fattureFiltrate.length === 0 ? (
                        <div className="text-center py-16"><DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">Nessuna fattura corrisponde ai filtri impostati.</p></div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Azienda Creditrice</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Cantiere Dest.</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-right">Importo</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-center">Stato Pagamento</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fattureFiltrate.map((fatt) => {
                                    const isScaduta = fatt.stato !== 'pagata' && fatt.scadenzaPagamento && new Date(fatt.scadenzaPagamento) < new Date(new Date().setHours(0,0,0,0));
                                    const nomeDitta = getNomeAzienda(fatt);
                                    const numDocReale = getNumeroFattura(fatt);
                                    const dataReale = fatt.dataFattura || fatt.data || fatt.dataDocumento || fatt.createdAt || new Date();
                                    const importoReale = Number(fatt.importoTotale || fatt.totaleDocumento || fatt.totale || fatt.importo || 0);

                                    return (
                                        <tr 
                                            key={fatt.id} 
                                            onClick={() => { setSelectedItem(fatt); setView('detail_fattura'); }} 
                                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                                    <DocumentTextIcon className="h-4 w-4 text-indigo-400" />
                                                    Fatt. {numDocReale}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">{new Date(dataReale).toLocaleDateString('it-IT')}</div>
                                                {fatt.ordineId && (
                                                    <span className="inline-block mt-1 text-[9px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">
                                                        Da Ordine {fatt.numeroOrdine}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-indigo-700">{nomeDitta}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{fatt.categoriaCosto || fatt.tipoDocumento || 'N/D'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                {getNomeCantiere(fatt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-extrabold text-gray-900">€ {importoReale.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {(fatt.stato || '').toLowerCase().trim() === 'pagata' ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold"><CheckCircleIcon className="h-4 w-4"/> Pagata</span>
                                                ) : isScaduta ? (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse"><ExclamationCircleIcon className="h-4 w-4"/> Scaduta</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-bold"><ClockIcon className="h-4 w-4"/> Da Pagare</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    {(fatt.stato || '').toLowerCase().trim() !== 'pagata' && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); segnaComePagata(fatt); }} 
                                                            title="Segna come Pagata oggi"
                                                            className="p-2 bg-white border border-gray-200 text-green-600 hover:bg-green-50 rounded-lg shadow-sm transition-colors"
                                                        >
                                                            <BanknotesIcon className="h-4 w-4"/>
                                                        </button>
                                                    )}
                                                    
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedItem(fatt); setView('edit_fattura'); }} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 rounded-lg shadow-sm"><PencilIcon className="h-4 w-4"/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFattura(fatt.id); }} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-red-600 rounded-lg shadow-sm"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};