import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    CheckBadgeIcon, ExclamationTriangleIcon, XCircleIcon, 
    CameraIcon, DocumentTextIcon, XMarkIcon 
} from '@heroicons/react/24/outline';

export const ModuloRegistrazioneDDT = ({ ordine, db, storage, companyID, user, onChiudi, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formDDT, setFormDDT] = useState({
        numeroDDT: '',
        dataDDT: new Date().toISOString().split('T')[0],
        conformita: 'conforme', // 'conforme', 'parziale', 'danneggiato'
        note: ''
    });
    const [fileDDT, setFileDDT] = useState(null);

    const handleSalvaDDT = async (e) => {
        e.preventDefault();
        if (!formDDT.numeroDDT) return alert("Inserisci il numero del DDT indicato dal fornitore sulla bolla.");
        if (!fileDDT) return alert("Devi allegare la scansione o la foto del DDT.");

        setIsSubmitting(true);
        try {
            // 1. Carica la foto/PDF del DDT su Firebase Storage
            const fileSafeName = fileDDT.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileRef = ref(storage, `ddt_acquisti/${ordine.id}/${Date.now()}_${fileSafeName}`);
            await uploadBytes(fileRef, fileDDT);
            const fileUrl = await getDownloadURL(fileRef);

            // 2. Crea il documento nella collezione ddt_acquisti
            const nuovoDDT = {
                companyID,
                ordineId: ordine.id,
                numeroOrdine: ordine.numeroOrdine,
                fornitoreId: ordine.fornitoreId,
                fornitoreNome: ordine.fornitoreNome,
                cantiereId: ordine.cantiereId,
                cantiereNome: ordine.cantiereNome,
                registratoDa: user?.uid || 'Sconosciuto',
                registratoDaNome: user?.displayName || user?.email || 'Sconosciuto',
                numeroDDT: formDDT.numeroDDT,
                dataDDT: formDDT.dataDDT,
                dataRegistrazione: new Date().toISOString(),
                conformita: formDDT.conformita,
                note: formDDT.note,
                fileUrl: fileUrl,
                fileName: fileDDT.name
            };
            await addDoc(collection(db, 'ddt_acquisti'), nuovoDDT);

            // 3. Aggiorna lo stato dell'Ordine originale
            const nuovoStatoOrdine = formDDT.conformita === 'conforme' ? 'consegnato' : 'consegnato_con_riserva';
            await updateDoc(doc(db, 'ordini_acquisto', ordine.id), {
                stato: nuovoStatoOrdine,
                dataRicezioneEffettiva: new Date().toISOString(),
                ricevutoDa: user?.uid || 'Sconosciuto'
            });

            alert("✅ DDT Registrato con successo! L'ordine è stato aggiornato.");
            onSuccess(); // Ricarica o chiude
        } catch (error) {
            console.error("Errore salvataggio DDT:", error);
            alert("Errore durante la registrazione del DDT.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* HEADER MODALE */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Registra Arrivo Merce (DDT)</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Ordine: <span className="text-indigo-600 font-bold">{ordine.numeroOrdine}</span> da {ordine.fornitoreNome}</p>
                    </div>
                    <button onClick={onChiudi} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <XMarkIcon className="h-6 w-6"/>
                    </button>
                </div>

                {/* CORPO DEL FORM */}
                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    <form id="ddt-form" onSubmit={handleSalvaDDT} className="space-y-6">
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Numero DDT *</label>
                                <input type="text" required value={formDDT.numeroDDT} onChange={e => setFormDDT({...formDDT, numeroDDT: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50" placeholder="Es. 1245/A" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Data bolla *</label>
                                <input type="date" required value={formDDT.dataDDT} onChange={e => setFormDDT({...formDDT, dataDDT: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
                            </div>
                        </div>

                        {/* CARICAMENTO FOTO/FILE */}
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Foto o PDF della Bolla *</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative cursor-pointer group">
                                <input type="file" required accept="image/*,.pdf" onChange={e => setFileDDT(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <CameraIcon className="h-8 w-8 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                                {fileDDT ? (
                                    <p className="font-bold text-indigo-700">{fileDDT.name}</p>
                                ) : (
                                    <p className="text-sm font-medium text-slate-500">Tocca per scattare una foto o carica un PDF</p>
                                )}
                            </div>
                        </div>

                        {/* STATO CONFORMITA */}
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Controllo Merce</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button type="button" onClick={() => setFormDDT({...formDDT, conformita: 'conforme'})} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formDDT.conformita === 'conforme' ? 'border-green-500 bg-green-50 text-green-700 shadow-md' : 'border-slate-200 text-slate-500 hover:border-green-200'}`}>
                                    <CheckBadgeIcon className="h-8 w-8"/>
                                    <span className="text-sm font-bold">Tutto Ok</span>
                                </button>
                                <button type="button" onClick={() => setFormDDT({...formDDT, conformita: 'parziale'})} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formDDT.conformita === 'parziale' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md' : 'border-slate-200 text-slate-500 hover:border-amber-200'}`}>
                                    <ExclamationTriangleIcon className="h-8 w-8"/>
                                    <span className="text-sm font-bold">Manca Qualcosa</span>
                                </button>
                                <button type="button" onClick={() => setFormDDT({...formDDT, conformita: 'danneggiato'})} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formDDT.conformita === 'danneggiato' ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'border-slate-200 text-slate-500 hover:border-red-200'}`}>
                                    <XCircleIcon className="h-8 w-8"/>
                                    <span className="text-sm font-bold">Merce Danneggiata</span>
                                </button>
                            </div>
                        </div>

                        {/* NOTE */}
                        {formDDT.conformita !== 'conforme' && (
                            <div className="animate-fade-in-down">
                                <label className="block text-xs font-black text-red-500 uppercase tracking-widest mb-2">Note per la Segreteria (Obbligatorio per merce danneggiata o mancante)</label>
                                <textarea required rows="3" value={formDDT.note} onChange={e => setFormDDT({...formDDT, note: e.target.value})} className="w-full p-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-red-50" placeholder="Descrivi cosa manca o cosa è danneggiato..."></textarea>
                            </div>
                        )}

                    </form>
                </div>

                {/* FOOTER AZIONI */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onChiudi} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                        Annulla
                    </button>
                    <button type="submit" form="ddt-form" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2">
                        {isSubmitting ? 'Salvataggio in corso...' : <><DocumentTextIcon className="h-5 w-5"/> Registra DDT</>}
                    </button>
                </div>
            </div>
        </div>
    );
};