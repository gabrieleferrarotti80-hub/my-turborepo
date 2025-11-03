import React, { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowUpTrayIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useFirebaseData, useClientsManager } from 'shared-core';

// Carica la libreria XLSX in modo dinamico per evitare problemi di compilazione.
const loadXLSX = () => {
    return new Promise((resolve, reject) => {
        if (window.XLSX) {
            resolve(window.XLSX);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            console.log('XLSX library loaded.');
            resolve(window.XLSX);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const ImportClients = ({ onBack }) => {
    // 1. ✅ RECUPERO HOOK E DIPENDENZE
    const { user, db } = useFirebaseData();
    // Inizializza l'hook per le azioni di scrittura, usando l'aliasing per gli stati
    const { 
        importClientsBatch, 
        isLoading: isImporting, 
        message: importHookMessage, 
        isError: isImportError 
    } = useClientsManager(db);

    // 2. STATI INTERNI DELLA UI (INVARIATI)
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [loadingFile, setLoadingFile] = useState(false); // Stato per il solo parsing del file
    const [uiMessage, setUiMessage] = useState(null); // Messaggio per la UI (es. errori di lettura file)
    const [isXLSXLoaded, setIsXLSXLoaded] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);

    // 3. LOGICA DI UI E PARSING (INVARIATA)
    useEffect(() => {
        const checkAndLoadXLSX = async () => {
            if (!isXLSXLoaded) {
                try {
                    await loadXLSX();
                    setIsXLSXLoaded(true);
                } catch (err) {
                    console.error('Failed to load XLSX library:', err);
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
            console.error('Errore nel recupero degli ID delle aziende:', error);
            setUiMessage({ type: 'error', text: 'Errore nel recupero degli ID delle aziende.' });
        }
        return companyNameIdMap;
    }, [db]);

    const readFile = useCallback(async (fileToRead) => {
        setLoadingFile(true);
        if (!isXLSXLoaded) {
            setUiMessage({ type: 'info', text: 'Libreria di importazione in caricamento, riprova tra qualche istante.' });
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
                    setUiMessage({ type: 'error', text: 'Il file è vuoto o non contiene dati validi.' });
                    return;
                }
                
                const companyNames = [...new Set(json.map(client => client.Azienda))].filter(Boolean);
                const idMap = await getCompanyIds(companyNames);

                const dataWithCompanyId = json.map(client => ({
                    ragioneSociale: client['Ragione Sociale'] || '',
                    piva: client['Partita IVA'] || '',
                    cf: client['Codice Fiscale'] || '',
                    sdi: client['SDI'] || '',
                    pec: client['PEC'] || '',
                    // Aggiungi qui la mappatura per tutti gli altri campi del tuo Excel
                    companyID: idMap[client.Azienda] || null,
                    azienda: client.Azienda 
                }));
                
                setData(dataWithCompanyId);

                if (dataWithCompanyId.some(client => !client.companyID)) {
                    setUiMessage({ type: 'error', text: 'Attenzione: una o più aziende nel file non sono state trovate. Correggi il file e ricaricalo.' });
                } else {
                    setUiMessage({ type: 'success', text: 'File letto con successo. Anteprima pronta per la conferma.' });
                }
            } catch (error) {
                console.error("Errore nella lettura del file:", error);
                setUiMessage({ type: 'error', text: `Errore nella lettura del file: ${error.message}` });
            } finally {
                setLoadingFile(false);
            }
        };
        reader.readAsBinaryString(fileToRead);
    }, [isXLSXLoaded, getCompanyIds]);

    const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) readFile(e.dataTransfer.files[0]); }, [readFile]);
    const handleDragOver = (e) => { e.preventDefault(); setIsDragActive(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragActive(false); };
    const handleFileSelect = (e) => { if (e.target.files?.[0]) readFile(e.target.files[0]); };

    const handleImport = () => {
        if (data.length === 0) {
            setUiMessage({ type: 'error', text: 'Nessun dato da importare. Carica un file valido.' });
            return;
        }
        if (data.some(client => !client.companyID)) {
            setUiMessage({ type: 'error', text: 'L\'importazione non può procedere. Correggi il file e riprova.' });
            return;
        }
        setShowConfirmModal(true);
    };

    /**
     * 4. ✅ AZIONE DI BUSINESS DELEGATA
     * Questa funzione ora chiama l'hook manager, mantenendo il componente pulito.
     */
    const handleConfirmImport = async () => {
        setShowConfirmModal(false);
        const result = await importClientsBatch(data);
        // Aggiorna la UI solo se l'hook ha terminato con successo
        if (result.success) {
            setFile(null);
            setData([]);
        }
    };

    const handleCancelImport = () => setShowConfirmModal(false);
    const getNumberOfValidClients = () => data.length;

    // 5. RENDER JSX (INVARIATO NELLA STRUTTURA)
    return (
        <div className="relative space-y-6 p-6 md:p-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline mb-4">
                <ArrowLeftIcon className="h-4 w-4" />
                Torna alla gestione clienti
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Importa Clienti da File</h2>
            <p className="text-gray-600 mb-6">
                Trascina un file Excel (.xlsx) o CSV nell'area sottostante, verifica i dati e conferma l'importazione.
            </p>
            
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-300
                ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
            >
                <input type="file" id="fileInput" className="hidden" onChange={handleFileSelect} accept=".xlsx, .csv"/>
                {loadingFile ? (
                    <div className="flex flex-col items-center">
                        <ArrowPathIcon className="h-12 w-12 text-indigo-500 animate-spin" />
                        <span className="mt-3 text-sm text-gray-600">Lettura file in corso...</span>
                    </div>
                ) : (
                    <>
                        <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-gray-600">
                            {isDragActive ? "Rilascia qui il file..." : "Trascina qui un file o "}
                            <label htmlFor="fileInput" className="text-indigo-600 hover:underline cursor-pointer">
                                clicca per selezionarlo
                            </label>
                        </p>
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
                        Anteprima dei primi 5 clienti da importare:
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
                        disabled={isImporting || loadingFile || data.some(c => !c.companyID)}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Conferma Importazione Massiva
                    </button>
                </div>
            )}

            {(uiMessage || importHookMessage) && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                    (uiMessage?.type === 'success' && !importHookMessage) || (!isImportError && importHookMessage) ? 'bg-green-100 text-green-700' :
                    (uiMessage?.type === 'error' || isImportError) ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                }`}>
                    {(uiMessage?.type === 'success' || !isImportError) && <CheckCircleIcon className="h-5 w-5" />}
                    {(uiMessage?.type === 'error' || isImportError) && <XCircleIcon className="h-5 w-5" />}
                    {isImporting && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                    <span className="text-sm">{uiMessage?.text || importHookMessage}</span>
                </div>
            )}
            
            {showConfirmModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="relative bg-white p-8 rounded-xl shadow-xl w-96 max-w-lg mx-auto transform transition-all scale-100 animate-fade-in-up">
                        <div className="text-center">
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-indigo-500" />
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Conferma Importazione</h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    Sei sicuro di voler importare {getNumberOfValidClients()} clienti?
                                    <br />
                                    Questa operazione non può essere annullata.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                            <button
                                onClick={handleConfirmImport}
                                disabled={isImporting}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                {isImporting ? (
                                    <>
                                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                        Importazione...
                                    </>
                                ) : ( 'Conferma' )}
                            </button>
                            <button
                                onClick={handleCancelImport}
                                disabled={isImporting}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                            >
                                Annulla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportClients;