// packages/shared-ui/views/OfferteListView.jsx

import React from 'react';

export const OfferteListView = ({ title, offerte = [], onSelectOfferta }) => {
    const cardStyle = {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        backgroundColor: '#fff',
    };

    return (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <h1 className="text-2xl font-bold mb-4">{title}</h1>
            {offerte.length > 0 ? (
                offerte.map(offerta => (
                    <div
                        key={offerta.id}
                        style={cardStyle}
                        onClick={() => onSelectOfferta(offerta)}
                    >
                        <h3 style={{ marginTop: 0 }}>{offerta.nomeOfferta}</h3>
                        <p className="text-sm text-gray-600">
                            Stato: <strong style={{ textTransform: 'capitalize' }}>{offerta.stato.replace('_', ' ')}</strong>
                        </p>
                    </div>
                ))
            ) : (
                <p>Nessuna offerta trovata in questa categoria.</p>
            )}
        </div>
    );
};