import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
    XMarkIcon, FolderIcon, PlusIcon, TrashIcon, PencilIcon, 
    ChevronRightIcon, ChevronDownIcon, CheckIcon, ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { ScaleIcon } from '@heroicons/react/24/solid';

// Generatore automatico per i nomi degli scaglioni
const generateRangeName = (min, max) => {
    const hasMin = min !== '' && min !== null && min !== undefined;
    const hasMax = max !== '' && max !== null && max !== undefined;
    if (hasMin && hasMax) return `${min} - ${max}`;
    if (hasMin && !hasMax) return `> ${min}`;
    if (!hasMin && hasMax) return `< ${max}`;
    return 'Scaglione Libero';
};

export const WbsManagerModal = ({ isOpen, onClose, onSelect }) => {
    const { db, userAziendaId } = useFirebaseData();
    const effectiveCompanyId = userAziendaId || 'GLOBAL_MASTER';

    const [nodes, setNodes] = useState([]);
    const [expanded, setExpanded] = useState({});
    
    // Stati del Form
    const [showForm, setShowForm] = useState(false);
    const [formParentId, setFormParentId] = useState(null);
    const [formType, setFormType] = useState('folder'); // 'folder' | 'range'
    const [formData, setFormData] = useState({ nome: '', min: '', max: '' });
    const [editingId, setEditingId] = useState(null);

    // Fetch Dati
    useEffect(() => {
        if (!isOpen || !db) return;
        const q = query(collection(db, 'wbs_nodes')); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setNodes(data);
        });
        return () => unsubscribe();
    }, [isOpen, db]);

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Apre il form specificando se stiamo creando una Cartella o uno Scaglione, e in quale punto dell'albero
    const openForm = (parentId = null, type = 'folder', editData = null) => {
        setFormParentId(parentId);
        setFormType(type);
        if (editData) {
            setEditingId(editData.id);
            setFormData({ nome: editData.nome || '', min: editData.min ?? '', max: editData.max ?? '' });
        } else {
            setEditingId(null);
            setFormData({ nome: '', min: '', max: '' });
        }
        setShowForm(true);
        if (parentId && !editData) setExpanded(prev => ({ ...prev, [parentId]: true }));
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ nome: '', min: '', max: '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        let finalName = formData.nome;
        if (formType === 'range') finalName = generateRangeName(formData.min, formData.max);

        if (!finalName || finalName.trim() === '') {
            alert("Compila i campi necessari.");
            return;
        }

        const payload = {
            companyID: effectiveCompanyId,
            nome: finalName,
            parentId: formParentId,
            isRange: formType === 'range',
            min: formData.min !== '' ? Number(formData.min) : null,
            max: formData.max !== '' ? Number(formData.max) : null,
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) await updateDoc(doc(db, 'wbs_nodes', editingId), payload);
            else {
                payload.createdAt = serverTimestamp();
                await addDoc(collection(db, 'wbs_nodes'), payload);
            }
            closeForm();
        } catch (error) { alert("Errore salvataggio."); }
    };

    const handleDelete = async (id) => {
        const hasChildren = nodes.some(n => n.parentId === id);
        if (hasChildren) {
            alert("Impossibile eliminare: questa cartella contiene sottocartelle o scaglioni. Svuotala prima.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare definitivamente questo elemento?")) {
            await deleteDoc(doc(db, 'wbs_nodes', id));
        }
    };

    // Funzione Ricorsiva per disegnare l'albero
    const renderTree = (parentId = null, level = 0) => {
        const children = nodes
            .filter(n => parentId === null ? (!n.parentId || n.parentId === "") : n.parentId === parentId)
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

        if (children.length === 0) return null;

        return (
            <div className={`flex flex-col gap-2 w-full ${level > 0 ? 'mt-2' : ''}`}>
                {children.map(node => {
                    const isExpanded = expanded[node.id];
                    const hasChildren = nodes.some(n => n.parentId === node.id);

                    return (
                        <div key={node.id} className={`flex flex-col w-full ${level > 0 ? 'ml-8 border-l-2 border-slate-200 pl-4' : ''}`}>
                            
                            {/* BLOCK CARD DEL NODO */}
                            <div className={`flex flex-wrap items-center justify-between gap-4 p-3 bg-white border rounded-xl shadow-sm transition-all hover:border-indigo-300 ${node.isRange ? 'border-emerald-100' : 'border-slate-200'}`}>
                                
                                {/* LATO SINISTRO: Dati e Icone */}
                                <div className="flex items-center gap-3 min-w-[200px] flex-1">
                                    {/* Freccia Espansione (Solo per cartelle) */}
                                    {!node.isRange ? (
                                        <button onClick={() => toggleExpand(node.id)} className={`p-1.5 rounded-lg transition-colors ${hasChildren ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'text-slate-300 cursor-default'}`}>
                                            {isExpanded ? <ChevronDownIcon className="h-4 w-4 stroke-2"/> : <ChevronRightIcon className="h-4 w-4 stroke-2"/>}
                                        </button>
                                    ) : <div className="w-7"></div>}

                                    {/* Icona WBS */}
                                    {node.isRange ? (
                                        <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                            <ScaleIcon className="h-4 w-4"/>
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                            <FolderIcon className="h-4 w-4 stroke-2"/>
                                        </div>
                                    )}
                                    
                                    {/* Nome */}
                                    <span className={`font-black text-[15px] ${node.isRange ? 'text-emerald-700' : 'text-slate-800'}`}>
                                        {node.nome}
                                    </span>
                                </div>

                                {/* LATO DESTRO: Azioni */}
                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                    
                                    {/* Bottoni di Creazione (Solo se è una Cartella) */}
                                    {!node.isRange && (
                                        <div className="flex gap-1 border-r border-slate-200 pr-2 mr-1">
                                            <button onClick={() => openForm(node.id, 'folder')} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1" title="Aggiungi Sottocartella">
                                                <PlusIcon className="h-3 w-3 stroke-2"/> Cartella
                                            </button>
                                            <button onClick={() => openForm(node.id, 'range')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1" title="Aggiungi Scaglione Quantità">
                                                <PlusIcon className="h-3 w-3 stroke-2"/> Scaglione
                                            </button>
                                        </div>
                                    )}

                                    {/* Bottoni di Gestione */}
                                    <button onClick={() => openForm(node.parentId, node.isRange ? 'range' : 'folder', node)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Modifica">
                                        <PencilIcon className="h-4 w-4 stroke-2"/>
                                    </button>
                                    <button onClick={() => handleDelete(node.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Elimina">
                                        <TrashIcon className="h-4 w-4 stroke-2"/>
                                    </button>
                                    
                                    {/* Bottone Seleziona (Se richiesto dal padre) */}
                                    {onSelect && (
                                        <button onClick={() => onSelect(node.id)} className="ml-2 px-4 py-1.5 bg-indigo-600 text-white font-black text-xs rounded-lg shadow-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1">
                                            <CheckIcon className="h-4 w-4 stroke-2" /> Scegli
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Rendering Figli Espansi */}
                            {isExpanded && (
                                <div className="mt-2 mb-4">
                                    {renderTree(node.id, level + 1)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        // 🌟 DIVENTATO FULL PAGE: Prende w-full e h-full senza bordi, e copre tutto.
        <div className="fixed inset-0 z-[300] bg-slate-50 w-full h-full flex flex-col overflow-hidden animate-fade-in">
            
            {/* HEADER "STILE PAGINA" */}
            <div className="bg-white px-6 py-5 md:px-10 md:py-6 flex justify-between items-center border-b border-slate-200 shrink-0 shadow-sm z-10">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                        <FolderIcon className="h-8 w-8 md:h-10 md:w-10 text-indigo-600"/> Tassonomia WBS Aziendale
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 font-medium mt-1">Organizza il tuo listino aggiungendo categorie e scaglioni di quantità ovunque ti serva.</p>
                </div>
                {/* Bottone Torna Indietro */}
                <button onClick={onClose} className="px-5 py-2.5 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all font-bold shadow-sm flex items-center gap-2">
                    <ChevronLeftIcon className="h-5 w-5 stroke-2" /> Torna Indietro
                </button>
            </div>

            {/* CORPO DELLA PAGINA (Centrato e largo) */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto w-full p-6 lg:p-10">
                    
                    {/* Bottone Categoria Radice */}
                    <button onClick={() => openForm(null, 'folder')} className="mb-8 px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <PlusIcon className="h-5 w-5 stroke-2"/> Crea Nuova Categoria Principale
                    </button>

                    {/* ALBERO RENDERIZZATO */}
                    <div className="min-h-[300px]">
                        {nodes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                                <FolderIcon className="h-16 w-16 mb-4 opacity-30"/>
                                <p className="font-bold text-lg">Il tuo dizionario è vuoto.</p>
                                <p className="text-sm">Inizia creando la tua prima categoria principale qui sopra.</p>
                            </div>
                        ) : renderTree(null, 0)}
                    </div>
                </div>
            </div>

            {/* MODALE SOVRAPPOSTA (Il Form rimane una modale centrale per focus) */}
            {showForm && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[310] animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 animate-fade-in-up">
                        
                        <div className={`p-6 flex items-center gap-4 border-b ${formType === 'range' ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                            {formType === 'range' ? (
                                <div className="bg-emerald-200 p-2 rounded-xl text-emerald-800"><ScaleIcon className="h-6 w-6"/></div>
                            ) : (
                                <div className="bg-indigo-200 p-2 rounded-xl text-indigo-800"><FolderIcon className="h-6 w-6 stroke-2"/></div>
                            )}
                            <div>
                                <h3 className={`text-xl font-black ${formType === 'range' ? 'text-emerald-900' : 'text-indigo-900'}`}>
                                    {editingId ? 'Modifica' : 'Nuovo'} {formType === 'range' ? 'Scaglione Quantità' : 'Sottocartella'}
                                </h3>
                                <p className={`text-xs font-bold mt-1 ${formType === 'range' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                    {formType === 'range' ? 'Definisci un range numerico per le specifiche' : 'Crea un nuovo ramo di classificazione'}
                                </p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            {formType === 'folder' ? (
                                <div>
                                    <label className="block text-sm font-black text-slate-600 mb-2">Nome della Cartella</label>
                                    <input type="text" autoFocus required value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner" placeholder="Es. Manutenzione Aree Verdi" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex-1">
                                            <label className="block text-sm font-black text-slate-600 mb-2">Da (Minimo)</label>
                                            <input type="number" step="any" autoFocus value={formData.min} onChange={e => setFormData(p => ({ ...p, min: e.target.value }))} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-inner" placeholder="Es. 300" />
                                        </div>
                                        <div className="text-slate-300 font-black mt-8 text-2xl">-</div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-black text-slate-600 mb-2">A (Massimo)</label>
                                            <input type="number" step="any" value={formData.max} onChange={e => setFormData(p => ({ ...p, max: e.target.value }))} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-inner" placeholder="Es. 1000" />
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        💡 <b className="text-slate-700">Suggerimento:</b> Lascia vuoto un campo per creare scaglioni aperti (es. "Oltre 500" oppure "Fino a 300").
                                    </p>
                                </div>
                            )}
                            
                            <div className="pt-6 flex gap-4 justify-end border-t border-slate-200">
                                <button type="button" onClick={closeForm} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                                    Annulla
                                </button>
                                <button type="submit" className={`px-8 py-3 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${formType === 'range' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}>
                                    <CheckIcon className="h-5 w-5 stroke-2"/> {editingId ? 'Aggiorna' : 'Salva Elemento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};