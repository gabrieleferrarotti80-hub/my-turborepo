import React, { useState, useMemo } from 'react';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useAssegnazioniCantiereManager } from 'shared-core';
import { AssegnaCantiereForm } from './AssegnaCantiereForm.jsx';

export const AssegnazioniContent = ({ 
    onNavigate, 
    data, 
    loadingData, 
    db, 
    user, 
    userAziendaId, 
    userRole 
}) => {
    
    // 1. Estrai i dati dalle props
    const {
        assegnazioniCantieri = [],
        cantieri = [],
        users = [],
        companies = [],
        attrezzature = [],
        subcantieri = []
    } = data || {}; 

    // 2. Inizializza l'hook manager
    const { createAssegnazioneCantiere, updateAssegnazioneCantiere, deleteAssegnazioneCantiere } = 
        useAssegnazioniCantiereManager(db, user, userAziendaId, users, cantieri, subcantieri); // ✅ AGGIUNTO 'subcantieri'

    // 3. Gestione stato interno
    const [view, setView] = useState('list'); // 'list', 'add', 'edit'
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const isOwner = userRole === 'proprietario';
    const canWrite = !(isOwner && !userAziendaId);

    // --- 4. FUNZIONI HELPER ---

    const getSiteName = (siteId) => {
        const site = cantieri.find(s => s.id === siteId);
        return site ? site.nomeCantiere : 'Cantiere Sconosciuto';
    };

    const getUserNameById = (userId) => {
        if (!userId) return 'N/D';
        const person = users.find(p => p.id === userId);
        return person ? `${person.nome} ${person.cognome}` : 'Sconosciuto';
    };
    
    const getPrepostoNameFromTeam = (teamArray) => {
        if (!Array.isArray(teamArray) || teamArray.length === 0) {
            return 'Nessun Team';
        }
        const preposto = teamArray.find(member => member.ruolo === 'preposto');
        
        if (preposto && preposto.nome) {
            return preposto.nome;
        } else if (preposto && preposto.userId) {
            return getUserNameById(preposto.userId);
        }
        return 'Preposto Non Trovato';
    };

    const getOperaiNamesFromTeam = (teamArray) => {
        if (!Array.isArray(teamArray) || teamArray.length === 0) {
            return '';
        }
        return teamArray
            .filter(member => member.ruolo === 'operaio')
            .map(op => op.nome || getUserNameById(op.userId))
            .join(', ');
    };
    
    const getCompanyName = (companyId) => {
        if (!companyId) return 'Nessuna Azienda';
        const company = companies.find(c => c.id === companyId);
        return company ? company.companyName : 'Azienda Sconosciuta';
    };

    const formatOptionalDate = (date) => {
        if (!date) return 'N/D';
        // Converte Timestamp di Firestore o Data
        const d = date.toDate ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return 'N/D';
        return d.toLocaleDateString('it-IT');
    };

    // 5. Filtra i dati
    const filteredAssignments = (isOwner && !userAziendaId)
        ? assegnazioniCantieri
        : assegnazioniCantieri.filter(assignment => assignment.companyID === userAziendaId);

    // --- 6. HANDLERS ---
    const handleCreate = () => {
        setSelectedAssignment(null); // Assicura che non ci siano dati iniziali
        setView('add');
    };

    const handleEdit = (assignment) => {
        console.log("[AssegnazioniContent] Azione: handleEdit. Dati selezionati:", assignment);
        setSelectedAssignment(assignment); // Imposta l'assegnazione da modificare
        setView('edit');
    };

   const handleDelete = async (assignment) => { // ✅ Ricevi l'intero oggetto
        if (window.confirm("Sei sicuro di voler eliminare questa assegnazione?")) {
            // ✅ Passa sia assignment.id che assignment.faseId
            await deleteAssegnazioneCantiere(assignment.id, assignment.faseId);
        }
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedAssignment(null); // Pulisci la selezione
    };
    
    const handleSaveSuccess = (message) => {
        alert(message);
        setView('list');
        setSelectedAssignment(null); // Pulisci la selezione
    };

    // --- 7. RENDER ---
    if (loadingData) {
        return <div className="p-4 text-center">Caricamento in corso...</div>;
    }

    console.log(`[AssegnazioniContent] DEBUG Render: Vista corrente = ${view}`);

    // VISTA FORM (Creazione o Modifica)
    if (view === 'add' || view === 'edit') {
        return (
            <AssegnaCantiereForm
                onBack={handleBackToList}
                onSaveSuccess={handleSaveSuccess}
                db={db}
                user={user}
                userAziendaId={userAziendaId}
                data={data}
                initialData={selectedAssignment} // Passa i dati per la modifica
            />
        );
    }
    
    // VISTA LISTA (Default)
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Torna alla Gestione Operativa</span>
            </button>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Visualizza Assegnazioni</h1>
                <button
                    onClick={handleCreate}
                    className={`mt-4 md:mt-0 px-4 py-2 text-white rounded-md shadow-md transition-colors duration-200 flex items-center gap-2 ${canWrite ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    disabled={!canWrite}
                >
                    <PlusIcon className="h-5 w-5" />
                    Nuova Assegnazione
                </button>
            </div>

            {filteredAssignments.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <p>Nessuna assegnazione trovata.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {isOwner && !userAziendaId && (
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azienda</th>
                                )}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantiere</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preposto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operai</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Inizio</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Fine</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modificato Da</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAssignments.map((assignment) => (
                                <tr key={assignment.id}>
                                    {isOwner && !userAziendaId && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCompanyName(assignment.companyID)}</td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getSiteName(assignment.cantiereId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPrepostoNameFromTeam(assignment.team)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getOperaiNamesFromTeam(assignment.team)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatOptionalDate(assignment.dataInizio)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatOptionalDate(assignment.dataFine)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Mostra chi ha modificato (se esiste), altrimenti chi ha creato */}
                                        {assignment.updatedBy ? 
                                            `${getUserNameById(assignment.updatedBy)} (Mod.)` : 
                                            getUserNameById(assignment.assegnatoDaId)
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleEdit(assignment)} className="text-indigo-600 hover:text-indigo-900" title="Modifica">
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                           <button onClick={() => handleDelete(assignment)} className="text-red-600 hover:text-red-900" title="Elimina">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
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