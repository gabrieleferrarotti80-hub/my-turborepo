import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { AdjustmentsHorizontalIcon, XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export const ModaleCCNL = ({ isOpen, onClose, db, companyID }) => {
    const [contrattiCCNL, setContrattiCCNL] = useState([]);
    const [nuovoContratto, setNuovoContratto] = useState({ nome: '', ferieAnnueGG: 26, permessiAnnuiH: 88, oreSettimanali: 40 });
    const [isEditingContratto, setIsEditingContratto] = useState(false);
    const [editingContrattoId, setEditingContrattoId] = useState(null);

    // Carica i contratti in tempo reale solo quando la modale è aperta
    useEffect(() => {
        if (!isOpen || !db || !companyID) return;
        const q = query(collection(db, 'impostazioni_ccnl'), where('companyID', '==', companyID));
        const unsub = onSnapshot(q, (snap) => setContrattiCCNL(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [db, companyID, isOpen]);

    if (!isOpen) return null;

    const handleSaveContratto = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...nuovoContratto,
                ferieAnnueGG: Number(nuovoContratto.ferieAnnueGG),
                permessiAnnuiH: Number(nuovoContratto.permessiAnnuiH),
                oreSettimanali: Number(nuovoContratto.oreSettimanali),
                companyID
            };

            if (isEditingContratto && editingContrattoId) {
                await updateDoc(doc(db, 'impostazioni_ccnl', editingContrattoId), { ...payload, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, 'impostazioni_ccnl'), { ...payload, createdAt: serverTimestamp() });
            }
            
            cancelEditContratto();
        } catch(error) { alert(error.message); }
    };

    const handleDeleteContratto = async (id) => {
        if(confirm("Attenzione: Vuoi davvero eliminare questo contratto?")) await deleteDoc(doc(db, 'impostazioni_ccnl', id));
    };

    const startEditContratto = (ccnl) => {
        setNuovoContratto({ nome: ccnl.nome || '', ferieAnnueGG: ccnl.ferieAnnueGG || 26, permessiAnnuiH: ccnl.permessiAnnuiH || 88, oreSettimanali: ccnl.oreSettimanali || 40 });
        setIsEditingContratto(true);
        setEditingContrattoId(ccnl.id);
    };

    const cancelEditContratto = () => {
        setNuovoContratto({ nome: '', ferieAnnueGG: 26, permessiAnnuiH: 88, oreSettimanali: 40 });
        setIsEditingContratto(false);
        setEditingContrattoId(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-fade-in-down flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="h-7 w-7 text-indigo-600"/> Gestione Contratti CCNL
                    </h3>
                    <button onClick={() => { cancelEditContratto(); onClose(); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600">
                        <XMarkIcon className="h-6 w-6"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Contratti in Archivio ({contrattiCCNL.length})</h4>
                        <div className="space-y-3">
                            {contrattiCCNL.length > 0 ? contrattiCCNL.map(ccnl => (
                                <div key={ccnl.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                                    <div>
                                        <h5 className="font-bold text-gray-900 text-lg">{ccnl.nome}</h5>
                                        <div className="flex gap-4 text-xs font-medium text-gray-500 mt-1">
                                            <span><strong className="text-emerald-600">{ccnl.ferieAnnueGG}</strong> gg Ferie</span>
                                            <span><strong className="text-sky-600">{ccnl.permessiAnnuiH}</strong> h Permessi</span>
                                            <span><strong className="text-gray-700">{ccnl.oreSettimanali}</strong> h/Settimana</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => startEditContratto(ccnl)} className="p-2.5 bg-white border border-gray-200 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg shadow-sm transition-colors" title="Modifica Contratto"><PencilIcon className="h-5 w-5" /></button>
                                        <button type="button" onClick={() => handleDeleteContratto(ccnl.id)} className="p-2.5 bg-white border border-gray-200 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shadow-sm transition-colors" title="Elimina Contratto"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </div>
                            )) : <p className="text-center italic text-gray-400 py-6 bg-gray-50 rounded-xl border border-dashed">Nessun contratto presente. Creane uno qui sotto.</p>}
                        </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isEditingContratto ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className={`text-sm font-bold flex items-center gap-2 ${isEditingContratto ? 'text-amber-900' : 'text-indigo-900'}`}>
                                {isEditingContratto ? <PencilIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />} 
                                {isEditingContratto ? 'Modifica CCNL Esistente' : 'Aggiungi Nuovo CCNL'}
                            </h4>
                            {isEditingContratto && <button type="button" onClick={cancelEditContratto} className="text-xs font-bold text-gray-500 hover:text-gray-700 underline">Annulla Modifica</button>}
                        </div>
                        <form onSubmit={handleSaveContratto} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-4">
                                <label className={`block text-[10px] font-bold uppercase mb-1 ${isEditingContratto ? 'text-amber-700' : 'text-indigo-700'}`}>Nome Contratto</label>
                                <input required type="text" className={`w-full rounded-lg ${isEditingContratto ? 'border-amber-200 focus:ring-amber-500' : 'border-indigo-200 focus:ring-indigo-500'}`} value={nuovoContratto.nome} onChange={e => setNuovoContratto({...nuovoContratto, nome: e.target.value})} />
                            </div>
                            <div>
                                <label className={`block text-[10px] font-bold uppercase mb-1 ${isEditingContratto ? 'text-amber-700' : 'text-indigo-700'}`}>Ferie (GG)</label>
                                <input required type="number" step="1" className={`w-full rounded-lg font-bold ${isEditingContratto ? 'border-amber-200 focus:ring-amber-500' : 'border-indigo-200 focus:ring-indigo-500'}`} value={nuovoContratto.ferieAnnueGG} onChange={e => setNuovoContratto({...nuovoContratto, ferieAnnueGG: e.target.value})} />
                            </div>
                            <div>
                                <label className={`block text-[10px] font-bold uppercase mb-1 ${isEditingContratto ? 'text-amber-700' : 'text-indigo-700'}`}>Permessi (H)</label>
                                <input required type="number" step="1" className={`w-full rounded-lg font-bold ${isEditingContratto ? 'border-amber-200 focus:ring-amber-500' : 'border-indigo-200 focus:ring-indigo-500'}`} value={nuovoContratto.permessiAnnuiH} onChange={e => setNuovoContratto({...nuovoContratto, permessiAnnuiH: e.target.value})} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`block text-[10px] font-bold uppercase mb-1 ${isEditingContratto ? 'text-amber-700' : 'text-indigo-700'}`}>Ore Settimanali</label>
                                <div className="flex gap-2">
                                    <input required type="number" step="1" className={`w-full rounded-lg ${isEditingContratto ? 'border-amber-200 focus:ring-amber-500' : 'border-indigo-200 focus:ring-indigo-500'}`} value={nuovoContratto.oreSettimanali} onChange={e => setNuovoContratto({...nuovoContratto, oreSettimanali: e.target.value})} />
                                    <button type="submit" className={`${isEditingContratto ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold px-6 py-2 rounded-lg whitespace-nowrap shadow-sm transition-colors`}>
                                        {isEditingContratto ? 'Salva Modifiche' : 'Salva Nuovo'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};