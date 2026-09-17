import React, { useState, useMemo } from 'react';
import { useFirebaseData, useSALManager } from 'shared-core';
import { SALList, SALForm } from 'shared-ui';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { ChartPieIcon, PlusIcon } from '@heroicons/react/24/solid';

export const CantiereContabilita = ({ cantiere }) => {
    const { db, user, userAziendaId, data } = useFirebaseData();
    const { addSAL, updateSAL, deleteSAL, isLoading } = useSALManager(db, user, userAziendaId);

    const [view, setView] = useState('list'); // 'list', 'add', 'edit'
    const [selectedSAL, setSelectedSAL] = useState(null);

    const salList = useMemo(() => {
        return (data?.sal || []).filter(s => s.cantiereId === cantiere.id);
    }, [data?.sal, cantiere.id]);

    const valoreAppalto = useMemo(() => {
        if (cantiere.valoreAppalto) return Number(cantiere.valoreAppalto);
        if (cantiere.offertaId && data?.offerte) {
            const offerta = data.offerte.find(o => o.id === cantiere.offertaId);
            return Number(offerta?.datiAnalisi?.valoreEconomico || 0);
        }
        return 0;
    }, [cantiere, data?.offerte]);

    // CALCOLI PER IL CRUSCOTTO
    const totaleSalizzato = useMemo(() => {
        return salList.reduce((acc, sal) => acc + Number(sal.importo || sal.importoCertificato || 0), 0);
    }, [salList]);

    const rimanenteDaSalizzare = Math.max(0, valoreAppalto - totaleSalizzato);
    const percentualeSalizzata = valoreAppalto > 0 ? Math.min((totaleSalizzato / valoreAppalto) * 100, 100) : 0;

    const handleSave = async (dati) => {
        const wasApprovato = selectedSAL?.stato?.toLowerCase() === 'approvato';
        const isApprovato = dati.stato?.toLowerCase() === 'approvato';
        const shouldGenerateInvoice = isApprovato && !wasApprovato;

        let res;
        if (selectedSAL) res = await updateSAL(selectedSAL.id, dati);
        else res = await addSAL(dati);

        if (res.success) {
            if (shouldGenerateInvoice && db) {
                try {
                    const salId = selectedSAL ? selectedSAL.id : res.id;
                    const importoSal = Number(dati.importoCertificato || dati.importo || dati.valore || 0);
                    
                    const identificativoSal = dati.numero || dati.numeroSal || dati.titolo || dati.nome || selectedSAL?.numero || selectedSAL?.titolo || selectedSAL?.nome || "";
                    const isSoloNumero = /^\d+$/.test(String(identificativoSal).trim());
                    
                    let dicituraRiga = "";
                    if (identificativoSal) {
                        const prefisso = isSoloNumero ? `SAL n° ${identificativoSal}` : `SAL ${identificativoSal}`;
                        dicituraRiga = `${prefisso} - Cantiere: ${cantiere.nomeCantiere || cantiere.nome || ''}`;
                    } else {
                        dicituraRiga = `SAL - Cantiere: ${cantiere.nomeCantiere || cantiere.nome || ''}`;
                    }
                    
                    const anagraficaCliente = (data?.clients || []).find(c => c.id === cantiere.clienteId) || {};
                    const ragioneSociale = anagraficaCliente.ragioneSociale || anagraficaCliente.nome || cantiere.cliente || cantiere.nomeCliente || "Cliente Sconosciuto";
                    const pIvaCF = anagraficaCliente.partitaIva || anagraficaCliente.piva || anagraficaCliente.codiceFiscale || anagraficaCliente.cf || "";

                    const nuovaFattura = {
                        companyID: userAziendaId || "",
                        aziendaId: userAziendaId || "",
                        numeroFattura: '',
                        clienteId: cantiere.clienteId || "",
                        ragioneSocialeCliente: ragioneSociale || "",
                        indirizzoCliente: anagraficaCliente.indirizzo || anagraficaCliente.sedeLegale || "",
                        cittaCliente: anagraficaCliente.citta || "",
                        capCliente: anagraficaCliente.cap || "",
                        provinciaCliente: anagraficaCliente.provincia || "",
                        pivaCliente: pIvaCF || "",
                        sdiCliente: anagraficaCliente.sdi || anagraficaCliente.codiceDestinatario || "",
                        pecCliente: anagraficaCliente.pec || "",
                        cantiereId: cantiere.id || "",
                        riferimentoLavori: cantiere.nomeCantiere || cantiere.nome || "",
                        salId: salId || "",
                        dataEmissione: new Date().toISOString().split('T')[0], 
                        stato: 'Da Inviare',
                        metodoPagamento: 'Bonifico Bancario',
                        scadenzaPagamento: '',
                        note: `Fattura generata automaticamente dall'approvazione del ${identificativoSal ? (isSoloNumero ? 'SAL n.'+identificativoSal : 'SAL '+identificativoSal) : 'SAL'} del cantiere.`,
                        aliquotaIva: 22,
                        imponibile: importoSal || 0,
                        importoIva: (importoSal * 0.22) || 0, 
                        totaleDocumento: (importoSal * 1.22) || 0,
                        righe: [{ descrizione: dicituraRiga.trim() || "", quantita: 1, prezzoUnitario: importoSal || 0, totaleRiga: importoSal || 0 }],
                        createdAt: serverTimestamp(),
                        createdBy: user?.uid || 'Sistema',
                    };

                    await addDoc(collection(db, 'fatture'), nuovaFattura);
                    alert(`✅ SAL Approvato!\nÈ stata generata la Fattura "Da Inviare" da € ${importoSal.toLocaleString('it-IT')}.`);
                } catch (error) {
                    console.error("Errore generazione fattura:", error);
                    alert("⚠️ Si è verificato un errore durante la generazione automatica della fattura.");
                }
            }
            setView('list');
            setSelectedSAL(null);
        } else {
            alert("Errore: " + res.message);
        }
    };

    const handleDelete = async (id) => {
        if(confirm("Eliminare questo SAL?")) await deleteSAL(id);
    };

    if (view === 'add' || view === 'edit') {
        return (
            <SALForm 
                onBack={() => { setView('list'); setSelectedSAL(null); }}
                onSave={handleSave}
                initialData={selectedSAL}
                cantiereId={cantiere.id}
                valoreAppalto={valoreAppalto}
                isSaving={isLoading}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* CRUSCOTTO CONTABILE CON BOTTONE IN CIMA */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ChartPieIcon className="h-6 w-6 text-indigo-600" />
                        Riepilogo Avanzamento Contabile
                    </h3>
                    <button 
                        onClick={() => { setSelectedSAL(null); setView('add'); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Emetti Nuovo SAL
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Valore Appalto / Contratto</p>
                        <p className="text-xl font-black text-gray-800">€ {valoreAppalto.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-1">Totale Già Salizzato</p>
                        <p className="text-xl font-black text-indigo-700">€ {totaleSalizzato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">Rimanente da Salizzare</p>
                        <p className="text-xl font-black text-green-700">€ {rimanenteDaSalizzare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-gray-600">
                        <span className="uppercase tracking-wider">Avanzamento Globale Fatturazione</span>
                        <span className={percentualeSalizzata >= 100 ? 'text-green-600' : 'text-indigo-600'}>
                            {percentualeSalizzata.toFixed(2)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-700 ${percentualeSalizzata >= 100 ? 'bg-green-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${percentualeSalizzata}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* LISTA DEI SAL (PULITA) */}
            <SALList 
                salList={salList}
                onEdit={(sal) => { setSelectedSAL(sal); setView('edit'); }}
                onDelete={handleDelete}
            />
        </div>
    );
};