// packages/shared-ui/components/DocumentiChecklist.jsx

import React from 'react';

export const DocumentiChecklist = ({ items, setItems }) => {
   // --- ✅ CORREZIONE QUI ---
    const handleToggle = (id) => {
        // 1. Crea la nuova lista basandoti sulla prop 'items' che hai già.
        const newItems = (items || []).map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        );
        // 2. Passa la nuova lista completa al genitore.
        setItems(newItems);
    };

    const validItems = Array.isArray(items) ? items : [];

   return (
        <div>
            <h4 className="font-semibold mb-2">Seleziona i documenti necessari</h4>
            {validItems.map(item => ( // <-- Usa la variabile sicura
                <div key={item.id} className="flex items-center mb-1">
                    <input
                        type="checkbox"
                        id={item.id}
                        checked={item.checked}
                        onChange={() => handleToggle(item.id)}
                        className="mr-2"
                    />
                    <label htmlFor={item.id}>{item.label}</label>
                </div>
            ))}
        </div>
    );
};