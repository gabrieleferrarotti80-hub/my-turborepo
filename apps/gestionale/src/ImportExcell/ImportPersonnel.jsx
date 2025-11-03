import React, { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowUpTrayIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useFirebaseData, usePersonnelManager } from 'shared-core';

const loadXLSX = () => {
    return new Promise((resolve, reject) => {
        if (window.XLSX) {
            resolve(window.XLSX);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const ImportPersonnel = ({ onBack }) => {
    const { auth, db, userRole, userAziendaId } = useFirebaseData();
    const { importPersonnelBatch, isLoading: isImporting, message: importHookMessage, isError: isImportError } = usePersonnelManager(auth, db);

    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [loadingFile, setLoadingFile] = useState(false);
    const [uiMessage, setUiMessage] = useState(null);
    const [isXLSXLoaded, setIsXLSXLoaded] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const canWrite = userRole !== 'proprietario' || userAziendaId !== null;

    useEffect(() => {
        const checkAndLoadXLSX = async () => {
            if (!isXLSXLoaded) {
                try {
                    await loadXLSX();
                    setIsXLSXLoaded(true);
                } catch (err) {
                    setUiMessage({ type: 'error', text: 'Errore nel caricamento della libreria XLSX.' });
                }
            }
        };
        checkAndLoadXLSX();
    }, [isXLSXLoaded]);

    const getCompanyIds = useCallback(async (companyNames) => {
        if (!db || companyNames.length === 0) return {};
        const companyNameIdMap = {};
        try {
            const companyCollectionRef = collection(db, 'companies');
            const companiesQuery = query(companyCollectionRef, where('companyName', 'in', companyNames));
            const querySnapshot = await getDocs(companiesQuery);
            querySnapshot.forEach(doc => {
                companyNameIdMap[doc.data().companyName] = doc.id;
            });
        } catch (error) {
            setUiMessage({ type: 'error', text: 'Errore nel recupero degli ID delle aziende.' });
        }
        return companyNameIdMap;
    }, [db]);

    const readFile = useCallback(async (fileToRead) => {
        setLoadingFile(true);
        if (!isXLSXLoaded) {
            setUiMessage({ type: 'info', text: 'Libreria in caricamento, riprova.' });
            setLoadingFile(false);
            return;
        }
        setFile(fileToRead);
        setUiMessage(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const workbook = window.XLSX.read(e.target.result, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (json.length === 0) {
                    setUiMessage({ type: 'error', text: 'Il file è vuoto o non valido.' });
                    return;
                }
                
                const companyNames = [...new Set(json.map(person => person.Azienda))].filter(Boolean);
                const idMap = await getCompanyIds(companyNames);

                const dataWithCompanyId = json.map(person => ({
                    nome: person.Nome,
                    cognome: person.Cognome,
                    email: person.Email,
                    password: person.Password,
                    telefono: person.Telefono,
                    ruolo: person.Ruolo,
                    companyID: userRole === 'proprietario' ? idMap[person.Azienda] || null : userAziendaId,
                    Azienda: person.Azienda // Campo di appoggio per UI
                }));
                
                setData(dataWithCompanyId);

                if (userRole === 'proprietario' && dataWithCompanyId.some(person => !person.companyID)) {
                    setUiMessage({ type: 'error', text: 'Errore: una o più aziende nel file non sono state trovate. Le righe senza azienda verranno ignorate.' });
                } else {
                    setUiMessage({ type: 'success', text: 'File letto con successo. Anteprima pronta per la conferma.' });
                }
            } catch (error) {
                setUiMessage({ type: 'error', text: `Errore lettura file: ${error.message}` });
            } finally {
                setLoadingFile(false);
            }
        };
        reader.readAsBinaryString(fileToRead);
    }, [isXLSXLoaded, getCompanyIds, userRole, userAziendaId]);

    const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) readFile(e.dataTransfer.files[0]); }, [readFile]);
    const handleDragOver = (e) => { e.preventDefault(); setIsDragActive(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragActive(false); };
    const handleFileSelect = (e) => { if (e.target.files?.[0]) readFile(e.target.files[0]); };

    const handleImport = async () => {
        if (!canWrite) {
            setUiMessage({ type: 'error', text: 'Non hai i permessi per eseguire questa operazione.' });
            return;
        }
        if (data.length === 0) {
            setUiMessage({ type: 'error', text: 'Nessun dato da importare.' });
            return;
        }

        const validData = data.filter(person => person.email && person.password && person.companyID);
        if (validData.length !== data.length) {
            setUiMessage({ type: 'error', text: 'Alcune righe non contengono dati validi (Email, Password, Azienda) e verranno ignorate. Procedere?' });
            // In un'app reale, qui si aprirebbe un modale di conferma. Per ora procediamo.
        }
        
        const result = await importPersonnelBatch(validData);
        
        if (result.success) {
            setUiMessage(null); // Lascia che il messaggio dell'hook prenda il sopravvento
            setFile(null);
            setData([]);
        } else {
            setUiMessage({ type: 'error', text: result.message });
        }
    };

    return (
        <div className="space-y-6 p-6 md:p-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline mb-4">
                <ArrowLeftIcon className="h-4 w-4" />
                Torna alla gestione personale
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Importa Personale da File</h2>
            {!canWrite && (
                <div className="p-4 rounded-xl bg-yellow-100 text-yellow-700 font-medium flex items-center gap-2">
                    <XCircleIcon className="h-5 w-5" />
                    <span>Non puoi importare personale perché non hai selezionato un'azienda.</span>
                </div>
            )}
            <p className="text-gray-600 mb-6">
                Trascina un file Excel (.xlsx) o CSV. Assicurati che contenga le colonne: <strong>Nome, Cognome, Email, Password, Ruolo, Azienda</strong>.
            </p>

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-300
                ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white hover:bg-gray-50'}
                ${!canWrite ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <input type="file" id="fileInput" className="hidden" onChange={handleFileSelect} accept=".xlsx, .csv" disabled={!canWrite} />
                {loadingFile ? (
                    <div className="flex flex-col items-center">
                        <ArrowPathIcon className="h-12 w-12 text-indigo-500 animate-spin" />
                        <span className="mt-3 text-sm text-gray-600">Analisi file in corso...</span>
                    </div>
                ) : (
                    <>
                        <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mb-3" />
                        <label htmlFor="fileInput" className={`text-gray-600 ${canWrite ? 'cursor-pointer' : ''}`}>
                            {isDragActive ? "Rilascia qui il file..." : "Trascina un file o "}
                            {canWrite && <span className="text-indigo-600 hover:underline">clicca per selezionare</span>}
                        </label>
                    </>
                )}
            </div>
            
            {data.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
                    <div className="flex items-center gap-2">
                        <DocumentArrowUpIcon className="h-5 w-5 text-indigo-500" />
                        <span className="text-sm font-medium text-gray-700">File selezionato: {file?.name}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Anteprima dei primi 5 dipendenti da importare:
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {Object.keys(data[0]).map(key => (
                                        <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.slice(0, 5).map((row, index) => (
                                    <tr key={index}>
                                        {Object.values(row).map((value, i) => (
                                            <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {String(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        onClick={handleImport}
                        disabled={isImporting || loadingFile || !canWrite}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isImporting ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                Importazione in corso...
                            </>
                        ) : ( `Conferma Importazione di ${data.filter(p=>p.companyID).length} Dipendenti` )}
                    </button>
                </div>
            )}

            {(uiMessage || importHookMessage) && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                    (uiMessage?.type === 'success' && !importHookMessage) || (importHookMessage && !isImportError) ? 'bg-green-100 text-green-700' :
                    (uiMessage?.type === 'error' || isImportError) ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                }`}>
                    {isImporting ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> :
                     (uiMessage?.type === 'success' || (importHookMessage && !isImportError)) ? <CheckCircleIcon className="h-5 w-5" /> :
                     <XCircleIcon className="h-5 w-5" />}
                    <span className="text-sm">{importHookMessage || uiMessage?.text}</span>
                </div>
            )}
        </div>
    );
};

export default ImportPersonnel;