import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SmartResourceSelector } from 'shared-ui'; 
import { 
    BuildingOfficeIcon, MapPinIcon, ShieldCheckIcon, 
    PlusIcon, BuildingStorefrontIcon, XMarkIcon, ExclamationTriangleIcon, ClockIcon,
    DocumentTextIcon, PaperClipIcon, MagnifyingGlassIcon, TrashIcon, ArrowLeftIcon, PhoneIcon, EnvelopeIcon
} from '@heroicons/react/24/solid';

const ScadenzeFornitoriWidget = ({ fornitori, onEdit }) => {
    const alerts = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const in30Days = new Date(today); in30Days.setDate(in30Days.getDate() + 30);
        const scaduti = []; const inScadenza = [];

        fornitori.forEach(forn => {
            const check = (dateStr, docName, isMandatory) => {
                if (!dateStr) { if (isMandatory) scaduti.push({ id: forn.id, ditta: forn.ragioneSociale, doc: docName, msg: 'Mancante' }); return; }
                const d = new Date(dateStr);
                if (d < today) scaduti.push({ id: forn.id, ditta: forn.ragioneSociale, doc: docName, msg: `Scaduto il ${d.toLocaleDateString('it-IT')}` });
                else if (d <= in30Days) inScadenza.push({ id: forn.id, ditta: forn.ragioneSociale, doc: docName, msg: `Scade il ${d.toLocaleDateString('it-IT')}` });
            };
            check(forn.scadenzaDURC, 'DURC', true); 
            check(forn.scadenzaVisura, 'Visura CCIAA', false);
        });
        return { scaduti, inScadenza };
    }, [fornitori]);

    if (alerts.scaduti.length === 0 && alerts.inScadenza.length === 0) return null;

    return (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alerts.scaduti.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2"><ExclamationTriangleIcon className="h-5 w-5" /> Criticità ({alerts.scaduti.length})</h3>
                    {alerts.scaduti.map((alert, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-red-100 mt-2 text-sm">
                            <div><span className="font-bold text-gray-800">{alert.ditta}</span> <span className="text-red-600 font-medium ml-2">{alert.doc}: {alert.msg}</span></div>
                            <button onClick={() => onEdit(alert.id)} className="text-red-700 font-bold hover:underline px-2 py-1">Vedi</button>
                        </div>
                    ))}
                </div>
            )}
            {alerts.inScadenza.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-orange-800 font-bold flex items-center gap-2 mb-2"><ClockIcon className="h-5 w-5" /> In Scadenza ({alerts.inScadenza.length})</h3>
                    {alerts.inScadenza.map((alert, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-orange-100 mt-2 text-sm">
                            <div><span className="font-bold text-gray-800">{alert.ditta}</span> <span className="text-orange-600 font-medium ml-2">{alert.doc}: {alert.msg}</span></div>
                            <button onClick={() => onEdit(alert.id)} className="text-orange-800 font-bold hover:underline px-2 py-1">Vedi</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const AlboFornitoriContent = () => {
    const { db, companyID, data, loadingData, storage } = useFirebaseData();
    const fornitori = data.fornitori || [];
    
    const [view, setView] = useState('list'); 
    const [formData, setFormData] = useState({});
    const [activeSubTab, setActiveSubTab] = useState('anagrafica');
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [altroDocumentoFile, setAltroDocumentoFile] = useState(null);

    // Stato per il nuovo materiale
    const [nuovoArticolo, setNuovoArticolo] = useState({ articolo: '', unitaMisura: 'pz', costo: '', metadata: null });
    const [resetKey, setResetKey] = useState(Date.now()); 

    const fornitoriFiltrati = useMemo(() => {
        return fornitori
            .filter(f => (f.ragioneSociale || '').toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || ''));
    }, [fornitori, searchQuery]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const docId = formData.id || Date.now().toString();
            let docVarioData = formData.documentoVario || null;

            if (altroDocumentoFile && storage) {
                const safeName = altroDocumentoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileRef = ref(storage, `fornitori/${docId}/documenti_vari/${Date.now()}_${safeName}`);
                await uploadBytes(fileRef, altroDocumentoFile);
                const url = await getDownloadURL(fileRef);
                docVarioData = { name: altroDocumentoFile.name, url };
            }

            const payload = { ...formData, id: docId, companyID, documentoVario: docVarioData, listino: formData.listino || [] };
            await setDoc(doc(db, 'fornitori', docId), payload);
            
            alert("✅ Dati salvati con successo!");
            setFormData(payload);
            setAltroDocumentoFile(null); 
        } catch (error) { 
            alert("Errore: " + error.message); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleDelete = async (id) => {
        if(confirm("Sei sicuro di voler eliminare questo fornitore?")) {
            await deleteDoc(doc(db, 'fornitori', id));
        }
    };

    const addArticoloToListino = async () => {
        if (!nuovoArticolo.articolo.trim()) {
            alert("⚠️ Errore: Inserisci il nome del materiale/articolo!");
            return;
        }
        if (!nuovoArticolo.costo || Number(nuovoArticolo.costo) <= 0) {
            alert("⚠️ Errore: Inserisci un Costo Unitario valido!");
            return;
        }
        
        const itemToAdd = { 
            id: Date.now().toString(), 
            descrizione: nuovoArticolo.articolo, 
            articolo: nuovoArticolo.articolo, // Usato in altre viste
            unitaMisura: nuovoArticolo.unitaMisura || 'pz',
            prezzo: Number(nuovoArticolo.costo),
            costo: Number(nuovoArticolo.costo),
            macroCategoria: nuovoArticolo.metadata?.macroCategoria || "",
            famiglia: nuovoArticolo.metadata?.famiglia || "",
            specifica: nuovoArticolo.metadata?.specifica || ""
        };

        try {
            if (formData.id) {
                await updateDoc(doc(db, 'fornitori', formData.id), {
                    listino: arrayUnion(itemToAdd)
                });
            }

            // SALA D'ATTESA PER I MATERIALI NUOVI
            if (!nuovoArticolo.metadata) {
                await addDoc(collection(db, 'catalogo_pending'), {
                    testoOriginale: nuovoArticolo.articolo,
                    tipoArticolo: 'materiale', // <--- FONDAMENTALE!
                    companyID: companyID,
                    stato: 'da_approvare',
                    dataInserimento: new Date().toISOString()
                });
            }
            
            const updatedListino = [...(formData.listino || []), itemToAdd];
            setFormData({ ...formData, listino: updatedListino });
            
            setNuovoArticolo({ articolo: '', unitaMisura: 'pz', costo: '', metadata: null });
            setResetKey(Date.now());

        } catch(err) {
            alert("❌ Errore durante il salvataggio dell'articolo a listino: " + err.message);
        }
    };

    const removeArticoloFromListino = async (itemToRemove) => {
        if(confirm("Rimuovere questo articolo dal listino?")) {
            try {
                if (formData.id) {
                    await updateDoc(doc(db, 'fornitori', formData.id), {
                        listino: arrayRemove(itemToRemove)
                    });
                }
                setFormData(prev => ({...prev, listino: prev.listino.filter(i => i.id !== itemToRemove.id)}));
            } catch (error) { alert("Errore rimozione: " + error.message); }
        }
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500">Caricamento dati...</div>;

    if (view === 'form') {
        const listinoArticoli = formData.listino || [];

        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-4 mb-8 animate-fade-in-down">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {formData.id ? `Gestione: ${formData.ragioneSociale}` : 'Nuova Anagrafica Fornitore'}
                    </h2>
                    <button onClick={() => { setView('list'); setAltroDocumentoFile(null); }} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-bold flex items-center gap-2">
                        <ArrowLeftIcon className="h-4 w-4"/> Torna alla lista
                    </button>
                </div>

                <div className="border-b border-gray-200 mb-6 flex gap-8">
                    <button onClick={() => setActiveSubTab('anagrafica')} className={`pb-3 font-bold text-sm transition-all ${activeSubTab === 'anagrafica' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}>
                        Anagrafica e Documenti
                    </button>
                    <button onClick={() => setActiveSubTab('listino')} className={`pb-3 font-bold text-sm transition-all ${activeSubTab === 'listino' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}>
                        Listino Materiali <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-1">{listinoArticoli.length}</span>
                    </button>
                </div>
                
                {/* === TAB 1: ANAGRAFICA COMPLETA === */}
                {activeSubTab === 'anagrafica' && (
                    <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
                        
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2"><BuildingOfficeIcon className="h-5 w-5 text-emerald-500"/> Dati Aziendali e Fiscali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ragione Sociale *</label><input required type="text" value={formData.ragioneSociale || ''} onChange={e => setFormData({...formData, ragioneSociale: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5 font-bold text-gray-800" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Partita IVA *</label><input required type="text" maxLength={11} value={formData.partitaIva || ''} onChange={e => setFormData({...formData, partitaIva: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5 font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Codice Fiscale</label><input type="text" maxLength={16} value={formData.codiceFiscale || ''} onChange={e => setFormData({...formData, codiceFiscale: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5 font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Codice SDI / PEC</label><input type="text" maxLength={7} value={formData.sdi || ''} onChange={e => setFormData({...formData, sdi: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5 font-mono" /></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2"><MapPinIcon className="h-5 w-5 text-emerald-500"/> Sede / Magazzino</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Indirizzo (Via/Piazza)</label><input type="text" value={formData.indirizzo || ''} onChange={e => setFormData({...formData, indirizzo: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Città</label><input type="text" value={formData.citta || ''} onChange={e => setFormData({...formData, citta: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                <div className="flex gap-2">
                                    <div className="w-1/2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CAP</label><input type="text" maxLength={5} value={formData.cap || ''} onChange={e => setFormData({...formData, cap: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                    <div className="w-1/2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prov.</label><input type="text" maxLength={2} value={formData.provincia || ''} onChange={e => setFormData({...formData, provincia: e.target.value.toUpperCase()})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5 uppercase" /></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2"><PhoneIcon className="h-5 w-5 text-sky-500"/> Recapiti e Referente</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Ordini / Amministrazione</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefono Sede</label><input type="tel" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Referente Vendite</label><input type="text" placeholder="Es. Mario Rossi" value={formData.referenteNome || ''} onChange={e => setFormData({...formData, referenteNome: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cellulare Referente</label><input type="tel" value={formData.referenteTelefono || ''} onChange={e => setFormData({...formData, referenteTelefono: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-3 mb-4">Coordinate Bancarie e Tipologia</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">IBAN</label><input type="text" value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase().replace(/\s/g, '')})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5 font-mono text-sm" placeholder="IT..." /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Materiali Forniti Principali</label><input type="text" placeholder="Es. Inerti, Cemento, Legname..." value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Note Interne / Accordi di Trasporto</label><textarea rows="2" value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 bg-gray-50 p-2.5" placeholder="Sconti particolari, franco destino, ecc..."></textarea></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <section className="bg-orange-50/50 p-4 md:p-6 rounded-xl border border-orange-100">
                                <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2 mb-4"><ShieldCheckIcon className="h-5 w-5" /> Scadenze Documentali</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 ring-1 ring-red-50">
                                        <label className="block text-xs font-bold text-red-800 uppercase mb-2 flex items-center gap-1"><ExclamationTriangleIcon className="h-4 w-4"/> Scadenza DURC *</label>
                                        <input type="date" required value={formData.scadenzaDURC || ''} onChange={e => setFormData({...formData, scadenzaDURC: e.target.value})} className="w-full rounded-md border-gray-300 focus:ring-red-500 focus:border-red-500 sm:text-sm font-bold" />
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Scadenza Visura CCIAA</label>
                                        <input type="date" value={formData.scadenzaVisura || ''} onChange={e => setFormData({...formData, scadenzaVisura: e.target.value})} className="w-full rounded-md border-gray-300 focus:ring-orange-500 focus:border-orange-500 sm:text-sm font-bold" />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4"><PaperClipIcon className="h-5 w-5" /> Altri Documenti</h3>
                                <div className={`p-4 rounded-lg border ${formData.documentoVario || altroDocumentoFile ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Allega File Vario (Listino PDF, ecc.)</label>
                                    {formData.documentoVario ? (
                                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <a href={formData.documentoVario.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-2 truncate" title={formData.documentoVario.name}>
                                                <DocumentTextIcon className="h-5 w-5 text-gray-400 shrink-0" /> {formData.documentoVario.name}
                                            </a>
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, documentoVario: null }))} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Rimuovi file">
                                                <XMarkIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <input type="file" onChange={(e) => setAltroDocumentoFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" />
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-black shadow-lg disabled:opacity-50 transition-colors text-lg">
                                {isSaving ? 'Salvataggio in corso...' : 'Salva Anagrafica Fornitore'}
                            </button>
                        </div>
                    </form>
                )}

                {/* === TAB 2: LISTINO MATERIALI E PREZZI === */}
                {activeSubTab === 'listino' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-inner">
                            <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                                <PlusIcon className="h-5 w-5 text-emerald-600" /> Aggiungi Materiale al Listino
                            </h3>
                            
                            <div className="flex flex-col gap-4">
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-emerald-800 uppercase mb-2">Descrizione Articolo (Scrivi o scegli dal catalogo) *</label>
                                    
                                    {/* SELETTORE INTELLIGENTE PER I MATERIALI */}
                                    <SmartResourceSelector 
                                        key={resetKey} 
                                        tipoArticolo="materiale" 
                                        value={nuovoArticolo.articolo}
                                        placeholder="Es. Cemento Portland 32.5..."
                                        onChange={(testoLibero, metadataAssociati) => {
                                            setNuovoArticolo(prev => ({
                                                ...prev, 
                                                articolo: testoLibero,
                                                metadata: metadataAssociati
                                            }));
                                        }} 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-emerald-200 pt-4 mt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Unità di Misura</label>
                                        <select value={nuovoArticolo.unitaMisura} onChange={e => setNuovoArticolo(prev => ({...prev, unitaMisura: e.target.value}))} className="w-full rounded-lg border-emerald-200 shadow-sm focus:ring-emerald-500 font-bold p-2.5 bg-white">
                                            <option value="pz">Pezzi (pz)</option>
                                            <option value="kg">Chilogrammi (kg)</option>
                                            <option value="q">Quintali (q)</option>
                                            <option value="ton">Tonnellate (ton)</option>
                                            <option value="ml">Metri Lineari (ml)</option>
                                            <option value="mq">Metri Quadri (mq)</option>
                                            <option value="mc">Metri Cubi (mc)</option>
                                            <option value="l">Litri (l)</option>
                                            <option value="scatola">Scatola</option>
                                            <option value="bancale">Bancale/Pallet</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Costo Unitario (€) *</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                min="0" 
                                                value={nuovoArticolo.costo} 
                                                onChange={e => setNuovoArticolo(prev => ({...prev, costo: e.target.value}))} 
                                                className="w-full rounded-lg border-emerald-200 shadow-sm font-bold text-emerald-700 focus:ring-emerald-500 p-2.5" 
                                                placeholder="Es. 4.50"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={addArticoloToListino} 
                                                className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap flex items-center gap-2"
                                            >
                                                <PlusIcon className="h-5 w-5"/> Aggiungi
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                                <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" /> Listino Materiali Attuale
                            </h3>
                            <div className="space-y-3">
                                {listinoArticoli.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic py-6 text-center bg-white rounded-xl border border-gray-200">Nessun articolo inserito a listino.</p>
                                ) : listinoArticoli.map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-500"><BuildingStorefrontIcon className="h-5 w-5"/></div>
                                            <span className="font-bold text-gray-800 text-lg">{m.articolo || m.descrizione}</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Prezzo al {m.unitaMisura || 'pz'}</p>
                                                <span className="text-emerald-700 font-extrabold text-xl">€ {Number(m.costo || m.prezzo).toLocaleString('it-IT')}</span>
                                            </div>
                                            <button onClick={() => removeArticoloFromListino(m)} className="text-gray-300 hover:text-red-500 p-1" title="Rimuovi dal Listino">
                                                <TrashIcon className="h-6 w-6"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Albo Fornitori</h1>
                    <p className="text-gray-500 mt-1">Gestisci i fornitori di materiali, le loro scadenze e i listini prezzi predefiniti.</p>
                </div>
                <button onClick={() => { setFormData({}); setView('form'); setAltroDocumentoFile(null); setActiveSubTab('anagrafica'); }} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-bold shadow-md transition-colors">
                    <PlusIcon className="h-5 w-5"/> Nuovo Fornitore
                </button>
            </div>
            
            <ScadenzeFornitoriWidget fornitori={fornitori} onEdit={(id) => { setFormData(fornitori.find(n => n.id === id)); setView('form'); }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><BuildingStorefrontIcon className="h-5 w-5 text-emerald-500"/> Aziende Registrate</h3>
                <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="Cerca fornitore..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-emerald-500 bg-gray-50" />
                </div>
            </div>

            {fornitoriFiltrati.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <BuildingStorefrontIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700 mb-1">Nessun Fornitore registrato</h3>
                    <p className="text-gray-500">Aggiungi la tua prima ditta fornitrice per iniziare a gestirne i listini materiali.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fornitoriFiltrati.map(forn => (
                        <div key={forn.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
                            <div className="absolute top-6 right-6 bg-emerald-50 p-2 rounded-xl text-emerald-600">
                                <BuildingStorefrontIcon className="h-6 w-6" />
                            </div>
                            
                            <h3 className="font-black text-xl text-gray-900 mb-1 pr-14 line-clamp-2">{forn.ragioneSociale}</h3>
                            <p className="text-xs text-gray-400 font-mono mb-4">P.IVA: {forn.partitaIva}</p>
                            
                            <div className="space-y-2 mb-6 flex-grow">
                                {forn.categoria && <p className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded uppercase tracking-wider inline-block">{forn.categoria}</p>}
                                
                                <div className="text-sm text-gray-600 mt-3 space-y-1">
                                    {forn.citta && <p className="flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-gray-400"/> {forn.citta} {forn.provincia ? `(${forn.provincia})` : ''}</p>}
                                    {forn.telefono && <p className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-gray-400"/> {forn.telefono}</p>}
                                    {forn.email && <p className="flex items-center gap-2 truncate"><EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0"/> {forn.email}</p>}
                                </div>

                                {forn.documentoVario && (
                                    <div className="mt-3">
                                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                                            <PaperClipIcon className="h-3 w-3" /> Documento Allegato
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                                <button onClick={() => { setFormData(forn); setView('form'); setActiveSubTab('listino'); }} className="w-full flex justify-between items-center bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg font-bold hover:bg-emerald-100 transition-colors">
                                    <span>Vedi Listino Materiali</span>
                                    <span className="bg-white text-emerald-800 px-2 py-0.5 rounded-md text-xs">{(forn.listino || []).length} art.</span>
                                </button>
                                
                                <div className="flex justify-between items-center mt-2">
                                    <button onClick={() => handleDelete(forn.id)} className="text-xs text-red-400 hover:text-red-600 font-bold flex items-center gap-1 transition-colors"><TrashIcon className="h-4 w-4"/> Elimina</button>
                                    <button onClick={() => { setFormData(forn); setView('form'); setActiveSubTab('anagrafica'); }} className="text-xs text-gray-500 hover:text-emerald-600 font-bold transition-colors">Gestisci Ditta &rarr;</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};