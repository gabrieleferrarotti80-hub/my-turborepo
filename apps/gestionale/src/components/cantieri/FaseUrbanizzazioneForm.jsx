import React, { useState } from 'react';
import { PlusIcon, StarIcon } from '@heroicons/react/24/solid';

const FASI_URBANIZZAZIONE_LIST = [
    'Cantierizzazione', 'Scavo, sbancamento e riporto terra', 'Abbattimenti',
    'Impianto di irrigazione', 'Impianto elettrico', 'Opere edili',
    'Opere viabili (sentieri, strade, ecc..)', 'Piantagioni',
    'Semine (comprensivo di sistemazione terreno)', 'Dismissione cantiere'
];

// 🌟 AGGIUNTA PROP vociMaster
export const FaseUrbanizzazioneForm = ({ onAddFasi, canWriteData, vociMaster }) => {
    const [selectedFase, setSelectedFase] = useState(''); 
    const [masterId, setMasterId] = useState(''); // 🌟 NUOVO STATO
    const [isSubappalto, setIsSubappalto] = useState(false);
    const [nomeSubappaltatore, setNomeSubappaltatore] = useState('');
    
    const [personale, setPersonale] = useState(1);
    const [durata, setDurata] = useState(2);
    const [unitaDurata, setUnitaDurata] = useState('ore'); 
    
    const [error, setError] = useState('');

    const calcolaDurataOre = () => {
        const numDurata = Number(durata);
        return unitaDurata === 'giorni' ? numDurata * 8 : numDurata;
    };

    const handleSubmit = () => {
        // 🌟 CONTROLLO MASTER
        if (!masterId) { setError('Devi associare una Voce Master.'); return; }
        if (selectedFase.trim() === '') { setError('È necessario selezionare una fase dall\'elenco.'); return; }
        if (isSubappalto && nomeSubappaltatore.trim() === '') { setError('Il nome dell\'azienda subappaltatrice è obbligatorio.'); return; }
        setError('');

        const durataStimataInOre = calcolaDurataOre();

        const faseData = {
            masterId: masterId, // 🌟 SALVATO NEL DB
            nomeSubcantiere: selectedFase, 
            durataStimata: durataStimataInOre,
            stato: 'da_programmare',
            personalePrevisto: Number(personale),
            dettagliAttivita: {
                tipo: 'Urbanizzazione', ricorsivo: false,
                durataOriginale: Number(durata), unitaOriginale: unitaDurata,
                nInterventiAnno: null, anni: null, tipoTaglio: null, zona: null,
                faseUrbanizzazione: selectedFase, 
                subappalto: isSubappalto,
                nomeSubappaltatore: isSubappalto ? nomeSubappaltatore.trim() : null,
            }
        };

        // 🌟 BUG FIX: L'aggiungi cantiere si aspetta un array! Inviavo [faseData] al posto di faseData
        onAddFasi([faseData]);
        
        setSelectedFase(''); setIsSubappalto(false); setNomeSubappaltatore('');
        setPersonale(1); setDurata(2); setUnitaDurata('ore'); setMasterId(''); // Reset
    };

    return (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
            {error && <p className="text-sm font-bold text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            
            {/* 🌟 SELECTOR VOCE MASTER */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-sm font-black text-indigo-900 mb-1 flex items-center gap-2"><StarIcon className="h-5 w-5 text-amber-500"/> Lavorazione Associata (Voce Master) *</label>
                <select value={masterId} onChange={(e) => setMasterId(e.target.value)} className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" disabled={!canWriteData}>
                    <option value="">-- Seleziona la Voce Master --</option>
                    {vociMaster?.map(m => <option key={m.id} value={m.id}>{m.codice} - {m.descrizione}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase di Lavoro (Tipologia)</label>
                <select value={selectedFase} onChange={(e) => setSelectedFase(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl focus:border-indigo-500 outline-none" disabled={!canWriteData}>
                    <option value="">Seleziona una fase...</option>
                    {FASI_URBANIZZAZIONE_LIST.map(fase => <option key={fase} value={fase}>{fase}</option>)}
                </select>
            </div>
            
            <hr />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{isSubappalto ? 'Personale Totale Prev.' : 'Personale Previsto'}</label><input type="number" min="1" value={personale} onChange={(e) => setPersonale(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Durata</label><input type="number" min="1" value={durata} onChange={(e) => setDurata(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unità</label><select value={unitaDurata} onChange={(e) => setUnitaDurata(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData}><option value="ore">Ore</option><option value="giorni">Giorni</option></select></div>
            </div>

            <div className="pt-2 border-t space-y-3">
                <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={isSubappalto} onChange={(e) => setIsSubappalto(e.target.checked)} disabled={!canWriteData} className="h-4 w-4 rounded text-indigo-600"/> Lavoro in Subappalto</label>
                {isSubappalto && (
                    <div className="animate-fade-in"><label className="block text-sm font-medium text-gray-700 mb-1">Nome Azienda Subappaltatrice</label><input type="text" value={nomeSubappaltatore} onChange={(e) => setNomeSubappaltatore(e.target.value)} placeholder="Es. Rossi Srl" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl" disabled={!canWriteData} /></div>
                )}
            </div>
            
            <div className="text-right">
                <button type="button" onClick={handleSubmit} disabled={!canWriteData} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 active:scale-95 transition-all">
                    <PlusIcon className="h-5 w-5" /> Aggiungi Fase
                </button>
            </div>
        </div>
    );
};