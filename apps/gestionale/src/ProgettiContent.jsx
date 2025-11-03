// src/ProjectsContent..jsx

import React from 'react';

// Componente di placeholder per la vista Progetti
export const ProgettiContent = ({ user, userRole, db, userAziendaId }) => {
    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Gestione Progetti</h1>
            <p className="text-gray-600">
                Questa è la pagina di gestione dei progetti. Al momento non ci sono funzionalità implementate.
                <br />
                Puoi aggiungere qui la logica per visualizzare, creare e gestire i progetti.
            </p>
            {/* Esempio di come potresti visualizzare i dati in futuro: */}
            {/*
            <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">I miei Progetti</h2>
                <ul>
                    <li className="p-4 bg-gray-100 rounded-lg mb-2">Progetto A - Stato: Attivo</li>
                    <li className="p-4 bg-gray-100 rounded-lg mb-2">Progetto B - Stato: In Sospeso</li>
                </ul>
            </div>
            */}
        </div>
    );
};


