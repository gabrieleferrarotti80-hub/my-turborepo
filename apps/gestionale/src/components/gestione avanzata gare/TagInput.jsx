import React, { useState, useMemo } from 'react';
import { HashtagIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

export const TagInput = ({ tags = [], setTags, allListinoItems = [] }) => {
    const [inputValue, setInputValue] = useState('');

    const TAG_PREDEFINITI = [
        'Opere a verde', 'Manutenzione', 'Taglio erba', 'Mulching', 
        'Potatura', 'Piantumazione', 'Movimento terra', 'Meccanizzato', 'Manuale'
    ];

    const suggestedTags = useMemo(() => {
        let potentialTags = {};

        TAG_PREDEFINITI.forEach(t => {
            if (!tags.includes(t)) potentialTags[t] = 0.5; 
        });

        if (inputValue.trim()) {
            const searchLower = inputValue.toLowerCase().trim();
            allListinoItems.forEach(item => {
                (item.tags || []).forEach(t => {
                    if (t.toLowerCase().includes(searchLower) && !tags.includes(t)) {
                        potentialTags[t] = (potentialTags[t] || 0) + 1;
                    }
                });
            });
        } else if (tags.length > 0) {
            allListinoItems.forEach(item => {
                const itemTags = item.tags || [];
                if (itemTags.some(t => tags.includes(t))) {
                    itemTags.forEach(t => {
                        if (!tags.includes(t)) {
                            potentialTags[t] = (potentialTags[t] || 0) + 1;
                        }
                    });
                }
            });
        } else {
            allListinoItems.forEach(item => {
                (item.tags || []).forEach(t => {
                    if (!tags.includes(t)) {
                        potentialTags[t] = (potentialTags[t] || 0) + 1;
                    }
                });
            });
        }

        return Object.entries(potentialTags)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0])
            .slice(0, 8);
    }, [inputValue, tags, allListinoItems]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        }
    };

    const addTag = (newTag) => {
        const cleanTag = newTag.trim();
        const formattedTag = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
        if (formattedTag && !tags.includes(formattedTag)) {
            setTags([...tags, formattedTag]);
        }
        setInputValue('');
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                {tags.map((tag, idx) => (
                    <span key={idx} className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1 border border-indigo-200 shadow-sm animate-fade-in-up">
                        <HashtagIcon className="h-3 w-3" /> {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-indigo-400 hover:text-red-500 transition-colors"><XMarkIcon className="h-3 w-3"/></button>
                    </span>
                ))}
                {tags.length === 0 && <span className="text-[10px] text-slate-400 italic flex items-center">Nessun tag inserito...</span>}
            </div>
            
            <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder="Scrivi un tag libero e premi Invio..." 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
            />
            
            {suggestedTags.length > 0 && (
                <div className="mt-3 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                    <span className="text-[9px] font-black text-indigo-400 uppercase flex items-center gap-1 mb-2">
                        <SparklesIcon className="h-3 w-3 text-amber-400" /> Suggeriti per te (Clicca per aggiungere):
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                        {suggestedTags.map((sugTag, idx) => (
                            <button 
                                key={idx} 
                                type="button"
                                onClick={() => addTag(sugTag)}
                                className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-md transition-all shadow-sm flex items-center gap-1 active:scale-95"
                            >
                                <HashtagIcon className="h-3 w-3 opacity-50" /> {sugTag}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};