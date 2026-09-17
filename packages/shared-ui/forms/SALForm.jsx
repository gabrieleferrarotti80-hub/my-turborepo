import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, BanknotesIcon, CalculatorIcon } from '@heroicons/react/24/solid';

export const SALForm = ({
    onBack,
    onSave,
    initialData,
    cantiereId,         // ID Cantiere obbligatorio
    valoreAppalto = 0,  // Totale commessa (per calcolo %)
    isSaving
}) => {
    
    const [formData, setFormData] = useState({
        titolo: '',          // Es. "SAL n.1 Fondamenta"
        data: new Date().toISOString().split('T')[0],
        importo: '',
        percentuale: '',
        stato: 'bozza',      // bozza, approvato, fatturato
        note: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                importo: initialData.importo || '',
                percentuale: initialData.percentuale || ''
            }));
        } else {
            // Se nuovo, suggerisci un titolo progressivo? (Logica demandata all'utente per ora)
            setFormData(prev => ({ ...prev, titolo: 'SAL n.' }));
        }
    }, [initialData]);

    // --- AUTO-CALCOLO IMPORTO <-> PERCENTUALE ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        if (valoreAppalto > 0) {
            if (name === 'importo') {
                // Se scrivo importo -> calcolo %
                const imp = parseFloat(value);
                if (!isNaN(imp)) {
                    newFormData.percentuale = ((imp / valoreAppalto) * 100).toFixed(2);
                } else {
                    newFormData.percentuale = '';
                }
            } else if (name === 'percentuale') {
                // Se scrivo % -> calcolo importo
                const perc = parseFloat(value);
                if (!isNaN(perc)) {
                    newFormData.importo = ((valoreAppalto * perc) / 100).toFixed(2);
                } else {
                    newFormData.importo = '';
                }
            }
        }
        setFormData(newFormData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            cantiereId,
            importo: parseFloat(formData.importo) || 0,
            percentuale: parseFloat(formData.percentuale) || 0
        });
    };

    // Helper formattazione
    const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-lg mx-auto border border-gray-200">
            
            <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-2">
                <ArrowLeftIcon className="h-4 w-4" /> Annulla
            </button>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BanknotesIcon className="h-7 w-7 text-green-600"/> 
                    {initialData ? 'Modifica SAL' : 'Emetti Nuovo SAL'}
                </h2>
                {valoreAppalto > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                        Valore Totale Appalto: <strong>{formatCurrency(valoreAppalto)}</strong>
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo / Descrizione</label>
                    <input 
                        type="text" name="titolo" value={formData.titolo} onChange={handleChange} required 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Es. SAL 1 - Completamento Strutture"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Emissione</label>
                        <input type="date" name="data" value={formData.data} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                        <select name="stato" value={formData.stato} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                            <option value="bozza">📝 Bozza</option>
                            <option value="approvato">✅ Approvato (Da Fatturare)</option>
                            <option value="fatturato">💰 Fatturato</option>
                        </select>
                    </div>
                </div>

                {/* SEZIONE CALCOLO */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 space-y-4 relative overflow-hidden">
                    <CalculatorIcon className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-green-100 pointer-events-none" />
                    
                    <div className="relative">
                        <label className="block text-xs font-bold text-green-800 uppercase mb-1">Importo Maturato (€)</label>
                        <input 
                            type="number" step="0.01" name="importo" value={formData.importo} onChange={handleChange} required 
                            className="w-full p-3 border border-green-300 rounded-lg text-lg font-bold text-gray-900 focus:ring-2 focus:ring-green-500"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-green-800 uppercase mb-1">Avanzamento (%)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" step="0.01" name="percentuale" value={formData.percentuale} onChange={handleChange} 
                                className="w-24 p-2 border border-green-300 rounded-lg text-center font-medium"
                                placeholder="0"
                                disabled={valoreAppalto <= 0} // Disabilita se non c'è un totale di riferimento
                            />
                            <span className="text-green-700 font-bold">%</span>
                            {valoreAppalto <= 0 && <span className="text-xs text-gray-400">(Richiede valore appalto)</span>}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note Interne</label>
                    <textarea name="note" value={formData.note} onChange={handleChange} rows={2} className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSaving} className={`px-6 py-3 text-white font-bold rounded-lg shadow-md transition-all ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}>
                        {isSaving ? 'Salvataggio...' : 'Salva SAL'}
                    </button>
                </div>

            </form>
        </div>
    );
};