// File: src/AggiungiDocumentoForm.jsx

import React, { useState, useEffect } from 'react';
import { DocumentArrowUpIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/solid';
// ✅ CORREZIONE: Importa l'hook Manager dal pacchetto condiviso di logica
import { useDocumentiManager } from 'shared-core'; 

export const AggiungiDocumentoForm = ({ onClose, initialData }) => {
    // Stati interni per gestire i dati del form
    const [categoria, setCategoria] = useState('');
    const [file, setFile] = useState(null);
    const [nomeFile, setNomeFile] = useState('');
    const [dataScadenza, setDataScadenza] = useState('');

    // L'hook gestisce la logica di add/update/loading. Corretto.
    const { addDocumento, updateDocumento, isLoading, error } = useDocumentiManager();

    // Questo useEffect pre-compila il form quando si è in modalità modifica
    useEffect(() => {
        if (initialData) {
            setCategoria(initialData.categoria || 'sicurezza');
            setNomeFile(initialData.nomeFile || '');
            const scadenza = initialData.dataScadenza ? initialData.dataScadenza.toISOString().split('T')[0] : '';
            setDataScadenza(scadenza);
        } else {
            setCategoria('sicurezza'); // Default per un nuovo documento
        }
    }, [initialData]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setNomeFile(selectedFile.name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (initialData) { // Siamo in modalità MODIFICA
            // ✅ 1. Aggiungi 'nomeFile' all'oggetto dei dati aggiornati
            const updatedData = {
                nomeFile: nomeFile,
                categoria: categoria,
                dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
            };
            await updateDocumento(initialData.id, updatedData, onClose);
        } else { // Siamo in modalità AGGIUNTA
            const documentoData = { categoria, file, dataScadenza };
            await addDocumento(documentoData, onClose);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    {initialData ? 'Modifica Documento' : 'Aggiungi Nuovo Documento'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Campo Categoria (invariato) */}
                    <div>
                        <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            {/* Inserisci qui le opzioni */}
                            <option value="sicurezza">Sicurezza</option>
                            <option value="contratti">Contratti</option>
                            <option value="certificazioni">Certificazioni</option>
                        </select>
                    </div>

                    {/* ✅ 2. Trasforma il campo statico in un input di testo per la modifica */}
                    {initialData ? (
                        <div>
                            <label htmlFor="nomeFile" className="block text-sm font-medium text-gray-700 mb-1">Nome Documento</label>
                            <input
                                type="text"
                                id="nomeFile"
                                value={nomeFile}
                                onChange={(e) => setNomeFile(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Documento</label>
                            <label htmlFor="file-upload" className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-gray-300 p-4 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                                <DocumentArrowUpIcon className="h-5 w-5 text-indigo-500" />
                                <span>{nomeFile || 'Clicca per importare un file (PDF, DOCX, JPG, ecc.)'}</span>
                            </label>
                            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                        </div>
                    )}
                    
                    {/* Campo Data di Scadenza (invariato) */}
                    <div>
                        <label htmlFor="scadenza" className="block text-sm font-medium text-gray-700 mb-1">Data di Scadenza (opzionale)</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                id="scadenza" 
                                value={dataScadenza} 
                                onChange={(e) => setDataScadenza(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-10" 
                            />
                            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Pulsanti di azione (già dinamici) */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                            Annulla
                        </button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors" disabled={isLoading}>
                            {isLoading ? 'Salvataggio...' : (initialData ? 'Salva Modifiche' : 'Salva Documento')}
                        </button>
                    </div>

                    {error && ( <p className="text-red-500 text-sm mt-2">Errore: {error.message}</p> )}
                </form>
            </div>
        </div>
    );
};

