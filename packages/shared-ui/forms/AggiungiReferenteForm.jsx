// packages/shared-ui/forms/AggiungiReferenteForm.jsx

import React, { useState } from 'react';

/**
 * Un form "stupido" per aggiungere un nuovo referente a un cliente.
 * @param {Function} onSubmit - Funzione chiamata al submit, riceve un oggetto con i dati del referente.
 * @param {boolean} isSaving - Se true, disabilita il form.
 */
export const AggiungiReferenteForm = ({ onSubmit, isSaving = false }) => {
    const [nome, setNome] = useState('');
    const [cognome, setCognome] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ nome, cognome, email, telefono });
    };

    // Stili inline per semplicità
    const inputStyle = {
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        boxSizing: 'border-box',
    };

    const buttonStyle = {
        padding: '10px 15px',
        border: 'none',
        backgroundColor: isSaving ? '#ccc' : '#28a745', // Verde per l'aggiunta
        color: 'white',
        borderRadius: '4px',
        cursor: isSaving ? 'not-allowed' : 'pointer',
    };

    return (
        <form onSubmit={handleSubmit}>
            <h4>Aggiungi Nuovo Referente</h4>
            <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={isSaving}
                style={inputStyle}
                required
            />
            <input
                type="text"
                placeholder="Cognome"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                disabled={isSaving}
                style={inputStyle}
                required
            />
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving}
                style={inputStyle}
            />
            <input
                type="tel"
                placeholder="Telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                disabled={isSaving}
                style={inputStyle}
            />
            <button type="submit" disabled={isSaving} style={buttonStyle}>
                {isSaving ? 'Salvataggio...' : 'Aggiungi Referente'}
            </button>
        </form>
    );
};