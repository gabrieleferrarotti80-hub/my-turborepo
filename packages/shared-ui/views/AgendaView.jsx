// File: packages/shared-ui/AgendaView.jsx

import React from 'react';
import { Calendar } from '../components/Calendar.jsx'; 
import { UserSelector } from '../components/UserSelector.jsx';
import { DettagliEventoModal } from '../components/DettagliEventoModal.jsx';
import { AggiungiEventoForm } from '../forms/AggiungiEventoForm.jsx';
import { DettagliScadenzaModal } from '../components/DettagliScadenzaModal.jsx';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// ✅ CORREZIONE: Il componente ora si aspetta 'onDayClick' e 'onEventClick',
// i nomi standard usati dai componenti interni.
export const AgendaView = ({ 
    events, 
    scadenze, 
    currentUser, 
    onAddEvent, 
    onUpdateEvent, 
    onDeleteEvent, 
    showModal,
    selectedDate,
    editingEvent,
    viewingEvent,
    viewingScadenza,
    handleCloseModal,
    onDayClick, // <-- CORRETTO
    onEventClick, // <-- CORRETTO (per coerenza)
    handleOpenAddModal,
    handleEditFromDetails,
    monthName,
    year,
    days,
    users,
    canSelectUser,
    selectedUserId,
    onUserSelect,
    handlePrevMonth,
    handleNextMonth,
    isLoading,
    userRole,
    addEvento, 
    updateEvento,
    error 
}) => {
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>Caricamento agenda...</p></div>;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-white rounded-lg shadow-md">
            {/* Sezione Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 capitalize">{`${monthName} ${year}`}</h1>
                    {canSelectUser && (
                        <div className="mt-4 max-w-xs">
                            <UserSelector 
                                users={users} 
                                selectedUserId={selectedUserId}
                                onChange={onUserSelect}
                                showScadenziarioOption={true}
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <ChevronRightIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <button onClick={handleOpenAddModal} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                        Aggiungi Evento
                    </button>
                </div>
            </div>

            {/* Calendario */}
            {/* ✅ CORREZIONE: Ora passiamo correttamente la prop 'onDayClick' che riceviamo */}
            <Calendar 
                days={days} 
                events={events}
                onDayClick={onDayClick}
                onEventClick={onEventClick}
                today={new Date()}
            />

            {/* Modali (condizionali) */}
            {showModal && (
                <AggiungiEventoForm 
                    onClose={handleCloseModal}
                    initialData={editingEvent}
                    selectedDate={selectedDate}
                    users={users}
                    user={currentUser}
                    userRole={userRole}
                    addEvento={addEvento}
                    updateEvento={updateEvento}
                    isLoading={isLoading}
                    error={error}
                />
            )}
            {viewingEvent && (
                <DettagliEventoModal 
                    event={viewingEvent} 
                    onClose={handleCloseModal} 
                    onEdit={handleEditFromDetails} 
                    onDelete={onDeleteEvent}
                />
            )}
            {viewingScadenza && (
                <DettagliScadenzaModal 
                    scadenza={viewingScadenza} 
                    onClose={handleCloseModal} 
                />
            )}
        </div>
    );
};