import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
    XMarkIcon, FolderIcon, PlusIcon, DocumentTextIcon, 
    BanknotesIcon, ScaleIcon, TagIcon, ArchiveBoxIcon,
    ChevronRightIcon, ChevronDownIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';

// Funzione helper per generare in automatico il nome dello scaglione
const autoGenerateRangeName = (min, max) => {
    const hasMin = min !== '' && min !== null && min !== undefined;
    const hasMax = max !== '' && max !== null && max !== undefined;
    if (hasMin && hasMax) return `${min} - ${max}`;
    if (hasMin && !hasMax) return `> ${min}`;
    if (!hasMin && hasMax) return `< ${max}`;
    return 'Scaglione Libero';
};

export const VoceListinoForm = ({ 
    isOpen, onClose, onSave, editingId, formData, setFormData, 
    wbsNodes, onAddWbsNode, handleChange 
}) => {
    const { db, userAziendaId } = useFirebaseData();
    const effectiveCompanyId = userAziendaId || 'GLOBAL_MASTER';

    // Stati per l'albero inline e la creazione rapida
    const [expanded, setExpanded] = useState({});
    const [addingTo, setAddingTo] = useState(null); // { id: 'root' | node.id, type: 'folder' | 'range' }
    const [newNodeName, setNewNodeName] = useState('');
    const [newMin, setNewMin] = useState('');
    const [newMax, setNewMax] = useState('');

    // Espande automaticamente il percorso del nodo attualmente selezionato all'apertura
    useEffect(() => {
        if (isOpen && formData.wbsNodeId) {
            let current = wbsNodes.find(n => n.id === formData.wbsNodeId);
            const toExpand = {};
            while (current && current.parentId) {
                toExpand[current.parentId] = true;
                current = wbsNodes.find(n => n.id === current.parentId);
            }
            setExpanded(prev => ({ ...prev, ...toExpand }));
        }
    }, [isOpen, formData.wbsNodeId, wbsNodes]);

    // Reset degli stati quando si chiude il form
    useEffect(() => {
        if (!isOpen) {
            setAddingTo(null);
            setNewNodeName('');
            setNewMin('');
            setNewMax('');
        }
    }, [isOpen]);

    // Funzione per aggiungere un nodo (Cartella o Scaglione) direttamente dal form
    const handleQuickAdd = async (parentId) => {
        const isRange = addingTo.type === 'range';
        let finalName = newNodeName.trim();
        const minVal = isRange && newMin !== '' ? Number(newMin) : null;
        const maxVal = isRange && newMax !== '' ? Number(newMax) : null;

        if (isRange && !finalName) {
            finalName = autoGenerateRangeName(newMin, newMax);
        }

        if (!finalName) {
            alert("Inserisci un nome o i valori dello scaglione.");
            return;
        }

        const cleanParent = parentId === 'root' ? null : parentId;

        const payload = {
            companyID: effectiveCompanyId,
            nome: finalName,
            parentId: cleanParent,
            isRange,
            min: minVal,
            max: maxVal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        try {
            // Creiamo il nodo nel database in tempo reale
            const docRef = await addDoc(collection(db, 'wbs_nodes'), payload);
            
            // Lo selezioniamo in automatico per questa Lavorazione
            setFormData(prev => ({ ...prev, wbsNodeId: docRef.id }));
            
            // Ripuliamo gli stati di inserimento
            setAddingTo(null);
            setNewNodeName('');
            setNewMin('');
            setNewMax('');
            
            if (cleanParent) {
                setExpanded(prev => ({ ...prev, [cleanParent]: true }));
            }
        } catch (error) {
            console.error("Errore salvataggio rapido WBS:", error);
            alert("Errore durante la creazione del percorso.");
        }
    };

    // Funzione ricorsiva per l'albero integrato
    const renderTree = (parentId = null, level = 0) => {
        const children = wbsNodes
            .filter(n => parentId === null ? (!n.parentId || n.parentId === "") : n.parentId === parentId)
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

        return (
            <div className="flex flex-col w-full">
                {children.map(node => {
                    const isSelected = formData.wbsNodeId === node.id;
                    const hasChildren = wbsNodes.some(n => n.parentId === node.id);
                    const isExp = expanded[node.id];

                    return (
                        <div key={node.id} className={`flex flex-col w-full ${level > 0 ? 'ml-4 border-l border-slate-200 pl-2' : ''}`}>
                            
                            {/* RIGA DEL NODO */}
                            <div 
                                className={`flex items-center gap-2 p-2 mt-1 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-100 border border-indigo-300 shadow-sm' : 'hover:bg-slate-100 border border-transparent'}`} 
                                onClick={() => setFormData(prev => ({ ...prev, wbsNodeId: node.id }))}
                            >
                                {/* Bottone Espansione */}
                                {hasChildren ? (
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setExpanded(p => ({...p, [node.id]: !p[node.id]})) }} 
                                        className="p-1 text-slate-500 hover:bg-slate-200 rounded transition-colors"
                                    >
                                        {isExp ? <ChevronDownIcon className="h-4 w-4 stroke-2"/> : <ChevronRightIcon className="h-4 w-4 stroke-2"/>}
                                    </button>
                                ) : <div className="w-6 shrink-0"/>}

                                {/* Icona Tipologia */}
                                {node.isRange ? <ScaleIcon className="h-4 w-4 text-emerald-500 shrink-0"/> : <FolderIcon className="h-4 w-4 text-indigo-500 shrink-0"/>}
                                
                                {/* Nome Nodo */}
                                <span className={`flex-1 text-sm truncate select-none ${isSelected ? 'font-black text-indigo-900' : 'font-bold text-slate-700'}`}>
                                    {node.nome}
                                </span>

                                {/* Bottoni "+ Cartella" e "+ Scaglione" Inline */}
                                {!node.isRange && (
                                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                        <button 
                                            type="button" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setAddingTo({ id: node.id, type: 'folder' }); 
                                                setNewNodeName(''); setNewMin(''); setNewMax('');
                                                if (!isExp) setExpanded(p => ({...p, [node.id]: true})); 
                                            }} 
                                            className="p-1 text-indigo-600 hover:bg-indigo-100 rounded flex items-center gap-1 text-[10px] font-bold" 
                                            title="Crea Sottocartella"
                                        >
                                            <PlusIcon className="h-3 w-3 stroke-2"/> Cartella
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setAddingTo({ id: node.id, type: 'range' }); 
                                                setNewNodeName(''); setNewMin(''); setNewMax('');
                                                if (!isExp) setExpanded(p => ({...p, [node.id]: true})); 
                                            }} 
                                            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded flex items-center gap-1 text-[10px] font-bold" 
                                            title="Crea Scaglione"
                                        >
                                            <PlusIcon className="h-3 w-3 stroke-2"/> Scaglione
                                        </button>
                                    </div>
                                )}
                                
                                {/* Spunta di Selezione */}
                                {isSelected && <CheckCircleIcon className="h-5 w-5 text-indigo-600 shrink-0"/>}
                            </div>
                            
                            {/* INPUT INLINE PER LA CREAZIONE */}
                            {addingTo?.id === node.id && (
                                <div className={`ml-8 mt-2 mb-2 p-3 border rounded-xl mr-2 flex flex-col gap-2 shadow-sm ${addingTo.type === 'range' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-indigo-50/50 border-indigo-200'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${addingTo.type === 'range' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                                        {addingTo.type === 'range' ? 'Nuovo Scaglione Quantità' : 'Nuova Sottocartella'}
                                    </span>
                                    
                                    {addingTo.type === 'folder' ? (
                                        <input 
                                            type="text" autoFocus value={newNodeName} onChange={e => setNewNodeName(e.target.value)} 
                                            className="w-full p-2 text-sm font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="Es. Manutenzione Straordinaria" 
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(node.id); } else if (e.key === 'Escape') setAddingTo(null); }} 
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" step="any" autoFocus value={newMin} onChange={e => setNewMin(e.target.value)} 
                                                className="flex-1 p-2 text-sm font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
                                                placeholder="Min (Da)" 
                                            />
                                            <span className="text-slate-400 font-bold">-</span>
                                            <input 
                                                type="number" step="any" value={newMax} onChange={e => setNewMax(e.target.value)} 
                                                className="flex-1 p-2 text-sm font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
                                                placeholder="Max (A)" 
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(node.id); } else if (e.key === 'Escape') setAddingTo(null); }} 
                                            />
                                        </div>
                                    )}
                                    <div className="flex gap-2 justify-end mt-1">
                                        <button type="button" onClick={() => setAddingTo(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Annulla</button>
                                        <button type="button" onClick={() => handleQuickAdd(node.id)} className={`px-4 py-1.5 text-xs font-black text-white rounded-lg shadow-sm ${addingTo.type === 'range' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Salva Elemento</button>
                                    </div>
                                </div>
                            )}

                            {/* Figli */}
                            {isExp && renderTree(node.id, level + 1)}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-fade-in">
            <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-fade-in-up max-h-[90vh]">
                
                {/* HEADER MODALE */}
                <div className="bg-indigo-50 p-6 md:p-8 flex justify-between items-center border-b border-indigo-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm">
                            <DocumentTextIcon className="h-7 w-7 stroke-2"/>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-indigo-900">
                                {editingId ? 'Modifica Lavorazione' : 'Nuova Lavorazione Master'}
                            </h2>
                            <p className="text-xs md:text-sm font-bold text-indigo-600 mt-1">
                                Definisci le specifiche, il prezzo base e posizionala nell'albero WBS.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shadow-sm border border-indigo-100">
                        <XMarkIcon className="h-6 w-6 stroke-2" />
                    </button>
                </div>

                {/* FORM CORPO */}
                <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    
                    {/* ZONA WBS (Albero Navigabile Inline) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
                        <div className="flex justify-between items-center px-1 mb-1">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                <FolderIcon className="h-4 w-4 stroke-2"/> Posizione nell'Albero WBS
                            </label>
                            <button type="button" onClick={() => { setAddingTo({ id: 'root', type: 'folder' }); setNewNodeName(''); }} className="text-[10px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
                                <PlusIcon className="h-3 w-3 stroke-2"/> Nuova Cartella Radice
                            </button>
                        </div>

                        {/* INPUT CREAZIONE RADICE */}
                        {addingTo?.id === 'root' && (
                            <div className="p-3 mb-2 bg-indigo-50/50 border border-indigo-200 rounded-xl flex flex-col gap-2 shadow-sm">
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Nuova Categoria Principale</span>
                                <input 
                                    type="text" autoFocus value={newNodeName} onChange={e => setNewNodeName(e.target.value)} 
                                    className="w-full p-2.5 text-sm font-bold border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                    placeholder="Es. Opere Edili..." 
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd('root'); } else if (e.key === 'Escape') setAddingTo(null); }} 
                                />
                                <div className="flex gap-2 justify-end mt-1">
                                    <button type="button" onClick={() => setAddingTo(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Annulla</button>
                                    <button type="button" onClick={() => handleQuickAdd('root')} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 shadow-sm">Salva Categoria</button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-xl p-2 max-h-64 overflow-y-auto shadow-inner">
                            {wbsNodes.length === 0 && addingTo?.id !== 'root' ? (
                                <div className="text-center py-6">
                                    <FolderIcon className="h-10 w-10 text-slate-300 mx-auto mb-2"/>
                                    <p className="text-sm text-slate-500 font-medium">L'albero è vuoto. Clicca su "Nuova Cartella Radice" per iniziare.</p>
                                </div>
                            ) : (
                                renderTree(null, 0)
                            )}
                        </div>
                    </div>

                    {/* DATI PRINCIPALI (Codice e Prezzo) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                <TagIcon className="h-4 w-4 stroke-2"/> Codice Master
                            </label>
                            <input 
                                type="text" 
                                name="codice" 
                                value={formData.codice} 
                                onChange={handleChange} 
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Costo Storico (Valore Base Euro)
                            </label>
                            <div className="relative">
                                <BanknotesIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
                                <input 
                                    type="number" 
                                    step="any"
                                    name="prezzoUnitario" 
                                    value={formData.prezzoUnitario} 
                                    onChange={handleChange} 
                                    className="w-full pl-12 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-black text-emerald-800 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* DESCRIZIONE COMPLETA */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Descrizione Lavorazione
                        </label>
                        <textarea 
                            name="descrizione" 
                            value={formData.descrizione} 
                            onChange={handleChange} 
                            required
                            rows="4"
                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner leading-relaxed"
                            placeholder="Inserisci la descrizione dettagliata del master..."
                        />
                    </div>

                    {/* SPECIFICHE UNITÀ DI MISURA (E quantità Master legacy) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                                <ArchiveBoxIcon className="h-4 w-4 stroke-2"/> U.M.
                            </label>
                            <input 
                                type="text" 
                                name="unitaMisura" 
                                value={formData.unitaMisura} 
                                onChange={handleChange} 
                                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-800 uppercase outline-none focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 transition-all shadow-sm" 
                                placeholder="Es. MQ"
                            />
                        </div>
                        {/* Lasciamo questi campi per retrocompatibilità qualora si volesse forzare il range sul master anziché sulla cartella */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Range Master (Min)
                            </label>
                            <input 
                                type="number" 
                                step="any"
                                name="quantitaMin" 
                                value={formData.quantitaMin || ''} 
                                onChange={handleChange} 
                                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 transition-all shadow-sm" 
                                placeholder="Opzionale"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Range Master (Max)
                            </label>
                            <input 
                                type="number" 
                                step="any"
                                name="quantitaMax" 
                                value={formData.quantitaMax || ''} 
                                onChange={handleChange} 
                                className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 transition-all shadow-sm" 
                                placeholder="Opzionale"
                            />
                        </div>
                    </div>

                    {/* BOTTONI INFERIORI */}
                    <div className="pt-2 flex flex-col-reverse sm:flex-row gap-4 justify-end">
                        <button type="button" onClick={onClose} className="px-6 py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors w-full sm:w-auto text-center">
                            Annulla
                        </button>
                        <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2 w-full sm:w-auto">
                            <CheckCircleIcon className="h-5 w-5 stroke-2"/> {editingId ? 'Aggiorna Master' : 'Salva nel Dizionario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};