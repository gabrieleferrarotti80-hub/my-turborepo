import React, { useState, useMemo } from 'react';
import { XMarkIcon, LinkIcon, FolderIcon, FolderOpenIcon, ChevronRightIcon, CheckBadgeIcon, HomeIcon, PlusCircleIcon, PencilSquareIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

// --- MOTORE NLP (NATURAL LANGUAGE PROCESSING) LIGHT ---
const STOP_WORDS = new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ma', 'se', 'che', 'non', 
    'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 
    'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 
    'fornitura', 'posa', 'opera', 'compreso', 'escluso', 'mq', 'mc', 'kg', 'cad', 'cm', 'mm', 'fino', 'oltre'
]);

const tokenize = (text) => {
    if (!text) return [];
    return text.toLowerCase()
        .replace(/[^a-z0-9àèéìòù]/g, ' ') // Sostituisce la punteggiatura con spazi
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word)); // Rimuove parole corte e stop-words
};

const calculateSimilarity = (targetText, masterText) => {
    const targetTokens = tokenize(targetText);
    const masterTokens = tokenize(masterText);
    
    if (masterTokens.length === 0 || targetTokens.length === 0) return 0;

    let matches = 0;
    masterTokens.forEach(mToken => {
        if (targetTokens.includes(mToken)) matches++;
    });

    return (matches / masterTokens.length) * 100; 
};
// --------------------------------------------------------

export const MasterLinkModal = ({ mappingItem, onClose, handleLinkMaster, handleLinkNodeAndEdit, handleCreateAndLinkMaster, wbsNodes, vociMasterDB }) => {
    
    const [currentFolderId, setCurrentFolderId] = useState(null);

    // --- LOGICA SUGGERITORE INTELLIGENTE (Ora dichiarato PRIMA del return null) ---
    const suggestedMasters = useMemo(() => {
        // Aggiunto controllo di sicurezza su mappingItem
        if (!mappingItem || !mappingItem.descrizione || vociMasterDB.length === 0) return [];
        
        const scoredMasters = vociMasterDB.map(master => {
            const textToMatch = `${master.descrizione} ${master.codice}`;
            const score = calculateSimilarity(mappingItem.descrizione, textToMatch);
            return { ...master, matchScore: score };
        });

        return scoredMasters
            .filter(m => m.matchScore > 40)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3);
    }, [mappingItem, vociMasterDB]);

    // ORA possiamo fare l'uscita anticipata in totale sicurezza!
    if (!mappingItem) return null;

    const getPathForNode = (nodeId) => {
        if (!nodeId) return 'Albero Principale';
        const path = [];
        let curr = wbsNodes.find(n => n.id === nodeId);
        let safeCounter = 0;
        while (curr && safeCounter < 10) {
            path.unshift(curr.nome);
            curr = wbsNodes.find(n => n.id === curr.parentId);
            safeCounter++;
        }
        return path.join(' > ');
    };

    const getBreadcrumbObjects = () => {
        const path = [];
        let curr = wbsNodes.find(n => n.id === currentFolderId);
        let safeCounter = 0;
        while (curr && safeCounter < 10) {
            path.unshift(curr);
            curr = wbsNodes.find(n => n.id === curr.parentId);
            safeCounter++;
        }
        return path;
    };
    
    const breadcrumbs = getBreadcrumbObjects();
    const currentFolder = wbsNodes.find(n => n.id === currentFolderId);
    const subFolders = wbsNodes.filter(n => n.parentId === currentFolderId);
    const masterItemsInFolder = vociMasterDB.filter(master => master.wbsNodeId === currentFolderId);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-down">
                
                <div className="p-6 border-b border-slate-100 bg-slate-800 text-white shrink-0 relative overflow-y-auto max-h-[30vh]">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                    <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Normalizzazione WBS e Dati</h3>
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-slate-700 text-white text-xs font-black px-2 py-1 rounded border border-slate-600">{mappingItem.codice}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">{mappingItem.nomeListino}</span>
                            </div>
                            <p className="text-base font-medium leading-relaxed text-slate-200">{mappingItem.descrizione}</p>
                        </div>
                        <div className="text-right shrink-0 bg-slate-900 p-4 rounded-xl border border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{mappingItem.unitaMisura}</p>
                            <p className="text-2xl font-black text-emerald-400">€ {mappingItem.prezzoUnitario.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 shadow-inner">
                    <button onClick={() => setCurrentFolderId(null)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black transition-colors ${currentFolderId === null ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <HomeIcon className="h-4 w-4" /> Albero Principale
                    </button>
                    {breadcrumbs.map((crumb) => (
                        <React.Fragment key={crumb.id}>
                            <ChevronRightIcon className="h-4 w-4 text-slate-400 shrink-0" />
                            <button onClick={() => setCurrentFolderId(crumb.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black transition-colors whitespace-nowrap ${currentFolderId === crumb.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                                {crumb.nome}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1 flex overflow-hidden bg-slate-50">
                    
                    <div className="w-1/4 border-r border-slate-200 bg-white overflow-y-auto flex flex-col min-w-[250px]">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 sticky top-0"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Esplora Rami (WBS)</span></div>
                        <div className="p-3 space-y-2 flex-1">
                            {subFolders.length === 0 ? (
                                <div className="text-center p-6 text-slate-400"><FolderIcon className="h-10 w-10 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">Nessun sottoramo qui.</p></div>
                            ) : (
                                subFolders.map(folder => (
                                    <button key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md transition-all">
                                        <span className="flex items-center gap-3"><FolderOpenIcon className="h-5 w-5 text-indigo-400"/> {folder.nome}</span>
                                        <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="w-3/4 bg-slate-100 overflow-y-auto relative flex flex-col">
                        
                        {suggestedMasters.length > 0 && (
                            <div className="p-4 bg-amber-50/50 border-b border-amber-200 shrink-0">
                                <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-widest mb-3 flex items-center gap-1.5">
                                    <SparklesIcon className="h-4 w-4" /> Suggerimenti Intelligenti (Auto-Mappatura)
                                </h4>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {suggestedMasters.map(master => (
                                        <div key={master.id} className="bg-white border-2 border-amber-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-[10px] font-black text-amber-800 flex items-center gap-1 bg-amber-100 px-2 py-1 rounded border border-amber-200"><StarIconSolid className="h-3 w-3 text-amber-500"/> {master.codice}</span>
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Match: {Math.round(master.matchScore)}%</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-800 leading-relaxed mb-3 line-clamp-3" title={master.descrizione}>{master.descrizione}</p>
                                                
                                                <div className="mb-4">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Trovata nel ramo:</p>
                                                    <p className="text-xs font-black text-indigo-600 flex items-center gap-1"><FolderIcon className="h-3.5 w-3.5"/> {getPathForNode(master.wbsNodeId)}</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => handleLinkMaster(mappingItem.id, master.id)} className="w-full py-2.5 mt-auto bg-amber-50 text-amber-700 border border-amber-300 text-sm font-black rounded-xl transition-all flex justify-center items-center gap-2 hover:bg-amber-500 hover:text-white hover:border-amber-600 shadow-sm active:scale-95">
                                                <CheckBadgeIcon className="h-5 w-5" /> Mappa a questo Suggerimento
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-white border-b border-slate-200 sticky top-0 shadow-sm z-10 shrink-0 flex gap-4">
                            {currentFolderId ? (
                                <>
                                    <button type="button" onClick={() => handleLinkNodeAndEdit(mappingItem, currentFolderId)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-indigo-500/30 active:scale-95">
                                        <PencilSquareIcon className="h-5 w-5" /> Classifica in WBS e Modifica Voce
                                    </button>
                                    <button type="button" onClick={() => handleCreateAndLinkMaster(mappingItem, currentFolderId)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-emerald-500/30 active:scale-95">
                                        <PlusCircleIcon className="h-5 w-5" /> Genera Master da questa Voce
                                    </button>
                                </>
                            ) : (
                                <div className="w-full py-3 bg-slate-50 text-slate-400 text-sm font-black rounded-xl border-2 border-dashed border-slate-300 flex justify-center items-center">
                                    Seleziona un Ramo a sinistra per le azioni rapide
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex-1">
                            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-widest block mb-4">Voci Master in: {currentFolder ? currentFolder.nome : 'Nessuna cartella'}</span>
                            
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 content-start">
                                {currentFolderId === null ? (
                                    <div className="col-span-full text-center p-12 text-slate-400"><FolderOpenIcon className="h-16 w-16 mx-auto mb-4 opacity-20" /><p className="text-sm font-medium">Esplora le cartelle o usa un suggerimento in alto.</p></div>
                                ) : masterItemsInFolder.length === 0 ? (
                                    <div className="col-span-full text-center p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-white">
                                        <p className="text-sm font-bold text-slate-500 mb-2">Nessuna voce Master in questo livello.</p>
                                    </div>
                                ) : (
                                    masterItemsInFolder.map(master => (
                                        <div key={master.id} className="bg-white border border-slate-200 p-4 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between group">
                                            <div>
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-[10px] font-black text-slate-600 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200"><StarIconSolid className="h-3 w-3 text-amber-500"/> {master.codice}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{master.unitaMisura}</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-800 leading-relaxed mb-4">{master.descrizione}</p>
                                                
                                                {(master.quantitaMin !== null || master.quantitaMax !== null) && (
                                                    <div className="mb-4"><span className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded-md shadow-sm">📦 Q.tà: {master.quantitaMin ?? 0} ➔ {master.quantitaMax ?? '∞'}</span></div>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => handleLinkMaster(mappingItem.id, master.id)} className="w-full py-2.5 mt-auto bg-slate-50 text-indigo-600 border border-slate-200 text-sm font-black rounded-xl transition-all flex justify-center items-center gap-2 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-700 shadow-sm active:scale-95">
                                                <CheckBadgeIcon className="h-5 w-5" /> Mappa a questa Master
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};