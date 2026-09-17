import React, { useState } from 'react';
import { 
    ArrowLeftIcon, CalendarDaysIcon, UsersIcon, 
    ClipboardDocumentCheckIcon, ChevronDownIcon, 
    MapPinIcon, ClockIcon, PhotoIcon, UserCircleIcon,
    XMarkIcon, WrenchScrewdriverIcon, ArchiveBoxIcon
} from '@heroicons/react/24/outline';

/**
 * Componente per visualizzare i dettagli completi del report di un singolo cantiere.
 * Include espansione giornate, MODALE per dettaglio ispezioni e visualizzazione DATI RIEPILOGO.
 */
export const CantiereReportDetailView = ({ report, rawReports = [], onBack }) => {
    
    const [expandedDates, setExpandedDates] = useState({});
    const [selectedIspezione, setSelectedIspezione] = useState(null);

    const toggleDate = (dateKey) => {
        setExpandedDates(prev => ({
            ...prev,
            [dateKey]: !prev[dateKey]
        }));
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('it-IT', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const formatTime = (date) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    // 🌟 FIX FUSO ORARIO: Evita che i report slittino al giorno prima
    const getLocalDateString = (dateVal) => {
        if (!dateVal) return '';
        const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getReportsForDate = (targetDate) => {
        // Usa i rawReports passati come prop, o cercali nel report
        const sourceReports = rawReports.length > 0 ? rawReports : (report.rawReports || []);
        if (!sourceReports.length) return [];
        
        const targetDateStr = getLocalDateString(targetDate);

        return sourceReports.filter(r => {
            const rDateStr = getLocalDateString(r.createdAt || r.data);
            return rDateStr === targetDateStr;
        }).sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
        });
    };

    const getUserName = (uid) => {
        const user = report.dettaglioPersonale?.find(u => u.id === uid);
        return user ? `${user.nome} ${user.cognome}` : 'Utente Sconosciuto';
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10 relative">
            
            {/* Header */}
            <div>
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Torna alla Panoramica
                </button>
                <h2 className="text-3xl font-bold text-gray-900">{report.nomeCantiere}</h2>
                <p className="text-gray-500 mt-1">Dettaglio attività e giornale lavori</p>
            </div>

            {/* KPI Riepilogo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">Data Inizio</p>
                    <p className="text-lg font-bold text-gray-800">{formatDate(report.dataInizio)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">Data Fine</p>
                    <p className={`text-lg font-bold ${report.dataFine ? 'text-gray-800' : 'text-green-600'}`}>
                        {report.dataFine ? formatDate(report.dataFine) : 'In corso'}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">Giorni Lavorati</p>
                    <p className="text-lg font-bold text-indigo-600">{report.totaleGiorniLavorati}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">Personale Unico</p>
                    <p className="text-lg font-bold text-indigo-600">{report.totaleUomini}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLONNA SINISTRA: DETTAGLIO GIORNATE */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <CalendarDaysIcon className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Giornale Lavori</h3>
                        </div>
                        
                        {report.dettaglioGiornate && report.dettaglioGiornate.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {report.dettaglioGiornate.map(({ giorno, personale }) => {
                                    const dateKey = new Date(giorno).toISOString();
                                    const isExpanded = expandedDates[dateKey];
                                    const dailyReports = getReportsForDate(giorno);

                                    return (
                                        <div key={dateKey} className="group transition-colors hover:bg-gray-50">
                                            <button 
                                                onClick={() => toggleDate(dateKey)}
                                                className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-800">{formatDate(giorno)}</p>
                                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                                        <UsersIcon className="h-3 w-3" />
                                                        {personale.length > 0 ? personale.join(', ') : 'Nessuno registrato'}
                                                    </p>
                                                </div>
                                                <div className={`p-2 rounded-full transition-transform duration-200 ${isExpanded ? 'bg-indigo-100 rotate-180' : 'bg-gray-100 group-hover:bg-white'}`}>
                                                    <ChevronDownIcon className={`h-4 w-4 ${isExpanded ? 'text-indigo-600' : 'text-gray-500'}`} />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="bg-gray-50 px-4 pb-4 animate-fade-in-down border-t border-gray-100">
                                                    <div className="space-y-3 mt-3">
                                                        {dailyReports.length > 0 ? (
                                                            dailyReports.map((r) => (
                                                                <div key={r.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 hover:border-indigo-200 transition-colors">
                                                                    <div className="min-w-[120px]">
                                                                        <div className="flex items-center gap-1 text-gray-900 font-bold mb-1">
                                                                            <ClockIcon className="h-4 w-4 text-indigo-500" />
                                                                            {formatTime(r.createdAt)}
                                                                        </div>
                                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                                                                            {r.tipologia || r.tipo || 'Report'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <UserCircleIcon className="h-4 w-4 text-gray-400" />
                                                                            <span className="text-sm font-medium text-gray-700">
                                                                                {getUserName(r.userId || r.autoreId)}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        {r.note && (
                                                                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-2 italic border border-gray-100">"{r.note}"</p>
                                                                        )}
                                                                        
                                                                        {/* 🌟 VISTA DATI WIZARD (Lavorazioni e Materiali) */}
                                                                        {r.datiRiepilogo && (
                                                                            <div className="mt-3 space-y-2">
                                                                                {/* Sezione Lavorazioni */}
                                                                                {r.datiRiepilogo.lavorazioni && r.datiRiepilogo.lavorazioni.length > 0 && (
                                                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                                                                                        <p className="text-[10px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                                                                                            <WrenchScrewdriverIcon className="h-3 w-3" /> Lavorazioni & Ore
                                                                                        </p>
                                                                                        <ul className="space-y-1">
                                                                                            {r.datiRiepilogo.lavorazioni.map((lav, idx) => (
                                                                                                <li key={idx} className="text-xs text-blue-900 flex justify-between items-center bg-white/60 px-2 py-1 rounded">
                                                                                                    <span className="font-medium truncate pr-2">{lav.descrizione}</span>
                                                                                                    <span className="shrink-0 font-bold text-right">
                                                                                                        {lav.oreDedicate}h
                                                                                                        {lav.quantitaProdotta ? ` | Qtà: ${lav.quantitaProdotta} ${lav.um || ''}` : ''}
                                                                                                    </span>
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}

                                                                                {/* Sezione Materiali */}
                                                                                {r.datiRiepilogo.materialiConsumati && r.datiRiepilogo.materialiConsumati.length > 0 && (
                                                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                                                                                        <p className="text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                                                                                            <ArchiveBoxIcon className="h-3 w-3" /> Materiali Utilizzati
                                                                                        </p>
                                                                                        <ul className="space-y-1">
                                                                                            {r.datiRiepilogo.materialiConsumati.map((mat, idx) => (
                                                                                                <li key={idx} className="text-xs text-amber-900 flex justify-between items-center bg-white/60 px-2 py-1 rounded">
                                                                                                    <span className="font-medium truncate pr-2">{mat.nome || mat.articoloNome || 'Materiale'}</span>
                                                                                                    <span className="shrink-0 font-bold">Qtà: {mat.quantitaUsata}</span>
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* FIX MAPS LINK */}
                                                                        {(r.location || (r.latitude && r.longitude)) && (
                                                                            <a 
                                                                                href={`https://www.google.com/maps?q=${r.location?.latitude || r.latitude},${r.location?.longitude || r.longitude}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2 font-medium bg-blue-50 px-2 py-1 rounded-md"
                                                                            >
                                                                                <MapPinIcon className="h-3 w-3" /> Vedi Posizione
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    {r.fileUrl && (
                                                                        <div className="shrink-0">
                                                                            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="block group/img relative">
                                                                                <img src={r.fileUrl} alt="Allegato" className="h-20 w-20 object-cover rounded-lg border border-gray-200 group-hover/img:opacity-90 shadow-sm" />
                                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/30 rounded-lg transition-opacity">
                                                                                    <PhotoIcon className="h-6 w-6 text-white" />
                                                                                </div>
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-center text-gray-400 py-2">Nessun dettaglio registrato.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">Nessuna giornata lavorativa registrata.</div>
                        )}
                    </div>
                </div>

                {/* COLONNA DESTRA: ISPEZIONI (Lista Interattiva) */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <ClipboardDocumentCheckIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Ispezioni Tecnici</h3>
                                <p className="text-xs text-gray-400">Clicca per i dettagli</p>
                            </div>
                        </div>

                        {report.dettaglioIspezioni && report.dettaglioIspezioni.length > 0 ? (
                            <ul className="divide-y divide-gray-100">
                                {report.dettaglioIspezioni.map(ispezione => (
                                    <li 
                                        key={ispezione.id} 
                                        onClick={() => setSelectedIspezione(ispezione)}
                                        className="p-4 hover:bg-orange-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase group-hover:text-orange-800">
                                                {formatDate(ispezione.createdAt)}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase border border-orange-200">
                                                {ispezione.tipologia}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium mb-2 line-clamp-2">
                                            {ispezione.note || 'Nessuna nota specificata.'}
                                        </p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-gray-700">
                                                <UserCircleIcon className="h-3 w-3" />
                                                {getUserName(ispezione.userId || ispezione.autoreId)}
                                            </span>
                                            {ispezione.fileUrl && (
                                                <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
                                                    <PhotoIcon className="h-3 w-3" /> Foto
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Nessuna ispezione registrata.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* MODALE DETTAGLIO ISPEZIONE */}
            {selectedIspezione && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
                        
                        {/* Header Modale */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                            <div>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                                    {selectedIspezione.tipologia}
                                </p>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Dettaglio Ispezione
                                </h3>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4"/> 
                                    {formatDate(selectedIspezione.createdAt)} alle {formatTime(selectedIspezione.createdAt)}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedIspezione(null)}
                                className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors shadow-sm"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Contenuto Scrollabile */}
                        <div className="p-6 overflow-y-auto">
                            
                            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                    {getUserName(selectedIspezione.userId || selectedIspezione.autoreId).charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Tecnico Rilevatore</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {getUserName(selectedIspezione.userId || selectedIspezione.autoreId)}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Note / Osservazioni</p>
                                <div className="p-4 bg-yellow-50 text-gray-800 rounded-xl border border-yellow-100 text-sm leading-relaxed">
                                    {selectedIspezione.note || "Nessuna nota inserita."}
                                </div>
                            </div>

                            {selectedIspezione.fileUrl && (
                                <div className="mb-6">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <PhotoIcon className="h-4 w-4"/> Documentazione Fotografica
                                    </p>
                                    <a href={selectedIspezione.fileUrl} target="_blank" rel="noopener noreferrer" className="block group relative overflow-hidden rounded-xl border border-gray-200">
                                        <img 
                                            src={selectedIspezione.fileUrl} 
                                            alt="Allegato" 
                                            className="w-full h-auto object-cover max-h-64 hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                Clicca per ingrandire
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            )}

                            {/* FIX MAPS LINK */}
                            {(selectedIspezione.location || (selectedIspezione.latitude && selectedIspezione.longitude)) && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <MapPinIcon className="h-4 w-4"/> Posizione Rilevata
                                    </p>
                                    <a 
                                        href={`https://www.google.com/maps?q=${selectedIspezione.location?.latitude || selectedIspezione.latitude},${selectedIspezione.location?.longitude || selectedIspezione.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors font-medium text-sm"
                                    >
                                        <MapPinIcon className="h-4 w-4" /> Apri su Google Maps
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};