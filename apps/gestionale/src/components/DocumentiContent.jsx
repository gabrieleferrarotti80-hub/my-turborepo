// In components/DocumentiContent.jsx

import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/solid';
import { AggiungiDocumentoForm } from 'shared-ui';
import { useFirebaseData, useDocumentiManager } from 'shared-core';

export const DocumentiContent = () => {
    // 1. Correctly read data from the context
    const { data, loadingData, companyID, user, db, storage } = useFirebaseData();
    // ✅ GUARANTEE 'documenti' IS ALWAYS AN ARRAY
    const { documenti = [] } = data || {};

    // 2. Initialize the manager with the correct, always-available data
    const { deleteDocumento } = useDocumentiManager(db, storage, companyID, user);

    const [showForm, setShowForm] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // This logic is now safe because 'documenti' is always an array
    const filteredDocuments = useMemo(() => {
        if (!searchTerm) return documenti;
        return documenti.filter(doc => 
            doc.nomeFile.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.categoria.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [documenti, searchTerm]);

    const handleOpenAddForm = () => {
        setEditingDoc(null);
        setShowForm(true);
    };

    const handleOpenEditForm = (doc) => {
        setEditingDoc(doc);
        setShowForm(true);
    };

    const handleDelete = async (docId, storagePath) => {
        if (window.confirm("Sei sicuro di voler eliminare questo documento? L'azione è irreversibile.")) {
            await deleteDocumento(docId, storagePath);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingDoc(null);
    };

    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Elenco Documenti</h1>
                <button
                    onClick={handleOpenAddForm}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                >
                    <PlusIcon className="h-5 w-5" />
                    Aggiungi Documento
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                    <input 
                        type="text" 
                        placeholder="Cerca per nome o categoria..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full px-4 py-2 border rounded-lg" 
                    />
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Documento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Caricamento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scadenza</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Azioni</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loadingData ? (
                            <tr><td colSpan="5" className="text-center py-4">Caricamento in corso...</td></tr>
                        ) : filteredDocuments.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4 text-gray-500">Nessun documento trovato.</td></tr>
                        ) : (
                            filteredDocuments.map((doc) => (
                                <tr key={doc.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.nomeFile}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{doc.categoria}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {doc.createdAt ? doc.createdAt.toLocaleDateString('it-IT') : 'N/D'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {doc.dataScadenza ? doc.dataScadenza.toLocaleDateString('it-IT') : 'Nessuna'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-4">
                                            <a href={doc.fileURL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                                                <EyeIcon className="h-5 w-5"/>
                                            </a>
                                            <button onClick={() => handleOpenEditForm(doc)} className="text-gray-500 hover:text-indigo-600">
                                                <PencilIcon className="h-5 w-5"/>
                                            </button>
                                            <button onClick={() => handleDelete(doc.id, doc.storagePath)} className="text-gray-500 hover:text-red-600">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <AggiungiDocumentoForm 
                    initialData={editingDoc}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
};