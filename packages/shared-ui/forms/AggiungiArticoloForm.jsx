import React, { useState } from 'react';
import { useTheme } from '../context/themeContext.jsx'; 
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export const AggiungiArticoloForm = ({ onBack, onSaveSuccess, addArticolo, isAdding, onSwitchToImport }) => {
    
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

        // Determina il tipo macro in base alla categoria
        const isMateriale = categoria === 'Materiale';
        const tipoArticolo = isMateriale ? 'materiale' : 'attrezzatura';

        const datiDaSalvare = {
            nome: formData.nome,
            // Se è materiale, il seriale potrebbe essere un codice articolo o SKU
            seriale: formData.seriale || `MAT-${Date.now()}`, 
            categoria: categoria,
            tipoArticolo: tipoArticolo,
            
            // Dati specifici per Materiali
            quantita: isMateriale ? parseFloat(formData.quantita) : 1,
            unitaMisura: isMateriale ? formData.unitaMisura : 'pz',
            costoUnitario: parseFloat(formData.costoUnitario || 0), // Utile per entrambi
            
            // Dati specifici per Attrezzature (Costo Orario)
            costoOrario: formData.costoOrario ? parseFloat(formData.costoOrario) : 0,
            
            dettagli: { ...formData }
        };

        // Pulizia
        delete datiDaSalvare.dettagli.nome;
        delete datiDaSalvare.dettagli.seriale;
        delete datiDaSalvare.dettagli.costoOrario;
        delete datiDaSalvare.dettagli.quantita;
        delete datiDaSalvare.dettagli.costoUnitario;

        const result = await addArticolo(datiDaSalvare, documentoFile);

        if (result.success) {
            onSaveSuccess(result.message);
        } else {
            setMessage(result.message);
        }
    };

    if (view === 'import') {
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
            <h2 className="text-3xl font-bold text-gray-800">Aggiungi Articolo / Materiale</h2>

            <div className="flex gap-4 border-b pb-4">
                <button onClick={() => setView('form')} className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-200 ${view === 'form' ? colorClasses[primaryColor].bg : 'bg-gray-200'} ${view === 'form' ? 'text-white' : 'text-gray-700'}`}>
                    Aggiungi Singolo
                </button>
                <button onClick={() => setView('import')} className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-200 ${view === 'import' ? colorClasses[primaryColor].bg : 'bg-gray-200'} ${view === 'import' ? 'text-white' : 'text-gray-700'}`}>
                    Importa da Excel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div>
                    <label className="block text-gray-700 font-medium mb-2">Tipologia</label>
                    <select value={categoria} onChange={handleCategoriaChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                        <option value="">-- Seleziona --</option>
                        <optgroup label="Attrezzature">
                            <option value="Attrezzatura Generica">Attrezzatura Generica</option>
                            <option value="Automezzo">Automezzo</option>
                            <option value="DPI">DPI</option>
                        </optgroup>
                        <optgroup label="Materiali">
                            {/* ✅ NUOVA CATEGORIA */}
                            <option value="Materiale">Materiale di Consumo</option>
                        </optgroup>
                    </select>
                </div>
                
                {categoria && (
                    <>
                        <InputField label="Nome Articolo" name="nome" value={formData.nome || ''} onChange={handleChange} required />
                        
                        {/* Il seriale è obbligatorio solo per le attrezzature */}
                        {categoria !== 'Materiale' && (
                            <InputField label="Seriale / Targa / ID" name="seriale" value={formData.seriale || ''} onChange={handleChange} required />
                        )}
                        
                        {/* Renderizza i campi specifici */}
                        {renderFormByCategory(categoria, formData, handleChange)}
                        
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Scheda Tecnica / Foto</label>
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

// --- FUNZIONI HELPER LOCALI ---

const renderFormByCategory = (categoria, formData, handleChange) => {
    switch (categoria) {
        case 'Materiale':
            return (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Quantità Iniziale" name="quantita" type="number" value={formData.quantita || ''} onChange={handleChange} required placeholder="Es. 100" />
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Unità di Misura</label>
                            <select name="unitaMisura" value={formData.unitaMisura || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                                <option value="pz">Pezzi (pz)</option>
                                <option value="kg">Chilogrammi (kg)</option>
                                <option value="m">Metri (m)</option>
                                <option value="mq">Metri Quadri (mq)</option>
                                <option value="mc">Metri Cubi (mc)</option>
                                <option value="l">Litri (l)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Costo Unitario (€)" name="costoUnitario" type="number" value={formData.costoUnitario || ''} onChange={handleChange} placeholder="Es. 0.50" />
                        <InputField label="Soglia Minima (Alert)" name="sogliaMinima" type="number" value={formData.sogliaMinima || ''} onChange={handleChange} placeholder="Es. 10" />
                    </div>
                    <InputField label="Codice Articolo / SKU" name="seriale" value={formData.seriale || ''} onChange={handleChange} placeholder="Opzionale" />
                </>
            );
        case 'Attrezzatura Generica':
            return (
                <>
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Modello" name="modello" value={formData.modello || ''} onChange={handleChange} />
                    <InputField label="Data Acquisto" name="dataAcquisto" type="date" value={formData.dataAcquisto || ''} onChange={handleChange} />
                    <InputField label="Costo Orario Medio (€)" name="costoOrario" type="number" value={formData.costoOrario || ''} onChange={handleChange} placeholder="Es. 5.00" />
                </>
            );
        case 'Automezzo':
            return (
                <>
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Modello" name="modello" value={formData.modello || ''} onChange={handleChange} />
                    <InputField label="Targa (Dettaglio)" name="targa" value={formData.targa || ''} onChange={handleChange} />
                    <InputField label="Numero Telaio" name="numeroTelaio" value={formData.numeroTelaio || ''} onChange={handleChange} />
                    <InputField label="Data Acquisto" name="dataAcquisto" type="date" value={formData.dataAcquisto || ''} onChange={handleChange} />
                    <InputField label="Costo Orario Medio (€)" name="costoOrario" type="number" value={formData.costoOrario || ''} onChange={handleChange} placeholder="Es. 40.00" />
                </>
            );
        case 'DPI':
             return (
                <>
                    <InputField label="Tipologia" name="tipologia" value={formData.tipologia || ''} onChange={handleChange} />
                    <InputField label="Marca" name="marca" value={formData.marca || ''} onChange={handleChange} />
                    <InputField label="Data Scadenza" name="dataScadenza" type="date" value={formData.dataScadenza || ''} onChange={handleChange} required />
                </>
            );
        default:
            return null;
    }
};

const InputField = ({ label, name, type = 'text', value, onChange, required = false, placeholder = '' }) => (
    <div>
        <label className="block text-gray-700 font-medium mb-2">{label}</label>
        <input 
            type={type} 
            name={name} 
            value={value} 
            onChange={onChange}
            placeholder={placeholder}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            required={required}
            step={type === 'number' ? "0.01" : undefined}
        />
    </div>
);