// Percorso: packages/shared-ui/forms/AggiungiArticoloForm.jsx

import React, { useState } from 'react';
// ⚠️ Import corretto per useTheme all'interno di shared-ui
import { useTheme } from '../context/themeContext.jsx'; 
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

// ✅ Il componente accetta tutte le dipendenze di business tramite props
export const AggiungiArticoloForm = ({ onBack, onSaveSuccess, addArticolo, isAdding, onSwitchToImport }) => {
    
    // Le dipendenze dal contesto e l'inizializzazione degli hook sono ora gestite dal componente contenitore.
    
    const { primaryColor, colorClasses } = useTheme();

    const [view, setView] = useState('form'); 
    const [message, setMessage] = useState('');
    const [categoria, setCategoria] = useState('');
    const [formData, setFormData] = useState({});
    const [documentoFile, setDocumentoFile] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setDocumentoFile(e.target.files[0]);
        }
    };

    const handleCategoriaChange = (e) => {
        setCategoria(e.target.value);
        setFormData({});
        setDocumentoFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const datiDaSalvare = {
            nome: formData.nome,
            seriale: formData.seriale,
            categoria: categoria,
            // ✅ Assumiamo che per default in questo form si crei una 'attrezzatura'
            tipoArticolo: 'attrezzatura', 
            dettagli: { ...formData }
        };

        delete datiDaSalvare.dettagli.nome;
        delete datiDaSalvare.dettagli.seriale;

        // ✅ La funzione addArticolo è la prop ricevuta
        const result = await addArticolo(datiDaSalvare, documentoFile);

        if (result.success) {
            onSaveSuccess(result.message);
        } else {
            setMessage(result.message);
        }
    };

    // LOGICA DI SWITCH: Quando si clicca 'Importa da Excel', notifica il contenitore
    if (view === 'import') {
        // Chiama la prop per notificare al contenitore di cambiare vista
        onSwitchToImport(); 
        setView('form'); 
        return null;
    }

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-lg mx-auto">
            <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} mb-4 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna all'Inventario
            </button>
            <h2 className="text-3xl font-bold text-gray-800">Aggiungi Articolo</h2>

            <div className="flex gap-4 border-b pb-4">
                <button
                    onClick={() => setView('form')}
                    className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-200 ${view === 'form' ? colorClasses[primaryColor].bg : 'bg-gray-200'} ${view === 'form' ? 'text-white' : 'text-gray-700'}`}
                >
                    Aggiungi Singolo
                </button>
                <button
                    onClick={() => setView('import')} // Il click imposta lo stato locale per l'attivazione della prop onSwitchToImport
                    className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-200 ${view === 'import' ? colorClasses[primaryColor].bg : 'bg-gray-200'} ${view === 'import' ? 'text-white' : 'text-gray-700'}`}
                >
                    Importa da Excel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div>
                    <label className="block text-gray-700 font-medium mb-2">Categoria</label>
                    <select value={categoria} onChange={handleCategoriaChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                        <option value="">-- Seleziona --</option>
                        <option value="Attrezzatura Generica">Attrezzatura Generica</option>
                        <option value="Automezzo">Automezzo</option>
                        <option value="DPI">DPI</option>
                    </select>
                </div>
                
                {categoria && (
                    <>
                        <InputField label="Nome Attrezzatura" name="nome" value={formData.nome || ''} onChange={handleChange} required />
                        <InputField label="Seriale / Identificativo Unico" name="seriale" value={formData.seriale || ''} onChange={handleChange} required />
                        {renderFormByCategory(categoria, formData, handleChange)}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Documento (PDF, Immagine, etc.)</label>
                            <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            {documentoFile && <p className="mt-2 text-xs text-gray-600">File selezionato: {documentoFile.name}</p>}
                        </div>
                    </>
                )}

                {message && (
                    <div className={`p-4 rounded-lg text-sm ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                       <button type="button" onClick={onBack} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                        Annulla
                    </button>
                    <button type="submit" disabled={isAdding || !categoria} className={`py-2 px-4 text-white rounded-lg font-medium transition-colors ${isAdding || !categoria ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} hover:opacity-90`}`}>
                        {isAdding ? 'Salvataggio...' : 'Salva Articolo'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- FUNZIONI HELPER LOCALI (Devono rimanere nello stesso file) ---

const renderFormByCategory = (categoria, formData, handleChange) => {
    switch (categoria) {
        case 'Attrezzatura Generica':
            return (
                <>
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Modello" name="modello" value={formData.modello || ''} onChange={handleChange} />
                    <InputField label="Data Acquisto" name="dataAcquisto" type="date" value={formData.dataAcquisto || ''} onChange={handleChange} />
                </>
            );
        case 'Automezzo':
            return (
                <>
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Modello" name="modello" value={formData.modello || ''} onChange={handleChange} />
                    <InputField label="Targa" name="targa" value={formData.targa || ''} onChange={handleChange} required />
                    <InputField label="Numero Telaio" name="numeroTelaio" value={formData.numeroTelaio || ''} onChange={handleChange} />
                    <InputField label="Data Acquisto" name="dataAcquisto" type="date" value={formData.dataAcquisto || ''} onChange={handleChange} />
                </>
            );
        case 'DPI':
             return (
                <>
                    <InputField label="Tipologia" name="tipologia" value={formData.tipologia || ''} onChange={handleChange} />
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Modello" name="modello" value={formData.modello || ''} onChange={handleChange} />
                    <InputField label="Data Acquisto" name="dataAcquisto" type="date" value={formData.dataAcquisto || ''} onChange={handleChange} />
                    <InputField label="Data Scadenza" name="dataScadenza" type="date" value={formData.dataScadenza || ''} onChange={handleChange} required />
                </>
            );
        default:
            return null;
    }
};

const InputField = ({ label, name, type = 'text', value, onChange, required = false }) => (
    <div>
        <label className="block text-gray-700 font-medium mb-2">{label}</label>
        <input 
            type={type} 
            name={name} 
            value={value} 
            onChange={onChange}
            className="w-full p-2 border border-gray-300 rounded-lg" 
            required={required}
        />
    </div>
);