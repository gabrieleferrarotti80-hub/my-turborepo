import React from 'react';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

export const CsvImportModal = ({
    isOpen,
    onClose,
    onImport,
    nomeCatalogoTemp,
    colMap,
    setColMap,
    maxColsOptions,
    csvAllRows
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-down">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Anteprima Importazione</h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Catalogo: <span className="text-indigo-600 font-bold">{nomeCatalogoTemp}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[60vh] bg-white">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                        <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-3">Associa le colonne del tuo file:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Codice Articolo *</label>
                                <select value={colMap.codice} onChange={e => setColMap({...colMap, codice: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="-1">-- Ignora --</option>
                                    {maxColsOptions.map(i => <option key={i} value={i}>Colonna {i + 1}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrizione *</label>
                                <select value={colMap.descrizione} onChange={e => setColMap({...colMap, descrizione: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="-1">-- Ignora --</option>
                                    {maxColsOptions.map(i => <option key={i} value={i}>Colonna {i + 1}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unità Misura</label>
                                <select value={colMap.um} onChange={e => setColMap({...colMap, um: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="-1">-- Usa Default (cad) --</option>
                                    {maxColsOptions.map(i => <option key={i} value={i}>Colonna {i + 1}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Prezzo Tot. € *</label>
                                <select value={colMap.prezzo} onChange={e => setColMap({...colMap, prezzo: Number(e.target.value)})} className="w-full p-2 border border-indigo-300 rounded-lg text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="-1">-- Ignora --</option>
                                    {maxColsOptions.map(i => <option key={i} value={i}>Colonna {i + 1}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Prezzo senza SG e UI</label>
                                <select value={colMap.prezzoPuro} onChange={e => setColMap({...colMap, prezzoPuro: Number(e.target.value)})} className="w-full p-2 border border-amber-300 rounded-lg text-sm font-bold text-amber-800 bg-amber-50 outline-none focus:ring-2 focus:ring-amber-500">
                                    <option value="-1">-- Nessuno (Usa Totale) --</option>
                                    {maxColsOptions.map(i => <option key={i} value={i}>Colonna {i + 1}</option>)}
                                </select>
                                <span className="text-[9px] text-amber-500 font-bold mt-1 block">Costo Puro (Industriale)</span>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Rapporto R.U. (%)</label>
                                <select value={colMap.manodopera} onChange={e => setColMap({...colMap, manodopera: Number(e.target.value)})} className="w-full p-2 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-700 bg-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="-1">-- Nessuna (0%) --</option>
                                    {maxColsOptions.map(i => <option key={i} value={i}>Colonna {i + 1}</option>)}
                                </select>
                                <span className="text-[9px] text-emerald-500 font-bold italic mt-1 block">Incidenza Manodopera</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anteprima delle prime 5 righe:</p>
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>{maxColsOptions.map(i => <th key={i} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase text-left whitespace-nowrap border-r border-slate-200">Colonna {i + 1}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {csvAllRows.slice(0, 5).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        {maxColsOptions.map(i => <td key={i} className="px-4 py-2 text-xs font-medium text-slate-600 truncate max-w-[200px] border-r border-slate-100" title={row[i] || ''}>{row[i] || '-'}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Annulla</button>
                    <button 
                        onClick={onImport} 
                        className="px-6 py-2.5 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-all active:scale-95"
                        disabled={colMap.codice === -1 || colMap.descrizione === -1 || colMap.prezzo === -1}
                    >
                        <DocumentArrowUpIcon className="h-5 w-5" /> Conferma e Importa {csvAllRows.length} Voci
                    </button>
                </div>
            </div>
        </div>
    );
};