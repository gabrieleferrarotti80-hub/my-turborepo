import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Draggable } from '@fullcalendar/interaction';
import { MagnifyingGlassIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CalendarDaysIcon, TrashIcon } from '@heroicons/react/24/solid';

export const PlannerSidebar = ({ cantieri = [], subcantieri = [], isLoading, onPhaseClick, onDeletePhase }) => {
    const [searchCantiere, setSearchCantiere] = useState('');
    const [selectedCantiereId, setSelectedCantiereId] = useState(null);
    const externalEventsRef = useRef(null);

    const filteredCantieri = useMemo(() => {
        if (!searchCantiere) return cantieri;
        const term = searchCantiere.toLowerCase();
        return cantieri.filter(c => 
            (c.nomeCantiere || c.nome || c.titolo || '').toLowerCase().includes(term)
        );
    }, [cantieri, searchCantiere]);

    useEffect(() => {
        if (!selectedCantiereId && filteredCantieri.length > 0) {
            setSelectedCantiereId(filteredCantieri[0].id);
        }
    }, [filteredCantieri, selectedCantiereId]);

    const fasiDaMostrare = useMemo(() => {
        if (!selectedCantiereId) return [];
        return subcantieri.filter(s => 
            (s.cantiereGenitoreId || s.cantiereId) === selectedCantiereId && !s.isProgrammed
        );
    }, [subcantieri, selectedCantiereId]);

    // Ricollegamento dinamico del Drag & Drop per FullCalendar
    useEffect(() => {
        let draggable = null;
        
        if (externalEventsRef.current && fasiDaMostrare.length > 0) {
            draggable = new Draggable(externalEventsRef.current, {
                itemSelector: '.fc-event',
                eventData: function(eventEl) {
                    return JSON.parse(eventEl.getAttribute('data-event'));
                }
            });
        }

        return () => {
            if (draggable) draggable.destroy();
        };
    }, [fasiDaMostrare]);

    if (isLoading) {
        return <div className="w-80 bg-white border-r border-gray-200 p-6 text-center text-gray-400 font-bold animate-pulse">Caricamento risorse...</div>;
    }

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
            
            {/* PARTE ALTA: CANTIERI */}
            <div className="flex flex-col h-1/2 border-b border-gray-200">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <BuildingOfficeIcon className="h-4 w-4 text-indigo-600"/> 1. Seleziona Cantiere
                    </h3>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca cantiere..." 
                            value={searchCantiere}
                            onChange={(e) => setSearchCantiere(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50/30 scrollbar-thin">
                    {filteredCantieri.map(cantiere => {
                        const isSelected = selectedCantiereId === cantiere.id;
                        const fasiDaFare = subcantieri.filter(s => (s.cantiereGenitoreId || s.cantiereId) === cantiere.id && !s.isProgrammed).length;

                        return (
                            <div 
                                key={cantiere.id}
                                onClick={() => setSelectedCantiereId(cantiere.id)}
                                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                    isSelected 
                                    ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-50' 
                                    : 'bg-transparent border-transparent hover:bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={`text-xs font-black leading-tight ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                                        {cantiere.nomeCantiere || cantiere.nome || cantiere.titolo}
                                    </h4>
                                    {fasiDaFare > 0 ? (
                                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                                            {fasiDaFare}
                                        </span>
                                    ) : (
                                        <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0"/>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PARTE BASSA: FASI TRASCINABILI E CLICCABILI */}
            <div className="flex flex-col h-1/2 bg-indigo-50/20">
                <div className="p-3 bg-white border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-4 w-4 text-indigo-600"/> 2. Trascina o Clicca
                    </h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {fasiDaMostrare.length}
                    </span>
                </div>

                <div ref={externalEventsRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin" id="external-events">
                    {fasiDaMostrare.map(fase => (
                        <div 
                            key={fase.id}
                            // 🌟 AGGIUNTA CLASSE "touch-none" per evitare i warning di Chrome sul drag
                            className="fc-event touch-none group relative flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-indigo-400 hover:shadow-md transition-all select-none"
                            data-event={JSON.stringify({
                                title: fase.nome,
                                faseId: fase.id,
                                cantiereId: fase.cantiereGenitoreId || fase.cantiereId,
                                duration: { hours: fase.durataStimata || 8 },
                                create: true
                            })}
                        >
                            {/* Puntini di presa */}
                            <div className="flex flex-col gap-0.5 text-gray-300 cursor-grab active:cursor-grabbing px-1">
                                <div className="w-1 h-1 rounded-full bg-current"></div>
                                <div className="w-1 h-1 rounded-full bg-current"></div>
                                <div className="w-1 h-1 rounded-full bg-current"></div>
                            </div>
                            
                            {/* Testo Descrittivo */}
                            <div className="flex-1 min-w-0 cursor-grab active:cursor-grabbing">
                                <p className="text-xs font-bold text-gray-800 truncate">{fase.nome}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {fase.durataStimata || 8}h
                                    </span>
                                    {fase.interventiPrevisti > 1 && (
                                        <span className="text-[9px] font-black text-amber-600 uppercase">
                                            Ciclo {fase.interventiProgrammati + 1}/{fase.interventiPrevisti}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* PULSANTI CLICCABILI */}
                            <div 
                                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onPointerDown={(e) => e.stopPropagation()} 
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={() => onPhaseClick && onPhaseClick(fase)}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                                    title="Pianifica ora nel calendario"
                                >
                                    <CalendarDaysIcon className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => onDeletePhase && onDeletePhase(fase)}
                                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                    title="Elimina definitivamente questa fase"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {fasiDaMostrare.length === 0 && selectedCantiereId && (
                        <div className="text-center py-10 px-4">
                            <CheckCircleIcon className="h-10 w-10 text-emerald-200 mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-400">Tutto programmato per questo cantiere!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};