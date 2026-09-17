import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/themeContext.jsx'; 
import { ArrowLeftIcon, LinkIcon, TruckIcon, WrenchScrewdriverIcon, CogIcon, ShieldCheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';

export const AggiungiAttrezzaturaForm = ({ 
    onBack, 
    onSaveSuccess, 
    addAttrezzatura, 
    addScadenza, 
    isAdding,
    ddtList = [],
    ordiniList = []
}) => {
    
    const { primaryColor, colorClasses } = useTheme();
    
    const [categoria, setCategoria] = useState('');
    const [formData, setFormData] = useState({
        nome: '', marca: '', modello: '', seriale: '', annoFabbricazione: '',
        costoAcquisto: '', costoGiornaliero: '', 
        targa: '', km: '', alimentazione: 'Diesel', scadenzaAssicurazione: '', scadenzaBollo: '',
        oreMoto: '', pesoPortata: '', scadenzaInail: '', 
        dataScadenzaDPI: '', richiedeRevisione: false, mesiRevisione: 12,
        programmazioneManutenzioni: [], 
        ddtId: '', ordineId: ''
    });
    
    const [documentoFile, setDocumentoFile] = useState(null);
    const [message, setMessage] = useState('');

    const ddtFiltrati = useMemo(() => ddtList.filter(d => d.tipoOggetto === 'attrezzatura'), [ddtList]);
    const ordiniFiltrati = useMemo(() => ordiniList.filter(o => o.tipoOggetto === 'attrezzatura'), [ordiniList]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e) => { if (e.target.files[0]) setDocumentoFile(e.target.files[0]); };

    const handleDDTChange = (e) => {
        const selectedDDTId = e.target.value;
        const selectedDDT = ddtList.find(d => d.id === selectedDDTId);
        let newOrdineId = formData.ordineId;
        if (selectedDDT && selectedDDT.ordineId) newOrdineId = selectedDDT.ordineId;
        setFormData(prev => ({ ...prev, ddtId: selectedDDTId, ordineId: newOrdineId }));
    };

    const handleAddManutenzione = () => {
        setFormData(prev => ({ ...prev, programmazioneManutenzioni: [ ...prev.programmazioneManutenzioni, { id: Date.now(), tipoScadenza: 'Tagliando Motore', primaScadenzaTagliando: '', mesiTagliando: 12, kmTagliando: '' } ] }));
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

        const costoG = formData.costoGiornaliero ? parseFloat(formData.costoGiornaliero) : 0;
        const costoH = costoG > 0 ? costoG / 8 : 0;
        const costoAcq = formData.costoAcquisto ? parseFloat(formData.costoAcquisto) : 0;

        const datiDaSalvare = {
            nome: `${formData.marca} ${formData.modello} ${formData.nome}`.trim(),
            seriale: formData.seriale || formData.targa, 
            categoria: categoria,
            tipoArticolo: 'attrezzatura', 
            
            // ✅ SALVATAGGIO ROOT
            costoGiornaliero: costoG,
            costoOrario: costoH, 
            costoAcquisto: costoAcq,
            
            stato: 'disponibile',
            ddtId: formData.ddtId || null,
            ordineId: formData.ordineId || null,
            
            // ✅ SALVATAGGIO ESPLICITO NEI DETTAGLI
            dettagli: { 
                ...formData,
                costoGiornaliero: costoG,
                costoOrario: costoH,
                costoAcquisto: costoAcq
            }
        };

        delete datiDaSalvare.dettagli.ddtId;
        delete datiDaSalvare.dettagli.ordineId;

        const result = await addAttrezzatura(datiDaSalvare, documentoFile);

        if (result && result.success) {
            const nuovoAssetId = result.id || (result.data && result.data.id) || null;

            if (nuovoAssetId && addScadenza) {
                if (categoria !== 'DPI' && formData.programmazioneManutenzioni?.length > 0) {
                    for (const man of formData.programmazioneManutenzioni) {
                        if (man.primaScadenzaTagliando) {
                            await addScadenza({ mezzoId: nuovoAssetId, nomeMezzo: datiDaSalvare.nome, targaMezzo: formData.targa || formData.seriale || '', tipoScadenza: man.tipoScadenza, dataScadenza: man.primaScadenzaTagliando, ricorrenzaMesi: parseInt(man.mesiTagliando, 10) || null, ricorrenzaKm: man.kmTagliando ? parseInt(man.kmTagliando, 10) : null, note: `Scadenza programmata all'inserimento dell'asset. Tipo: ${man.tipoScadenza}` });
                        }
                    }
                }
                if (categoria === 'Automezzo' && formData.scadenzaBollo) await addScadenza({ mezzoId: nuovoAssetId, nomeMezzo: datiDaSalvare.nome, targaMezzo: formData.targa, tipoScadenza: 'Bollo Auto', dataScadenza: formData.scadenzaBollo, ricorrenzaMesi: 12, note: 'Tassa di proprietà.' });
                if (['Automezzo', 'Macchina Operatrice'].includes(categoria) && formData.scadenzaAssicurazione) await addScadenza({ mezzoId: nuovoAssetId, nomeMezzo: datiDaSalvare.nome, targaMezzo: formData.targa || formData.seriale, tipoScadenza: 'Assicurazione', dataScadenza: formData.scadenzaAssicurazione, ricorrenzaMesi: 12, note: 'Polizza RCA/Kasko.' });
                if (categoria === 'Macchina Operatrice' && formData.scadenzaInail) await addScadenza({ mezzoId: nuovoAssetId, nomeMezzo: datiDaSalvare.nome, targaMezzo: formData.seriale, tipoScadenza: 'Verifica Periodica INAIL/CE', dataScadenza: formData.scadenzaInail, ricorrenzaMesi: 12, note: 'Verifica obbligatoria di legge.' });
            }
            onSaveSuccess("Asset e scadenze registrati con successo!");
        } else {
            setMessage(result?.message || "Errore sconosciuto durante il salvataggio.");
        }
    };

    const formatDate = (d) => d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString() : '';

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto mb-10">
            <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} mb-4 hover:underline font-bold`}>
                <ArrowLeftIcon className="h-4 w-4" /> Torna alla Lista
            </button>
            
            <div className="border-b pb-4">
                <h2 className="text-2xl font-black text-gray-800">Nuovo Bene / Asset</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                    <label className="block text-slate-800 font-black mb-2 text-sm uppercase tracking-wider">Qual è la tipologia del bene?</label>
                    <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setFormData(prev => ({...prev, nome: '', seriale: ''})); }} className="w-full p-3 border border-slate-300 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500" required>
                        <option value="">-- Seleziona Tipologia --</option>
                        <option value="Automezzo">🚐 Automezzo Stradale</option>
                        <option value="Macchina Operatrice">🚜 Macchina Operatrice</option>
                        <option value="Attrezzatura Generica">🛠️ Attrezzatura</option>
                        <option value="DPI">🦺 Dispositivo di Sicurezza (DPI)</option>
                    </select>
                </div>

                {categoria && (
                    <div className="animate-fade-in-up space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Definizione / Nome Bene" name="nome" value={formData.nome} onChange={handleChange} required />
                            <InputField label="Marca" name="marca" value={formData.marca} onChange={handleChange} />
                            <InputField label="Modello" name="modello" value={formData.modello} onChange={handleChange} />
                            <InputField label={['Automezzo', 'Macchina Operatrice'].includes(categoria) ? "Telaio / Matricola" : "Seriale / Matricola"} name="seriale" value={formData.seriale} onChange={handleChange} required />
                            <InputField label="Anno di Fabbricazione" name="annoFabbricazione" type="number" value={formData.annoFabbricazione} onChange={handleChange} />
                        </div>

                        {categoria === 'Automezzo' && (
                            <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 space-y-4">
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
                            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 space-y-4">
                                <h3 className="font-black text-emerald-800 flex items-center gap-2 border-b border-emerald-200 pb-2"><CogIcon className="h-5 w-5"/> Dati Macchinario Pesante</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField label="Targa Stradale" name="targa" value={formData.targa} onChange={handleChange} />
                                    <InputField label="Ore di Moto" name="oreMoto" type="number" value={formData.oreMoto} onChange={handleChange} />
                                    <InputField label="Portata Massima" name="pesoPortata" value={formData.pesoPortata} onChange={handleChange} />
                                    <InputField label="Scad. INAIL / CE" name="scadenzaInail" type="date" value={formData.scadenzaInail} onChange={handleChange} />
                                </div>
                            </div>
                        )}

                        {categoria === 'DPI' && (
                            <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 space-y-4">
                                <h3 className="font-black text-orange-800 flex items-center gap-2 border-b border-orange-200 pb-2"><ShieldCheckIcon className="h-5 w-5"/> Sicurezza e Revisioni</h3>
                                <InputField label="Data Scadenza (Vita Utile)" name="dataScadenzaDPI" type="date" value={formData.dataScadenzaDPI} onChange={handleChange} required />
                                <div className="p-4 bg-white rounded-lg border border-orange-200 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="richiedeRevisione" checked={formData.richiedeRevisione} onChange={handleChange} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                                        <span className="font-bold text-gray-700">Richiede ispezione periodica?</span>
                                    </label>
                                    {formData.richiedeRevisione && (
                                        <InputField label="Ispezione ogni (Mesi)" name="mesiRevisione" type="number" value={formData.mesiRevisione} onChange={handleChange} required />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ✅ VALORI ECONOMICI */}
                        {categoria !== 'DPI' && (
                            <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4 mt-6">
                                <h3 className="font-bold text-indigo-900 border-b border-indigo-200 pb-2">Valori Economici e Ammortamento</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <InputField label="Costo d'Acquisto Totale" name="costoAcquisto" type="number" value={formData.costoAcquisto || ''} onChange={handleChange} />
                                        <span className="absolute right-3 top-9 text-slate-400 font-bold">€</span>
                                    </div>
                                    <div className="relative">
                                        <InputField label="Costo Giornaliero Nolo Interno" name="costoGiornaliero" type="number" value={formData.costoGiornaliero || ''} onChange={handleChange} />
                                        <span className="absolute right-3 top-9 text-slate-400 font-bold">€/gg</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {categoria !== 'DPI' && (
                            <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <h3 className="font-black text-slate-700 text-sm flex items-center gap-2"><WrenchScrewdriverIcon className="h-5 w-5 text-slate-500" /> Officina e Scadenze</h3>
                                    <button type="button" onClick={handleAddManutenzione} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-1 shadow-sm transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi</button>
                                </div>

                                {formData.programmazioneManutenzioni.length === 0 ? (
                                    <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center"><p className="text-sm text-slate-500 font-medium">Nessuna manutenzione programmata.</p></div>
                                ) : (
                                    <div className="space-y-3">
                                        {formData.programmazioneManutenzioni.map((man, index) => (
                                            <div key={man.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <button type="button" onClick={() => handleRemoveManutenzione(man.id)} className="absolute top-3 right-3 p-1.5 bg-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                                
                                                <div className="md:col-span-2 pr-10">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo (Fase {index + 1})</label>
                                                    <select value={man.tipoScadenza} onChange={(e) => handleManutenzioneChange(man.id, 'tipoScadenza', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium">
                                                        <optgroup label="Strada / Automezzi"><option value="Tagliando Motore">Tagliando Motore</option><option value="Revisione Stradale MCTC">Revisione Stradale MCTC</option><option value="Cambio Gomme">Cambio Gomme</option><option value="Controllo Freni">Controllo Freni</option></optgroup>
                                                        <optgroup label="Macchine Operatrici"><option value="Collaudo INAIL">Collaudo INAIL</option><option value="Controllo Funi e Catene">Controllo Funi</option><option value="Verifica Strutturale">Verifica Strutturale</option></optgroup>
                                                    </select>
                                                </div>

                                                <InputField label="Data Prossima" name="primaScadenzaTagliando" type="date" value={man.primaScadenzaTagliando} onChange={(e) => handleManutenzioneChange(man.id, 'primaScadenzaTagliando', e.target.value)} required />
                                                <InputField label="Frequenza (Mesi)" name="mesiTagliando" type="number" value={man.mesiTagliando} onChange={(e) => handleManutenzioneChange(man.id, 'mesiTagliando', e.target.value)} required />

                                                {categoria === 'Automezzo' && (
                                                    <div className="w-full md:col-span-2 mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 font-medium">Ripeti ogni (Km):</span>
                                                        <input type="number" value={man.kmTagliando || ''} onChange={(e) => handleManutenzioneChange(man.id, 'kmTagliando', e.target.value)} className="w-32 p-2 border border-indigo-200 rounded-lg text-sm font-bold"/>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white p-5 rounded-xl border border-dashed border-slate-300 space-y-4">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><LinkIcon className="h-4 w-4 text-slate-400"/> Tracciabilità Acquisto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Da DDT d'Ingresso</label>
                                    <select name="ddtId" value={formData.ddtId} onChange={handleDDTChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white">
                                        <option value="">-- Nessun DDT selezionato --</option>
                                        {ddtFiltrati.map(ddt => <option key={ddt.id} value={ddt.id}>{formatDate(ddt.createdAt)} - {ddt.nomeCantiere}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Da Ordine d'Acquisto</label>
                                    <select name="ordineId" value={formData.ordineId} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white">
                                        <option value="">-- Nessun Ordine selezionato --</option>
                                        {ordiniFiltrati.map(ord => <option key={ord.id} value={ord.id}>{ord.numeroOrdine} - {ord.nomeFornitore}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Allega Documentazione</label>
                                <input type="file" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>
                            </div>
                        </div>
                    </div>
                )}

                {message && <div className={`p-4 rounded-lg text-sm font-bold text-center ${message.includes('successo') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message}</div>}

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button type="button" onClick={onBack} className="py-2.5 px-6 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold">Annulla</button>
                    <button type="submit" disabled={isAdding || !categoria} className="py-2.5 px-8 text-white rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                        {isAdding ? 'Salvataggio in corso...' : 'Salva nel Database'}
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
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800" required={required} step={type === 'number' ? "0.01" : undefined} />
    </div>
);