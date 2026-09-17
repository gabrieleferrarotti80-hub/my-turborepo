import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, PrinterIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { TableCellsIcon, MapIcon } from '@heroicons/react/24/outline';
import { MappaPercorsiEmbed } from './components/MappaPercorsiEmbed'; 
import { UserSelector } from 'shared-ui'; 
import { useFirebaseData, useReportsManager, usePercorsiManager } from 'shared-core'; 
import { useReactToPrint } from 'react-to-print';

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; 
import it from 'date-fns/locale/it'; 

registerLocale('it', it);

const ReportView = ({ 
    onBack, 
    onSearchChange, 
    searchTerm, 
    reports, 
    preSelectedCantiereId, 
    hideHeader, 
    defaultView = 'lista',
    hideTabs = false 
}) => {
    
    const { companies, users: personnel, cantieri: sites, subcantieri, userAziendaId, db } = useFirebaseData();
    const { deleteReport } = useReportsManager(db);
    const { percorsi, loading: loadingPercorsi, fetchPercorsi } = usePercorsiManager(db, userAziendaId);

    const [viewMode, setViewMode] = useState(defaultView); 
    const [mapUser, setMapUser] = useState('');       
    const [mapStartDate, setMapStartDate] = useState(null); 
    const [mapEndDate, setMapEndDate] = useState(null);     
    
    const [selectedCantiere, setSelectedCantiere] = useState(preSelectedCantiereId || '');
    const [selectedSubcantiere, setSelectedSubcantiere] = useState('');
    const [totalDistanceMeters, setTotalDistanceMeters] = useState(0);

    // ✅ FUNZIONE DI STAMPA RIPRISTINATA
    const componentToPrintRef = useRef(null);
    const handlePrint = useReactToPrint({ 
        contentRef: componentToPrintRef,
        documentTitle: `Report_Percorsi_Cantiere` 
    });

    const workedDates = useMemo(() => {
        if (!reports || !Array.isArray(reports)) return [];
        return reports
            .map(r => {
                if (!r.createdAt) return null;
                const d = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                if (isNaN(d.getTime())) return null;
                return new Date(d.getFullYear(), d.getMonth(), d.getDate());
            })
            .filter(Boolean);
    }, [reports]);

    useEffect(() => {
        const toISODate = (date) => {
            if (!date) return '';
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };

        const startStr = toISODate(mapStartDate);
        const endStr = toISODate(mapEndDate);

        if (viewMode === 'mappa' && startStr && endStr) {
            const hasUser = mapUser && mapUser !== '';
            const hasCantiere = selectedCantiere && selectedCantiere !== '';
            const hasSubcantiere = selectedSubcantiere && selectedSubcantiere !== '';

            if (hasUser || hasCantiere || hasSubcantiere) {
                fetchPercorsi(mapUser || null, startStr, endStr, selectedSubcantiere || selectedCantiere || null);
            }
        }
    }, [viewMode, mapUser, mapStartDate, mapEndDate, selectedCantiere, selectedSubcantiere]); 

    const personnelMap = useMemo(() => {
        const safePersonnel = personnel || [];
        return safePersonnel.reduce((acc, p) => ({ ...acc, [p.id]: `${p.nome} ${p.cognome}`, [p.uid]: `${p.nome} ${p.cognome}` }), {});
    }, [personnel]);

    const sitesMap = useMemo(() => {
        const safeSites = sites || [];
        const safeSub = subcantieri || [];
        const map = {};
        safeSites.forEach(s => { map[s.id] = s.nomeCantiere || s.nome; });
        safeSub.forEach(s => {
            const nomePadre = map[s.parentCantiereId] ? `${map[s.parentCantiereId]} > ` : '';
            map[s.id] = `${nomePadre}${s.nomeSubcantiere || s.nome || 'Sub'} (${s.codice || ''})`;
        });
        return map;
    }, [sites, subcantieri]);

    const filteredPersonnel = useMemo(() => {
        if (!selectedCantiere || !reports) return personnel || [];
        const cantiereReports = reports.filter(r => r.cantiereId === selectedCantiere);
        const workedUserIds = new Set(cantiereReports.map(r => r.userId || r.autoreId));
        return (personnel || []).filter(p => workedUserIds.has(p.id));
    }, [personnel, reports, selectedCantiere]);

    const filteredSubcantieri = useMemo(() => {
        if (!selectedCantiere) return [];
        return (subcantieri || []).filter(sub => sub.parentCantiereId === selectedCantiere);
    }, [selectedCantiere, subcantieri]);

    return (
        <div className="space-y-6 animate-fade-in">
            <style>{`
                .react-datepicker-wrapper { width: 100%; display: block; }
                .react-datepicker__input-container input { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none; }
                .day-worked { background-color: #fef08a !important; color: #854d0e !important; font-weight: bold; border-radius: 50%; }
            `}</style>

            {!hideHeader && (
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline">
                            <ArrowLeftIcon className="h-4 w-4" /> Torna indietro
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">Report Squadre</h1>
                    </div>
                    {/* ✅ PULSANTE STAMPA RIPRISTINATO */}
                    <div className="flex gap-2">
                        {viewMode === 'mappa' && (
                            <button onClick={() => handlePrint()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-all print:hidden">
                                <PrinterIcon className="h-5 w-5" /> Stampa PDF
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!hideTabs && (
                <div className="flex border-b border-gray-200 print:hidden">
                    <button onClick={() => setViewMode('lista')} className={`px-6 py-3 font-medium ${viewMode === 'lista' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500'}`}>
                        <TableCellsIcon className="w-5 h-5 inline mr-2" /> Elenco
                    </button>
                    <button onClick={() => setViewMode('mappa')} className={`px-6 py-3 font-medium ${viewMode === 'mappa' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500'}`}>
                        <MapIcon className="w-5 h-5 inline mr-2" /> Mappa
                    </button>
                </div>
            )}

            {viewMode === 'mappa' && (
                <div ref={componentToPrintRef} className="print:p-8 h-full flex flex-col relative">
                    <div className="bg-white p-4 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end border border-gray-200 mb-4 print:hidden">
                        <div className="w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Squadra</label>
                            <UserSelector users={filteredPersonnel} selectedUserId={mapUser} onChange={setMapUser} label={null} />
                        </div>
                        
                        {!preSelectedCantiereId && (
                            <div className="w-full">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantiere</label>
                                <select value={selectedCantiere} onChange={(e) => { setSelectedCantiere(e.target.value); setSelectedSubcantiere(''); }} className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white">
                                    <option value="">Tutti</option>
                                    {(sites || []).map(s => <option key={s.id} value={s.id}>{s.nomeCantiere || s.nome}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="w-full relative z-[500]">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dal</label>
                            <DatePicker selected={mapStartDate} onChange={(date) => setMapStartDate(date)} dateFormat="dd/MM/yyyy" locale="it" placeholderText="Seleziona inizio" highlightDates={[{ "day-worked": workedDates }]} />
                        </div>

                        <div className="w-full relative z-[400]">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Al</label>
                            <DatePicker selected={mapEndDate} onChange={(date) => setMapEndDate(date)} dateFormat="dd/MM/yyyy" locale="it" placeholderText="Seleziona fine" highlightDates={[{ "day-worked": workedDates }]} />
                        </div>
                    </div>

                    <div className="w-full relative z-0">
                        <MappaPercorsiEmbed 
                            userId={mapUser} 
                            cantiereId={selectedSubcantiere || selectedCantiere}
                            percorsi={percorsi} 
                            // ✅ AGGIUNGI QUESTA RIGA: Passiamo i report completi alla mappa
                            reports={reports}
                            loading={loadingPercorsi} 
                            personnelMap={personnelMap} 
                            onTotalDistanceChange={setTotalDistanceMeters} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportView;