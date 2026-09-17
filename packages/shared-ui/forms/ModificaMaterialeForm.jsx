import React, { useState, useEffect } from 'react';
import { 
    ArrowLeftIcon, 
    CubeIcon, 
    ExclamationTriangleIcon, 
    CurrencyEuroIcon,
    MapPinIcon,
    Bars3BottomLeftIcon,
    QrCodeIcon,
    TagIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline';

export const ModificaMaterialeForm = ({ 
    initialData, 
    onBack, 
    onSaveSuccess, 
    updateMateriale, 
    isSaving,
    fornitoriList = []
}) => {
    
    const [formData, setFormData] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    // Pre-popoliamo il form con i dati esistenti quando si apre
    useEffect(() => {
        if (initialData) {
            setFormData({
                nomeGenerico: initialData.nomeGenerico || initialData.nome || '',
                specifiche: initialData.specifiche || '',
                marca: initialData.marca || '',
                codice: initialData.codice || initialData.dettagli?.codice || '',
                descrizione: initialData.descrizione || initialData.dettagli?.descrizione || '',
                categoria: initialData.categoria || 'Altro',
                quantita: initialData.quantita || 0,
                unitaMisura: initialData.unitaMisura || 'pz',
                sogliaMinima: initialData.sogliaMinima || 0,
                costoUnitario: initialData.costoUnitario || 0,
                fornitore: initialData.fornitore || '',
                posizioneMagazzino: initialData.posizioneMagazzino || ''
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        // Ricompone il nome esteso in caso di modifiche a marca/specifiche
        let nomeEsteso = `${formData.nomeGenerico?.trim()} ${formData.marca?.trim()} ${formData.specifiche?.trim()}`.replace(/\s+/g, ' ').trim();
        if (!nomeEsteso) nomeEsteso = formData.nomeGenerico;

        const datiDaSalvare = {
            nome: nomeEsteso, 
            nomeGenerico: formData.nomeGenerico?.trim() || '',
            specifiche: formData.specifiche?.trim() || '',
            marca: formData.marca?.trim() || '',
            codice: formData.codice?.trim() || '',
            descrizione: formData.descrizione?.trim() || '',
            categoria: formData.categoria,
            unitaMisura: formData.unitaMisura,
            quantita: parseFloat(formData.quantita) || 0,
            sogliaMinima: parseFloat(formData.sogliaMinima) || 0,
            costoUnitario: parseFloat(formData.costoUnitario) || 0,
            fornitore: formData.fornitore?.trim() || '',
            posizioneMagazzino: formData.posizioneMagazzino?.trim() || '',
            dettagli: { 
                ...initialData.dettagli, // Mantiene vecchi dettagli se presenti
                codice: formData.codice?.trim() || '',
                descrizione: formData.descrizione?.trim() || ''
            } 
        };

        const result = await updateMateriale(initialData.id, datiDaSalvare);

        if (result && result.success) {
            if (onSaveSuccess) onSaveSuccess("Materiale aggiornato con successo!");
        } else {
            setErrorMessage(result?.message || "Errore sconosciuto durante l'aggiornamento.");
        }
    };

    if (!formData.nomeGenerico && !formData.nome) return null;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            
            <button type="button" onClick={onBack} disabled={isSaving} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition-colors disabled:opacity-50">
                <ArrowLeftIcon className="h-5 w-5" /> Torna all'Inventario
            </button>
            
            <div className="border-b border-slate-200 pb-4 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <PencilSquareIcon className="h-8 w-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Modifica Materiale</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Aggiorna anagrafica, prezzi e posizione in magazzino.</p>
                </div>
            </div>

            {errorMessage && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold shadow-sm">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 pt-2">
                
                {/* --- 1. IDENTIFICAZIONE AVANZATA --- */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <TagIcon className="h-5 w-5 text-indigo-500" /> Identificazione Articolo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Nome Generico" name="nomeGenerico" value={formData.nomeGenerico} onChange={handleChange} required />
                        <InputField label="Specifiche / Misura" name="specifiche" value={formData.specifiche} onChange={handleChange} />
                        <InputField label="Marca / Produttore" name="marca" value={formData.marca} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <QrCodeIcon className="h-4 w-4" /> Codice Articolo / SKU
                            </label>
                            <input type="text" name="codice" value={formData.codice} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white transition-all text-sm font-medium"/>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoria <span className="text-red-500">*</span></label>
                            <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-sm font-medium" required>
                                <option value="Materiale Elettrico">Materiale Elettrico</option>
                                <option value="Materiale Idraulico">Materiale Idraulico</option>
                                <option value="Edilizia">Edilizia (Cemento, Sabbia...)</option>
                                <option value="Ferramenta">Ferramenta (Viti, Bulloni...)</option>
                                <option value="Chimici">Chimici e Vernici</option>
                                <option value="Altro">Altro / Varie</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unità di Misura <span className="text-red-500">*</span></label>
                            <select name="unitaMisura" value={formData.unitaMisura} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-sm font-medium" required>
                                <option value="pz">Pezzi (pz)</option>
                                <option value="scatola">Scatole (cf / box)</option>
                                <option value="kg">Chilogrammi (kg)</option>
                                <option value="L">Litri (L)</option>
                                <option value="m">Metri Lineari (m)</option>
                                <option value="mq">Metri Quadri (mq)</option>
                            </select>
                        </div>
                        
                        <div className="md:col-span-3 mt-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Bars3BottomLeftIcon className="h-4 w-4" /> Note Aggiuntive / Descrizione Estesa
                            </label>
                            <textarea name="descrizione" value={formData.descrizione} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white transition-all text-sm font-medium min-h-[60px]" />
                        </div>
                    </div>
                </div>

                {/* --- 2. GIACENZA E SOTTOSCORTA --- */}
                <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
                        <ExclamationTriangleIcon className="h-5 w-5" /> Allineamento Giacenza
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label={`Giacenza Attuale (${formData.unitaMisura})`} name="quantita" type="number" value={formData.quantita} onChange={handleChange} required />
                        <div>
                            <InputField label={`Nuova Soglia di Riordino (${formData.unitaMisura})`} name="sogliaMinima" type="number" value={formData.sogliaMinima} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* --- 3. VALORI ECONOMICI E LOGISTICA --- */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Acquisto e Posizionamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <CurrencyEuroIcon className="h-4 w-4 text-emerald-500"/> Costo Unitario
                            </label>
                            <input type="number" step="any" name="costoUnitario" value={formData.costoUnitario} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fornitore Abituale</label>
                            <input type="text" list="lista-fornitori-mod" name="fornitore" value={formData.fornitore} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all"/>
                            <datalist id="lista-fornitori-mod">
                                {fornitoriList.map(f => {
                                    const n = f.ragioneSociale || f.nome || f.nomeFornitore;
                                    return n ? <option key={f.id} value={n} /> : null;
                                })}
                            </datalist>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <MapPinIcon className="h-4 w-4 text-slate-400"/> Posizione in Magazzino
                            </label>
                            <input type="text" name="posizioneMagazzino" value={formData.posizioneMagazzino} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all"/>
                        </div>
                    </div>
                </div>

                {/* --- BOTTONI --- */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button type="button" onClick={onBack} disabled={isSaving} className="py-2.5 px-6 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
                        Annulla
                    </button>
                    <button type="submit" disabled={isSaving} className="py-2.5 px-6 text-white rounded-xl font-bold transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg disabled:bg-slate-400 transform active:scale-95">
                        {isSaving ? 'Salvataggio in corso...' : 'Salva Modifiche'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const InputField = ({ label, name, type = 'text', value, onChange, required = false, placeholder = '' }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} step={type === 'number' ? "any" : undefined} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all" />
    </div>
);