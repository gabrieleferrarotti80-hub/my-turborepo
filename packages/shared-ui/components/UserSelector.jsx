import React from 'react';

// ✅ Aggiunta la prop 'label' e reso il componente più flessibile
export const UserSelector = ({ 
    users = [], 
    selectedUserId, 
    onChange, 
    showScadenziarioOption = false,
    label // 👈 Nuova prop
}) => {
    return (
        <div>
            {/* ✅ Mostra la label passata, altrimenti usa il default o nascondila se label è null */}
            {label !== null && (
                <label htmlFor="user-selector" className="block text-sm font-medium text-gray-700">
                    {label !== undefined ? label : (showScadenziarioOption ? 'Seleziona:' : "Inserisci nell'agenda di:")}
                </label>
            )}
            
            <select
                id="user-selector"
                name="user-selector"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedUserId}
                onChange={(e) => onChange(e.target.value)}
            >
                {/* Opzione vuota iniziale (consigliata per la mappa) */}
                <option value="">Seleziona un operatore...</option>

                {showScadenziarioOption && <option value="all">Tutti gli utenti</option>}
                {showScadenziarioOption && <option value="scadenziario">--- Scadenziario Documenti ---</option>}

                {users.map(user => (
                    <option key={user.id} value={user.id}> 
                        {user.nome} {user.cognome}
                    </option>
                ))}
            </select>
        </div>
    );
};