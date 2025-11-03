import React, { useMemo, useState } from 'react';
import { ArrowLeftIcon, ArrowPathIcon, MagnifyingGlassIcon, MapPinIcon, PhotoIcon } from '@heroicons/react/24/solid';
// ❌ RIMOSSO: L'import diretto di 'deleteDoc' è stato eliminato.

// ✅ AGGIUNTO: Importa sia il context per i dati che l'hook per le azioni.
import { useFirebaseData, useReportsManager } from 'shared-core'; 

const ReportView = ({ onBack, onSearchChange, searchTerm, onEdit }) => {
    // 1. Recupero dati globali (corretto)
    const { 
        reports, 
        companies, 
        users: personnel, 
        cantieri: sites, 
        loadingData, 
        userRole, 
        userAziendaId, 
        db 
    } = useFirebaseData();

    // 2. ✅ Inizializzazione dell'hook per le azioni di scrittura
    const { deleteReport } = useReportsManager(db);

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Creazione delle mappe con fallback (invariato)
    const personnelMap = useMemo(() => {
        const safePersonnel = personnel || [];
        return safePersonnel.reduce((acc, p) => ({ ...acc, [p.id]: `${p.nome} ${p.cognome}` }), {});
    }, [personnel]);

    const sitesMap = useMemo(() => {
        const safeSites = sites || [];
        return safeSites.reduce((acc, s) => ({ ...acc, [s.id]: s.nomeCantiere || s.nome }), {});
    }, [sites]);

    const companyMap = useMemo(() => {
        const safeCompanies = companies || [];
        return safeCompanies.reduce((acc, c) => ({ ...acc, [c.id]: c.companyName || c.name }), {});
    }, [companies]);

    // Logica di filtro e ordinamento (invariata)
    const sortedReports = useMemo(() => {
        const safeReports = reports || [];
        const filteredByCompany = userAziendaId
            ? safeReports.filter(report => report.companyID === userAziendaId)
            : safeReports;

        const lowerCaseSearchTerm = searchTerm ? searchTerm.toLowerCase() : '';

        let filteredAndSortedItems = filteredByCompany.filter(report => {
            const personnelName = personnelMap[report.userId] || '';
            const siteName = sitesMap[report.cantiereId] || '';
            const companyName = companyMap[report.companyID] || '';
            const reportType = report.tipologia || '';
            const isArtifact = report.isArtifact ? 'artifact' : '';
            return (
                personnelName.toLowerCase().includes(lowerCaseSearchTerm) ||
                siteName.toLowerCase().includes(lowerCaseSearchTerm) ||
                companyName.toLowerCase().includes(lowerCaseSearchTerm) ||
                reportType.toLowerCase().includes(lowerCaseSearchTerm) ||
                isArtifact.toLowerCase().includes(lowerCaseSearchTerm)
            );
        });

        if (sortConfig.key !== null) {
            filteredAndSortedItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (sortConfig.key === 'userId') aValue = personnelMap[a.userId] || '';
                if (sortConfig.key === 'cantiereId') aValue = sitesMap[a.cantiereId] || '';
                if (sortConfig.key === 'companyID') aValue = companyMap[a.companyID] || '';
                if (sortConfig.key === 'data') aValue = a.createdAt?.getTime() || 0;
                if (sortConfig.key === 'userId') bValue = personnelMap[b.userId] || '';
                if (sortConfig.key === 'cantiereId') bValue = sitesMap[b.cantiereId] || '';
                if (sortConfig.key === 'companyID') bValue = companyMap[b.companyID] || '';
                if (sortConfig.key === 'data') bValue = b.createdAt?.getTime() || 0;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredAndSortedItems;
    }, [reports, searchTerm, sortConfig, personnelMap, sitesMap, companyMap, userAziendaId]);

    const formatDate = (date) => {
    // Controlla se 'date' è un oggetto Date valido
    if (date instanceof Date && !isNaN(date)) {
        return date.toLocaleDateString('it-IT');
    }
    return 'N/A';
};

const formatTime = (date) => {
    // Controlla se 'date' è un oggetto Date valido
    if (date instanceof Date && !isNaN(date)) {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    return 'N/A';
};

    /**
     * 3. ✅ FUNZIONE CORRETTA: La logica di cancellazione è ora delegata all'hook 'useReportsManager'.
     * @param {object} report - Il report da eliminare.
     */
    const handleDeleteReport = async (report) => {
        // Qui andrebbe inserita la logica per un modale di conferma UI per un'esperienza utente migliore.
        // Ad esempio: if (!await showConfirmationModal('Sei sicuro di voler eliminare questo report?')) return;

        console.log(`Tentativo di eliminazione report ID: ${report.id}.`);
        
        // La responsabilità della cancellazione è delegata all'hook.
        const result = await deleteReport(report.id);
        
        if (result.success) {
            console.log(result.message);
            // Qui si può mostrare una notifica di successo all'utente (es. un toast).
        } else {
            console.error(result.message);
            // Qui si può mostrare una notifica di errore.
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Torna indietro
                </button>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 pr-4 py-2 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800">Report</h1>

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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ora</th>
                                {userRole === 'proprietario' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azienda</th>}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personale</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantiere</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipologia</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posizione</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedReports.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(item.createdAt)}</td>
                                    {userRole === 'proprietario' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{companyMap[item.companyID] || 'N/A'}</td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{personnelMap[item.userId] || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sitesMap[item.cantiereId] || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipologia || 'N/A'}</td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(item.fileUrl || (item.fileUrls && item.fileUrls[0])) ? (
                                            <a 
                                                href={item.fileUrl || item.fileUrls[0]} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            >
                                                <img 
                                                    src={item.fileUrl || item.fileUrls[0]} 
                                                    alt="Anteprima report" 
                                                    className="h-12 w-12 object-cover rounded-md hover:scale-110 transition-transform" 
                                                />
                                            </a>
                                        ) : (
                                            <PhotoIcon className="h-6 w-6 text-gray-300" />
                                        )}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.location?.latitude && item.location?.longitude ? (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${item.location.latitude},${item.location.longitude}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-900 hover:underline flex items-center gap-1"
                                            >
                                                <MapPinIcon className="h-5 w-5" />
                                                Mappa
                                            </a>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => onEdit(item)} 
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Modifica
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleDeleteReport(item)} 
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReportView;