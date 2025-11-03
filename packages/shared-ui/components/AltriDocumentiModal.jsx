// packages/shared-ui/components/AltriDocumentiModal.jsx

import React, { useState, useEffect } from 'react';

export const AltriDocumentiModal = ({ isOpen, onClose, initialDocs = [], onSave }) => {
    // Initialize state with 10 empty strings
    const [documenti, setDocumenti] = useState(Array(10).fill(''));

    // When the modal opens, populate it with existing values
    useEffect(() => {
        if (isOpen) {
            const initialValues = Array(10).fill('');
            initialDocs.forEach((doc, index) => {
                if (index < 10) {
                    initialValues[index] = doc;
                }
            });
            setDocumenti(initialValues);
        }
    }, [isOpen, initialDocs]);

    if (!isOpen) return null;

    const handleInputChange = (index, value) => {
        const newDocumenti = [...documenti];
        newDocumenti[index] = value;
        setDocumenti(newDocumenti);
    };

    const handleSave = () => {
        // Save only the non-empty strings
        onSave(documenti.filter(doc => doc.trim() !== ''));
        onClose();
    };

    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const modalContentStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '500px', maxWidth: '90%' };

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Specifica Altri Documenti (max 10)</h2>
                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                    {documenti.map((doc, index) => (
                        <input
                            key={index}
                            type="text"
                            placeholder={`Documento opzionale ${index + 1}`}
                            value={doc}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            className="w-full p-2 border rounded mt-2 text-sm"
                        />
                    ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold">Annulla</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Salva Documenti</button>
                </div>
            </div>
        </div>
    );
};