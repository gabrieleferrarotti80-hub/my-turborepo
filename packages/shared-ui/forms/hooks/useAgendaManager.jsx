// File: packages/shared-core/hooks/useAgendaManager.jsx

import { useMemo, useState, useCallback } from 'react'; 
import { useAgendaAction } from './useAgendaAction.jsx';
import { useOfferteManager } from './useOfferteManager.jsx'; 

export const useAgendaManager = (data) => {
    // --- Clausola di salvaguardia ---
    if (!data) {
        return {
            loading: true,
            currentDate: new Date(),
            monthName: '',
            year: '',
            days: [],
            filteredEvents: [],
            users: [],
            userRole: '',
            canSelectUser: false,
            selectedUserId: '',
            isAddModalOpen: false,
            viewingEvent: null,
            editingEvent: null,
            selectedDate: null,
            onDayClick: () => {},
            onEventClick: () => {},
            onEditEvent: () => {},
            onCloseModal: () => {},
            setSelectedUserId: () => {},
            handlePrevMonth: () => {},
            handleNextMonth: () => {},
            addEvento: async () => ({ success: false, message: "Dati non caricati" }), 
            updateEvento: async () => ({ success: false, message: "Dati non caricati" }),
            deleteEvento: async () => ({ success: false, message: "Dati non caricati" }),
            confirmEvento: async () => ({ success: false, message: "Dati non caricati" }),
            rejectEvento: async () => ({ success: false, message: "Dati non caricati" }),
            proponiModifica: async () => ({ success: false, message: "Dati non caricati" }),
            creaNotaApprovazione: async () => ({ success: false, message: "Dati non caricati" }),
            creaNotaInvioMail: async () => ({ success: false, message: "Dati non caricati" }), 
        };
    }

    // --- Estrazione dati ---
    const { eventi, documenti, user, users, userRole, loadingData, db, userAziendaId } = data;
    
    // --- Action Hook & Manager Inizializzazione ---
    const agendaAction = useAgendaAction(db, userAziendaId, user);
    const offerteManager = useOfferteManager(db, user, userAziendaId); 

    // ✅ LOG 1 RIMOSSO: Il log qui generava il ReferenceError
    // console.log("[useAgendaManager] STATO: currentDate letto all'inizio:", currentDate); 
    
    // --- 1. STATO UI (useState) ---
    const [currentDate, setCurrentDate] = useState(new Date()); // LINEA DI DEFINIZIONE
    const [selectedUserId, setSelectedUserId] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    
    const canSelectUser = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);

    // --- 2. DATI DERIVATI (useMemo) - DEVONO VENIRE DOPO useState ---
    const filteredEvents = useMemo(() => { 
        // Logica che usa currentDate
        // ... (logica invariata)
        const currentUserId = user?.uid || user?.id;
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        let eventsToDisplay = [];

        if (selectedUserId === 'scadenziario') {
            eventsToDisplay = (documenti || [])
                .filter(doc => doc.dataScadenza)
                .map(doc => ({
                    id: `doc-${doc.id}`,
                    title: `Scadenza: ${doc.nomeFile}`,
                    start: doc.dataScadenza,
                    stato: 'scadenza',
                    fileURL: doc.fileURL,
                }));
        } 
        else {
            eventsToDisplay = (eventi || []).filter(event => {
                const isForCurrentUser = event.partecipanti?.some(p => p.userId === currentUserId);
                
                if (!canSelectUser) return isForCurrentUser;
                if (selectedUserId === 'all') return true;
                return event.partecipanti?.some(p => p.userId === selectedUserId);
            });
        }
        
        const eventiFiltratiFinali = eventsToDisplay.filter(event => {
            if (!event || !event.start) return false;
            const eventDate = event.start;
            return eventDate >= startOfMonth && eventDate <= endOfMonth;
        });
        
        return eventiFiltratiFinali;
    }, [eventi, documenti, currentDate, selectedUserId, canSelectUser, user, loadingData]);

    const daysInMonth = useMemo(() => { 
        // Logica che usa currentDate
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysArray = [];
        const paddingDays = (firstDayOfMonth.getDay() === 0) ? 6 : firstDayOfMonth.getDay() - 1;
        for (let i = 0; i < paddingDays; i++) { daysArray.push(null); }
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) { daysArray.push(new Date(year, month, i)); }
        return daysArray;
    }, [currentDate]);

    // --- 3. Handlers UI (useCallback) ---
    const handleDayClick = useCallback((day) => { 
        setEditingEvent(null);
        setSelectedDate(day);
        setIsAddModalOpen(true);
    }, []);

    const handleEventClick = useCallback((event) => { 
        setViewingEvent(event);
    }, []);

    const handleEditEvent = useCallback((event) => { 
        setViewingEvent(null);
        setEditingEvent(event);
        setIsAddModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => { 
        setIsAddModalOpen(false);
        setViewingEvent(null);
        setEditingEvent(null);
        setSelectedDate(null);
    }, []); 

    const handlePrevMonth = useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)), [currentDate]); 
    const handleNextMonth = useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)), [currentDate]); 
    
    // --- Handler Conferma Aggiornato (invariato) ---
    const handleConfirmEvent = useCallback(async (eventId, eventData) => { 
        // ... (logica invariata) ...
        const confirmResult = await agendaAction.confermaEvento(eventId); 

        if (confirmResult.success && eventData?.tipo === 'nota_invio_email' && eventData?.offertaId) {
            try {
                if (!offerteManager || typeof offerteManager.confermaInvioEmail !== 'function' || !user?.uid) {
                    throw new Error("OfferteManager o user non disponibili per confermare invio email.");
                }
                await offerteManager.confermaInvioEmail(eventData.offertaId, user.uid);
            } catch(offerError) {
                 alert(`Nota confermata, ma errore nell'aggiornamento dell'offerta: ${offerError.message}`);
            }
        } else if (!confirmResult.success) {
             alert(`Errore durante la conferma della nota: ${confirmResult.message}`);
             return confirmResult; 
        }

        if (confirmResult.success) {
            handleCloseModal(); 
        }
        return confirmResult; 
    }, [agendaAction, offerteManager, user, handleCloseModal]); 

    // --- Handler Rifiuto (invariato) ---
    const handleRejectEvent = useCallback(async (eventId) => {
        const result = await agendaAction.rifiutaEvento(eventId);
        if (result.success) {
            handleCloseModal(); 
        }
        return result;
    }, [agendaAction, handleCloseModal]); 

    // --- Oggetto Return ---
    // console.log("[useAgendaManager] RETURN: currentDate esportato:", currentDate); // LOG 2

    return {
        // --- Dati ---
        events: eventi, documents: documenti, user: user, users: users, userRole: userRole,
        loadingData: loadingData,
        isLoading: agendaAction.isLoading || offerteManager.isSaving,

        // --- Stato Calendario ---
       // --- STATO CALENDARIO AGGIORNATO ---
        // ✅ NON ESEGUIRE METODI DATE QUI, PASSA SOLO L'OGGETTO DATE e le array/funzioni
        monthName: currentDate.toLocaleString('it-IT', { month: 'long' }), // Se è qui l'errore, commenta e risolvi in AgendaContent
        year: currentDate.getFullYear(),                                   // Se è qui l'errore, commenta e risolvi in AgendaContent
        
        calendarDays: daysInMonth, 
        handleNextMonth: handleNextMonth,
        handlePrevMonth: handlePrevMonth,
        currentDate: currentDate, // <-- L'unica prop Date
        // --- Eventi filtrati ---
        filteredEvents: filteredEvents, 

        // --- Azioni CRUD ---
        onAddEvent: agendaAction.addEvento,
        onUpdateEvent: agendaAction.updateEvento,
        onDeleteEvent: agendaAction.deleteEvento,
        onConfirmEvent: handleConfirmEvent, 
        onRejectEvent: handleRejectEvent, 
        creaNotaApprovazione: agendaAction.creaNotaApprovazione,
        creaNotaInvioMail: agendaAction.creaNotaInvioMail, 

        // --- Stato UI ---
        canSelectUser: canSelectUser, selectedUserId: selectedUserId, setSelectedUserId: setSelectedUserId,
        onDayClick: handleDayClick, onEventClick: handleEventClick, onEditEvent: handleEditEvent, 
        onCloseModal: handleCloseModal, isAddModalOpen: isAddModalOpen, viewingEvent: viewingEvent,
        editingEvent: editingEvent, selectedDate: selectedDate,
    };
};