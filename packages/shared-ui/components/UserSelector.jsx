// packages/shared-ui/components/UserSelector.jsx (o il percorso corretto)

import React from 'react';

export const UserSelector = ({ users = [], selectedUserId, onChange, showScadenziarioOption = false }) => {
    return (
        <div>
            <label htmlFor="user-selector" className="block text-sm font-medium text-gray-700">
                {showScadenziarioOption ? 'Seleziona:' : "Inserisci nell'agenda di:"}
            </label>
            <select
                id="user-selector"
                name="user-selector"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedUserId} // Questo riceve e mostra l'ID del documento
                onChange={(e) => onChange(e.target.value)} // Questo invia l'ID del documento selezionato
            >
                {showScadenziarioOption && <option value="all">Tutti gli utenti</option>}
                {showScadenziarioOption && <option value="scadenziario">--- Scadenziario Documenti ---</option>}

                {/* ✅ CORREZIONE APPLICATA QUI */}
                {users.map(user => (
                    // Usiamo user.id (l'ID del documento Firestore) come 'key' e 'value'
                    <option key={user.id} value={user.id}> 
                        {user.nome} {user.cognome}
                    </option>
                ))}
            </select>
        </div>
    );
};