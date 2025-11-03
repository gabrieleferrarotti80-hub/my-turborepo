import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { useFormAuthorizationManager } from 'shared-core';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

const AuthorizeFormView = ({ form, onBack, onSaveSuccess }) => {
 	
    // --- ✅ INIZIO CORREZIONE ---
 	// 1. Recupera 'db', 'loadingData' e l'oggetto 'data'
 	const { db, data, loadingData } = useFirebaseData();

    // 2. Estrai 'companies' e 'aziendeForm' da 'data'
    const companies = data?.companies || [];
    const aziendeForm = data?.aziendeForm || [];
    // --- FINE CORREZIONE ---

 	
 	// Passa 'db' quando chiami l'hook
 	const { updateAuthorizations, isSaving } = useFormAuthorizationManager(db); 
 	
 	const [selectedIds, setSelectedIds] = useState([]);

    // Questo useEffect ora funzionerà perché 'aziendeForm' è un array
 	useEffect(() => {
 	 	const existingAuth = aziendeForm.find(auth => auth.id === form.id);
 	 	
 	 	if (existingAuth && existingAuth.authorizedCompanyIds) {
 	 	 	setSelectedIds(existingAuth.authorizedCompanyIds);
 	 	} else {
 	 	 	setSelectedIds([]);
 	 	}
 	}, [aziendeForm, form.id]); // Dipende da aziendeForm

 	const handleCheckboxChange = (companyId) => {
 	 	setSelectedIds(prevIds => 
 	 	 	prevIds.includes(companyId)
 	 	 	 	? prevIds.filter(id => id !== companyId)
 	 	 	 	: [...prevIds, companyId]
 	 	);
 	};

 	const handleSave = async () => {
 		try { 
 			const result = await updateAuthorizations(form.id, selectedIds); 
 			onSaveSuccess(result.message);
 		} catch (error) {
 			console.error("Errore esplicito durante il salvataggio:", error);
			alert(`Errore nel salvataggio: ${error.message}`); 
 		}
 	};

 	if (loadingData) {
 	 	return <div className="text-center p-8">Caricamento...</div>;
 	}

    // Il resto del JSX non cambia
    return (
        <div className="p-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800">Autorizza Aziende per il Modulo:</h1>
            <h2 className="text-xl font-semibold text-indigo-600 mb-6">{form.id}</h2> 
            
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Seleziona Aziende Autorizzate</h3>
                
                {/* Questo ora funzionerà perché 'companies' è un array */}
                {companies.map(company => (
                    <div key={company.id} className="flex items-center">
                        <input
                            type="checkbox"
                            id={company.id}
                            checked={selectedIds.includes(company.id)}
                            onChange={() => handleCheckboxChange(company.id)}
                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={company.id} className="ml-3 text-sm font-medium text-gray-700">
                            {company.companyName || company.name}
                        </label>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end gap-4">
                <button 
                    onClick={onBack} 
                    className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                    Annulla
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="py-2 px-6 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center"
                >
                    {isSaving && <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />}
                    {isSaving ? 'Salvataggio...' : 'Salva Autorizzazioni'}
                </button>
            </div>
        </div>
    );
};

export default AuthorizeFormView;