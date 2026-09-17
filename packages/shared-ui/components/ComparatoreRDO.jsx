import React, { useState, useMemo } from 'react';
import { 
    ArrowLeftIcon, TrophyIcon, CheckCircleIcon, 
    BanknotesIcon, DocumentCheckIcon, ArchiveBoxArrowDownIcon 
} from '@heroicons/react/24/outline';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

// 🌟 AGGIUNTA LA PROP 'onUpdate'
export const ComparatoreRDO = ({ rdo, fornitoriAnagrafica = [], onBack, onAggiudica, onUpdate }) => {
    
    const righeSicure = rdo?.righe || [];
    const isAggiudicata = rdo?.stato === 'aggiudicata';

    // Costruiamo la lista dei fornitori invitati
    const partecipanti = useMemo(() => {
        const list = [];
        (rdo?.fornitoriSelezionati || []).forEach(fId => {
            const f = fornitoriAnagrafica.find(x => x.id === fId);
            if (f) {
                list.push({ id: f.id, nome: f.ragioneSociale, tipo: 'interno' });
            } else {
                 list.push({ id: fId, nome: 'Fornitore Eliminato', tipo: 'interno' });
            }
        });
        (rdo?.emailEsterne || []).forEach(email => {
            list.push({ id: email, nome: email, tipo: 'esterno' });
        });
        return list;
    }, [rdo, fornitoriAnagrafica]);

    // Stato matrice dei prezzi: { [idFornitore]: { [indiceRiga]: prezzo } }
    const [prezzi, setPrezzi] = useState(() => {
        const iniziali = {};
        partecipanti.forEach(p => {
            iniziali[p.id] = {};
            righeSicure.forEach((_, idx) => {
                iniziali[p.id][idx] = rdo?.risposte?.[p.id]?.prezzi?.[idx] || 0;
            });
        });
        return iniziali;
    });

    const handlePrezzoChange = (fId, rIdx, val) => {
        if (isAggiudicata) return;
        const cleanVal = val.toString().replace(',', '.'); 
        setPrezzi(prev => ({
            ...prev,
            [fId]: { ...prev[fId], [rIdx]: cleanVal === '' ? 0 : Number(cleanVal) }
        }));
    };

    // Calcola il totale per ogni fornitore
    const totali = useMemo(() => {
        const tot = {};
        partecipanti.forEach(p => {
            tot[p.id] = righeSicure.reduce((acc, riga, idx) => {
                const prezzoInserito = prezzi[p.id]?.[idx] || 0;
                return acc + (Number(riga.quantita || 0) * prezzoInserito);
            }, 0);
        });
        return tot;
    }, [prezzi, partecipanti, righeSicure]);

    // Trova il prezzo più basso (maggiore di 0)
    const minTotale = useMemo(() => {
        const valoriValidi = Object.values(totali).filter(v => v > 0);
        return valoriValidi.length > 0 ? Math.min(...valoriValidi) : null;
    }, [totali]);

    // 🌟 NUOVA FUNZIONE: Salva in Bozza
    const handleSalvaBozza = () => {
        if (isAggiudicata) return;

        // Costruiamo l'oggetto delle risposte per il database
        const nuoveRisposte = {};
        let preventiviRicevuti = 0;

        partecipanti.forEach(p => {
            nuoveRisposte[p.id] = { prezzi: prezzi[p.id] || {} };
            
            // Se questo fornitore ha inserito almeno un prezzo maggiore di 0, contiamo il suo preventivo come "ricevuto"
            const haPrezzi = Object.values(prezzi[p.id] || {}).some(v => Number(v) > 0);
            if (haPrezzi) preventiviRicevuti++;
        });

        // Passiamo i dati al padre (GestioneRDOContent) che si occuperà del salvataggio
        onUpdate({
            risposte: nuoveRisposte,
            preventiviRicevuti: preventiviRicevuti
        });
    };

    const handleConfermaAggiudicazione = (fornitore) => {
        const totaleFornitore = totali[fornitore.id];
        if (totaleFornitore <= 0) {
            alert("Non puoi aggiudicare a un fornitore con totale 0€. Inserisci i prezzi.");
            return;
        }
        
        if (window.confirm(`Sei sicuro di voler aggiudicare la fornitura a ${fornitore.nome} per ${formatCurrency(totaleFornitore)}?\n\nQuesto genererà un Ordine di Acquisto Ufficiale.`)) {
            
            const righeValorizzate = righeSicure.map((riga, idx) => ({
                ...riga,
                prezzoUnitario: Number(prezzi[fornitore.id]?.[idx] || 0),
                totaleRiga: Number(riga.quantita || 0) * Number(prezzi[fornitore.id]?.[idx] || 0)
            }));

            onAggiudica(fornitore, totaleFornitore, righeValorizzate);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-fade-in flex flex-col h-full">
            
            {/* 🌟 HEADER CON BOTTONI (Indietro e Salva Bozza) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 w-full">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors w-max">
                    <ArrowLeftIcon className="h-5 w-5" /> Torna alla lista
                </button>

                {!isAggiudicata && (
                    <button 
                        onClick={handleSalvaBozza}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg transition-all active:scale-95"
                    >
                        <ArchiveBoxArrowDownIcon className="h-5 w-5" /> Salva Dati (Senza Aggiudicare)
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 flex-1 flex flex-col min-h-0">
                <div className="p-8 bg-slate-900 text-white shrink-0 rounded-t-3xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">Quadro Comparativo RDO</p>
                            <h1 className="text-3xl font-black">{rdo?.titolo || 'Gara Senza Titolo'}</h1>
                            <p className="text-slate-400 mt-1">Cantiere: {rdo?.cantiereNome || 'N/D'}</p>
                        </div>
                        {isAggiudicata && (
                            <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shrink-0">
                                <CheckCircleIcon className="h-6 w-6"/> AGGIUDICATA A {rdo?.fornitoreVincenteNome?.toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 overflow-auto flex-1">
                    <p className="text-xs text-slate-500 font-medium mb-4">
                        {!isAggiudicata ? "Inserisci i prezzi ricevuti nei riquadri sottostanti per confrontare le offerte." : "Questa gara è chiusa. I prezzi non sono più modificabili."}
                    </p>
                    
                    <div className="inline-block min-w-full">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="p-4 bg-slate-50 border-b-2 border-slate-200 text-xs font-black text-slate-500 uppercase w-[30%]">Materiale / Lavorazione</th>
                                    <th className="p-4 bg-slate-50 border-b-2 border-slate-200 text-xs font-black text-slate-500 uppercase text-center w-24">Q.tà</th>
                                    
                                    {partecipanti.map(p => (
                                        <th key={p.id} className={`p-4 border-b-2 border-l border-slate-200 text-center relative min-w-[200px] ${rdo?.fornitoreVincenteId === p.id ? 'bg-green-50 border-b-green-500' : 'bg-indigo-50/30'}`}>
                                            {rdo?.fornitoreVincenteId === p.id && <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>}
                                            <p className={`text-sm font-bold truncate px-2 ${rdo?.fornitoreVincenteId === p.id ? 'text-green-700' : 'text-indigo-900'}`} title={p.nome}>{p.nome}</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">{p.tipo === 'esterno' ? 'Ospite Esterno' : 'Fornitore In Albo'}</p>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {righeSicure.map((riga, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800 text-sm">{riga.descrizione}</p>
                                            {riga.note && <p className="text-[10px] text-slate-500 mt-0.5">{riga.note}</p>}
                                        </td>
                                        <td className="p-4 text-center font-medium text-slate-600">
                                            {riga.quantita} {riga.unitaMisura}
                                        </td>
                                        
                                        {partecipanti.map(p => (
                                            <td key={p.id} className={`p-3 border-l border-slate-100 align-middle ${rdo?.fornitoreVincenteId === p.id ? 'bg-green-50/30' : ''}`}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-slate-400 font-bold">€</span>
                                                    <input 
                                                        type="text" 
                                                        value={prezzi[p.id]?.[idx] === 0 ? '' : prezzi[p.id]?.[idx]}
                                                        onChange={e => handlePrezzoChange(p.id, idx, e.target.value)}
                                                        disabled={isAggiudicata}
                                                        className="w-24 p-2 border border-slate-200 rounded text-right font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 disabled:bg-transparent disabled:border-transparent"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="2" className="p-6 text-right font-black text-slate-800 uppercase tracking-widest text-sm bg-slate-50 border-r border-slate-200 rounded-bl-3xl">
                                        Totale Offerta
                                    </td>
                                    {partecipanti.map(p => {
                                        const isMigliore = totali[p.id] === minTotale && totali[p.id] > 0;
                                        const isVincente = rdo?.fornitoreVincenteId === p.id;
                                        return (
                                            <td key={p.id} className={`p-6 border-l border-slate-200 text-center relative ${isVincente ? 'bg-green-100' : isMigliore ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                                {isMigliore && !isAggiudicata && <div className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><TrophyIcon className="h-3 w-3"/> Miglior Prezzo</div>}
                                                
                                                <p className={`text-xl font-black ${isVincente ? 'text-green-700' : isMigliore ? 'text-amber-600' : 'text-slate-800'}`}>
                                                    {formatCurrency(totali[p.id])}
                                                </p>

                                                {!isAggiudicata && (
                                                    <button 
                                                        onClick={() => handleConfermaAggiudicazione(p)}
                                                        className={`mt-4 w-full py-2.5 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-sm flex justify-center items-center gap-1 ${isMigliore ? 'bg-amber-500 text-white hover:bg-amber-600 ring-4 ring-amber-500/30' : 'bg-slate-800 text-white hover:bg-black'}`}
                                                    >
                                                        <DocumentCheckIcon className="h-4 w-4"/> Aggiudica a {p.nome.substring(0, 8)}...
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};