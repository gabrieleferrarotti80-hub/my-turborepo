import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { RichiestaOffertaForm } from 'shared-ui'; 
import { ComparatoreRDO } from 'shared-ui'; 

import { 
    PlusIcon, ShoppingCartIcon, ClockIcon, CheckCircleIcon, 
    TrashIcon, ArrowRightIcon, PaperClipIcon
} from '@heroicons/react/24/outline';

export const GestioneRDOContent = () => {
    const { db, data, companyID, storage, user } = useFirebaseData(); 
    const [rdoList, setRdoList] = useState([]);
    const [view, setView] = useState('list'); 
    const [selectedRdo, setSelectedRdo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [filtroStato, setFiltroStato] = useState(() => {
        return localStorage.getItem('rdoFilter') || 'Tutte';
    });

    useEffect(() => {
        localStorage.removeItem('rdoFilter');
    }, []);

    const apriComparatore = (rdo) => {
        setSelectedRdo(rdo);
        setView('compare');
    };

    const cantieri = data?.cantieri || [];
    const fornitori = data?.fornitori || [];
    const subappaltatori = data?.subappaltatori || [];
    const noleggiatori = data?.noleggiatori || [];
    const catalogo = Array.isArray(data?.catalogo_risorse) ? data.catalogo_risorse : [];

   useEffect(() => {
        if (!db) return;
        
        let q;
        if (companyID) {
            q = query(collection(db, 'richieste_offerta'), where('companyID', '==', companyID));
        } else {
            q = collection(db, 'richieste_offerta');
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => new Date(b.dataInserimento).getTime() - new Date(a.dataInserimento).getTime());
            setRdoList(list);
        }, (error) => {
            console.error("Errore fetch RDO:", error);
        });

        return () => unsubscribe();
    }, [db, companyID]);

    const handleDeleteRDO = async (id) => {
        if (window.confirm("Sei sicuro di voler eliminare questa Richiesta di Offerta?")) {
            try {
                await deleteDoc(doc(db, 'richieste_offerta', id));
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                alert("Errore durante l'eliminazione della RDO.");
            }
        }
    };

    const handleSaveRDO = async (payload, files) => {
        setIsLoading(true);
        try {
            const finalData = { ...payload, companyID, preventiviRicevuti: 0, fornitoreVincenteId: null, allegati: [] };
            const docRef = await addDoc(collection(db, 'richieste_offerta'), finalData);
            
            const knownItems = new Set();
            catalogo.forEach(gruppo => {
                const macro = gruppo.macroCategoria ? `[${gruppo.macroCategoria}] ` : '';
                const base = `${macro}${gruppo.famiglia}`;
                if (gruppo.voci && gruppo.voci.length > 0) {
                    gruppo.voci.forEach(v => knownItems.add(`${base} - ${v}`.toLowerCase().trim()));
                } else {
                    knownItems.add(base.toLowerCase().trim());
                }
            });

            // 🌟 ORA LEGGIAMO IL TIPO DI OGGETTO DIRETTAMENTE DAL PAYLOAD GLOBALE (Non più riga per riga)
            const tipoDizionario = payload.tipoOggetto || 'materiale';

            for (const riga of payload.righe) {
                const desc = (riga.descrizione || '').trim();
                
                if (desc && !knownItems.has(desc.toLowerCase())) {
                    await addDoc(collection(db, 'catalogo_pending'), {
                        testoOriginale: desc,
                        tipoArticolo: tipoDizionario, // materiale, nolo, subappalto
                        companyID: companyID || 'Ufficio Acquisti',
                        stato: 'da_approvare',
                        dataInserimento: new Date().toISOString()
                    });
                    
                    knownItems.add(desc.toLowerCase()); 
                }
            }

            let allegatiCaricati = [];

            if (files && files.length > 0 && storage) {
                for (const file of files) {
                    const fileSafeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                    const fileRef = ref(storage, `richieste_offerta/${docRef.id}/${Date.now()}_${fileSafeName}`);
                    
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    
                    allegatiCaricati.push({
                        name: file.name,
                        url: url,
                        type: file.type,
                        size: file.size
                    });
                }
                await updateDoc(docRef, { allegati: allegatiCaricati });
            }

            const currentCompany = (data?.companies || []).find(c => c.id === companyID) || {};
            const nomeAzienda = currentCompany.ragioneSociale || 'Ufficio Acquisti';
            const emailAzienda = currentCompany.email || user?.email || 'acquisti@azienda.it'; 
            
            const tuttiFornitori = [...fornitori, ...subappaltatori, ...noleggiatori];
            const emailFornitoriInterni = tuttiFornitori
                .filter(f => payload.fornitoriSelezionati.includes(f.id) && f.email)
                .map(f => f.email);
            
            const tutteLeEmail = [...emailFornitoriInterni, ...(payload.emailEsterne || [])];

            let righeHtml = '<table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; max-width: 800px; font-family: Arial, sans-serif; text-align: left;">';
            righeHtml += '<thead style="background-color: #f3f4f6;"><tr><th>Tipologia</th><th>Descrizione</th><th style="text-align:center;">Q.tà</th><th>UM</th><th>Note</th></tr></thead><tbody>';
            
            // 🌟 LEGGIAMO IL NOME ESTESO PER L'EMAIL
            payload.righe.forEach(r => {
                const tipoDescr = r.tipologiaEstesa ? r.tipologiaEstesa.toUpperCase() : 'FORNITURA';
                righeHtml += `<tr><td><small>${tipoDescr}</small></td><td><strong>${r.descrizione}</strong></td><td style="text-align:center;">${r.quantita}</td><td>${r.unitaMisura}</td><td>${r.note || ''}</td></tr>`;
            });
            righeHtml += '</tbody></table>';

            let allegatiHtml = '';
            if (allegatiCaricati.length > 0) {
                allegatiHtml = '<h3 style="color: #4f46e5;">📎 Documenti Allegati:</h3><ul style="font-family: Arial, sans-serif;">';
                allegatiCaricati.forEach(all => {
                    allegatiHtml += `<li><a href="${all.url}" style="color: #2563eb; font-weight: bold; text-decoration: none;">Scarica: ${all.name}</a></li>`;
                });
                allegatiHtml += '</ul>';
            }

           const mailHTML = `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #1e1b4b; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Richiesta di Offerta (RDO)</h2>
                    <p>Gentile Fornitore,</p>
                    <p>La invitiamo a sottoporci la Sua migliore offerta tecnica/economica per la seguente richiesta:</p>
                    <h3 style="background-color: #f8fafc; padding: 10px; border-radius: 5px; color: #0f172a;">${payload.titolo}</h3>
                    
                    <p><strong>📍 Cantiere di Destinazione:</strong> ${payload.cantiereNome}</p>
                    <p><strong>⏳ Scadenza invio offerta:</strong> <span style="color: #dc2626; font-weight: bold;">${new Date(payload.dataScadenza).toLocaleDateString('it-IT')}</span></p>
                    
                    ${payload.noteGenerali ? `<p style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 10px;"><strong>Note aggiuntive:</strong><br/>${payload.noteGenerali}</p>` : ''}
                    
                    <h3 style="color: #4f46e5; margin-top: 30px;">Dettaglio Richieste:</h3>
                    ${righeHtml}
                    
                    <br/>
                    ${allegatiHtml}

                    <p style="margin-top: 30px; font-size: 14px;">
                        In attesa di un Vostro gentile riscontro, l'occasione è gradita per porgere<br/>
                        <strong>Cordiali saluti.</strong><br/><br/>
                        <span style="color: #4f46e5; font-weight: bold;">L'Ufficio Acquisti</span><br/>
                        <em>${nomeAzienda}</em>
                    </p>
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                        <p>Le chiediamo di rispondere a questa email allegando il Suo preventivo ufficiale.</p>
                        <p>Messaggio inviato dal Sistema Gestionale per conto di: <strong>${nomeAzienda}</strong></p>
                    </div>
                </div>
            `;

            for (const email of tutteLeEmail) {
                await addDoc(collection(db, 'mail'), {
                    to: email,
                    message: {
                        subject: `Richiesta di Preventivo: ${payload.titolo} - da ${nomeAzienda}`,
                        html: mailHTML,
                        from: `"${nomeAzienda} (Tramite Gestionale)" <gabrieleferrarotti80@gmail.com>`, 
                        replyTo: emailAzienda 
                    }
                });
            }

            alert("✅ Richiesta di Offerta creata e inviata ai fornitori!");
            setView('list');
        } catch (error) { 
            console.error("Errore salvataggio RDO:", error);
            alert("Errore durante la creazione della RDO."); 
        } 
        finally { setIsLoading(false); }
    };

    const handleUpdatePreventiviParziali = async (updatedFields) => {
        try {
            await updateDoc(doc(db, 'richieste_offerta', selectedRdo.id), {
                ...updatedFields,
                stato: 'da_valutare', 
                lastModifiedAt: new Date().toISOString()
            });
            alert("✅ Preventivi salvati in bozza! Potrai riprendere l'aggiudicazione in un secondo momento.");
            setView('list'); 
        } catch (error) {
            console.error("Errore salvataggio parziale RDO:", error);
            alert("Errore durante il salvataggio dei preventivi.");
        }
    };

    const handleAggiudicaRDO = async (fornitoreVincente, totaleAggiudicato, righeValorizzate) => {
        try {
            const nuovoOrdine = {
                companyID,
                rdoId: selectedRdo.id,
                fornitoreId: fornitoreVincente.tipo === 'interno' ? fornitoreVincente.id : 'OSPITE_ESTERNO',
                fornitoreEmailOspite: fornitoreVincente.tipo === 'esterno' ? fornitoreVincente.id : null,
                fornitoreNome: fornitoreVincente.nome,
                cantiereId: selectedRdo.cantiereId,
                cantiereNome: selectedRdo.cantiereNome,
                numeroOrdine: `ODA-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`, 
                descrizione: selectedRdo.titolo,
                totale: totaleAggiudicato,
                righe: righeValorizzate,
                stato: 'in_attesa_di_consegna', 
                dataCreazione: new Date().toISOString(),
                allegatiOriginali: selectedRdo.allegati || []
            };
            
            await addDoc(collection(db, 'ordini_acquisto'), nuovoOrdine);

            await updateDoc(doc(db, 'richieste_offerta', selectedRdo.id), {
                stato: 'aggiudicata',
                fornitoreVincenteId: fornitoreVincente.id,
                fornitoreVincenteNome: fornitoreVincente.nome,
                totaleAggiudicato: totaleAggiudicato,
                dataAggiudicazione: new Date().toISOString()
            });

            alert("✅ Gara Aggiudicata! È stato generato l'Ordine di Acquisto.");
            setView('list');

        } catch (error) {
            console.error("Errore aggiudicazione:", error);
            alert("Errore durante l'aggiudicazione.");
        }
    };

    const rdoListFiltrata = rdoList.filter(rdo => {
        if (filtroStato === 'Tutte') return true;
        const stato = (rdo.stato || '').toLowerCase().trim();
        const isScaduta = new Date(rdo.dataScadenza) < new Date() && stato === 'in_attesa';

        if (filtroStato === 'scaduta') return isScaduta;
        if (filtroStato === 'in_attesa') return ['in_attesa', 'inviata', 'bozza'].includes(stato) && !isScaduta;
        if (filtroStato === 'da_valutare') return ['risposto', 'ricevuta', 'da_valutare'].includes(stato);
        if (filtroStato === 'aggiudicata') return stato === 'aggiudicata';
        return true;
    });

    if (view === 'add') {
        return <RichiestaOffertaForm onBack={() => setView('list')} onSave={handleSaveRDO} cantieri={cantieri} fornitori={fornitori} subappaltatori={subappaltatori} noleggiatori={noleggiatori} isLoading={isLoading} catalogo={catalogo} />;
    }

    if (view === 'compare' && selectedRdo) {
        return (
            <ComparatoreRDO 
                rdo={selectedRdo} 
                fornitoriAnagrafica={[...fornitori, ...subappaltatori, ...noleggiatori]} 
                onBack={() => setView('list')} 
                onAggiudica={handleAggiudicaRDO} 
                onUpdate={handleUpdatePreventiviParziali} 
            />
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Richieste di Offerta (RDO)</h1>
                    <p className="text-gray-500 mt-1">Gestisci le gare d'appalto fornitura, compara i prezzi e genera gli ordini.</p>
                </div>
                <button onClick={() => setView('add')} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                    <PlusIcon className="h-5 w-5"/> Nuova Richiesta Multipla
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 shrink-0">
                        <ShoppingCartIcon className="h-5 w-5 text-indigo-500"/> Elenco RDO Attive e Passate
                    </h3>

                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'Tutte', label: 'Tutte le RDO' },
                            { id: 'in_attesa', label: 'In Attesa' },
                            { id: 'da_valutare', label: 'Da Valutare' },
                            { id: 'aggiudicata', label: 'Aggiudicate' },
                            { id: 'scaduta', label: 'Scadute' }
                        ].map(filtro => (
                            <button
                                key={filtro.id}
                                onClick={() => setFiltroStato(filtro.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    filtroStato === filtro.id
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {filtro.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Dettaglio RDO</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Cantiere</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Fornitori Coinvolti</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Stato</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rdoListFiltrata.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">Nessuna richiesta di offerta trovata per questo filtro.</td></tr>
                            ) : (
                                rdoListFiltrata.map((rdo) => {
                                    const totaleFornitori = (rdo.fornitoriSelezionati?.length || 0) + (rdo.emailEsterne?.length || 0);
                                    const isScaduta = new Date(rdo.dataScadenza) < new Date() && rdo.stato === 'in_attesa';

                                    return (
                                        <tr key={rdo.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{rdo.titolo}</div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-gray-500 uppercase">Inserita il: {new Date(rdo.dataInserimento).toLocaleDateString()}</span>
                                                    {rdo.allegati && rdo.allegati.length > 0 && (
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                                            <PaperClipIcon className="h-3 w-3"/> {rdo.allegati.length} Allegati
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-indigo-700">{rdo.cantiereNome}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-gray-800">{rdo.preventiviRicevuti || 0}</span> / <span className="text-gray-400">{totaleFornitori}</span>
                                                <div className="text-[10px] text-gray-400 uppercase mt-0.5">Risposte</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {rdo.stato === 'aggiudicata' ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircleIcon className="h-4 w-4"/> Aggiudicata</span>
                                                ) : ['risposto', 'ricevuta', 'da_valutare'].includes(rdo.stato) ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold"><ClockIcon className="h-4 w-4"/> Da Valutare</span>
                                                ) : isScaduta ? (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><ClockIcon className="h-4 w-4"/> Scaduta</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold"><ClockIcon className="h-4 w-4"/> In Attesa</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-3">
                                                    <button onClick={() => apriComparatore(rdo)} className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                                        {rdo.stato === 'aggiudicata' ? 'Vedi Dettagli' : 'Inserisci / Compara'} <ArrowRightIcon className="h-3 w-3"/>
                                                    </button>
                                                    <button onClick={() => handleDeleteRDO(rdo.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <TrashIcon className="h-4 w-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};