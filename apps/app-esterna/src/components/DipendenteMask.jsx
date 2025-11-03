// File: apps/app-esterna/src/components/DipendenteMask.jsx

import React, { useState, useMemo } from 'react';
import {
    useFirebaseData,
    useAgendaManager,
    useAssegnazioniManager,
    useNoteOperativeManager
} from 'shared-core';
import {
    AgendaContent,
    AddNotaOperativaForm,
    DettagliEventoModal,
    // ❗ Rimosso: GestioneAssegnazioniMagazzinoView da shared-ui
} from 'shared-ui';
import { MaskLayout } from './MaskLayout.jsx';
import { AssegnazioniMagazzino } from './AssegnazioniMagazzino.jsx'; // 👈 1. IMPORTA IL COMPONENTE LOCALE
import { 
    ArchiveBoxIcon,
    CalendarIcon,
    PencilIcon
} from '@heroicons/react/24/solid';

export const DipendenteMask = ({ user, userData, onLogout }) => {
    
    // --- 1. HOOKS E DATI (Invariati) ---
    const { 
        db, 
        storage, 
        userRole, 
        loadingData, 
        data 
    } = useFirebaseData();

    const { 
        users, 
        eventi, 
        userAssegnazioni,
    } = data || {};

    const agendaLogica = useAgendaManager({ eventi, user, users, userRole, loadingData, db, userAziendaId: userData?.companyID });
    const { confermaPresaInCarico, richiediRestituzione, segnalaGuasto } = useAssegnazioniManager(db, user);
    const { addNotaOperativa, isSaving: isSavingNota } = useNoteOperativeManager();

    // --- 2. STATI LOCALI (Invariati) ---
    const [view, setView] = useState('main');
    const [isNotaModalOpen, setNotaModalOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const isSaving = isSavingNota || agendaLogica.isLoading;
                     
    // --- 3. LOGICA DERIVATA (Invariata) ---
    const nuoveAssegnazioniDaConfermare = useMemo(() => {
        return !loadingData && Array.isArray(userAssegnazioni) && userAssegnazioni.some(a => a.statoWorkflow === 'da confermare');
    }, [userAssegnazioni, loadingData]);

    const dashboardButtonClasses = `
        flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm border-2 border-gray-800
        text-gray-700 font-semibold text-center transition-all duration-300
        hover:bg-gray-100 hover:shadow-md active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    // --- 4. HANDLERS (Invariati) ---
    
    const handleAction = async (action, ...args) => {
        const result = await action(...args);
        setStatusMessage(result.message || (result.success ? "Operazione completata!" : "Si è verificato un errore."));
        return result; 
    };

    const handleConferma = (assegnazioneId) => handleAction(confermaPresaInCarico, assegnazioneId);
    const handleRestituzione = (assegnazione) => {
        const note = prompt("Aggiungi una nota per la restituzione (opzionale):");
        if (note !== null) handleAction(richiediRestituzione, assegnazione, note);
    };
    const handleSegnalaGuasto = (assegnazione) => {
        const note = prompt("Descrivi il guasto (obbligatorio):");
        if (note) handleAction(segnalaGuasto, assegnazione, note);
    };

    const handleSaveNota = async (note, files) => {
        const result = await addNotaOperativa(note, files);
        setStatusMessage(result.message);
        if (result.success) {
            setNotaModalOpen(false);
        }
        return result;
    };

    const handleConfirmarEvento = async (eventId, eventData) => {
        const result = await agendaLogica.onConfirmEvent(eventId, eventData); 
        setStatusMessage(result.message);
        if (result.success) {
            agendaLogica.onCloseModal();
        }
    };
    const handleRechazarEvento = async (eventId) => {
        const result = await agendaLogica.onRejectEvent(eventId);
        setStatusMessage(result.message);
        if (result.success) {
            agendaLogica.onCloseModal();
        }
    };

    // --- 5. RENDER ---
    
    if (loadingData || !userData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-gray-900"></div>
                <h2 className="ml-4 text-gray-700 text-xl font-semibold">Caricamento...</h2>
            </div>
        );
    }
    
    return (
        <MaskLayout 
            user={user} 
            userData={userData} 
            onLogout={onLogout} 
            title="Area Dipendente" 
            subtitle={user.email}
        >
            
            {/* VISTA: Main Dashboard (Invariata) */}
            {view === 'main' && (
                <>
                    {nuoveAssegnazioniDaConfermare && (
                        <div className="my-4 p-4 border-l-4 border-yellow-500 bg-yellow-100 text-yellow-800 rounded-lg shadow-md animate-pulse cursor-pointer" onClick={() => setView('assegnazioni')}>
                            <h4 className="font-bold">Attenzione!</h4>
                            <p>Hai nuove attrezzature da confermare nella sezione Assegnazioni.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <button onClick={() => setView('agenda')} className={dashboardButtonClasses}>
                            <CalendarIcon className="h-10 w-10 text-orange-500 mb-2" />
                            <span className="text-sm font-semibold">Agenda</span>
                        </button>
                        <button onClick={() => setView('assegnazioni')} className={dashboardButtonClasses}>
                            <ArchiveBoxIcon className="h-10 w-10 text-yellow-500 mb-2" />
                            <span className="text-sm font-semibold">Assegnazioni</span>
                        </button>
                        <button onClick={() => setNotaModalOpen(true)} className={dashboardButtonClasses}>
                            <PencilIcon className="h-10 w-10 text-purple-500 mb-2" />
                            <span className="text-sm font-semibold">Nota Veloce</span>
                        </button>
                    </div>
                </>
            )}
            
            {/* VISTA: Agenda (Invariata) */}
            {view === 'agenda' && (
                <div>
                    <button onClick={() => setView('main')} className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">&larr; Torna alla dashboard</button>
                    <AgendaContent 
                        {...agendaLogica} 
                        onSelectEvent={agendaLogica.onViewEvent}
                        onSelectSlot={() => {}} 
                        onCompileForm={() => {}} 
                    />
                </div>
            )}

            {/* VISTA: Assegnazioni */}
            {view === 'assegnazioni' && (
                <div>
                    <button onClick={() => setView('main')} className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">&larr; Torna alla dashboard</button>
                    
                    {/* 👈 2. USA IL COMPONENTE LOCALE (come PrepostoMask) */}
                    <AssegnazioniMagazzino
                        loading={loadingData}
                        assegnazioni={userAssegnazioni}
                        onConferma={handleConferma}
                        onRestituzione={handleRestituzione}
                        onSegnalaGuasto={handleSegnalaGuasto}
                    />
                </div>
            )}


            {/* --- Sezione MODAL (Invariata) --- */}

            {isNotaModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <AddNotaOperativaForm
                        onSubmit={handleSaveNota}
                        onCancel={() => setNotaModalOpen(false)}
                        isSaving={isSavingNota}
                    />
                </div>
            )}

            {agendaLogica.viewingEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <DettagliEventoModal
                        event={agendaLogica.viewingEvent}
                        onClose={agendaLogica.onCloseModal}
                        onConferma={handleConfirmarEvento}
                        onRifiuta={handleRechazarEvento}
                        users={users}
                        currentUser={user}
                        isLoading={agendaLogica.isLoading}
                    />
                </div>
            )}
            
            {statusMessage && (
                <div 
                    key={Date.now()} 
                    className="fixed bottom-4 right-4 p-4 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg animate-fade-out" 
                    onAnimationEnd={() => setStatusMessage('')}
                >
                    {statusMessage}
                </div>
            )}
            
        </MaskLayout>
    );
};