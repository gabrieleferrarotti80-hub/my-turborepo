// Percorso: packages/shared-ui/components/ImportMaterialiView.jsx

import React, { useState } from 'react';
import * as XLSX from 'xlsx'; // Importa la libreria per leggere i file Excel

export const ImportMaterialiView = ({ onImport, onCancel, isLoading }) => {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        // Controlla che il file sia di tipo spreadsheet
        if (selectedFile && (selectedFile.type.includes('spreadsheetml') || selectedFile.name.endsWith('.xls'))) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setError('');
        } else {
            setFile(null);
            setFileName('');
            setError('Per favore, seleziona un file Excel valido (.xlsx, .xls).');
        }
    };

    const handleImportClick = () => {
        if (!file) {
            setError('Nessun file selezionato.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0]; // Legge solo il primo foglio
                const ws = wb.Sheets[wsname];
                
                // Converte il foglio in un array di oggetti JSON
                // Le intestazioni del file Excel diventeranno le chiavi degli oggetti
                const jsonData = XLSX.utils.sheet_to_json(ws);
                
                if (jsonData.length === 0) {
                    setError("Il file Excel è vuoto o non formattato correttamente.");
                    return;
                }

                console.log("Dati estratti da Excel:", jsonData);
                onImport(jsonData); // Passa i dati pronti alla funzione del manager
            } catch (e) {
                console.error("Errore durante la lettura del file Excel:", e);
                setError("C'è stato un errore durante la lettura del file. Assicurati che sia formattato correttamente.");
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Importazione Massiva Materiali</h2>
            <p className="text-gray-600 mb-4">
                Carica un file Excel (.xlsx, .xls). La prima riga del file **deve contenere le intestazioni** che corrispondono ai campi del materiale (es: <strong>nome, codice, quantita, unitaMisura, categoria</strong>).
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                <label htmlFor="file-upload" className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                    Seleziona File
                </label>
                {fileName && <p className="mt-4 text-gray-700">File selezionato: <strong>{fileName}</strong></p>}
            </div>

            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            
            <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                    Annulla
                </button>
                <button onClick={handleImportClick} disabled={isLoading || !file} className="py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50">
                    {isLoading ? 'Importazione in corso...' : 'Avvia Importazione'}
                </button>
            </div>
        </div>
    );
};