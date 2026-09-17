import React from 'react';
import { ClipboardDocumentListIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

export const Step1InfoLead = ({ 
    datiLead, 
    setDatiLead, 
    documentiCliente, 
    handleUploadFile, 
    uploadingDoc, 
    onNext 
}) => {
    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up max-w-5xl mx-auto">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-500"/> Ricezione Richiesta (Lead)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indirizzo Futuro Cantiere *</label>
                        <input type="text" placeholder="Es. Via Roma 15, Milano" value={datiLead.indirizzoCantiere} onChange={e=>setDatiLead({...datiLead, indirizzoCantiere: e.target.value})} className="w-full rounded-xl border-slate-300 focus:ring-indigo-500 font-medium" />
                        <p className="text-[10px] text-slate-400 mt-1">Questo indirizzo verrà usato nell'Agenda del tecnico e nel futuro cantiere.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrizione Lavori Richiesti</label>
                        <textarea rows="6" placeholder="Il cliente richiede il rifacimento della facciata, problemi di infiltrazione..." value={datiLead.descrizione} onChange={e=>setDatiLead({...datiLead, descrizione: e.target.value})} className="w-full rounded-xl border-slate-300 focus:ring-indigo-500 text-sm"></textarea>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2"><DocumentArrowUpIcon className="h-5 w-5"/> File Inviati dal Cliente</h4>
                    <div className="space-y-2 mb-4 max-h-[150px] overflow-y-auto">
                        {documentiCliente.map(doc => (
                            <div key={doc.id} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded-lg text-xs">
                                <span className="truncate max-w-[200px] font-medium text-slate-700">{doc.nome}</span>
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">Apri</a>
                            </div>
                        ))}
                        {documentiCliente.length === 0 && <p className="text-xs text-slate-400 italic">Nessun documento caricato.</p>}
                    </div>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-100 transition-colors">
                        <input type="file" onChange={handleUploadFile} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <p className="text-sm font-bold text-indigo-600">{uploadingDoc ? 'Caricamento...' : '+ Allega Planimetrie o Foto'}</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                <button onClick={onNext} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">Vai al Sopralluogo ➔</button>
            </div>
        </div>
    );
};