// apps/gestionale/src/components/ClientsContent.jsx

import React, { useState, useMemo } from 'react';
import { 
    UserPlusIcon, 
    ArrowUpTrayIcon, 
    MagnifyingGlassIcon, 
    EnvelopeIcon, 
    PhoneIcon, 
    BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { useFirebaseData } from 'shared-core';
import { AddClientForm } from './AddClientForm.jsx';
import { ClientDetailView } from 'shared-ui';
import ImportClients from './ImportExcell/ImportClients.jsx';

export const ClientsContent = () => {
    const { data, companyID, userRole, loadingData } = useFirebaseData();
    const { clients = [], companies = [], cantieri = [], sal = [] } = data || {};

    const [viewMode, setViewMode] = useState('list');
    const [selectedClient, setSelectedClient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const showCompanyColumn = userRole === 'proprietario' && companyID === null;

    const companyNameMap = useMemo(() => {
        return new Map(companies.map(company => [company.id, company.companyName]));
    }, [companies]);

    const filteredClients = useMemo(() => {
        const isSuperAdmin = userRole === 'proprietario' && companyID === null;
        const clientsByCompany = isSuperAdmin ? clients : clients.filter(c => c.companyID === companyID);

        if (!searchTerm) return clientsByCompany.sort((a, b) => (a.ragioneSociale || a.nome || '').localeCompare(b.ragioneSociale || b.nome || ''));
        
        const term = searchTerm.toLowerCase();
        return clientsByCompany.filter(c =>
            (c.ragioneSociale || '').toLowerCase().includes(term) ||
            (c.nome || '').toLowerCase().includes(term) ||
            (c.cognome || '').toLowerCase().includes(term) ||
            (c.piva || '').includes(term) ||
            (c.email || '').toLowerCase().includes(term)
        );
    }, [clients, userRole, companyID, searchTerm]);

    const canWrite = userRole === 'proprietario' ? !!companyID : true;

    const handleAction = (mode, client = null) => {
        setSelectedClient(client);
        setViewMode(mode);
    };

    if (loadingData) return <div className="p-10 text-center animate-pulse font-bold text-slate-400">Caricamento anagrafiche...</div>;

    if (viewMode === 'import') return <ImportClients companyIdToAdd={companyID} onBack={() => setViewMode('list')} />;
    
    if (viewMode === 'detail' && selectedClient) {
        return (
            <ClientDetailView 
                client={selectedClient} 
                cantieri={cantieri} 
                salList={sal} 
                onBack={() => setViewMode('list')} 
                onEdit={(c) => handleAction('edit', c)} 
            />
        );
    }
    
    if (viewMode === 'add' || viewMode === 'edit') {
        return <AddClientForm existingData={selectedClient} companyIdToAdd={companyID} onBack={() => setViewMode('list')} />;
    }

    return (
        <div className="container mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <BuildingOffice2Icon className="h-8 w-8 text-indigo-600"/>
                        Anagrafica Clienti
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Seleziona un cliente per visualizzare i dettagli, i referenti e lo storico cantieri.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setViewMode('import')} disabled={!canWrite} className="px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-100 transition-all">
                        <ArrowUpTrayIcon className="h-5 w-5" /> Importa
                    </button>
                    <button onClick={() => handleAction('add')} disabled={!canWrite} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all">
                        <UserPlusIcon className="h-5 w-5" /> Nuovo Cliente
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca per nome, P.IVA o città..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" 
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/70">
                            <tr>
                                {showCompanyColumn && <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Azienda</th>}
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Cliente / Dati Fiscali</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Contatti</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Località</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredClients.map(client => {
                                const displayName = client.ragioneSociale || `${client.nome} ${client.cognome}`;
                                return (
                                    <tr 
                                        key={client.id} 
                                        onClick={() => handleAction('detail', client)}
                                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                    >
                                        {showCompanyColumn && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                                {companyNameMap.get(client.companyID) || 'N/D'}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{displayName}</span>
                                                <span className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase">P.IVA/CF: {client.piva || client.cf || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {client.referente?.email && <span className="text-xs text-slate-600 flex items-center gap-1.5"><EnvelopeIcon className="h-3.5 w-3.5 opacity-60"/> {client.referente.email}</span>}
                                                {client.referente?.telefono && <span className="text-xs text-slate-600 flex items-center gap-1.5"><PhoneIcon className="h-3.5 w-3.5 opacity-60"/> {client.referente.telefono}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight">{client.sedeLegale?.citta || 'N/D'}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};