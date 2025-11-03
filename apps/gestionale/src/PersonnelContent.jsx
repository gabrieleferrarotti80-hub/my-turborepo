// apps/gestionale/src/components/PersonnelContent.jsx

import React, { useState, useMemo } from 'react';
import { 
    UserPlusIcon, 
    ArrowUpTrayIcon, 
    UsersIcon, 
    CalendarDaysIcon, 
    ArrowLeftIcon 
} from '@heroicons/react/24/solid';
import { AddPersonnelForm } from './AddPersonnelForm.jsx'; 
import ImportPersonnel from './ImportExcell/ImportPersonnel.jsx';
import { PersonnelDetailView } from 'shared-ui'; 
// ❗ 1. IMPORTA IL NUOVO HOOK
import { useFirebaseData, usePresenzeAdminManager } from 'shared-core';
import { PresenzeDashboard } from './components/PresenzeDashboard.jsx';

export const PersonnelContent = () => {
    // ❗ 2. CORREGGI LA DESTRUTTURAZIONE
    // Estrai 'user' (l'admin loggato) e 'db' (necessario per il manager)
    const { data, companyID, userRole, loadingData, user, db } = useFirebaseData();
    const { users, presenze, segnalazioniErrori } = data || {}; 

    // ❗ 3. INIZIALIZZA IL MANAGER
    // Passa 'db' (che ora abbiamo estratto)
    const { saveGridChanges, isSaving: isSavingPresenze } = usePresenzeAdminManager(db);

    const [viewMode, setViewMode] = useState('main'); 
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPersonnel = useMemo(() => {
        if (!users) return [];
        const isSuperAdmin = userRole === 'proprietario' && companyID === null;
        const personnelByCompany = isSuperAdmin
            ? users.filter(user => user.ruolo !== 'proprietario')
            : users.filter(user => user.companyID === companyID && user.ruolo !== 'titolare-azienda');
        if (!searchTerm) return personnelByCompany;
        return personnelByCompany.filter(p =>
            (p.nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.cognome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.ruolo?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, userRole, companyID, searchTerm]);
    
    const canWrite = userRole === 'proprietario' ? !!companyID : true;

    // --- Handlers (Invariati) ---
    const handleSelectPerson = (person) => {
        setSelectedPerson(person);
        setViewMode('detail');
    };
    const handleEditPerson = (person) => {
        setSelectedPerson(person);
        setViewMode('edit');
    };
    const handleBackToList = () => {
        setSelectedPerson(null);
        setViewMode('list');
    };
    const handleBackToMain = () => {
        setSelectedPerson(null);
        setViewMode('main');
    };
    
    // --- Viste di rendering ---

    if (loadingData) {
        return <div className="text-center p-8">Caricamento...</div>;
    }

    // Vista "Main" (Card) - Invariata
    if (viewMode === 'main') {
        return (
            <div className="space-y-6 animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-800">Personale</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setViewMode('list')}
                        className="p-8 bg-white rounded-2xl shadow-xl text-left hover:shadow-2xl transition-shadow cursor-pointer border border-transparent hover:border-indigo-500"
                    >
                        <UsersIcon className="h-10 w-10 text-indigo-600 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Gestione Personale</h2>
                        <p className="text-gray-600 mt-2">Aggiungi, modifica, importa o visualizza i membri del tuo team.</p>
                    </button>
                    <button
                        onClick={() => setViewMode('presenze')}
                        className="p-8 bg-white rounded-2xl shadow-xl text-left hover:shadow-2xl transition-shadow cursor-pointer border border-transparent hover:border-teal-500"
                    >
                        <CalendarDaysIcon className="h-10 w-10 text-teal-600 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Presenze</h2>
                        <p className="text-gray-600 mt-2">Visualizza il cartellino digitale, le timbrature e le ore del personale.</p>
                    </button>
                </div>
            </div>
        );
    }
    
    // Vista "Presenze"
    if (viewMode === 'presenze') {
        return (
            <PresenzeDashboard 
                users={users || []}
                presenze={presenze || []}
                segnalazioniErrori={segnalazioniErrori || []}
                companyID={companyID}
                onBack={handleBackToMain} 
                
                // ❗ 4. PASSA LE PROPS CORRETTE
                adminUser={user} // Passa l'oggetto 'user' (l'admin)
                saveGridChanges={saveGridChanges}
                isSaving={isSavingPresenze}
            />
        );
    }

    // Viste 'import', 'detail', 'edit', 'add' (Invariate)
    if (viewMode === 'import') {
        return <ImportPersonnel onBack={handleBackToList} companyIdToAdd={companyID} />;
    }
    if (viewMode === 'detail') {
        return <PersonnelDetailView person={selectedPerson} onBack={handleBackToList} onEdit={handleEditPerson} />;
    }
    if (viewMode === 'edit') {
        return <AddPersonnelForm existingData={selectedPerson} onBack={handleBackToList} />;
    }
    if (viewMode === 'add') {
        return <AddPersonnelForm companyIdToAdd={companyID} onBack={handleBackToList} />;
    }

    // Vista 'list' (Gestione Personale) - Invariata
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center">
                   <div className="flex items-center gap-4">
                        <button
                            onClick={handleBackToMain}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Indietro
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">Gestione Personale</h1>
                   </div>
                 <div className="flex gap-4 mt-4 md:mt-0">
                    <button onClick={() => canWrite && setViewMode('add')} disabled={!canWrite} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md transition-colors ${canWrite ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                        <UserPlusIcon className="h-5 w-5" /> Aggiungi Nuovo
                    </button>
                    <button onClick={() => canWrite && setViewMode('import')} disabled={!canWrite} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-md transition-colors ${canWrite ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                        <ArrowUpTrayIcon className="h-5 w-5" /> Importa da Excel
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                   <div className="p-4">
                    <input
                        type="text"
                        placeholder="Cerca per nome, cognome, ruolo o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.g.value)}
                        className="pl-4 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cognome</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruolo</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPersonnel.map(person => (
                            <tr key={person.id} onClick={() => handleSelectPerson(person)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-indigo-600 hover:text-indigo-900">{person.nome}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{person.cognome}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{person.ruolo}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{person.email}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};