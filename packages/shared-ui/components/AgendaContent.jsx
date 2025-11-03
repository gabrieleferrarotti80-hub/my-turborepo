// File: apps/gestionale/src/components/agenda/AgendaContent.jsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar } from './Calendar';
import { UserSelector } from './UserSelector';
// Componenti UI
import { DettagliEventoModal, AggiungiEventoForm } from 'shared-ui';
import { DettagliScadenzaModal } from './DettagliScadenzaModal';
import { AggiungiDocumentoForm } from '../forms/AggiungiDocumentoForm'; 
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

export const AgendaContent = (props) => {
     // Destrutturazione props da useAgendaManager (si trova in cima alla funzione)
     const {
         events: eventi,
         documents: documenti,
         users,
         user,
         userRole,
         loadingData,
         onAddEvent,
         onUpdateEvent,
         onDeleteEvent,
         onConfirmEvent,
         onRejectEvent,
         isLoading,
         onCompileForm,
         
         // Props del calendario fornite da useAgendaManager
         currentDate: propCurrentDate, 
         monthName: propMonthName,
         year: propYear,
         calendarDays: propCalendarDays,
         handleNextMonth: propHandleNextMonth,
         handlePrevMonth: propHandlePrevMonth,

         // --- ✅ NUOVE PROPS DA DESTRUTTURARE (da useAgendaManager) ---
         onProposeChangeEvent,
         onAcceptChangeEvent,
         onRejectChangeEvent
     } = props;


     // --- ✅ INIZIO DEFINIZIONI VARIABILI (PUNTO CORRETTO) ---
     // 1. Data Corrente: Assicura che sia un'istanza di Date, altrimenti usa new Date().
     const effectiveCurrentDate = propCurrentDate instanceof Date ? propCurrentDate : new Date();

     // 2. Valori derivati: Usano le props se esistono, altrimenti usano la effectiveCurrentDate
     const effectiveYear = propYear ?? effectiveCurrentDate.getFullYear();
     const effectiveMonthName = propMonthName ?? effectiveCurrentDate.toLocaleString('it-IT', { month: 'long' });
     const effectiveCalendarDays = propCalendarDays || []; // Array di giorni

     // 3. Handlers (con fallback)
     const defaultHandlePrevMonth = useCallback(() => console.warn("handlePrevMonth non fornito"), []);
     const defaultHandleNextMonth = useCallback(() => console.warn("handleNextMonth non fornito"), []);
     const effectiveHandlePrevMonth = typeof propHandlePrevMonth === 'function' ? propHandlePrevMonth : defaultHandlePrevMonth;
     const effectiveHandleNextMonth = typeof propHandleNextMonth === 'function' ? propHandleNextMonth : defaultHandleNextMonth;
     // --- FINE DEFINIZIONI VARIABILI ---


     // Stati locali UI
     const [showModal, setShowModal] = useState(false);
     const [selectedDate, setSelectedDate] = useState(null);
     const [editingEvent, setEditingEvent] = useState(null);
     const [viewingEvent, setViewingEvent] = useState(null);
     const [viewingScadenza, setViewingScadenza] = useState(null);
     const [showDocEditModal, setShowDocEditModal] = useState(false);
     const [editingDoc, setEditingDoc] = useState(null);
     const [selectedUserId, setSelectedUserId] = useState('all');

     const canSelectUser = ['proprietario', 'titolare-azienda', 'amministrazione', 'tecnico'].includes(userRole);

     // useEffect per selectedUserId
     useEffect(() => {
         if (user && !canSelectUser) {
             setSelectedUserId(user.uid || user.id);
         } else if (canSelectUser && selectedUserId !== 'scadenziario') {
             setSelectedUserId('all');
         }
     }, [user, canSelectUser]);

     const today = new Date();

     // useMemo per filteredEvents
     const filteredEvents = useMemo(() => {
         if (loadingData || !user) return [];
         let eventsToDisplay = [];
         if (selectedUserId === 'scadenziario') {
             eventsToDisplay = (documenti || []).filter(doc => doc.dataScadenza).map(doc => ({
                 id: `doc-${doc.id}`,
                 title: `Scadenza: ${doc.nomeFile}`,
                 start: doc.dataScadenza,
                 stato: 'scadenza',
                 fileURL: doc.fileURL,
                 rawData: doc
             }));
         } else {
             eventsToDisplay = (eventi || []).filter(event => {
                 const currentUserId = user?.uid || user?.id;
                 const partecipanti = event?.partecipanti || [];
                 if (!canSelectUser) return partecipanti.some(p => p?.userId === currentUserId);
                 if (selectedUserId === 'all') return true;
                 return partecipanti.some(p => p?.userId === selectedUserId);
             });
         }
         return eventsToDisplay;
     }, [eventi, documenti, selectedUserId, canSelectUser, user, loadingData]);


     // --- Gestori Eventi (Wrapper) ---
     const handleDayClick = useCallback((day) => {
         setSelectedDate(day);
         setEditingEvent(null);
         setShowModal(true);
     }, []);

     const handleEventClick = useCallback((event) => {
         if (event.stato === 'scadenza') {
             setViewingScadenza(event);
         } else {
             setViewingEvent(event);
         }
     }, []);

     const handleOpenModal = useCallback(() => {
         setSelectedDate(null);
         setEditingEvent(null);
         setShowModal(true);
     }, []);

     const handleCloseModal = useCallback(() => {
         setShowModal(false);
         setSelectedDate(null);
         setEditingEvent(null);
         setViewingEvent(null);
         setViewingScadenza(null);
         setShowDocEditModal(false);
         setEditingDoc(null);
     }, []);

     const handleEditFromDetails = useCallback((event) => {
         setViewingEvent(null);
         setEditingEvent(event);
         setShowModal(true);
     }, []);

     const handleEditFromScadenza = useCallback((scadenza) => {
         const docToEdit = scadenza.rawData || documenti?.find(doc => `doc-${doc.id}` === scadenza.id);
         if (docToEdit) {
             setViewingScadenza(null);
             setEditingDoc(docToEdit);
             setShowDocEditModal(true);
         } else {
             console.error("Documento non trovato per la modifica da scadenza:", scadenza.id);
         }
     }, [documenti]);

    // ✅ CORREZIONE: Accettiamo esplicitamente ENTRAMBI gli argomenti e usiamo eventData.
     const handleConfirmWrapper = useCallback((eventId, eventData) => { 
         
         // Non usiamo più viewingEvent dall'ambito chiuso
         if (typeof onConfirmEvent === 'function') {
             
             // Passiamo l'oggetto Evento completo e aggiornato ricevuto dal modale
             onConfirmEvent(eventId, eventData);
             
         } else {
             console.error("[AgendaContent] Impossibile confermare: handler mancante.");
             alert("Errore: Impossibile trovare l'handler per la conferma.");
         }
     // ✅ Dipendenza solo da onConfirmEvent (la funzione del Manager)
     }, [onConfirmEvent]);

     const handleRejectWrapper = useCallback((eventId) => {
         if (viewingEvent?.id === eventId && typeof onRejectEvent === 'function') {
             onRejectEvent(eventId, viewingEvent);
         } else {
             console.error("[AgendaContent] Impossibile rifiutare: evento non trovato o handler mancante.", eventId, viewingEvent);
             alert("Errore: Impossibile trovare i dati dell'evento per il rifiuto.");
         }
     }, [viewingEvent, onRejectEvent]);

     // useEffect per reset 'editing'
     useEffect(() => {
         if (!showModal && !showDocEditModal) {
             setEditingEvent(null);
             setSelectedDate(null);
             setEditingDoc(null);
         }
     }, [showModal, showDocEditModal]);


     return (
         <div className="flex-1 w-full flex flex-col bg-white rounded-lg shadow-md p-6 md:p-8">
             {/* Header */}
             <div className="flex justify-between items-center mb-6">
                 <div>
                     <h1 className="text-3xl font-bold text-gray-800 capitalize">{`${effectiveMonthName} ${effectiveYear}`}</h1>
                     {canSelectUser && (
                         <div className="mt-4 max-w-xs">
                             <UserSelector
                                 users={users}
                                 selectedUserId={selectedUserId}
                                 onChange={setSelectedUserId}
                                 showScadenziarioOption={true}
                             />
                         </div>
                     )}
                 </div>
                 <div className="flex items-center gap-2 self-start">
                     <button onClick={effectiveHandlePrevMonth} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeftIcon className="h-6 w-6 text-gray-600" /></button>
                     <button onClick={effectiveHandleNextMonth} className="p-2 rounded-full hover:bg-gray-200"><ChevronRightIcon className="h-6 w-6 text-gray-600" /></button>
                     <button onClick={handleOpenModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700">Aggiungi Evento</button>
                 </div>
             </div>

             {/* Calendario */}
             {loadingData ? (
                 <div className="text-center text-gray-500 py-10 flex-1">Caricamento agenda...</div>
             ) : (
                 <Calendar
                     // Usa i valori effettivi garantiti
                     currentMonth={new Date(effectiveYear, effectiveCurrentDate.getMonth())}
                     days={effectiveCalendarDays}
                     events={filteredEvents}
                     onDayClick={handleDayClick}
                     onEventClick={handleEventClick}
                     today={today}
                     className="h-full"
                 />
             )}

             {/* Modal Aggiungi/Modifica Evento */}
             {showModal && (
                 <AggiungiEventoForm
                     key={editingEvent ? editingEvent.id : 'new'}
                     onClose={handleCloseModal}
                     // --- ✅ CORREZIONE QUI ---
                     // Passiamo la prop 'onSave' che viene da useAgendaManager (via props)
                     // AggiungiEventoForm ora usa questa unica funzione sia per creare che per modificare.
                     onSave={props.onSave} // Usa la prop onSave ricevuta da props
                     // --- FINE CORREZIONE ---
                     initialData={editingEvent}
                     selectedDate={selectedDate}
                     users={users}
                     user={user}
                     userRole={userRole}
                     isLoading={isLoading}
                     // ❌ RIMOSSA: 'onProposeChange' non serve più qui, la logica è in 'onSave'
                     // onProposeChange={onProposeChangeEvent}
                 />
             )}

             {/* Modal Dettagli Evento */}
             {viewingEvent && user && (
                 <DettagliEventoModal
                     event={viewingEvent}
                     currentUser={user}
                     users={users}
                     onClose={handleCloseModal}
                     onEdit={handleEditFromDetails}
                     onDelete={onDeleteEvent}
                     onConferma={handleConfirmWrapper}
                     onRifiuta={handleRejectWrapper}
                     isLoading={isLoading}
                     onCompileForm={onCompileForm}
                     
                     // --- ✅ PASSAGGIO NUOVE PROPS PER GESTIRE LE PROPOSTE ---
                     onAccettaModifica={onAcceptChangeEvent}
                     onRifiutaModifica={onRejectChangeEvent}
                 />
             )}

             {/* Modal Modifica Documento */}
             {showDocEditModal && (
                 <AggiungiDocumentoForm
                     initialData={editingDoc}
                     onClose={handleCloseModal}
                 />
             )}

             {/* Modal Dettagli Scadenza */}
             {viewingScadenza && (
                 <DettagliScadenzaModal
                     scadenza={viewingScadenza}
                     onClose={handleCloseModal}
                     onEdit={handleEditFromScadenza}
                 />
             )}
         </div>
     );
};