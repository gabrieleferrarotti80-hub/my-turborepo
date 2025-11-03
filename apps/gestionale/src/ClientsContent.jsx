// apps/gestionale/src/components/ClientsContent.jsx

import React, { useState, useMemo } from 'react';
import { UserPlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { useFirebaseData } from 'shared-core';
import { AddClientForm } from './AddClientForm.jsx';
import { ClientDetailView } from 'shared-ui';
import ImportClients from './ImportExcell/ImportClients.jsx';

export const ClientsContent = () => {
    // ✅ Lettura dati standardizzata dal contesto
    const { data, companyID, userRole, loadingData } = useFirebaseData();
    const { clients, companies } = data || {};

    const [viewMode, setViewMode] = useState('list');
    const [selectedClient, setSelectedClient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const showCompanyColumn = userRole === 'proprietario' && companyID === null;

    const companyNameMap = useMemo(() => {
        if (!companies) return new Map();
        return new Map(companies.map(company => [company.id, company.companyName]));
    }, [companies]);

    const filteredClients = useMemo(() => {
        if (!clients) return [];
        
        // ✅ Logica di filtraggio corretta che gestisce il "super admin"
        const isSuperAdmin = userRole === 'proprietario' && companyID === null;

        const clientsByCompany = isSuperAdmin
            ? clients
            : clients.filter(client => client.companyID === companyID);

        if (!searchTerm) return clientsByCompany;
        
        return clientsByCompany.filter(c =>
            (c.ragioneSociale || `${c.nome} ${c.cognome}`)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.referente?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.referente?.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.sedeLegale?.via?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.sedeLegale?.citta?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, userRole, companyID, searchTerm]);

    const canWrite = userRole === 'proprietario' ? !!companyID : true;

    // Gestori di eventi (invariati)
    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setViewMode('detail');
    };
    const handleEditClient = (client) => {
        setSelectedClient(client);
        setViewMode('edit');
    };
    const handleBackToList = () => {
        setSelectedClient(null);
        setViewMode('list');
    };

    if (loadingData) {
        return <div className="text-center p-8">Caricamento dei clienti...</div>;
    }
    if (viewMode === 'import') {
        return <ImportClients companyIdToAdd={companyID} onBack={handleBackToList} />;
    }
    if (viewMode === 'detail') {
        return <ClientDetailView client={selectedClient} onBack={handleBackToList} onEdit={handleEditClient} />;
    }
    if (viewMode === 'edit') {
        return <AddClientForm existingData={selectedClient} onBack={handleBackToList} />;
    }
    if (viewMode === 'add') {
        return <AddClientForm companyIdToAdd={companyID} onBack={handleBackToList} />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Gestione Clienti</h1>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <button onClick={() => canWrite && setViewMode('import')} disabled={!canWrite} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md transition-colors ${canWrite ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                        <ArrowUpTrayIcon className="h-5 w-5" /> Importa
                    </button>
                    <button onClick={() => canWrite && setViewMode('add')} disabled={!canWrite} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md transition-colors ${canWrite ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                        <UserPlusIcon className="h-5 w-5" /> Nuovo Cliente
                    </button>
                </div>
            </div>
            {!canWrite && userRole === 'proprietario' && (
                <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg text-center">
                    Seleziona un'azienda per gestire i clienti.
                </div>
            )}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4">
                    <input type="text" placeholder="Cerca per nome, contatto o indirizzo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {showCompanyColumn && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contatti</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indirizzo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClients.map(client => {
                            const displayName = client.ragioneSociale || `${client.nome} ${client.cognome}`;
                            const email = client.referente?.email || 'N/D';
                            const telefono = client.referente?.telefono || 'N/D';
                            const indirizzo = [client.sedeLegale?.via, client.sedeLegale?.citta, client.sedeLegale?.cap].filter(Boolean).join(', ') || 'N/D';

                            return (
                                <tr key={client.id} onClick={() => handleSelectClient(client)} className="cursor-pointer hover:bg-gray-50">
                                    {showCompanyColumn && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {companyNameMap.get(client.companyID) || 'N/D'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-indigo-600">{displayName}</div>
                                        <div className="text-xs text-gray-500">{client.piva || client.cf}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{telefono}</div>
                                        <div className="text-sm text-gray-500 truncate">{email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{indirizzo}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};