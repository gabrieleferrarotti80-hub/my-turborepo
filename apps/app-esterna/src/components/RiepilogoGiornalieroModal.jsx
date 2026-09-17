import React, { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export const RiepilogoGiornalieroModal = ({ onClose, onSubmit, team, lavorazioniAttese = [], materialiAssegnati, oreMax, oraInizio }) => {
    // Se non ha timbrato, permettiamo l'inserimento manuale delle ore Max, altrimenti usiamo quelle calcolate
    const [customOreMax, setCustomOreMax] = useState(oreMax > 0 ? oreMax : 8);
    const limiteOre = oreMax > 0 ? oreMax : customOreMax;

    const [oreAssegnate, setOreAssegnate] = useState({});
    const [note, setNote] = useState('');

    const totaleAssegnato = Object.values(oreAssegnate).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const oreRimanenti = Math.max(0, limiteOre - totaleAssegnato);
    const sforamento = totaleAssegnato > limiteOre;

    const handleOreChange = (faseId, val) => {
        const num = Number(val);
        if (num < 0) return;
        setOreAssegnate(prev => ({ ...prev, [faseId]: num }));
    };

    const handleSubmit = () => {
        if (sforamento) {
            alert(`Impossibile salvare: hai assegnato ${totaleAssegnato} ore ma il limite massimo è di ${limiteOre} ore.`);
            return;
        }

        const fasiLavorate = lavorazioniAttese
            .filter(f => oreAssegnate[f.id] > 0)
            .map(f => ({
                faseId: f.id,
                titolo: f.titolo,
                masterId: f.masterId,
                oreDedicate: oreAssegnate[f.id]
            }));

        if (fasiLavorate.length === 0 && !window.confirm("Attenzione: non hai assegnato ore a nessuna lavorazione. Confermi l'invio del report vuoto?")) {
            return;
        }

        const datiRiepilogoJson = {
            noteGenerali: note,
            oreTotaliTracciate: limiteOre,
            oreTotaliAssegnate: totaleAssegnato,
            lavorazioni: fasiLavorate,
            team: team || [],
            timbraturaInizio: oraInizio ? oraInizio.toLocaleString() : 'Manuale'
        };

        onSubmit(datiRiepilogoJson);
    };

    return (
        <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* HEADER */}
            <div className="bg-indigo-600 p-6 flex justify-between items-center shrink-0">
                <div className="text-white">
                    <h2 className="text-2xl font-black flex items-center gap-2"><ClockIcon className="h-7 w-7"/> Assegna Ore Lavorate</h2>
                    <p className="text-indigo-200 text-sm mt-1 font-medium">
                        {oraInizio 
                            ? `Inizio turno: ${oraInizio.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}` 
                            : 'Nessuna timbratura iniziale rilevata oggi.'}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 bg-indigo-700/50 hover:bg-indigo-700 text-white rounded-full transition-colors"><XMarkIcon className="h-6 w-6"/></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">
                
                {/* 🌟 CRUSCOTTO DEL TEMPO */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="text-center md:text-left">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Ore Disponibili (Dal Timer)</p>
                        {oreMax > 0 ? (
                            <p className="text-3xl font-black text-slate-800">{limiteOre} <span className="text-lg text-slate-400">h</span></p>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input type="number" value={customOreMax} onChange={e => setCustomOreMax(Number(e.target.value))} className="w-20 text-2xl font-black p-2 border-b-2 border-indigo-400 focus:outline-none text-center bg-indigo-50/50 rounded-t-lg text-indigo-700"/>
                                <span className="font-bold text-slate-400 text-lg">h manuali</span>
                            </div>
                        )}
                    </div>
                    
                    {/* BARRA PROGRESSO */}
                    <div className="flex-1 w-full flex flex-col items-center">
                        <div className="flex justify-between w-full mb-1">
                            <span className="text-xs font-bold text-slate-500">Assegnate: {totaleAssegnato}h</span>
                            <span className={`text-xs font-black ${sforamento ? 'text-red-500' : 'text-emerald-500'}`}>
                                {sforamento ? `Sforato di ${totaleAssegnato - limiteOre}h!` : `Rimanenti: ${oreRimanenti}h`}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${sforamento ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(100, (totaleAssegnato / limiteOre) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* ELENCO FASI (LAVORAZIONI) */}
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-indigo-500"/> Su cosa hai lavorato oggi?
                    </h3>
                    
                    {lavorazioniAttese.length === 0 ? (
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-center">
                            <ExclamationTriangleIcon className="h-10 w-10 text-amber-400 mx-auto mb-2"/>
                            <p className="font-bold text-amber-800">Nessuna lavorazione attiva trovata per questo cantiere.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lavorazioniAttese.map(fase => (
                                <div key={fase.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center gap-4 hover:border-indigo-300 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-black text-slate-800 text-sm leading-tight line-clamp-2">{fase.titolo}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                                        <input 
                                            type="number" 
                                            min="0" step="0.5"
                                            placeholder="0"
                                            value={oreAssegnate[fase.id] || ''}
                                            onChange={e => handleOreChange(fase.id, e.target.value)}
                                            className="w-16 p-2 text-center text-lg font-black bg-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="font-bold text-slate-400 pr-2">h</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* NOTE GENERALI */}
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3">Note Aggiuntive</h3>
                    <textarea 
                        rows="3" 
                        placeholder="Vuoi segnalare qualcosa sull'andamento dei lavori?" 
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    ></textarea>
                </div>

            </div>

            {/* FOOTER AZIONI */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Annulla</button>
                <button 
                    onClick={handleSubmit} 
                    disabled={sforamento}
                    className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                    <CheckCircleIcon className="h-6 w-6"/> Invia Report Ufficiale
                </button>
            </div>
        </div>
    );
};