import React, { useState, useMemo } from 'react';
import { useFirebaseData, useMagazzinoManager } from 'shared-core';
import { 
    AggiungiMaterialeForm, 
    AssegnaMaterialeForm,
    ModificaMaterialeForm, 
    ResoMaterialeForm,
    DashboardSottoscorta // ✅ Nuovo import
} from 'shared-ui';
import { 
    CubeIcon, 
    BuildingOfficeIcon, 
    HomeIcon, 
    ArrowRightIcon, 
    ArrowLeftIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    EyeSlashIcon,
    EyeIcon,
    ExclamationTriangleIcon,
    MapPinIcon,
    CurrencyEuroIcon,
    TagIcon,
    PencilSquareIcon,
    ShoppingCartIcon // ✅ Nuova icona
} from '@heroicons/react/24/outline';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

export const MagazzinoMaterialiView = () => {
    const [view, setView] = useState('list'); 
    const [activeTab, setActiveTab] = useState('sede'); // 'sede' | 'cantieri'
    const [selectedItem, setSelectedItem] = useState(null);
    
    // Stati per filtri e ricerca
    const [searchTerm, setSearchTerm] = useState('');
    const [nascondiEsauriti, setNascondiEsauriti] = useState(true); 
    
    const { data, db, user, userAziendaId, storage, loadingData } = useFirebaseData();
    const { 
        addMateriale,
        updateArticolo, 
        assegnaMaterialeCantiere, 
        restituisciMateriale,
        isLoading 
    } = useMagazzinoManager(db, storage, user, userAziendaId);

    // --- LOGICA FILTRI E CONTEGGI ---
    const allMateriali = useMemo(() => 
        (data?.attrezzature || []).filter(item => item.tipoArticolo === 'materiale'),
    [data?.attrezzature]);

    // ✅ Calcolo dinamico degli articoli sotto la soglia minima
    const countSottoscorta = useMemo(() => {
        return allMateriali.filter(m => {
            const qta = Number(m.quantita || 0);
            const soglia = Number(m.sogliaMinima || 0);
            return soglia > 0 && qta <= soglia;
        }).length;
    }, [allMateriali]);

    const materialiSede = useMemo(() => {
        return allMateriali.filter(m => {
            const isSede = m.stato === 'disponibile' || !m.cantiereId;
            const term = searchTerm.toLowerCase();
            const matchesSearch = 
                (m.nome || '').toLowerCase().includes(term) || 
                (m.categoria || '').toLowerCase().includes(term) ||
                (m.codice || m.dettagli?.codice || '').toLowerCase().includes(term) ||
                (m.fornitore || '').toLowerCase().includes(term);
            const hasStock = Number(m.quantita) > 0;
            
            return isSede && matchesSearch && (!nascondiEsauriti || hasStock);
        }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }, [allMateriali, searchTerm, nascondiEsauriti]);

    const materialiCantieri = useMemo(() => {
        return allMateriali.filter(m => {
            const isCantiere = m.stato === 'in_cantiere' || m.cantiereId;
            const term = searchTerm.toLowerCase();
            const matchesSearch = 
                (m.nome || '').toLowerCase().includes(term) || 
                (m.nomeCantiere || '').toLowerCase().includes(term) ||
                (m.codice || m.dettagli?.codice || '').toLowerCase().includes(term);
            const hasStock = Number(m.quantita) > 0;
            
            return isCantiere && matchesSearch && (!nascondiEsauriti || hasStock);
        }).sort((a, b) => (a.nomeCantiere || '').localeCompare(b.nomeCantiere || ''));
    }, [allMateriali, searchTerm, nascondiEsauriti]);

    // --- HANDLERS ---
    const handleAddMateriale = async (dati) => {
        const res = await addMateriale(dati);
        if (res.success) setView('list');
        else alert("Errore: " + res.message);
    };

    const handleAssegna = async (dati) => {
        const res = await assegnaMaterialeCantiere(dati);
        if(res.success) { alert(res.message); setView('list'); }
        else alert("Errore: " + res.message);
    };

    const handleReso = async (dati) => {
        const res = await restituisciMateriale(dati);
        if(res.success) { alert(res.message); setView('list'); }
        else alert("Errore: " + res.message);
    };

    // --- RENDER FORMS ---
    
    // 1. Dashboard Sottoscorta
    if (view === 'sottoscorta') {
        return (
            <div className="container mx-auto p-6 max-w-5xl">
                <DashboardSottoscorta 
                    materiali={allMateriali}
                    onBack={() => setView('list')}
                />
            </div>
        );
    }

    // 2. Aggiunta
    if (view === 'add') {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <AggiungiMaterialeForm 
                        onBack={() => setView('list')}
                        onSaveSuccess={(msg) => { setView('list'); }}
                        addMateriale={handleAddMateriale} 
                        isAdding={isLoading}
                        cantieri={data?.cantieri || []} 
                        ddtList={data?.ddt_acquisti || []}
                        ordiniList={data?.ordini_acquisto || []}
                        fornitoriList={data?.fornitori || []} 
                    />
                </div>
            </div>
        );
    }

    // 3. Modifica
    if (view === 'edit' && selectedItem) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <ModificaMaterialeForm 
                        initialData={selectedItem}
                        onBack={() => setView('list')}
                        onSaveSuccess={(msg) => { alert(msg); setView('list'); }}
                        updateMateriale={updateArticolo} 
                        isSaving={isLoading}
                        fornitoriList={data?.fornitori || []} 
                    />
                </div>
            </div>
        );
    }

    // 4. Assegnazione
    if (view === 'assegna' && selectedItem) {
        return (
            <div className="container mx-auto p-6 max-w-3xl">
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <AssegnaMaterialeForm 
                        onBack={() => setView('list')}
                        onSaveSuccess={(msg) => { alert(msg); setView('list'); }}
                        addMateriale={handleAssegna} 
                        scaricaMateriale={handleAssegna} 
                        data={data} 
                        db={db} user={user} userAziendaId={userAziendaId}
                        initialMaterialeId={selectedItem.id}
                    />
                </div>
            </div>
        );
    }

    // 5. Reso
    if (view === 'reso' && selectedItem) {
        return (
            <div className="container mx-auto p-6 max-w-3xl">
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <ResoMaterialeForm 
                        onBack={() => setView('list')} 
                        onSave={handleReso} 
                        materiale={selectedItem} 
                        isSaving={isLoading} 
                    />
                </div>
            </div>
        );
    }
    
    // --- RENDER LISTA PRINCIPALE ---
    if (loadingData) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Caricamento Materiali...</div>;

    const dataToDisplay = activeTab === 'sede' ? materialiSede : materialiCantieri;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Materiali e Consumabili</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Gestisci le giacenze, la logistica e gli allarmi di sottoscorta.</p>
                </div>
                
                {/* TABS */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('sede')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'sede' ? 'bg-white shadow-sm text-indigo-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <HomeIcon className="h-4 w-4"/> Magazzino Sede
                        </button>
                        <button 
                            onClick={() => setActiveTab('cantieri')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'cantieri' ? 'bg-white shadow-sm text-teal-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BuildingOfficeIcon className="h-4 w-4"/> Presso Cantieri
                        </button>
                    </div>
                </div>
            </div>

            {/* LISTA MATERIALI */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
                
                {/* TOOLBAR */}
                <div className="p-5 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    <div className="relative w-full md:w-96">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Cerca per nome, SKU o fornitore..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-shadow"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <button 
                            onClick={() => setNascondiEsauriti(!nascondiEsauriti)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${nascondiEsauriti ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {nascondiEsauriti ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            {nascondiEsauriti ? 'Esauriti Nascosti' : 'Mostra Esauriti'}
                        </button>

                        {/* ✅ Pulsante Sottoscorta Dinamico */}
                        {countSottoscorta > 0 && (
                            <button 
                                onClick={() => setView('sottoscorta')}
                                className="px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-amber-100 transition-all shadow-sm"
                            >
                                <ExclamationTriangleIcon className="h-5 w-5 animate-bounce"/>
                                {countSottoscorta} Avvisi Scorte
                            </button>
                        )}

                        {activeTab === 'sede' && (
                            <button 
                                onClick={() => setView('add')} 
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                            >
                                <PlusIcon className="h-5 w-5"/> Nuovo Materiale
                            </button>
                        )}
                    </div>
                </div>

                {/* TABELLA DATI */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/70">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Articolo e Specifiche</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Logistica / Acquisto</th>
                                {activeTab === 'cantieri' && <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Destinazione</th>}
                                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Giacenza / Scorta</th>
                                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {dataToDisplay.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'cantieri' ? 5 : 4} className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <CubeIcon className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-slate-600 font-bold text-lg">Nessun materiale trovato.</p>
                                            <p className="text-slate-400 text-sm mt-1">
                                                {searchTerm ? 'Nessun risultato corrisponde alla tua ricerca.' : 'Non ci sono articoli in questa vista.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                dataToDisplay.map(m => {
                                    const qta = Number(m.quantita);
                                    const soglia = Number(m.sogliaMinima || 0);
                                    const isEsaurito = qta <= 0;
                                    const isSottoscorta = !isEsaurito && soglia > 0 && qta <= soglia;
                                    const sku = m.codice || m.dettagli?.codice;
                                    
                                    return (
                                        <tr key={m.id} className={`odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/40 transition-colors group ${isEsaurito ? 'opacity-60' : ''}`}>
                                            
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`font-bold text-[14px] ${isEsaurito ? 'text-red-700 line-through decoration-red-300' : 'text-slate-900'}`}>{m.nome}</span>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{m.categoria || 'Consumabile'}</span>
                                                        {sku && (
                                                            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                                                                <TagIcon className="h-3 w-3"/> {sku}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 text-xs">
                                                    {m.posizioneMagazzino ? (
                                                        <span className="flex items-center gap-1 font-medium text-slate-700"><MapPinIcon className="h-4 w-4 text-slate-400"/> {m.posizioneMagazzino}</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic flex items-center gap-1"><MapPinIcon className="h-4 w-4 opacity-50"/> Posizione N/D</span>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        {m.fornitore && <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[120px]" title={m.fornitore}>{m.fornitore}</span>}
                                                        {m.costoUnitario > 0 && <span className="font-mono text-emerald-600 font-bold flex items-center gap-0.5"><CurrencyEuroIcon className="h-3.5 w-3.5"/> {Number(m.costoUnitario).toFixed(2)} /{m.unitaMisura}</span>}
                                                    </div>
                                                </div>
                                            </td>

                                            {activeTab === 'cantieri' && (
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200 shadow-sm">
                                                        <BuildingOfficeIcon className="w-3.5 h-3.5 opacity-70" />
                                                        {m.nomeCantiere}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <span className={`font-mono text-sm font-bold px-3 py-1.5 rounded-lg border shadow-sm ${
                                                        isEsaurito ? 'bg-red-50 text-red-700 border-red-200' : 
                                                        isSottoscorta ? 'bg-amber-50 text-amber-700 border-amber-300' : 
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                        {m.quantita} <span className="text-[10px] uppercase ml-0.5">{m.unitaMisura || 'pz'}</span>
                                                    </span>
                                                    
                                                    {isSottoscorta && (
                                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded">
                                                            <ExclamationTriangleIcon className="h-3.5 w-3.5"/> Da Riordinare (Min {soglia})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right align-middle">
                                                {activeTab === 'sede' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => { setSelectedItem(m); setView('edit'); }}
                                                            className="p-2 bg-white text-indigo-600 border border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 shadow-sm transition-all"
                                                            title="Modifica Materiale"
                                                        >
                                                            <PencilSquareIcon className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            disabled={isEsaurito}
                                                            onClick={() => { setSelectedItem(m); setView('assegna'); }}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                                                                isEsaurito 
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                                                : 'bg-white text-indigo-700 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow'
                                                            }`}
                                                        >
                                                            Assegna <ArrowRightIcon className="h-3.5 w-3.5"/>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        disabled={isEsaurito}
                                                        onClick={() => { setSelectedItem(m); setView('reso'); }}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ml-auto shadow-sm transition-all ${
                                                            isEsaurito 
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                                            : 'bg-white text-orange-600 border border-slate-300 hover:border-orange-400 hover:bg-orange-50 hover:shadow'
                                                        }`}
                                                    >
                                                        <ArrowLeftIcon className="h-3.5 w-3.5"/> Reso Sede
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};