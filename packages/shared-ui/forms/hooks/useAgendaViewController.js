// File: packages/shared-core/hooks/useAgendaViewController.js (NUOVO e PIÙ COMPLETO)

import { useState, useMemo } from 'react';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval,
    addMonths, 
    subMonths 
} from 'date-fns';
import { it } from 'date-fns/locale';

export const useAgendaViewController = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const handleNextMonth = () => {
        setCurrentDate(prevDate => addMonths(prevDate, 1));
    };

    const handlePrevMonth = () => {
        setCurrentDate(prevDate => subMonths(prevDate, 1));
    };

    const viewData = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        
        // Calcola l'intervallo completo della griglia del calendario
        const calendarStart = startOfWeek(start, { weekStartsOn: 1 }); // Inizia dal Lunedì (1)
        const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });     // Finisce la Domenica

        // Crea un array di oggetti per ogni giorno visualizzato nel calendario
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

        return {
            monthName: format(start, 'MMMM', { locale: it }),
            year: format(start, 'yyyy'),
            // 🛑 Restituisce l'array completo dei giorni della griglia del calendario
            calendarDays: days, 
        };
    }, [currentDate]);

    return {
        ...viewData,
        handleNextMonth,
        handlePrevMonth
    };
};