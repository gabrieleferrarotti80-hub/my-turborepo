import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftIcon, PlusIcon, TrashIcon, ShoppingCartIcon, WrenchScrewdriverIcon, CubeIcon } from '@heroicons/react/24/solid';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

export const PreventivoOrdineForm = ({
    onBack,
    onSave,
    initialData,
    fornitori = [],
    cantieri = [],
    isLoading,
    tipoDocumento = 'preventivo' 
}) => {
    
    const [formData, setFormData] = useState({
        tipoOggetto: 'materiale', // ✅ NUOVO: 'materiale' o 'attrezzatura'
        fornitoreId: '',
        nomeFornitore: '',
        dataDocumento: new Date().toISOString().split('T')[0],
        numeroDocumento: '', 
        cantiereId: '', // Sarà disabilitato/nascosto se 'attrezzatura'
        descrizione: '',
        righe: [{ descrizione: '', quantita: 1, prezzoUnitario: 0, totaleRiga: 0 }],
        iva: 22,
        totale: 0
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ 
                ...prev, 
                ...initialData,
                // Gestione date
                dataDocumento: initialData.dataDocumento?.toDate ? initialData.dataDocumento.toDate().toISOString().split('T')[0] : (initialData.dataDocumento || prev.dataDocumento),
                righe: initialData.righe?.length > 0 ? initialData.righe : prev.righe,
                // Default a materiale se non specificato (retrocompatibilità)
                tipoOggetto: initialData.tipoOggetto || 'materiale' 
            }));
        }
    }, [initialData]);

    const { imponibile, totaleCalcolato } = useMemo(() => {
        const imp = formData.righe.reduce((acc, riga) => acc + (Number(riga.totaleRiga) || 0), 0);
        const tot = imp * (1 + Number(formData.iva) / 100);
        return { imponibile: imp, totaleCalcolato: tot };
    }, [formData.righe, formData.iva]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ✅ Handler per il cambio tipo
    const handleTipoChange = (tipo) => {
        setFormData(prev => ({
            ...prev,
            tipoOggetto: tipo,
            cantiereId: tipo === 'attrezzatura' ? '' : prev.cantiereId // Resetta cantiere se attrezzatura
        }));
    };

    const handleFornitoreChange = (e) => {
        const id = e.target.value;
        const fornitore = fornitori.find(f => f.id === id);
        setFormData(prev => ({
            ...prev,
            fornitoreId: id,
            nomeFornitore: fornitore ? fornitore.ragioneSociale : ''
        }));
    };

    const handleRigaChange = (index, field, value) => {
        const newRighe = [...formData.righe];
        newRighe[index][field] = value;
        if (field === 'quantita' || field === 'prezzoUnitario') {
            const qta = Number(newRighe[index].quantita);
            const prz = Number(newRighe[index].prezzoUnitario);
            newRighe[index].totaleRiga = qta * prz;
        }
        setFormData(prev => ({ ...prev, righe: newRighe }));
    };

    const addRiga = () => {
        setFormData(prev => ({
            ...prev,
            righe: [...prev.righe, { descrizione: '', quantita: 1, prezzoUnitario: 0, totaleRiga: 0 }]
        }));
    };

    const removeRiga = (index) => {
        if (formData.righe.length > 1) {
            setFormData(prev => ({ ...prev, righe: prev.righe.filter((_, i) => i !== index) }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Se è attrezzatura, forza cantiere a null (va in magazzino)
        const cantiereFinale = formData.tipoOggetto === 'attrezzatura' ? '' : formData.cantiereId;
        
        onSave({
            ...formData,
            cantiereId: cantiereFinale,
            imponibile,
            totale: totaleCalcolato
        });
    };

    const title = tipoDocumento === 'preventivo' ? 'Registra Preventivo' : 'Ordine di Acquisto';
    const bgClass = tipoDocumento === 'preventivo' ? 'bg-orange-50' : 'bg-blue-50';
    const iconColor = tipoDocumento === 'preventivo' ? 'text-orange-600' : 'text-blue-600';

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Annulla</span>
            </button>

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className={`p-6 ${bgClass} border-b border-gray-200 flex items-center gap-3`}>
                    <ShoppingCartIcon className={`h-8 w-8 ${iconColor}`} />
                    <div>
                        <h1 className={`text-2xl font-bold ${iconColor}`}>{title}</h1>
                        <p className="text-gray-600 text-sm">Definisci la tipologia di acquisto e i dettagli.</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    
                    {/* ✅ SELETTORE TIPO OGGETTO */}
                    <div className="flex gap-4 border-b pb-4">
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${formData.tipoOggetto === 'materiale' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input type="radio" name="tipoOggetto" value="materiale" checked={formData.tipoOggetto === 'materiale'} onChange={() => handleTipoChange('materiale')} className="hidden" />
                            <CubeIcon className="h-5 w-5" />
                            <span className="font-bold">Materiale / Consumabile</span>
                        </label>

                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${formData.tipoOggetto === 'attrezzatura' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input type="radio" name="tipoOggetto" value="attrezzatura" checked={formData.tipoOggetto === 'attrezzatura'} onChange={() => handleTipoChange('attrezzatura')} className="hidden" />
                            <WrenchScrewdriverIcon className="h-5 w-5" />
                            <span className="font-bold">Attrezzatura / Asset</span>
                        </label>
                    </div>

                    {/* Testata */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fornitore *</label>
                            <select name="fornitoreId" value={formData.fornitoreId} onChange={handleFornitoreChange} className="w-full p-2 border rounded" required>
                                <option value="">-- Seleziona --</option>
                                {fornitori.map(f => <option key={f.id} value={f.id}>{f.ragioneSociale}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rif. Documento</label>
                            <input type="text" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Es. Prev. 123/2024" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                            <input type="date" name="dataDocumento" value={formData.dataDocumento} onChange={handleChange} className="w-full p-2 border rounded" required />
                        </div>
                    </div>

                    {/* Destinazione (Mostrata SOLO se Materiale) */}
                    {formData.tipoOggetto === 'materiale' ? (
                        <div className="p-4 bg-green-50 rounded border border-green-200">
                             <label className="block text-xs font-bold text-green-700 uppercase mb-1">Consegna Diretta in Cantiere (Opzionale)</label>
                             <select name="cantiereId" value={formData.cantiereId} onChange={handleChange} className="w-full p-2 border border-green-300 rounded">
                                <option value="">-- Nessuno (Scarico in Magazzino Centrale) --</option>
                                {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                            </select>
                            <p className="text-xs text-green-600 mt-1">Se selezioni un cantiere, il materiale verrà considerato consumato per quel lavoro.</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-indigo-50 rounded border border-indigo-200">
                            <p className="text-sm text-indigo-700 font-medium flex items-center gap-2">
                                <WrenchScrewdriverIcon className="h-4 w-4" />
                                Destinazione: Sede / Magazzino Centrale
                            </p>
                            <p className="text-xs text-indigo-500 mt-1">Le attrezzature devono essere immatricolate in magazzino prima di essere assegnate.</p>
                        </div>
                    )}

                    {/* Righe (Invariato) */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Articoli</h3>
                        <table className="min-w-full divide-y divide-gray-200 mb-2">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-500">Descrizione</th>
                                    <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 w-20">Q.tà</th>
                                    <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 w-32">Prezzo</th>
                                    <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 w-32">Totale</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {formData.righe.map((riga, index) => (
                                    <tr key={index}>
                                        <td className="p-2"><input type="text" value={riga.descrizione} onChange={(e) => handleRigaChange(index, 'descrizione', e.target.value)} className="w-full p-1 border rounded" /></td>
                                        <td className="p-2"><input type="number" value={riga.quantita} onChange={(e) => handleRigaChange(index, 'quantita', e.target.value)} className="w-full p-1 border rounded text-right" /></td>
                                        <td className="p-2"><input type="number" value={riga.prezzoUnitario} onChange={(e) => handleRigaChange(index, 'prezzoUnitario', e.target.value)} className="w-full p-1 border rounded text-right" step="0.01" /></td>
                                        <td className="p-2 text-right font-medium">{formatCurrency(riga.totaleRiga)}</td>
                                        <td className="p-2 text-center"><button type="button" onClick={() => removeRiga(index)} className="text-red-500"><TrashIcon className="h-4 w-4" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button type="button" onClick={addRiga} className="text-sm text-blue-600 font-semibold flex items-center gap-1"><PlusIcon className="h-4 w-4"/> Aggiungi Riga</button>
                    </div>

                    {/* Totali (Invariato) */}
                    <div className="flex justify-end">
                        <div className="w-1/3 space-y-2 text-right">
                            <p className="text-sm text-gray-600">Imponibile: {formatCurrency(imponibile)}</p>
                            <div className="flex justify-end items-center gap-2 text-sm text-gray-600">
                                <span>IVA %:</span>
                                <input type="number" name="iva" value={formData.iva} onChange={handleChange} className="w-16 p-1 border rounded text-right" />
                            </div>
                            <p className="text-xl font-bold text-gray-900 pt-2 border-t">Totale: {formatCurrency(totaleCalcolato)}</p>
                        </div>
                    </div>

                </div>

                <div className="p-6 bg-gray-50 border-t flex justify-end">
                    <button type="submit" disabled={isLoading} className={`px-6 py-3 text-white font-bold rounded shadow ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                        {isLoading ? 'Salvataggio...' : 'Salva Documento'}
                    </button>
                </div>
            </form>
        </div>
    );
};