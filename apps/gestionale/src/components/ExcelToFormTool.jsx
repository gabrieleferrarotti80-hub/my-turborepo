// src/components/ExcelToFormTool.jsx

import React, { useState } from 'react';
import readXlsxFile from 'read-excel-file';
// highlight-start
import { useFirebaseData } from 'shared-core';; // Percorso relativo aggiornato
// highlight-end
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


const ExcelToFormTool = ({ onSaveSuccess }) => {
    const { db, userAziendaId } = useFirebaseData();
    const [headers, setHeaders] = useState([]);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [collectionName, setCollectionName] = useState('datiCantiere');

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMessage('File caricato. Analizzo le intestazioni...');
        setLoading(true);
        setHeaders([]);
        setFormData({});
        
        try {
            const rows = await readXlsxFile(file, { sheet: 1 });
            if (rows.length > 0) {
                const newHeaders = rows[0]; // La prima riga è l'intestazione
                setHeaders(newHeaders);
                
                // Inizializza i dati del form con le intestazioni
                const initialFormData = newHeaders.reduce((acc, header) => {
                    acc[header] = '';
                    return acc;
                }, {});
                setFormData(initialFormData);
                setMessage('File analizzato. Compila il modulo.');
            } else {
                setMessage('Il file non contiene dati.');
            }
        } catch (error) {
            console.error("Errore nella lettura del file:", error);
            setMessage('Errore nella lettura del file. Assicurati che sia un file Excel valido.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!headers.length || Object.values(formData).every(value => value === '')) {
            setMessage('Per favore, carica un file e compila il modulo.');
            return;
        }

        setLoading(true);
        setMessage('Salvataggio in corso...');

        try {
            const dataToSave = {
                companyID: userAziendaId,
                timestamp: serverTimestamp(),
                ...formData
            };
            
            // Salva nella collezione dinamica
            await addDoc(collection(db, collectionName), dataToSave);

            onSaveSuccess('Dati salvati con successo!');
            setFormData(headers.reduce((acc, header) => ({ ...acc, [header]: '' }), {})); // Reset del form
            setMessage('');
        } catch (error) {
            console.error("Errore nel salvataggio dei dati:", error);
            setMessage('Errore nel salvataggio dei dati. Riprova.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Generatore di Form da Excel</h2>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Seleziona un file Excel (.xlsx):</label>
                <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".xlsx"
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
            </div>
            {message && <p className={`mb-4 text-center ${message.includes('Errore') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}

            {headers.length > 0 && (
                <div className="mt-8 p-6 border rounded-lg bg-gray-50 animate-fade-in">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Modulo per l'inserimento dati</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {headers.map((header, index) => (
                            <div key={index}>
                                <label className="block text-sm font-medium text-gray-700">{header}</label>
                                <input
                                    type="text"
                                    name={header}
                                    value={formData[header] || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required={true}
                                />
                            </div>
                        ))}
                        <div className="pt-4">
                             <label className="block text-sm font-medium text-gray-700">Nome della Collezione Firestore</label>
                             <input
                                 type="text"
                                 value={collectionName}
                                 onChange={(e) => setCollectionName(e.target.value)}
                                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                 placeholder="Es. datiCantiere"
                             />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {loading ? 'Salvataggio...' : 'Salva Dati'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ExcelToFormTool;