// packages/shared-ui/forms/NuovaOffertaForm.jsx

import React, { useState } from 'react';

/**
 * Un form "stupido" per creare una nuova offerta.
 * @param {Array} clients - La lista di clienti da mostrare nel dropdown. Es: [{ id: '1', ragioneSociale: 'Azienda SRL' }]
 * @param {Function} onSubmit - Funzione chiamata al submit del form, riceve un oggetto { nomeOfferta, clienteId }.
 * @param {boolean} isSaving - Se true, disabilita il form e mostra un messaggio di caricamento.
 */
export const NuovaOffertaForm = ({ clients = [], onSubmit, isSaving = false }) => {
    const [nomeOfferta, setNomeOfferta] = useState('');
    const [clienteId, setClienteId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nomeOfferta || !clienteId) {
            alert('Per favore, compila tutti i campi.');
            return;
        }
        onSubmit({ nomeOfferta, clienteId });
    };

    // Stili inline per semplicità
    const formStyle = {
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    };

    const inputStyle = {
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        boxSizing: 'border-box',
    };

     const buttonStyle = {
        padding: '10px 15px',
        border: 'none',
        backgroundColor: isSaving ? '#ccc' : '#007bff',
        color: 'white',
        borderRadius: '4px',
        cursor: isSaving ? 'not-allowed' : 'pointer',
    };

    return (
        <form onSubmit={handleSubmit} style={formStyle}>
            <h2>Crea Nuova Offerta</h2>
            <input
                type="text"
                placeholder="Nome dell'offerta o gara"
                value={nomeOfferta}
                onChange={(e) => setNomeOfferta(e.target.value)}
                disabled={isSaving}
                style={inputStyle}
                required
            />
            <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={isSaving}
                style={inputStyle}
                required
            >
                <option value="">Seleziona un cliente</option>
                {clients.map(client => (
                    <option key={client.id} value={client.id}>
                        {client.ragioneSociale || `${client.nome} ${client.cognome}`}
                    </option>
                ))}
            </select>
            <button type="submit" disabled={isSaving} style={buttonStyle}>
                {isSaving ? 'Creazione in corso...' : 'Crea Offerta'}
            </button>
        </form>
    );
};