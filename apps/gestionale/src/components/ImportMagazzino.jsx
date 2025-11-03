import React, { useState } from 'react';
// highlight-start
import { useFirebaseData } from 'shared-core';;
import { useTheme } from 'shared-ui';
import { attrezzaturaSchema } from 'shared-core';
// highlight-end
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';

const ImportMagazzino = ({ onBack }) => {
    const { db, userAziendaId } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !userAziendaId) {
            setMessage('Seleziona un file e assicurati che un\'azienda sia attiva.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            
            const headers = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || []).map(h => String(h).trim());
            const requiredHeaders = ['nome', 'seriale', 'categoria'];

            for (const header of requiredHeaders) {
                if (!headers.includes(header)) {
                    throw new Error(`Colonna obbligatoria mancante nel file Excel: '${header}'.`);
                }
            }
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // ✅ SOLUZIONE: Filtra i dati per rimuovere righe vuote o incomplete
            const validData = jsonData.filter(row => row.nome && row.seriale && row.categoria);

            if (validData.length === 0) {
                throw new Error("Il file Excel è vuoto o non contiene righe con i dati obbligatori (nome, seriale, categoria).");
            }

            const batch = writeBatch(db);
            const attrezzatureCollection = collection(db, 'attrezzature');

            validData.forEach((row) => {
                const newDocRef = doc(attrezzatureCollection);
                const { nome, seriale, categoria, ...dettagli } = row;

                const articoloData = {
                    ...attrezzaturaSchema,
                    nome,
                    seriale,
                    categoria,
                    dettagli,
                    stato: 'disponibile',
                    companyID: userAziendaId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                
                batch.set(newDocRef, articoloData);
            });

            await batch.commit();

            const skippedRows = jsonData.length - validData.length;
            setMessage(`Importazione completata: ${validData.length} articoli aggiunti. ${skippedRows > 0 ? `${skippedRows} righe sono state ignorate perché incomplete.` : ''}`);
            setFile(null);

        } catch (error) {
            console.error("Errore durante l'importazione:", error);
            setMessage("Errore: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl">
             <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} mb-4 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna all'aggiunta manuale
            </button>
            <h2 className="text-3xl font-bold text-gray-800">Importa da Excel</h2>
            <p className="text-gray-600">
                Carica un file Excel (.xlsx). Assicurati che la prima riga contenga le intestazioni di colonna obbligatorie: <strong>nome</strong>, <strong>seriale</strong>, e <strong>categoria</strong> (tutto minuscolo).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-700 font-medium mb-2">Seleziona File</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                    />
                    {file && <p className="mt-2 text-xs text-gray-600">File selezionato: {file.name}</p>}
                </div>
                
                {message && (
                    <div className={`p-4 rounded-lg text-sm ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <div className="flex justify-end mt-4">
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className={`py-2 px-4 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors duration-200 ${loading || !file ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} hover:opacity-90`}`}
                    >
                        {loading ? 'Importazione...' : (
                            <>
                                <CloudArrowUpIcon className="h-5 w-5" />
                                Importa Dati
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ImportMagazzino;

