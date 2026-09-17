import React from 'react';
import { 
    ArrowLeftIcon, 
    PlusIcon, 
    TruckIcon, 
    DocumentTextIcon, 
    PencilSquareIcon, 
    TrashIcon,
    ShoppingCartIcon, 
    ClipboardDocumentCheckIcon, 
    ArrowRightCircleIcon,
    CalendarDaysIcon, 
    ArrowTrendingUpIcon, 
    ArrowTrendingDownIcon, 
    BanknotesIcon,
    PhotoIcon, 
    LinkIcon,
    CheckBadgeIcon, // ✅ Icona per approvazione DDT
    CubeIcon, 
    WrenchScrewdriverIcon 
} from '@heroicons/react/24/solid';

// Helper formattazione
const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/D';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('it-IT');
};

export const FornitoriDashboard = ({
    // Dati Principali
    fornitori = [],
    fattureAcquisto = [],
    preventivi = [],
    ordiniAcquisto = [],
    ddtList = [], 
    
    // Dati Scadenziario
    scadenze = [], 
    totaliScadenziario = { entrate: 0, uscite: 0, saldo: 0 }, 
    filtroPeriodo, 
    setFiltroPeriodo,
    
    // Stato Vista
    activeTab,
    onTabChange,
    isLoading,
    
    // Navigazione
    onNavigateBack,
    
    // Azioni
    onAddFornitore, onEditFornitore, onDeleteFornitore,
    onAddFattura, onDeleteFattura, onEditFattura, onUpdateStatoFattura,
    onAddPreventivo, onEditPreventivo, onDeletePreventivo, onConvertiPreventivo,
    onEditOrdine, onDeleteOrdine,
    
    // Azioni DDT
    onDeleteDDT,
    onLinkDDT,
    onProcessDDT // ✅ Prop fondamentale per il carico magazzino
}) => {

    const getTabClass = (tabName, colorClass = 'bg-indigo-100 text-indigo-700') => `
        px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
        ${activeTab === tabName ? `${colorClass} shadow-sm` : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
    `;
    
    const getDateClass = (date) => {
        if (!date) return 'text-gray-500';
        const d = new Date(date);
        const today = new Date();
        today.setHours(0,0,0,0);
        return d < today ? 'text-red-600 font-bold' : 'text-gray-700';
    };

    const openImage = (url) => window.open(url, '_blank');

    // Helper per badge tipo (Materiale vs Asset)
    const renderTipoBadge = (tipo) => {
        if (tipo === 'attrezzatura') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <WrenchScrewdriverIcon className="h-3 w-3"/> Asset
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                <CubeIcon className="h-3 w-3"/> Materiale
            </span>
        );
    };

    return (
        <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-full">
            
            {/* Header */}
            <button onClick={onNavigateBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Torna alla Dashboard</span>
            </button>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800">Gestione Acquisti</h1>
                    <p className="text-gray-500 mt-1">Gestisci fornitori, preventivi, ordini, fatture e scadenze.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 bg-white rounded-lg p-1.5 shadow-sm border border-gray-200">
                    <button onClick={() => onTabChange('anagrafica')} className={getTabClass('anagrafica')}>
                        <TruckIcon className="h-4 w-4" /> Anagrafica
                    </button>
                    <button onClick={() => onTabChange('preventivi')} className={getTabClass('preventivi', 'bg-orange-100 text-orange-700')}>
                        <ShoppingCartIcon className="h-4 w-4" /> Preventivi
                    </button>
                    <button onClick={() => onTabChange('ordini')} className={getTabClass('ordini', 'bg-blue-100 text-blue-700')}>
                        <ClipboardDocumentCheckIcon className="h-4 w-4" /> Ordini
                    </button>
                    <button onClick={() => onTabChange('ddt')} className={getTabClass('ddt', 'bg-teal-100 text-teal-700')}>
                        <PhotoIcon className="h-4 w-4" /> DDT / Bolle
                    </button>
                    <button onClick={() => onTabChange('fatture')} className={getTabClass('fatture', 'bg-green-100 text-green-700')}>
                        <DocumentTextIcon className="h-4 w-4" /> Fatture
                    </button>
                    <button onClick={() => onTabChange('scadenziario')} className={getTabClass('scadenziario', 'bg-purple-100 text-purple-700')}>
                        <CalendarDaysIcon className="h-4 w-4" /> Scadenziario
                    </button>
                </div>
            </div>

            {/* --- TAB 1: ANAGRAFICA --- */}
            {activeTab === 'anagrafica' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <button onClick={onAddFornitore} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 flex items-center gap-2">
                            <PlusIcon className="h-5 w-5" /> Nuovo Fornitore
                        </button>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ragione Sociale</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P.IVA / CF</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contatti</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indirizzo</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {fornitori.length === 0 ? (
                                    <tr><td colSpan="5" className="p-6 text-center text-gray-500">Nessun fornitore registrato.</td></tr>
                                ) : (
                                    fornitori.map((f) => (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{f.ragioneSociale}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.piva || f.codiceFiscale}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div>{f.email}</div><div className="text-xs">{f.telefono}</div></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{f.indirizzo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => onEditFornitore(f)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"><PencilSquareIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => onDeleteFornitore(f.id)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB 2: PREVENTIVI --- */}
            {activeTab === 'preventivi' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <button onClick={onAddPreventivo} className="px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 flex items-center gap-2">
                            <PlusIcon className="h-5 w-5" /> Nuovo Preventivo
                        </button>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Riferimento</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Totale</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {preventivi.length === 0 ? (
                                    <tr><td colSpan="6" className="p-6 text-center text-gray-500">Nessun preventivo registrato.</td></tr>
                                ) : (
                                    preventivi.map((p) => {
                                        const nomeFornitore = fornitori.find(f => f.id === p.fornitoreId)?.ragioneSociale || p.nomeFornitore || 'N/D';
                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(p.dataDocumento)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{p.numeroDocumento || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{nomeFornitore}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(p.totale || 0)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-medium ${p.stato === 'accettato' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.stato}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        {p.stato !== 'accettato' && (
                                                            <button onClick={() => onConvertiPreventivo(p)} className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"><ArrowRightCircleIcon className="h-5 w-5" /></button>
                                                        )}
                                                        <button onClick={() => onEditPreventivo(p)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"><PencilSquareIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => onDeletePreventivo(p.id)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB 3: ORDINI --- */}
            {activeTab === 'ordini' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. Ordine</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Totale</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ordiniAcquisto.length === 0 ? (
                                    <tr><td colSpan="7" className="p-6 text-center text-gray-500">Nessun ordine emesso.</td></tr>
                                ) : (
                                    ordiniAcquisto.map((o) => {
                                        const nomeFornitore = fornitori.find(f => f.id === o.fornitoreId)?.ragioneSociale || o.nomeFornitore || 'N/D';
                                        return (
                                            <tr key={o.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(o.dataOrdine || o.dataDocumento)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{renderTipoBadge(o.tipoOggetto)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{o.numeroOrdine || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{nomeFornitore}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(o.totale || 0)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{o.stato || 'Inviato'}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => onEditOrdine(o)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"><PencilSquareIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => onDeleteOrdine(o.id)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB 4: DDT / BOLLE --- */}
            {activeTab === 'ddt' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinazione</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caricato Da</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ddtList.length === 0 ? (
                                    <tr><td colSpan="8" className="p-6 text-center text-gray-500">Nessun DDT caricato.</td></tr>
                                ) : (
                                    ddtList.map((ddt) => (
                                        <tr key={ddt.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(ddt.createdAt)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{renderTipoBadge(ddt.tipoOggetto)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {ddt.fotoUrl ? (
                                                    <img src={ddt.fotoUrl} alt="DDT" className="h-12 w-12 object-cover rounded-md cursor-pointer border hover:border-indigo-500" onClick={() => openImage(ddt.fotoUrl)} />
                                                ) : <span className="text-xs text-gray-400">No Foto</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ddt.nomeCantiere || 'N/D'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ddt.nomeCaricatore}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {ddt.stato === 'da_riconciliare' ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Da Verificare</span> : 
                                                 ddt.stato === 'associato_ordine' ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Pronto</span> :
                                                 <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Processato</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={ddt.note}>
                                                {ddt.note || '-'}
                                                {ddt.merceVerificata && <span className="block text-xs text-green-600 font-bold">Merce Verificata ✅</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    {/* ✅ BOTTONE APPROVA */}
                                                    {ddt.stato === 'associato_ordine' && (
                                                        <button onClick={() => onProcessDDT && onProcessDDT(ddt)} className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50" title="Approva e Carica in Magazzino">
                                                            <CheckBadgeIcon className="h-6 w-6"/>
                                                        </button>
                                                    )}
                                                    {ddt.stato === 'da_riconciliare' && (
                                                        <button onClick={() => onLinkDDT(ddt)} className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"><LinkIcon className="h-5 w-5"/></button>
                                                    )}
                                                    <button onClick={() => onDeleteDDT && onDeleteDDT(ddt.id)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB 5: FATTURE --- */}
            {activeTab === 'fatture' && (
                <div className="space-y-4 animate-fade-in">
                     <div className="flex justify-end">
                        <button onClick={onAddFattura} className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 flex items-center gap-2">
                            <PlusIcon className="h-5 w-5" /> Registra Fattura
                        </button>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Totale</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {fattureAcquisto.map((f) => {
                                    const nomeFornitore = fornitori.find(fn => fn.id === f.fornitoreId)?.ragioneSociale || f.nomeFornitore || 'N/D';
                                    const scadenzaDate = f.dataScadenza ? (f.dataScadenza.toDate ? f.dataScadenza.toDate() : new Date(f.dataScadenza)) : null;
                                    const isExpired = scadenzaDate && scadenzaDate < new Date() && f.stato !== 'pagata';
                                    return (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(f.dataFattura)}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isExpired ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                {scadenzaDate ? scadenzaDate.toLocaleDateString('it-IT') : '-'}
                                                {isExpired && <span className="block text-xs">Scaduta</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{f.numeroFattura}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{nomeFornitore}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(f.totale || 0)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select value={f.stato} onChange={(e) => onUpdateStatoFattura(f.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full border-none cursor-pointer ${f.stato === 'pagata' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    <option value="da_pagare">Da Pagare</option>
                                                    <option value="pagata">Pagata</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => onEditFattura(f)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"><PencilSquareIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => onDeleteFattura(f.id)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB 6: SCADENZIARIO --- */}
            {activeTab === 'scadenziario' && (
                <div className="space-y-6 animate-fade-in">
                    {/* (Manteniamo il codice esistente dello scadenziario, già corretto) */}
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-4 flex justify-end mb-2">
                             <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                                {['tutte', 'scadute', 'mese_corrente', 'prossimi_30'].map(key => (
                                    <button key={key} onClick={() => setFiltroPeriodo(key)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filtroPeriodo === key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                                        {key === 'tutte' && 'Tutte'} {key === 'scadute' && 'Scadute'} {key === 'mese_corrente' && 'Questo Mese'} {key === 'prossimi_30' && 'Prossimi 30gg'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-gray-500 uppercase">Da Incassare</h3><ArrowTrendingUpIcon className="h-6 w-6 text-green-500"/></div>
                            <p className="text-2xl font-bold text-green-700 mt-2">{formatCurrency(totaliScadenziario.entrate)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-gray-500 uppercase">Da Pagare</h3><ArrowTrendingDownIcon className="h-6 w-6 text-red-500"/></div>
                            <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(totaliScadenziario.uscite)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-500 lg:col-span-2">
                            <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-gray-500 uppercase">Saldo Previsto</h3><BanknotesIcon className="h-6 w-6 text-indigo-500"/></div>
                            <p className={`text-2xl font-bold mt-2 ${totaliScadenziario.saldo >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>{formatCurrency(totaliScadenziario.saldo)}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Controparte</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importo</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {scadenze.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nessuna scadenza trovata.</td></tr>
                                ) : (
                                    scadenze.map((item) => (
                                        <tr key={`${item.tipo}-${item.id}`} className="hover:bg-gray-50">
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${getDateClass(item.dataScadenza)}`}>{formatDate(item.dataScadenza)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold ${item.tipo === 'entrata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.tipo === 'entrata' ? 'ENTRATA' : 'USCITA'}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.controparte}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.descrizione}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${item.tipo === 'entrata' ? 'text-green-700' : 'text-red-700'}`}>{item.tipo === 'uscita' && '- '}{formatCurrency(item.importo)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 capitalize">{item.stato.replace('_', ' ')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
};