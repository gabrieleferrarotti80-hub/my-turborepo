import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, DocumentArrowUpIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/solid';

export const FornitoreForm = ({
    onBack,
    onSave,
    initialData,
    isLoading
}) => {
    
    const [formData, setFormData] = useState({
        ragioneSociale: '',
        piva: '',
        codiceFiscale: '',
        sdi: '', // ✅ NUOVO: Codice Destinatario
        email: '',
        pec: '', // ✅ NUOVO: PEC
        telefono: '',
        indirizzo: '', // Sede Legale
        citta: '',
        cap: '',
        provincia: '',
        indirizzoMagazzino: '', // ✅ NUOVO: Sede Operativa/Magazzino
        iban: '',
        metodoPagamentoDefault: 'Bonifico Bancario 30gg',
        note: '',
        listinoFile: null // ✅ NUOVO: Per gestire il file del listino
    });

    // Ref per il file input nascosto
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ✅ Gestione caricamento file Listino
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, listinoFile: e.target.files[0] }));
        }
    };

    const handleRemoveFile = () => {
        setFormData(prev => ({ ...prev, listinoFile: null }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

   const handleSubmit = (e) => {
        e.preventDefault();
        // ✅ CORRETTO: Passiamo semplicemente i dati del form.
        // Non ci sono calcoli di totali o ricerche di cantieri da fare per un'anagrafica.
        onSave(formData);
    };

    // Stili condivisi
    const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm";
    const labelClass = "block text-xs font-medium text-gray-500 uppercase mb-1";

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Annulla e Torna Indietro</span>
            </button>

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                    <h1 className="text-2xl font-bold text-indigo-900">
                        {initialData ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
                    </h1>
                    <p className="text-indigo-600 text-sm mt-1">Inserisci i dati anagrafici e fiscali del fornitore.</p>
                </div>

                <div className="p-6 space-y-8">
                    
                    {/* 1. Dati Fiscali */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Dati Fiscali</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                                <label className={labelClass}>Ragione Sociale *</label>
                                <input type="text" name="ragioneSociale" value={formData.ragioneSociale} onChange={handleChange} className={inputClass} required placeholder="Es. Edilizia Rossi Srl" />
                            </div>
                            <div>
                                <label className={labelClass}>Partita IVA</label>
                                <input type="text" name="piva" value={formData.piva} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Codice Fiscale</label>
                                <input type="text" name="codiceFiscale" value={formData.codiceFiscale} onChange={handleChange} className={inputClass} />
                            </div>
                            {/* ✅ CAMPO SDI */}
                            <div>
                                <label className={labelClass}>Codice SDI (Fatturazione)</label>
                                <input type="text" name="sdi" value={formData.sdi} onChange={handleChange} className={inputClass} placeholder="XXXXXXX" maxLength={7} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Contatti e Sedi */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Contatti e Sedi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Contatti */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Email</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                                    </div>
                                    {/* ✅ CAMPO PEC */}
                                    <div>
                                        <label className={labelClass}>PEC</label>
                                        <input type="email" name="pec" value={formData.pec} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Telefono</label>
                                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>

                            {/* Indirizzi */}
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Indirizzo Sede Legale</label>
                                    <input type="text" name="indirizzo" value={formData.indirizzo} onChange={handleChange} className={inputClass} placeholder="Via, Civico..." />
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <input type="text" name="cap" value={formData.cap} onChange={handleChange} className={inputClass} placeholder="CAP" />
                                        <input type="text" name="citta" value={formData.citta} onChange={handleChange} className={inputClass} placeholder="Città" />
                                        <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} className={inputClass} placeholder="PR" />
                                    </div>
                                </div>
                                {/* ✅ CAMPO MAGAZZINO */}
                                <div>
                                    <label className={labelClass}>Indirizzo Magazzino (Ritiro Merci)</label>
                                    <input type="text" name="indirizzoMagazzino" value={formData.indirizzoMagazzino} onChange={handleChange} className={inputClass} placeholder="Se diverso dalla sede legale..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Amministrazione e Documenti */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Amministrazione & Documenti</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Dati Pagamento */}
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>IBAN</label>
                                    <input type="text" name="iban" value={formData.iban} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Pagamento Default</label>
                                    <input type="text" name="metodoPagamentoDefault" value={formData.metodoPagamentoDefault} onChange={handleChange} className={inputClass} placeholder="Es. 30gg FM" />
                                </div>
                                <div>
                                    <label className={labelClass}>Note Interne</label>
                                    <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className={inputClass} />
                                </div>
                            </div>

                            {/* ✅ TASTO LISTINO PREZZI */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-center">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Listino Prezzi Fornitore</label>
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    accept=".pdf,.xls,.xlsx,.csv"
                                />

                                {!formData.listinoFile ? (
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <DocumentArrowUpIcon className="h-5 w-5 text-indigo-600" />
                                        Carica Listino (PDF/Excel)
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 text-sm w-full justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            <PaperClipIcon className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">{formData.listinoFile.name}</span>
                                        </div>
                                        <button type="button" onClick={handleRemoveFile} className="text-indigo-400 hover:text-indigo-900">
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">Carica il listino aggiornato per consultazione rapida.</p>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button type="submit" disabled={isLoading} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50">
                        {isLoading ? 'Salvataggio...' : 'Salva Fornitore'}
                    </button>
                </div>
            </form>
        </div>
    );
};