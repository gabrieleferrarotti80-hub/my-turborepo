import React from 'react';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useFirebaseData, useAssegnazioniCantieriManager } from 'shared-core';

export const AssegnazioniContent = ({ onNavigate }) => {
    // 1. Recupera i dati dal contesto, con valori di default per prevenire errori
    const {
        db,
        user,
        userAziendaId,
        assegnazioniCantieri = [],
        cantieri = [],
        users = [],
        companies = [],
        userRole,
        loading
    } = useFirebaseData();

    // 2. Inizializza l'hook manager per le azioni di scrittura
    const { deleteAssegnazioneCantiere } = useAssegnazioniCantieriManager(db, user, userAziendaId);

    const isOwner = userRole === 'proprietario';
    const canWrite = !(isOwner && !userAziendaId);

    // 3. Funzioni helper per "tradurre" gli ID in nomi leggibili
    const getSiteName = (siteId) => {
        const site = cantieri.find(s => s.id === siteId);
        // Assumiamo che il campo del nome del cantiere sia 'nome'
        return site ? site.nomeCantiere: 'Cantiere Sconosciuto';
    };

    const getPersonnelNames = (personnelIds) => {
        return (personnelIds || []).map(id => {
            const person = users.find(p => p.id === id);
            return person ? `${person.nome} ${person.cognome}` : 'Sconosciuto';
        }).join(', ');
    };

    const getSupervisorName = (userId) => {
        const person = users.find(p => p.id === userId);
        return person ? `${person.nome} ${person.cognome}` : 'Sconosciuto';
    };
    
    const getCompanyName = (companyId) => {
        if (!companyId) return 'Nessuna Azienda';
        const company = companies.find(c => c.id === companyId);
        // Usa 'companyName' come verificato in precedenza
        return company ? company.companyName : 'Azienda Sconosciuta';
    };

    // 4. Filtra i dati da visualizzare in base al ruolo
    const filteredAssignments = (isOwner && !userAziendaId)
        ? assegnazioniCantieri
        : assegnazioniCantieri.filter(assignment => assignment.companyID === userAziendaId);

    // 5. Gestori di eventi per le azioni dell'utente
    const handleCreate = () => {
        if (canWrite) {
            onNavigate('assign-cantiere');
        } else {
            alert("Seleziona un'azienda per poter creare una nuova assegnazione.");
        }
    };

    const handleEdit = (assignment) => {
        onNavigate('edit-assign-cantiere', assignment);
    };

    const handleDelete = async (assignmentId) => {
        if (window.confirm("Sei sicuro di voler eliminare questa assegnazione?")) {
            await deleteAssegnazioneCantiere(assignmentId);
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Caricamento in corso...</div>;
    }

    // 6. RENDER del componente
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <button onClick={() => onNavigate('operative-data')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200">
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Assegnazione</th>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getSupervisorName(assignment.prepostoId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPersonnelNames(assignment.operaiIds)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Logica robusta per la data: gestisce sia Timestamp che oggetti Date */}
                                        {assignment.dataAssegnazione?.toDate ? 
                                            assignment.dataAssegnazione.toDate().toLocaleDateString('it-IT') : 
                                            (assignment.dataAssegnazione?.toLocaleDateString('it-IT') || 'N/D')
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleEdit(assignment)} className="text-indigo-600 hover:text-indigo-900" title="Modifica">
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDelete(assignment.id)} className="text-red-600 hover:text-red-900" title="Elimina">
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