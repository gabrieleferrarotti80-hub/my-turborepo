import React, { useState } from 'react';
import { PlusIcon, StarIcon } from '@heroicons/react/24/solid';

// 🌟 AGGIUNTA PROP vociMaster
export const FaseTaglioErbaForm = ({ onAddFasi, canWriteData, vociMaster }) => {
    const [modo, setModo] = useState('singolo'); 
    const [masterId, setMasterId] = useState(''); // 🌟 NUOVO STATO
    const [nomeFase, setNomeFase] = useState('');
    const [personale, setPersonale] = useState(1);
    const [durata, setDurata] = useState(2);
    const [unitaDurata, setUnitaDurata] = useState('ore'); 
    const [nInterventi, setNInterventi] = useState(1);
    const [anni, setAnni] = useState(1);
    
    const [error, setError] = useState('');

    const calcolaDurataOre = () => {
        const numDurata = Number(durata);
        if (unitaDurata === 'giorni') return numDurata * 8; 
        return numDurata;
    };

    const handleSubmit = () => {
        // 🌟 CONTROLLO MASTER OBBLIGATORIO
        if (!masterId) {
            setError('Devi associare una Voce Master per le statistiche.');
            return;
        }
        if (nomeFase.trim() === '') {
            setError('Il "Nome Lavoro" (es. Sfalcio Parco) è obbligatorio.');
            return;
        }
        setError('');

        const durataStimataInOre = calcolaDurataOre();
        const fasiDaAggiungere = []; 

        if (modo === 'singolo') {
            const faseData = {
                masterId: masterId, // 🌟 SALVATO NEL DB
                nomeSubcantiere: nomeFase, 
                durataStimata: durataStimataInOre,
                stato: 'da_programmare',
                personalePrevisto: Number(personale),
                dettagliAttivita: {
                    tipo: 'Taglio Erba',
                    ricorsivo: false,
                    durataOriginale: Number(durata),
                    unitaOriginale: unitaDurata,
                    nInterventiAnno: null, anni: null,
                    interventoCorrente: null, annoCorrente: null, 
                }
            };
            fasiDaAggiungere.push(faseData);
        } else {
            const nomeBase = nomeFase.trim();
            const numAnni = Number(anni);
            const numInterventi = Number(nInterventi);

            for (let a = 1; a <= numAnni; a++) {
                for (let i = 1; i <= numInterventi; i++) {
                    const nomeAutomatico = `${i}° ${nomeBase} anno ${a}`;
                    const faseDataRicorsiva = {
                        masterId: masterId, // 🌟 SALVATO NEL DB
                        nomeSubcantiere: nomeAutomatico, 
                        durataStimata: durataStimataInOre,
                        stato: 'da_programmare',
                        personalePrevisto: Number(personale),
                        dettagliAttivita: {
                            tipo: 'Taglio Erba', ricorsivo: true,
                            durataOriginale: Number(durata), unitaOriginale: unitaDurata,
                            nInterventiAnno: numInterventi, anni: numAnni,
                            interventoCorrente: i, annoCorrente: a,
                        }
                    };
                    fasiDaAggiungere.push(faseDataRicorsiva);
                }
            }
        }

        onAddFasi(fasiDaAggiungere);
        
        setNomeFase(''); setPersonale(1); setDurata(2); setUnitaDurata('ore');
        setNInterventi(1); setAnni(1); setMasterId(''); // Resetta anche il master
    };

    // Auto-compila il nome se seleziona il master
    const handleMasterChange = (e) => {
        const selectedId = e.target.value;
        setMasterId(selectedId);
        if (selectedId && !nomeFase) {
            const masterObj = vociMaster?.find(m => m.id === selectedId);
            if (masterObj) setNomeFase(masterObj.descrizione);
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
            {error && <p className="text-sm font-bold text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            
            <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="radio" name="modoTaglioErba" value="singolo" checked={modo === 'singolo'} onChange={(e) => setModo(e.target.value)} disabled={!canWriteData} /> Singolo</label>
                <label className="flex items-center gap-2"><input type="radio" name="modoTaglioErba" value="ricorsivo" checked={modo === 'ricorsivo'} onChange={(e) => setModo(e.target.value)} disabled={!canWriteData} /> Ricorsivo</label>
            </div>
            <hr />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 🌟 SELECTOR VOCE MASTER */}
                <div className="md:col-span-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <label className="block text-sm font-black text-indigo-900 mb-1 flex items-center gap-2"><StarIcon className="h-5 w-5 text-amber-500"/> Lavorazione Associata (Voce Master) *</label>
                    <select value={masterId} onChange={handleMasterChange} className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" disabled={!canWriteData}>
                        <option value="">-- Seleziona la Voce Master --</option>
                        {vociMaster?.map(m => <option key={m.id} value={m.id}>{m.codice} - {m.descrizione}</option>)}
                    </select>
                </div>

                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{modo === 'ricorsivo' ? 'Nome Lavoro (es. Sfalcio Parco)' : 'Nome Fase Unica'}</label>
                    <input type="text" value={nomeFase} onChange={(e) => setNomeFase(e.target.value)} placeholder={modo === 'ricorsivo' ? "Es. Sfalcio erba Guanzate" : "Es. Sfalcio area 1 - Intervento Unico"} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl focus:border-indigo-500 outline-none" disabled={!canWriteData} />
                     {modo === 'ricorsivo' && <p className="text-xs text-gray-500 mt-1">Nota: Il numero (1°) e l'anno (anno 1) verranno aggiunti automaticamente.</p>}
                </div>
                
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Personale Previsto</label><input type="number" min="1" value={personale} onChange={(e) => setPersonale(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{modo === 'ricorsivo' ? 'Durata (per singolo int.)' : 'Durata'}</label><input type="number" min="1" value={durata} onChange={(e) => setDurata(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unità</label><select value={unitaDurata} onChange={(e) => setUnitaDurata(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData}><option value="ore">Ore</option><option value="giorni">Giorni</option></select></div>
            </div>

            {modo === 'ricorsivo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">N° Interventi/Anno</label><input type="number" min="1" value={nInterventi} onChange={(e) => setNInterventi(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Anni</label><input type="number" min="1" value={anni} onChange={(e) => setAnni(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
                </div>
            )}
            
            <div className="text-right">
                <button type="button" onClick={handleSubmit} disabled={!canWriteData} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 active:scale-95 transition-all">
                    <PlusIcon className="h-5 w-5" /> {modo === 'ricorsivo' ? 'Aggiungi Fasi Ricorsive' : 'Aggiungi Fase'}
                </button>
            </div>
        </div>
    );
};