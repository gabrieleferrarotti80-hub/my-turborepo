// File: apps/app-esterna/src/views/AgendaContainer.jsx (CORRETTO e COMPLETO)



import React, { useState, useMemo } from 'react';



// 1. Importa Logica, Dati centralizzati E L'HOOK DI VISUALIZZAZIONE

import {

    useFirebaseData,

    useAgendaManager,

    useAgendaViewController // <-- HOOK AGGIUNTO PER IL CONTROLLO DELLA VISTA

} from 'shared-core';



// 2. Importa la Vista Presenter Semplificata

import { AgendaView } from 'shared-ui';



export const AgendaContainer = () => {

   

    // --- Hook per la Logica di Visualizzazione ---

    // Estrae i dati relativi al calendario (mese, anno, navigazione, giorni)

    const {

        monthName,

        year,

        calendarDays, // <-- VARIABILE AGGIUNTA QUI

        handleNextMonth,

        handlePrevMonth

    } = useAgendaViewController();



    // --- Logica e Dati da shared-core (Mantienuto) ---

    const firebaseData = useFirebaseData();

    const {

        addEvento,

        updateEvento,

        deleteEvento,

        isLoading,

        error

    } = useAgendaManager(firebaseData.db, firebaseData.user, firebaseData.userAziendaId);



    // --- Stato Locale UI (Mantienuto) ---

    const [showModal, setShowModal] = useState(false);

    const [selectedDate, setSelectedDate] = useState(null);

    const [editingEvent, setEditingEvent] = useState(null);

    const [viewingEvent, setViewingEvent] = useState(null);

    const [viewingScadenza, setViewingScadenza] = useState(null);



    // --- Gestori dello Stato UI (Mantienuto) ---

    const handleCloseModal = () => {

        setShowModal(false);

        setEditingEvent(null);

        setViewingEvent(null);

        setViewingScadenza(null);

    };



    const handleDayClick = (day) => {

        setSelectedDate(day);

        setEditingEvent(null);

        setShowModal(true);

    };



    const handleEventClick = (event) => {

        if (event.stato === 'scadenza') {

            setViewingScadenza(event);

        } else {

            setViewingEvent(event);

        }

    };



    const handleOpenAddModal = () => {

        setSelectedDate(null);

        setEditingEvent(null);

        setShowModal(true);

    };



    const handleEditFromDetails = (event) => {

        setViewingEvent(null);

        setEditingEvent(event);

        setShowModal(true);

    };

   

    // --- Preparazione dei Dati (Mantienuto) ---

    const { events, scadenze, user, users } = firebaseData; // Estrazione di 'users' se serve



    // --- Render (CORREZIONE E AGGIUNTA PROPS) ---

    return (

        <AgendaView

            // Dati dal Controller Hook (RISOLVE L'ERRORE)

            monthName={monthName}

            year={year}

            days={calendarDays} // <-- Usa la variabile ESTRATTA e la rinomina in 'days' per il Presenter

            handleNextMonth={handleNextMonth}

            handlePrevMonth={handlePrevMonth}



            // Dati dal Context

            events={events}

            scadenze={scadenze}

            currentUser={user}

            users={users} // Passa l'elenco utenti per il selettore

           

            // Logica Transazionale dal Manager Core

            onAddEvent={addEvento}

            onUpdateEvent={updateEvento}

            onDeleteEvent={deleteEvento}

            isLoading={isLoading}

            error={error}

           

            // Stato Locale UI

            showModal={showModal}

            selectedDate={selectedDate}

            editingEvent={editingEvent}

            viewingEvent={viewingEvent}

            viewingScadenza={viewingScadenza}



            // Funzioni di Gestione UI

            handleCloseModal={handleCloseModal}

            handleDayClick={handleDayClick}

            handleEventClick={handleEventClick}

            handleOpenAddModal={handleOpenAddModal}

            handleEditFromDetails={handleEditFromDetails}

           

            // Proprie della Vista (Aggiungi le altre prop se necessarie)

            // userRole={userData?.role}

        />

    );

};