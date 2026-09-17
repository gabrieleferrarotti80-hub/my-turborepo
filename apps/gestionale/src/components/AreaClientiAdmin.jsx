import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    EyeIcon, DocumentTextIcon, KeyIcon, UserIcon, 
    BuildingOfficeIcon, CheckCircleIcon, ClockIcon,
    PhotoIcon, PencilSquareIcon, GlobeAltIcon,
    FunnelIcon, MegaphoneIcon, EyeSlashIcon, MapPinIcon, UsersIcon,
    CalendarIcon, HomeIcon, CurrencyEuroIcon, ChevronRightIcon, XMarkIcon,
    Bars3Icon // 🌟 Aggiunto per il menu
} from '@heroicons/react/24/outline';

const formatDate = (dateVal) => {
    if (!dateVal) return '';
    let d;
    if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) d = new Date(dateVal.seconds * 1000);
    else if (dateVal instanceof Date) d = dateVal;
    else d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
};

const extractDateForInput = (dateVal) => {
    if (!dateVal) return '';
    let d;
    if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) d = new Date(dateVal.seconds * 1000);
    else if (dateVal instanceof Date) d = dateVal;
    else d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const extractTime = (dateVal) => {
    if (!dateVal) return '';
    let d;
    if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) d = new Date(dateVal.seconds * 1000);
    else if (dateVal instanceof Date) d = dateVal;
    else d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

export const AreaClientiAdmin = () => {
    const { data, db, user } = useFirebaseData();
    const storage = getStorage();
    
    const [activeTab, setActiveTab] = useState('preview');
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [selectedCantiereId, setSelectedCantiereId] = useState('');
    
    // STATI MODERAZIONE
    const [testiModificati, setTestiModificati] = useState({});
    const [tipologiaModificata, setTipologiaModificata] = useState({});
    const [prepostoModificato, setPrepostoModificato] = useState({});
    const [operatoriModificati, setOperatoriModificati] = useState({});
    const [dataModificata, setDataModificata] = useState({});
    const [oraModificata, setOraModificata] = useState({});
    const [luogoModificato, setLuogoModificato] = useState({});
    const [nascondiFoto, setNascondiFoto] = useState({});
    const [editLinkLocation, setEditLinkLocation] = useState({}); 
    const [customFotoFiles, setCustomFotoFiles] = useState({}); 
    const [customFotoPreviews, setCustomFotoPreviews] = useState({}); 
    const [isPublishing, setIsPublishing] = useState(false);

    // STATI ANTEPRIMA
    const [previewView, setPreviewView] = useState('dashboard');
    const [previewCantiereId, setPreviewCantiereId] = useState(null);
    const [previewDateFrom, setPreviewDateFrom] = useState('');
    const [previewDateTo, setPreviewDateTo] = useState('');
    const [previewPhotoModal, setPreviewPhotoModal] = useState(null);
    // 🌟 STATO PER COMPRIMERE LA SIDEBAR DELL'ANTEPRIMA
    const [isPreviewSidebarCollapsed, setIsPreviewSidebarCollapsed] = useState(false);

    const clienti = data.clients || [];
    const cantieri = data.cantieri || [];
    const reports = data.reports || [];
    const users = data.users || [];

    const clienteSelezionato = useMemo(() => clienti.find(c => c.id === selectedClienteId), [clienti, selectedClienteId]);

    const cantieriCliente = useMemo(() => {
        if (!selectedClienteId) return [];
        return cantieri.filter(c => c.clienteId === selectedClienteId);
    }, [selectedClienteId, cantieri]);

    const cantieriVisibiliPreview = useMemo(() => {
        return cantieriCliente.filter(c => c.visibilePortale === true);
    }, [cantieriCliente]);

    const rapportiniPubblicatiPreview = useMemo(() => {
        const idsVisibili = cantieriVisibiliPreview.map(c => c.id);
        return reports.filter(r => r.pubblicatoCliente === true && idsVisibili.includes(r.cantiereId))
            .sort((a, b) => {
                const timeA = new Date(a.dataCliente || a.dataPubblicazione || 0).getTime();
                const timeB = new Date(b.dataCliente || b.dataPubblicazione || 0).getTime();
                return timeB - timeA;
            });
    }, [reports, cantieriVisibiliPreview]);

    useEffect(() => {
        if (previewView === 'reports' && !previewCantiereId && cantieriVisibiliPreview.length > 0) {
            setPreviewCantiereId(cantieriVisibiliPreview[0].id);
        }
    }, [previewView, cantieriVisibiliPreview, previewCantiereId]);

    useEffect(() => {
        setPreviewDateFrom('');
        setPreviewDateTo('');
    }, [previewCantiereId]);

    const rapportiniInAttesa = useMemo(() => {
        let inAttesa = reports.filter(r => !r.pubblicatoCliente);
        const cantieriVisibiliIds = cantieri.filter(c => c.visibilePortale === true).map(c => c.id);
        inAttesa = inAttesa.filter(r => cantieriVisibiliIds.includes(r.cantiereId));

        if (selectedCantiereId) {
            inAttesa = inAttesa.filter(r => r.cantiereId === selectedCantiereId);
        } else if (selectedClienteId) {
            const ids = cantieriCliente.map(c => c.id);
            inAttesa = inAttesa.filter(r => ids.includes(r.cantiereId));
        }
        return inAttesa.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
    }, [reports, selectedCantiereId, selectedClienteId, cantieriCliente, cantieri]);

    useEffect(() => {
        const initText = {}, initData = {}, initOra = {}, initLuogo = {}, initPreposto = {}, initOperatori = {};
        rapportiniInAttesa.forEach(r => {
            if (testiModificati[r.id] === undefined) initText[r.id] = r.note || '';
            if (dataModificata[r.id] === undefined) initData[r.id] = extractDateForInput(r.createdAt || r.data);
            if (oraModificata[r.id] === undefined) initOra[r.id] = extractTime(r.createdAt || r.data);
            
            let autoLocation = r.indirizzo || '';
            if (!autoLocation && r.location && r.location.latitude) {
                autoLocation = `https://www.google.com/maps?q=${r.location.latitude},${r.location.longitude}`;
            }
            if (luogoModificato[r.id] === undefined) initLuogo[r.id] = autoLocation;
            
            const prepostoName = users.find(u => u.id === r.userId) ? `${users.find(u => u.id === r.userId).nome} ${users.find(u => u.id === r.userId).cognome}` : 'Operatore';
            if (prepostoModificato[r.id] === undefined) initPreposto[r.id] = prepostoName;
            
            let operatoriStr = '';
            const arrOp = r.operatori || r.squadra || [];
            if (Array.isArray(arrOp)) {
                operatoriStr = arrOp.map(m => {
                    const u = users.find(usr => usr.id === (typeof m === 'object' ? m.id : m));
                    return u ? `${u.nome} ${u.cognome}` : m;
                }).filter(n => n && n !== prepostoName).join(', ');
            }
            if (operatoriModificati[r.id] === undefined) initOperatori[r.id] = operatoriStr;
        });
        if (Object.keys(initText).length > 0) setTestiModificati(prev => ({ ...prev, ...initText }));
        if (Object.keys(initData).length > 0) setDataModificata(prev => ({ ...prev, ...initData }));
        if (Object.keys(initOra).length > 0) setOraModificata(prev => ({ ...prev, ...initOra }));
        if (Object.keys(initLuogo).length > 0) setLuogoModificato(prev => ({ ...prev, ...initLuogo }));
        if (Object.keys(initPreposto).length > 0) setPrepostoModificato(prev => ({ ...prev, ...initPreposto }));
        if (Object.keys(initOperatori).length > 0) setOperatoriModificati(prev => ({ ...prev, ...initOperatori }));
    }, [rapportiniInAttesa, users]);

    const handleFileChange = (reportId, e) => {
        const file = e.target.files[0];
        if (file) {
            setCustomFotoFiles(prev => ({ ...prev, [reportId]: file }));
            setCustomFotoPreviews(prev => ({ ...prev, [reportId]: URL.createObjectURL(file) }));
            setNascondiFoto(prev => ({ ...prev, [reportId]: false })); 
        }
    };

    const handlePubblicaReport = async (report) => {
        setIsPublishing(true);
        try {
            let finalFotoUrl = report.fotoClienteUrl || report.fileUrl || (report.fotoUrls && report.fotoUrls[0]) || '';
            if (customFotoFiles[report.id]) {
                const file = customFotoFiles[report.id];
                const storageRef = ref(storage, `portale_clienti/${report.id}/${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                finalFotoUrl = await getDownloadURL(snapshot.ref);
            }

            const reportRef = doc(db, 'reports', report.id);
            const testoFinale = testiModificati[report.id] !== undefined ? testiModificati[report.id] : (report.note || '');
            const tagFinale = tipologiaModificata[report.id] !== undefined ? tipologiaModificata[report.id] : (report.tipologia || 'Aggiornamento Lavori');
            const prepostoFinale = prepostoModificato[report.id] !== undefined ? prepostoModificato[report.id] : '';
            const operatoriFinale = operatoriModificati[report.id] !== undefined ? operatoriModificati[report.id] : '';
            const dataFinale = dataModificata[report.id] !== undefined ? dataModificata[report.id] : extractDateForInput(report.createdAt || report.data);
            const oraFinale = oraModificata[report.id] !== undefined ? oraModificata[report.id] : extractTime(report.createdAt || report.data);
            const luogoFinale = luogoModificato[report.id] !== undefined ? luogoModificato[report.id] : '';
            const mostraFoto = nascondiFoto[report.id] ? false : true;
            
            await updateDoc(reportRef, {
                pubblicatoCliente: true,
                descrizioneCliente: testoFinale,
                tipologiaCliente: tagFinale,
                prepostoCliente: prepostoFinale,
                operatoriCliente: operatoriFinale,
                dataCliente: dataFinale,
                oraCliente: oraFinale,
                luogoCliente: luogoFinale,
                mostraFotoCliente: mostraFoto,
                fotoClienteUrl: finalFotoUrl, 
                dataPubblicazione: new Date().toISOString(),
                approvatoDa: user?.uid || user?.id || 'Sconosciuto'
            });

            setCustomFotoFiles(prev => { const n = {...prev}; delete n[report.id]; return n; });
            setCustomFotoPreviews(prev => { const n = {...prev}; delete n[report.id]; return n; });
        } catch (error) {
            console.error(error);
            alert("Errore durante la pubblicazione. Riprova.");
        } finally {
            setIsPublishing(false);
        }
    };

    const toggleVisibilitaCantiere = async (cantiereId, currentStatus) => {
        try {
            const cantiereRef = doc(db, 'cantieri', cantiereId);
            await updateDoc(cantiereRef, {
                visibilePortale: !currentStatus 
            });
        } catch (error) {
            console.error("Errore aggiornamento visibilità cantiere:", error);
            alert("Si è verificato un errore nel salvataggio.");
        }
    };

    const getNomeCantiere = (id) => cantieri.find(c => c.id === id)?.nomeCantiere || 'Cantiere';

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen animate-fade-in relative">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <GlobeAltIcon className="h-8 w-8 text-indigo-600" /> Portale Clienti
                </h1>
            </div>

            <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl mb-6 max-w-2xl">
                <button onClick={() => setActiveTab('preview')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}>Anteprima</button>
                <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}>
                    Moderazione {rapportiniInAttesa.length > 0 && <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{rapportiniInAttesa.length}</span>}
                </button>
                <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}>Accessi</button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={selectedClienteId} onChange={(e) => {setSelectedClienteId(e.target.value); setSelectedCantiereId('');}} className="p-2.5 bg-gray-50 border rounded-xl text-sm font-bold">
                    <option value="">-- Seleziona Cliente --</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.ragioneSociale || `${c.nome} ${c.cognome}`}</option>)}
                </select>
                <select value={selectedCantiereId} onChange={(e) => setSelectedCantiereId(e.target.value)} disabled={!selectedClienteId} className="p-2.5 bg-gray-50 border rounded-xl text-sm font-bold">
                    <option value="">-- Tutti i Cantieri --</option>
                    {cantieriCliente.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                </select>
            </div>

            {/* TAB ANTEPRIMA */}
            {activeTab === 'preview' && (
                <div className="bg-slate-800 p-4 md:p-8 rounded-3xl shadow-2xl flex justify-center items-center">
                    {!clienteSelezionato ? (
                        <div className="text-center py-20 text-slate-400 font-bold">
                            <UserIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            Seleziona un cliente dal menu in alto per visualizzare la sua anteprima.
                        </div>
                    ) : (
                        <div className="w-full max-w-6xl h-[700px] bg-slate-50 rounded-2xl border-[6px] border-slate-900 shadow-inner flex overflow-hidden">
                            
                            {/* 🌟 SIMULATORE SIDEBAR COMPRIMIBILE 🌟 */}
                            <aside className={`bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isPreviewSidebarCollapsed ? 'w-16' : 'w-64'}`}>
                                <div className="h-16 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between px-3 transition-all overflow-hidden">
                                    {!isPreviewSidebarCollapsed && (
                                        <div className="flex items-center gap-3 overflow-hidden animate-fade-in">
                                            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0">
                                                <UserIcon className="h-5 w-5" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h2 className="text-sm font-black text-white truncate">{clienteSelezionato.ragioneSociale || clienteSelezionato.nome}</h2>
                                                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Area Riservata</p>
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setIsPreviewSidebarCollapsed(!isPreviewSidebarCollapsed)}
                                        className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ${isPreviewSidebarCollapsed ? 'mx-auto' : ''}`}
                                    >
                                        <Bars3Icon className="h-5 w-5" />
                                    </button>
                                </div>
                                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 overflow-x-hidden">
                                    {!isPreviewSidebarCollapsed && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-2 animate-fade-in">Menu</p>}
                                    <button onClick={() => setPreviewView('dashboard')} className={`flex items-center rounded-lg transition-all font-bold text-xs ${isPreviewSidebarCollapsed ? 'justify-center p-2 mx-auto w-10 h-10' : 'gap-2 px-3 py-2 w-full'} ${previewView === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                                        <HomeIcon className="h-4 w-4 shrink-0" /> {!isPreviewSidebarCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
                                    </button>
                                    <button onClick={() => setPreviewView('reports')} className={`flex items-center rounded-lg transition-all font-bold text-xs ${isPreviewSidebarCollapsed ? 'justify-center p-2 mx-auto w-10 h-10' : 'gap-2 px-3 py-2 w-full'} ${previewView === 'reports' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                                        <PhotoIcon className="h-4 w-4 shrink-0" /> {!isPreviewSidebarCollapsed && <span className="whitespace-nowrap">Report Lavorazioni</span>}
                                    </button>
                                    <button onClick={() => setPreviewView('sal')} className={`flex items-center rounded-lg transition-all font-bold text-xs ${isPreviewSidebarCollapsed ? 'justify-center p-2 mx-auto w-10 h-10' : 'gap-2 px-3 py-2 w-full'} ${previewView === 'sal' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                                        <CurrencyEuroIcon className="h-4 w-4 shrink-0" /> {!isPreviewSidebarCollapsed && <span className="whitespace-nowrap">Contabilità (SAL)</span>}
                                    </button>
                                    <button onClick={() => setPreviewView('documenti')} className={`flex items-center rounded-lg transition-all font-bold text-xs ${isPreviewSidebarCollapsed ? 'justify-center p-2 mx-auto w-10 h-10' : 'gap-2 px-3 py-2 w-full'} ${previewView === 'documenti' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                                        <DocumentTextIcon className="h-4 w-4 shrink-0" /> {!isPreviewSidebarCollapsed && <span className="whitespace-nowrap">Documenti</span>}
                                    </button>
                                </nav>
                            </aside>

                            {/* SIMULATORE MAIN CONTENT */}
                            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
                                
                                {/* DASHBOARD ANTEPRIMA */}
                                {previewView === 'dashboard' && (
                                    <div className="flex-1 overflow-y-auto p-8">
                                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Benvenuto nella tua Area Clienti</h1>
                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                                                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><BuildingOfficeIcon className="h-5 w-5" /></div>
                                                <div className="overflow-hidden"><p className="text-[10px] font-bold text-slate-400 uppercase truncate">Cantieri Attivi</p><p className="text-2xl font-black">{cantieriVisibiliPreview.length}</p></div>
                                            </div>
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                                                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><PhotoIcon className="h-5 w-5" /></div>
                                                <div className="overflow-hidden"><p className="text-[10px] font-bold text-slate-400 uppercase truncate">Aggiornamenti</p><p className="text-2xl font-black">{rapportiniPubblicatiPreview.length}</p></div>
                                            </div>
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                                                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0"><ClockIcon className="h-5 w-5" /></div>
                                                <div className="overflow-hidden"><p className="text-[10px] font-bold text-slate-400 uppercase truncate">Ultimo Report</p><p className="text-sm font-black truncate">{rapportiniPubblicatiPreview.length > 0 ? formatDate(rapportiniPubblicatiPreview[0].dataCliente || rapportiniPubblicatiPreview[0].dataPubblicazione) : 'Nessuno'}</p></div>
                                            </div>
                                        </div>
                                        <h2 className="text-lg font-black text-slate-800 mb-4">I tuoi Cantieri</h2>
                                        <div className="grid grid-cols-2 gap-4">
                                            {cantieriVisibiliPreview.map(c => {
                                                const repNum = rapportiniPubblicatiPreview.filter(r => r.cantiereId === c.id).length;
                                                return (
                                                    <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md" onClick={() => { setPreviewCantiereId(c.id); setPreviewView('reports'); }}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="overflow-hidden"><h3 className="text-sm font-black truncate">{c.nomeCantiere}</h3><p className="text-xs text-slate-500 mt-1 truncate">{c.indirizzo || 'N/D'}</p></div>
                                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded ml-2 shrink-0">{repNum} Report</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* REPORTS TABELLA ANTEPRIMA */}
                                {previewView === 'reports' && (
                                    <div className="flex h-full">
                                        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col h-full max-w-[250px]">
                                            <div className="p-4 border-b border-slate-100 bg-slate-50"><h2 className="text-sm font-black">Seleziona Cantiere</h2></div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                                {cantieriVisibiliPreview.map(c => (
                                                    <button key={c.id} onClick={() => setPreviewCantiereId(c.id)} className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${previewCantiereId === c.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                                        <h3 className="font-black truncate">{c.nomeCantiere}</h3>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col h-full bg-slate-50">
                                            {previewCantiereId ? (() => {
                                                const cantiereSel = cantieriVisibiliPreview.find(c => c.id === previewCantiereId);
                                                let filtered = rapportiniPubblicatiPreview.filter(r => r.cantiereId === previewCantiereId);
                                                if (previewDateFrom) filtered = filtered.filter(r => new Date(r.dataCliente || r.dataPubblicazione || r.createdAt) >= new Date(previewDateFrom));
                                                if (previewDateTo) {
                                                    const to = new Date(previewDateTo); to.setHours(23, 59, 59, 999);
                                                    filtered = filtered.filter(r => new Date(r.dataCliente || r.dataPubblicazione || r.createdAt) <= to);
                                                }
                                                return (
                                                    <>
                                                        <div className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
                                                            <h2 className="text-lg font-black mb-3 truncate">{cantiereSel?.nomeCantiere}</h2>
                                                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                                <input type="date" value={previewDateFrom} onChange={(e) => setPreviewDateFrom(e.target.value)} className="text-xs border rounded px-2 py-1" />
                                                                <span className="text-xs">-</span>
                                                                <input type="date" value={previewDateTo} onChange={(e) => setPreviewDateTo(e.target.value)} className="text-xs border rounded px-2 py-1" />
                                                                {(previewDateFrom || previewDateTo) && <button onClick={() => {setPreviewDateFrom(''); setPreviewDateTo('');}} className="text-[10px] font-bold text-indigo-600">Azzera</button>}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 overflow-auto p-6">
                                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                                <table className="min-w-full divide-y divide-slate-200">
                                                                    <thead className="bg-slate-50">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">Data</th>
                                                                            <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">Descrizione</th>
                                                                            <th className="px-4 py-2 text-center text-[10px] font-black text-slate-500 uppercase">Foto</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200">
                                                                        {filtered.map(r => {
                                                                            const foto = r.fotoClienteUrl || r.fileUrl || (r.fotoUrls && r.fotoUrls[0]);
                                                                            return (
                                                                            <tr key={r.id}>
                                                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-bold">{formatDate(r.dataCliente || r.dataPubblicazione)}</td>
                                                                                <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{r.descrizioneCliente || r.tipologiaCliente}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    {r.mostraFotoCliente !== false && foto && (
                                                                                        <img src={foto} className="h-8 w-10 object-cover inline rounded border cursor-pointer hover:opacity-80" alt="Foto" onClick={() => setPreviewPhotoModal(foto)} />
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        )})}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })() : (
                                                <div className="p-10 text-center text-slate-500 font-bold">Seleziona cantiere</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(previewView === 'sal' || previewView === 'documenti') && (
                                    <div className="flex-1 flex items-center justify-center"><p className="text-slate-400 font-bold">Sezione in allestimento</p></div>
                                )}
                            </main>

                            {/* LIGHTBOX FOTO ANTEPRIMA */}
                            {previewPhotoModal && (
                                <div className="absolute inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4" onClick={() => setPreviewPhotoModal(null)}>
                                    <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setPreviewPhotoModal(null)}>
                                        <XMarkIcon className="h-8 w-8" />
                                    </button>
                                    <img src={previewPhotoModal} className="max-h-full max-w-full rounded-xl object-contain" alt="Zoom" onClick={(e) => e.stopPropagation()} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB MODERAZIONE */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    {rapportiniInAttesa.length === 0 ? <div className="text-center py-10 text-gray-500 font-bold italic">Nessun report da moderare per i filtri selezionati</div> : rapportiniInAttesa.map(report => {
                        const currentLuogo = luogoModificato[report.id] !== undefined ? luogoModificato[report.id] : getAutoLocation(report);
                        const isLink = currentLuogo.startsWith('http');
                        const isEditingLocation = editLinkLocation[report.id];
                        const imgPreview = customFotoPreviews[report.id] || report.fileUrl || (report.fotoUrls && report.fotoUrls[0]);

                        return (
                        <div key={report.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">
                                        Generato il {formatDate(report.createdAt || report.data)}
                                    </span>
                                    <span className="font-black text-gray-900 text-sm">{getNomeCantiere(report.cantiereId)}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-indigo-100 shadow-inner">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Data Intervento</label>
                                            <input type="date" className="w-full mt-1 p-2.5 text-sm font-bold text-indigo-600 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500" value={dataModificata[report.id] !== undefined ? dataModificata[report.id] : extractDateForInput(report.createdAt || report.data)} onChange={(e) => setDataModificata(prev => ({...prev, [report.id]: e.target.value}))} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><ClockIcon className="h-3 w-3"/> Orario Intervento</label>
                                            <input type="time" className="w-full mt-1 p-2.5 text-sm font-bold text-indigo-600 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500" value={oraModificata[report.id] !== undefined ? oraModificata[report.id] : extractTime(report.createdAt || report.data)} onChange={(e) => setOraModificata(prev => ({...prev, [report.id]: e.target.value}))} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between gap-1 w-full">
                                                <span className="flex items-center gap-1"><MapPinIcon className="h-3 w-3"/> Posizione / Link</span>
                                            </label>
                                            {isLink && !isEditingLocation ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <a href={currentLuogo} target="_blank" rel="noopener noreferrer" className="flex-1 p-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:underline truncate">📍 Apri su Google Maps</a>
                                                    <button onClick={() => setEditLinkLocation(prev => ({...prev, [report.id]: true}))} className="p-2.5 text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg transition-colors"><PencilSquareIcon className="h-5 w-5" /></button>
                                                </div>
                                            ) : (
                                                <input type="text" className="w-full mt-1 p-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500" value={currentLuogo} onChange={(e) => setLuogoModificato(prev => ({...prev, [report.id]: e.target.value}))} placeholder="Indirizzo o Link" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Tipologia Intervento</label>
                                            <input type="text" className="w-full mt-1 p-2.5 text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500" value={tipologiaModificata[report.id] !== undefined ? tipologiaModificata[report.id] : (report.tipologia || '')} onChange={(e) => setTipologiaModificata(prev => ({...prev, [report.id]: e.target.value}))} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><UserIcon className="h-3 w-3"/> Preposto</label>
                                            <input type="text" className="w-full mt-1 p-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500" value={prepostoModificato[report.id] !== undefined ? prepostoModificato[report.id] : getAutoPreposto(report)} onChange={(e) => setPrepostoModificato(prev => ({...prev, [report.id]: e.target.value}))} />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><UsersIcon className="h-3 w-3"/> Altri Operatori Squadra</label>
                                        <input type="text" className="w-full mt-1 p-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500" placeholder="Nessun altro operatore assegnato" value={operatoriModificati[report.id] !== undefined ? operatoriModificati[report.id] : getAutoOperatori(report)} onChange={(e) => setOperatoriModificati(prev => ({...prev, [report.id]: e.target.value}))} />
                                    </div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Testo visibile al cliente</label>
                                    <textarea className="w-full mt-1 text-sm font-medium text-gray-800 bg-white border border-gray-200 rounded-lg focus:ring-indigo-500 p-3" value={testiModificati[report.id] !== undefined ? testiModificati[report.id] : (report.note || '')} onChange={(e) => setTestiModificati(prev => ({ ...prev, [report.id]: e.target.value }))} rows={3} />
                                </div>
                            </div>
                            <div className="lg:w-56 flex flex-col gap-3 pt-8">
                                <button onClick={() => handlePubblicaReport(report)} disabled={isPublishing} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center gap-2">
                                    <CheckCircleIcon className="h-5 w-5"/>
                                    {isPublishing ? 'Pubblicazione...' : 'Pubblica Ora'}
                                </button>
                                <div className="mt-2 p-2 bg-white border border-gray-200 rounded-xl flex flex-col items-center">
                                    {imgPreview ? (
                                        <div className="w-full">
                                            <img src={imgPreview} className={`h-28 w-full object-cover rounded-lg border transition-all ${nascondiFoto[report.id] ? 'opacity-30 grayscale' : 'shadow-sm'}`} alt="Anteprima" />
                                            <div className="flex gap-1 w-full mt-2">
                                                <input type="file" id={`foto-${report.id}`} className="hidden" accept="image/*" onChange={(e) => handleFileChange(report.id, e)} />
                                                <label htmlFor={`foto-${report.id}`} className="flex-1 flex justify-center items-center gap-1 py-2 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
                                                    <PhotoIcon className="h-3 w-3"/> Cambia
                                                </label>
                                                <button onClick={() => setNascondiFoto(prev => ({...prev, [report.id]: !prev[report.id]}))} className={`flex-1 flex justify-center items-center gap-1 py-2 rounded text-[10px] font-bold transition-colors ${nascondiFoto[report.id] ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                                                    {nascondiFoto[report.id] ? <EyeSlashIcon className="h-3 w-3"/> : <EyeIcon className="h-3 w-3"/>}
                                                    {nascondiFoto[report.id] ? 'Nascosta' : 'Visibile'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full">
                                            <input type="file" id={`foto-${report.id}`} className="hidden" accept="image/*" onChange={(e) => handleFileChange(report.id, e)} />
                                            <label htmlFor={`foto-${report.id}`} className="w-full h-28 flex flex-col justify-center items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                                                <PhotoIcon className="h-6 w-6"/> Aggiungi Foto
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}

            {/* TAB ACCESSI */}
            {activeTab === 'settings' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            <KeyIcon className="h-6 w-6 text-indigo-500" />
                            Gestione Accessi Cantieri
                        </h2>
                        <p className="text-gray-500 font-medium mt-1">Scegli quali cantieri mostrare nel Portale di questo cliente. I cantieri spenti non saranno visibili.</p>
                    </div>

                    {!selectedClienteId ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold">Seleziona un cliente in alto per gestirne gli accessi.</p>
                        </div>
                    ) : cantieriCliente.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <BuildingOfficeIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold">Questo cliente non ha cantieri associati nel database.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cantieriCliente.map(c => (
                                <div key={c.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${c.visibilePortale ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                    <div>
                                        <h3 className={`font-black text-lg ${c.visibilePortale ? 'text-indigo-900' : 'text-gray-700'}`}>{c.nomeCantiere}</h3>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                                            <MapPinIcon className="h-3 w-3" /> {c.indirizzo || c.citta || 'Nessun indirizzo specificato'}
                                        </p>
                                    </div>
                                    
                                    <label className="relative inline-flex items-center cursor-pointer" title={c.visibilePortale ? "Nascondi dal Portale" : "Mostra nel Portale"}>
                                        <input type="checkbox" checked={!!c.visibilePortale} onChange={() => toggleVisibilitaCantiere(c.id, !!c.visibilePortale)} className="sr-only peer" />
                                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};