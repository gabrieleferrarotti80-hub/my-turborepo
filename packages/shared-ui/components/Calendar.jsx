// File: src/components/Calendar.jsx

import React from 'react';

export const Calendar = ({ days, events, onDayClick, onEventClick, today, className }) => {

    const getDayEvents = (day) => {
        if (!day || !events) return [];
        return events.filter(event => {
            if (!event || !event.start) return false;
            // La logica qui è già robusta, la manteniamo
            const eventDate = event.start.toDate ? event.start.toDate() : event.start;
            if (!(eventDate instanceof Date) || isNaN(eventDate.getTime())) return false;
            return eventDate.toDateString() === day.toDateString();
        });
    };
    
    const renderDayCell = (day, index) => {
        // Se la cella è vuota, ritorna un div vuoto
        if (!day) {
            return <div key={index} className="bg-gray-50 border border-gray-200 p-2"></div>;
        }

        // ✅ CORREZIONE CHIAVE: Convertiamo 'day' in un oggetto Date in modo sicuro
        // Questo gestisce sia i Timestamp di Firestore (.toDate) che gli oggetti Date già esistenti.
        const dateObject = day.toDate ? day.toDate() : day;

        // Aggiungiamo un ulteriore controllo per essere sicuri al 100% che sia una data valida
        if (!(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
            console.error("Calendar ha ricevuto un oggetto giorno non valido:", day);
            return <div key={index} className="bg-red-100 border border-red-300 p-2">!</div>; // Mostra un errore
        }

        const dayEvents = getDayEvents(dateObject);
        const dayNumber = dateObject.getDate();
        const isToday = today && dateObject.toDateString() === today.toDateString();

        return (
            <div 
                key={dateObject.toISOString()} 
                onClick={() => onDayClick(dateObject)}
                className={`border border-gray-200 p-2 flex flex-col justify-start items-start cursor-pointer transition-colors duration-200 
                    bg-white hover:bg-indigo-50
                    ${isToday ? 'bg-indigo-100 border-indigo-300' : ''}`}
            >
                <div className={`font-bold text-lg mb-2 self-center ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {dayNumber}
                </div>
                <div className="space-y-1 w-full overflow-y-auto">
                    {dayEvents.map(event => {
                        const stateColors = {
                            confermato: 'bg-green-500',
                            da_confermare: 'bg-yellow-500 text-black',
                            rifiutato: 'bg-red-500',
                            modifica_proposta: 'bg-purple-500',
                            scadenza: 'bg-orange-500',
                        };
                        const eventStyle = stateColors[event.stato] || 'bg-blue-500';

                        return (
                            <div 
                                key={event.id} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(event);
                                }}
                                className={`${eventStyle} text-white text-xs font-medium px-2 py-1 rounded-full truncate cursor-pointer`}
                            >
                                {event.title}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // I log di debug non sono più necessari se il problema è risolto
    // console.log('--- DEBUG COMPONENTE CALENDAR ---');
    // ...

    return (
        <div className={`flex flex-col w-full h-full ${className || ''}`}>
            
            {/* Intestazione Giorni della Settimana */}
            <div className="grid grid-cols-7 text-center font-medium text-sm border-t border-gray-200">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                    <div key={day} className="text-gray-600 font-bold text-xs py-1 bg-gray-100 rounded-t-md">
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Griglia Principale dei Giorni */}
            <div className="grid grid-cols-7 grid-rows-6 flex-grow w-full">
                {/* Aggiunto un controllo per mostrare un messaggio di caricamento se i dati non sono pronti */}
                {!Array.isArray(days) ? (
                    <div className="col-span-7 text-center p-8 text-gray-500">Caricamento calendario...</div>
                ) : (
                    days.map((day, index) => renderDayCell(day, index))
                )}
            </div>
        </div>
    );
};