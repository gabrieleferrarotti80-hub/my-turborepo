import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFirebaseData } from 'shared-core';

export const SmartResourceSelector = ({ tipoArticolo = 'nolo', value, onChange, placeholder = "Inizia a scrivere..." }) => {
    const { data } = useFirebaseData();
    const catalogo = Array.isArray(data?.catalogo_risorse) ? data.catalogo_risorse : [];
    
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // 1. Appiattiamo il dizionario in una lista di suggerimenti facili da leggere
    const suggestions = useMemo(() => {
        const list = [];
        const filtrati = catalogo.filter(c => c.tipoArticolo === tipoArticolo);
        
        filtrati.forEach(cat => {
            if (cat.voci && cat.voci.length > 0) {
                cat.voci.forEach(voce => {
                    list.push({
                        testo: `${cat.famiglia} ${voce}`.trim(),
                        macroCategoria: cat.macroCategoria,
                        famiglia: cat.famiglia,
                        specifica: voce
                    });
                });
            } else {
                list.push({
                    testo: cat.famiglia,
                    macroCategoria: cat.macroCategoria,
                    famiglia: cat.famiglia,
                    specifica: ''
                });
            }
        });
        return list;
    }, [catalogo, tipoArticolo]);

    // 2. Filtriamo i suggerimenti in base a quello che l'utente sta scrivendo
    const filteredSuggestions = useMemo(() => {
        if (!value) return suggestions;
        const lowerVal = value.toLowerCase();
        return suggestions.filter(s => s.testo.toLowerCase().includes(lowerVal));
    }, [value, suggestions]);

    // 3. Chiude il menu a tendina se si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Quando l'utente clicca su un suggerimento
    const handleSelect = (item) => {
        // Passiamo sia il testo puro, sia i metadati (per il futuro comparatore prezzi)
        onChange(item.testo, item); 
        setIsOpen(false);
    };

    // Quando l'utente scrive liberamente sulla tastiera
    const handleChange = (e) => {
        const val = e.target.value;
        // Passiamo il testo libero. Metadata è null perché è una voce manuale
        onChange(val, null); 
        setIsOpen(true);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 p-2.5 font-medium text-gray-800"
            />
            
            {/* Il menu a tendina appare SOLO se ci sono suggerimenti compatibili e l'utente sta scrivendo */}
            {isOpen && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((item, idx) => (
                        <li 
                            key={idx} 
                            onClick={() => handleSelect(item)}
                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors flex flex-col"
                        >
                            <span className="font-bold text-gray-800">{item.testo}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{item.macroCategoria}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};