// packages/shared-ui/components/ReferenteModal.jsx

import React, { useState } from 'react';
import { AggiungiReferenteForm } from '../forms/AggiungiReferenteForm';

/**
 * Modale per selezionare un referente esistente o aggiungerne uno nuovo.
 * @param {boolean} isOpen - Controlla la visibilità del modale.
 * @param {Function} onClose - Funzione per chiudere il modale.
 * @param {Object} cliente - L'oggetto del cliente a cui appartengono i referenti.
 * @param {Function} onSelectReferente - Callback con l'ID del referente selezionato.
 * @param {Function} onAddReferente - Funzione per salvare un nuovo referente.
 */
export const ReferenteModal = ({ isOpen, onClose, cliente, onSelectReferente, onAddReferente }) => {
    const [showAddForm, setShowAddForm] = useState(false);

    if (!isOpen || !cliente) return null;

    const handleSelect = (referente) => {
        onSelectReferente(referente);
        onClose();
    };

    const handleAdd = (datiNuovoReferente) => {
        onAddReferente(datiNuovoReferente);
        setShowAddForm(false); // Nasconde il form dopo l'aggiunta
    };

    // Stili per il modale (possono essere esternalizzati)
    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const modalContentStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '500px', maxWidth: '90%' };

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Gestisci Referenti per {cliente.ragioneSociale}</h2>

                {!showAddForm ? (
                    <>
                        <h3 className="font-semibold mb-2">Seleziona un referente esistente</h3>
                        <ul className="mb-4">
                            {cliente.referenti && cliente.referenti.length > 0 ? (
                                cliente.referenti.map((ref, index) => (
                                    <li key={index} onClick={() => handleSelect(ref)} className="p-2 hover:bg-gray-100 cursor-pointer rounded">
                                        {ref.nome} {ref.cognome} ({ref.email || 'N/A'})
                                    </li>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">Nessun referente trovato.</p>
                            )}
                        </ul>
                        <button onClick={() => setShowAddForm(true)} className="text-blue-500">
                            + Aggiungi Nuovo Referente
                        </button>
                    </>
                ) : (
                    <>
                        <AggiungiReferenteForm onSubmit={handleAdd} />
                        <button onClick={() => setShowAddForm(false)} className="text-sm mt-2">Annulla</button>
                    </>
                )}
            </div>
        </div>
    );
};