import React, { useState, useMemo, useEffect } from 'react';
import { 
    UserGroupIcon, ClockIcon, CurrencyEuroIcon, 
    ArrowLeftIcon, CheckCircleIcon, CalculatorIcon,
    WrenchScrewdriverIcon, AdjustmentsHorizontalIcon,
    ExclamationTriangleIcon, CloudArrowUpIcon
} from '@heroicons/react/24/outline';

export const AnalisiManodoperaView = ({ righeComputo = [], onBack, onConfirm, onSaveDraft }) => {
    
    // Costo orario medio di riferimento per trasformare gli Euro in Ore
    const [costoOrarioMedio, setCostoOrarioMedio] = useState(30.00);
    
    // Stato locale per permettere all'utente di sovrascrivere le ore matematiche
    const [righeElaborate, setRigheElaborate] = useState([]);

    // Al primo caricamento (o se cambia il costo orario), ricalcoliamo tutto
    useEffect(() => {
        const elaborazione = righeComputo.map(riga => {
            const pBando = Number(riga.prezzoGaraOriginale) || 0;
            const pSenzaMano = Number(riga.prezzoSenzaManodopera) || 0;
            const incidenza = Number(riga.incidenzaManodopera) || 0;
            const qtaTotale = (Number(riga.quantita) || 0) * (Number(riga.numeroInterventi) || 1);

            let quotaManodoperaUnit = 0;

            // Logica di estrapolazione: Priorità all'incidenza %, poi alla sottrazione
            if (incidenza > 0) {
                quotaManodoperaUnit = pBando * (incidenza / 100);
            } else if (pSenzaMano > 0 && pBando > pSenzaMano) {
                quotaManodoperaUnit = pBando - pSenzaMano;
            }

            const costoManodoperaTot = quotaManodoperaUnit * qtaTotale;
            const oreMatematiche = costoOrarioMedio > 0 ? (costoManodoperaTot / costoOrarioMedio) : 0;

            // Recuperiamo un eventuale override precedente se l'utente aveva già modificato
            const rigaEsistente = righeElaborate.find(re => re.id === riga.id);
            const oreOverride = rigaEsistente?.oreManodoperaManuali !== undefined 
                                ? rigaEsistente.oreManodoperaManuali 
                                : oreMatematiche;

            return {
                ...riga,
                quotaManodoperaUnit,
                costoManodoperaTot,
                oreManodoperaMatematiche: oreMatematiche,
                oreManodoperaManuali: oreOverride,
                hasManodopera: quotaManodoperaUnit > 0
            };
        });
        
        setRigheElaborate(elaborazione);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [righeComputo, costoOrarioMedio]);

    // Gestione della modifica manuale delle ore
    const handleUpdateOre = (id, nuoveOre) => {
        setRigheElaborate(prev => prev.map(r => 
            r.id === id ? { ...r, oreManodoperaManuali: Number(nuoveOre) || 0 } : r
        ));
    };

    // --- RIEPILOGHI GLOBALI ---
    const riepilogo = useMemo(() => {
        let totOre = 0;
        let totCostoManodopera = 0;
        let vociSenzaManodopera = 0;

        righeElaborate.forEach(r => {
            totOre += r.oreManodoperaManuali;
            totCostoManodopera += r.costoManodoperaTot;
            if (!r.hasManodopera && !r.isMaster) vociSenzaManodopera++;
        });

        // Stimiamo i giorni lavorativi totali necessari (considerando 8 ore/giorno per 1 operaio)
        const giorniUomo = totOre / 8;

        return { totOre, totCostoManodopera, giorniUomo, vociSenzaManodopera };
    }, [righeElaborate]);

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden mt-6 animate-fade-in relative flex flex-col h-[calc(100vh-140px)]">
            
            {/* 🌟 HEADER CON TASTO SALVA BOZZA RESO SUPER VISIBILE 🌟 */}
            <div className="bg-slate-900 p-6 flex flex-wrap justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 text-white hover:bg-slate-700 rounded-full transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-amber-400" /> Estrazione Fabbisogni
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Trasforma gli Euro del bando in Ore/Uomo di lavoro.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 ml-auto">
                    {/* Input Costo Orario */}
                    <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-2xl border border-slate-700">
                        <span className="text-xs font-black text-slate-400 uppercase ml-2 hidden md:inline">Costo Orario:</span>
                        <div className="relative">
                            <CurrencyEuroIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                            <input 
                                type="number" 
                                value={costoOrarioMedio} 
                                onChange={(e) => setCostoOrarioMedio(Number(e.target.value))}
                                className="w-24 pl-9 pr-2 py-2 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold text-center outline-none focus:border-amber-500"
                            />
                        </div>
                        <span className="text-sm font-bold text-slate-400 mr-2">€/h</span>
                    </div>

                    {/* 🌟 TASTO SALVA BOZZA IN ALTO (Evidenziato in Indaco/Blu) 🌟 */}
                    <button 
                        onClick={() => onSaveDraft && onSaveDraft(righeElaborate)} 
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black transition-all shadow-md shadow-indigo-900/50 border border-indigo-400 active:scale-95"
                    >
                        <CloudArrowUpIcon className="h-6 w-6 text-white" /> 
                        <span>Salva Bozza</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT - TABELLA */}
            <div className="flex-1 overflow-auto bg-slate-50 relative pb-10">
                
                {riepilogo.vociSenzaManodopera > 0 && (
                    <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 shrink-0" />
                        <div>
                            <p className="font-bold text-amber-800">Attenzione: {riepilogo.vociSenzaManodopera} voci senza dati di manodopera.</p>
                            <p className="text-xs text-amber-700 mt-1">Il listino non forniva l'incidenza o il prezzo decurtato per queste voci. Le ore stimate sono a zero. Puoi inserirle manualmente nella tabella qui sotto.</p>
                        </div>
                    </div>
                )}

                <div className="p-6">
                    <table className="min-w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                        <thead className="bg-slate-100 border-b border-slate-200">
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                                <th className="px-4 py-4">Codice e Descrizione</th>
                                <th className="px-4 py-4 text-center">Q.tà Totale</th>
                                <th className="px-4 py-4 text-right">Quota Manodopera</th>
                                <th className="px-4 py-4 text-center">Incidenza</th>
                                <th className="px-4 py-4 text-center border-l border-indigo-100 bg-indigo-50/50 text-indigo-700">Ore Calcolate</th>
                                <th className="px-4 py-4 text-center bg-indigo-50/50 text-indigo-700">Ore Reali (Modificabili)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {righeElaborate.map((riga) => (
                                <tr key={riga.id} className={`hover:bg-slate-50 transition-colors ${!riga.hasManodopera ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-4 py-4">
                                        <p className="text-xs font-black text-slate-800">{riga.codice || 'CUSTOM'}</p>
                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={riga.descrizione}>{riga.descrizione}</p>
                                    </td>
                                    <td className="px-4 py-4 text-center font-bold text-slate-600">
                                        {((Number(riga.quantita) || 0) * (Number(riga.numeroInterventi) || 1)).toFixed(2)} {riga.unitaMisura}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <p className="font-bold text-slate-800">€ {riga.costoManodoperaTot.toFixed(2)}</p>
                                        <p className="text-[9px] text-slate-400">({riga.quotaManodoperaUnit.toFixed(2)} €/unit)</p>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {riga.incidenzaManodopera > 0 ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black">{riga.incidenzaManodopera}%</span>
                                        ) : riga.prezzoSenzaManodopera > 0 ? (
                                            <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded text-[10px] font-black">Da Prezzo Puro</span>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-400 px-2 py-1 rounded text-[10px] font-black">N.D.</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center border-l border-slate-100 bg-indigo-50/30">
                                        <span className="text-sm font-medium text-slate-500">{riga.oreManodoperaMatematiche.toFixed(1)} h</span>
                                    </td>
                                    <td className="px-4 py-4 text-center bg-indigo-50/30">
                                        <div className="flex justify-center items-center gap-1">
                                            <input 
                                                type="number" 
                                                value={riga.oreManodoperaManuali.toFixed(1)} 
                                                onChange={(e) => handleUpdateOre(riga.id, e.target.value)}
                                                className={`w-20 text-center font-black rounded-lg px-2 py-1.5 outline-none border transition-all ${riga.oreManodoperaManuali !== riga.oreManodoperaMatematiche ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-indigo-200 text-indigo-700 focus:ring-2 focus:ring-indigo-500'}`}
                                            />
                                            <span className="text-xs font-bold text-slate-500">h</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FOOTER - RIEPILOGO E AZIONI */}
            <div className="bg-white border-t border-slate-200 p-6 flex flex-wrap justify-between items-end gap-6 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
                
                <div className="flex gap-4 md:gap-6 w-full lg:w-auto">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-1 lg:w-48">
                        <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 mb-1"><CurrencyEuroIcon className="h-4 w-4"/> Valore Manodopera</p>
                        <p className="text-xl md:text-2xl font-black text-slate-800">€ {riepilogo.totCostoManodopera.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 flex-1 lg:w-48 relative overflow-hidden">
                        <ClockIcon className="absolute -right-4 -bottom-4 h-24 w-24 text-indigo-100 opacity-50" />
                        <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1 mb-1 relative z-10"><ClockIcon className="h-4 w-4"/> Fabbisogno Totale</p>
                        <p className="text-2xl md:text-3xl font-black text-indigo-700 relative z-10">{riepilogo.totOre.toFixed(0)} <span className="text-sm md:text-lg text-indigo-500 font-bold">Ore</span></p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex-1 lg:w-48 relative overflow-hidden hidden sm:block">
                        <UserGroupIcon className="absolute -right-2 -bottom-2 h-20 w-20 text-amber-100 opacity-50" />
                        <p className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1 mb-1 relative z-10"><UserGroupIcon className="h-4 w-4"/> Stima Giornate</p>
                        <p className="text-xl md:text-2xl font-black text-amber-800 relative z-10">{riepilogo.giorniUomo.toFixed(0)} <span className="text-xs md:text-sm font-bold text-amber-600">gg/uomo</span></p>
                    </div>
                </div>

                <div className="flex gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                    <button 
                        onClick={() => onConfirm(righeElaborate)} 
                        className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 flex-1"
                    >
                        <CheckCircleIcon className="h-6 w-6" /> <span className="hidden sm:inline">Conferma e Vai al Gantt</span><span className="sm:hidden">Vai al Gantt</span>
                    </button>
                </div>
            </div>
        </div>
    );
};