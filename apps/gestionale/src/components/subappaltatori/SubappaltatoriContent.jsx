import React, { useState, useMemo } from 'react';
import { useFirebaseData, useSubappaltatoriManager } from 'shared-core';
import { SubappaltatoriDashboard } from 'shared-ui';
import { 
    BuildingOfficeIcon, MapPinIcon, IdentificationIcon, ShieldCheckIcon, 
    DocumentTextIcon, ArrowPathIcon, PlusIcon, DocumentArrowDownIcon,
    ExclamationTriangleIcon, ClockIcon, CheckCircleIcon 
} from '@heroicons/react/24/solid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ==========================================
// WIDGET: ALLARMI SCADENZE (DURC, VISURE, ECC.)
// ==========================================
const ScadenzeAlertWidget = ({ subappaltatori, onEdit }) => {
    const alerts = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const in30Days = new Date(today);
        in30Days.setDate(in30Days.getDate() + 30);

        const scaduti = [];
        const inScadenza = [];

        subappaltatori.forEach(sub => {
            // Funzione di controllo
            const check = (dateStr, docName, isMandatory) => {
                if (!dateStr) {
                    if (isMandatory) scaduti.push({ id: sub.id, ditta: sub.ragioneSociale, doc: docName, msg: 'Mancante' });
                    return;
                }
                const d = new Date(dateStr);
                if (d < today) {
                    scaduti.push({ id: sub.id, ditta: sub.ragioneSociale, doc: docName, msg: `Scaduto il ${d.toLocaleDateString('it-IT')}` });
                } else if (d <= in30Days) {
                    inScadenza.push({ id: sub.id, ditta: sub.ragioneSociale, doc: docName, msg: `Scade il ${d.toLocaleDateString('it-IT')}` });
                }
            };

            // Controlliamo le 4 date (Il DURC lo consideriamo obbligatorio per non avere allerte)
            check(sub.scadenzaDURC, 'DURC', true); 
            check(sub.scadenzaVisura, 'Visura CCIAA', false);
            check(sub.scadenzaRCT, 'Polizza RCT', false);
            check(sub.scadenzaAntimafia, 'Antimafia', false);
        });

        return { scaduti, inScadenza };
    }, [subappaltatori]);

    if (alerts.scaduti.length === 0 && alerts.inScadenza.length === 0) {
        return (
            <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
                <div>
                    <p className="font-bold text-green-800 text-lg">Tutti i documenti in regola</p>
                    <p className="text-sm text-green-600">Non ci sono DURC o polizze in scadenza nei prossimi 30 giorni.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-down">
            
            {/* BOX ROSSO: SCADUTI / MANCANTI */}
            {alerts.scaduti.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-3">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                        Criticità Bloccanti ({alerts.scaduti.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {alerts.scaduti.map((alert, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{alert.ditta}</p>
                                    <p className="text-xs text-red-600 font-medium">
                                        {alert.doc}: <span className="uppercase">{alert.msg}</span>
                                    </p>
                                </div>
                                <button onClick={() => onEdit(alert.id)} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded font-bold hover:bg-red-200 transition-colors">
                                    Aggiorna
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BOX GIALLO: IN SCADENZA (ENTRO 30 GG) */}
            {alerts.inScadenza.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-orange-800 font-bold flex items-center gap-2 mb-3">
                        <ClockIcon className="h-6 w-6" />
                        In Scadenza a Breve ({alerts.inScadenza.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {alerts.inScadenza.map((alert, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{alert.ditta}</p>
                                    <p className="text-xs text-orange-600 font-medium">
                                        {alert.doc}: {alert.msg}
                                    </p>
                                </div>
                                <button onClick={() => onEdit(alert.id)} className="text-xs bg-orange-100 text-orange-800 px-3 py-1.5 rounded font-bold hover:bg-orange-200 transition-colors">
                                    Verifica
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPALE
// ==========================================
export const SubappaltatoriContent = () => {
    const { db, user, companyID, data, loadingData, storage } = useFirebaseData();
    const { salvaSubappaltatore, eliminaSubappaltatore, isLoading } = useSubappaltatoriManager(db, user, companyID);
    
    const [view, setView] = useState('list'); 
    const [formData, setFormData] = useState({});
    const [activeSubTab, setActiveSubTab] = useState('anagrafica');

    const [offertaForm, setOffertaForm] = useState({});
    const [offertaFile, setOffertaFile] = useState(null);
    const [isSavingOfferta, setIsSavingOfferta] = useState(false);

    const subappaltatori = data.subappaltatori || [];
    const cantieri = data.cantieri || [];

    const categorieEsistenti = useMemo(() => {
        const categorieBase = ["Edili", "Idraulici", "Elettricisti", "Scavi", "Strutture", "Infissi", "Finiture", "Noleggiatori"];
        const categorieUsate = subappaltatori.map(s => s.categoria).filter(c => c && c.trim() !== "");
        return [...new Set([...categorieBase, ...categorieUsate])].sort();
    }, [subappaltatori]);

    const handleAdd = () => {
        setFormData({ categoria: 'Edili' }); 
        setActiveSubTab('anagrafica');
        setView('form');
    };

    const handleEdit = (sub) => {
        setFormData(sub);
        setActiveSubTab('anagrafica');
        setView('form');
    };

    const handleEditById = (id) => {
        const sub = subappaltatori.find(s => s.id === id);
        if (sub) handleEdit(sub);
    };

    const handleSaveAnagrafica = async (e) => {
        e.preventDefault();
        const res = await salvaSubappaltatore(formData);
        if (res.success) {
            alert("✅ Anagrafica salvata con successo!");
            if (!formData.id) {
                setFormData(prev => ({ ...prev, id: res.id }));
            }
        } else {
            alert("Errore: " + res.message);
        }
    };

    const handleAddOfferta = async (e) => {
        e.preventDefault();
        setIsSavingOfferta(true);
        try {
            let fileData = null;
            if (offertaFile && storage) {
                const safeName = offertaFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileRef = ref(storage, `subappaltatori/${formData.id}/offerte/${Date.now()}_${safeName}`);
                await uploadBytes(fileRef, offertaFile);
                const url = await getDownloadURL(fileRef);
                fileData = { name: offertaFile.name, url };
            }
            
            const cantiereTrovato = cantieri.find(c => c.id === offertaForm.cantiereId);
            
            const nuovaOfferta = {
                id: Date.now().toString(),
                cantiereId: offertaForm.cantiereId,
                nomeCantiere: cantiereTrovato ? cantiereTrovato.nomeCantiere : 'Generico',
                descrizione: offertaForm.descrizione || '',
                importo: Number(offertaForm.importo || 0),
                dataRicezione: offertaForm.dataRicezione || new Date().toISOString().split('T')[0],
                allegato: fileData
            };

            const updatedOfferte = [...(formData.offerte || []), nuovaOfferta];
            await salvaSubappaltatore({ ...formData, offerte: updatedOfferte });
            
            setFormData(prev => ({ ...prev, offerte: updatedOfferte }));
            setOffertaForm({});
            setOffertaFile(null);
            alert("✅ Preventivo caricato correttamente!");
        } catch (error) {
            console.error("Errore salvataggio offerta:", error);
            alert("Errore durante l'upload del preventivo.");
        } finally {
            setIsSavingOfferta(false);
        }
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500">Caricamento dati...</div>;

    if (view === 'form') {
        const offerteRicevute = formData.offerte || [];

        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-4 mb-8 animate-fade-in-down">
                
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {formData.id ? `Gestione Ditta: ${formData.ragioneSociale}` : 'Nuova Anagrafica Subappaltatore'}
                    </h2>
                    <button onClick={() => setView('list')} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 text-sm font-bold shadow-sm transition-colors">
                        ← Torna alla lista
                    </button>
                </div>

                <div className="border-b border-gray-200 mb-6 flex gap-8">
                    <button onClick={() => setActiveSubTab('anagrafica')} className={`pb-3 font-bold text-sm transition-all ${activeSubTab === 'anagrafica' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}>
                        Anagrafica e Documenti (DURC)
                    </button>
                    {formData.id ? (
                        <button onClick={() => setActiveSubTab('offerte')} className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all ${activeSubTab === 'offerte' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}>
                            Preventivi e Offerte 
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'offerte' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                {offerteRicevute.length}
                            </span>
                        </button>
                    ) : (
                        <div className="pb-3 text-sm text-gray-400 italic flex items-center gap-1 cursor-not-allowed" title="Salva l'anagrafica prima di aggiungere le offerte">
                            Preventivi (Salva prima per sbloccare)
                        </div>
                    )}
                </div>
                
                {/* --- TAB 1: ANAGRAFICA E SCADENZE --- */}
                {activeSubTab === 'anagrafica' && (
                    <form onSubmit={handleSaveAnagrafica} className="space-y-8 animate-fade-in">
                        <section>
                            <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mb-4"><BuildingOfficeIcon className="h-5 w-5" /> Dati Aziendali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="lg:col-span-2"><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ragione Sociale *</label><input required type="text" value={formData.ragioneSociale || ''} onChange={e => setFormData({...formData, ragioneSociale: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50" /></div>
                                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Partita IVA *</label><input required type="text" maxLength={11} value={formData.partitaIva || ''} onChange={e => setFormData({...formData, partitaIva: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Codice Fiscale</label><input type="text" maxLength={16} value={formData.codiceFiscale || ''} onChange={e => setFormData({...formData, codiceFiscale: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 font-mono" /></div>
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoria Lavorazioni *</label>
                                    <input required type="text" list="categorie-list" value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value})} placeholder="Scegli dalla lista o scrivi una nuova..." className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50" />
                                    <datalist id="categorie-list">{categorieEsistenti.map((cat, idx) => <option key={idx} value={cat} />)}</datalist>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mb-4"><IdentificationIcon className="h-5 w-5" /> Contatti e Amministrazione</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Referente</label><input type="text" value={formData.referente || ''} onChange={e => setFormData({...formData, referente: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50" /></div>
                                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cellulare</label><input type="tel" value={formData.cellulareReferente || ''} onChange={e => setFormData({...formData, cellulareReferente: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50" /></div>
                                <div className="lg:col-span-2"><label className="block text-xs font-bold text-gray-700 uppercase mb-1">PEC</label><input type="email" value={formData.pec || ''} onChange={e => setFormData({...formData, pec: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50" /></div>
                                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Codice SDI</label><input type="text" maxLength={7} value={formData.sdi || ''} onChange={e => setFormData({...formData, sdi: e.target.value.toUpperCase()})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 font-mono" /></div>
                                <div className="lg:col-span-3"><label className="block text-xs font-bold text-gray-700 uppercase mb-1">IBAN</label><input type="text" maxLength={27} value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase().replace(/\s/g, '')})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 font-mono" /></div>
                            </div>
                        </section>

                        <section className="bg-red-50/50 p-4 md:p-6 rounded-xl border border-red-100">
                            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-4"><ShieldCheckIcon className="h-5 w-5" /> Scadenze Documentali (Semafori)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 ring-1 ring-red-50">
                                    <label className="block text-xs font-bold text-red-800 uppercase mb-2 flex items-center gap-1"><ExclamationTriangleIcon className="h-4 w-4"/> Scadenza DURC *</label>
                                    <input type="date" required value={formData.scadenzaDURC || ''} onChange={e => setFormData({...formData, scadenzaDURC: e.target.value})} className="w-full rounded-md border-gray-300 focus:ring-red-500 focus:border-red-500 sm:text-sm font-bold" />
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Scadenza Visura</label><input type="date" value={formData.scadenzaVisura || ''} onChange={e => setFormData({...formData, scadenzaVisura: e.target.value})} className="w-full rounded-md border-gray-300 focus:ring-red-500 focus:border-red-500 sm:text-sm font-bold" /></div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Scadenza Polizza RCT</label><input type="date" value={formData.scadenzaRCT || ''} onChange={e => setFormData({...formData, scadenzaRCT: e.target.value})} className="w-full rounded-md border-gray-300 focus:ring-red-500 focus:border-red-500 sm:text-sm font-bold" /></div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Cert. Antimafia</label><input type="date" value={formData.scadenzaAntimafia || ''} onChange={e => setFormData({...formData, scadenzaAntimafia: e.target.value})} className="w-full rounded-md border-gray-300 focus:ring-red-500 focus:border-red-500 sm:text-sm font-bold" /></div>
                            </div>
                        </section>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                            <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md disabled:opacity-50 transition-colors">
                                {isLoading ? 'Salvataggio in corso...' : 'Salva Anagrafica'}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- TAB 2: PREVENTIVI E OFFERTE --- */}
                {activeSubTab === 'offerte' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl shadow-inner">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PlusIcon className="h-5 w-5 text-indigo-600" /> Registra Nuovo Preventivo
                            </h3>
                            <form onSubmit={handleAddOfferta} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cantiere di Riferimento *</label>
                                    <select required value={offertaForm.cantiereId || ''} onChange={e => setOffertaForm({...offertaForm, cantiereId: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                                        <option value="">-- Seleziona Cantiere o Generico --</option>
                                        <option value="generico" className="font-bold text-gray-500">🏢 Preventivo Generico / Senza Cantiere</option>
                                        <optgroup label="Cantieri Attivi">
                                            {cantieri.filter(c=>c.stato!=='chiuso').map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Breve Descrizione Lavori *</label>
                                    <input required type="text" placeholder="Es. Fornitura e posa infissi..." value={offertaForm.descrizione || ''} onChange={e => setOffertaForm({...offertaForm, descrizione: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Importo Offerto (€) *</label>
                                    <input required type="number" step="0.01" min="0" value={offertaForm.importo || ''} onChange={e => setOffertaForm({...offertaForm, importo: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold text-indigo-700 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Ricezione Preventivo</label>
                                    <input required type="date" value={offertaForm.dataRicezione || ''} onChange={e => setOffertaForm({...offertaForm, dataRicezione: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white" />
                                </div>
                                <div className="md:col-span-2 border-t pt-4 mt-2">
                                    <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><DocumentArrowDownIcon className="h-5 w-5 text-indigo-600"/> Allega File Preventivo (PDF)</label>
                                    <input type="file" onChange={(e) => setOffertaFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border file:border-indigo-200 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                                </div>
                                <div className="md:col-span-2 flex justify-end mt-2">
                                    <button type="submit" disabled={isSavingOfferta} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-colors">
                                        {isSavingOfferta ? <><ArrowPathIcon className="h-5 w-5 animate-spin"/> Upload in corso...</> : 'Salva Preventivo in Archivio'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div>
                            <h3 className="text-md font-bold text-gray-800 mb-3 border-b pb-2">Storico Preventivi Ricevuti da {formData.ragioneSociale}</h3>
                            <div className="space-y-4">
                                {offerteRicevute.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic py-8 text-center bg-gray-50 rounded-xl border border-gray-100">Nessun preventivo registrato per questa ditta.</p>
                                ) : (
                                    [...offerteRicevute].sort((a,b) => new Date(b.dataRicezione) - new Date(a.dataRicezione)).map(off => (
                                        <div key={off.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-md transition-shadow gap-4">
                                            <div className="flex-1">
                                                <p className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-1 rounded inline-block font-bold uppercase tracking-widest mb-2">
                                                    {off.nomeCantiere === 'Generico' ? '🏢 Nessun Cantiere' : `🏗️ ${off.nomeCantiere}`}
                                                </p>
                                                <p className="font-extrabold text-gray-900 text-lg leading-tight">{off.descrizione}</p>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <DocumentTextIcon className="h-3 w-3"/> Ricevuto il: {new Date(off.dataRicezione).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right flex items-center gap-6 sm:w-auto w-full justify-between sm:justify-end bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Importo</p>
                                                    <p className="font-extrabold text-indigo-700 text-xl">€ {Number(off.importo).toLocaleString('it-IT')}</p>
                                                </div>
                                                {off.allegato ? (
                                                    <a href={off.allegato.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-600 hover:text-white transition-colors" title="Scarica Allegato">
                                                        <DocumentTextIcon className="h-6 w-6" />
                                                    </a>
                                                ) : (
                                                    <div className="p-3 bg-gray-100 text-gray-400 rounded-full" title="Nessun file allegato">
                                                        <DocumentTextIcon className="h-6 w-6 opacity-50" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-full bg-gray-50">
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900">Albo Subappaltatori</h1>
                <p className="text-gray-500 mt-1">Gestisci le anagrafiche, previeni multe sui DURC e archivia i preventivi delle ditte esterne.</p>
            </div>
            
            {/* ✅ WIDGET ALLARMI SCADENZE INSERITO QUI */}
            <ScadenzeAlertWidget subappaltatori={subappaltatori} onEdit={handleEditById} />

            <SubappaltatoriDashboard 
                subappaltatori={subappaltatori} 
                onAdd={handleAdd} 
                onEdit={handleEdit} 
                onDelete={eliminaSubappaltatore} 
            />
        </div>
    );
};