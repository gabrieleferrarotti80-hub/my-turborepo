import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

export const SmartDescrizioneInput = ({ riga, listinoDb, onUpdateMultiple }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    const handleChange = (e) => {
        const val = e.target.value;
        onUpdateMultiple(riga.id, { descrizione: val });
        
        if (val.length > 2) {
            const matches = listinoDb.filter(l => 
                l.descrizione?.toLowerCase().includes(val.toLowerCase()) || 
                l.codice?.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 6);
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (item) => {
        onUpdateMultiple(riga.id, {
            masterId: item.isMaster ? item.id : (item.masterId || item.id), 
            codice: item.codice,
            unitaMisura: item.unitaMisura || riga.unitaMisura,
        });
        setShowSuggestions(false);
    };

    return (
        <div className="relative w-full">
            <textarea 
                value={riga.descrizione} 
                onChange={handleChange} 
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="text-xs font-bold text-slate-800 w-full bg-transparent border-0 resize-none outline-none focus:border-indigo-500" 
                rows={2}
                placeholder="Es. Rasatura Prato..."
            />
            {showSuggestions && (
                <div className="absolute z-[999] top-[100%] left-0 mt-1 w-[300px] md:w-[400px] bg-white border border-indigo-200 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
                    <div className="p-2 bg-indigo-50 border-b border-indigo-100 text-[10px] font-black text-indigo-800 uppercase flex items-center gap-1">
                        <SparklesIcon className="h-3 w-3" /> Voci Master Suggerite
                    </div>
                    <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {suggestions.map(s => (
                            <li key={s.id} onClick={() => handleSelect(s)} className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{s.codice}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{s.unitaMisura}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-700 line-clamp-2">{s.descrizione}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};