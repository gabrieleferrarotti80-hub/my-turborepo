// packages/shared-ui/components/Checklist.jsx

import React from 'react';

/**
 * Un componente "stupido" per renderizzare una lista di task con checkbox.
 * @param {Array} items - Un array di oggetti, es. [{ id: '1', label: 'Task 1', completed: false }]
 * @param {Function} onToggleItem - La funzione da chiamare quando una checkbox cambia stato, passando l'ID dell'item.
 */
export const Checklist = ({ items = [], onToggleItem }) => {
    
    if (!items || items.length === 0) {
        return <p>Nessun elemento nella checklist.</p>;
    }

    return (
        <div className="checklist-container">
            {items.map((item) => (
                <div key={item.id} className="checklist-item">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={!!item.completed} 
                            onChange={() => onToggleItem(item.id)}
                            className="checklist-checkbox"
                        />
                        <span className="checklist-label">{item.label}</span>
                    </label>
                </div>
            ))}
        </div>
    );
};

// Potresti aggiungere qui sotto degli stili base se non usi un file CSS separato.
/*
<style jsx>{`
    .checklist-container {
        // stili per il contenitore
    }
    .checklist-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
    }
    .checklist-label {
        margin-left: 8px;
    }
`}</style>
*/