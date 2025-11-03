import React, { useMemo, useState } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/solid'; // ✅ AGGIUNTO: ArrowLeftIcon
import { doc, deleteDoc } from 'firebase/firestore';
import { useFirebaseData } from 'shared-core';

// Importiamo l'hook dall'entry point principale del pacchetto
import { useReportManagement } from 'shared-core';

// ✅ MODIFICA: Utilizziamo il prop 'onBack' per coerenza con il genitore
export const GestioneOperativaScreen = ({ userAziendaId, user, onBack }) => {
    // I dati sono recuperati correttamente dal contesto locale (Passo 5)
    const { db, reports, companies, users, cantieri, loadingData } = useFirebaseData();

    // 1. Creiamo le Mappe (Questa logica resta qui, è mappatura dati, non filtro)
    const usersMap = useMemo(() => {
        return (users || []).reduce((acc, p) => ({ ...acc, [p.id]: `${p.nome} ${p.cognome}` }), {});
    }, [users]);

    const cantieriMap = useMemo(() => {
        return (cantieri || []).reduce((acc, s) => ({ ...acc, [s.id]: s.nomeCantiere }), {});
    }, [cantieri]);

    const companyMap = useMemo(() => {
        return (companies || []).reduce((acc, c) => ({ ...acc, [c.id]: c.companyName || c.name }), {});
    }, [companies]);

    // Oggetto Mappe per il hook
    const maps = { usersMap, cantieriMap, companyMap };
    
    // 2. UTILIZZIAMO IL HOOK PER TUTTA LA LOGICA DI FILTRO E ORDINE
    const {
        sortedReports,
        searchTerm,
        setSearchTerm,
        dateFilter,
        setDateFilter,
        sortConfig,
        requestSort
    } = useReportManagement(reports, userAziendaId, maps);

    // 3. Funzioni di formattazione (Restano qui, sono logica di Presentazione)
    const formatDate = (timestamp) => {
        const date = timestamp instanceof Date ? timestamp : (timestamp?.toDate ? timestamp.toDate() : null); 
        return date ? date.toLocaleDateString('it-IT') : 'N/A';
    };

    const formatTime = (timestamp) => {
        const date = timestamp instanceof Date ? timestamp : (timestamp?.toDate ? timestamp.toDate() : null);
        return date ? date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    };

    // 4. Funzione di Eliminazione (Resta qui, è un'azione specifica del componente)
    const handleDeleteReport = async (report) => {
        if (!db) {
            console.error("Istanza DB non disponibile.");
            return;
        }
        console.log(`Tentativo di eliminazione report ID: ${report.id}. Usa un modale UI per la conferma.`);

        try {
            const reportRef = report.isArtifact
                ? doc(db, 'artifact', 'reports', report.id)
                : doc(db, 'reports', report.id);
            
            await deleteDoc(reportRef);
            console.log("Report eliminato con successo!");
        } catch (error) {
            console.error("Errore durante l'eliminazione del report: ", error);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ✅ AGGIUNTO: Intestazione con titolo e pulsante di ritorno */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Report e Analisi</h1>
                {onBack && (
                    <button
                        onClick={onBack} // Chiamiamo il prop onBack
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full"
                    >
                
                        Torna Indietro
                    </button>
                )}
            </div>

            {/* Area di ricerca e filtro */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-between w-full">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cerca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    {/* Selettore del filtro data */}
                    <div className="relative">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="all">Tutti i report</option>
                            <option value="today">Oggi</option>
                            <option value="last7days">Ultimi 7 giorni</option>
                            <option value="last30days">Ultimi 30 giorni</option>
                        </select>
                    </div>
                </div>
            </div>

            {loadingData ? (
                <div className="text-center text-gray-500">
                    <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
                    <p>Caricamento dati in corso...</p>
                </div>
            ) : sortedReports.length === 0 ? (
                <div className="text-center text-gray-500 p-8 bg-white rounded-2xl shadow-xl">
                    <p>Nessun dato trovato.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('data')}>
                                    Data {sortConfig.key === 'data' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ora
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('userId')}>
                                    Operatore {sortConfig.key === 'userId' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('cantiereId')}>
                                    Cantiere {sortConfig.key === 'cantiereId' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('tipologia')}>
                                    Tipologia {sortConfig.key === 'tipologia' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posizione</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedReports.map((item) => {
                                const personnelName = usersMap[item.userId];
                                const siteName = cantieriMap[item.cantiereId];

                                let fileUrls = [];
                                if (Array.isArray(item.fileUrls)) {
                                    fileUrls = item.fileUrls;
                                } else if (item.fileUrls && typeof item.fileUrls === 'string') {
                                    fileUrls = [item.fileUrls];
                                } else if (item.fileUrl && typeof item.fileUrl === 'string') {
                                    fileUrls = [item.fileUrl];
                                }

                                const firstImageURL = fileUrls.find(url => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.split('?')[0]));
                                const fileToDisplay = firstImageURL || (fileUrls.length > 0 ? fileUrls[0] : null);
                                const isImage = fileToDisplay && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileToDisplay.split('?')[0]);

                                return (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.data)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(item.data)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{personnelName || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{siteName || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipologia || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {item.location?.latitude && item.location?.longitude ? (
                                                <a
                                                    href={`https://maps.google.com/?q=$${item.location.latitude},${item.location.longitude}`} // Correzione del link di Google Maps
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Mostra su Mappa
                                                </a>
                                            ) : (
                                                "N/A"
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm w-24">
                                            {fileToDisplay ? (
                                                isImage ? (
                                                    <a href={fileToDisplay} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={fileToDisplay}
                                                            alt="Anteprima File"
                                                            className="h-16 w-16 object-cover rounded-md shadow-sm"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a href={fileToDisplay} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        Visualizza File
                                                    </a>
                                                )
                                            ) : (
                                                "Nessun file"
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleDeleteReport(item)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Elimina
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};