import React, { useState } from 'react';
import { PlusIcon, StarIcon } from '@heroicons/react/24/solid';

// 🌟 AGGIUNTA PROP vociMaster
export const FaseTaglioPianteForm = ({ onAddFasi, canWriteData, vociMaster }) => {
    const [modo, setModo] = useState('singolo'); 
    const [zona, setZona] = useState('urbano'); 
    const [masterId, setMasterId] = useState(''); // 🌟 NUOVO STATO
    
    const [tipoTaglio, setTipoTaglio] = useState({ abbattimento: false, potatura: false });
    const [nomeFase, setNomeFase] = useState('');
    const [personale, setPersonale] = useState(1);
    const [durata, setDurata] = useState(2);
    const [unitaDurata, setUnitaDurata] = useState('ore'); 
    const [nInterventi, setNInterventi] = useState(1);
    const [anni, setAnni] = useState(1);
    
    const [error, setError] = useState('');

    const handleTipoTaglioChange = (e) => {
        const { name, checked } = e.target;
        setTipoTaglio(prev => ({ ...prev, [name]: checked }));
    };

    const calcolaDurataOre = () => {
        const numDurata = Number(durata);
        return unitaDurata === 'giorni' ? numDurata * 8 : numDurata;
    };

    const handleSubmit = () => {
        // 🌟 CONTROLLO MASTER
        if (!masterId) { setError('Devi associare una Voce Master.'); return; }
        if (nomeFase.trim() === '') { setError('Il nome della fase è obbligatorio.'); return; }
        if (!tipoTaglio.abbattimento && !tipoTaglio.potatura) { setError("Seleziona almeno un tipo di intervento (Abbattimento o Potatura)."); return; }
        setError('');

        const durataStimataInOre = calcolaDurataOre();

        const faseData = {
            masterId: masterId, // 🌟 SALVATO NEL DB
            nomeSubcantiere: nomeFase,
            durataStimata: durataStimataInOre,
            stato: 'da_programmare',
            personalePrevisto: Number(personale),
            dettagliAttivita: {
                tipo: 'Taglio Piante', ricorsivo: modo === 'ricorsivo',
                durataOriginale: Number(durata), unitaOriginale: unitaDurata,
                nInterventiAnno: modo === 'ricorsivo' ? Number(nInterventi) : null,
                anni: modo === 'ricorsivo' ? Number(anni) : null,
                tipoTaglio: { abbattimento: tipoTaglio.abbattimento, potatura: tipoTaglio.potatura },
                zona: zona, faseUrbanizzazione: null, subappalto: false, nomeSubappaltatore: null,
            }
        };

       onAddFasi([faseData]);
        
        setNomeFase(''); setPersonale(1); setDurata(2); setUnitaDurata('ore');
        setNInterventi(1); setAnni(1); setTipoTaglio({ abbattimento: false, potatura: false });
        setZona('urbano'); setMasterId(''); // Reset master
    };

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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Intervento</label>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2"><input type="checkbox" name="abbattimento" checked={tipoTaglio.abbattimento} onChange={handleTipoTaglioChange} disabled={!canWriteData} /> Abbattimento</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="potatura" checked={tipoTaglio.potatura} onChange={handleTipoTaglioChange} disabled={!canWriteData} /> Potatura</label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zona</label>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2"><input type="radio" name="zonaTaglioPiante" value="urbano" checked={zona === 'urbano'} onChange={(e) => setZona(e.target.value)} disabled={!canWriteData} /> Urbano</label>
                        <label className="flex items-center gap-2"><input type="radio" name="zonaTaglioPiante" value="extraurbano" checked={zona === 'extraurbano'} onChange={(e) => setZona(e.target.value)} disabled={!canWriteData} /> Extraurbano</label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modo</label>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2"><input type="radio" name="modoTaglioPiante" value="singolo" checked={modo === 'singolo'} onChange={(e) => setModo(e.target.value)} disabled={!canWriteData} /> Singolo</label>
                        <label className="flex items-center gap-2"><input type="radio" name="modoTaglioPiante" value="ricorsivo" checked={modo === 'ricorsivo'} onChange={(e) => setModo(e.target.value)} disabled={!canWriteData} /> Ricorsivo</label>
                    </div>
                </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fase</label>
                    <input type="text" value={nomeFase} onChange={(e) => setNomeFase(e.target.value)} placeholder="Es. Potatura Parco Centro" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl focus:border-indigo-500 outline-none" disabled={!canWriteData} />
                </div>
                
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Personale Previsto</label><input type="number" min="1" value={personale} onChange={(e) => setPersonale(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Durata</label><input type="number" min="1" value={durata} onChange={(e) => setDurata(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
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
                    <PlusIcon className="h-5 w-5" /> Aggiungi Fase
                </button>
            </div>
        </div>
    );
};