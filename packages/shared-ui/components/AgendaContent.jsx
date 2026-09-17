// File: packages/shared-ui-component/src/components/agenda/AgendaContent.jsx

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar } from './Calendar';
import { UserSelector } from './UserSelector';
import { DettagliEventoModal, AggiungiEventoForm } from 'shared-ui'; 
import { DettagliScadenzaModal } from './DettagliScadenzaModal';
import { AggiungiDocumentoForm } from '../forms/AggiungiDocumentoForm'; 
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// 🛑 NESSUN IMPORT DI FIREBASE QUI. LA UI NON DEVE INTERROGARE IL DB!

export const AgendaContent = (props) => {
    const {
        users, user, userRole, loadingData: propLoading, documents,
        filteredEvents: propEvents = [], // I dati arrivano GIA' PRONTI da useAgendaManager
        canSelectUser, selectedUserId, setSelectedUserId,
        onSave, onDeleteEvent, onConfirmEvent, onRejectEvent, isLoading, onCompileForm,
        currentDate: propCurrentDate, handleNextMonth: propHandleNextMonth, handlePrevMonth: propHandlePrevMonth,
    } = props;

    // 1. STATO DEL MESE CORRENTE
    const [localDate, setLocalDate] = useState(new Date());
    const effectiveCurrentDate = propCurrentDate instanceof Date ? propCurrentDate : localDate;
    
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const effectiveMonthName = monthNames[effectiveCurrentDate.getMonth()];
    const effectiveYear = effectiveCurrentDate.getFullYear();

    // 2. USIAMO SOLO GLI EVENTI PASSATI DAL GENITORE
    const finalEvents = propEvents;

    // 3. FIX GRIGLIA
    const calendarDays = useMemo(() => {
        const year = effectiveCurrentDate.getFullYear();
        const month = effectiveCurrentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const startDate = new Date(firstDay);
        const startDayOfWeek = startDate.getDay() || 7; 
        startDate.setDate(startDate.getDate() - (startDayOfWeek - 1));
        
        const endDate = new Date(lastDay);
        const endDayOfWeek = endDate.getDay() || 7;
        endDate.setDate(endDate.getDate() + (7 - endDayOfWeek));
        
        const days = [];
        let curr = new Date(startDate);

        while (curr <= endDate) {
            days.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return days;
    }, [effectiveCurrentDate]);

    // 4. NAVIGAZIONE MESI
    const handlePrev = () => {
        if (typeof propHandlePrevMonth === 'function') propHandlePrevMonth();
        else setLocalDate(new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth() - 1, 1));
    };

    const handleNext = () => {
        if (typeof propHandleNextMonth === 'function') propHandleNextMonth();
        else setLocalDate(new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth() + 1, 1));
    };

    // 5. GESTIONE MODALI
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [viewingScadenza, setViewingScadenza] = useState(null);
    const [showDocEditModal, setShowDocEditModal] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);

    const handleDayClick = useCallback((day) => { 
        setSelectedDate(day); 
        setEditingEvent(null);
        setShowModal(true); 
    }, []);

    const handleEventClick = useCallback((event) => { 
        if (event.stato === 'scadenza') setViewingScadenza(event); 
        else setViewingEvent(event); 
    }, []);
    
    const handleCloseModal = () => { 
        setShowModal(false); 
        setViewingEvent(null); 
        setViewingScadenza(null); 
        setShowDocEditModal(false); 
        setEditingEvent(null);
    };

    return (
        <div className="flex-1 w-full flex flex-col bg-white rounded-lg shadow-md p-6 md:p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 capitalize tracking-tight">{`${effectiveMonthName} ${effectiveYear}`}</h1>
                    {canSelectUser && (
                        <div className="mt-4 max-w-xs">
                            <UserSelector users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} showScadenziarioOption={true} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 self-start">
                    <button onClick={handlePrev} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <ChevronLeftIcon className="h-6 w-6 text-slate-600" />
                    </button>
                    <button onClick={handleNext} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <ChevronRightIcon className="h-6 w-6 text-slate-600" />
                    </button>
                    <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                        Aggiungi Evento
                    </button>
                </div>
            </div>

            {propLoading ? (
                <div className="flex items-center justify-center flex-1 py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <Calendar 
                    currentMonth={effectiveCurrentDate} 
                    days={calendarDays} 
                    events={finalEvents} 
                    onDayClick={handleDayClick} 
                    onEventClick={handleEventClick} 
                    today={new Date()} 
                    className="h-full min-h-[600px]" 
                />
            )}

            {showModal && <AggiungiEventoForm onClose={handleCloseModal} onSave={onSave} initialData={editingEvent} selectedDate={selectedDate} users={users} user={user} userRole={userRole} isLoading={isLoading} />}
            {viewingEvent && <DettagliEventoModal event={viewingEvent} currentUser={user} users={users} onClose={handleCloseModal} onDelete={onDeleteEvent} onConferma={onConfirmEvent} onRifiuta={onRejectEvent} isLoading={isLoading} onCompileForm={onCompileForm} />}
            {showDocEditModal && <AggiungiDocumentoForm initialData={editingDoc} onClose={handleCloseModal} />}
            {viewingScadenza && <DettagliScadenzaModal scadenza={viewingScadenza} onClose={handleCloseModal} />}
        </div>
    );
};0