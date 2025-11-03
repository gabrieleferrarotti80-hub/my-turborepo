// packages/shared-core/hooks/useAgendaManager.jsx

import { useMemo, useState, useCallback } from 'react'; 
import { useAgendaAction } from './useAgendaAction.jsx';
import { useOfferteManager } from './useOfferteManager.jsx'; 

export const useAgendaManager = (data) => {
    
    // --- Controlli preliminari e clausola di salvaguardia (INVARIATI) ---
    const user = data?.user;
    const loadingData = data?.loadingData;

    if (!data || !user || loadingData) {
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
            // ✅ CORRETTO: Aggiunta la funzione onSave mancante al dummy object
            onSave: async () => ({ success: false, message: "Dati non caricati" }),
            deleteEvento: async () => ({ success: false, message: "Dati non caricati" }),
            confirmEvento: async () => ({ success: false, message: "Dati non caricati" }),
            rejectEvento: async () => ({ success: false, message: "Dati non caricati" }),
            creaNotaApprovazione: async () => ({ success: false, message: "Dati non caricati" }),
            creaNotaInvioMail: async () => ({ success: false, message: "Dati non caricati" }), 
        };
    }

    // --- Estrazione dati e init Hook (INVARIATI) ---
    const { eventi, documenti, users, userRole, db, userAziendaId } = data;
    const agendaAction = useAgendaAction(db, userAziendaId, user);
    const offerteManager = useOfferteManager(db, user, userAziendaId); 

    // --- Stato UI (useState) (INVARIATO) ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedUserId, setSelectedUserId] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    
    const canSelectUser = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);

    // --- Dati Derivati (useMemo) (INVARIATI) ---
    console.log("%c[MGR-DEBUG] Check 1: Inizio calcolo useMemo. Date is:", "color: magenta", currentDate);
    const filteredEvents = useMemo(() => { 
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

    // --- Handlers UI (useCallback) (INVARIATI) ---
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
    
    // --- Handler Conferma (INVARIATO) ---
    const handleConfirmEvent = useCallback(async (eventId, eventData) => { 
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

    // --- Handler Rifiuto (INVARIATO) ---
    const handleRejectEvent = useCallback(async (eventId) => {
        const result = await agendaAction.rifiutaEvento(eventId);
        if (result.success) {
            handleCloseModal(); 
        }
        return result;
    }, [agendaAction, handleCloseModal]); 

    
    // --- ✅ NUOVA FUNZIONE onSave UNIFICATA ---
    // Questa funzione riceve (data) per la creazione O (id, data) per la modifica,
    // proprio come si aspetta AggiungiEventoForm.jsx
    const handleSave = useCallback(async (idOrData, data) => {
        let result;
        if (typeof idOrData === 'string') {
            // --- MODIFICA ---
            // Chiama la funzione 'updateEvento' "intelligente" di agendaAction
            // che ora gestisce da sola la logica di negoziazione.
            const eventId = idOrData;
            const eventData = data;
            result = await agendaAction.updateEvento(eventId, eventData);
        } else {
            // --- CREAZIONE ---
            const eventData = idOrData;
            result = await agendaAction.addEvento(eventData);
        }
        
        // Chiude il modale solo se l'operazione ha successo
        if (result.success) {
            handleCloseModal();
        }
        // Ritorna il risultato (success: true/false) al form
        return result;

    }, [agendaAction, handleCloseModal]); // Dipende da agendaAction e handleCloseModal
    

    // --- ❌ RIMOSSE VECCHIE FUNZIONI DI NEGOZIAZIONE ---
    // handleProposeChange, handleAcceptChange, e handleRejectChange 
    // sono state rimosse. La loro logica è ora in updateEvento.


    // --- Oggetto Return ---
    console.log("%c[MGR-DEBUG] Check 2: Valori esportati. Year:", "color: magenta", currentDate.getFullYear());
    return {
        // --- Dati (INVARIATI) ---
        events: eventi, documents: documenti, user: user, users: users, userRole: userRole,
        loadingData: loadingData,
        isLoading: agendaAction.isLoading || offerteManager.isSaving,

        // --- Stato Calendario (INVARIATO) ---
        monthName: currentDate.toLocaleString('it-IT', { month: 'long' }), 
        year: currentDate.getFullYear(), 
        calendarDays: daysInMonth, 
        handleNextMonth: handleNextMonth,
        handlePrevMonth: handlePrevMonth,
        currentDate: currentDate, 
        
        // --- Eventi filtrati (INVARIATO) ---
        filteredEvents: filteredEvents, 

        // --- ✅ AZIONI CRUD AGGIORNATE ---
        onSave: handleSave, // Unica funzione di salvataggio per il Form
        onDeleteEvent: agendaAction.deleteEvento,
        onConfirmEvent: handleConfirmEvent, 
        onRejectEvent: handleRejectEvent, 
        creaNotaApprovazione: agendaAction.creaNotaApprovazione,
        creaNotaInvioMail: agendaAction.creaNotaInvioMail, 

        // --- ❌ RIMOSSE AZIONI DI NEGOZIAZIONE OBSOLETE ---
        // onProposeChangeEvent, onAcceptChangeEvent, onRejectChangeEvent

        // --- Stato UI (INVARIATO) ---
        canSelectUser: canSelectUser, selectedUserId: selectedUserId, setSelectedUserId: setSelectedUserId,
        onDayClick: handleDayClick, onEventClick: handleEventClick, onEditEvent: handleEditEvent, 
        onCloseModal: handleCloseModal, isAddModalOpen: isAddModalOpen, viewingEvent: viewingEvent,
        editingEvent: editingEvent, selectedDate: selectedDate,
    };
};