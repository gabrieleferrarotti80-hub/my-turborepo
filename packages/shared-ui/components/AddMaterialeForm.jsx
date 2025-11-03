// Percorso: packages/shared-ui/components/AddMaterialeForm.jsx

import React, { useState } from 'react';

const initialState = {
    nome: '',
    codice: '',
    descrizione: '',
    categoria: '',
    quantita: '',
    unitaMisura: 'pz',
    fornitore: '',
    sogliaMinima: '',
};

export const AddMaterialeForm = ({ onSubmit, onCancel, isLoading }) => {
    const [formData, setFormData] = useState(initialState);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        // La pulizia del form ora è gestita dal componente genitore
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl shadow-xl space-y-6 max-w-2xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800">Aggiungi Nuovo Materiale</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome Materiale *" className="p-2 border rounded-md w-full" required />
                <input name="codice" value={formData.codice} onChange={handleChange} placeholder="Codice (SKU)" className="p-2 border rounded-md w-full" />
            </div>
            
            <textarea name="descrizione" value={formData.descrizione} onChange={handleChange} placeholder="Descrizione" className="p-2 border rounded-md w-full h-24" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input name="categoria" value={formData.categoria} onChange={handleChange} placeholder="Categoria" className="p-2 border rounded-md w-full" />
                <input name="quantita" type="number" value={formData.quantita} onChange={handleChange} placeholder="Quantità *" className="p-2 border rounded-md w-full" required step="any" />
                <select name="unitaMisura" value={formData.unitaMisura} onChange={handleChange} className="p-2 border rounded-md w-full bg-white">
                    <option value="pz">Pezzi (pz)</option>
                    <option value="kg">Chilogrammi (kg)</option>
                    <option value="m">Metri (m)</option>
                    <option value="L">Litri (L)</option>
                    <option value="scatola">Scatola</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="fornitore" value={formData.fornitore} onChange={handleChange} placeholder="Fornitore" className="p-2 border rounded-md w-full" />
                <input name="sogliaMinima" type="number" value={formData.sogliaMinima} onChange={handleChange} placeholder="Soglia di riordino" className="p-2 border rounded-md w-full" />
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Annulla</button>
                <button type="submit" disabled={isLoading} className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50">
                    {isLoading ? 'Salvataggio...' : 'Salva Materiale'}
                </button>
            </div>
        </form>
    );
};