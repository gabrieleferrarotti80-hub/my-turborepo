// packages/shared-ui/components/AnalisiCostiForm.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { FileUploadZone } from './FileUploadZone'; 

// Stili allineati al nuovo design
const inputStyle = "w-full p-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all";
const labelStyle = "block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1";
const totalLabelStyle = "block text-[10px] font-black text-slate-500 uppercase tracking-widest";
const totalValueStyle = "mt-1 text-2xl font-black text-slate-800";

export const AnalisiCostiForm = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialValues = {} 
}) => {
    
    // Stato interno
    const [costi, setCosti] = useState({
        manodopera: 0,
        attrezzature: 0,
        macchinari: 0,
        materiali: 0,
        imprevistiPercent: 10, // Default 10%
    });
    const [fileDaCaricare, setFileDaCaricare] = useState([]);

    // Popola lo stato quando si apre
    useEffect(() => {
        if (isOpen) {
            setCosti({
                manodopera: initialValues?.manodopera || 0,
                attrezzature: initialValues?.attrezzature || 0,
                macchinari: initialValues?.macchinari || 0,
                materiali: initialValues?.materiali || 0,
                imprevistiPercent: initialValues?.imprevistiPercent ?? 10,
            });
            setFileDaCaricare([]);
        }
    }, [isOpen, initialValues]);

    // Calcoli derivati (con protezione contro campi vuoti/NaN)
    const costiBase = useMemo(() => {
        return (
            (parseFloat(costi.manodopera) || 0) + 
            (parseFloat(costi.attrezzature) || 0) + 
            (parseFloat(costi.macchinari) || 0) + 
            (parseFloat(costi.materiali) || 0)
        );
    }, [costi.manodopera, costi.attrezzature, costi.macchinari, costi.materiali]);

    const valoreImprevisti = useMemo(() => {
        return costiBase * ((parseFloat(costi.imprevistiPercent) || 0) / 100);
    }, [costiBase, costi.imprevistiPercent]);

    const costiTotali = useMemo(() => {
        return costiBase + valoreImprevisti;
    }, [costiBase, valoreImprevisti]);

    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCosti(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveClick = () => {
        const datiDaSalvare = {
            ...costi,
            totaleBase: costiBase,
            totaleImprevisti: valoreImprevisti,
            totale: costiTotali, // Chiave originale
            costiTotali: costiTotali, // ✅ CHIAVE CORRETTA PER FAR FUNZIONARE L'HOOK DEL PADRE
            fileDaCaricare: fileDaCaricare 
        };
        onSave(datiDaSalvare);
        onClose(); // ✅ Chiude il popup automaticamente dopo il salvataggio!
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose} 
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col transform transition-all"
                onClick={e => e.stopPropagation()} 
            >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Analisi Dettagliata Costi</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Inserisci i costi vivi stimati per generare il totale.</p>
                    </div>
                </div>

                <div className="p-8 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        
                        {/* Colonna Campi */}
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="manodopera" className={labelStyle}>Manodopera (€)</label>
                                <input type="number" name="manodopera" value={costi.manodopera} onChange={handleChange} className={inputStyle} min="0" step="0.01" />
                            </div>
                            <div>
                                <label htmlFor="attrezzature" className={labelStyle}>Attrezzature (€)</label>
                                <input type="number" name="attrezzature" value={costi.attrezzature} onChange={handleChange} className={inputStyle} min="0" step="0.01" />
                            </div>
                            <div>
                                <label htmlFor="macchinari" className={labelStyle}>Macchinari (€)</label>
                                <input type="number" name="macchinari" value={costi.macchinari} onChange={handleChange} className={inputStyle} min="0" step="0.01" />
                            </div>
                            <div>
                                <label htmlFor="materiali" className={labelStyle}>Materiali (€)</label>
                                <input type="number" name="materiali" value={costi.materiali} onChange={handleChange} className={inputStyle} min="0" step="0.01" />
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <label htmlFor="imprevistiPercent" className={labelStyle}>Imprevisti (%)</label>
                                <input type="number" name="imprevistiPercent" value={costi.imprevistiPercent} onChange={handleChange} className={inputStyle} min="0" max="100" />
                            </div>
                        </div>
                        
                        {/* Colonna Riepilogo */}
                        <div className="flex flex-col h-full justify-between">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 flex-1">
                                <div>
                                    <span className={totalLabelStyle}>Somma Costi Base</span>
                                    <span className="mt-1 text-xl font-bold text-slate-600">{costiBase.toLocaleString('it-IT', {minimumFractionDigits: 2})} €</span>
                                </div>
                                <div>
                                    <span className={totalLabelStyle}>Quota Imprevisti ({costi.imprevistiPercent}%)</span>
                                    <span className="mt-1 text-xl font-bold text-orange-500">{valoreImprevisti.toLocaleString('it-IT', {minimumFractionDigits: 2})} €</span>
                                </div>
                                <div className="border-t border-slate-200 pt-6">
                                    <span className="block text-xs font-black text-indigo-600 uppercase tracking-widest">COSTI TOTALI PREVISTI</span>
                                    <span className="mt-1 text-4xl font-black text-indigo-700">{costiTotali.toLocaleString('it-IT', {minimumFractionDigits: 2})} €</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* File Upload */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <label className={`${labelStyle} mb-2`}>File di Dettaglio (Computi, Listini excel)</label>
                        <FileUploadZone onFilesSelected={setFileDaCaricare} />
                        {fileDaCaricare.length > 0 && (
                            <ul className="mt-3 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                {fileDaCaricare.map(f => <li key={f.name} className="flex items-center gap-2">📎 {f.name}</li>)}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Pulsanti Azione */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-4 rounded-b-3xl">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-3 bg-white text-slate-700 font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        type="button"
                        onClick={handleSaveClick}
                        className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-md transition-all transform active:scale-95"
                    >
                        Conferma e Calcola
                    </button>
                </div>
            </div>
        </div>
    );
};