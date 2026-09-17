import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
    ListBulletIcon, PlusIcon, TrashIcon, FolderIcon, 
    TagIcon, WrenchScrewdriverIcon, TruckIcon, BuildingStorefrontIcon, XMarkIcon,
    InboxArrowDownIcon, CheckCircleIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

const TabButton = ({ active, onClick, icon: Icon, label, color }) => {
    const colorClasses = {
        indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200 ring-indigo-500',
        emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-500',
        orange: 'text-orange-700 bg-orange-50 border-orange-200 ring-orange-500',
        red: 'text-red-700 bg-red-50 border-red-200 ring-red-500',
        inactive: 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
    };
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold border shadow-sm transition-all duration-200 ${active ? colorClasses[color] + ' ring-2 shadow-md' : colorClasses.inactive}`}>
            <Icon className="h-5 w-5" /> {label}
        </button>
    );
};

export const CatalogoSettingsContent = () => {
    const { db, data, loadingData } = useFirebaseData();
    
    const catalogo = Array.isArray(data?.catalogo_risorse) ? data.catalogo_risorse : [];
    const catalogoPending = Array.isArray(data?.catalogo_pending) ? data.catalogo_pending : [];
    
    // Peschiamo tutti gli albi per la scansione completa!
    const noleggiatori = Array.isArray(data?.noleggiatori) ? data.noleggiatori : [];
    const fornitori = Array.isArray(data?.fornitori) ? data.fornitori : [];
    const subappaltatori = Array.isArray(data?.subappaltatori) ? data.subappaltatori : [];
    
    const [activeTab, setActiveTab] = useState('nolo'); 
    const [isAdding, setIsAdding] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    
    const [formData, setFormData] = useState({ id: null, macroCategoria: '', famiglia: '', voci: [] });
    const [nuovaVoce, setNuovaVoce] = useState('');
    
    const [pendingItemToResolve, setPendingItemToResolve] = useState(null);

    const handleAddVoce = (e) => {
        if (e) e.preventDefault();
        if (!nuovaVoce.trim()) return;
        if (!formData.voci.includes(nuovaVoce.trim())) {
            setFormData(prev => ({ ...prev, voci: [...prev.voci, nuovaVoce.trim()] }));
        }
        setNuovaVoce('');
    };

    const handleRemoveVoce = (voce) => {
        setFormData(prev => ({ ...prev, voci: prev.voci.filter(v => v !== voce) }));
    };

    const handleSave = async () => {
        let vociDaSalvare = [...formData.voci];
        if (nuovaVoce.trim() && !vociDaSalvare.includes(nuovaVoce.trim())) {
            vociDaSalvare.push(nuovaVoce.trim());
        }

        if (!formData.macroCategoria || !formData.famiglia || vociDaSalvare.length === 0) {
            alert("⚠️ Attenzione: Compila i campi 'Macro Categoria' e 'Famiglia', e assicurati di avere almeno una voce inserita.");
            return;
        }

        try {
            const gruppoEsistente = catalogo.find(c => 
                c.tipoArticolo === activeTab && 
                (c.macroCategoria || '').toLowerCase() === (formData.macroCategoria || '').toLowerCase() && 
                (c.famiglia || '').toLowerCase() === (formData.famiglia || '').toLowerCase()
            );

            if (gruppoEsistente && gruppoEsistente.id !== formData.id) {
                const vociUnite = [...new Set([...(gruppoEsistente.voci || []), ...vociDaSalvare])];
                await updateDoc(doc(db, 'catalogo_risorse', gruppoEsistente.id), {
                    voci: vociUnite
                });
                if (formData.id) {
                    await deleteDoc(doc(db, 'catalogo_risorse', formData.id));
                }
            } else if (formData.id) {
                await updateDoc(doc(db, 'catalogo_risorse', formData.id), {
                    macroCategoria: formData.macroCategoria,
                    famiglia: formData.famiglia,
                    voci: vociDaSalvare
                });
            } else {
                await addDoc(collection(db, 'catalogo_risorse'), {
                    companyID: 'GLOBAL', 
                    tipoArticolo: activeTab,
                    macroCategoria: formData.macroCategoria,
                    famiglia: formData.famiglia,
                    voci: vociDaSalvare,
                    createdAt: serverTimestamp()
                });
            }

            if (pendingItemToResolve) {
                await deleteDoc(doc(db, 'catalogo_pending', pendingItemToResolve.id));
            }

            setPendingItemToResolve(null);
            setNuovaVoce('');
            setIsAdding(false);
            setFormData({ id: null, macroCategoria: '', famiglia: '', voci: [] });
            
        } catch (err) {
            alert("❌ Errore durante il salvataggio: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Sei sicuro di voler eliminare questa famiglia dal dizionario?")) {
            await deleteDoc(doc(db, 'catalogo_risorse', id));
        }
    };

    const handleDeletePending = async (id) => {
        if (confirm("Sei sicuro di voler eliminare questa voce dalle proposte? (Verrà ignorata)")) {
            await deleteDoc(doc(db, 'catalogo_pending', id));
        }
    };

    const handleStartApprove = (item) => {
        setActiveTab(item.tipoArticolo || 'nolo');
        setPendingItemToResolve(item);
        setNuovaVoce(item.testoOriginale); 
        setIsAdding(true); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ====================================================
    // NUOVO SCRIPT DI IMPORTAZIONE (NOLI, MATERIALI, SUBAPPALTI)
    // ====================================================
    const handleImportRetroattivo = async () => {
        if (!confirm("Vuoi analizzare TUTTI i listini (Noli, Materiali e Subappalti) e importare le voci mancanti?")) return;
        
        setIsImporting(true);
        let vociAggiunte = 0;
        
        try {
            // 1. Creiamo un "Dizionario dei divieti" unendo le parole in Pending e quelle Ufficiali
            const paroleVietate = catalogoPending.map(p => p.testoOriginale.toLowerCase().trim());
            
            catalogo.forEach(cat => {
                if (cat.voci && cat.voci.length > 0) {
                    cat.voci.forEach(v => paroleVietate.push(`${cat.famiglia} ${v}`.toLowerCase().trim()));
                } else {
                    paroleVietate.push(cat.famiglia.toLowerCase().trim());
                }
            });

            // 2. Funzione per spazzolare un archivio specifico
            const scansionaAlbo = async (aziende, tipoArticolo) => {
                for (const ditta of aziende) {
                    if (!ditta.listino || !Array.isArray(ditta.listino)) continue;

                    for (const item of ditta.listino) {
                        // Cerca il nome in tutte le possibili variabili usate nei vari albi
                        const nomeElemento = (item.mezzo || item.articolo || item.lavorazione || item.descrizione || "").trim();
                        if (!nomeElemento) continue;

                        // Se è stato inserito a mano (senza macroCategoria) e NON è nelle parole vietate
                        if (!item.macroCategoria && !paroleVietate.includes(nomeElemento.toLowerCase())) {
                            await addDoc(collection(db, 'catalogo_pending'), {
                                testoOriginale: nomeElemento,
                                tipoArticolo: tipoArticolo,
                                companyID: ditta.companyID || 'Azienda Precedente',
                                stato: 'da_approvare',
                                dataInserimento: new Date().toISOString()
                            });
                            
                            paroleVietate.push(nomeElemento.toLowerCase()); // Aggiungiamo alla memoria per evitare doppioni tra aziende diverse
                            vociAggiunte++;
                        }
                    }
                }
            };

            // 3. Eseguiamo la scansione sui 3 fronti!
            await scansionaAlbo(noleggiatori, 'nolo');
            await scansionaAlbo(fornitori, 'materiale');
            await scansionaAlbo(subappaltatori, 'subappalto');

            alert(`🎉 Analisi completata! Sono state estratte e importate ${vociAggiunte} voci esistenti mai viste prima.`);
        } catch (error) {
            alert("Errore durante l'importazione: " + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const catalogoCorrente = useMemo(() => {
        if (activeTab === 'pending') return {};
        const filtrati = catalogo.filter(c => c.tipoArticolo === activeTab);
        const raggruppati = {};
        filtrati.forEach(item => {
            if (!raggruppati[item.macroCategoria]) raggruppati[item.macroCategoria] = [];
            raggruppati[item.macroCategoria].push(item);
        });
        return raggruppati;
    }, [catalogo, activeTab]);

    const macroCategorieEsistenti = Object.keys(catalogoCorrente);
    
    const famiglieEsistenti = useMemo(() => {
        if (activeTab === 'pending') return [];
        let filtrati = catalogo.filter(c => c.tipoArticolo === activeTab);
        if (formData.macroCategoria) {
            filtrati = filtrati.filter(c => c.macroCategoria === formData.macroCategoria);
        }
        return [...new Set(filtrati.map(f => f.famiglia))];
    }, [catalogo, activeTab, formData.macroCategoria]);

    if (loadingData) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento catalogo...</div>;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    <ListBulletIcon className="h-8 w-8 text-indigo-600" />
                    Dizionario Globale (SuperAdmin)
                </h1>
                <p className="text-gray-500 mt-1">Configura le categorie universali per tutte le aziende registrate alla piattaforma.</p>
            </div>

            {pendingItemToResolve && activeTab !== 'pending' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg flex justify-between items-center shadow-sm animate-fade-in-down">
                    <div>
                        <p className="text-sm text-yellow-800 font-bold">Stai collocando una parola in sospeso:</p>
                        <p className="text-lg text-yellow-900 font-black flex items-center gap-2 mt-1">
                            <TagIcon className="h-5 w-5" /> {pendingItemToResolve.testoOriginale}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">Scegli Categoria e Famiglia (o creale). La parola è precompilata nelle "Voci". Cancellane la prima parte per estrarre solo la specifica.</p>
                    </div>
                    <button onClick={() => { setPendingItemToResolve(null); setNuovaVoce(''); setIsAdding(false); }} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                        Annulla Revisione
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mb-6">
                <TabButton active={activeTab === 'nolo'} onClick={() => {setActiveTab('nolo'); setIsAdding(false);}} icon={TruckIcon} label="Noli e Mezzi d'Opera" color="indigo" />
                <TabButton active={activeTab === 'materiale'} onClick={() => {setActiveTab('materiale'); setIsAdding(false);}} icon={BuildingStorefrontIcon} label="Materiali" color="emerald" />
                <TabButton active={activeTab === 'subappalto'} onClick={() => {setActiveTab('subappalto'); setIsAdding(false);}} icon={WrenchScrewdriverIcon} label="Subappalti" color="orange" />
                
                <div className="ml-auto">
                    <TabButton active={activeTab === 'pending'} onClick={() => {setActiveTab('pending'); setIsAdding(false);}} icon={InboxArrowDownIcon} label={catalogoPending.length > 0 ? `Da Approvare (${catalogoPending.length})` : 'Da Approvare'} color="red" />
                </div>
            </div>

            {/* === SCHEDA: SALA D'ATTESA === */}
            {activeTab === 'pending' && (
                <div className="space-y-4 animate-fade-in">
                    
                    <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                        <div>
                            <h4 className="font-bold text-sky-900">Scansione Totale Anagrafiche</h4>
                            <p className="text-sm text-sky-700 mt-1">Cerca in Noleggiatori, Fornitori e Subappaltatori tutte le voci non ancora classificate.</p>
                        </div>
                        <button 
                            onClick={handleImportRetroattivo} 
                            disabled={isImporting}
                            className="bg-sky-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            <ArrowPathIcon className={`h-5 w-5 ${isImporting ? 'animate-spin' : ''}`} />
                            {isImporting ? 'Scansione in corso...' : 'Avvia Importazione'}
                        </button>
                    </div>

                    {catalogoPending.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <CheckCircleIcon className="h-16 w-16 mx-auto text-emerald-400 mb-3" />
                            <h3 className="text-lg font-bold text-gray-800">Tutto in ordine!</h3>
                            <p className="text-gray-500 font-medium mt-1">Non ci sono nuove voci in sospeso da approvare.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-red-50 text-red-800 px-6 py-3 font-bold flex items-center gap-2 border-b border-red-100">
                                <InboxArrowDownIcon className="h-5 w-5" /> Voci da revisionare e catalogare
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {catalogoPending.map(item => (
                                    <li key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                                        <div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 ${
                                                item.tipoArticolo === 'nolo' ? 'bg-indigo-100 text-indigo-700' :
                                                item.tipoArticolo === 'materiale' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {item.tipoArticolo || 'Sconosciuto'}
                                            </span>
                                            <h4 className="text-xl font-black text-gray-900">{item.testoOriginale}</h4>
                                            <p className="text-xs text-gray-500 mt-1">Trovato in listini - ID Ditta/Cantiere: {item.companyID}</p>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <button onClick={() => handleStartApprove(item)} className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                                                <ListBulletIcon className="h-5 w-5" /> Colloca nel Dizionario
                                            </button>
                                            <button onClick={() => handleDeletePending(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 hover:border-red-200" title="Ignora e Cancella">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* === SCHEDE DIZIONARIO NORMALI === */}
            {activeTab !== 'pending' && isAdding && (
                <div className="bg-white p-6 rounded-2xl shadow-md border border-indigo-200 ring-4 ring-indigo-50 mb-8 animate-fade-in-down relative overflow-hidden">
                    {pendingItemToResolve && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
                    )}
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                        <h3 className="font-black text-xl text-gray-800">{formData.id ? 'Modifica Gruppo' : 'Nuovo Gruppo nel Dizionario'}</h3>
                        <button onClick={() => { setIsAdding(false); setPendingItemToResolve(null); setNuovaVoce(''); }} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-1.5 rounded-lg"><XMarkIcon className="h-6 w-6"/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Macro Categoria (Reparto)</label>
                            <input type="text" list="macro-list" value={formData.macroCategoria} onChange={e => setFormData({...formData, macroCategoria: e.target.value})} className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 bg-gray-50 p-2.5 font-bold" placeholder="Es. Mezzi di Sollevamento" />
                            <datalist id="macro-list">
                                {macroCategorieEsistenti.map(m => <option key={m} value={m} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Famiglia / Modello Base</label>
                            <input 
                                type="text" 
                                list="famiglia-list" 
                                value={formData.famiglia} 
                                onChange={e => setFormData({...formData, famiglia: e.target.value})} 
                                className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 bg-gray-50 p-2.5 font-bold" 
                                placeholder="Es. Piattaforme Autocarrate" 
                            />
                            <datalist id="famiglia-list">
                                {famiglieEsistenti.map(f => <option key={f} value={f} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className={`p-5 rounded-xl border ${pendingItemToResolve ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                            {pendingItemToResolve ? "Modifica il testo qui sotto (lascia solo la taglia/misura) e premi Aggiungi, poi salva:" : "Voci Specifiche (Taglie, Misure, Volumi)"}
                        </label>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={nuovaVoce} onChange={e => setNuovaVoce(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddVoce(e); }} className="flex-1 rounded-lg border-gray-300 focus:ring-indigo-500 p-2.5 text-sm" placeholder="Es. 20 metri..." />
                            <button type="button" onClick={handleAddVoce} className={`${pendingItemToResolve ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} font-bold px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1`}>
                                <PlusIcon className="h-5 w-5" /> Aggiungi
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.voci.map(voce => (
                                <span key={voce} className="inline-flex items-center gap-2 bg-white border border-gray-300 px-3 py-1.5 rounded-full text-sm font-bold text-gray-700 shadow-sm">
                                    <TagIcon className="h-4 w-4 text-indigo-400"/> {voce}
                                    <button type="button" onClick={() => handleRemoveVoce(voce)} className="text-gray-400 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button>
                                </span>
                            ))}
                            {formData.voci.length === 0 && <span className="text-sm text-gray-400 italic">Nessuna voce inserita. Verrà salvato il testo nella barra di input se presente.</span>}
                        </div>
                    </div>

                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                        <button onClick={handleSave} className="bg-gray-900 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-black transition-colors flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5" />
                            {formData.id ? 'Aggiorna Gruppo' : 'Salva nel Dizionario'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab !== 'pending' && (
                <>
                    <div className="flex justify-between items-center mb-4 mt-8">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Struttura Attuale: <span className="uppercase text-indigo-600">{activeTab}</span>
                        </h2>
                        {!isAdding && (
                            <button onClick={() => { setFormData({ id: null, macroCategoria: '', famiglia: '', voci: [] }); setIsAdding(true); window.scrollTo(0,0); }} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors text-sm">
                                <PlusIcon className="h-4 w-4" /> Crea Nuovo Gruppo
                            </button>
                        )}
                    </div>

                    {Object.keys(catalogoCorrente).length === 0 && !isAdding ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <FolderIcon className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">Nessuna configurazione presente in questa sezione.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(catalogoCorrente).map(([macro, items]) => (
                                <div key={macro} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-800 text-white px-6 py-3 font-bold text-lg flex items-center gap-2">
                                        <FolderIcon className="h-5 w-5 text-gray-400" /> {macro}
                                    </div>
                                    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {items.map(item => (
                                            <div key={item.id} className={`bg-gray-50 border rounded-xl p-4 relative group transition-all ${pendingItemToResolve && pendingItemToResolve.tipoArticolo === activeTab ? 'border-yellow-300 hover:border-yellow-500 hover:shadow-md' : 'border-gray-200 hover:border-indigo-300'}`}>
                                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setFormData(item); setIsAdding(true); window.scrollTo(0, 0); }} className="p-1.5 bg-white text-indigo-600 border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm rounded-md" title="Modifica e Aggiungi voci">
                                                        <WrenchScrewdriverIcon className="h-4 w-4"/>
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-white text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 shadow-sm rounded-md" title="Elimina intero gruppo">
                                                        <TrashIcon className="h-4 w-4"/>
                                                    </button>
                                                </div>
                                                <h4 className="font-bold text-gray-800 text-md mb-3 border-b border-gray-200 pb-2 pr-16">{item.famiglia}</h4>
                                                <ul className="space-y-2">
                                                    {item.voci.map(voce => (
                                                        <li key={voce} className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full"></div> {voce}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};