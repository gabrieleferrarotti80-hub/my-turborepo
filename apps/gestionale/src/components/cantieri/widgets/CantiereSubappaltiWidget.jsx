import React, { useState, useMemo } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    PlusIcon, XMarkIcon, SparklesIcon, DocumentTextIcon, 
    ShieldCheckIcon, ArrowPathIcon, CheckIcon, PaperClipIcon, 
    PencilIcon, ClipboardDocumentCheckIcon 
} from '@heroicons/react/24/outline';

export const CantiereSubappaltiWidget = ({ cantiere, subappaltatori, fattureAcquisto, storage, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null); 
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});
    
    const [contrattoFile, setContrattoFile] = useState(null);
    const [posFile, setPosFile] = useState(null);
    const [authIngressoFile, setAuthIngressoFile] = useState(null);
    const [authSubappaltoFile, setAuthSubappaltoFile] = useState(null);
    const [documentoVarioFile, setDocumentoVarioFile] = useState(null); 

    const [activeCertificatoId, setActiveCertificatoId] = useState(null); 
    const [certForm, setCertForm] = useState({});

    const affidamenti = cantiere.subappalti || [];

    const dittaSelezionata = useMemo(() => {
        return subappaltatori.find(s => s.id === formData.subappaltatoreId);
    }, [formData.subappaltatoreId, subappaltatori]);

    const preventiviValidi = useMemo(() => {
        if (!dittaSelezionata || !dittaSelezionata.offerte) return [];
        return dittaSelezionata.offerte.filter(o => o.cantiereId === cantiere.id);
    }, [dittaSelezionata, cantiere.id]);

    const resetForm = () => {
        setIsAdding(false); setEditingId(null); setFormData({});
        setContrattoFile(null); setPosFile(null); setAuthIngressoFile(null);
        setAuthSubappaltoFile(null); setDocumentoVarioFile(null);
    };

    const handleEditClick = (aff) => {
        setFormData({
            subappaltatoreId: aff.subappaltatoreId, importo: aff.importo,
            descrizioneLavori: aff.descrizioneLavori || '', preventivoRiferimento: aff.preventivoRiferimento || '',
            preventivoAllegato: aff.preventivoAllegato || null, contratto: aff.contratto || null,
            pos: aff.pos || null, autorizzazioneIngresso: aff.autorizzazioneIngresso || null,
            autorizzazioneSubappalto: aff.autorizzazioneSubappalto || null, documentoVario: aff.documentoVario || null 
        });
        setEditingId(aff.id); setIsAdding(false);
        setContrattoFile(null); setPosFile(null); setAuthIngressoFile(null);
        setAuthSubappaltoFile(null); setDocumentoVarioFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveContratto = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let contrattoData = formData.contratto || null; 
            let posData = formData.pos || null;
            let authIngressoData = formData.autorizzazioneIngresso || null;
            let authSubappaltoData = formData.autorizzazioneSubappalto || null;
            let docVarioData = formData.documentoVario || null; 

            const uploadDoc = async (file, folder) => {
                const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileRef = ref(storage, `cantieri/${cantiere.id}/subappalti/${folder}/${Date.now()}_${safeName}`);
                await uploadBytes(fileRef, file);
                return { name: file.name, url: await getDownloadURL(fileRef) };
            };

            if (contrattoFile && storage) contrattoData = await uploadDoc(contrattoFile, 'contratti');
            if (posFile && storage) posData = await uploadDoc(posFile, 'pos');
            if (authIngressoFile && storage) authIngressoData = await uploadDoc(authIngressoFile, 'autorizzazioni_ingresso');
            if (authSubappaltoFile && storage) authSubappaltoData = await uploadDoc(authSubappaltoFile, 'autorizzazioni_subappalto');
            if (documentoVarioFile && storage) docVarioData = await uploadDoc(documentoVarioFile, 'documenti_vari'); 

            const payload = {
                subappaltatoreId: formData.subappaltatoreId,
                nomeDitta: dittaSelezionata ? dittaSelezionata.ragioneSociale : 'Ditta Sconosciuta',
                descrizioneLavori: formData.descrizioneLavori || '', preventivoRiferimento: formData.preventivoRiferimento || '',
                preventivoAllegato: formData.preventivoAllegato || null, importo: Number(formData.importo || 0),
                contratto: contrattoData, pos: posData, autorizzazioneIngresso: authIngressoData,
                autorizzazioneSubappalto: authSubappaltoData, documentoVario: docVarioData 
            };

            let updatedSubappalti;
            if (editingId) {
                updatedSubappalti = affidamenti.map(aff => aff.id === editingId ? { ...aff, ...payload } : aff);
            } else {
                payload.id = Date.now().toString(); payload.dataAffidamento = new Date().toISOString();
                payload.certificazioni = []; updatedSubappalti = [...affidamenti, payload];
            }

            await onUpdate({ subappalti: updatedSubappalti });
            resetForm();
        } catch (error) { console.error(error); alert("Errore salvataggio documenti."); } finally { setIsSaving(false); }
    };

    const rimuoviAffidamento = async (affidamentoId) => {
        if(!confirm("Sei sicuro?")) return;
        await onUpdate({ subappalti: affidamenti.filter(aff => aff.id !== affidamentoId) });
    };

    const handleSaveCertificazione = async (e, affidamentoId) => {
        e.preventDefault(); setIsSaving(true);
        try {
            const nuovaCertificazione = {
                id: Date.now().toString(), dataIngresso: certForm.dataIngresso,
                dataFinePrevista: certForm.dataFinePrevista, importoCertificato: Number(certForm.importoCertificato || 0),
                noteCollaudo: certForm.noteCollaudo || '', esito: certForm.esito || 'da_completare', 
                dataRegistrazione: new Date().toISOString()
            };
            const updatedSubappalti = affidamenti.map(aff => {
                if (aff.id === affidamentoId) return { ...aff, certificazioni: [...(aff.certificazioni || []), nuovaCertificazione] };
                return aff;
            });
            await onUpdate({ subappalti: updatedSubappalti });
            setActiveCertificatoId(null); setCertForm({});
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const eliminaCertificazione = async (affidamentoId, certId) => {
        if(!confirm("Eliminare?")) return;
        const updatedSubappalti = affidamenti.map(aff => {
            if (aff.id === affidamentoId) return { ...aff, certificazioni: aff.certificazioni.filter(c => c.id !== certId) };
            return aff;
        });
        await onUpdate({ subappalti: updatedSubappalti });
    };

    const renderFileField = (label, iconInfo, fieldName, fileState, setFileState) => (
        <div className={`p-3 rounded-lg border ${formData[fieldName] || fileState ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center gap-1.5">{iconInfo} {label}</label>
            {formData[fieldName] ? (
                <div className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 shadow-sm">
                    <a href={formData[fieldName].url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium hover:underline truncate max-w-[200px]" title={formData[fieldName].name}>{formData[fieldName].name}</a>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, [fieldName]: null }))} className="text-red-400 hover:text-red-600 p-1"><XMarkIcon className="h-4 w-4"/></button>
                </div>
            ) : (
                <input type="file" onChange={(e) => setFileState(e.target.files[0])} className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer" />
            )}
        </div>
    );

    return (
        <div className="space-y-6 p-4 md:p-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Affidamenti e Subappalti</h2>
                    <p className="text-sm text-gray-500">Gestisci contratti, autorizzazioni e certifica i lavori eseguiti.</p>
                </div>
                {!isAdding && !editingId && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors">
                        <PlusIcon className="h-5 w-5" /> Affida Lavoro
                    </button>
                )}
            </div>

            {(isAdding || editingId) && (
                <div className="bg-indigo-50/50 border border-indigo-200 p-6 rounded-xl shadow-sm animate-fade-in-down relative">
                    <button onClick={resetForm} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><XMarkIcon className="h-6 w-6"/></button>
                    <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">{editingId ? 'Modifica Contratto e Documenti' : 'Nuovo Affidamento in Subappalto'}</h3>
                    <form onSubmit={handleSaveContratto} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ditta Esecutrice *</label>
                                <select required value={formData.subappaltatoreId || ''} onChange={e => setFormData({...formData, subappaltatoreId: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 bg-white font-bold text-indigo-900">
                                    <option value="">-- Seleziona dall'Albo --</option>
                                    {subappaltatori.map(sub => <option key={sub.id} value={sub.id}>{sub.ragioneSociale} ({sub.categoria || 'Generico'})</option>)}
                                </select>
                            </div>
                            {preventiviValidi.length > 0 && (
                                <div className="md:col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-300 my-2">
                                    <label className="block text-xs font-bold text-yellow-800 uppercase mb-2 flex items-center gap-1"><SparklesIcon className="h-4 w-4"/> Preventivi trovati per questo cantiere</label>
                                    <select className="w-full rounded-md border-yellow-300 shadow-sm focus:ring-yellow-500 sm:text-sm bg-white cursor-pointer" onChange={(e) => { const off = preventiviValidi.find(o => o.id === e.target.value); if (off) setFormData(prev => ({ ...prev, importo: off.importo, descrizioneLavori: off.descrizione, preventivoRiferimento: `Preventivo del ${new Date(off.dataRicezione).toLocaleDateString()}`, preventivoAllegato: off.allegato || null })); }}>
                                        <option value="">-- Clicca per autocompilare --</option>
                                        {preventiviValidi.map(off => <option key={off.id} value={off.id}>{off.descrizione} - € {Number(off.importo).toLocaleString()} (del {new Date(off.dataRicezione).toLocaleDateString()})</option>)}
                                    </select>
                                </div>
                            )}
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrizione Lavori</label><input type="text" value={formData.descrizioneLavori || ''} onChange={e => setFormData({...formData, descrizioneLavori: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 sm:text-sm bg-white" /></div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Importo Contratto (€) *</label><input required type="number" step="0.01" min="0" value={formData.importo || ''} onChange={e => setFormData({...formData, importo: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 sm:text-sm font-bold text-indigo-700 bg-white" /></div>
                            
                            <div className="md:col-span-2 mt-4">
                                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-300 pb-2 mb-4">Gestione Documentale Fascicolo</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderFileField("Contratto Firmato", <DocumentTextIcon className="h-4 w-4"/>, "contratto", contrattoFile, setContrattoFile)}
                                    {renderFileField("POS Sicurezza", <ShieldCheckIcon className="h-4 w-4 text-green-600"/>, "pos", posFile, setPosFile)}
                                    {renderFileField("Autorizzazione Ingresso", <ArrowPathIcon className="h-4 w-4 text-orange-500"/>, "autorizzazioneIngresso", authIngressoFile, setAuthIngressoFile)}
                                    {renderFileField("Autorizzazione Subappalto", <CheckIcon className="h-4 w-4 text-blue-500"/>, "autorizzazioneSubappalto", authSubappaltoFile, setAuthSubappaltoFile)}
                                    {renderFileField("Altro Documento / Varie", <PaperClipIcon className="h-4 w-4 text-gray-500"/>, "documentoVario", documentoVarioFile, setDocumentoVarioFile)}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-indigo-200">
                            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium shadow-sm">Annulla</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold shadow-md">{isSaving ? 'Salvataggio...' : (editingId ? 'Salva Modifiche' : 'Registra Contratto')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {affidamenti.length === 0 && !isAdding && !editingId && (
                    <p className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">Nessun affidamento registrato in questo cantiere.</p>
                )}
                {affidamenti.map(aff => {
                    const fattureDellaDitta = fattureAcquisto.filter(f => f.cantiereId === cantiere.id && (f.fornitoreNome === aff.nomeDitta || f.fornitoreId === aff.subappaltatoreId));
                    const totaleFatturato = fattureDellaDitta.reduce((acc, f) => {
                        let imp = parseFloat(String(f.imponibile || f.prezzo).replace(',', '.'));
                        if (isNaN(imp) || imp === 0) { if (f.righe) imp = f.righe.reduce((rAcc, r) => rAcc + (parseFloat(String(r.totaleRiga || r.prezzoTotale || r.prezzo || 0).replace(',', '.')) || 0), 0); }
                        return acc + (imp || 0);
                    }, 0);
                    const certificazioni = aff.certificazioni || [];
                    const totaleCertificato = certificazioni.reduce((acc, cert) => acc + Number(cert.importoCertificato || 0), 0);
                    const percCertificata = aff.importo > 0 ? Math.min((totaleCertificato / aff.importo) * 100, 100) : 0;
                    const percFatturata = aff.importo > 0 ? Math.min((totaleFatturato / aff.importo) * 100, 100) : 0;
                    const allarmeFatturazione = totaleFatturato > totaleCertificato;

                    return (
                        <div key={aff.id} className={`bg-white rounded-2xl shadow-sm border ${allarmeFatturazione ? 'border-red-300 ring-2 ring-red-200' : 'border-gray-200'} overflow-hidden`}>
                            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start bg-gray-50/50 gap-4">
                                <div className="w-full">
                                    <div className="flex justify-between w-full">
                                        <h3 className="font-extrabold text-xl text-gray-900">{aff.nomeDitta}</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditClick(aff)} className="text-gray-400 hover:text-indigo-600 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors" title="Modifica Dati e Documenti"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => rimuoviAffidamento(aff.id)} className="text-gray-400 hover:text-red-500 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors" title="Rimuovi dal cantiere"><XMarkIcon className="h-5 w-5" /></button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 font-medium">{aff.descrizioneLavori || 'Nessuna descrizione lavori'}</p>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {aff.preventivoAllegato && <a href={aff.preventivoAllegato.url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-bold hover:bg-gray-200 border border-gray-200">📄 Preventivo</a>}
                                        {aff.contratto && <a href={aff.contratto.url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold hover:bg-blue-100 border border-blue-200">📄 Contratto</a>}
                                        {aff.pos ? <a href={aff.pos.url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold hover:bg-green-100 border border-green-200">✅ POS Sicurezza</a> : <span className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded-md font-bold border border-red-200">❌ Manca POS</span>}
                                        {aff.autorizzazioneIngresso && <a href={aff.autorizzazioneIngresso.url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-md font-bold hover:bg-orange-100 border border-orange-200">🚧 Aut. Ingresso</a>}
                                        {aff.autorizzazioneSubappalto && <a href={aff.autorizzazioneSubappalto.url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-bold hover:bg-purple-100 border border-purple-200">🤝 Aut. Subappalto</a>}
                                        {aff.documentoVario && <a href={aff.documentoVario.url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold hover:bg-gray-200 border border-gray-300">📎 Altro Doc.</a>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col lg:flex-row">
                                <div className="lg:w-1/3 p-5 border-r border-gray-100 space-y-4">
                                    <div><p className="text-xs text-gray-500 uppercase font-bold">1. Budget Contratto</p><p className="text-lg font-extrabold text-gray-900">€ {Number(aff.importo).toLocaleString()}</p></div>
                                    <div><p className="text-xs text-indigo-500 uppercase font-bold flex justify-between"><span>2. Lavori Certificati</span> <span>{percCertificata.toFixed(0)}%</span></p><p className="text-lg font-extrabold text-indigo-700">€ {totaleCertificato.toLocaleString()}</p><div className="w-full bg-gray-100 rounded-full h-1.5 mt-1"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percCertificata}%` }}></div></div></div>
                                    <div className="pt-2"><p className={`text-xs uppercase font-bold flex justify-between ${allarmeFatturazione ? 'text-red-600' : 'text-gray-500'}`}><span>3. Fatture Ricevute</span> <span>{percFatturata.toFixed(0)}%</span></p><p className={`text-lg font-extrabold ${allarmeFatturazione ? 'text-red-600' : 'text-gray-700'}`}>€ {totaleFatturato.toLocaleString()}</p><div className="w-full bg-gray-100 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full ${allarmeFatturazione ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${percFatturata}%` }}></div></div>{allarmeFatturazione && (<p className="text-[10px] font-bold text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">⚠️ BLOCCO PAGAMENTI: Hanno fatturato € {(totaleFatturato - totaleCertificato).toLocaleString()} in più rispetto ai lavori verificati in cantiere.</p>)}</div>
                                </div>
                                <div className="lg:w-2/3 p-5 bg-white">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardDocumentCheckIcon className="h-5 w-5 text-indigo-600"/> Verbali di Avanzamento (SAL)</h4>
                                        <button onClick={() => setActiveCertificatoId(activeCertificatoId === aff.id ? null : aff.id)} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors">{activeCertificatoId === aff.id ? 'Annulla' : '+ Registra Avanzamento'}</button>
                                    </div>
                                    {activeCertificatoId === aff.id && (
                                        <form onSubmit={(e) => handleSaveCertificazione(e, aff.id)} className="bg-gray-50 border border-indigo-100 rounded-xl p-4 mb-4 shadow-inner animate-fade-in-down">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Dal (Inizio) *</label><input required type="date" value={certForm.dataIngresso || ''} onChange={e => setCertForm({...certForm, dataIngresso: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1" /></div>
                                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Al (Fine Fase) *</label><input required type="date" value={certForm.dataFinePrevista || ''} onChange={e => setCertForm({...certForm, dataFinePrevista: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1" /></div>
                                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Valore Lavori Eseguiti (€) *</label><input required type="number" step="0.01" min="0" value={certForm.importoCertificato || ''} onChange={e => setCertForm({...certForm, importoCertificato: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1 font-bold text-indigo-700" /></div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Esito Ispezione *</label>
                                                    <select required value={certForm.esito || 'da_completare'} onChange={e => setCertForm({...certForm, esito: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1 font-medium"><option value="positivo">✅ Lavori conformi - Autorizzo Pagamento</option><option value="da_completare">⏳ Lavori ancora in corso</option><option value="contestato">❌ Contestazione - NON PAGARE</option></select>
                                                </div>
                                                <div className="md:col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase">Note / Difetti riscontrati</label><input type="text" value={certForm.noteCollaudo || ''} onChange={e => setCertForm({...certForm, noteCollaudo: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1" placeholder="Es. Posa completata, in attesa di pulizia..." /></div>
                                            </div>
                                            <div className="mt-3 flex justify-end"><button type="submit" disabled={isSaving} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded shadow-sm hover:bg-indigo-700">Certifica Lavori</button></div>
                                        </form>
                                    )}
                                    <div className="space-y-3">
                                        {certificazioni.length === 0 ? <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded border border-gray-100">Nessun lavoro ancora certificato in questo cantiere.</p> : certificazioni.map(cert => (
                                            <div key={cert.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${cert.esito === 'positivo' ? 'bg-green-100 text-green-700' : cert.esito === 'contestato' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>{cert.esito.replace('_', ' ')}</span><span className="text-xs text-gray-500 font-medium">Dal {new Date(cert.dataIngresso).toLocaleDateString()} al {new Date(cert.dataFinePrevista).toLocaleDateString()}</span></div>
                                                    {cert.noteCollaudo && <p className="text-xs text-gray-600 mt-1 italic">"{cert.noteCollaudo}"</p>}
                                                </div>
                                                <div className="flex items-center gap-4 text-right">
                                                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Importo SAL</p><p className="font-extrabold text-indigo-700 text-sm">€ {Number(cert.importoCertificato).toLocaleString()}</p></div>
                                                    <button onClick={() => eliminaCertificazione(aff.id, cert.id)} className="text-gray-300 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};