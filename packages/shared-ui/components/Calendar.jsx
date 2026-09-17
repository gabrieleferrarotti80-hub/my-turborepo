// File: packages/shared-ui/components/Calendar.jsx

import React, { useCallback } from 'react';

export const Calendar = ({ days, events, onDayClick, onEventClick, today, className }) => {

    const getDayEvents = (day) => {
        if (!day || !events) return [];
        return events.filter(event => {
            // 🌟 FIX: Il calendario ora supporta sia 'start' (inglese) che 'data' (italiano)
            const eventStart = event.start || event.data;
            
            if (!eventStart) return false;
            
            // Gestisce sia il Timestamp di Firebase che oggetti Date normali
            const eventDate = eventStart.toDate ? eventStart.toDate() : new Date(eventStart);
            
            if (!(eventDate instanceof Date) || isNaN(eventDate.getTime())) return false;
            
            return eventDate.toDateString() === day.toDateString();
        });
    };

    // 🚀 ALGORITMO FESTIVITÀ ITALIANE
    const checkIsFestivo = useCallback((date) => {
        if (date.getDay() === 0) return true; // Tutte le Domeniche

        const d = date.getDate();
        const m = date.getMonth() + 1;
        const y = date.getFullYear();

        // Feste fisse sul calendario
        const fixedHolidays = [
            '1-1',   // Capodanno
            '6-1',   // Epifania
            '25-4',  // Liberazione
            '1-5',   // Festa dei Lavoratori
            '2-6',   // Festa della Repubblica
            '15-8',  // Ferragosto
            '1-11',  // Tutti i Santi
            '8-12',  // Immacolata
            '25-12', // Natale
            '26-12'  // Santo Stefano
        ];
        if (fixedHolidays.includes(`${d}-${m}`)) return true;

        // Calcolo mobile di Pasquetta (Lunedì dell'Angelo) tramite algoritmo di Gauss
        const a = y % 19;
        const b = Math.floor(y / 100);
        const c = y % 100;
        const d_y = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d_y - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m_y = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m_y + 114) / 31);
        const day = ((h + l - 7 * m_y + 114) % 31) + 1;
        
        const pasqua = new Date(y, month - 1, day);
        const pasquetta = new Date(pasqua);
        pasquetta.setDate(pasqua.getDate() + 1);

        // Controlla se è Pasquetta
        if (d === pasquetta.getDate() && m === (pasquetta.getMonth() + 1)) return true;

        return false;
    }, []);
    
    const renderDayCell = (day, index) => {
        if (!day) {
            return (
                <div key={`empty-${index}`} className="bg-gray-50/50 min-h-[120px] transition-all"></div>
            );
        }

        const dateObject = day.toDate ? day.toDate() : day;

        if (!(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
            return <div key={`error-${index}`} className="bg-red-50 text-red-500 p-2 text-xs">Errore data</div>;
        }

        const dayEvents = getDayEvents(dateObject);
        const dayNumber = dateObject.getDate();
        const isToday = today && dateObject.toDateString() === today.toDateString();

        // 🎨 LOGICA COLORI GIORNI SPECIALI
        const isFestivo = checkIsFestivo(dateObject);
        const isSaturday = dateObject.getDay() === 6;

        let bgCell = 'bg-white hover:bg-slate-50';
        let textNum = 'text-gray-700 group-hover:bg-slate-200';
        
        if (isFestivo) {
            bgCell = 'bg-red-50/60 hover:bg-red-100/60';
            textNum = 'text-red-600 group-hover:bg-red-100';
        } else if (isSaturday) {
            bgCell = 'bg-amber-50/50 hover:bg-amber-100/50'; 
            textNum = 'text-amber-700 group-hover:bg-amber-100';
        }

        return (
            <div 
                key={dateObject.toISOString()} 
                onClick={() => onDayClick(dateObject)}
                className={`group min-h-[120px] ${bgCell} p-2 flex flex-col transition-all duration-200 cursor-pointer relative overflow-hidden`}
            >
                {/* Intestazione del singolo giorno */}
                <header className="flex items-center justify-between mb-2">
                    <button
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all
                            ${isToday 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-110' 
                                : textNum
                            }`}
                    >
                        {dayNumber}
                    </button>
                    {dayEvents.length > 3 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></span>
                    )}
                </header>

                {/* Lista degli eventi nel giorno */}
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {dayEvents.map(event => {
                        const bgColor = event.color || event.backgroundColor || '#3b82f6';
                        const textColor = event.textColor || '#ffffff';
                        // 🌟 FIX: Prende sia 'title' che 'titolo'
                        const displayTitle = event.title || event.titolo || 'Evento Senza Titolo';

                        return (
                            <div 
                                key={event.id} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(event);
                                }}
                                style={{ backgroundColor: bgColor, color: textColor }}
                                className={`text-[11px] leading-tight font-medium px-2 py-1.5 rounded-md truncate cursor-pointer shadow-sm hover:shadow transition-all hover:-translate-y-px hover:brightness-110 border border-black/5`}
                                title={displayTitle}
                            >
                                {displayTitle}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col w-full h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${className || ''}`}>
            
            {/* Intestazione Giorni della Settimana */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-slate-50/80">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, i) => {
                    let headerColor = 'text-slate-500';
                    if (i === 5) headerColor = 'text-amber-600'; 
                    if (i === 6) headerColor = 'text-red-500';   

                    return (
                        <div 
                            key={day} 
                            className={`py-3 text-center text-xs font-extrabold uppercase tracking-wider ${headerColor}`}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
            
            {/* Griglia Principale dei Giorni */}
            <div className="grid grid-cols-7 flex-grow bg-gray-200 gap-px">
                {!Array.isArray(days) ? (
                    <div className="col-span-7 flex items-center justify-center p-12 bg-white">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-slate-500 font-medium">Sincronizzazione calendario...</span>
                    </div>
                ) : (
                    days.map((day, index) => renderDayCell(day, index))
                )}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }
            `}} />
        </div>
    );
};