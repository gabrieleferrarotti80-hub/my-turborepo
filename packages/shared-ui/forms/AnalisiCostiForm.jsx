// packages/shared-ui/forms/AnalisiCostiForm.jsx

import React, { useState } from 'react';

/**
 * Un form "stupido" per un'analisi dettagliata dei costi.
 * @param {Object} datiIniziali - Es. { vociCosto: [{ id: 1, descrizione: 'Materiale X', importo: 100 }] }.
 * @param {Function} onSubmit - Funzione chiamata al submit, riceve un oggetto { vociCosto, totaleCosti }.
 * @param {boolean} isSaving - Se true, disabilita il form.
 */
export const AnalisiCostiForm = ({ datiIniziali = {}, onSubmit, isSaving = false }) => {
    const [vociCosto, setVociCosto] = useState(datiIniziali.vociCosto || [{ id: Date.now(), descrizione: '', importo: '' }]);

    const handleAddItem = () => {
        setVociCosto([...vociCosto, { id: Date.now(), descrizione: '', importo: '' }]);
    };

    const handleRemoveItem = (id) => {
        setVociCosto(vociCosto.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        const nuoveVoci = vociCosto.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setVociCosto(nuoveVoci);
    };

    const calcolaTotale = () => {
        return vociCosto.reduce((acc, item) => acc + (parseFloat(item.importo) || 0), 0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ vociCosto, totaleCosti: calcolaTotale() });
    };

    // Stili inline
    const itemStyle = { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' };
    const inputStyle = { flex: 1, padding: '8px' };
    const buttonStyle = { padding: '10px 15px', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px' };
    const totalStyle = { marginTop: '20px', fontSize: '1.2em', fontWeight: 'bold' };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <h3>Analisi Costi Dettagliata</h3>
            {vociCosto.map((item, index) => (
                <div key={item.id} style={itemStyle}>
                    <input
                        type="text"
                        placeholder={`Descrizione voce ${index + 1}`}
                        value={item.descrizione}
                        onChange={(e) => handleItemChange(item.id, 'descrizione', e.target.value)}
                        style={inputStyle}
                        disabled={isSaving}
                    />
                    <input
                        type="number"
                        placeholder="Importo (€)"
                        value={item.importo}
                        onChange={(e) => handleItemChange(item.id, 'importo', e.target.value)}
                        style={{ ...inputStyle, flex: '0 0 120px' }}
                        step="0.01"
                        disabled={isSaving}
                    />
                    <button 
                        type="button" 
                        onClick={() => handleRemoveItem(item.id)} 
                        style={{...buttonStyle, backgroundColor: '#dc3545'}}
                        disabled={isSaving || vociCosto.length <= 1}
                    >
                        -
                    </button>
                </div>
            ))}
            <button 
                type="button" 
                onClick={handleAddItem} 
                style={{...buttonStyle, backgroundColor: '#28a745'}}
                disabled={isSaving}
            >
                Aggiungi Voce
            </button>
            <div style={totalStyle}>
                Totale Stimato: {calcolaTotale().toFixed(2)} €
            </div>
            <button 
                type="submit" 
                style={{...buttonStyle, backgroundColor: '#007bff', marginTop: '20px'}}
                disabled={isSaving}
            >
                {isSaving ? 'Salvataggio...' : 'Conferma Costi'}
            </button>
        </form>
    );
};