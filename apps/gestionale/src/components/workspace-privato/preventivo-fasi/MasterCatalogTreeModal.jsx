import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, BookOpenIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

// Helper per ricostruire il percorso (es. Verde > Manutenzione > Sfalcio)
export const getFullWbsPath = (nodeId, allNodes) => {
    if (!nodeId) return '';
    const path = [];
    let curr = allNodes.find(n => n.id === nodeId);
    while (curr) {
        path.unshift(curr.nome);
        curr = allNodes.find(n => n.id === curr.parentId);
    }
    return path.join(' > ');
};

export const MasterCatalogSearchModal = ({ isOpen, onClose, wbsNodes, onSelect }) => {
    const [search, setSearch] = useState('');

    // Filtra i nodi in base alla ricerca. Se non c'è ricerca, mostra tutto (o limite i primi 50 per performance)
    const displayNodes = useMemo(() => {
        if (!search.trim()) return wbsNodes.slice(0, 50); // Mostra un'anteprima
        
        const term = search.toLowerCase();
        return wbsNodes.filter(n => {
            const fullPath = getFullWbsPath(n.id, wbsNodes).toLowerCase();
            return n.nome?.toLowerCase().includes(term) || fullPath.includes(term);
        });
    }, [search, wbsNodes]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
                
                {/* Header compatto */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500 p-2 rounded-xl"><BookOpenIcon className="h-6 w-6"/></div>
                        <div>
                            <h3 className="font-black text-xl">Ricerca Universale Lavorazioni</h3>
                            <p className="text-xs font-medium text-indigo-200 mt-0.5">La quantità e l'U.M. verranno specificate direttamente nel preventivo.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors shadow-sm"><XMarkIcon className="h-6 w-6"/></button>
                </div>

                {/* Super Search Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca lavorazione (es. Mulching, Tinteggiatura, Posa...)" 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            autoFocus
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none font-black text-slate-800 text-lg transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Lista Risultati Piatta */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
                    {displayNodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10">
                            <DocumentTextIcon className="h-16 w-16 mb-4 opacity-20" />
                            <p className="font-bold text-lg text-slate-500">Nessuna lavorazione trovata per "{search}"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {displayNodes.map(node => (
                                <div 
                                    key={node.id} 
                                    onClick={() => onSelect(node)}
                                    className="bg-white border border-slate-200 hover:border-indigo-500 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:shadow-md group"
                                >
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                            {getFullWbsPath(node.parentId, wbsNodes)}
                                        </p>
                                        <span className="font-black text-lg text-slate-800 group-hover:text-indigo-700 transition-colors">
                                            {node.nome}
                                        </span>
                                    </div>
                                    
                                    <button className="text-xs font-black bg-slate-50 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shrink-0">
                                        <CheckCircleIcon className="h-5 w-5" /> Seleziona
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};