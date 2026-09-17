import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, InformationCircleIcon, WrenchScrewdriverIcon, TruckIcon, CogIcon, ShieldCheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'; 

export const ModificaArticoloForm = ({ 
    initialData, 
    onBack, 
    onSaveSuccess, 
    updateArticolo, 
    addScadenza, 
    isLoading 
}) => {
    
    const [message, setMessage] = useState('');
    const categoria = initialData?.categoria || 'Attrezzatura Generica';

    const getInitialFormData = () => {
        const det = initialData?.dettagli || {};
        
        // Cerca il costo giornaliero, se non lo trova converte il vecchio costo orario moltiplicandolo per 8
        let costoGiornCalcolato = '';
        if (initialData?.costoGiornaliero) costoGiornCalcolato = initialData.costoGiornaliero;
        else if (det.costoGiornaliero) costoGiornCalcolato = det.costoGiornaliero;
        else if (initialData?.costoOrario) costoGiornCalcolato = Number(initialData.costoOrario) * 8;
        else if (det.costoOrario) costoGiornCalcolato = Number(det.costoOrario) * 8;

        return {
            nomeGenerico: det.nomeGenerico || initialData?.nome || '', 
            marca: det.marca || '',
            modello: det.modello || '',
            seriale: initialData?.seriale || det.seriale || det.targa || '',
            annoFabbricazione: det.annoFabbricazione || '',
            
            targa: det.targa || '',
            km: det.km || '',
            alimentazione: det.alimentazione || 'Diesel',
            scadenzaBollo: det.scadenzaBollo || '',
            scadenzaAssicurazione: det.scadenzaAssicurazione || '',
            
            oreMoto: det.oreMoto || '',
            pesoPortata: det.pesoPortata || '',
            scadenzaInail: det.scadenzaInail || '',

            dataScadenzaDPI: initialData?.dataScadenza || det.dataScadenzaDPI || '',
            richiedeRevisione: initialData?.richiedeRevisione || det.richiedeRevisione || false,
            mesiRevisione: initialData?.mesiRevisione || det.mesiRevisione || 12,
            
            programmazioneManutenzioni: det.programmazioneManutenzioni || [], 

            // ✅ VALORI ECONOMICI NATIVI
            costoGiornaliero: costoGiornCalcolato,
            costoAcquisto: initialData?.costoAcquisto || det.costoAcquisto || '',
        };
    };

    const [formData, setFormData] = useState(getInitialFormData());

    useEffect(() => {
        setFormData(getInitialFormData());
        setMessage('');
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleAddManutenzione = () => {
        setFormData(prev => ({
            ...prev,
            programmazioneManutenzioni: [
                ...prev.programmazioneManutenzioni,
                { id: Date.now(), tipoScadenza: 'Tagliando Motore', primaScadenzaTagliando: '', mesiTagliando: 12, kmTagliando: '', isNew: true }
            ]
        }));
    };

    const handleRemoveManutenzione = (id) => {
        setFormData(prev => ({ ...prev, programmazioneManutenzioni: prev.programmazioneManutenzioni.filter(m => m.id !== id) }));
    };

    const handleManutenzioneChange = (id, field, value) => {
        setFormData(prev => ({ ...prev, programmazioneManutenzioni: prev.programmazioneManutenzioni.map(m => m.id === id ? { ...m, [field]: value } : m) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        
        const nomeEsteso = `${formData.marca || ''} ${formData.modello || ''} ${formData.nomeGenerico || ''}`.trim();

        // Calcoli per ammortamento
        const costoG = formData.costoGiornaliero ? parseFloat(formData.costoGiornaliero) : 0;
        const costoH = costoG > 0 ? costoG / 8 : 0;
        const costoAcq = formData.costoAcquisto ? parseFloat(formData.costoAcquisto) : 0;

        const datiDaSalvare = {
            id: initialData.id, // Forziamo l'ID dentro l'oggetto per sicurezza
            nome: nomeEsteso || formData.nomeGenerico,
            seriale: formData.seriale || formData.targa,
            
            // ✅ ORA SALVERA' CORRETTAMENTE ALLA ROOT (Grazie allo schema.js aggiornato)
            costoGiornaliero: costoG,
            costoOrario: costoH,
            costoAcquisto: costoAcq,
            
            ...(categoria === 'DPI' && formData.dataScadenzaDPI ? { dataScadenza: formData.dataScadenzaDPI } : {}),
            ...(categoria === 'DPI' && formData.richiedeRevisione ? { richiedeRevisione: true, mesiRevisione: parseInt(formData.mesiRevisione, 10) } : { richiedeRevisione: false }),

            dettagli: { 
                ...(initialData?.dettagli || {}),
                nomeGenerico: formData.nomeGenerico, marca: formData.marca, modello: formData.modello, annoFabbricazione: formData.annoFabbricazione,
                targa: formData.targa, km: formData.km, alimentazione: formData.alimentazione, scadenzaBollo: formData.scadenzaBollo, scadenzaAssicurazione: formData.scadenzaAssicurazione,
                oreMoto: formData.oreMoto, pesoPortata: formData.pesoPortata, scadenzaInail: formData.scadenzaInail,
                programmazioneManutenzioni: formData.programmazioneManutenzioni.map(m => ({...m, isNew: false})),
                
                // Salviamo anche nei dettagli come paracadute
                costoGiornaliero: costoG,
                costoOrario: costoH,
                costoAcquisto: costoAcq
            }
        };

        delete datiDaSalvare.dettagli.seriale;
        if (categoria === 'DPI') {
            delete datiDaSalvare.dettagli.dataScadenzaDPI;
            delete datiDaSalvare.dettagli.richiedeRevisione;
            delete datiDaSalvare.dettagli.mesiRevisione;
        }

        try {
            // ✅ FIX SALVATAGGIO: Passiamo DIRETTAMENTE l'oggetto (il parent estrarrà l'ID o lo ha già memorizzato)
            const result = await updateArticolo(datiDaSalvare);
            
            if (result && result.success === false) {
                setMessage("Errore durante il salvataggio: " + result.message);
                return;
            }

            if (addScadenza && categoria !== 'DPI' && formData.programmazioneManutenzioni?.length > 0) {
                for (const man of formData.programmazioneManutenzioni) {
                    if (man.isNew && man.primaScadenzaTagliando) {
                        await addScadenza({
                            mezzoId: initialData.id, nomeMezzo: nomeEsteso || formData.nomeGenerico, targaMezzo: formData.targa || formData.seriale || '',
                            tipoScadenza: man.tipoScadenza, dataScadenza: man.primaScadenzaTagliando,
                            ricorrenzaMesi: parseInt(man.mesiTagliando, 10) || null, ricorrenzaKm: man.kmTagliando ? parseInt(man.kmTagliando, 10) : null,
                            note: `Scadenza aggiunta in fase di modifica asset. Tipo: ${man.tipoScadenza}`
                        });
                    }
                }
            }

            onSaveSuccess("Asset aggiornato con successo!");
            
        } catch (error) {
            setMessage("Errore di sistema: " + error.message);
        }
    };
    
    const isOldFormat = !initialData?.dettagli?.marca && !initialData?.dettagli?.modello;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl mx-auto animate-fade-in border border-slate-200">
             <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 mb-6 hover:text-indigo-800 font-bold transition-colors">
                <ArrowLeftIcon className="h-4 w-4" /> Torna all'Inventario
            </button>
            
            <div className="border-b border-slate-200 pb-4 mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Modifica Asset</h2>
                <p className="text-slate-500 font-medium text-sm mt-1">Aggiorna le specifiche, i valori economici e le scadenze.</p>
            </div>
            
            {message && <div className={`p-4 mb-6 rounded-xl text-sm font-bold shadow-sm ${message.includes('Errore') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{message}</div>}

            {isOldFormat && (
                <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 flex gap-3 shadow-sm">
                    <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">
                        Questo è un asset di <strong>vecchia generazione</strong>. Tutto il nome è stato inserito in "Nome Generico". Taglia le informazioni della Marca e del Modello e incollale nei nuovi campi sottostanti.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                    <h3 className="font-bold text-slate-800">Categoria Asset</h3>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg uppercase tracking-wider">{categoria}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <InputField label="Definizione / Nome Generico" name="nomeGenerico" value={formData.nomeGenerico || ''} onChange={handleChange} required />
                    </div>
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Modello" name="modello" value={formData.modello || ''} onChange={handleChange} />
                    <InputField label={['Automezzo', 'Macchina Operatrice'].includes(categoria) ? "Telaio / Matricola" : "Seriale / Matricola"} name="seriale" value={formData.seriale || ''} onChange={handleChange} required />
                    <InputField label="Anno Fabbricazione" name="annoFabbricazione" type="number" value={formData.annoFabbricazione || ''} onChange={handleChange} placeholder="YYYY" />
                </div>

                {categoria === 'Automezzo' && (
                    <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 space-y-4 mt-4">
                        <h3 className="font-black text-yellow-800 flex items-center gap-2 border-b border-yellow-200 pb-2"><TruckIcon className="h-5 w-5"/> Dati Veicolo Stradale</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Targa" name="targa" value={formData.targa} onChange={handleChange} required />
                            <InputField label="Chilometri Attuali" name="km" type="number" value={formData.km} onChange={handleChange} />
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alimentazione</label>
                                <select name="alimentazione" value={formData.alimentazione} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm font-medium">
                                    <option value="Diesel">Diesel</option>
                                    <option value="Benzina">Benzina</option>
                                    <option value="Metano/GPL">Metano / GPL</option>
                                    <option value="Ibrido">Ibrido</option>
                                    <option value="Elettrico">Elettrico</option>
                                </select>
                            </div>
                            <InputField label="Scadenza Bollo" name="scadenzaBollo" type="date" value={formData.scadenzaBollo} onChange={handleChange} />
                            <InputField label="Scad. Assicurazione" name="scadenzaAssicurazione" type="date" value={formData.scadenzaAssicurazione} onChange={handleChange} />
                        </div>
                    </div>
                )}

                {categoria === 'Macchina Operatrice' && (
                    <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 space-y-4 mt-4">
                        <h3 className="font-black text-emerald-800 flex items-center gap-2 border-b border-emerald-200 pb-2"><CogIcon className="h-5 w-5"/> Dati Macchinario Pesante</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Targa Stradale (Opzionale)" name="targa" value={formData.targa} onChange={handleChange} />
                            <InputField label="Ore di Moto Attuali" name="oreMoto" type="number" value={formData.oreMoto} onChange={handleChange} />
                            <InputField label="Peso / Portata Massima" name="pesoPortata" value={formData.pesoPortata} onChange={handleChange} />
                            <InputField label="Scad. Verifica INAIL / CE" name="scadenzaInail" type="date" value={formData.scadenzaInail} onChange={handleChange} />
                            <div className="md:col-span-2">
                                <InputField label="Scad. Assicurazione (Se assicurata)" name="scadenzaAssicurazione" type="date" value={formData.scadenzaAssicurazione} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                )}

                {categoria === 'DPI' && (
                    <div className="space-y-4 bg-orange-50/50 p-5 rounded-xl border border-orange-200 mt-4">
                        <h3 className="font-black text-orange-800 text-sm flex items-center gap-2 border-b border-orange-200 pb-2"><ShieldCheckIcon className="h-5 w-5"/> Gestione Scadenze DPI</h3>
                        <InputField label="Data Scadenza (Vita Utile Max)" name="dataScadenzaDPI" type="date" value={formData.dataScadenzaDPI || ''} onChange={handleChange} required />
                        
                        <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="richiedeRevisione" checked={formData.richiedeRevisione} onChange={handleChange} className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500" />
                                <span className="font-bold text-slate-700">Richiede Revisione Periodica (Cat. 3)</span>
                            </label>
                            {formData.richiedeRevisione && (
                                <div className="ml-8 animate-fade-in">
                                    <InputField label="Periodicità Revisione (in mesi)" name="mesiRevisione" type="number" value={formData.mesiRevisione} onChange={handleChange} required />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ DATI ECONOMICI - ORA SONO A GIORNATA! */}
                <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4 mt-6">
                    <h3 className="font-bold text-indigo-900 border-b border-indigo-200 pb-2">Valori Economici e Ammortamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <InputField label="Costo d'Acquisto Totale" name="costoAcquisto" type="number" value={formData.costoAcquisto || ''} onChange={handleChange} />
                            <span className="absolute right-3 top-9 text-slate-400 font-bold">€</span>
                        </div>
                        {categoria !== 'DPI' && (
                            <div className="relative">
                                <InputField label="Costo Giornaliero Nolo Interno" name="costoGiornaliero" type="number" value={formData.costoGiornaliero || ''} onChange={handleChange} />
                                <span className="absolute right-3 top-9 text-slate-400 font-bold">€/gg</span>
                            </div>
                        )}
                    </div>
                </div>

                {categoria !== 'DPI' && (
                    <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                                <WrenchScrewdriverIcon className="h-5 w-5 text-slate-500" /> Officina e Scadenze
                            </h3>
                            <button type="button" onClick={handleAddManutenzione} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-1 shadow-sm transition-colors">
                                <PlusIcon className="h-4 w-4"/> Aggiungi Programmazione
                            </button>
                        </div>

                        {formData.programmazioneManutenzioni.length === 0 ? (
                            <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center">
                                <p className="text-sm text-slate-500 font-medium">Nessuna manutenzione programmata su questo asset.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {formData.programmazioneManutenzioni.map((man, index) => (
                                    <div key={man.id} className={`bg-white p-4 rounded-lg border shadow-sm animate-fade-in relative grid grid-cols-1 md:grid-cols-2 gap-4 ${man.isNew ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}`}>
                                        {man.isNew && <span className="absolute top-3 left-4 text-[9px] font-black uppercase text-indigo-500 tracking-widest">Nuovo Intervento</span>}
                                        <div className="absolute top-3 right-3">
                                            <button type="button" onClick={() => handleRemoveManutenzione(man.id)} className="p-1.5 bg-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-colors" title="Rimuovi"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                        
                                        <div className={`md:col-span-2 pr-10 ${man.isNew ? 'mt-4' : ''}`}>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo di Controllo (Fase {index + 1})</label>
                                            <select value={man.tipoScadenza} onChange={(e) => handleManutenzioneChange(man.id, 'tipoScadenza', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none bg-slate-50 hover:bg-white">
                                                <optgroup label="Strada / Automezzi"><option value="Tagliando Motore">Tagliando Motore / Cambio Olio</option><option value="Revisione Stradale MCTC">Revisione Stradale (MCTC)</option><option value="Cambio Gomme">Cambio Gomme (Inverno/Estate)</option><option value="Controllo Freni">Controllo Freni</option></optgroup>
                                                <optgroup label="Macchine Operatrici / Sollevamento"><option value="Collaudo INAIL">Verifica Periodica INAIL / ASL</option><option value="Controllo Funi e Catene">Controllo Funi e Catene</option><option value="Verifica Strutturale">Verifica Strutturale Ventennale</option><option value="Impianto Idraulico">Manutenzione Impianto Idraulico</option></optgroup>
                                                <optgroup label="Generico"><option value="Manutenzione Ordinaria">Manutenzione Ordinaria (Pulizia/Ingrassaggio)</option><option value="Altro">Altro (Generico)</option></optgroup>
                                            </select>
                                        </div>

                                        <div className="w-full">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data Prossimo Intervento *</label>
                                            <input type="date" value={man.primaScadenzaTagliando} onChange={(e) => handleManutenzioneChange(man.id, 'primaScadenzaTagliando', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none" required={man.isNew} />
                                        </div>
                                        <div className="w-full">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frequenza (Mesi) *</label>
                                            <input type="number" value={man.mesiTagliando} onChange={(e) => handleManutenzioneChange(man.id, 'mesiTagliando', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-center outline-none" required={man.isNew} />
                                        </div>

                                        {categoria === 'Automezzo' && (
                                            <div className="w-full md:col-span-2 mt-1 pt-3 border-t border-slate-100">
                                                <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1.5">Soglia Chilometrica (Opzionale)</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-medium">Ripeti l'intervento anche ogni:</span>
                                                    <input type="number" placeholder="Es. 20000" value={man.kmTagliando || ''} onChange={(e) => handleManutenzioneChange(man.id, 'kmTagliando', e.target.value)} className="w-32 p-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-center text-indigo-700 outline-none"/>
                                                    <span className="text-xs font-bold text-indigo-700">Km</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button type="button" onClick={onBack} className="py-2.5 px-6 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm" disabled={isLoading}>Annulla</button>
                    <button type="submit" className="py-2.5 px-6 text-white rounded-xl font-bold transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg disabled:bg-slate-400 transform active:scale-95" disabled={isLoading}>
                        {isLoading ? 'Salvataggio in corso...' : 'Salva Modifiche'}
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
        <input 
            type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-slate-50 hover:bg-white focus:bg-white text-slate-800 font-medium" 
            required={required} step={type === 'number' ? "0.01" : undefined}
        />
    </div>
);