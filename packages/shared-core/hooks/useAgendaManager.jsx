// packages/shared-core/hooks/useAgendaManager.jsx

import { useMemo, useState, useCallback } from 'react'; 
import { useAgendaAction } from './useAgendaAction.jsx';
import { useOfferteManager } from './useOfferteManager.jsx'; 

export const useAgendaManager = (data) => {
    const user = data?.user;
    const loadingData = data?.loadingData;

    if (!data || !user || loadingData) {
        return {
            loading: true, currentDate: new Date(), monthName: '', year: '', days: [],
            filteredEvents: [], users: [], userRole: '', canSelectUser: false,
            selectedUserId: '', isAddModalOpen: false, viewingEvent: null,
            editingEvent: null, selectedDate: null,
            onDayClick: () => {}, onEventClick: () => {}, onEditEvent: () => {},
            onCloseModal: () => {}, setSelectedUserId: () => {}, handlePrevMonth: () => {},
            handleNextMonth: () => {}, onSave: async () => ({ success: false, message: "Dati non caricati" }),
            deleteEvento: async () => ({ success: false, message: "Dati non caricati" }),
            confirmEvento: async () => ({ success: false, message: "Dati non caricati" }),
            rejectEvento: async () => ({ success: false, message: "Dati non caricati" }),
            creaNotaApprovazione: async () => ({ success: false, message: "Dati non caricati" }),
            creaNotaInvioMail: async () => ({ success: false, message: "Dati non caricati" }), 
        };
    }

    // Estraggo ANCHE storage dai dati per passarlo a useOfferteManager
    const { eventi, documenti, users, userRole, db, userAziendaId, storage } = data;
    
    console.log("🚨🚨🚨 [DEBUG useAgendaManager] START 🚨🚨🚨");
    console.log("👉 db ricevuto in useAgendaManager:", db ? "✅ PRESENTE" : "❌ UNDEFINED");
    console.log("👉 storage ricevuto in useAgendaManager:", storage ? "✅ PRESENTE" : "❌ UNDEFINED");

    const agendaAction = useAgendaAction(db, userAziendaId, user);
    // Passo i 4 parametri nell'ordine esatto richiesto dall'hook
    const offerteManager = useOfferteManager(db, storage, user, userAziendaId); 

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedUserId, setSelectedUserId] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    
    const canSelectUser = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);

    const filteredEvents = useMemo(() => { 
        const currentUserId = user?.uid || user?.id;
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
        
        let eventsToDisplay = [];
        if (selectedUserId === 'scadenziario') {
            eventsToDisplay = (documenti || []).filter(doc => doc.dataScadenza).map(doc => ({
                    id: `doc-${doc.id}`, title: `Scadenza: ${doc.nomeFile}`, start: doc.dataScadenza,
                    stato: 'scadenza', fileURL: doc.fileURL,
                }));
        } 
        else {
            eventsToDisplay = (eventi || []).filter(event => {
                const isForCurrentUser = 
                    (event.partecipanti?.some(p => p.userId === currentUserId)) ||
                    (event.assegnatoA === currentUserId) || 
                    (event.userId === currentUserId);
                
                if (!canSelectUser) return isForCurrentUser;
                if (selectedUserId === 'all') return true;
                
                return (event.partecipanti?.some(p => p.userId === selectedUserId)) || 
                       (event.assegnatoA === selectedUserId) || 
                       (event.userId === selectedUserId);
            });
        }

        return eventsToDisplay.map(event => {
            const rawStart = event.start || event.data;
            const rawEnd = event.end || event.dataFine;
            const startDate = rawStart?.toDate ? rawStart.toDate() : (rawStart ? new Date(rawStart) : new Date());
            const endDate = rawEnd?.toDate ? rawEnd.toDate() : (rawEnd ? new Date(rawEnd) : new Date(startDate.getTime() + 60*60*1000));
            
            let assegnatarioId = event.assegnatoA;
            if (!assegnatarioId && event.partecipanti) {
                 const tech = event.partecipanti.find(p => p.ruolo !== 'organizzatore');
                 if (tech) assegnatarioId = tech.userId;
            }
            if (!assegnatarioId) assegnatarioId = event.userId; 

            const creatoreId = event.createdBy || event.partecipanti?.find(p => p.ruolo === 'organizzatore')?.userId || event.userId;
            const isMyTask = currentUserId === assegnatarioId;
            const isOthersTask = assegnatarioId && currentUserId !== assegnatarioId;
            
            let statoReale = event.stato;
            if (!statoReale) {
                statoReale = (creatoreId && assegnatarioId && creatoreId !== assegnatarioId) ? 'da_confermare' : 'confermato';
            }
            
            let bgColor = '#3b82f6'; 
            let textColor = '#ffffff';
            let titlePrefix = '';

            if (statoReale === 'confermato') {
                if (isOthersTask) { bgColor = '#4f46e5'; titlePrefix = '✓ [Delegato] '; } 
                else if (isMyTask) { bgColor = '#059669'; } 
                else { bgColor = '#10b981'; }
            } 
            else if (statoReale === 'da_confermare') {
                if (isMyTask) { bgColor = '#f59e0b'; titlePrefix = '⚠️ [Da Confermare] '; } 
                else { bgColor = '#cbd5e1'; textColor = '#334155'; titlePrefix = '⏳ [Inviato] '; }
            } 
            else if (statoReale === 'modifica_proposta') {
                const lastAction = event.storico?.length > 0 ? event.storico[event.storico.length - 1] : null;
                const lastActorId = lastAction ? lastAction.da : creatoreId;
                
                if (lastActorId === currentUserId) { bgColor = '#cbd5e1'; textColor = '#334155'; titlePrefix = '⏳ [Proposta inviata] '; } 
                else { bgColor = '#f59e0b'; titlePrefix = '⚠️ [Modifica Ricevuta] '; }
            }
            else if (statoReale === 'rifiutato') {
                bgColor = '#ef4444'; titlePrefix = '❌ [Annullato] ';
            }

            return {
                ...event,
                title: titlePrefix + (event.title || event.titolo || 'Senza Titolo'),
                start: startDate,
                end: endDate,
                color: bgColor,
                backgroundColor: bgColor,
                borderColor: bgColor,
                textColor: textColor,
                style: { backgroundColor: bgColor, color: textColor, borderColor: bgColor } 
            };
        }).filter(event => {
            return event.start >= startOfMonth && event.start <= endOfMonth;
        });
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

    const handleDayClick = useCallback((day) => { setEditingEvent(null); setSelectedDate(day); setIsAddModalOpen(true); }, []);
    const handleEventClick = useCallback((event) => { setViewingEvent(event); }, []);
    const handleEditEvent = useCallback((event) => { setViewingEvent(null); setEditingEvent(event); setIsAddModalOpen(true); }, []);
    const handleCloseModal = useCallback(() => { setIsAddModalOpen(false); setViewingEvent(null); setEditingEvent(null); setSelectedDate(null); }, []); 

    const handlePrevMonth = useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)), [currentDate]); 
    const handleNextMonth = useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)), [currentDate]); 
    
    const handleConfirmEvent = useCallback(async (eventId, eventData) => { 
        const confirmResult = await agendaAction.confermaEvento(eventId); 
        if (confirmResult.success && eventData?.tipo === 'nota_invio_email' && eventData?.offertaId) {
            try {
                if (!offerteManager || typeof offerteManager.confermaInvioEmail !== 'function' || !user?.uid) throw new Error("OfferteManager o user non disponibili");
                await offerteManager.confermaInvioEmail(eventData.offertaId, user.uid);
            } catch(offerError) { alert(`Nota confermata, ma errore nell'aggiornamento dell'offerta: ${offerError.message}`); }
        } else if (!confirmResult.success) {
            alert(`Errore durante la conferma della nota: ${confirmResult.message}`);
            return confirmResult; 
        }
        if (confirmResult.success) handleCloseModal(); 
        return confirmResult; 
    }, [agendaAction, offerteManager, user, handleCloseModal]); 

    const handleRejectEvent = useCallback(async (eventId) => {
        const result = await agendaAction.rifiutaEvento(eventId);
        if (result.success) handleCloseModal(); 
        return result;
    }, [agendaAction, handleCloseModal]); 

    const handleSave = useCallback(async (idOrData, data) => {
        let result;
        if (typeof idOrData === 'string') result = await agendaAction.updateEvento(idOrData, data);
        else result = await agendaAction.addEvento(idOrData);
        if (result.success) handleCloseModal();
        return result;
    }, [agendaAction, handleCloseModal]); 

    return {
        events: eventi, documents: documenti, user: user, users: users, userRole: userRole,
        loadingData: loadingData, isLoading: agendaAction.isLoading || offerteManager.isSaving,
        monthName: currentDate.toLocaleString('it-IT', { month: 'long' }), 
        year: currentDate.getFullYear(), calendarDays: daysInMonth, 
        handleNextMonth: handleNextMonth, handlePrevMonth: handlePrevMonth, currentDate: currentDate, 
        filteredEvents: filteredEvents, 
        onSave: handleSave, onDeleteEvent: agendaAction.deleteEvento,
        onConfirmEvent: handleConfirmEvent, onRejectEvent: handleRejectEvent, 
        creaNotaApprovazione: agendaAction.creaNotaApprovazione, creaNotaInvioMail: agendaAction.creaNotaInvioMail, 
        canSelectUser: canSelectUser, selectedUserId: selectedUserId, setSelectedUserId: setSelectedUserId,
        onDayClick: handleDayClick, onEventClick: handleEventClick, onEditEvent: handleEditEvent, 
        onCloseModal: handleCloseModal, isAddModalOpen: isAddModalOpen, viewingEvent: viewingEvent,
        editingEvent: editingEvent, selectedDate: selectedDate,
    };
};