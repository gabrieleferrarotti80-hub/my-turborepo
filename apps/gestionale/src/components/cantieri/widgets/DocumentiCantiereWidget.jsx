import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    ArrowUpTrayIcon, PaperClipIcon, XMarkIcon, DocumentTextIcon 
} from '@heroicons/react/24/outline';

export const DocumentiCantiereWidget = ({ cantiere, db, storage }) => {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
    };

    const handleRemoveFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0 || !storage || !db) return;
        setIsUploading(true);
        try {
            const nuoviDocumenti = [];
            for (const file of files) {
                const fileNameSafe = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileRef = ref(storage, `cantieri/${cantiere.id}/documenti_operativi/${Date.now()}_${fileNameSafe}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                nuoviDocumenti.push({ name: file.name, url: url, dataCaricamento: new Date().toISOString(), dimensione: file.size, type: file.type });
            }
            await updateDoc(doc(db, 'cantieri', cantiere.id), { documentiAggiuntivi: arrayUnion(...nuoviDocumenti) });
            setFiles([]);
            alert("✅ Documenti operativi caricati e archiviati con successo!");
        } catch (err) { console.error(err); alert("Errore durante il caricamento dei file."); } finally { setIsUploading(false); }
    };

    const documentiGiaCaricati = cantiere.documentiAggiuntivi || [];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ArrowUpTrayIcon className="h-5 w-5 text-indigo-600" />Documentazione Operativa Cantiere</h3>
            </div>
            <p className="text-xs text-gray-500 mb-6">Carica qui POS, PSC, permessi, varianti, disegni aggiornati.</p>
            <div className="mb-8">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50/30 hover:bg-indigo-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center"><ArrowUpTrayIcon className="h-8 w-8 text-indigo-400 mb-2" /><p className="text-sm text-indigo-700 font-bold">Clicca o trascina i file qui</p></div>
                    <input type="file" className="hidden" multiple onChange={handleFileChange} disabled={isUploading} />
                </label>
                {files.length > 0 && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <ul className="space-y-2 mb-4">
                            {files.map((f, idx) => (
                                <li key={idx} className="flex items-center justify-between text-sm bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
                                    <span className="flex items-center gap-2 text-gray-700 font-medium truncate"><PaperClipIcon className="h-4 w-4 text-indigo-500 shrink-0" /> {f.name}</span>
                                    <button onClick={() => handleRemoveFile(idx)} className="text-red-400 hover:text-red-600 p-1"><XMarkIcon className="h-4 w-4" /></button>
                                </li>
                            ))}
                        </ul>
                        <button onClick={handleUpload} disabled={isUploading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">{isUploading ? 'Salvataggio in corso...' : <> <ArrowUpTrayIcon className="h-5 w-5" /> Conferma e Salva Documenti </>}</button>
                    </div>
                )}
            </div>
            {documentiGiaCaricati.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Archivio Documenti Operativi</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {documentiGiaCaricati.map((doc, idx) => (
                            <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden"><DocumentTextIcon className="h-5 w-5 text-gray-400 shrink-0" /><div className="truncate"><p className="text-sm font-bold text-gray-700 truncate" title={doc.name}>{doc.name}</p><p className="text-[10px] text-gray-400">Caricato il: {new Date(doc.dataCaricamento).toLocaleDateString('it-IT')}</p></div></div>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="ml-4 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md border border-indigo-100 hover:bg-indigo-600 hover:text-white shrink-0">Apri</a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};