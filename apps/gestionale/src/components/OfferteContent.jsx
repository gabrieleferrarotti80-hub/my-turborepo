import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'; 
// ✅ Aggiunto useCantieriManager all'import
import { useFirebaseData, useOfferteManager, useCantieriManager } from 'shared-core'; 
import { OffertaWorkspaceView, NuovaOffertaForm } from 'shared-ui'; 
import { 
    DocumentPlusIcon, MagnifyingGlassIcon, DocumentTextIcon, ArchiveBoxIcon, PaperAirplaneIcon, 
    BuildingOfficeIcon, RectangleStackIcon, CheckBadgeIcon, UserGroupIcon, 
    ViewColumnsIcon, PlusIcon, XMarkIcon, UserPlusIcon, ArrowLeftIcon 
} from '@heroicons/react/24/outline';

import { WorkspacePrivato } from './workspace-privato/WorkspacePrivato';

export const OfferteContent = () => {
    const firebaseContext = useFirebaseData();
    const { data, companyID, userRole, loadingData, user } = firebaseContext;
    const safeDb = firebaseContext.db || data?.db; 
    const safeStorage = firebaseContext.storage || data?.storage; 
    
    const { offerte = [], clients = [], users = [], forms = [], eventi = [], reports = [], attrezzature = [], fornitori = [], noleggiatori = [], subappaltatori = [] } = data || {};

    const { 
        addOfferta, salvaAnalisiPreliminare, salvaElaborazione, approvaOfferta, archiveOfferta, inviaOfferta, accettaOfferta,
        rifiutaOfferta, logProroga, aggiungiReferenteCliente, isSaving 
    } = useOfferteManager(safeDb, safeStorage, user, companyID);

    // ✅ Inizializziamo il motore dei cantieri
    const { addCantiere } = useCantieriManager(safeDb, companyID, data?.companies || []);

    const currentUserData = useMemo(() => users.find(u => u.id === user?.uid || u.email === user?.email), [users, user]);

    const [viewMode, setViewMode] = useState('list'); 
    const [macroArea, setMacroArea] = useState('gare'); 
    const [activeTab, setActiveTab] = useState('tutte'); 
    const [selectedOfferta, setSelectedOfferta] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [showNewClientModal, setShowNewClientModal] = useState(false);
    const [newClientData, setNewClientData] = useState({ ragioneSociale: '', partitaIva: '', telefono: '', email: '' });

    const handleSaveNewClient = async () => {
        if(!newClientData.ragioneSociale) return alert("Inserisci almeno la Ragione Sociale.");
        try {
            const payload = { ...newClientData, companyID: companyID, createdAt: serverTimestamp() };
            await addDoc(collection(safeDb, 'clients'), payload);
            setShowNewClientModal(false);
            setNewClientData({ ragioneSociale: '', partitaIva: '', telefono: '', email: '' });
            alert("Cliente creato! Ora puoi selezionarlo dal menu a tendina.");
        } catch (error) { alert("Errore durante la creazione del cliente: " + error.message); }
    };

    const checkAndOpenOfferta = useCallback(async () => {
        const pendingId = localStorage.getItem('APRI_OFFERTA_ID');
        if (!pendingId) return;
        
        let foundOfferta = offerte.find(o => o.id === pendingId);
        if (!foundOfferta && safeDb) {
            try {
                const docSnap = await getDoc(doc(safeDb, 'offerte', pendingId));
                if (docSnap.exists()) foundOfferta = { id: docSnap.id, ...docSnap.data() };
            } catch(e) { console.error(e); }
        }

        if (foundOfferta) {
            setSelectedOfferta(foundOfferta);
            setMacroArea(foundOfferta.tipoOfferta === 'privato' ? 'privati' : 'gare');
            setViewMode(foundOfferta.tipoOfferta === 'privato' ? 'workspace_privato' : 'workspace');
        }
        localStorage.removeItem('APRI_OFFERTA_ID');
    }, [offerte, safeDb]);

    useEffect(() => { if (!loadingData && offerte.length > 0) checkAndOpenOfferta(); }, [loadingData, offerte, checkAndOpenOfferta]);

    const canWrite = userRole === 'proprietario' ? !!companyID : true;

    const { gareOfferte, privatiOfferte, filteredGare } = useMemo(() => {
        const isSuperAdmin = userRole === 'proprietario' && companyID === null;
        let baseOfferte = isSuperAdmin ? offerte : offerte.filter(o => o.companyID === companyID);

        const gare = baseOfferte.filter(o => !o.tipoOfferta || o.tipoOfferta === 'gara');
        const privati = baseOfferte.filter(o => o.tipoOfferta === 'privato');

        let filtratiGare = [...gare];
        if (activeTab === 'in_corso') filtratiGare = filtratiGare.filter(o => !['accettata', 'rifiutata', 'archiviata', 'convertita_in_cantiere'].includes(o.stato));
        else if (activeTab === 'vinte') filtratiGare = filtratiGare.filter(o => ['accettata', 'convertita_in_cantiere'].includes(o.stato));
        else if (activeTab === 'archivio') filtratiGare = filtratiGare.filter(o => ['rifiutata', 'archiviata'].includes(o.stato));

        filtratiGare.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtratiGare = filtratiGare.filter(o => {
                const cliente = clients.find(c => c.id === o.clienteId);
                const nomeCliente = cliente ? (cliente.ragioneSociale || `${cliente.nome} ${cliente.cognome}`).toLowerCase() : '';
                return (o.nomeOfferta || '').toLowerCase().includes(term) || nomeCliente.includes(term);
            });
        }

        return { gareOfferte: gare, privatiOfferte: privati, filteredGare: filtratiGare };
    }, [offerte, clients, userRole, companyID, activeTab, searchTerm]);

    const getStatusBadge = (stato) => {
        switch (stato) {
            case 'in_elaborazione': return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-amber-200">In Elaborazione</span>;
            case 'in_preventivazione':
            case 'in_approvazione': return <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-purple-200">In Approvazione</span>;
            case 'pronta_per_invio': return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-blue-200">Pronta Invio</span>;
            case 'inviata': return <span className="bg-sky-100 text-sky-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-sky-200">Inviata</span>;
            case 'accettata':
            case 'convertita_in_cantiere': return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-emerald-200">Vinta / Convertita</span>;
            case 'rifiutata': return <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-red-200">Persa</span>;
            case 'archiviata': return <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-slate-300">Archiviata</span>;
            default: return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-slate-200">{stato?.replace(/_/g, ' ') || 'Nuova'}</span>;
        }
    };

    const handleCreateOfferta = async (datiOfferta) => {
        const res = await addOfferta(datiOfferta.nomeOfferta, datiOfferta.clienteId);
        if (res.success) {
            if (macroArea === 'privati') {
                await updateDoc(doc(safeDb, 'offerte', res.id), { tipoOfferta: 'privato', stato: 'da_valutare' });
                setSelectedOfferta({ id: res.id, nomeOfferta: datiOfferta.nomeOfferta, clienteId: datiOfferta.clienteId, stato: 'da_valutare', tipoOfferta: 'privato' });
                setViewMode('workspace_privato'); 
            } else {
                setSelectedOfferta({ id: res.id, nomeOfferta: datiOfferta.nomeOfferta, clienteId: datiOfferta.clienteId, stato: 'nuova', faseCorrente: 1, tipoOfferta: 'gara' });
                setViewMode('workspace');
            }
        } else alert(res.message);
    };

    const handleUpdateOffertaPrivata = async (id, updates) => {
        try {
            await updateDoc(doc(safeDb, 'offerte', id), updates);
            setSelectedOfferta(prev => ({...prev, ...updates}));
        } catch(e) { console.error(e); }
    };

    // ✅ NUOVA FUNZIONE: Usa addCantiere passandogli le fasi!
    const handleConvertiCantierePrivato = async (offerta, datiPreventivo, datiLead, budgetCosti, fasiAttuali) => {
        try {
            if (safeDb && companyID) {
                const clienteAssociato = clients.find(c => c.id === offerta.clienteId);
                const ricavoTotale = datiPreventivo.totale || offerta.valoreChiusura || 0;

                const datiCantiere = {
                    clienteId: offerta.clienteId || "",
                    clienteNome: clienteAssociato?.ragioneSociale || `${clienteAssociato?.nome || ''} ${clienteAssociato?.cognome || ''}` || "Cliente",
                    nomeCliente: clienteAssociato?.ragioneSociale || "Cliente",
                    offertaCollegataId: offerta.id,
                    nomeCantiere: datiPreventivo.oggetto || offerta.nomeOfferta || "Lavoro Privato",
                    titolo: datiPreventivo.oggetto || offerta.nomeOfferta || "Lavoro Privato",
                    indirizzoCantiere: datiLead.indirizzoCantiere || "",
                    descrizioneCantiere: datiLead.descrizione || "Nessuna descrizione",
                    dataInizio: new Date().toISOString(), 
                    dataPresuntaInizio: new Date().toISOString(),
                    valoreAppalto: ricavoTotale,
                    budgetCosti: budgetCosti || 0,
                    utilePrevisto: ricavoTotale - (budgetCosti || 0),
                };

                // Chiamata al nuovo manager che gestisce il batch con i subcantieri
                const res = await addCantiere(datiCantiere, fasiAttuali);

                if (res.success) {
                    await updateDoc(doc(safeDb, 'offerte', offerta.id), {
                        stato: 'convertita_in_cantiere',
                        cantiereId: res.id,
                        valoreChiusura: ricavoTotale
                    });
                    alert("🏗️ Cantiere Operativo generato! Le fasi, i materiali e la manodopera sono stati trasferiti con successo.");
                    setViewMode('list'); 
                } else {
                    alert("Errore: " + res.message);
                }
            }
        } catch (error) { 
            console.error("Errore conversione cantiere:", error); 
            alert("Si è verificato un errore durante la conversione.");
        }
    };

    if (loadingData) return <div className="p-10 text-center animate-pulse font-bold text-slate-400">Caricamento Offerte...</div>;

    if (viewMode === 'add') {
        return (
            <div className="container mx-auto p-6 max-w-4xl animate-fade-in relative">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {macroArea === 'privati' ? 'Nuovo Lavoro Privato (Lead)' : 'Nuovo Dossier Gara'}
                        </h2>
                        <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" /> Annulla
                        </button>
                    </div>

                    <div className="mb-6 flex justify-end">
                        <button onClick={() => setShowNewClientModal(true)} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors text-sm">
                            <UserPlusIcon className="h-5 w-5" /> Nuovo Cliente Rapido
                        </button>
                    </div>

                    <NuovaOffertaForm clients={clients} onSubmit={handleCreateOfferta} isSaving={isSaving} onBack={() => setViewMode('list')}/>
                </div>

                {showNewClientModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl backdrop-blur-sm p-4">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlusIcon className="h-5 w-5 text-indigo-600"/> Aggiungi Cliente</h3>
                                <button onClick={() => setShowNewClientModal(false)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="space-y-3">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Ragione Sociale / Nome e Cognome *</label><input type="text" value={newClientData.ragioneSociale} onChange={e=>setNewClientData({...newClientData, ragioneSociale: e.target.value})} className="w-full rounded-lg border-slate-300"/></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">P.IVA / C.F.</label><input type="text" value={newClientData.partitaIva} onChange={e=>setNewClientData({...newClientData, partitaIva: e.target.value})} className="w-full rounded-lg border-slate-300"/></div>
                                <div className="flex gap-2">
                                    <div className="w-1/2"><label className="block text-xs font-bold text-slate-500 mb-1">Telefono</label><input type="text" value={newClientData.telefono} onChange={e=>setNewClientData({...newClientData, telefono: e.target.value})} className="w-full rounded-lg border-slate-300"/></div>
                                    <div className="w-1/2"><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input type="email" value={newClientData.email} onChange={e=>setNewClientData({...newClientData, email: e.target.value})} className="w-full rounded-lg border-slate-300"/></div>
                                </div>
                            </div>
                            <button onClick={handleSaveNewClient} className="w-full mt-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700">Salva Cliente</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === 'workspace' && selectedOfferta) {
        const currentOfferta = offerte.find(o => o.id === selectedOfferta.id) || selectedOfferta;
        const clienteAssociato = clients.find(c => c.id === currentOfferta.clienteId);
        
        const formSubmissionsHandlers = {
            handleAnalisiSubmit: async (datiForm) => {
                const res = await salvaAnalisiPreliminare(currentOfferta.id, datiForm, currentOfferta.nomeOfferta, clienteAssociato?.ragioneSociale);
                if (res.success) setSelectedOfferta(prev => ({...prev, faseCorrente: 2, stato: 'in_elaborazione'}));
            },
            handleElaborazioneSubmit: async (datiElaborazione) => {
                const res = await salvaElaborazione(currentOfferta.id, datiElaborazione);
                if (res.success) setSelectedOfferta(prev => ({...prev, faseCorrente: datiElaborazione.approvazioneNecessaria ? 2 : 3}));
            },
            handleApproveOffer: async () => {
                const res = await approvaOfferta(currentOfferta.id);
                if (res.success) setSelectedOfferta(prev => ({...prev, faseCorrente: 3, stato: 'pronta_per_invio'}));
            }
        };

        const handleConvertiInCantiere = async (id) => {
            // ... logica gare (verrà aggiornata quando faremo le Gare d'Appalto)
        };

        return (
            <OffertaWorkspaceView 
                offerta={currentOfferta}
                faseAttivaId={currentOfferta.faseCorrente === 1 ? 'analisi' : currentOfferta.faseCorrente === 2 ? 'elaborazione' : 'invio'}
                clienteSelezionato={clienteAssociato}
                formSubmissions={formSubmissionsHandlers} 
                isSaving={isSaving} personnel={users} availableForms={forms} companyId={companyID} currentUser={user}
                onAddReferente={(datiRef) => aggiungiReferenteCliente(currentOfferta.clienteId, datiRef, currentOfferta.nomeOfferta)}
                onLogProroga={() => logProroga(currentOfferta.id, user.uid)}
                onArchivia={async () => { await archiveOfferta(currentOfferta.id); setViewMode('list'); }}
                onSetInviata={() => inviaOfferta(currentOfferta.id, true)}
                onAccettaOfferta={async (id, valoreFinale) => { await accettaOfferta(id); setViewMode('list'); }}
                onConvertiInCantiere={handleConvertiInCantiere} onAggiornaCantiere={() => {}}
                onRifiutaOfferta={async (id) => { await rifiutaOfferta(id); setViewMode('list'); }}
                onPrepareEmailDraft={() => {}} onBack={() => { setViewMode('list'); setSelectedOfferta(null); }}
            />
        );
    }

    if (viewMode === 'workspace_privato' && selectedOfferta) {
        const currentOfferta = offerte.find(o => o.id === selectedOfferta.id) || selectedOfferta;
        const clienteAssociato = clients.find(c => c.id === currentOfferta.clienteId);
        const currentCompany = (data?.companies || []).find(c => c.id === companyID);

        return (
            <WorkspacePrivato 
                offerta={currentOfferta} 
                cliente={clienteAssociato} 
                azienda={currentCompany} 
                dipendenti={users}
                attrezzature={attrezzature}
                fornitori={fornitori}
                noleggiatori={noleggiatori}
                subappaltatori={subappaltatori}
                currentUser={currentUserData}
                storage={safeStorage}
                safeDb={safeDb}
                companyID={companyID}
                eventi={eventi}
                forms={forms}
                reports={reports}
                onBack={() => { setViewMode('list'); setSelectedOfferta(null); }}
                onUpdate={handleUpdateOffertaPrivata}
                onConvertiCantiere={handleConvertiCantierePrivato}
            />
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-fade-in pb-20">
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex bg-slate-200/70 p-1.5 rounded-2xl shadow-inner w-full md:w-max border border-slate-300/50">
                    <button 
                        onClick={() => setMacroArea('gare')} 
                        className={`flex-1 md:w-64 py-3 px-6 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${macroArea === 'gare' ? 'bg-white text-indigo-800 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BuildingOfficeIcon className="h-5 w-5"/> Gare d'Appalto
                    </button>
                    <button 
                        onClick={() => setMacroArea('privati')} 
                        className={`flex-1 md:w-64 py-3 px-6 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${macroArea === 'privati' ? 'bg-indigo-600 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <UserGroupIcon className="h-5 w-5"/> Lavori Privati (CRM)
                    </button>
                </div>
            </div>

            {/* VISTA GARE */}
            {macroArea === 'gare' && (
                <div className="animate-fade-in-up">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                        <div><h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><DocumentTextIcon className="h-8 w-8 text-indigo-600"/> Gare e Appalti Pubblici</h1></div>
                        <div className="bg-slate-100 p-1.5 rounded-xl flex flex-wrap gap-1 shadow-inner w-full md:w-auto">
                            <button onClick={() => setActiveTab('tutte')} className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'tutte' ? 'bg-white shadow-sm text-indigo-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700'} `}><RectangleStackIcon className="h-4 w-4"/> Tutte</button>
                            <button onClick={() => setActiveTab('in_corso')} className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'in_corso' ? 'bg-white shadow-sm text-blue-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><PaperAirplaneIcon className="h-4 w-4"/> In Corso</button>
                            <button onClick={() => setActiveTab('vinte')} className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'vinte' ? 'bg-white shadow-sm text-emerald-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><CheckBadgeIcon className="h-4 w-4"/> Vinte</button>
                            <button onClick={() => setActiveTab('archivio')} className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'archivio' ? 'bg-white shadow-sm text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><ArchiveBoxIcon className="h-4 w-4"/> Perse</button>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="relative w-full md:w-96"><MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input type="text" placeholder="Cerca dossier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm" /></div>
                            {canWrite && (<button onClick={() => setViewMode('add')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"><DocumentPlusIcon className="h-5 w-5" /> Crea Dossier Gara</button>)}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-100/70">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Offerta</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Stazione Appaltante</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Data Creazione</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Stato</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {filteredGare.map(offerta => (
                                        <tr key={offerta.id} onClick={() => { setSelectedOfferta(offerta); setViewMode('workspace'); }} className="hover:bg-indigo-50/50 cursor-pointer">
                                            <td className="px-6 py-5 font-bold text-slate-900">{offerta.nomeOfferta || 'Senza Titolo'}</td>
                                            <td className="px-6 py-5 text-xs text-slate-700">{clients.find(c => c.id === offerta.clienteId)?.ragioneSociale || 'N.D.'}</td>
                                            <td className="px-6 py-5 text-xs text-slate-500 font-medium">{offerta.createdAt?.toDate ? offerta.createdAt.toDate().toLocaleDateString('it-IT') : 'N/D'}</td>
                                            <td className="px-6 py-5">{getStatusBadge(offerta.stato)}</td>
                                        </tr>
                                    ))}
                                    {filteredGare.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">Nessuna gara trovata.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA PRIVATI (Kanban) */}
            {macroArea === 'privati' && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ViewColumnsIcon className="h-6 w-6 text-indigo-600"/> Pipeline Preventivi Privati</h2>
                        {canWrite && (<button onClick={() => setViewMode('add')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 text-sm shadow-sm"><PlusIcon className="h-4 w-4" /> Nuovo Preventivo Privato</button>)}
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                        
                        <div className="min-w-[300px] w-[300px] bg-slate-100 rounded-2xl p-3 flex flex-col snap-start">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Sopralluogo / Studio</h3>
                                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{privatiOfferte.filter(o => !o.stato || ['nuova', 'da_valutare', 'in_valutazione', 'sopralluogo_fissato', 'attesa_conferma_tecnico'].includes(o.stato)).length}</span>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                                {privatiOfferte.filter(o => !o.stato || ['nuova', 'da_valutare', 'in_valutazione', 'sopralluogo_fissato', 'attesa_conferma_tecnico'].includes(o.stato)).map(o => {
                                    const eventReq = eventi.filter(e => e.offertaId === o.id && e.tipo === 'sopralluogo').sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))[0];
                                    const isConf = eventReq?.stato === 'confermato';
                                    return (
                                        <div key={o.id} onClick={() => { setSelectedOfferta(o); setViewMode('workspace_privato'); }} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group">
                                            <p className="text-[10px] text-indigo-600 font-bold uppercase mb-1">{clients.find(c => c.id === o.clienteId)?.ragioneSociale || 'Cliente'}</p>
                                            <p className="font-bold text-slate-800 text-sm leading-tight mb-2 group-hover:text-indigo-700">{o.nomeOfferta}</p>
                                            {isConf ? <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Sopralluogo Confermato ✅</span> : o.stato === 'attesa_conferma_tecnico' ? <span className="text-[9px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded">⏳ Attesa Tecnico</span> : o.stato === 'sopralluogo_fissato' ? <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Fissato Ufficio</span> : null}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="min-w-[300px] w-[300px] bg-purple-50 rounded-2xl p-3 flex flex-col snap-start">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest">In Approvazione</h3>
                                <span className="bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{privatiOfferte.filter(o => ['in_preventivazione', 'in_approvazione', 'approvata'].includes(o.stato)).length}</span>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                                {privatiOfferte.filter(o => ['in_preventivazione', 'in_approvazione', 'approvata'].includes(o.stato)).map(o => (
                                    <div key={o.id} onClick={() => { setSelectedOfferta(o); setViewMode('workspace_privato'); }} className="bg-white p-4 rounded-xl shadow-sm border border-purple-200 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group">
                                        <p className="text-[10px] text-purple-600 font-bold uppercase mb-1">{clients.find(c => c.id === o.clienteId)?.ragioneSociale || 'Cliente'}</p>
                                        <p className="font-bold text-slate-800 text-sm leading-tight mb-2 group-hover:text-purple-700">{o.nomeOfferta}</p>
                                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">{o.stato === 'approvata' ? 'Approvata ✅' : 'In Lavorazione'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="min-w-[300px] w-[300px] bg-sky-50 rounded-2xl p-3 flex flex-col snap-start">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-xs font-black text-sky-600 uppercase tracking-widest">Inviati (In Attesa)</h3>
                                <span className="bg-sky-200 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{privatiOfferte.filter(o => o.stato === 'inviata').length}</span>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                                {privatiOfferte.filter(o => o.stato === 'inviata').map(o => (
                                    <div key={o.id} onClick={() => { setSelectedOfferta(o); setViewMode('workspace_privato'); }} className="bg-white p-4 rounded-xl shadow-sm border border-sky-200 cursor-pointer hover:border-sky-400 hover:shadow-md transition-all group">
                                        <p className="text-[10px] text-sky-600 font-bold uppercase mb-1">{clients.find(c => c.id === o.clienteId)?.ragioneSociale || 'Cliente'}</p>
                                        <p className="font-bold text-slate-800 text-sm leading-tight mb-2 group-hover:text-sky-700">{o.nomeOfferta}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-400 font-medium">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('it-IT') : 'N/D'}</span>
                                            {o.valoreChiusura && <span className="text-xs font-black text-sky-700">€ {o.valoreChiusura}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="min-w-[300px] w-[300px] bg-emerald-50 rounded-2xl p-3 flex flex-col snap-start">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">Lavori Vinti</h3>
                                <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{privatiOfferte.filter(o => ['accettata', 'convertita_in_cantiere'].includes(o.stato)).length}</span>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                                {privatiOfferte.filter(o => ['accettata', 'convertita_in_cantiere'].includes(o.stato)).map(o => (
                                    <div key={o.id} onClick={() => { setSelectedOfferta(o); setViewMode('workspace_privato'); }} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group">
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">{clients.find(c => c.id === o.clienteId)?.ragioneSociale || 'Cliente'}</p>
                                        <p className="font-bold text-slate-800 text-sm leading-tight mb-2 group-hover:text-emerald-700">{o.nomeOfferta}</p>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-50">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded">{o.stato === 'convertita_in_cantiere' ? 'In Cantiere' : 'Vinto'}</span>
                                            {o.valoreChiusura && <span className="text-xs font-black text-emerald-700">€ {o.valoreChiusura}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="min-w-[300px] w-[300px] bg-red-50 rounded-2xl p-3 flex flex-col snap-start opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">Persi / Rifiutati</h3>
                                <span className="bg-red-200 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{privatiOfferte.filter(o => ['rifiutata', 'archiviata'].includes(o.stato)).length}</span>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                                {privatiOfferte.filter(o => ['rifiutata', 'archiviata'].includes(o.stato)).map(o => (
                                    <div key={o.id} onClick={() => { setSelectedOfferta(o); setViewMode('workspace_privato'); }} className="bg-white p-4 rounded-xl shadow-sm border border-red-100 cursor-pointer hover:border-red-300 transition-all">
                                        <p className="text-[10px] text-red-500 font-bold uppercase mb-1 line-through">{clients.find(c => c.id === o.clienteId)?.ragioneSociale || 'Cliente'}</p>
                                        <p className="font-bold text-slate-600 text-sm leading-tight mb-2">{o.nomeOfferta}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};