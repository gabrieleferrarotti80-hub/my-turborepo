import React from 'react';
import { WrenchScrewdriverIcon, PrinterIcon, PencilSquareIcon, KeyIcon } from '@heroicons/react/24/outline';

const formattaDataSafe = (dataRaw) => {
    if (!dataRaw) return 'N/D';
    if (typeof dataRaw.toDate === 'function') return dataRaw.toDate().toLocaleDateString('it-IT');
    return new Date(dataRaw).toLocaleDateString('it-IT');
};

export const TabDotazioni = ({
    selectedUser, setSelectedUser, isNewUser, isStorico,
    dotazioniUtente, handlePrintDotazioni, setIsSignatureModalOpen
}) => {
    if (isNewUser) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-3">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><WrenchScrewdriverIcon className="h-6 w-6"/> Dotazioni e Mezzi in Uso</h3>
                    <button type="button" onClick={handlePrintDotazioni} className="text-sm font-bold text-slate-700 bg-white border border-slate-300 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"><PrinterIcon className="h-5 w-5" /> Stampa Modulo Resa</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pointer-events-auto">
                    <div>
                        <h4 className="text-sm font-extrabold text-emerald-700 uppercase mb-4 flex items-center gap-2">Attualmente in Carico ({dotazioniUtente.inUso.length})</h4>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                            {dotazioniUtente.inUso.length > 0 ? dotazioniUtente.inUso.map(dot => (
                                <div key={dot.id} className="bg-white border border-emerald-100 p-4 rounded-xl shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-900">{dot.nomeDisplay}</p>
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${dot.statoDisplay.includes('Confermare') ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}>{dot.statoDisplay}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">Assegnato: {formattaDataSafe(dot.dataAssegnazione || dot.createdAt)}</p>
                                </div>
                            )) : <p className="text-sm text-gray-400 italic bg-white p-6 rounded-xl border border-dashed text-center">Nessuna dotazione in carico.</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-extrabold text-gray-500 uppercase mb-4">Storico Restituzioni ({dotazioniUtente.storico.length})</h4>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                            {dotazioniUtente.storico.length > 0 ? dotazioniUtente.storico.map(dot => (
                                <div key={dot.id} className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                                    <div><p className="text-sm font-bold text-gray-700 line-through decoration-gray-400">{dot.nomeDisplay}</p><p className="text-[10px] text-gray-500 font-medium mt-1">Reso: {formattaDataSafe(dot.dataRientro || dot.dataRestituzione)}</p></div>
                                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest">{dot.statoDisplay}</span>
                                </div>
                            )) : <p className="text-sm text-gray-400 italic bg-gray-50 p-6 rounded-xl border border-dashed text-center">Nessuno storico disponibile.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><PencilSquareIcon className="h-5 w-5 text-indigo-600"/> Firma Digitale App</h3>
                    <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 mb-4 min-h-[120px]">
                        {selectedUser?.firmaUrl ? <img src={selectedUser.firmaUrl} alt="Firma" className="max-h-20 drop-shadow-sm" /> : <p className="text-sm text-gray-400 font-medium">Nessuna firma in database.</p>}
                    </div>
                    {!isStorico && <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm">{selectedUser?.firmaUrl ? 'Aggiorna Firma' : 'Acquisisci Firma Ora'}</button>}
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><KeyIcon className="h-5 w-5 text-indigo-600"/> Accesso App</h3>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email di Accesso</label><input className="w-full rounded-lg border-gray-300 bg-gray-100 text-gray-500 font-mono" type="text" disabled value={selectedUser?.email || ''} /></div>
                        <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Modifica Password</label><input className="w-full rounded-lg border-gray-300 font-mono focus:ring-indigo-500" type="text" placeholder="Scrivi una nuova password..." value={selectedUser?.password || ''} onChange={e => setSelectedUser({...selectedUser, password: e.target.value})} /></div>
                        <p className="text-xs text-gray-500 italic mt-2">Nota: se cambi la password, il dipendente verrà disconnesso dall'app e dovrà usare la nuova.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};