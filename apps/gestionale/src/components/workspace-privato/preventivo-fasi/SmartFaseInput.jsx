import React, { useState, useMemo } from 'react';
import { SparklesIcon, MagnifyingGlassIcon, BoltIcon } from '@heroicons/react/24/outline';
import { MasterCatalogSearchModal, getFullWbsPath } from './MasterCatalogTreeModal';

export const SmartFaseInput = ({ fase, onUpdateMeta, wbsNodes, aliasAziendali, onSaveAlias }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showCatalog, setShowCatalog] = useState(false);

    const suggestions = useMemo(() => {
        if (fase.titolo.length < 2 || fase.masterId) return [];
        const txt = fase.titolo.toLowerCase().trim();

        let results = [];
        const seenIds = new Set();

        const matchedAliases = aliasAziendali.filter(a => 
            a.testoDigitato.toLowerCase().includes(txt) || 
            txt.includes(a.testoDigitato.toLowerCase())
        );
        const aliasMasterIds = matchedAliases.map(a => a.masterId);

        wbsNodes.forEach(node => {
            if (aliasMasterIds.includes(node.id)) {
                results.push({ ...node, isAliasMatch: true });
                seenIds.add(node.id);
            }
        });

        wbsNodes.forEach(node => {
            if (!seenIds.has(node.id) && node.nome?.toLowerCase().includes(txt)) {
                results.push(node);
                seenIds.add(node.id);
            }
        });

        return results.slice(0, 5);
    }, [fase.titolo, fase.masterId, wbsNodes, aliasAziendali]);

    const eseguiCollegamentoMaster = (wbsNode, isFromCatalog = false) => {
        const masterIdCorretto = wbsNode.id;
        
        if (isFromCatalog && fase.titolo.length > 2) {
            const testoScritto = fase.titolo.trim();
            if (testoScritto.toLowerCase() !== wbsNode.nome.toLowerCase()) {
                onSaveAlias(testoScritto, masterIdCorretto);
            }
        }

        onUpdateMeta(fase.id, 'titolo', wbsNode.nome);
        onUpdateMeta(fase.id, 'selectedWbsBaseId', masterIdCorretto);
        onUpdateMeta(fase.id, 'masterId', masterIdCorretto);
        
        // Un piccolo delay visivo per sicurezza
        setTimeout(() => onUpdateMeta(fase.id, 'masterCodice', `WBS: ${wbsNode.nome}`), 50);
        
        setShowSuggestions(false);
        setShowCatalog(false);
    };

    // 🌟 IL FIX: Leggiamo "e.target.value" per evitare che React si dimentichi il testo!
    const handleBlur = (e) => {
        const testoAttuale = e.target.value; // Catturiamo il testo reale nell'istante del click

        setTimeout(() => {
            setShowSuggestions(false);
            
            // Se la voce non ha un master, e c'è del testo scritto...
            if (!fase.masterId && testoAttuale && testoAttuale.trim().length > 2) {
                const tempId = `TEMP-${Date.now()}`;
                
                // Facciamo UN SOLO aggiornamento per evitare la Race Condition di React!
                onUpdateMeta(fase.id, 'masterId', tempId);
            }
        }, 300);
    };

    return (
        <div className="relative w-full md:w-[350px] xl:w-[450px]">
            <input 
                type="text" 
                placeholder="Esempio: Taglio prato..." 
                value={fase.titolo} 
                onChange={(e) => {
                    onUpdateMeta(fase.id, 'titolo', e.target.value);
                    if(fase.masterId) onUpdateMeta(fase.id, 'masterId', null);
                    if(e.target.value.length > 2) setShowSuggestions(true);
                }} 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(!fase.masterId && fase.titolo.length > 2) setShowSuggestions(true); 
                }}
                onBlur={handleBlur} 
                onKeyDown={(e) => {
                    // Se l'utente preme Invio, togliamo il focus forzando il salvataggio
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                    }
                }}
                className="w-full border-none focus:ring-0 font-black text-lg p-0 placeholder:text-slate-300 bg-transparent outline-none" 
            />
            
            {showSuggestions && !fase.masterId && (
                <div className="absolute z-[999] top-[100%] left-0 mt-2 w-[400px] md:w-[500px] bg-white border border-indigo-200 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-down">
                    <div className="p-2 bg-indigo-50 border-b border-indigo-100 text-[10px] font-black text-indigo-800 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1"><SparklesIcon className="h-3 w-3" /> Corrispondenze Universali</span>
                    </div>
                    
                    <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                        {suggestions.map(node => (
                            <li 
                                key={node.id} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    eseguiCollegamentoMaster(node, false); 
                                }} 
                                className={`p-4 cursor-pointer transition-colors ${node.isAliasMatch ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-indigo-50'}`}
                            >
                                <p className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">{getFullWbsPath(node.parentId, wbsNodes)}</p>
                                <p className="text-sm font-black text-slate-800">{node.nome}</p>
                                {node.isAliasMatch && (
                                    <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
                                        <BoltIcon className="h-3 w-3"/> Imparato dalle tue scelte
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="bg-slate-50 p-3 border-t border-slate-100">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setShowCatalog(true); 
                                setShowSuggestions(false); 
                            }} 
                            className="w-full py-3 bg-white border border-slate-200 text-indigo-600 text-xs font-black uppercase rounded-xl hover:bg-indigo-50 shadow-sm flex items-center justify-center gap-2 transition-all"
                        >
                            <MagnifyingGlassIcon className="h-5 w-5" /> Ricerca Avanzata nel Catalogo
                        </button>
                    </div>
                </div>
            )}

            <MasterCatalogSearchModal 
                isOpen={showCatalog} 
                onClose={() => setShowCatalog(false)} 
                wbsNodes={wbsNodes} 
                onSelect={(item) => eseguiCollegamentoMaster(item, true)} 
            />
        </div>
    );
};