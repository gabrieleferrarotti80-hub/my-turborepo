import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { getAuth, signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 
import { 
    BuildingOfficeIcon, ClockIcon, MapPinIcon, 
    UserIcon, UsersIcon, SparklesIcon, ArrowRightOnRectangleIcon,
    HomeIcon, CurrencyEuroIcon, PhotoIcon,
    ChevronRightIcon, DocumentTextIcon, XMarkIcon, CalendarIcon,
    Bars3Icon, CheckCircleIcon, ExclamationTriangleIcon, ArrowDownTrayIcon,
    ChartBarSquareIcon, MagnifyingGlassPlusIcon
} from '@heroicons/react/24/outline';

const formatDate = (dateVal) => {
    if (!dateVal) return '';
    let d;
    if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) d = new Date(dateVal.seconds * 1000);
    else if (dateVal instanceof Date) d = dateVal;
    else if (typeof dateVal === 'string') d = new Date(dateVal);
    else d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

export const CustomerPortal = () => {
    const { data, user, db } = useFirebaseData(); 

    const [currentView, setCurrentView] = useState('dashboard'); 
    const [selectedCantiereId, setSelectedCantiereId] = useState(null);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [photoModal, setPhotoModal] = useState(null); 
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [salTab, setSalTab] = useState('da-approvare'); 
    
    // 🌟 STATO PER VISUALIZZARE IL DOCUMENTO SAL 🌟
    const [salDaVisionare, setSalDaVisionare] = useState(null);

    const handleLogout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Errore durante il logout:", error);
        }
    };

    const cliente = useMemo(() => {
        const clienti = data.clients || data.clienti || [];
        return clienti.find(c => 
            c.emailAccessoPortale === user?.email || 
            c.referente?.email === user?.email ||
            c.email === user?.email || 
            c.id === user?.uid
        );
    }, [data.clients, data.clienti, user]);

    const mieiCantieri = useMemo(() => {
        if (!cliente) return [];
        const cantieri = data.cantieri || [];
        return cantieri.filter(c => c.clienteId === cliente.id && c.visibilePortale === true);
    }, [cliente, data.cantieri]);

    const mieiReport = useMemo(() => {
        const reports = data.reports || [];
        const idCantieri = mieiCantieri.map(c => c.id);
        return reports
            .filter(r => r.pubblicatoCliente === true && idCantieri.includes(r.cantiereId))
            .sort((a, b) => {
                const dateA = new Date(a.dataCliente || a.dataPubblicazione || a.createdAt?.seconds * 1000 || 0);
                const dateB = new Date(b.dataCliente || b.dataPubblicazione || b.createdAt?.seconds * 1000 || 0);
                return dateB - dateA;
            });
    }, [data.reports, mieiCantieri]);

    const isSalApprovato = (sal) => {
        if (sal.approvatoCliente) return true;
        if (!sal.stato) return false;
        const st = sal.stato.toLowerCase();
        return st === 'approvato' || st === 'fatturato' || st === 'pagato';
    };

    const isSalVisibileDaApprovare = (sal) => {
        if (isSalApprovato(sal)) return false; 
        if (!sal.stato) return false; 
        const st = sal.stato.toLowerCase();
        return st === 'emesso' || st === 'inviato';
    };

    const { salDaApprovare, salApprovati } = useMemo(() => {
        const tuttiISal = data.sal || data.statiAvanzamento || []; 
        const idCantieri = mieiCantieri.map(c => c.id);
        const mieiSal = tuttiISal.filter(s => idCantieri.includes(s.cantiereId));

        return {
            salDaApprovare: mieiSal.filter(s => isSalVisibileDaApprovare(s)).sort((a,b) => new Date(b.data || 0) - new Date(a.data || 0)),
            salApprovati: mieiSal.filter(s => isSalApprovato(s)).sort((a,b) => new Date(b.dataApprovazioneCliente || b.updatedAt?.seconds * 1000 || b.data || 0) - new Date(a.dataApprovazioneCliente || a.updatedAt?.seconds * 1000 || a.data || 0))
        };
    }, [data.sal, data.statiAvanzamento, mieiCantieri]);

    // 🌟 LOGICA APPROVAZIONE
    const handleApprovaSal = async (sal) => {
        const conferma = window.confirm(`Apponendo la firma accetti i lavori contabilizzati e autorizzi la fatturazione.\n\nProcedere con l'approvazione?`);
        if (!conferma) return;

        try {
            const collectionName = data.sal ? 'sal' : 'statiAvanzamento';
            const salRef = doc(db, collectionName, sal.id); 
            
            await updateDoc(salRef, {
                approvatoCliente: true,
                dataApprovazioneCliente: new Date().toISOString(),
                approvatoDa: user.email || cliente.nome || 'Cliente',
                stato: 'approvato',
                updatedAt: serverTimestamp()
            });
            
            setSalDaVisionare(null); // Chiude il documento
        } catch (error) {
            console.error("Errore salvataggio SAL:", error);
            alert("Si è verificato un errore di connessione. Riprova.");
        }
    };

    useEffect(() => {
        if (selectedCantiereId && !mieiCantieri.find(c => c.id === selectedCantiereId)) {
            setSelectedCantiereId(mieiCantieri.length > 0 ? mieiCantieri[0].id : null);
        }
    }, [mieiCantieri, selectedCantiereId]);

    useEffect(() => {
        if (currentView === 'reports' && !selectedCantiereId && mieiCantieri.length > 0) {
            setSelectedCantiereId(mieiCantieri[0].id);
        }
    }, [currentView, mieiCantieri, selectedCantiereId]);

    useEffect(() => {
        setDateFrom('');
        setDateTo('');
    }, [selectedCantiereId]);

    const getNomeCantiere = (id) => mieiCantieri.find(c => c.id === id)?.nomeCantiere || 'Cantiere Sconosciuto';
    const getIndirizzoCantiere = (id) => mieiCantieri.find(c => c.id === id)?.indirizzo || '';

    const getStatoBadge = (stato) => {
        if (!stato) return null;
        const s = stato.toLowerCase();
        if (s.includes('pagat')) return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">{stato}</span>;
        if (s.includes('fatturat') || s.includes('emess')) return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">{stato}</span>;
        if (s.includes('approvat')) return <span className="bg-teal-100 text-teal-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">{stato}</span>;
        return <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">{stato}</span>;
    };

    if (!cliente) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-200 relative">
                    <button onClick={handleLogout} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors" title="Esci">
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                    <SparklesIcon className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Benvenuto!</h2>
                    <p className="text-slate-500 font-medium">Stiamo allestendo il tuo portale. Se l'attesa persiste, contatta l'amministrazione.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans animate-fade-in relative">
            
            {/* SIDEBAR LATERALE */}
            <aside className={`bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
                <div className="h-20 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between px-4 transition-all overflow-hidden">
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-3 overflow-hidden animate-fade-in">
                            <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                                <UserIcon className="h-6 w-6" />
                            </div>
                            <div className="overflow-hidden">
                                <h2 className="text-lg font-black text-white truncate tracking-tight">{cliente.ragioneSociale || cliente.nome}</h2>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Area Riservata</p>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ${isSidebarCollapsed ? 'mx-auto' : ''}`} title={isSidebarCollapsed ? "Espandi menu" : "Comprimi menu"}>
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 overflow-x-hidden">
                    {!isSidebarCollapsed && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-3 animate-fade-in">Menu Principale</p>}
                    
                    <button onClick={() => setCurrentView('dashboard')} className={`flex items-center rounded-xl transition-all font-bold text-sm ${isSidebarCollapsed ? 'justify-center p-3 mx-auto w-12 h-12' : 'gap-3 px-4 py-3 w-full'} ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <HomeIcon className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && <span className="whitespace-nowrap">Riepilogo Dashboard</span>}
                    </button>
                    <button onClick={() => setCurrentView('reports')} className={`flex items-center rounded-xl transition-all font-bold text-sm ${isSidebarCollapsed ? 'justify-center p-3 mx-auto w-12 h-12' : 'gap-3 px-4 py-3 w-full'} ${currentView === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <PhotoIcon className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && <span className="whitespace-nowrap">Report Lavorazioni</span>}
                    </button>
                    
                    <button onClick={() => setCurrentView('sal')} className={`flex items-center justify-between rounded-xl transition-all font-bold text-sm ${isSidebarCollapsed ? 'justify-center p-3 mx-auto w-12 h-12 relative' : 'px-4 py-3 w-full'} ${currentView === 'sal' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <div className="flex items-center gap-3">
                            <CurrencyEuroIcon className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && <span className="whitespace-nowrap">Contabilità (SAL)</span>}
                        </div>
                        {salDaApprovare.length > 0 && (
                            <span className={`${isSidebarCollapsed ? 'absolute top-1 right-1' : ''} bg-red-500 text-white flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-sm`}>
                                {salDaApprovare.length}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setCurrentView('documenti')} className={`flex items-center rounded-xl transition-all font-bold text-sm ${isSidebarCollapsed ? 'justify-center p-3 mx-auto w-12 h-12' : 'gap-3 px-4 py-3 w-full'} ${currentView === 'documenti' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                        <DocumentTextIcon className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && <span className="whitespace-nowrap">Archivio Documenti</span>}
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className={`flex items-center justify-center rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${isSidebarCollapsed ? 'p-3 w-12 h-12 mx-auto' : 'gap-2 px-4 py-3 w-full'}`}>
                        <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" /> {!isSidebarCollapsed && <span className="whitespace-nowrap">Esci dal Portale</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative transition-all duration-300">
                
                {/* VISTA 1: DASHBOARD */}
                {currentView === 'dashboard' && (
                    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                        <header className="mb-10">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Benvenuto nella tua Area Clienti</h1>
                            <p className="text-slate-500 font-medium mt-2 text-lg">Qui puoi monitorare lo stato di avanzamento di tutti i tuoi cantieri.</p>
                        </header>
                        {/* WIDGETS E CANTIERI (Mantenuti uguali per brevità) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0"><BuildingOfficeIcon className="h-7 w-7" /></div>
                                <div className="overflow-hidden"><p className="text-sm font-bold text-slate-400 uppercase tracking-widest truncate">Cantieri Attivi</p><p className="text-3xl font-black text-slate-800">{mieiCantieri.length}</p></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><PhotoIcon className="h-7 w-7" /></div>
                                <div className="overflow-hidden"><p className="text-sm font-bold text-slate-400 uppercase tracking-widest truncate">Aggiornamenti</p><p className="text-3xl font-black text-slate-800">{mieiReport.length}</p></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0"><ClockIcon className="h-7 w-7" /></div>
                                <div className="overflow-hidden"><p className="text-sm font-bold text-slate-400 uppercase tracking-widest truncate">Ultimo Report</p><p className="text-lg font-black text-slate-800 truncate">{mieiReport.length > 0 ? formatDate(mieiReport[0].dataCliente || mieiReport[0].dataPubblicazione) : 'Nessuno'}</p></div>
                            </div>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-6">I tuoi Cantieri</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {mieiCantieri.map(c => {
                                const repNum = mieiReport.filter(r => r.cantiereId === c.id).length;
                                return (
                                    <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => { setSelectedCantiereId(c.id); setCurrentView('reports'); }}>
                                        <div className="flex justify-between items-start">
                                            <div className="overflow-hidden"><h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{c.nomeCantiere}</h3><p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1 truncate"><MapPinIcon className="h-4 w-4 shrink-0"/> {c.indirizzo || c.citta || 'Indirizzo non specificato'}</p></div>
                                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200 shrink-0 ml-4">{repNum} Report</span>
                                        </div>
                                        <div className="mt-6 flex justify-end"><button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Apri Dettagli <ChevronRightIcon className="h-4 w-4" /></button></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VISTA 2: REPORT TABELLARE (Mantenuta uguale) */}
                {currentView === 'reports' && (
                    <div className="flex h-full w-full">
                         <div className="w-1/3 max-w-sm bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 transition-all duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <h2 className="text-lg font-black text-slate-800">Seleziona Cantiere</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {mieiCantieri.map(c => (
                                    <button key={c.id} onClick={() => setSelectedCantiereId(c.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedCantiereId === c.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'}`}>
                                        <h3 className={`font-black text-sm truncate ${selectedCantiereId === c.id ? 'text-indigo-800' : 'text-slate-700'}`}>{c.nomeCantiere}</h3>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col h-full bg-slate-50">
                            {selectedCantiereId ? (() => {
                                const cantiereSelezionato = mieiCantieri.find(c => c.id === selectedCantiereId);
                                let filteredReports = mieiReport.filter(r => r.cantiereId === selectedCantiereId);
                                if (dateFrom) filteredReports = filteredReports.filter(r => new Date(r.dataCliente || r.dataPubblicazione || r.createdAt) >= new Date(dateFrom));
                                if (dateTo) {
                                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                    filteredReports = filteredReports.filter(r => new Date(r.dataCliente || r.dataPubblicazione || r.createdAt) <= to);
                                }
                                return (
                                    <>
                                        <div className="px-8 py-6 bg-white border-b border-slate-200 shadow-sm z-10">
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">{cantiereSelezionato?.nomeCantiere}</h2>
                                            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtra:</span></div>
                                                <div className="flex items-center gap-2">
                                                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5" />
                                                    <span className="text-slate-400 text-sm">-</span>
                                                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5" />
                                                </div>
                                                {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg">Azzera</button>}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-auto p-8">
                                            {filteredReports.length === 0 ? (
                                                <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300">
                                                    <DocumentTextIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                                    <p className="text-slate-500 font-bold">Nessun report.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                    <table className="min-w-full divide-y divide-slate-200">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Data</th>
                                                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Descrizione</th>
                                                                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-500 uppercase">Allegati</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-slate-200">
                                                            {filteredReports.map((report) => {
                                                                const fotoDaMostrare = report.fotoClienteUrl || report.fileUrl || (report.fotoUrls && report.fotoUrls[0]);
                                                                return (
                                                                <tr key={report.id} className="hover:bg-slate-50">
                                                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-slate-900">{formatDate(report.dataCliente || report.dataPubblicazione)}</div></td>
                                                                    <td className="px-6 py-4"><div className="text-sm text-slate-700 whitespace-pre-line">{report.descrizioneCliente || 'Aggiornamento'}</div></td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-center">{report.mostraFotoCliente !== false && fotoDaMostrare ? <button onClick={() => setPhotoModal(fotoDaMostrare)} className="group relative inline-block rounded-lg overflow-hidden border border-slate-300"><img src={fotoDaMostrare} className="h-12 w-16 object-cover" alt="Miniatura" /></button> : '-'}</td>
                                                                </tr>
                                                            )})}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })() : (
                                <div className="flex-1 flex items-center justify-center p-10">
                                    <p className="text-lg font-bold text-slate-500">Seleziona cantiere</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 🌟 VISTA 3: SAL E CONTABILITA' */}
                {currentView === 'sal' && (
                    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
                        
                        <header className="px-8 py-8 bg-white border-b border-slate-200 shrink-0">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contabilità e SAL</h1>
                            <p className="text-slate-500 font-medium mt-1 text-base">Visiona, scarica e approva i certificati di pagamento.</p>
                            
                            <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-xl mt-6 max-w-sm border border-slate-200">
                                <button 
                                    onClick={() => setSalTab('da-approvare')} 
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex justify-center items-center gap-2 ${salTab === 'da-approvare' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Da Approvare
                                    {salDaApprovare.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] shadow-sm">{salDaApprovare.length}</span>}
                                </button>
                                <button 
                                    onClick={() => setSalTab('approvati')} 
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${salTab === 'approvati' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Storico SAL
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8">
                            
                            {salTab === 'da-approvare' && (
                                <>
                                    {salDaApprovare.length === 0 ? (
                                        <div className="text-center p-16 bg-white rounded-3xl border border-dashed border-slate-300 max-w-2xl mx-auto mt-10">
                                            <CheckCircleIcon className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                                            <h3 className="text-xl font-black text-slate-800 mb-2">Tutto in regola!</h3>
                                            <p className="text-slate-500 font-medium">Non ci sono Documenti SAL in attesa della tua firma.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {salDaApprovare.map(sal => (
                                                <div key={sal.id} className="bg-white rounded-2xl border border-rose-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                                                    
                                                    <div className="bg-rose-50/50 p-5 border-b border-rose-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-12 w-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                                                                <ExclamationTriangleIcon className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-rose-200 shadow-sm">Firma Richiesta</span>
                                                                <h3 className="text-lg font-black text-slate-900 mt-1">{sal.titolo || 'Stato Avanzamento Lavori'}</h3>
                                                                <p className="text-sm font-medium text-slate-500 truncate">{getNomeCantiere(sal.cantiereId)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <div className="space-y-4 mb-6">
                                                            {sal.percentuale !== undefined && (
                                                                <div className="mb-6">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><ChartBarSquareIcon className="h-3.5 w-3.5"/> Avanzamento Lavori</span>
                                                                        <span className="text-xs font-black text-indigo-600">{sal.percentuale}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 shadow-inner">
                                                                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${sal.percentuale}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                                                <span className="text-xs font-bold text-slate-400 uppercase">Importo</span>
                                                                <span className="text-xl font-black text-indigo-600">{formatCurrency(sal.importo)}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* 🌟 TASTO CHE APRE IL DOCUMENTO REALE */}
                                                        <button 
                                                            onClick={() => setSalDaVisionare(sal)}
                                                            className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-sm transition-colors shadow-md mt-auto"
                                                        >
                                                            <MagnifyingGlassPlusIcon className="h-5 w-5" /> VISIONA DOCUMENTO SAL
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB: STORICO APPROVATI (Invariato) */}
                            {salTab === 'approvati' && (
                                <>
                                    {salApprovati.length === 0 ? (
                                        <div className="text-center p-16 bg-white rounded-3xl border border-dashed border-slate-300 max-w-2xl mx-auto mt-10">
                                            <DocumentTextIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                            <h3 className="text-xl font-black text-slate-800 mb-2">Nessuno Storico</h3>
                                            <p className="text-slate-500 font-medium">Non ci sono SAL registrati nello storico del portale.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {salApprovati.map(sal => (
                                                <div key={sal.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col opacity-80 hover:opacity-100 transition-opacity">
                                                    
                                                    <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-12 w-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center shrink-0"><CheckCircleIcon className="h-6 w-6" /></div>
                                                            <div>
                                                                <h3 className="text-lg font-black text-slate-900 mt-1">{sal.titolo || 'Stato Avanzamento Lavori'}</h3>
                                                                <p className="text-sm font-medium text-slate-500 truncate">{getNomeCantiere(sal.cantiereId)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">{getStatoBadge(sal.stato || (sal.approvatoCliente ? 'Approvato' : ''))}</div>
                                                    </div>
                                                    
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <div className="space-y-4 mb-6">
                                                            {sal.percentuale !== undefined && (
                                                                <div className="mb-4">
                                                                    <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avanzamento Raggiunto</span><span className="text-xs font-black text-slate-600">{sal.percentuale}%</span></div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shadow-inner"><div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${sal.percentuale}%` }}></div></div>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center pb-3 border-b border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase">Data Riferimento</span><span className="text-sm font-bold text-slate-800">{formatDate(sal.data || sal.createdAt)}</span></div>
                                                            {sal.importo !== undefined && <div className="flex justify-between items-center pb-3 border-b border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase">Importo</span><span className="text-sm font-black text-slate-700">{formatCurrency(sal.importo)}</span></div>}
                                                            {sal.approvatoDa && (
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-100 bg-emerald-50/50 p-2 rounded-lg border-emerald-100">
                                                                    <span className="text-xs font-black text-emerald-600 uppercase">Firma Digitale e Data</span>
                                                                    <div className="text-right"><span className="text-sm font-bold text-emerald-800 block">{sal.approvatoDa}</span><span className="text-[10px] text-emerald-600 font-bold">{formatDate(sal.dataApprovazioneCliente)}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {sal.fileUrl ? (
                                                            <a href={sal.fileUrl} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm transition-colors border border-slate-200 mt-auto"><ArrowDownTrayIcon className="h-4 w-4" /> Scarica Copia Documento</a>
                                                        ) : (
                                                            <button onClick={() => setSalDaVisionare(sal)} className="w-full flex justify-center items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-sm transition-colors border border-slate-200 mt-auto"><MagnifyingGlassPlusIcon className="h-4 w-4" /> Rivedi Documento</button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA 4: DOCUMENTI (Work in progress) */}
                {currentView === 'documenti' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 max-w-lg">
                            <DocumentTextIcon className="h-20 w-20 text-indigo-200 mx-auto mb-6" />
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Archivio Documenti</h2>
                            <p className="text-slate-500 font-medium">L'archivio documentale di cantiere sarà disponibile a breve in questa area riservata.</p>
                        </div>
                    </div>
                )}

            </main>

            {/* 🌟 MODAL VISUALIZZATORE DOCUMENTO SAL A4 🌟 */}
            {salDaVisionare && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 sm:p-8 animate-fade-in" onClick={() => setSalDaVisionare(null)}>
                    <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        {/* Header Modal */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
                                Visione Documento Ufficiale
                            </h3>
                            <button onClick={() => setSalDaVisionare(null)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Corpo Modal (Foglio A4) */}
                        <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-gray-100">
                            
                            {/* SE ESISTE IL PDF, LO MOSTRIAMO */}
                            {salDaVisionare.fileUrl ? (
                                <div className="w-full h-[60vh] border border-slate-300 rounded shadow-sm bg-white overflow-hidden">
                                    <iframe src={salDaVisionare.fileUrl} width="100%" height="100%" title="Documento SAL" className="border-none"></iframe>
                                </div>
                            ) : (
                                /* ALTRIMENTI AUTOGENERIAMO IL FOGLIO A4 */
                                <div className="bg-white mx-auto max-w-2xl min-h-[60vh] border border-slate-200 shadow-md p-10 rounded">
                                    
                                    {/* Intestazione */}
                                    <div className="flex justify-between border-b-2 border-slate-800 pb-6 mb-8">
                                        <div className="text-sm">
                                            {/* Ideale sarebbe prendere il nome della TUA azienda, qui usiamo un fallback generico o "La Direzione Lavori" */}
                                            <h2 className="font-black text-xl text-slate-900 uppercase">La Direzione Lavori</h2>
                                            <p className="text-slate-500 mt-1">Emissione Certificato SAL</p>
                                        </div>
                                        <div className="text-right text-sm">
                                            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Spett.le Cliente</p>
                                            <p className="font-bold text-slate-800">{cliente.ragioneSociale || `${cliente.nome} ${cliente.cognome}`}</p>
                                            <p className="text-slate-600">{cliente.piva ? `P.IVA: ${cliente.piva}` : ''}</p>
                                        </div>
                                    </div>

                                    {/* Titolo Documento */}
                                    <h1 className="text-2xl font-black text-center mb-8 uppercase tracking-widest text-slate-900 border-b pb-4">
                                        {salDaVisionare.titolo || 'CERTIFICATO DI PAGAMENTO / S.A.L.'}
                                    </h1>

                                    {/* Dati Cantiere */}
                                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg mb-8 text-sm">
                                        <div className="grid grid-cols-3 gap-y-3">
                                            <div className="col-span-1 font-bold text-slate-500">Cantiere Rif.:</div>
                                            <div className="col-span-2 font-black text-slate-800">{getNomeCantiere(salDaVisionare.cantiereId)}</div>
                                            
                                            <div className="col-span-1 font-bold text-slate-500">Indirizzo:</div>
                                            <div className="col-span-2 text-slate-800">{getIndirizzoCantiere(salDaVisionare.cantiereId) || 'N/D'}</div>
                                            
                                            <div className="col-span-1 font-bold text-slate-500">Data Riferimento:</div>
                                            <div className="col-span-2 text-slate-800">{formatDate(salDaVisionare.data || salDaVisionare.createdAt)}</div>
                                        </div>
                                    </div>

                                    {/* Avanzamento */}
                                    <div className="mb-8">
                                        <h4 className="font-black text-sm text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">Riepilogo Avanzamento</h4>
                                        {salDaVisionare.percentuale !== undefined && (
                                            <div className="flex justify-between items-end mb-4">
                                                <span className="text-slate-600 font-medium">Percentuale di Lavori Eseguiti:</span>
                                                <span className="text-xl font-black">{salDaVisionare.percentuale}%</span>
                                            </div>
                                        )}
                                        {salDaVisionare.note && (
                                            <div className="mb-4">
                                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Descrizione delle lavorazioni:</span>
                                                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{salDaVisionare.note}</p>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-end border-t-2 border-slate-800 pt-4 mt-6">
                                            <span className="text-lg font-black text-slate-800">IMPORTO MATURATO:</span>
                                            <span className="text-2xl font-black text-indigo-700">{formatCurrency(salDaVisionare.importo)}</span>
                                        </div>
                                        <p className="text-right text-[10px] text-slate-400 mt-1 uppercase tracking-widest">(Oneri fiscali e di legge esclusi)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Modal con Azioni */}
                        <div className="p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                            <div className="text-xs text-slate-500">
                                {!salDaVisionare.approvatoCliente && (
                                    <p>Apponendo la firma, accetti contabilmente quanto riportato nel documento.</p>
                                )}
                            </div>
                            
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={() => setSalDaVisionare(null)} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    Chiudi
                                </button>
                                {!salDaVisionare.approvatoCliente && (
                                    <button 
                                        onClick={() => handleApprovaSal(salDaVisionare)}
                                        className="flex-[2] sm:flex-none px-8 py-3 rounded-xl font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="h-5 w-5" /> FIRMA E APPROVA SAL
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* MODAL INGRANDIMENTO FOTO CANTIERI */}
            {photoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPhotoModal(null)}>
                    <div className="relative max-w-5xl max-h-full">
                        <button 
                            onClick={() => setPhotoModal(null)}
                            className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                        <img src={photoModal} alt="Ingrandimento Cantiere" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10" onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            )}
        </div>
    );
};