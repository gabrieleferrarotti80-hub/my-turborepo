import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeftIcon, DocumentPlusIcon, BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { SmartResourceSelector } from './SmartResourceSelector'; // ⚠️ ASSICURATI DI QUESTO IMPORT!

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

export const FatturaAcquistoForm = ({
    onBack, onSave, fornitori = [], subappaltatori = [], noleggiatori = [], 
    cantieri = [], subcantieri = [], ordini = [], isLoading, initialData 
}) => {
    
    const [formData, setFormData] = useState({
        fornitoreId: '', nomeFornitore: '', numeroFattura: '', dataFattura: new Date().toISOString().split('T')[0],
        dataScadenza: '', cantiereId: '', faseId: '', ordineCollegatoId: '', descrizione: '',
        articolo: '', metadata: null, // 🌟 CAMPI PER IL COMPARATORE
        imponibile: 0, iva: 22, totale: 0, stato: 'da_pagare', categoriaCosto: 'materiali', file: null 
    });

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev, ...initialData,
                dataFattura: initialData.dataFattura instanceof Date ? initialData.dataFattura.toISOString().split('T')[0] : (initialData.dataFattura || prev.dataFattura),
                dataScadenza: initialData.dataScadenza instanceof Date ? initialData.dataScadenza.toISOString().split('T')[0] : (initialData.dataScadenza || ''),
            }));
        }
    }, [initialData]);

    const subcantieriFiltrati = useMemo(() => {
        if (!formData.cantiereId || formData.cantiereId === 'magazzino') return [];
        return subcantieri.filter(s => (s.cantiereGenitoreId || s.cantiereId) === formData.cantiereId);
    }, [formData.cantiereId, subcantieri]);

    // 🌟 FILTRO ORDINI PER IL FORNITORE SELEZIONATO
    const ordiniDisponibili = useMemo(() => {
        if (!formData.fornitoreId) return [];
        return ordini.filter(o => o.fornitoreId === formData.fornitoreId);
    }, [ordini, formData.fornitoreId]);

    useEffect(() => {
        const imp = Number(formData.imponibile) || 0;
        const iva = Number(formData.iva) || 0;
        setFormData(prev => ({ ...prev, totale: imp * (1 + iva / 100) }));
    }, [formData.imponibile, formData.iva]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleCantiereChange = (e) => setFormData(prev => ({ ...prev, cantiereId: e.target.value, faseId: '' }));

    // SWITCH INTELLIGENTE FORNITORE
    const handleFornitoreChange = (e) => {
        const id = e.target.value;
        const fornitoreNormale = fornitori.find(f => f.id === id);
        const subappaltatore = subappaltatori.find(s => s.id === id);
        const noleggiatore = noleggiatori.find(n => n.id === id); 
        
        const selectedEntity = fornitoreNormale || subappaltatore || noleggiatore;
        
        let autoCategory = prev => prev.categoriaCosto;
        if (subappaltatore) autoCategory = 'subappalti';
        if (noleggiatore) autoCategory = 'noleggi';
        if (fornitoreNormale) autoCategory = 'materiali';

        setFormData(prev => ({
            ...prev,
            fornitoreId: id,
            nomeFornitore: selectedEntity ? selectedEntity.ragioneSociale : '',
            ordineCollegatoId: '',
            categoriaCosto: autoCategory !== prev.categoriaCosto ? autoCategory : prev.categoriaCosto 
        }));
    };

    // 🌟 AUTOCOMPILAZIONE DA PREVENTIVO/ORDINE
    const handleOrdineChange = (e) => {
        const ordineId = e.target.value;
        const ordine = ordiniDisponibili.find(o => o.id === ordineId);
        
        if (ordine) {
            if (confirm("✨ Ho trovato i dati dell'Ordine/Preventivo!\nVuoi auto-compilare l'imponibile, la descrizione e il cantiere associato?")) {
                setFormData(prev => ({
                    ...prev,
                    ordineCollegatoId: ordineId,
                    cantiereId: ordine.cantiereId || prev.cantiereId,
                    imponibile: Number(ordine.totale || ordine.imponibile || 0),
                    descrizione: `Rif. ${ordine.numeroOrdine ? `Ordine N.${ordine.numeroOrdine}` : 'Preventivo'} - ${ordine.descrizione || ''}`
                }));
            } else {
                setFormData(prev => ({ ...prev, ordineCollegatoId: ordineId }));
            }
        } else {
            setFormData(prev => ({ ...prev, ordineCollegatoId: '' }));
        }
    };

    const handleFileChange = (e) => { if (e.target.files && e.target.files[0]) setFormData(prev => ({ ...prev, file: e.target.files[0] })); };
    const handleRemoveFile = (e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, file: null })); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const handleSubmit = (e) => {
        e.preventDefault();
        const nomeCantiereSelezionato = formData.cantiereId === 'magazzino' ? 'Magazzino' : cantieri.find(c => c.id === formData.cantiereId)?.nomeCantiere || 'N/D';
        onSave({ ...formData, imponibile: Number(formData.imponibile), totale: Number(formData.totale), nomeCantiere: nomeCantiereSelezionato });
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm";
    const labelClass = "block text-xs font-medium text-gray-500 uppercase mb-1";

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen animate-fade-in-down">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"><ArrowLeftIcon className="h-5 w-5" /><span>Annulla</span></button>

            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 bg-green-50 border-b border-green-100 flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full text-green-600"><DocumentPlusIcon className="h-6 w-6" /></div>
                    <div><h1 className="text-2xl font-bold text-green-900">{initialData ? 'Modifica Fattura' : 'Registra Fattura Acquisto'}</h1><p className="text-green-700 text-sm mt-1">Carica una fattura di fornitura, subappalto o noleggio.</p></div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Fornitore / Subappaltatore / Noleggiatore *</label>
                            <select name="fornitoreId" value={formData.fornitoreId} onChange={handleFornitoreChange} className={inputClass} required>
                                <option value="">-- Seleziona Azienda --</option>
                                {fornitori.length > 0 && <optgroup label="🏢 Fornitori (Materiali)">{fornitori.map(f => <option key={f.id} value={f.id}>{f.ragioneSociale}</option>)}</optgroup>}
                                {subappaltatori.length > 0 && <optgroup label="👷‍♂️ Albo Subappaltatori">{subappaltatori.map(s => <option key={s.id} value={s.id}>{s.ragioneSociale}</option>)}</optgroup>}
                                {noleggiatori.length > 0 && <optgroup label="🚜 Albo Noleggiatori">{noleggiatori.map(n => <option key={n.id} value={n.id}>{n.ragioneSociale}</option>)}</optgroup>}
                            </select>
                        </div>

                        {/* 🌟 BOX DORATO: APPARE SE IL FORNITORE HA PREVENTIVI O ORDINI */}
                        {ordiniDisponibili.length > 0 && (
                            <div className="md:col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-300">
                                <label className="block text-xs font-bold text-yellow-800 uppercase mb-2 flex items-center gap-1">
                                    <SparklesIcon className="h-4 w-4"/> Trovati Preventivi / Ordini per questa ditta
                                </label>
                                <select 
                                    value={formData.ordineCollegatoId || ''} 
                                    onChange={handleOrdineChange} 
                                    className="w-full rounded-md border-yellow-300 shadow-sm focus:ring-yellow-500 bg-white text-sm cursor-pointer"
                                >
                                    <option value="">-- Seleziona per auto-compilare i dati --</option>
                                    {ordiniDisponibili.map(o => (
                                        <option key={o.id} value={o.id}>
                                            {o.numeroOrdine ? `Ordine N. ${o.numeroOrdine}` : 'Preventivo'} del {new Date(o.data || o.createdAt).toLocaleDateString()} - € {Number(o.totale || o.imponibile || 0).toLocaleString('it-IT')} {o.cantiereNome ? `(${o.cantiereNome})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div><label className={labelClass}>Numero Fattura *</label><input type="text" name="numeroFattura" value={formData.numeroFattura} onChange={handleChange} className={inputClass} required /></div>
                            <div><label className={labelClass}>Data Fattura *</label><input type="date" name="dataFattura" value={formData.dataFattura} onChange={handleChange} className={inputClass} required /></div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><BuildingOfficeIcon className="h-4 w-4" /> Imputazione Costo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Cantiere di Riferimento *</label>
                                <select name="cantiereId" value={formData.cantiereId} onChange={handleCantiereChange} className={inputClass} required>
                                    <option value="">-- Seleziona Destinazione --</option><option value="magazzino" className="font-bold text-blue-700">📦 MAGAZZINO / SCORTA</option><option disabled>──────────</option>
                                    {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                                </select>
                            </div>
                            {formData.cantiereId && formData.cantiereId !== 'magazzino' && subcantieriFiltrati.length > 0 && (
                                <div><label className={labelClass}>Fase / Subcantiere</label><select name="faseId" value={formData.faseId} onChange={handleChange} className={inputClass}><option value="">-- Generale --</option>{subcantieriFiltrati.map(s => <option key={s.id} value={s.id}>{s.nomeSubcantiere}</option>)}</select></div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-2 gap-4 items-end">
                            <div className="col-span-2"><label className={labelClass}>Imponibile (€) *</label><input type="number" step="0.01" name="imponibile" value={formData.imponibile} onChange={handleChange} className={inputClass} required /></div>
                            <div><label className={labelClass}>IVA (%)</label><input type="number" name="iva" value={formData.iva} onChange={handleChange} className={inputClass} /></div>
                            <div className="text-right pb-2"><span className="block text-xs text-gray-500 uppercase mb-1">Totale Documento</span><span className="text-xl font-bold text-gray-900">{formatCurrency(formData.totale)}</span></div>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Categoria Costo</label>
                                <select name="categoriaCosto" value={formData.categoriaCosto} onChange={handleChange} className={inputClass}>
                                    <option value="materiali">🧱 Materiali di Consumo</option>
                                    <option value="noleggi">🚜 Noleggi Esterni</option>
                                    <option value="servizi">⚡ Servizi / Utenze</option>
                                    <option value="subappalti">🤝 Subappalti / SAL Passivi</option>
                                    <option value="altro">📦 Altro</option>
                                </select>
                            </div>

                            {/* 🌟 SELETTORE MAGICO PER IL COMPARATORE 🌟 */}
                            {['materiali', 'noleggi', 'subappalti'].includes(formData.categoriaCosto) && (
                                <div className="animate-fade-in bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Voce per Comparatore Prezzi</label>
                                    <SmartResourceSelector 
                                        tipoArticolo={formData.categoriaCosto === 'materiali' ? 'materiale' : formData.categoriaCosto === 'noleggi' ? 'nolo' : 'subappalto'}
                                        value={formData.articolo || ''}
                                        onChange={(testo, metadata) => setFormData(prev => ({...prev, articolo: testo, metadata}))}
                                        placeholder="Cerca in dizionario o scrivi..."
                                    />
                                    <p className="text-[10px] text-indigo-500 mt-1 font-medium leading-tight">Il nome inserito qui alimenterà in automatico lo storico dei prezzi!</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 md:col-span-2 grid grid-cols-2 gap-4 items-start">
                             <div><label className={labelClass}>Scadenza Pagamento</label><input type="date" name="dataScadenza" value={formData.dataScadenza} onChange={handleChange} className={inputClass} /></div>
                            <div><label className={labelClass}>Descrizione / Note</label><textarea name="descrizione" value={formData.descrizione} onChange={handleChange} rows={2} className={inputClass} placeholder="Es. Noleggio escavatore dal 10 al 15..." /></div>
                        </div>
                    </div>

                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${formData.file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50 cursor-pointer'}`} onClick={() => !formData.file && fileInputRef.current.click()}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                        {!formData.file ? (
                            <><p className="text-gray-500 text-sm font-medium">{formData.fileUrl ? 'Sostituisci file esistente' : 'Clicca per caricare il PDF della fattura'}</p>{formData.fileUrl && <p className="text-xs text-blue-600 mt-1">File già presente</p>}</>
                        ) : (
                            <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}><span className="text-sm font-medium text-green-700">{formData.file.name}</span><button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"><XMarkIcon className="h-5 w-5" /></button></div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button type="submit" disabled={isLoading} className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg shadow hover:bg-green-700 disabled:opacity-50">
                        {isLoading ? 'Registrazione...' : (initialData ? 'Salva Modifiche' : 'Registra Fattura')}
                    </button>
                </div>
            </form>
        </div>
    );
};